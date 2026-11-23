/* ==========================================================================
   GWiCS: AI vs Human Showdown - Real-time Sync & Networking Engine
   Supports:
   1. Cloud WebRTC (PeerJS) for instant cross-device mobile & laptop sync
      over campus Wi-Fi and cellular with zero server setup or hosting cost.
   2. Firebase Realtime Database (when window.FIREBASE_CONFIG is configured).
   3. Local BroadcastChannel & Storage events for local testing and rehearsal.
   ========================================================================== */

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GWICS_SyncEngine = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STORAGE_PREFIX = "gwics_game_";
  const DEFAULT_ROOM_CODE = "BOTORNOT";

  function createInitialPublicState() {
    return {
      roomCode: DEFAULT_ROOM_CODE,
      status: "LOBBY", // LOBBY, QUESTION, LOCKED, VOIDED, REVEALED, SHOWDOWN, RESULTS, COMPLETED
      roundNum: 1,
      questionIndex: 0,
      totalQuestions: 25,
      currentQuestion: null, // Public question payload only (no answer, no tell)
      releasedAnswer: null, // Released ONLY when host triggers reveal
      releasedTell: null,
      releasedSource: null,
      voidReason: null,
      timer: {
        total: 45,
        deadline: 0,
        remaining: 45,
        running: false
      },
      submittedCount: 0,
      totalTeams: 0,
      leaderboard: [],
      updatedAt: Date.now()
    };
  }

  class SyncEngine {
    constructor() {
      this.mode = "hybrid"; // peerjs + broadcast + firebase
      this.connectionStatus = "OFFLINE"; // OFFLINE, CONNECTING, CONNECTED, RECONNECTING
      this.channel = null;
      this.peer = null;
      this.peerConnections = {}; // peerId -> connection (for host)
      this.hostConnection = null; // connection to host (for participant & projector)
      
      this.listeners = {
        stateChange: [],
        teamUpdate: [],
        connectionChange: [],
        eventMessage: []
      };

      this.publicState = createInitialPublicState();
      this.teams = {}; // teamId -> full team record (Host ONLY)
      this.isHost = false;
      this.isProjector = false;
      this.currentTeamId = null;
      this.roomCode = DEFAULT_ROOM_CODE;

      this.initLocalBroadcast();
    }

    /* ----------------------------------------------------------------------
       EVENT SUBSCRIPTIONS
       ---------------------------------------------------------------------- */
    onStateChange(cb) { this.listeners.stateChange.push(cb); }
    onTeamUpdate(cb) { this.listeners.teamUpdate.push(cb); }
    onConnectionChange(cb) { this.listeners.connectionChange.push(cb); }
    onEvent(cb) { this.listeners.eventMessage.push(cb); }

    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => {
        try { cb(data); } catch (err) { console.error("SyncEngine listener error:", err); }
      });
    }

    setConnectionStatus(status) {
      if (this.connectionStatus !== status) {
        this.connectionStatus = status;
        this.emit("connectionChange", status);
      }
    }

    /* ----------------------------------------------------------------------
       LOCAL BROADCAST (Cross-tab fallback)
       ---------------------------------------------------------------------- */
    initLocalBroadcast() {
      try {
        if (typeof BroadcastChannel !== "undefined") {
          this.channel = new BroadcastChannel("gwics_game_channel");
          this.channel.onmessage = (event) => this.handleChannelMessage(event.data);
        }
      } catch (e) {
        console.warn("BroadcastChannel unavailable; falling back to storage events:", e);
      }

      if (typeof window !== "undefined") {
        window.addEventListener("storage", (e) => {
          if (e.key === STORAGE_PREFIX + "state" && e.newValue) {
            try {
              const state = JSON.parse(e.newValue);
              this.onRemoteStateUpdate(state);
            } catch (err) {}
          }
        });
      }
    }

    /* ----------------------------------------------------------------------
       PEERJS WEBRTC NETWORKING (Multi-Device Campus Wi-Fi & Cellular)
       ---------------------------------------------------------------------- */
    getPeerHostId(roomCode) {
      const cleanCode = (roomCode || DEFAULT_ROOM_CODE).toLowerCase().replace(/[^a-z0-9]/g, "");
      return "gwics-botornot-" + cleanCode;
    }

    initPeerAsHost(roomCode) {
      if (typeof Peer === "undefined") {
        console.warn("PeerJS library not loaded. Running in local BroadcastChannel mode.");
        this.setConnectionStatus("CONNECTED");
        return;
      }

      const hostId = this.getPeerHostId(roomCode);
      this.setConnectionStatus("CONNECTING");

      try {
        // Connect to public PeerJS cloud signaling
        this.peer = new Peer(hostId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" }
            ]
          }
        });

        this.peer.on("open", (id) => {
          console.log("Host WebRTC Peer opened with ID:", id);
          this.setConnectionStatus("CONNECTED");
        });

        this.peer.on("connection", (conn) => {
          this.setupHostPeerConnection(conn);
        });

        this.peer.on("error", (err) => {
          console.warn("PeerJS Host Error:", err.type, err.message);
          if (err.type === "unavailable-id") {
            // Host already open in another window or reloaded quickly
            console.warn("Host peer ID is busy. Using secondary peer session.");
          }
          this.setConnectionStatus("CONNECTED"); // Local fallback works
        });

        this.peer.on("disconnected", () => {
          this.setConnectionStatus("RECONNECTING");
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

      } catch (e) {
        console.error("PeerJS initialization failed:", e);
        this.setConnectionStatus("CONNECTED");
      }
    }

    setupHostPeerConnection(conn) {
      conn.on("open", () => {
        this.peerConnections[conn.peer] = conn;

        // Immediately send current public state to newly connected client
        conn.send({
          type: "STATE_SYNC",
          state: this.publicState
        });
      });

      conn.on("data", (data) => {
        if (!data) return;
        // Bind the connection to the message for targeted responses
        data._peerId = conn.peer;
        this.handleClientMessage(data);
      });

      conn.on("close", () => {
        delete this.peerConnections[conn.peer];
      });

      conn.on("error", () => {
        delete this.peerConnections[conn.peer];
      });
    }

    initPeerAsClient(roomCode, isProjector = false) {
      if (typeof Peer === "undefined") {
        console.warn("PeerJS not loaded. Running in local BroadcastChannel mode.");
        this.setConnectionStatus("CONNECTED");
        return;
      }

      this.isProjector = isProjector;
      this.setConnectionStatus("CONNECTING");
      const targetHostId = this.getPeerHostId(roomCode);

      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" }
            ]
          }
        });

        this.peer.on("open", (myId) => {
          this.connectToHostPeer(targetHostId);
        });

        this.peer.on("error", (err) => {
          console.warn("PeerJS Client Error:", err.type, err);
          this.setConnectionStatus("OFFLINE");
          // Re-attempt after delay
          setTimeout(() => this.connectToHostPeer(targetHostId), 3000);
        });

        this.peer.on("disconnected", () => {
          this.setConnectionStatus("RECONNECTING");
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

      } catch (e) {
        console.error("Peer client initialization failed:", e);
        this.setConnectionStatus("OFFLINE");
      }
    }

    connectToHostPeer(targetHostId) {
      if (!this.peer || this.peer.destroyed) return;

      const conn = this.peer.connect(targetHostId, { reliable: true });
      this.hostConnection = conn;

      conn.on("open", () => {
        this.setConnectionStatus("CONNECTED");
        console.log("Connected to Host via WebRTC DataChannel!");

        // If participant with active team, send join
        if (!this.isProjector && this.currentTeamId && this.currentTeamName) {
          conn.send({
            type: "TEAM_JOIN",
            teamId: this.currentTeamId,
            teamName: this.currentTeamName,
            roomCode: this.roomCode
          });
        }
      });

      conn.on("data", (data) => {
        this.handleIncomingClientPayload(data);
      });

      conn.on("close", () => {
        this.setConnectionStatus("RECONNECTING");
        this.hostConnection = null;
        setTimeout(() => this.connectToHostPeer(targetHostId), 2500);
      });

      conn.on("error", () => {
        this.setConnectionStatus("RECONNECTING");
        this.hostConnection = null;
      });
    }

    handleIncomingClientPayload(data) {
      if (!data) return;

      if (data.type === "STATE_SYNC") {
        this.onRemoteStateUpdate(data.state);
      } else if (data.type === "TEAM_PRIVATE_UPDATE") {
        if (data.team && data.team.id === this.currentTeamId) {
          this.emit("teamUpdate", data.team);
        }
      } else if (data.type === "SUBMIT_ACK" || data.type === "HINT_ACK") {
        this.emit("eventMessage", data);
      }
    }

    /* ----------------------------------------------------------------------
       HOST CONTROLS
       ---------------------------------------------------------------------- */
    initAsHost(competitionPack, roomCode = DEFAULT_ROOM_CODE) {
      this.isHost = true;
      this.competitionPack = competitionPack;
      this.roomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
      this.publicState.roomCode = this.roomCode;

      // Restore saved host state if available
      const savedState = localStorage.getItem(STORAGE_PREFIX + "host_state");
      const savedTeams = localStorage.getItem(STORAGE_PREFIX + "host_teams");

      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Preserve pack consistency
          this.publicState = Object.assign(this.publicState, parsed);
        } catch (e) {}
      }
      if (savedTeams) {
        try { this.teams = JSON.parse(savedTeams); } catch (e) {}
      }

      this.initPeerAsHost(this.roomCode);
      this.broadcastState();
    }

    setCompetitionPack(pack) {
      this.competitionPack = pack;
    }

    broadcastState() {
      if (!this.isHost) return;

      this.publicState.totalTeams = Object.keys(this.teams).length;
      this.publicState.leaderboard = this.calculateLeaderboard();
      this.publicState.updatedAt = Date.now();

      // Persist host state locally
      localStorage.setItem(STORAGE_PREFIX + "host_state", JSON.stringify(this.publicState));
      localStorage.setItem(STORAGE_PREFIX + "host_teams", JSON.stringify(this.teams));
      localStorage.setItem(STORAGE_PREFIX + "state", JSON.stringify(this.publicState));

      // Broadcast across local browser windows
      if (this.channel) {
        this.channel.postMessage({
          type: "STATE_SYNC",
          state: this.publicState
        });
      }

      // Broadcast over WebRTC DataChannel to all connected phones & projector
      const payload = {
        type: "STATE_SYNC",
        state: this.publicState
      };

      for (const peerId in this.peerConnections) {
        const conn = this.peerConnections[peerId];
        if (conn && conn.open) {
          try { conn.send(payload); } catch (e) { console.warn("Send to peer failed:", e); }
        }
      }

      this.emit("stateChange", this.publicState);
    }

    // Set new question from host pack — Strips answer and tell before broadcasting!
    setQuestion(roundNum, questionIdx) {
      if (!this.isHost || !this.competitionPack) return;

      const round = this.competitionPack.rounds.find(r => r.roundNum === roundNum);
      if (!round || !round.items || !round.items[questionIdx]) return;

      const fullItem = round.items[questionIdx];
      const duration = round.timeLimit || 45;
      const deadline = Date.now() + (duration * 1000);

      // PUBLIC PAYLOAD: Strictly NO ans and NO tell!
      const publicQuestion = {
        id: fullItem.id,
        roundNum: roundNum,
        roundName: round.name,
        questionIndex: questionIdx,
        title: fullItem.title,
        prompt: fullItem.prompt,
        type: fullItem.type,
        media: fullItem.media || null,
        cardImage: fullItem.cardImage || null,
        passageA: fullItem.passageA || null,
        passageB: fullItem.passageB || null,
        audioUrl: fullItem.audioUrl || null,
        transcript: fullItem.transcript || null,
        audioAccessibilityNotes: fullItem.audioAccessibilityNotes || null,
        options: fullItem.options || [],
        hintAvailable: !!fullItem.hint,
        timeLimit: duration
      };

      this.publicState.status = "QUESTION";
      this.publicState.roundNum = roundNum;
      this.publicState.questionIndex = questionIdx;
      this.publicState.currentQuestion = publicQuestion;
      this.publicState.releasedAnswer = null;
      this.publicState.releasedTell = null;
      this.publicState.releasedSource = null;
      this.publicState.voidReason = null;
      this.publicState.submittedCount = 0;
      this.publicState.timer = {
        total: duration,
        deadline: deadline,
        remaining: duration,
        running: true
      };

      // Reset submitted count from existing teams
      let subCount = 0;
      for (const tId in this.teams) {
        if (this.teams[tId].answers && this.teams[tId].answers[fullItem.id]) {
          subCount++;
        }
      }
      this.publicState.submittedCount = subCount;

      this.broadcastState();
      this.startTimerInterval();
    }

    startTimerInterval() {
      clearInterval(this._timerInterval);
      this._timerInterval = setInterval(() => {
        if (!this.isHost || !this.publicState.timer.running) return;

        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((this.publicState.timer.deadline - now) / 1000));
        this.publicState.timer.remaining = remaining;

        if (remaining <= 0) {
          this.publicState.timer.running = false;
          this.lockSubmissions();
        } else {
          // Pulse remaining time updates
          this.broadcastState();
        }
      }, 1000);
    }

    pauseTimer() {
      if (!this.isHost) return;
      const t = this.publicState.timer;
      if (t.running) {
        // Pausing: save remaining
        t.running = false;
        clearInterval(this._timerInterval);
      } else {
        // Resuming: set new deadline from remaining seconds
        t.running = true;
        t.deadline = Date.now() + (t.remaining * 1000);
        this.startTimerInterval();
      }
      this.broadcastState();
    }

    lockSubmissions() {
      if (!this.isHost) return;
      this.publicState.status = "LOCKED";
      this.publicState.timer.running = false;
      clearInterval(this._timerInterval);
      this.broadcastState();
    }

    // Host reveals the official verdict & scores all answers securely
    revealAnswer() {
      if (!this.isHost || !this.competitionPack) return;

      const q = this.publicState.currentQuestion;
      if (!q) return;

      const round = this.competitionPack.rounds.find(r => r.roundNum === q.roundNum);
      const fullItem = round ? round.items[q.questionIndex] : null;
      if (!fullItem) return;

      this.publicState.status = "REVEALED";
      this.publicState.releasedAnswer = fullItem.ans;
      this.publicState.releasedTell = fullItem.tell;
      this.publicState.releasedSource = fullItem.source || null;

      // Grade all team submissions on the host
      for (const tId in this.teams) {
        const team = this.teams[tId];
        const sub = (team.answers || {})[q.id];

        if (sub && !sub.graded) {
          sub.graded = true;
          if (sub.choice === fullItem.ans) {
            sub.isCorrect = true;
            team.xp += 100;
            team.history.push({
              time: Date.now(),
              qid: q.id,
              desc: `Correct: ${q.title}`,
              delta: 100
            });
          } else {
            sub.isCorrect = false;
            team.history.push({
              time: Date.now(),
              qid: q.id,
              desc: `Incorrect: ${q.title}`,
              delta: 0
            });
          }
        }
      }

      this.broadcastState();
      this.notifyAllTeamsPrivately();
    }

    // VOID QUESTION: voids question, locks submissions, refunds hints, reverses grading
    voidQuestion(reason = "Question voided by host") {
      if (!this.isHost) return;
      const q = this.publicState.currentQuestion;
      if (!q) return;

      this.publicState.status = "VOIDED";
      this.publicState.voidReason = reason;
      this.publicState.timer.running = false;
      clearInterval(this._timerInterval);

      // Process refunds and reversals for all teams
      for (const tId in this.teams) {
        const team = this.teams[tId];

        // 1. Refund hint if used
        if (team.unlockedHints && team.unlockedHints[q.id]) {
          delete team.unlockedHints[q.id];
          team.xp += 25;
          team.history.push({
            time: Date.now(),
            qid: q.id,
            desc: `Refunded hint for voided question: ${q.title}`,
            delta: 25
          });
        }

        // 2. Reverse points if already graded
        const sub = (team.answers || {})[q.id];
        if (sub && sub.graded) {
          if (sub.isCorrect) {
            team.xp = Math.max(0, team.xp - 100);
            team.history.push({
              time: Date.now(),
              qid: q.id,
              desc: `Reversed points for voided question: ${q.title}`,
              delta: -100
            });
          }
          sub.graded = false;
          sub.voided = true;
        }
      }

      this.broadcastState();
      this.notifyAllTeamsPrivately();
    }

    // Manual score adjustment by host with mandatory reason
    adjustTeamScore(teamId, deltaXP, reason) {
      if (!this.isHost || !this.teams[teamId]) return false;
      const team = this.teams[teamId];
      team.xp = Math.max(0, team.xp + deltaXP);
      team.history.push({
        time: Date.now(),
        desc: `Host adjustment: ${reason}`,
        delta: deltaXP
      });
      this.broadcastState();
      this.notifyTeamPrivately(teamId);
      return true;
    }

    calculateLeaderboard() {
      return Object.values(this.teams)
        .map(t => ({
          teamId: t.id,
          teamName: t.name,
          xp: t.xp,
          historyCount: (t.history || []).length
        }))
        .sort((a, b) => b.xp - a.xp);
    }

    /* ----------------------------------------------------------------------
       PARTICIPANT / TEAM ENGINE
       ---------------------------------------------------------------------- */
    initAsParticipant(roomCode, teamName, savedToken = null) {
      this.isHost = false;
      this.roomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
      this.currentTeamName = (teamName || "").trim();
      this.currentTeamId = savedToken || ("team_" + Math.random().toString(36).substr(2, 9));

      // Connect WebRTC peer to host
      this.initPeerAsClient(this.roomCode, false);

      // Request join from host
      this.sendToHost({
        type: "TEAM_JOIN",
        teamId: this.currentTeamId,
        teamName: this.currentTeamName,
        roomCode: this.roomCode
      });

      // Load cached local state if available
      const raw = localStorage.getItem(STORAGE_PREFIX + "state");
      if (raw) {
        try { this.onRemoteStateUpdate(JSON.parse(raw)); } catch (e) {}
      }
    }

    initAsProjector(roomCode = DEFAULT_ROOM_CODE) {
      this.isHost = false;
      this.isProjector = true;
      this.roomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
      this.initPeerAsClient(this.roomCode, true);

      const raw = localStorage.getItem(STORAGE_PREFIX + "state");
      if (raw) {
        try { this.onRemoteStateUpdate(JSON.parse(raw)); } catch (e) {}
      }
    }

    // Submit team answer with client-side checks and network delivery
    submitAnswer(choice) {
      if (this.publicState.status !== "QUESTION") {
        return { success: false, error: "Submissions are currently closed." };
      }
      if (!this.publicState.currentQuestion) {
        return { success: false, error: "No active question." };
      }

      const q = this.publicState.currentQuestion;
      const validChoice = (q.options || []).some(o => o.id === choice);
      if (!validChoice) {
        return { success: false, error: "Invalid option selected." };
      }

      this.sendToHost({
        type: "SUBMIT_ANSWER",
        teamId: this.currentTeamId,
        questionId: q.id,
        choice: choice,
        submittedAt: Date.now()
      });

      return { success: true };
    }

    // Request paid hint (-25 XP)
    purchaseHint() {
      if (this.publicState.status !== "QUESTION") {
        return { success: false, error: "Hints can only be unlocked while question is active." };
      }
      const q = this.publicState.currentQuestion;
      if (!q || !q.hintAvailable) {
        return { success: false, error: "No hint available for this question." };
      }

      this.sendToHost({
        type: "PURCHASE_HINT",
        teamId: this.currentTeamId,
        questionId: q.id
      });

      return { success: true };
    }

    /* ----------------------------------------------------------------------
       MESSAGING PROTOCOL & PRIVACY ENFORCEMENT
       ---------------------------------------------------------------------- */
    sendToHost(msg) {
      if (this.isHost) {
        this.handleClientMessage(msg);
      } else {
        // Send via WebRTC DataChannel if open
        if (this.hostConnection && this.hostConnection.open) {
          try {
            this.hostConnection.send(msg);
          } catch (e) {
            console.warn("Direct peer send failed, falling back to broadcast:", e);
          }
        }

        // Send via BroadcastChannel for same-device window
        if (this.channel) {
          this.channel.postMessage({
            type: "CLIENT_MESSAGE",
            payload: msg
          });
        }

        localStorage.setItem(STORAGE_PREFIX + "client_msg", JSON.stringify({ msg, t: Date.now() }));
      }
    }

    // Notify ALL teams with their individual private data ONLY
    notifyAllTeamsPrivately() {
      if (!this.isHost) return;
      for (const tId in this.teams) {
        this.notifyTeamPrivately(tId);
      }
    }

    // Send private team data exclusively to that team
    notifyTeamPrivately(teamId) {
      if (!this.isHost) return;
      const team = this.teams[teamId];
      if (!team) return;

      const payload = {
        type: "TEAM_PRIVATE_UPDATE",
        team: {
          id: team.id,
          name: team.name,
          xp: team.xp,
          answers: team.answers || {},
          unlockedHints: team.unlockedHints || {},
          history: team.history || []
        }
      };

      // 1. BroadcastChannel (filtered by currentTeamId in client handler)
      if (this.channel) {
        this.channel.postMessage(payload);
      }

      // 2. Direct WebRTC send to target peer connection
      for (const peerId in this.peerConnections) {
        const conn = this.peerConnections[peerId];
        if (conn && conn.open && conn._teamId === teamId) {
          try { conn.send(payload); } catch (e) {}
        }
      }
    }

    handleChannelMessage(data) {
      if (!data) return;

      if (data.type === "STATE_SYNC") {
        this.onRemoteStateUpdate(data.state);
      } else if (data.type === "CLIENT_MESSAGE" && this.isHost) {
        this.handleClientMessage(data.payload);
      } else if (data.type === "TEAM_PRIVATE_UPDATE") {
        if (data.team && data.team.id === this.currentTeamId) {
          this.emit("teamUpdate", data.team);
        }
      }
    }

    onRemoteStateUpdate(newState) {
      this.publicState = Object.assign({}, this.publicState, newState);
      this.emit("stateChange", this.publicState);
    }

    /* ----------------------------------------------------------------------
       AUTHORITATIVE HOST REQUEST VALIDATION
       ---------------------------------------------------------------------- */
    handleClientMessage(msg) {
      if (!this.isHost || !msg) return;

      const peerId = msg._peerId;

      // 1. TEAM JOIN
      if (msg.type === "TEAM_JOIN") {
        const { teamId, teamName, roomCode } = msg;
        if (!teamId || !teamName) return;

        // Associate peer connection with teamId for targeted private routing
        if (peerId && this.peerConnections[peerId]) {
          this.peerConnections[peerId]._teamId = teamId;
        }

        if (!this.teams[teamId]) {
          this.teams[teamId] = {
            id: teamId,
            name: teamName.slice(0, 32),
            xp: 100, // Strictly 100 XP start balance
            answers: {},
            unlockedHints: {},
            history: [{
              time: Date.now(),
              desc: "Joined competition",
              delta: 100
            }]
          };
        } else {
          // Reconnecting team: update name if changed
          this.teams[teamId].name = teamName.slice(0, 32);
        }

        this.broadcastState();
        this.notifyTeamPrivately(teamId);
        return;
      }

      // 2. SUBMIT ANSWER
      if (msg.type === "SUBMIT_ANSWER") {
        const { teamId, questionId, choice } = msg;
        const team = this.teams[teamId];
        const curQ = this.publicState.currentQuestion;

        // Validation Checks:
        // A. Team exists
        if (!team) {
          this.sendAck(peerId, { type: "SUBMIT_ACK", status: "REJECTED", reason: "Team not registered." });
          return;
        }

        // B. Active status and correct question
        if (this.publicState.status !== "QUESTION" || !curQ || curQ.id !== questionId) {
          this.sendAck(peerId, { type: "SUBMIT_ACK", status: "REJECTED", reason: "Submissions are closed for this question." });
          return;
        }

        // C. Deadline check (with 2-second grace period for network jitter)
        const now = Date.now();
        if (this.publicState.timer.deadline > 0 && now > (this.publicState.timer.deadline + 2000)) {
          this.sendAck(peerId, { type: "SUBMIT_ACK", status: "REJECTED", reason: "Time expired before submission arrived." });
          return;
        }

        // D. Choice is allowed
        const validChoice = (curQ.options || []).some(opt => opt.id === choice);
        if (!validChoice) {
          this.sendAck(peerId, { type: "SUBMIT_ACK", status: "REJECTED", reason: "Invalid choice option." });
          return;
        }

        // E. Duplicate check
        if (!team.answers) team.answers = {};
        if (team.answers[questionId]) {
          this.sendAck(peerId, { type: "SUBMIT_ACK", status: "REJECTED", reason: "Team already submitted an answer." });
          return;
        }

        // Record submission
        team.answers[questionId] = {
          choice: choice,
          submittedAt: now,
          graded: false
        };

        // Recalculate submitted count
        let count = 0;
        for (const t in this.teams) {
          if (this.teams[t].answers && this.teams[t].answers[questionId]) count++;
        }
        this.publicState.submittedCount = count;

        this.sendAck(peerId, {
          type: "SUBMIT_ACK",
          status: "ACCEPTED",
          questionId: questionId,
          choice: choice
        });

        this.broadcastState();
        this.notifyTeamPrivately(teamId);
        return;
      }

      // 3. PURCHASE HINT
      if (msg.type === "PURCHASE_HINT") {
        const { teamId, questionId } = msg;
        const team = this.teams[teamId];
        const curQ = this.publicState.currentQuestion;

        // Validation Checks:
        if (!team) return;

        if (this.publicState.status !== "QUESTION" || !curQ || curQ.id !== questionId) {
          this.sendAck(peerId, { type: "HINT_ACK", status: "REJECTED", reason: "Question is not active." });
          return;
        }

        if (team.answers && team.answers[questionId]) {
          this.sendAck(peerId, { type: "HINT_ACK", status: "REJECTED", reason: "Cannot buy hint after submitting an answer." });
          return;
        }

        if (team.unlockedHints && team.unlockedHints[questionId]) {
          this.sendAck(peerId, { type: "HINT_ACK", status: "ALREADY_OWNED", hint: team.unlockedHints[questionId] });
          return;
        }

        if (team.xp < 25) {
          this.sendAck(peerId, { type: "HINT_ACK", status: "REJECTED", reason: "Insufficient XP (25 required)." });
          return;
        }

        // Find hint text from host competition pack
        let hintText = "Observe subtle lighting, edges, and contextual consistency.";
        if (this.competitionPack && curQ) {
          const round = this.competitionPack.rounds.find(r => r.roundNum === curQ.roundNum);
          const fullItem = round ? round.items.find(it => it.id === questionId) : null;
          if (fullItem && fullItem.hint) hintText = fullItem.hint;
        }

        // Deduct 25 XP atomically
        team.xp -= 25;
        if (!team.unlockedHints) team.unlockedHints = {};
        team.unlockedHints[questionId] = hintText;

        team.history.push({
          time: Date.now(),
          qid: questionId,
          desc: `Unlocked hint (-25 XP): ${curQ.title}`,
          delta: -25
        });

        this.sendAck(peerId, {
          type: "HINT_ACK",
          status: "ACCEPTED",
          questionId: questionId,
          hint: hintText
        });

        this.broadcastState();
        this.notifyTeamPrivately(teamId);
        return;
      }
    }

    sendAck(peerId, ackPayload) {
      if (peerId && this.peerConnections[peerId]) {
        try {
          this.peerConnections[peerId].send(ackPayload);
        } catch (e) {}
      }
      if (this.channel) {
        this.channel.postMessage(ackPayload);
      }
    }
  }

  return new SyncEngine();
}));
