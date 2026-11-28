/* ==========================================================================
   GWiCS: BOT OR NOT? - Projector Screen Controller
   Maintains 16:9 stage display synchronized with Host engine.
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;
  let timerInterval = null;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    setupFullscreen();

    // Check for room code query param: ?room=BOTORNOT
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room") || "BOTORNOT";

    Engine.initAsProjector(roomCode);
    Engine.onStateChange(handleStateUpdate);
    Engine.onConnectionChange(renderConnection);
    Engine.on("eventMessage", (evt) => {
      if (evt && evt.type === "SESSION_RESET") {
        try {
          localStorage.removeItem("gwics_game_state");
        } catch (e) {}
        if (evt.state) handleStateUpdate(evt.state);
      } else if (evt && evt.type === "REPLAY_AUDIO") {
        const audioPlayer = document.getElementById("stageAudioPlayer");
        if (audioPlayer) {
          audioPlayer.currentTime = 0;
          audioPlayer.play().catch(() => {});
        }
      }
    });

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

    if (status === "CONNECTED_BACKEND") {
      badge.className = "stage-conn-badge connected authoritative";
      text.textContent = "Synced (Backend)";
    } else if (status === "CONNECTED_P2P" || status === "CONNECTED") {
      badge.className = "stage-conn-badge connected p2p";
      text.textContent = "Synced (P2P)";
    } else if (status === "CONNECTING") {
      badge.className = "stage-conn-badge connecting";
      text.textContent = "Connecting...";
    } else if (status === "RECONNECTING") {
      badge.className = "stage-conn-badge connecting";
      text.textContent = "Reconnecting...";
    } else {
      badge.className = "stage-conn-badge offline";
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
    const countdownOverlay = document.getElementById("stageCountdownOverlay");
    const distributionOverlay = document.getElementById("stageDistributionOverlay");
    const leaderboardView = document.getElementById("stageLeaderboardView");
    const roundLabel = document.getElementById("stageRoundLabel");

    // Submissions meter
    const fill = document.getElementById("stageSubmissionsFill");
    const countText = document.getElementById("stageSubmissionsCount");
    const total = state.totalTeams || state.totalPlayers || 0;
    const sub = state.submittedCount || 0;
    const pct = total > 0 ? Math.round((sub / total) * 100) : 0;
    if (fill) fill.style.width = `${pct}%`;
    if (countText) countText.textContent = `${sub} / ${total} Players`;

    const audioPlayer = document.getElementById("stageAudioPlayer");
    const audioStatus = document.getElementById("stageAudioStatus");

    // Pause audio when returning to lobby or showing leaderboard
    if (["LOBBY", "RESULTS", "ROUND_STANDINGS", "COMPLETED", "VOIDED", "REVEALED"].includes(state.status)) {
      if (audioPlayer && !audioPlayer.paused) {
        audioPlayer.pause();
      }
    }

    // 0. Countdown "Get Ready" State
    if (state.status === "COUNTDOWN") {
      lobbyView.style.display = "none";
      questionView.style.display = "none";
      revealOverlay.style.display = "none";
      voidOverlay.style.display = "none";
      if (distributionOverlay) distributionOverlay.style.display = "none";
      leaderboardView.style.display = "none";
      if (countdownOverlay) {
        countdownOverlay.style.display = "flex";
        const titleEl = document.getElementById("stageCountdownTitle");
        const numEl = document.getElementById("stageCountdownNum");
        if (titleEl) titleEl.textContent = state.roundTitle || `Round ${state.roundNum || 1}`;
        if (numEl) numEl.textContent = state.countdown || 3;
      }
      if (roundLabel) roundLabel.textContent = state.roundTitle || `Round ${state.roundNum}: Get Ready`;
      return;
    } else {
      if (countdownOverlay) countdownOverlay.style.display = "none";
    }

    // 1. Lobby View
    if (state.status === "LOBBY") {
      lobbyView.style.display = "flex";
      questionView.style.display = "none";
      revealOverlay.style.display = "none";
      voidOverlay.style.display = "none";
      if (distributionOverlay) distributionOverlay.style.display = "none";
      leaderboardView.style.display = "none";
      document.getElementById("stageTeamsCount").textContent = `${total} Players Ready`;
      document.getElementById("stageRoomCode").textContent = `ROOM: ${state.roomCode || 'BOTORNOT'}`;
      if (roundLabel) roundLabel.textContent = "Pre-Game Lobby";
      return;
    }

    // 2. Interim Round Standings View
    if (state.status === "ROUND_STANDINGS" || state.status === "RESULTS") {
      lobbyView.style.display = "none";
      questionView.style.display = "none";
      revealOverlay.style.display = "none";
      voidOverlay.style.display = "none";
      if (distributionOverlay) distributionOverlay.style.display = "none";
      leaderboardView.style.display = "flex";

      const head = document.getElementById("stageLeaderboardHead");
      const sub = document.getElementById("stageLeaderboardSub");
      if (head) head.textContent = `🏆 Current Standings · Round ${state.roundNum || 1} Complete`;
      if (sub) sub.textContent = `Scores updated after Round ${state.roundNum || 1}. Look at how human instincts rank!`;
      if (roundLabel) roundLabel.textContent = `Interim Standings · Round ${state.roundNum || 1}`;
      renderLeaderboard(state.leaderboard || [], false);
      return;
    }

    // 3. Final Championship Results
    if (state.status === "COMPLETED") {
      lobbyView.style.display = "none";
      questionView.style.display = "none";
      revealOverlay.style.display = "none";
      voidOverlay.style.display = "none";
      if (distributionOverlay) distributionOverlay.style.display = "none";
      leaderboardView.style.display = "flex";

      const head = document.getElementById("stageLeaderboardHead");
      const sub = document.getElementById("stageLeaderboardSub");
      if (head) head.innerHTML = `👑 Final Results · Showdown Complete!`;
      if (sub) sub.textContent = `Congratulations to our top human champions! Outsmarted the bots.`;
      if (roundLabel) roundLabel.textContent = "Final Results · Game Over";
      renderLeaderboard(state.leaderboard || [], true);
      return;
    }

    // 4. Question View (Active or Locked or Revealed or Voided)
    lobbyView.style.display = "none";
    questionView.style.display = "grid";
    leaderboardView.style.display = "none";

    const q = state.currentQuestion;
    if (!q) return;

    if (roundLabel) {
      roundLabel.textContent = `Round ${state.roundNum}: ${q.roundName || q.title || ''}`;
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
      if (audioPlayer) { audioPlayer.pause(); audioPlayer.dataset.qid = ""; }
    } else if (q.type === "text") {
      textContainer.style.display = "grid";
      document.getElementById("stagePassageA").textContent = q.passageA || "";
      document.getElementById("stagePassageB").textContent = q.passageB || "";
      if (audioPlayer) { audioPlayer.pause(); audioPlayer.dataset.qid = ""; }
    } else if (q.type === "audio") {
      audioContainer.style.display = "flex";
      document.getElementById("stageAudioScript").textContent = q.transcript || "";

      // Only load audio when question ID changes (prevents timer ticks from restarting audio)
      if (audioPlayer && audioPlayer.dataset.qid !== q.id) {
        audioPlayer.dataset.qid = q.id;
        audioPlayer.pause();
        const url = (q.audioUrl || q.media || "").replace(/\\/g, "/");
        audioPlayer.src = url;
        audioPlayer.load();
        if (audioStatus) audioStatus.textContent = "Room audio ready — playing from presenter screen";

        audioPlayer.onplay = () => { if (audioStatus) audioStatus.textContent = "🔊 Playing audio for the room..."; };
        audioPlayer.onpause = () => { if (audioStatus) audioStatus.textContent = "⏸ Paused"; };
        audioPlayer.onended = () => {
          if (audioStatus) audioStatus.textContent = "✓ Audio completed · Voting open!";
          if (state.audioPlaying && Engine && typeof Engine.finishAudioPlayback === "function") {
            Engine.finishAudioPlayback();
          }
        };
        audioPlayer.onerror = () => { if (audioStatus) audioStatus.textContent = "⚠️ Audio playback error. Check file."; };

        // Attempt automated playback for the room
        audioPlayer.play().catch(() => {
          if (audioStatus) audioStatus.textContent = "▶ Press play to begin room audio";
        });
      }
    } else if (q.type === "showdown") {
      showdownContainer.style.display = "grid";
      const cont = q.contenders || {};
      document.getElementById("stageContenderA").textContent = cont.A || "Waiting for live response...";
      document.getElementById("stageContenderB").textContent = cont.B || "Waiting for live response...";
      document.getElementById("stageContenderC").textContent = cont.C || "Waiting for live response...";
      if (audioPlayer) { audioPlayer.pause(); audioPlayer.dataset.qid = ""; }
    }

    // Voided Overlay
    if (state.status === "VOIDED") {
      voidOverlay.style.display = "flex";
      revealOverlay.style.display = "none";
      if (distributionOverlay) distributionOverlay.style.display = "none";
      return;
    } else {
      voidOverlay.style.display = "none";
    }

    // Room Reaction / Distribution Overlay (When Submissions are Locked)
    if (state.status === "LOCKED") {
      if (distributionOverlay) {
        distributionOverlay.style.display = "flex";
        const distTitle = document.getElementById("stageDistQTitle");
        if (distTitle) distTitle.textContent = q.prompt || "How Did The Room Vote?";
        const distGrid = document.getElementById("stageDistributionGrid");
        if (distGrid) {
          distGrid.innerHTML = "";
          const distData = state.distribution?.dist || {};
          const totalVotes = state.distribution?.totalVotes || state.submittedCount || 0;

          (q.options || []).forEach(opt => {
            const info = distData[opt.id] || { count: 0, percent: 0 };
            const isAiOpt = opt.id === "AI" || opt.label.includes("AI");

            const card = document.createElement("div");
            card.className = "stage-dist-card";

            const labelRow = document.createElement("div");
            labelRow.className = "stage-dist-label-row";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = opt.label;

            const statSpan = document.createElement("span");
            statSpan.style.fontFamily = "var(--font-mono)";
            statSpan.style.color = isAiOpt ? "var(--cyan-400)" : "var(--gold-400)";
            statSpan.textContent = `${info.percent}% (${info.count} votes)`;

            labelRow.appendChild(nameSpan);
            labelRow.appendChild(statSpan);

            const track = document.createElement("div");
            track.className = "stage-dist-bar-track";

            const bar = document.createElement("div");
            bar.className = `stage-dist-bar-fill ${isAiOpt ? 'ai-fill' : ''}`;
            bar.style.width = `${info.percent}%`;

            track.appendChild(bar);
            card.appendChild(labelRow);
            card.appendChild(track);
            distGrid.appendChild(card);
          });
        }
      }
      revealOverlay.style.display = "none";
      return;
    } else {
      if (distributionOverlay) distributionOverlay.style.display = "none";
    }

    // Reveal Overlay (When Host reveals answer)
    if (state.status === "REVEALED") {
      revealOverlay.style.display = "flex";
      const isShowdown = q.type === "showdown";
      const badge = document.getElementById("stageRevealBadge");
      const isAi = state.releasedAnswer === "AI" || (isShowdown && state.releasedAnswer);
      badge.textContent = isShowdown
        ? `OFFICIAL VERDICT: CONTENDER ${state.releasedAnswer} WAS AI`
        : `OFFICIAL VERDICT: ${state.releasedAnswer}`;
      badge.className = `reveal-badge-giant ${isAi ? 'ai' : ''}`;

      const sourceEl = document.getElementById("stageRevealSource");
      if (sourceEl) {
        sourceEl.textContent = state.releasedSource ? `Origin: ${state.releasedSource}` : "";
      }

      document.getElementById("stageRevealTell").innerHTML = `
        <strong>The Tell:</strong> ${escapeHtml(state.releasedTell || "Verified by host.")}
      `;
    } else {
      revealOverlay.style.display = "none";
    }
  }

  function renderLeaderboard(board, isFinal = false) {
    const list = document.getElementById("stageLeaderboardList");
    if (!list) return;

    list.innerHTML = "";

    if (!board.length) {
      list.innerHTML = `<div style="font-size:1.8vw; color:var(--text-muted); text-align:center; padding:2vw;">No scores recorded yet.</div>`;
      return;
    }

    // For final championship results, display 3-tier podium followed by top runners up
    if (isFinal && board.length >= 1) {
      const podiumGrid = document.createElement("div");
      podiumGrid.className = "stage-podium-grid";

      // Reorder for podium visual: Runner-up (left), Champion (center, tallest), 3rd Place (right)
      const top3 = board.slice(0, 3);
      const podiumOrder = [];
      if (top3[1]) podiumOrder.push({ rank: 2, label: "🥈 #2 Runner-Up", data: top3[1], cls: "rank-2" });
      if (top3[0]) podiumOrder.push({ rank: 1, label: "🥇 #1 Champion", data: top3[0], cls: "rank-1" });
      if (top3[2]) podiumOrder.push({ rank: 3, label: "🥉 #3 Third Place", data: top3[2], cls: "rank-3" });

      podiumOrder.forEach(p => {
        const card = document.createElement("div");
        card.className = `stage-podium-card ${p.cls}`;

        const badge = document.createElement("div");
        badge.style.fontFamily = "var(--font-mono)";
        badge.style.fontWeight = "800";
        badge.style.fontSize = "clamp(13px, 1.6vh, 20px)";
        badge.style.color = p.rank === 1 ? "var(--gold-400)" : (p.rank === 2 ? "#E0E0E0" : "#CD7F32");
        badge.style.marginBottom = "8px";
        badge.textContent = p.label;

        const name = document.createElement("div");
        name.style.fontWeight = "800";
        name.style.fontSize = "clamp(16px, 2.2vh, 28px)";
        name.style.marginBottom = "6px";
        name.textContent = p.data.name || p.data.teamName;

        const xp = document.createElement("div");
        xp.style.fontFamily = "var(--font-mono)";
        xp.style.fontWeight = "800";
        xp.style.fontSize = "clamp(14px, 1.8vh, 22px)";
        xp.style.color = "var(--gold-400)";
        xp.textContent = `${p.data.xp} XP`;

        card.appendChild(badge);
        card.appendChild(name);
        card.appendChild(xp);
        podiumGrid.appendChild(card);
      });

      list.appendChild(podiumGrid);

      // Remaining top 4 and 5
      const remaining = board.slice(3, 5);
      if (remaining.length) {
        remaining.forEach((t, idx) => {
          const card = document.createElement("div");
          card.className = "stage-board-card";

          const rank = document.createElement("span");
          rank.style.fontFamily = "var(--font-mono)";
          rank.style.color = "var(--text-muted)";
          rank.textContent = `#${idx + 4}`;

          const name = document.createElement("span");
          name.textContent = t.name || t.teamName;

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
      return;
    }

    // Standard list for interim round standings
    board.slice(0, 8).forEach((t, idx) => {
      const card = document.createElement("div");
      card.className = "stage-board-card";

      const rank = document.createElement("span");
      rank.style.fontFamily = "var(--font-mono)";
      rank.style.color = "var(--gold-400)";
      rank.textContent = `#${idx + 1}`;

      const name = document.createElement("span");
      name.textContent = t.name || t.teamName;

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

  window.GWICS_Projector = {
    init: init
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    if (window.GWICS_App && window.GWICS_App.getMode() === "presentation") {
      init();
    }
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (window.GWICS_App && window.GWICS_App.getMode() === "presentation") {
        init();
      }
    });
  }
})();
