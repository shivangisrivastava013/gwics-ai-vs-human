/* ==========================================================================
   GWiCS: AI vs Human Showdown - Real-time Sync & State Engine
   Supports:
   1. Cloud Firebase (Firestore & Auth) for live multi-device campus Wi-Fi play.
   2. Local Multi-Window BroadcastChannel for rehearsal, staging & offline play.
   ========================================================================== */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GWICS_SyncEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  "use strict";

  const STORAGE_PREFIX = "gwics_game_";
  const DEFAULT_ROOM_CODE = "BOTORNOT";

  // Public state shape (NEVER contains unreleased answers or tells!)
  function createInitialPublicState() {
    return {
      roomCode: DEFAULT_ROOM_CODE,
      status: "LOBBY", // LOBBY, QUESTION, LOCKED, REVEALED, SHOWDOWN, COMPLETED
      roundNum: 1,
      questionIndex: 0,
      totalQuestions: 25,
      currentQuestion: null, // Public question payload only (no answer, no tell)
      releasedAnswer: null, // Released ONLY when host triggers reveal
      releasedTell: null,
      releasedSource: null,
      timer: {
        total: 45,
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
      this.mode = "local"; // "local" (BroadcastChannel) or "firebase"
      this.channel = null;
      this.listeners = {
        stateChange: [],
        teamUpdate: [],
        eventMessage: []
      };
      
      this.publicState = createInitialPublicState();
      this.teams = {}; // teamId -> team object
      this.isHost = false;
      this.currentTeamId = null;
      this.teamToken = null;

      this.initChannel();
    }

    // Initialize cross-tab BroadcastChannel for zero-config multi-window sync
    initChannel() {
      try {
        if (typeof BroadcastChannel !== "undefined") {
          this.channel = new BroadcastChannel("gwics_game_channel");
          this.channel.onmessage = (event) => this.handleChannelMessage(event.data);
        }
      } catch (e) {
        console.warn("BroadcastChannel unavailable; falling back to storage events:", e);
      }

      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_PREFIX + "state" && e.newValue) {
          try {
            const state = JSON.parse(e.newValue);
            this.onRemoteStateUpdate(state);
          } catch (err) {}
        }
      });
    }

    /* ----------------------------------------------------------------------
       EVENT SUBSCRIPTIONS
       ---------------------------------------------------------------------- */
    onStateChange(cb) {
      this.listeners.stateChange.push(cb);
    }

    onTeamUpdate(cb) {
      this.listeners.teamUpdate.push(cb);
    }

    onEvent(cb) {
      this.listeners.eventMessage.push(cb);
    }

    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => {
        try { cb(data); } catch (err) { console.error("Listener error:", err); }
      });
    }

    /* ----------------------------------------------------------------------
       HOST CONTROLS (Only executed in host context)
       ---------------------------------------------------------------------- */
    initAsHost(competitionPack) {
      this.isHost = true;
      this.competitionPack = competitionPack;
      
      // Load saved state or default
      const savedState = localStorage.getItem(STORAGE_PREFIX + "host_state");
      const savedTeams = localStorage.getItem(STORAGE_PREFIX + "host_teams");

      if (savedState) {
        try { this.publicState = Object.assign(this.publicState, JSON.parse(savedState)); } catch (e) {}
      }
      if (savedTeams) {
        try { this.teams = JSON.parse(savedTeams); } catch (e) {}
      }

      this.broadcastState();
    }

    broadcastState() {
      if (!this.isHost) return;

      this.publicState.totalTeams = Object.keys(this.teams).length;
      this.publicState.leaderboard = this.calculateLeaderboard();
      this.publicState.updatedAt = Date.now();

      // Persist host state
      localStorage.setItem(STORAGE_PREFIX + "host_state", JSON.stringify(this.publicState));
      localStorage.setItem(STORAGE_PREFIX + "host_teams", JSON.stringify(this.teams));
      localStorage.setItem(STORAGE_PREFIX + "state", JSON.stringify(this.publicState));

      // Post across windows
      if (this.channel) {
        this.channel.postMessage({
          type: "STATE_SYNC",
          state: this.publicState
        });
      }

      this.emit("stateChange", this.publicState);
    }

    // Set new question from host pack — Strips answer and tell before broadcasting!
    setQuestion(roundNum, questionIdx) {
      if (!this.isHost) return;
      
      const round = this.competitionPack.rounds.find(r => r.roundNum === roundNum);
      if (!round || !round.items[questionIdx]) return;

      const fullItem = round.items[questionIdx];

      // Reset submissions for this new question
      for (const tId in this.teams) {
        if (!this.teams[tId].answers) this.teams[tId].answers = {};
      }

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
        timeLimit: round.timeLimit || 45
      };

      this.publicState.status = "QUESTION";
      this.publicState.roundNum = roundNum;
      this.publicState.questionIndex = questionIdx;
      this.publicState.currentQuestion = publicQuestion;
      this.publicState.releasedAnswer = null;
      this.publicState.releasedTell = null;
      this.publicState.releasedSource = null;
      this.publicState.submittedCount = 0;
      this.publicState.timer = {
        total: round.timeLimit || 45,
        remaining: round.timeLimit || 45,
        running: true
      };

      this.broadcastState();
      this.startTimerInterval();
    }

    startTimerInterval() {
      clearInterval(this._timerInterval);
      this._timerInterval = setInterval(() => {
        if (!this.isHost || !this.publicState.timer.running) return;

        if (this.publicState.timer.remaining > 0) {
          this.publicState.timer.remaining--;
          // Broadcast pulse every tick
          this.broadcastState();
        } else {
          this.publicState.timer.running = false;
          this.lockSubmissions();
        }
      }, 1000);
    }

    pauseTimer() {
      if (!this.isHost) return;
      this.publicState.timer.running = !this.publicState.timer.running;
      this.broadcastState();
    }

    lockSubmissions() {
      if (!this.isHost) return;
      this.publicState.status = "LOCKED";
      this.publicState.timer.running = false;
      this.broadcastState();
    }

    // Host reveals the official verdict & scores all answers securely
    revealAnswer() {
      if (!this.isHost) return;

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
      this.notifyTeams();
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
      this.notifyTeams();
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
      this.currentTeamId = savedToken || ("team_" + Math.random().toString(36).substr(2, 9));
      this.teamToken = this.currentTeamId;

      // Request join from host
      this.sendToHost({
        type: "TEAM_JOIN",
        teamId: this.currentTeamId,
        teamName: teamName.trim(),
        roomCode: roomCode.trim().toUpperCase()
      });

      // Fetch latest state from storage if available
      const raw = localStorage.getItem(STORAGE_PREFIX + "state");
      if (raw) {
        try { this.onRemoteStateUpdate(JSON.parse(raw)); } catch (e) {}
      }
    }

    // Submit team answer (One submission per question)
    submitAnswer(choice) {
      if (this.publicState.status !== "QUESTION") {
        return { success: false, error: "Submissions are currently locked." };
      }
      if (!this.publicState.currentQuestion) {
        return { success: false, error: "No active question." };
      }

      const qId = this.publicState.currentQuestion.id;

      this.sendToHost({
        type: "SUBMIT_ANSWER",
        teamId: this.currentTeamId,
        questionId: qId,
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
       COMMUNICATION PROTOCOL & DISPATCH
       ---------------------------------------------------------------------- */
    sendToHost(msg) {
      if (this.isHost) {
        this.handleClientMessage(msg);
      } else {
        if (this.channel) {
          this.channel.postMessage({
            type: "CLIENT_MESSAGE",
            payload: msg
          });
        }
        // LocalStorage fallback trigger
        localStorage.setItem(STORAGE_PREFIX + "client_msg", JSON.stringify({ msg, t: Date.now() }));
      }
    }

    notifyTeams() {
      if (this.channel) {
        this.channel.postMessage({
          type: "TEAMS_UPDATE",
          teams: this.teams
        });
      }
    }

    handleChannelMessage(data) {
      if (!data) return;

      if (data.type === "STATE_SYNC") {
        this.onRemoteStateUpdate(data.state);
      } else if (data.type === "CLIENT_MESSAGE" && this.isHost) {
        this.handleClientMessage(data.payload);
      } else if (data.type === "TEAMS_UPDATE") {
        if (data.teams && this.currentTeamId && data.teams[this.currentTeamId]) {
          this.emit("teamUpdate", data.teams[this.currentTeamId]);
        }
      }
    }

    onRemoteStateUpdate(newState) {
      this.publicState = Object.assign({}, this.publicState, newState);
      this.emit("stateChange", this.publicState);
    }

    handleClientMessage(msg) {
      if (!this.isHost || !msg) return;

      if (msg.type === "TEAM_JOIN") {
        const { teamId, teamName, roomCode } = msg;
        if (!this.teams[teamId]) {
          this.teams[teamId] = {
            id: teamId,
            name: teamName || "Team " + (Object.keys(this.teams).length + 1),
            xp: 100, // Starting balance is strictly 100 XP as specified
            answers: {},
            unlockedHints: {},
            history: [{
              time: Date.now(),
              desc: "Joined competition",
              delta: 100
            }]
          };
        }
        this.broadcastState();
        this.notifyTeams();
      } else if (msg.type === "SUBMIT_ANSWER") {
        const { teamId, questionId, choice } = msg;
        const team = this.teams[teamId];
        if (!team) return;

        // Internal duplicate submission guard
        if (!team.answers) team.answers = {};
        if (team.answers[questionId]) {
          console.warn(`Team ${team.name} already answered question ${questionId}.`);
          return;
        }

        team.answers[questionId] = {
          choice: choice,
          submittedAt: Date.now(),
          graded: false
        };

        // Recalculate submitted count
        let count = 0;
        for (const t in this.teams) {
          if (this.teams[t].answers && this.teams[t].answers[questionId]) count++;
        }
        this.publicState.submittedCount = count;
        this.broadcastState();
        this.notifyTeams();
      } else if (msg.type === "PURCHASE_HINT") {
        const { teamId, questionId } = msg;
        const team = this.teams[teamId];
        if (!team) return;

        // Guard: check if already bought
        if (team.unlockedHints && team.unlockedHints[questionId]) return;

        // Guard: sufficient XP
        if (team.xp < 25) return;

        // Deduct XP and find hint in host vault
        team.xp -= 25;
        if (!team.unlockedHints) team.unlockedHints = {};

        // Find hint text from host vault
        const q = this.publicState.currentQuestion;
        let hintText = "Focus on the details.";
        if (this.competitionPack && q) {
          const round = this.competitionPack.rounds.find(r => r.roundNum === q.roundNum);
          const fullItem = round ? round.items.find(it => it.id === questionId) : null;
          if (fullItem && fullItem.hint) hintText = fullItem.hint;
        }

        team.unlockedHints[questionId] = hintText;
        team.history.push({
          time: Date.now(),
          qid: questionId,
          desc: "Unlocked hint (-25 XP)",
          delta: -25
        });

        this.broadcastState();
        this.notifyTeams();
      }
    }
  }

  return new SyncEngine();
}));
