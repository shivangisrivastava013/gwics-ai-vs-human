/* ==========================================================================
   GWiCS: BOT OR NOT? - Projector Screen Controller
   Maintains 16:9 stage display synchronized with Host engine.
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;
  let timerInterval = null;

  function init() {
    setupFullscreen();

    // Check for room code query param: ?room=BOTORNOT
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room") || "BOTORNOT";

    Engine.initAsProjector(roomCode);
    Engine.onStateChange(handleStateUpdate);
    Engine.onConnectionChange(renderConnection);

    renderConnection(Engine.connectionStatus);

    // Pull initial state from storage if already broadcasting
    const raw = localStorage.getItem("gwics_game_state");
    if (raw) {
      try { handleStateUpdate(JSON.parse(raw)); } catch (e) {}
    }
  }

  function renderConnection(status) {
    const badge = document.getElementById("stageConnBadge");
    const text = document.getElementById("stageConnText");
    if (!badge || !text) return;

    badge.className = `stage-conn-badge ${status.toLowerCase()}`;
    if (status === "CONNECTED") {
      text.textContent = "Synced";
    } else if (status === "CONNECTING") {
      text.textContent = "Connecting...";
    } else if (status === "RECONNECTING") {
      text.textContent = "Reconnecting...";
    } else {
      text.textContent = "Local";
    }
  }

  function setupFullscreen() {
    const btn = document.getElementById("btnFullscreen");
    function toggle() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
    if (btn) btn.onclick = toggle;
    document.addEventListener("keydown", (e) => {
      if (e.key === "f" || e.key === "F") toggle();
    });
  }

  function handleStateUpdate(state) {
    if (!state) return;

    // Timer: compute from absolute deadline to avoid background tab drift
    const timerNum = document.getElementById("stageTimerNum");
    const timerBox = document.getElementById("stageTimerBox");

    clearInterval(timerInterval);
    function updateTimer() {
      if (!state.timer) return;
      let rem = state.timer.remaining;
      if (state.timer.running && state.timer.deadline > 0) {
        rem = Math.max(0, Math.ceil((state.timer.deadline - Date.now()) / 1000));
      }
      timerNum.textContent = `${rem}s`;
      timerBox.classList.toggle("urgent", rem <= 10 && state.timer.running);
    }
    updateTimer();
    if (state.timer && state.timer.running) {
      timerInterval = setInterval(updateTimer, 500);
    }

    // View containers
    const lobbyView = document.getElementById("stageLobbyView");
    const questionView = document.getElementById("stageQuestionView");
    const revealOverlay = document.getElementById("stageRevealOverlay");
    const voidOverlay = document.getElementById("stageVoidOverlay");
    const leaderboardView = document.getElementById("stageLeaderboardView");
    const roundLabel = document.getElementById("stageRoundLabel");

    // Submissions meter
    const fill = document.getElementById("stageSubmissionsFill");
    const countText = document.getElementById("stageSubmissionsCount");
    const total = state.totalTeams || 0;
    const sub = state.submittedCount || 0;
    const pct = total > 0 ? Math.round((sub / total) * 100) : 0;
    if (fill) fill.style.width = `${pct}%`;
    if (countText) countText.textContent = `${sub} / ${total} Teams`;

    // 1. Lobby View
    if (state.status === "LOBBY") {
      lobbyView.style.display = "block";
      questionView.style.display = "none";
      revealOverlay.style.display = "none";
      voidOverlay.style.display = "none";
      leaderboardView.style.display = "none";
      document.getElementById("stageTeamsCount").textContent = `${total} Teams Ready at Tables`;
      document.getElementById("stageRoomCode").textContent = `ROOM: ${state.roomCode || 'BOTORNOT'}`;
      if (roundLabel) roundLabel.textContent = "Pre-Game Lobby";
      return;
    }

    // 2. Leaderboard View
    if (state.status === "RESULTS") {
      lobbyView.style.display = "none";
      questionView.style.display = "none";
      revealOverlay.style.display = "none";
      voidOverlay.style.display = "none";
      leaderboardView.style.display = "block";
      if (roundLabel) roundLabel.textContent = "Leaderboard Standings";
      renderLeaderboard(state.leaderboard || []);
      return;
    }

    // 3. Question View (Active or Locked or Revealed or Voided)
    lobbyView.style.display = "none";
    questionView.style.display = "flex";
    leaderboardView.style.display = "none";

    const q = state.currentQuestion;
    if (!q) return;

    if (roundLabel) {
      roundLabel.textContent = `Round ${state.roundNum}: ${q.roundName || ''}`;
    }

    document.getElementById("stageQTitle").textContent = q.title;
    document.getElementById("stageQPrompt").textContent = q.prompt;

    // Media Switch
    const imgContainer = document.getElementById("stageImgContainer");
    const textContainer = document.getElementById("stageTextContainer");
    const audioContainer = document.getElementById("stageAudioContainer");
    const showdownContainer = document.getElementById("stageShowdownContainer");

    imgContainer.style.display = "none";
    textContainer.style.display = "none";
    audioContainer.style.display = "none";
    showdownContainer.style.display = "none";

    if (q.type === "image" && q.media) {
      imgContainer.style.display = "flex";
      document.getElementById("stageImgEl").src = q.media;
    } else if (q.type === "text") {
      textContainer.style.display = "grid";
      document.getElementById("stagePassageA").textContent = q.passageA || "";
      document.getElementById("stagePassageB").textContent = q.passageB || "";
    } else if (q.type === "audio") {
      audioContainer.style.display = "flex";
      document.getElementById("stageAudioScript").textContent = q.transcript || "";
    } else if (q.type === "showdown") {
      showdownContainer.style.display = "grid";
    }

    // Voided Overlay
    if (state.status === "VOIDED") {
      voidOverlay.style.display = "flex";
      revealOverlay.style.display = "none";
      return;
    } else {
      voidOverlay.style.display = "none";
    }

    // Reveal Overlay (When Host reveals answer)
    if (state.status === "REVEALED") {
      revealOverlay.style.display = "flex";
      const isAI = state.releasedAnswer === "AI" || state.releasedAnswer === "B" || state.releasedAnswer === "C";
      const badge = document.getElementById("stageRevealBadge");
      badge.textContent = `OFFICIAL VERDICT: ${state.releasedAnswer}`;
      badge.className = `reveal-badge-giant ${isAI ? 'ai' : ''}`;
      document.getElementById("stageRevealTell").innerHTML = `
        <strong>The Tell:</strong> ${escapeHtml(state.releasedTell || "Verified by host.")}
      `;
    } else {
      revealOverlay.style.display = "none";
    }
  }

  function renderLeaderboard(board) {
    const list = document.getElementById("stageLeaderboardList");
    if (!list) return;

    list.innerHTML = "";

    if (!board.length) {
      list.innerHTML = `<div style="font-size:1.8vw; color:var(--text-muted); text-align:center; padding:2vw;">No scores recorded yet.</div>`;
      return;
    }

    board.slice(0, 8).forEach((t, idx) => {
      const card = document.createElement("div");
      card.className = "stage-board-card";

      const rank = document.createElement("span");
      rank.style.fontFamily = "var(--font-mono)";
      rank.style.color = "var(--gold-400)";
      rank.textContent = `#${idx + 1}`;

      const name = document.createElement("span");
      name.textContent = t.teamName;

      const xp = document.createElement("span");
      xp.style.fontFamily = "var(--font-mono)";
      xp.style.color = "var(--gold-400)";
      xp.style.textAlign = "right";
      xp.textContent = `${t.xp} XP`;

      card.appendChild(rank);
      card.appendChild(name);
      card.appendChild(xp);

      list.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
