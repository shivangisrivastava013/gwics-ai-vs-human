/* ==========================================================================
   GWiCS: BOT OR NOT? - Host Mission Control Engine
   Controls Session State, Answer Revealing, XP Adjustments & Projector Sync
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;
  const ORGANIZER_PASSCODE = "GWICS2026!"; // Official GWiCS Organizer Secret Passcode

  let loadedPack = null;
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
    setupShowdownEditor();
  }

  /* --------------------------------------------------------------------------
     1. AUTHENTICATION & LOCAL PACK LOADER
     -------------------------------------------------------------------------- */
  function setupAuth() {
    const form = document.getElementById("hostAuthForm");
    const gate = document.getElementById("viewHostGate");
    const dash = document.getElementById("viewHostDashboard");

    // Auto-resume if session is active
    const savedAuth = sessionStorage.getItem("gwics_host_authenticated");
    const cachedPack = sessionStorage.getItem("gwics_cached_pack");
    const savedRoom = sessionStorage.getItem("gwics_host_room") || "BOTORNOT";

    if (savedAuth === "true" && cachedPack) {
      try {
        loadedPack = JSON.parse(cachedPack);
        preparePack(loadedPack);
        gate.style.display = "none";
        dash.style.display = "grid";
        startHost(loadedPack, savedRoom);
        return;
      } catch (e) {
        sessionStorage.removeItem("gwics_cached_pack");
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = document.getElementById("hostPinInput").value.trim();
      const room = document.getElementById("hostRoomInput").value.trim().toUpperCase() || "BOTORNOT";
      const fileInput = document.getElementById("packFileInput");

      // Authentic Passcode Verification
      if (pin !== ORGANIZER_PASSCODE) {
        alert("Access Denied: Invalid Organizer Passcode. Please check your credentials.");
        return;
      }

      if (!fileInput.files || !fileInput.files[0]) {
        alert("Please select the local competition_pack.json file from your organizer vault.");
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = function (evt) {
        try {
          const pack = JSON.parse(evt.target.result);
          if (!pack.rounds || !Array.isArray(pack.rounds) || pack.rounds.length === 0) {
            alert("Invalid pack file: 'rounds' array missing.");
            return;
          }

          preparePack(pack);
          loadedPack = pack;

          // Store in session storage so refresh works without re-uploading
          sessionStorage.setItem("gwics_host_authenticated", "true");
          sessionStorage.setItem("gwics_host_room", room);
          sessionStorage.setItem("gwics_cached_pack", JSON.stringify(pack));

          gate.style.display = "none";
          dash.style.display = "grid";
          startHost(pack, room);

        } catch (err) {
          alert("Error parsing competition pack JSON: " + err.message);
        }
      };

      reader.onerror = function () {
        alert("Error reading file from disk.");
      };

      reader.readAsText(file);
    });
  }

  // Prepares round 4 items with neutral options and randomized AI contender assignment
  function preparePack(pack) {
    if (!pack._questionOrderRandomized) {
      for (const round of pack.rounds) {
        if (round.roundNum === 4 || !Array.isArray(round.items)) continue;
        for (let i = round.items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [round.items[i], round.items[j]] = [round.items[j], round.items[i]];
        }
      }
      pack._questionOrderRandomized = true;
    }
    const r4 = pack.rounds.find(r => r.roundNum === 4);
    if (r4 && (!r4.items || !r4.items.length) && r4.prompts) {
      const slots = ["A", "B", "C"];

      r4.items = r4.prompts.map((p, i) => {
        // Rotate and randomize AI slot across duels (e.g. A, B, or C) so it is never predictable!
        const aiSlot = slots[Math.floor(Math.random() * slots.length)];
        const humanSlots = slots.filter(s => s !== aiSlot);

        return {
          id: `r4_p${i + 1}`,
          type: "showdown",
          title: `Showdown Duel ${i + 1}`,
          prompt: p,
          timeLimit: 120, // 120-second clock for live showdown
          ans: aiSlot,
          aiSlot: aiSlot,
          contenders: {
            A: "Waiting for Contender A response text...",
            B: "Waiting for Contender B response text...",
            C: "Waiting for Contender C response text..."
          },
          // Strictly neutral labels with ZERO giveaway!
          options: [
            { id: "A", label: "Contender A is AI" },
            { id: "B", label: "Contender B is AI" },
            { id: "C", label: "Contender C is AI" }
          ],
          tell: `Contender ${aiSlot} was generated by Generative AI. Contenders ${humanSlots.join(' and ')} were written live by human student volunteers.`
        };
      });

      if (r4.tieBreaker) {
        r4.items.push({
          id: r4.tieBreaker.id,
          type: "text",
          title: r4.tieBreaker.title,
          prompt: r4.tieBreaker.prompt,
          passageA: r4.tieBreaker.text,
          passageB: "(Poetic Meter Benchmark)",
          options: [
            { id: "HUMAN", label: "Human" },
            { id: "AI", label: "AI" }
          ],
          ans: "HUMAN",
          tell: r4.tieBreaker.tell,
          timeLimit: 60
        });
      }
    }
  }

  function startHost(pack, roomCode) {
    Engine.initAsHost(pack, roomCode);
    Engine.onStateChange(renderState);
    Engine.onTeamUpdate(renderTeams);
    Engine.onConnectionChange(renderConnection);
    Engine.onPeersChange(renderPeers);

    document.getElementById("hostRoomCodeLabel").textContent = roomCode;

    renderConnection(Engine.connectionStatus);
    renderQuestionList();
    loadQuestion(currentRoundNum, currentQIdx);
    renderTeams();
  }

  /* --------------------------------------------------------------------------
     2. NETWORK STATUS & PEER COUNTER
     -------------------------------------------------------------------------- */
  function renderConnection(status) {
    const badge = document.getElementById("hostConnBadge");
    const text = document.getElementById("hostConnText");
    if (!badge || !text) return;

    const peerCount = Object.keys(Engine.peerConnections || {}).length;

    if (status === "CONNECTED") {
      badge.className = "connection-badge connected";
      if (peerCount === 0) {
        text.textContent = "Cloud Sync Ready (0 phones joined)";
      } else {
        text.textContent = `Cloud Sync Active (${peerCount} phone${peerCount === 1 ? '' : 's'} joined)`;
      }
    } else if (status === "CONNECTING") {
      badge.className = "connection-badge connecting";
      text.textContent = "Connecting Cloud Relay...";
    } else if (status === "RECONNECTING") {
      badge.className = "connection-badge connecting";
      text.textContent = "Reconnecting...";
    } else {
      badge.className = "connection-badge offline";
      text.textContent = "Local Mode Only (Cloud sync offline)";
    }
  }

  function renderPeers(count) {
    renderConnection(Engine.connectionStatus);
  }

  /* --------------------------------------------------------------------------
     3. ROUND & QUESTION NAVIGATION
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
    if (!loadedPack) return;

    const round = loadedPack.rounds.find(r => r.roundNum === currentRoundNum);
    if (!round || !round.items || !round.items.length) {
      list.innerHTML = `<div style="padding:10px; color:var(--text-dim);">No items in this round.</div>`;
      return;
    }

    list.innerHTML = round.items.map((it, idx) => `
      <div class="host-q-item ${idx === currentQIdx ? 'active' : ''}" data-idx="${idx}">
        <span>${escapeHtml(it.title)}</span>
        <span style="font-family:var(--font-mono); font-size:11px; color:var(--gold-400);">${it.ans || 'KEY'}</span>
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
    if (!loadedPack) return;
    const round = loadedPack.rounds.find(r => r.roundNum === rNum);
    if (!round || !round.items || !round.items[qIdx]) return;
    const it = round.items[qIdx];

    document.getElementById("hostCurrentRoundLabel").textContent = `${round.name} · ${round.subtitle || ''}`;
    document.getElementById("hostQTitle").textContent = it.title;

    // Use question-specific time limit (e.g. 120s for Showdown)
    const effectiveTime = it.timeLimit || round.timeLimit || 45;
    document.getElementById("hostTimerVal").textContent = `${effectiveTime}s`;

    const player = document.getElementById("hostAudioPlayer");
    const panel = document.getElementById("hostAudioPanel");
    player.pause();
    panel.hidden = it.type !== "audio";
    if (it.type === "audio") {
      const url = it.audioUrl || it.media || "";
      player.src = url.replace(/\\/g, "/");
      player.load();
      const error = document.getElementById("hostAudioError");
      error.textContent = url ? "Preview every clip before opening the round." : "Missing audio URL in this question pack.";
      player.onerror = () => { error.textContent = "Cannot load this recording. Check the question's audio URL before launch."; };
    } else {
      player.removeAttribute("src"); player.load();
    }

    // Populate Secret Host Answer Key & Tell
    document.getElementById("hostSecretAnswer").textContent = `Answer: ${it.ans}`;
    document.getElementById("hostSecretSource").textContent = it.source ? `Verified: ${it.source}` : "Secret Organizer Key";
    document.getElementById("hostSecretTell").innerHTML = `
      <strong>The Official Tell:</strong> ${escapeHtml(it.tell || "Verified answer.")}
    `;

    // Show or hide Round 4 Showdown Editor
    const showdownEditor = document.getElementById("hostShowdownEditor");
    if (rNum === 4 && it.type === "showdown") {
      showdownEditor.style.display = "block";
      const cont = it.contenders || {};
      document.getElementById("hostContenderAText").value = cont.A || "";
      document.getElementById("hostContenderBText").value = cont.B || "";
      document.getElementById("hostContenderCText").value = cont.C || "";
      updateShowdownAiLabels(it);
    } else {
      showdownEditor.style.display = "none";
    }

    document.getElementById("hostSubmissionStatusText").textContent = "Selected. Click 'Launch Question' to broadcast.";
  }

  /* --------------------------------------------------------------------------
     4. ROUND 4 SHOWDOWN MANAGER & RANDOMIZER
     -------------------------------------------------------------------------- */
  function setupShowdownEditor() {
    const btnShuffle = document.getElementById("btnShuffleShowdownAi");
    if (!btnShuffle) return;

    btnShuffle.onclick = () => {
      if (!loadedPack || currentRoundNum !== 4) return;
      const round = loadedPack.rounds.find(r => r.roundNum === 4);
      if (!round || !round.items[currentQIdx]) return;
      const it = round.items[currentQIdx];

      const slots = ["A", "B", "C"];
      const current = it.ans;
      const available = slots.filter(s => s !== current);
      const newSlot = available[Math.floor(Math.random() * available.length)];

      it.ans = newSlot;
      it.aiSlot = newSlot;
      const humanSlots = slots.filter(s => s !== newSlot);
      it.tell = `Contender ${newSlot} was generated by Generative AI. Contenders ${humanSlots.join(' and ')} were written live by human student volunteers.`;

      updateShowdownAiLabels(it);
      loadQuestion(4, currentQIdx);
      renderQuestionList();
    };
  }

  function updateShowdownAiLabels(it) {
    const aiSlot = it.ans || "C";
    const slotLabel = document.getElementById("hostShowdownAiSlotLabel");
    if (slotLabel) slotLabel.textContent = `Contender ${aiSlot}`;

    const labelA = document.getElementById("labelContenderAType");
    const labelB = document.getElementById("labelContenderBType");
    const labelC = document.getElementById("labelContenderCType");

    if (labelA) {
      labelA.textContent = aiSlot === "A" ? "AI MODEL" : "HUMAN";
      labelA.style.color = aiSlot === "A" ? "var(--cyan-400)" : "var(--text-dim)";
    }
    if (labelB) {
      labelB.textContent = aiSlot === "B" ? "AI MODEL" : "HUMAN";
      labelB.style.color = aiSlot === "B" ? "var(--cyan-400)" : "var(--text-dim)";
    }
    if (labelC) {
      labelC.textContent = aiSlot === "C" ? "AI MODEL" : "HUMAN";
      labelC.style.color = aiSlot === "C" ? "var(--cyan-400)" : "var(--text-dim)";
    }
  }

  /* --------------------------------------------------------------------------
     5. HOST ACTION BUTTONS
     -------------------------------------------------------------------------- */
  function setupActionButtons() {
    const btnStart = document.getElementById("btnHostStartQ");
    const btnPause = document.getElementById("btnHostPauseTimer");
    const btnLock = document.getElementById("btnHostLock");
    const btnReveal = document.getElementById("btnHostReveal");
    const btnLeaderboard = document.getElementById("btnHostShowLeaderboard");
    const btnVoid = document.getElementById("btnHostVoid");

    btnStart.onclick = () => {
      // If on Round 4 Showdown, save entered texts before launching
      if (currentRoundNum === 4 && loadedPack) {
        const round = loadedPack.rounds.find(r => r.roundNum === 4);
        if (round && round.items[currentQIdx]) {
          const it = round.items[currentQIdx];
          const textA = document.getElementById("hostContenderAText").value.trim();
          const textB = document.getElementById("hostContenderBText").value.trim();
          const textC = document.getElementById("hostContenderCText").value.trim();

          it.contenders = {
            A: textA || "Contender A live submission.",
            B: textB || "Contender B live submission.",
            C: textC || "Contender C live submission."
          };
        }
      }

      Engine.setQuestion(currentRoundNum, currentQIdx);
      document.getElementById("hostSubmissionStatusText").textContent = "Live on Projector & Phones! Submissions open.";
    };

    btnPause.onclick = () => {
      Engine.pauseTimer();
      const running = Engine.publicState.timer.running;
      btnPause.textContent = running ? "⏸ Pause Timer" : "▶ Resume Timer";
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
      if (confirm("Void this question? Submissions will be locked, and any player who purchased a hint for this question will receive a full 25 XP refund.")) {
        Engine.voidQuestion("Question voided by host");
        document.getElementById("hostSubmissionStatusText").textContent = "Question marked VOID. All hints refunded.";
      }
    };

    document.getElementById("btnRefreshTeams").onclick = renderTeams;

    document.getElementById("btnResetAll").onclick = () => {
      if (confirm("Reset the entire game session? This clears all player scores and submissions.")) {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      }
    };
  }

  /* --------------------------------------------------------------------------
     6. RENDER STATE & TEAMS
     -------------------------------------------------------------------------- */
  function renderState(state) {
    if (!state) return;

    if (state.timer) {
      document.getElementById("hostTimerVal").textContent = `${state.timer.remaining}s`;
    }

    if (state.status) {
      document.getElementById("hostRoomStatusBadge").textContent = state.status;
    }

    const total = state.totalTeams || 0;
    const sub = state.submittedCount || 0;
    document.getElementById("hostSubmissionsCount").textContent = `${sub} / ${total} Players`;
    document.getElementById("hostTeamsCountLabel").textContent = total;

    renderTeams();
  }

  function renderTeams() {
    const tbody = document.getElementById("hostTeamsTableBody");
    if (!tbody) return;

    const teams = Object.values(Engine.teams || {}).sort((a, b) => b.xp - a.xp);
    if (!teams.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:20px;">No players joined yet. Waiting for participants...</td></tr>`;
      return;
    }

    const curQ = Engine.publicState.currentQuestion;
    const qId = curQ ? curQ.id : null;

    tbody.innerHTML = "";

    teams.forEach((t, idx) => {
      const sub = (t.answers || {})[qId];
      const hintUsed = !!((t.unlockedHints || {})[qId]);

      const tr = document.createElement("tr");

      // Rank
      const tdRank = document.createElement("td");
      tdRank.style.fontFamily = "var(--font-mono)";
      tdRank.style.color = "var(--gold-400)";
      tdRank.textContent = `#${idx + 1}`;
      tr.appendChild(tdRank);

      // Name (XSS safe textContent)
      const tdName = document.createElement("td");
      const strongName = document.createElement("strong");
      strongName.textContent = t.name;
      tdName.appendChild(strongName);
      tr.appendChild(tdName);

      // Current Answer
      const tdAns = document.createElement("td");
      if (sub) {
        tdAns.innerHTML = `<strong style="color:var(--gold-400); font-family:var(--font-mono);">${escapeHtml(sub.choice)}</strong>`;
        if (sub.graded) {
          tdAns.innerHTML += sub.isCorrect ? ` <span style="color:var(--color-success);">✓</span>` : ` <span style="color:var(--color-danger);">✗</span>`;
        }
      } else {
        tdAns.innerHTML = `<span style="color:var(--text-dim);">Thinking...</span>`;
      }
      tr.appendChild(tdAns);

      // XP Balance
      const tdXp = document.createElement("td");
      tdXp.style.fontFamily = "var(--font-mono)";
      tdXp.style.fontWeight = "700";
      tdXp.style.color = "var(--gold-400)";
      tdXp.textContent = `${t.xp} XP`;
      tr.appendChild(tdXp);

      // Hint Used
      const tdHint = document.createElement("td");
      tdHint.innerHTML = hintUsed ? '<span style="color:var(--gold-400);">💡 Used (-25)</span>' : '<span style="color:var(--text-dim);">None</span>';
      tr.appendChild(tdHint);

      // Action
      const tdAct = document.createElement("td");
      const btnAdj = document.createElement("button");
      btnAdj.className = "btn-host-action";
      btnAdj.style.padding = "4px 10px";
      btnAdj.style.fontSize = "11px";
      btnAdj.textContent = "± Adjust XP";
      btnAdj.onclick = () => {
        targetAdjustTeamId = t.id;
        document.getElementById("scoreModalTeamName").textContent = t.name;
        document.getElementById("scoreModal").classList.add("open");
      };
      tdAct.appendChild(btnAdj);
      tr.appendChild(tdAct);

      tbody.appendChild(tr);
    });
  }

  /* --------------------------------------------------------------------------
     7. MANUAL XP OVERRIDE MODAL
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

      if (isNaN(delta) || !reason || !targetAdjustTeamId) return;

      Engine.adjustTeamScore(targetAdjustTeamId, delta, reason);
      modal.classList.remove("open");
      form.reset();
      renderTeams();
    });
  }

  /* --------------------------------------------------------------------------
     8. NEUTRAL AUDIO AUX TEST (Does NOT leak competition audio)
     -------------------------------------------------------------------------- */
  function setupAudioCheck() {
    const btn = document.getElementById("btnTestSound");
    let testAudio = null;
    btn.onclick = () => {
      if (testAudio) testAudio.pause();
      testAudio = new Audio("assets/audio/sound_check.wav");
      btn.textContent = "🔊 Playing Test Chime...";
      testAudio.onended = () => { btn.textContent = "🔊 Test Audio Output"; };
      testAudio.onerror = () => { btn.textContent = "⚠️ Check sound_check.wav"; };
      testAudio.play().catch(() => { btn.textContent = "⚠️ Click to allow audio"; });
    };
  }

  /* --------------------------------------------------------------------------
     9. EXPORT RESULTS TO CSV
     -------------------------------------------------------------------------- */
  function setupExportCsv() {
    const btn = document.getElementById("btnExportCsv");
    btn.onclick = () => {
      const teams = Object.values(Engine.teams || {});
      if (!teams.length) {
        alert("No players to export.");
        return;
      }

      let csv = "Rank,Team Name,Final XP Balance,Questions Answered,History Log\n";
      teams.sort((a, b) => b.xp - a.xp).forEach((t, idx) => {
        const histLog = (t.history || []).map(h => `${h.desc} (${h.delta >= 0 ? '+' : ''}${h.delta})`).join(" | ");
        csv += `${idx + 1},"${t.name.replace(/"/g, '""')}",${t.xp},${Object.keys(t.answers || {}).length},"${histLog.replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gwics_showdown_standings_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
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
