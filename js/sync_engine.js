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
      sessionId: null,
      packHash: null,
      status: "LOBBY", // LOBBY, COUNTDOWN, QUESTION, LOCKED, VOIDED, REVEALED, ROUND_STANDINGS, COMPLETED
      roundNum: 1,
      roundTitle: "Round 1: Reality Check",
      questionIndex: 0,
      totalQuestions: 18,
      countdown: 3,
      audioPlaying: false,
      replaysLeft: 1,
      currentQuestion: null, // Public question payload only (no answer, no tell)
      releasedAnswer: null, // Released ONLY when host triggers reveal
      releasedTell: null,
      releasedSource: null,
      voidReason: null,
      distribution: null,
      timer: {
        total: 45,
        deadline: 0,
        remaining: 45,
        running: false
      },
      submittedCount: 0,
      totalPlayers: 0,
      totalTeams: 0,
      leaderboard: [],
      updatedAt: Date.now()
    };
  }

  class SyncEngine {
    constructor() {
      this.mode = "hybrid"; // peerjs + broadcast + firebase + backend
      this.connectionStatus = "OFFLINE"; // OFFLINE, CONNECTING, CONNECTED_P2P, CONNECTED_BACKEND, RECONNECTING
      this.channel = null;
      this.peer = null;
      this.peerConnections = {}; // peerId -> connection (for host)
      this.hostConnection = null; // connection to host (for participant & projector)
      this.backendActive = false;
      this.backendUrl = null;
      this.sseEventSource = null;
      
      this.listeners = {
        stateChange: [],
        teamUpdate: [],
        connectionChange: [],
        peersChange: [],
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
    onPeersChange(cb) { this.listeners.peersChange.push(cb); }
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
       AUTHORITATIVE BACKEND & SSE NETWORKING
       ---------------------------------------------------------------------- */
    async checkBackend() {
      // Priority order:
      // 1. URL parameter: ?backend=https://...
      // 2. Global window configuration: window.BOTORNOT_BACKEND_URL or window.GWICS_BACKEND_URL
      // 3. Stored organizer setting: localStorage.getItem("gwics_backend_url")
      // 4. Localhost fallback: http://localhost:3000
      let candidate = null;
      try {
        if (typeof window !== "undefined" && window.location) {
          const urlParams = new URLSearchParams(window.location.search);
          candidate = urlParams.get("backend");
        }
      } catch (e) {}

      if (!candidate && typeof window !== "undefined") {
        candidate = window.BOTORNOT_BACKEND_URL || window.GWICS_BACKEND_URL || localStorage.getItem("gwics_backend_url");
      }

      if (!candidate && typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        candidate = `http://${window.location.hostname}:3000`;
      }

      if (!candidate) return null;
      candidate = candidate.replace(/\/+$/, "");

      try {
        const res = await fetch(`${candidate}/api/state`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const json = await res.json();
          this.backendUrl = candidate;
          this.backendActive = true;
          if (json && (json.state || json.status)) {
            this.onRemoteStateUpdate(json.state || json);
          }
          return candidate;
        }
      } catch (e) {}
      return null;
    }

    connectBackendSSE() {
      if (!this.backendUrl || typeof EventSource === "undefined") return;
      if (this.sseEventSource) {
        this.sseEventSource.close();
      }
      try {
        const sse = new EventSource(`${this.backendUrl}/api/events`);
        this.sseEventSource = sse;
        sse.onopen = () => {
          this.setConnectionStatus("CONNECTED_BACKEND");
        };
        sse.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data && data.state) {
              this.onRemoteStateUpdate(data.state);
            }
            if (data && data.type === "EVENT_MESSAGE" && data.event) {
              this.emit("eventMessage", data.event);
            }
            if (data && data.type === "REPLAY_AUDIO") {
              this.emit("eventMessage", { type: "REPLAY_AUDIO" });
            }
            if (data && data.type === "SESSION_RESET") {
              try {
                localStorage.removeItem("gwics_captain_session");
                localStorage.removeItem("botornot_player_session");
                sessionStorage.removeItem("gwics_captain_session");
                sessionStorage.removeItem("botornot_player_session");
              } catch (e) {}
              this.currentTeamId = null;
              this.currentTeamName = "";
              this.emit("eventMessage", data);
            }
          } catch (err) {}
        };
        sse.onerror = () => {
          this.setConnectionStatus("RECONNECTING");
        };
      } catch (e) {
        console.warn("SSE connection error:", e);
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
        // Connect to public PeerJS cloud signaling with multi-STUN resilience
        this.peer = new Peer(hostId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              { urls: "stun:stun3.l.google.com:19302" },
              { urls: "stun:stun4.l.google.com:19302" },
              { urls: "stun:global.stun.twilio.com:3478" }
            ]
          }
        });

        this.peer.on("open", (id) => {
          console.log("Host WebRTC Peer opened with ID:", id);
          this.setConnectionStatus("CONNECTED");
          this.emit("peersChange", Object.keys(this.peerConnections).length);

          // Heartbeat interval to prevent NAT / cellular disconnection
          clearInterval(this._pingInterval);
          this._pingInterval = setInterval(() => {
            for (const p in this.peerConnections) {
              const c = this.peerConnections[p];
              if (c && c.open) {
                try { c.send({ type: "GWICS_PING" }); } catch (e) {}
              }
            }
          }, 8000);
        });

        this.peer.on("connection", (conn) => {
          this.setupHostPeerConnection(conn);
        });

        this.peer.on("error", (err) => {
          console.warn("PeerJS Host Error:", err.type, err.message);
          if (err.type === "unavailable-id") {
            console.warn("Host peer ID is busy. Using secondary peer session.");
          }
          // Do NOT mislead user with CONNECTED when cloud peer failed!
          this.setConnectionStatus("LOCAL_ONLY");
        });

        this.peer.on("disconnected", () => {
          this.setConnectionStatus("RECONNECTING");
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

      } catch (e) {
        console.error("PeerJS initialization failed:", e);
        this.setConnectionStatus("LOCAL_ONLY");
      }
    }

    setupHostPeerConnection(conn) {
      conn.on("open", () => {
        this.peerConnections[conn.peer] = conn;
        this.emit("peersChange", Object.keys(this.peerConnections).length);

        // Immediately send current public state to newly connected client
        conn.send({
          type: "STATE_SYNC",
          state: this.publicState
        });
      });

      conn.on("data", (data) => {
        if (!data) return;
        if (data.type === "GWICS_PING") {
          try { conn.send({ type: "GWICS_PONG" }); } catch (e) {}
          return;
        }
        if (data.type === "GWICS_PONG") return;

        // Bind the connection to the message for targeted responses
        data._peerId = conn.peer;
        this.handleClientMessage(data);
      });

      conn.on("close", () => {
        delete this.peerConnections[conn.peer];
        this.emit("peersChange", Object.keys(this.peerConnections).length);
      });

      conn.on("error", () => {
        delete this.peerConnections[conn.peer];
        this.emit("peersChange", Object.keys(this.peerConnections).length);
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
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              { urls: "stun:stun3.l.google.com:19302" },
              { urls: "stun:stun4.l.google.com:19302" },
              { urls: "stun:global.stun.twilio.com:3478" }
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

      if (data.type === "GWICS_PING") {
        if (this.hostConnection && this.hostConnection.open) {
          try { this.hostConnection.send({ type: "GWICS_PONG" }); } catch (e) {}
        }
        return;
      }
      if (data.type === "GWICS_PONG") return;

      if (data.type === "STATE_SYNC") {
        this.onRemoteStateUpdate(data.state);
      } else if (data.type === "SESSION_RESET") {
        try {
          localStorage.removeItem("gwics_captain_session");
          localStorage.removeItem("botornot_player_session");
          sessionStorage.removeItem("gwics_captain_session");
          sessionStorage.removeItem("botornot_player_session");
        } catch (e) {}
        this.currentTeamId = null;
        this.currentTeamName = "";
        this.onRemoteStateUpdate(data.state);
        this.emit("eventMessage", data);
      } else if (data.type === "TEAM_PRIVATE_UPDATE") {
        if (data.team && data.team.id === this.currentTeamId) {
          this.emit("teamUpdate", data.team);
        }
      } else if (data.type === "EVENT_MESSAGE" && data.event) {
        this.emit("eventMessage", data.event);
      } else if (data.type === "REPLAY_AUDIO") {
        this.emit("eventMessage", { type: "REPLAY_AUDIO" });
      } else if (data.type === "SUBMIT_ACK" || data.type === "HINT_ACK") {
        this.emit("eventMessage", data);
      }
    }

    /* ----------------------------------------------------------------------
       HOST CONTROLS
       ---------------------------------------------------------------------- */
    async initAsHost(competitionPack, roomCode = DEFAULT_ROOM_CODE) {
      this.isHost = true;
      this.competitionPack = competitionPack;
      this.roomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
      this.publicState.roomCode = this.roomCode;

      const backend = await this.checkBackend();
      if (backend) {
        this.connectBackendSSE();
        this.setConnectionStatus("CONNECTED_BACKEND");
      } else {
        this.initPeerAsHost(this.roomCode);
      }

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

      this.broadcastState();
    }

    setCompetitionPack(pack) {
      this.competitionPack = pack;
    }

    async resetSession() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      this.publicState = createInitialPublicState();
      this.publicState.roomCode = this.roomCode;
      this.teams = {};

      if (this.backendActive && this.backendUrl) {
        try {
          await fetch(`${this.backendUrl}/api/host/action`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(this.hostToken ? { "Authorization": `Bearer ${this.hostToken}` } : {})
            },
            body: JSON.stringify({ action: "RESET_SESSION" })
          });
        } catch (e) {
          console.warn("Backend resetSession error:", e);
        }
      }

      try {
        localStorage.removeItem(STORAGE_PREFIX + "host_state");
        localStorage.removeItem(STORAGE_PREFIX + "host_teams");
        localStorage.removeItem(STORAGE_PREFIX + "state");
        localStorage.removeItem(STORAGE_PREFIX + "client_msg");
      } catch (e) {}

      const resetPayload = {
        type: "SESSION_RESET",
        state: this.publicState
      };

      if (this.channel) {
        try { this.channel.postMessage(resetPayload); } catch (e) {}
      }

      for (const peerId in this.peerConnections) {
        const conn = this.peerConnections[peerId];
        if (conn && conn.open) {
          try { conn.send(resetPayload); } catch (e) {}
        }
      }

      this.broadcastState();
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

    // Start 3-second Get Ready countdown
    startQuestionCountdown(roundNum, questionIdx) {
      if (!this.isHost || !this.competitionPack) return;
      const round = (roundNum === 0 && this.competitionPack.practice)
        ? { title: "Practice Question", name: "Practice Question" }
        : this.competitionPack.rounds.find(r => r.roundNum === roundNum);
      if (!round) return;

      clearInterval(this._countdownInterval);
      clearInterval(this._timerInterval);

      this.publicState.status = "COUNTDOWN";
      this.publicState.roundNum = roundNum;
      this.publicState.roundTitle = round.title || round.name || `Round ${roundNum}`;
      this.publicState.questionIndex = questionIdx;
      this.publicState.countdown = 3;
      this.broadcastState();

      let count = 3;
      this._countdownInterval = setInterval(() => {
        count--;
        this.publicState.countdown = count;
        if (count <= 0) {
          clearInterval(this._countdownInterval);
          this.setQuestion(roundNum, questionIdx);
        } else {
          this.broadcastState();
        }
      }, 1000);
    }

    // Set new question from host pack — Strips answer and tell before broadcasting!
    setQuestion(roundNum, questionIdx) {
      if (!this.isHost || !this.competitionPack) return;

      let round = null;
      let fullItem = null;

      if (roundNum === 0 && this.competitionPack.practice) {
        fullItem = this.competitionPack.practice;
        round = { roundNum: 0, title: "Practice Question", name: "Practice Question", timeLimit: 30 };
      } else {
        round = this.competitionPack.rounds.find(r => r.roundNum === roundNum);
        if (!round || !round.items || !round.items[questionIdx]) return;
        fullItem = round.items[questionIdx];
      }

      const duration = fullItem.timeLimit || round.timeLimit || 45;
      const isAudio = fullItem.type === "audio";
      const listenFirst = Boolean(fullItem.listenFirst || round.listenFirst);
      const deadline = Date.now() + (duration * 1000);

      // PUBLIC PAYLOAD: Strictly NO ans and NO tell!
      const publicQuestion = {
        id: fullItem.id,
        roundNum: roundNum,
        roundName: round.title || round.name,
        questionIndex: questionIdx,
        title: fullItem.title,
        prompt: fullItem.prompt,
        type: fullItem.type,
        media: fullItem.media || null,
        cardImage: fullItem.cardImage || null,
        passageA: fullItem.passageA || null,
        passageB: fullItem.passageB || null,
        audioUrl: fullItem.type === "audio" ? String(fullItem.audioUrl || fullItem.media || "").replace(/\\/g, "/") : null,
        transcript: fullItem.transcript || null,
        audioAccessibilityNotes: fullItem.audioAccessibilityNotes || null,
        contenders: fullItem.contenders || null,
        options: fullItem.options || [],
        hintAvailable: !!fullItem.hint,
        timeLimit: duration,
        listenFirst: listenFirst,
        isPractice: Boolean(fullItem.isPractice)
      };

      this.publicState.status = "QUESTION";
      this.publicState.roundNum = roundNum;
      this.publicState.roundTitle = round.title || round.name;
      this.publicState.questionIndex = questionIdx;
      this.publicState.currentQuestion = publicQuestion;
      this.publicState.releasedAnswer = null;
      this.publicState.releasedTell = null;
      this.publicState.releasedSource = null;
      this.publicState.voidReason = null;
      this.publicState.distribution = null;
      this.publicState.audioPlaying = isAudio && listenFirst;
      this.publicState.replaysLeft = isAudio ? 1 : 0;
      this.publicState.submittedCount = 0;
      this.publicState.timer = {
        total: duration,
        deadline: deadline,
        remaining: duration,
        running: !(isAudio && listenFirst)
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
      if (this.publicState.timer.running) {
        this.startTimerInterval();
      }
    }

    sendProjectorAudioFinished(questionId) {
      const payload = { type: "PROJECTOR_AUDIO_FINISHED", questionId };
      // 1. Direct PeerJS WebRTC DataChannel to host
      if (this.hostConnection && this.hostConnection.open) {
        try { this.hostConnection.send(payload); } catch (e) {}
      }
      // 2. BroadcastChannel to local host window on same machine
      if (this.channel) {
        try { this.channel.postMessage(payload); } catch (e) {}
      }
      // 3. Authoritative backend endpoint
      if (this.backendActive && this.backendUrl) {
        fetch(`${this.backendUrl}/api/projector/audio_finished`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
      // 4. In-process host execution if host is in the same runtime
      if (this.isHost) {
        this.finishAudioPlayback();
      }
    }

    finishAudioPlayback() {
      if (!this.isHost) return;
      if (this.publicState.audioPlaying) {
        this.publicState.audioPlaying = false;
        const dur = this.publicState.timer.total || 20;
        this.publicState.timer.remaining = dur;
        this.publicState.timer.deadline = Date.now() + (dur * 1000);
        this.publicState.timer.running = true;
        this.broadcastState();
        this.startTimerInterval();
      }
    }

    replayAudio() {
      if (!this.isHost) return;
      if (this.publicState.replaysLeft > 0) {
        this.publicState.replaysLeft--;
        this.publicState.audioPlaying = true;
        this.publicState.timer.running = false;
        clearInterval(this._timerInterval);
        this.broadcastState();

        const replayMsg = { type: "REPLAY_AUDIO" };

        // 1. Local BroadcastChannel
        if (this.channel) {
          try { this.channel.postMessage(replayMsg); } catch (e) {}
        }

        // 2. Network PeerJS connections (projector and players)
        for (const peerId in this.peerConnections) {
          const conn = this.peerConnections[peerId];
          if (conn && conn.open) {
            try { conn.send({ type: "EVENT_MESSAGE", event: replayMsg }); } catch (e) {}
          }
        }

        // 3. Authoritative backend REST action
        if (this.backendActive && this.backendUrl) {
          fetch(`${this.backendUrl}/api/host/action`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(this.hostToken ? { "Authorization": `Bearer ${this.hostToken}` } : {})
            },
            body: JSON.stringify({ action: "REPLAY_AUDIO" })
          }).catch(() => {});
        }
      }
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

    calculateDistribution() {
      const q = this.publicState.currentQuestion;
      if (!q) return null;
      const counts = {};
      let totalVotes = 0;
      (q.options || []).forEach(opt => counts[opt.id] = 0);

      for (const tId in this.teams) {
        const sub = (this.teams[tId].answers || {})[q.id];
        if (sub && sub.choice) {
          if (counts[sub.choice] !== undefined) {
            counts[sub.choice]++;
          } else {
            counts[sub.choice] = 1;
          }
          totalVotes++;
        }
      }

      const dist = {};
      for (const optId in counts) {
        const cnt = counts[optId];
        const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
        dist[optId] = { count: cnt, percent: pct };
      }
      return { totalVotes, dist };
    }

    lockSubmissions() {
      if (!this.isHost) return;
      this.publicState.status = "LOCKED";
      this.publicState.timer.running = false;
      this.publicState.distribution = this.calculateDistribution();
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
    async initAsParticipant(roomCode, teamName, savedToken = null) {
      this.isHost = false;
      this.roomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();
      this.currentTeamName = (teamName || "").trim();
      this.currentTeamId = savedToken || ("team_" + Math.random().toString(36).substr(2, 9));

      const backend = await this.checkBackend();
      if (backend) {
        this.connectBackendSSE();
        this.setConnectionStatus("CONNECTED_BACKEND");
        try {
          const res = await fetch(`${this.backendUrl}/api/player/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: this.currentTeamName,
              roomCode: this.roomCode
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.player) {
              this.currentTeamId = data.player.id;
              this.emit("teamUpdate", data.player);
            }
          }
        } catch (e) {
          console.warn("Backend join error:", e);
        }
      } else {
        // Fall back to WebRTC Peer relay
        this.initPeerAsClient(this.roomCode, false);
        this.sendToHost({
          type: "TEAM_JOIN",
          teamId: this.currentTeamId,
          teamName: this.currentTeamName,
          roomCode: this.roomCode
        });
      }

      // Load cached local state if available
      const raw = localStorage.getItem(STORAGE_PREFIX + "state");
      if (raw) {
        try { this.onRemoteStateUpdate(JSON.parse(raw)); } catch (e) {}
      }
    }

    async initAsProjector(roomCode = DEFAULT_ROOM_CODE) {
      this.isHost = false;
      this.isProjector = true;
      this.roomCode = (roomCode || DEFAULT_ROOM_CODE).toUpperCase().trim();

      const backend = await this.checkBackend();
      if (backend) {
        this.connectBackendSSE();
        this.setConnectionStatus("CONNECTED_BACKEND");
      } else {
        this.initPeerAsClient(this.roomCode, true);
      }

      const raw = localStorage.getItem(STORAGE_PREFIX + "state");
      if (raw) {
        try { this.onRemoteStateUpdate(JSON.parse(raw)); } catch (e) {}
      }
    }

    // Submit team answer with client-side checks and network delivery
    async submitAnswer(choice) {
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

      if (this.backendActive && this.backendUrl) {
        try {
          const res = await fetch(`${this.backendUrl}/api/player/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: this.currentTeamId,
              questionId: q.id,
              choice: choice
            })
          });
          const json = await res.json();
          if (res.ok && json.success) {
            return { success: true };
          }
          return { success: false, error: json.error || "Submission rejected by backend" };
        } catch (e) {
          console.warn("Backend submit error, falling back to relay:", e);
        }
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
    async purchaseHint() {
      if (this.publicState.status !== "QUESTION") {
        return { success: false, error: "Hints can only be unlocked while question is active." };
      }
      const q = this.publicState.currentQuestion;
      if (!q || !q.hintAvailable) {
        return { success: false, error: "No hint available for this question." };
      }

      if (this.backendActive && this.backendUrl) {
        try {
          const res = await fetch(`${this.backendUrl}/api/player/hint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: this.currentTeamId,
              questionId: q.id
            })
          });
          const json = await res.json();
          if (res.ok && json.success) {
            return { success: true, hint: json.hint };
          }
          return { success: false, error: json.error || "Hint purchase rejected by backend" };
        } catch (e) {
          console.warn("Backend hint error, falling back to relay:", e);
        }
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
      } else if (data.type === "PROJECTOR_AUDIO_FINISHED" && this.isHost) {
        if (this.publicState.audioPlaying && (!data.questionId || !this.publicState.currentQuestion || data.questionId === this.publicState.currentQuestion.id)) {
          this.finishAudioPlayback();
        }
      } else if (data.type === "REPLAY_AUDIO") {
        this.emit("eventMessage", { type: "REPLAY_AUDIO" });
      } else if (data.type === "EVENT_MESSAGE" && data.event) {
        this.emit("eventMessage", data.event);
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

      // 0. PROJECTOR AUDIO FINISHED
      if (msg.type === "PROJECTOR_AUDIO_FINISHED") {
        if (this.publicState.audioPlaying && (!msg.questionId || !this.publicState.currentQuestion || msg.questionId === this.publicState.currentQuestion.id)) {
          this.finishAudioPlayback();
        }
        return;
      }

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
