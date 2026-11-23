/* ==========================================================================
   GWiCS: BOT OR NOT? - Projector Screen Controller
   Maintains 16:9 stage display synchronized with Host engine.
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;

  function init() {
    setupFullscreen();

    // Pull initial state from storage if already broadcasting
    const raw = localStorage.getItem("gwics_game_state");
    if (raw) {
      try { handleStateUpdate(JSON.parse(raw)); } catch (e) {}
    }

    Engine.onStateChange(handleStateUpdate);
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

    // Timer
    const timerNum = document.getElementById("stageTimerNum");
    const timerBox = document.getElementById("stageTimerBox");
    if (state.timer) {
      timerNum.textContent = `${state.timer.remaining}s`;
      timerBox.classList.toggle("urgent", state.timer.remaining <= 10 && state.timer.running);
    }

    // View containers
    const lobbyView = document.getElementById("stageLobbyView");
    const questionView = document.getElementById("stageQuestionView");
    const revealOverlay = document.getElementById("stageRevealOverlay");
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
      leaderboardView.style.display = "block";
      if (roundLabel) roundLabel.textContent = "Leaderboard Standings";
      renderLeaderboard(state.leaderboard || []);
      return;
    }

    // 3. Question View (Active or Locked or Revealed)
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

    imgContainer.style.display = "none";
    textContainer.style.display = "none";
    audioContainer.style.display = "none";

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
    }

    // Reveal Overlay (When Host reveals answer)
    if (state.status === "REVEALED") {
      revealOverlay.style.display = "flex";
      const isAI = state.releasedAnswer === "AI" || state.releasedAnswer === "B";
      const badge = document.getElementById("stageRevealBadge");
      badge.textContent = `OFFICIAL VERDICT: ${state.releasedAnswer}`;
      badge.className = `reveal-badge-giant ${isAI ? 'ai' : ''}`;
      document.getElementById("stageRevealTell").innerHTML = `
        <strong>The Tell:</strong> ${state.releasedTell || "Verified by host."}
      `;
    } else {
      revealOverlay.style.display = "none";
    }
  }

  function renderLeaderboard(board) {
    const list = document.getElementById("stageLeaderboardList");
    if (!list) return;

    if (!board.length) {
      list.innerHTML = `<div style="font-size:1.8vw; color:var(--text-muted);">No scores recorded yet.</div>`;
      return;
    }

    list.innerHTML = board.slice(0, 8).map((t, idx) => `
      <div class="stage-board-card">
        <span style="font-family:var(--font-mono); color:var(--gold-400);">#${idx + 1}</span>
        <span>${t.teamName}</span>
        <span style="font-family:var(--font-mono); color:var(--gold-400); text-align:right;">${t.xp} XP</span>
      </div>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
