/* ==========================================================================
   GWiCS: BOT OR NOT? - Host Mission Control Engine
   Controls Session State, Answer Revealing, XP Adjustments & Projector Sync
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;
  const Pack = window.GWICS_COMPETITION_PACK;

  const HOST_PIN = "GWICS2026!";
  let currentRoundNum = 1;
  let currentQIdx = 0;
  let targetAdjustTeamId = null;

  function init() {
    setupAuth();
    setupRoundTabs();
    setupActionButtons();
    setupScoreModal();
    setupAudioCheck();
    setupExportCsv();
  }

  /* --------------------------------------------------------------------------
     1. AUTHENTICATION GATE
     -------------------------------------------------------------------------- */
  function setupAuth() {
    const form = document.getElementById("hostAuthForm");
    const gate = document.getElementById("viewHostGate");
    const dash = document.getElementById("viewHostDashboard");

    // Auto-login if session token saved
    if (sessionStorage.getItem("gwics_host_authenticated") === "true") {
      gate.style.display = "none";
      dash.style.display = "grid";
      startHost();
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = document.getElementById("hostPinInput").value.trim();
      if (pin === HOST_PIN || pin === "admin") {
        sessionStorage.setItem("gwics_host_authenticated", "true");
        gate.style.display = "none";
        dash.style.display = "grid";
        startHost();
      } else {
        alert("Incorrect Host Passcode. Try: GWICS2026!");
      }
    });
  }

  function startHost() {
    Engine.initAsHost(Pack);
    Engine.onStateChange(renderState);
    Engine.onTeamUpdate(renderTeams);

    renderQuestionList();
    loadQuestion(currentRoundNum, currentQIdx);
    renderTeams();
  }

  /* --------------------------------------------------------------------------
     2. ROUND & QUESTION NAVIGATION
     -------------------------------------------------------------------------- */
  function setupRoundTabs() {
    const tabs = document.querySelectorAll("#roundTabs button");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentRoundNum = parseInt(tab.dataset.r, 10);
        currentQIdx = 0;
        renderQuestionList();
        loadQuestion(currentRoundNum, currentQIdx);
      });
    });
  }

  function renderQuestionList() {
    const list = document.getElementById("hostQList");
    const round = Pack.rounds.find(r => r.roundNum === currentRoundNum);
    if (!round || !round.items) {
      list.innerHTML = `<div style="padding:10px; color:var(--text-dim);">No items in this round.</div>`;
      return;
    }

    list.innerHTML = round.items.map((it, idx) => `
      <div class="host-q-item ${idx === currentQIdx ? 'active' : ''}" data-idx="${idx}">
        <span>${it.title}</span>
        <span style="font-family:var(--font-mono); font-size:11px; color:var(--gold-400);">${it.ans}</span>
      </div>
    `).join("");

    list.querySelectorAll(".host-q-item").forEach(item => {
      item.addEventListener("click", () => {
        currentQIdx = parseInt(item.dataset.idx, 10);
        list.querySelectorAll(".host-q-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        loadQuestion(currentRoundNum, currentQIdx);
      });
    });
  }

  function loadQuestion(rNum, qIdx) {
    const round = Pack.rounds.find(r => r.roundNum === rNum);
    if (!round || !round.items[qIdx]) return;
    const it = round.items[qIdx];

    document.getElementById("hostCurrentRoundLabel").textContent = `${round.name} · ${round.subtitle}`;
    document.getElementById("hostQTitle").textContent = it.title;
    document.getElementById("hostTimerVal").textContent = `${round.timeLimit || 45}s`;

    // Populate Secret Host Answer Key & Tell
    document.getElementById("hostSecretAnswer").textContent = `Answer: ${it.ans}`;
    document.getElementById("hostSecretSource").textContent = it.source ? `Human: ${it.source}` : "Verified Key";
    document.getElementById("hostSecretTell").innerHTML = `
      <strong>The Official Tell:</strong> ${it.tell}
    `;

    document.getElementById("hostSubmissionStatusText").textContent = "Selected. Click 'Launch Question' to broadcast.";
  }

  /* --------------------------------------------------------------------------
     3. HOST CONTROL ACTIONS (BROADCASTS & TIMER)
     -------------------------------------------------------------------------- */
  function setupActionButtons() {
    const btnStart = document.getElementById("btnHostStartQ");
    const btnPause = document.getElementById("btnHostPauseTimer");
    const btnLock = document.getElementById("btnHostLock");
    const btnReveal = document.getElementById("btnHostReveal");
    const btnLeaderboard = document.getElementById("btnHostShowLeaderboard");
    const btnVoid = document.getElementById("btnHostVoid");

    btnStart.onclick = () => {
      Engine.setQuestion(currentRoundNum, currentQIdx);
      document.getElementById("hostSubmissionStatusText").textContent = "Live on Projector & Phones! Submissions open.";
    };

    btnPause.onclick = () => {
      Engine.pauseTimer();
    };

    btnLock.onclick = () => {
      Engine.lockSubmissions();
      document.getElementById("hostSubmissionStatusText").textContent = "Submissions Locked by Host.";
    };

    btnReveal.onclick = () => {
      Engine.revealAnswer();
      document.getElementById("hostSubmissionStatusText").textContent = "Answer and Tell Revealed! XP updated.";
    };

    btnLeaderboard.onclick = () => {
      Engine.publicState.status = "RESULTS";
      Engine.broadcastState();
      document.getElementById("hostSubmissionStatusText").textContent = "Leaderboard showing on Projector.";
    };

    btnVoid.onclick = () => {
      if (confirm("Void this question? No points will be awarded or deducted.")) {
        Engine.lockSubmissions();
        document.getElementById("hostSubmissionStatusText").textContent = "Question marked VOID.";
      }
    };

    document.getElementById("btnRefreshTeams").onclick = renderTeams;

    document.getElementById("btnResetAll").onclick = () => {
      if (confirm("Reset the entire game session? This clears all team scores.")) {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      }
    };
  }

  /* --------------------------------------------------------------------------
     4. RENDER STATE & TEAMS
     -------------------------------------------------------------------------- */
  function renderState(state) {
    if (!state) return;

    if (state.timer) {
      document.getElementById("hostTimerVal").textContent = `${state.timer.remaining}s`;
    }

    const total = state.totalTeams || 0;
    const sub = state.submittedCount || 0;
    document.getElementById("hostSubmissionsCount").textContent = `${sub} / ${total} Teams`;
    document.getElementById("hostTeamsCountLabel").textContent = total;

    renderTeams();
  }

  function renderTeams() {
    const tbody = document.getElementById("hostTeamsTableBody");
    if (!tbody) return;

    const teams = Object.values(Engine.teams || {}).sort((a, b) => b.xp - a.xp);
    if (!teams.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:20px;">No teams joined yet. Waiting for captains...</td></tr>`;
      return;
    }

    const curQ = Engine.publicState.currentQuestion;
    const qId = curQ ? curQ.id : null;

    tbody.innerHTML = teams.map((t, idx) => {
      const sub = (t.answers || {})[qId];
      const hintUsed = !!((t.unlockedHints || {})[qId]);

      let ansLabel = `<span style="color:var(--text-dim);">Thinking...</span>`;
      if (sub) {
        ansLabel = `<strong style="color:var(--gold-400); font-family:var(--font-mono);">${sub.choice}</strong>`;
        if (sub.graded) {
          ansLabel += sub.isCorrect ? ` <span style="color:var(--color-success);">✓</span>` : ` <span style="color:var(--color-danger);">✗</span>`;
        }
      }

      return `
        <tr>
          <td style="font-family:var(--font-mono); color:var(--gold-400);">#${idx + 1}</td>
          <td><strong>${t.name}</strong></td>
          <td>${ansLabel}</td>
          <td style="font-family:var(--font-mono); font-weight:700; color:var(--gold-400);">${t.xp} XP</td>
          <td>${hintUsed ? '<span style="color:var(--gold-400);">💡 Used (-25)</span>' : '<span style="color:var(--text-dim);">None</span>'}</td>
          <td>
            <button class="btn-host-action btn-adjust-xp" data-tid="${t.id}" data-name="${t.name}" style="padding:4px 10px; font-size:11px;">
              ± Adjust XP
            </button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".btn-adjust-xp").forEach(btn => {
      btn.onclick = () => {
        targetAdjustTeamId = btn.dataset.tid;
        document.getElementById("scoreModalTeamName").textContent = btn.dataset.name;
        document.getElementById("scoreModal").classList.add("open");
      };
    });
  }

  /* --------------------------------------------------------------------------
     5. MANUAL XP OVERRIDE MODAL
     -------------------------------------------------------------------------- */
  function setupScoreModal() {
    const modal = document.getElementById("scoreModal");
    const closeBtn = document.getElementById("btnCloseScoreModal");
    const form = document.getElementById("scoreOverrideForm");

    closeBtn.onclick = () => modal.classList.remove("open");
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("open"); };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const delta = parseInt(document.getElementById("scoreDeltaInput").value, 10);
      const reason = document.getElementById("scoreReasonInput").value.trim();

      if (isNaN(delta) || !reason) return;

      Engine.adjustTeamScore(targetAdjustTeamId, delta, reason);
      modal.classList.remove("open");
      form.reset();
      renderTeams();
    });
  }

  /* --------------------------------------------------------------------------
     6. AUDIO AUX TEST
     -------------------------------------------------------------------------- */
  function setupAudioCheck() {
    const btn = document.getElementById("btnTestSound");
    let testAudio = null;
    btn.onclick = () => {
      if (testAudio) testAudio.pause();
      testAudio = new Audio("assets/audio/clip_02.mp3");
      btn.textContent = "🔊 Playing Test Chime...";
      testAudio.onended = () => { btn.textContent = "🔊 Test Audio Output"; };
      testAudio.onerror = () => { btn.textContent = "⚠️ Check audio folder"; };
      testAudio.play();
    };
  }

  /* --------------------------------------------------------------------------
     7. EXPORT RESULTS TO CSV
     -------------------------------------------------------------------------- */
  function setupExportCsv() {
    const btn = document.getElementById("btnExportCsv");
    btn.onclick = () => {
      const teams = Object.values(Engine.teams || {});
      if (!teams.length) {
        alert("No teams to export.");
        return;
      }

      let csv = "Rank,Team Name,Final XP Balance,Questions Answered,History Log\n";
      teams.sort((a, b) => b.xp - a.xp).forEach((t, idx) => {
        const histLog = (t.history || []).map(h => `${h.desc} (${h.delta >= 0 ? '+' : ''}${h.delta})`).join(" | ");
        csv += `${idx + 1},"${t.name}",${t.xp},${Object.keys(t.answers || {}).length},"${histLog}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gwics_showdown_standings_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
