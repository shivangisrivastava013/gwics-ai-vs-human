/* ==========================================================================
   GWiCS: BOT OR NOT? - Participant Client Logic
   Manages:
   - Playful Robot Checkbox Gate
   - Persistent Team Captain Session (reconnect on refresh)
   - Synchronized Question View (No answers in client code)
   - 25 XP Hint Purchase & Confirmation System
   - Submission Locking & Result Reveal
   - Dedicated Practice Sandbox
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;
  const PracticeBank = window.GWICS_PRACTICE_BANK || [];

  const SESSION_KEY = "gwics_captain_session";
  let myTeam = {
    id: null,
    name: "",
    xp: 100,
    answers: {},
    unlockedHints: {},
    history: []
  };

  let activeQuestionId = null;
  let selectedChoice = null;
  let isSubmitting = false;
  let currentAudio = null;
  let timerInterval = null;
  let initialized = false;

  /* --------------------------------------------------------------------------
     1. INITIALIZATION & RECONNECTION
     -------------------------------------------------------------------------- */
  function init() {
    if (initialized) return;
    initialized = true;

    setupRobotCheckbox();
    setupModals();
    setupJoinForm();
    setupPracticeSandbox();
    setupLeaveTeam();

    // Check for existing player session in localStorage
    const saved = localStorage.getItem(SESSION_KEY) || localStorage.getItem("botornot_player_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.teamId && session.teamName) {
          rejoinSession(session.roomCode || "BOTORNOT", session.teamName, session.teamId);
        }
      } catch (e) {}
    }

    // Engine Event Listeners
    Engine.onStateChange(handleStateUpdate);
    Engine.onTeamUpdate(handleTeamUpdate);
    Engine.onConnectionChange(renderConnection);
    Engine.onEvent(handleNetworkEvent);

    renderConnection(Engine.connectionStatus);
  }

  function renderConnection(status) {
    const badge = document.getElementById("participantConnBadge");
    const text = document.getElementById("participantConnText");
    if (!badge || !text) return;

    badge.className = `connection-badge ${status.toLowerCase()}`;
    if (status === "CONNECTED") {
      text.textContent = "Connected";
    } else if (status === "CONNECTING") {
      text.textContent = "Connecting...";
    } else if (status === "RECONNECTING") {
      text.textContent = "Reconnecting...";
    } else {
      text.textContent = "Offline";
    }
  }

  /* --------------------------------------------------------------------------
     2. ROBOT CHECKBOX ENTRANCE INTERACTION
     -------------------------------------------------------------------------- */
  function setupRobotCheckbox() {
    const panel = document.getElementById("robotPanel");
    const checkmark = document.getElementById("robotCheckmark");
    const followup = document.getElementById("robotFollowup");
    const teamInput = document.getElementById("teamNameInput");

    if (!panel) return;

    function toggle() {
      const isChecked = panel.classList.toggle("checked");
      panel.setAttribute("aria-checked", isChecked);
      if (checkmark) checkmark.style.display = isChecked ? "block" : "none";
      if (followup) followup.classList.toggle("visible", isChecked);
      if (isChecked && teamInput) {
        teamInput.focus();
      }
    }

    panel.addEventListener("click", toggle);
    panel.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    });
  }

  /* --------------------------------------------------------------------------
     3. JOIN & REJOIN SESSION
     -------------------------------------------------------------------------- */
  function setupJoinForm() {
    const form = document.getElementById("joinForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const roomCode = document.getElementById("roomCodeInput").value.trim().toUpperCase() || "BOTORNOT";
      const teamName = document.getElementById("teamNameInput").value.trim();

      if (!teamName) return;

      const teamId = "team_" + Math.random().toString(36).substr(2, 9);
      rejoinSession(roomCode, teamName, teamId);
    });
  }

  function rejoinSession(roomCode, teamName, teamId) {
    myTeam.id = teamId;
    myTeam.name = teamName;

    // Save session so page refresh preserves player & submissions
    const sessionData = JSON.stringify({
      roomCode: roomCode,
      teamName: teamName,
      teamId: teamId
    });
    localStorage.setItem(SESSION_KEY, sessionData);
    localStorage.setItem("botornot_player_session", sessionData);

    Engine.initAsParticipant(roomCode, teamName, teamId);

    // Transition view
    document.getElementById("viewEntrance").style.display = "none";
    document.getElementById("viewPractice").style.display = "none";
    document.getElementById("viewInGame").style.display = "flex";
    document.getElementById("headerXpPill").style.display = "flex";
    document.getElementById("gameTeamNameLabel").textContent = `Player: ${teamName}`;
  }

  function setupLeaveTeam() {
    const btn = document.getElementById("btnChangeTeam");
    const modal = document.getElementById("leaveModal");
    const btnConfirm = document.getElementById("btnConfirmLeave");
    const btnCancel = document.getElementById("btnCancelLeave");

    if (btn) btn.onclick = () => modal.classList.add("open");
    if (btnCancel) btnCancel.onclick = () => modal.classList.remove("open");

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem("botornot_player_session");
        myTeam = { id: null, name: "", xp: 100, answers: {}, unlockedHints: {}, history: [] };
        modal.classList.remove("open");
        document.getElementById("viewInGame").style.display = "none";
        document.getElementById("headerXpPill").style.display = "none";
        document.getElementById("viewEntrance").style.display = "block";
      };
    }
  }

  /* --------------------------------------------------------------------------
     4. SYNCHRONIZED STATE UPDATES FROM HOST
     -------------------------------------------------------------------------- */
  function handleStateUpdate(state) {
    if (!state) return;

    const roundTag = document.getElementById("gameRoundTag");
    const timerText = document.getElementById("gameTimerText");
    const timerPill = document.getElementById("gameTimerPill");
    const cardLobby = document.getElementById("cardLobbyState");
    const cardActive = document.getElementById("cardActiveQuestion");

    // Dynamic timer calculation from absolute deadline (prevents drift if tab slept)
    clearInterval(timerInterval);
    function updateTimer() {
      if (!state.timer) return;
      let rem = state.timer.remaining;
      if (state.timer.running && state.timer.deadline > 0) {
        rem = Math.max(0, Math.ceil((state.timer.deadline - Date.now()) / 1000));
      }
      timerText.textContent = `${rem}s`;
      timerPill.classList.toggle("urgent", rem <= 10 && state.timer.running);
    }
    updateTimer();
    if (state.timer && state.timer.running) {
      timerInterval = setInterval(updateTimer, 500);
    }

    if (state.status === "LOBBY") {
      cardLobby.style.display = "block";
      cardActive.style.display = "none";
      if (roundTag) roundTag.textContent = "Lobby";
      cardLobby.innerHTML = `
        <div style="font-size:40px; margin-bottom:12px;">🎮</div>
        <h2 style="font-family:var(--font-display); font-size:20px; margin-bottom:8px;">You're in the Game!</h2>
        <p style="color:var(--text-muted); font-size:14px; max-width:400px; margin:0 auto 16px;">
          Starting balance: <strong>100 XP</strong>. Look at the main screen—your name will appear on the audience display.
        </p>
        <div style="font-family:var(--font-mono); font-size:12px; color:var(--gold-400); background:var(--charcoal-900); display:inline-block; padding:6px 14px; border-radius:var(--radius-pill); border:1px solid var(--charcoal-700);">
          Watching for the host to launch the first question...
        </div>
      `;
      return;
    }

    if (state.status === "RESULTS") {
      cardLobby.style.display = "block";
      cardActive.style.display = "none";
      if (roundTag) roundTag.textContent = "Final Standings";

      const leaderboard = state.leaderboard || [];
      const myRankIdx = leaderboard.findIndex(p => p.teamId === myTeam.id);
      const myRank = myRankIdx >= 0 ? myRankIdx + 1 : "-";
      const totalPlayers = leaderboard.length;

      cardLobby.innerHTML = `
        <div style="font-size:48px; margin-bottom:12px;">🏆</div>
        <h2 style="font-family:var(--font-display); font-size:22px; margin-bottom:6px; color:var(--gold-400);">Game Completed!</h2>
        <div style="font-size:16px; font-weight:700; margin-bottom:16px;">
          You placed <span style="color:var(--gold-400); font-size:22px; font-family:var(--font-mono);">#${myRank}</span> of ${totalPlayers} players
        </div>
        <div style="background:var(--charcoal-900); padding:16px; border-radius:var(--radius-md); max-width:320px; margin:0 auto 16px; border:1px solid var(--charcoal-700);">
          <div style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">Your Final Score</div>
          <div style="font-family:var(--font-mono); font-size:28px; font-weight:800; color:var(--gold-400);">${myTeam.xp} XP</div>
        </div>
        <p style="font-size:13px; color:var(--text-muted);">See the audience projector screen for the official podium!</p>
      `;
      return;
    }

    // Active Question State
    cardLobby.style.display = "none";
    cardActive.style.display = "block";

    const q = state.currentQuestion;
    if (!q) return;

    if (roundTag) {
      roundTag.textContent = `Round ${state.roundNum} · ${q.title}`;
    }

    // Question Changed Check: Reset form controls when host switches question
    if (activeQuestionId !== q.id) {
      activeQuestionId = q.id;
      selectedChoice = null;
      isSubmitting = false;

      // Close hint modal if open from previous question
      const hintModal = document.getElementById("hintModal");
      if (hintModal) hintModal.classList.remove("open");

      // Stop previous audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
    }

    renderActiveQuestion(q, state);
  }

  function renderActiveQuestion(q, state) {
    document.getElementById("qTitle").textContent = q.title;
    document.getElementById("qPrompt").textContent = q.prompt;

    // 1. Media handling
    const imgFrame = document.getElementById("qImageFrame");
    const textFrame = document.getElementById("qTextFrame");
    const audioFrame = document.getElementById("qAudioFrame");
    const showdownFrame = document.getElementById("qShowdownFrame");

    imgFrame.style.display = "none";
    textFrame.style.display = "none";
    audioFrame.style.display = "none";
    if (showdownFrame) showdownFrame.style.display = "none";

    if (q.type === "image" && q.media) {
      imgFrame.style.display = "block";
      const imgEl = document.getElementById("qImageEl");
      imgEl.src = q.media;
      document.getElementById("btnZoomImage").onclick = () => openZoom(q.media);
    } else if (q.type === "text") {
      textFrame.style.display = "flex";
      document.getElementById("txtPassageA").textContent = q.passageA || "";
      document.getElementById("txtPassageB").textContent = q.passageB || "";
    } else if (q.type === "audio") {
      audioFrame.style.display = "block";
      document.getElementById("txtAudioScript").textContent = q.transcript || "";
      document.getElementById("txtAudioA11y").textContent = q.audioAccessibilityNotes || "";

      const btnPlay = document.getElementById("btnPlayParticipantAudio");
      btnPlay.textContent = "🔊 Listen on Headphones (Room audio playing)";
      btnPlay.onclick = () => {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
          btnPlay.textContent = "🔊 Listen on Headphones";
          return;
        }
        currentAudio = new Audio(q.audioUrl);
        currentAudio.preload = "auto";
        btnPlay.textContent = "🔊 Playing in Headphones...";
        currentAudio.onended = () => { btnPlay.textContent = "🔊 Listen on Headphones"; currentAudio = null; };
        currentAudio.onerror = () => { btnPlay.textContent = "⚠️ Audio unavailable (see text above)"; };
        currentAudio.play().catch(() => { btnPlay.textContent = "▶ Tap to listen on headphones"; });
      };
    } else if (q.type === "showdown") {
      if (showdownFrame) {
        showdownFrame.style.display = "flex";
        const cont = q.contenders || {};
        document.getElementById("txtContenderA").textContent = cont.A || "Waiting for live response...";
        document.getElementById("txtContenderB").textContent = cont.B || "Waiting for live response...";
        document.getElementById("txtContenderC").textContent = cont.C || "Waiting for live response...";
      }
    }

    // 2. Options Grid & Submission Status
    const grid = document.getElementById("optionsGrid");
    const submitBtn = document.getElementById("btnSubmitAnswer");
    const submittedBanner = document.getElementById("submittedBanner");
    const submittedBannerText = document.getElementById("submittedBannerText");
    const submitBar = document.getElementById("submitBar");
    const voidedBanner = document.getElementById("voidedBanner");

    const teamSub = (myTeam.answers || {})[q.id];
    const isSubmitted = !!teamSub;
    const isVoided = state.status === "VOIDED";
    const isLocked = state.status === "LOCKED" || isVoided;
    const isRevealed = state.status === "REVEALED" || state.status === "RESULTS";

    voidedBanner.style.display = isVoided ? "flex" : "none";

    grid.innerHTML = "";
    (q.options || []).forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "btn-option";
      btn.dataset.id = opt.id;
      btn.textContent = opt.label;

      const isChosen = isSubmitted ? teamSub.choice === opt.id : selectedChoice === opt.id;
      if (isChosen) btn.classList.add("selected");

      btn.disabled = isSubmitted || isLocked || isRevealed;

      btn.onclick = () => {
        if (isSubmitted || isLocked) return;
        selectedChoice = opt.id;
        grid.querySelectorAll(".btn-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        submitBtn.disabled = false;
        submitBtn.textContent = `Lock in: ${opt.label}`;
      };

      grid.appendChild(btn);
    });

    // Submission Bar State
    if (isSubmitted) {
      submitBar.style.display = "none";
      submittedBanner.style.display = "flex";
      submittedBannerText.textContent = `✓ Answer (${teamSub.choice}) locked in. Waiting for the host reveal...`;
    } else if (isVoided) {
      submitBar.style.display = "none";
      submittedBanner.style.display = "none";
    } else {
      submitBar.style.display = "block";
      submittedBanner.style.display = "none";
      submitBtn.disabled = !selectedChoice || state.status !== "QUESTION" || isSubmitting;
      submitBtn.textContent = isSubmitting ? "Submitting..." : (selectedChoice ? `Lock in: ${selectedChoice}` : "Select an Answer");

      submitBtn.onclick = () => {
        if (!selectedChoice || isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting to Host...";
        Engine.submitAnswer(selectedChoice);
      };
    }

    // 3. Hint Handling (25 XP)
    const hintBar = document.getElementById("hintActionBar");
    const hintBtn = document.getElementById("btnUnlockHint");
    const unlockedBox = document.getElementById("unlockedHintBox");
    const unlockedText = document.getElementById("unlockedHintText");

    const unlockedClue = (myTeam.unlockedHints || {})[q.id];

    if (unlockedClue) {
      hintBar.style.display = "none";
      unlockedBox.style.display = "block";
      unlockedText.textContent = unlockedClue;
    } else {
      unlockedBox.style.display = "none";
      hintBar.style.display = (q.hintAvailable && !isVoided) ? "flex" : "none";

      const canBuy = myTeam.xp >= 25 && state.status === "QUESTION" && !isSubmitted;
      hintBtn.disabled = !canBuy;
      hintBtn.textContent = myTeam.xp >= 25 ? "Unlock hint · 25 XP" : "Insufficient XP (25 required)";

      hintBtn.onclick = () => openHintConfirmModal(myTeam.xp);
    }

    // 4. Released Results (When host reveals answer)
    const resultBox = document.getElementById("releasedResultBox");
    if (isRevealed && !isVoided) {
      resultBox.style.display = "block";
      const isCorrect = teamSub && teamSub.choice === state.releasedAnswer;
      resultBox.className = `released-result-box ${isCorrect ? 'correct' : 'incorrect'}`;

      const leaderboard = state.leaderboard || [];
      const myRankIdx = leaderboard.findIndex(p => p.teamId === myTeam.id);
      const myRankStr = myRankIdx >= 0 ? ` · Current Rank #${myRankIdx + 1}` : "";

      const isShowdown = q.type === "showdown";
      document.getElementById("releasedVerdictBadge").textContent = isShowdown
        ? `Official Answer: Contender ${state.releasedAnswer} was AI`
        : `Official Answer: ${state.releasedAnswer}`;
      document.getElementById("releasedPointsDelta").textContent = 
        teamSub ? (isCorrect ? `+100 XP (Correct!${myRankStr})` : `0 XP (Incorrect${myRankStr})`) : `No Answer Submitted${myRankStr}`;
      document.getElementById("releasedPointsDelta").style.color = isCorrect ? "var(--color-success)" : "var(--color-danger)";
      document.getElementById("releasedTellText").innerHTML = `
        <strong>The Tell:</strong> ${escapeHtml(state.releasedTell || "Verified by host.")}
      `;
    } else {
      resultBox.style.display = "none";
    }
  }

  function handleTeamUpdate(teamData) {
    if (!teamData) return;
    myTeam = teamData;
    document.getElementById("headerXpVal").textContent = `${myTeam.xp} XP`;

    // Re-render current question to sync unlocked hints & XP
    if (Engine.publicState.currentQuestion) {
      renderActiveQuestion(Engine.publicState.currentQuestion, Engine.publicState);
    }
  }

  function handleNetworkEvent(event) {
    if (!event) return;

    if (event.type === "SESSION_RESET") {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem("botornot_player_session");
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("botornot_player_session");
      myTeam = { id: null, name: "", xp: 100, answers: {}, unlockedHints: {}, history: [] };
      document.getElementById("viewInGame").style.display = "none";
      document.getElementById("headerXpPill").style.display = "none";
      document.getElementById("viewEntrance").style.display = "block";
      alert("The host has reset the game session. You are now at the fresh lobby.");
      return;
    }

    if (event.type === "SUBMIT_ACK") {
      isSubmitting = false;
      if (event.status === "ACCEPTED") {
        const banner = document.getElementById("submittedBanner");
        const submitBar = document.getElementById("submitBar");
        if (banner) banner.style.display = "flex";
        if (submitBar) submitBar.style.display = "none";
      } else {
        alert("Submission notice: " + (event.reason || "Unable to submit."));
        const submitBtn = document.getElementById("btnSubmitAnswer");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = selectedChoice ? `Lock in: ${selectedChoice}` : "Select an Answer";
        }
      }
    } else if (event.type === "HINT_ACK") {
      if (event.status === "ACCEPTED" || event.status === "ALREADY_OWNED") {
        if (!myTeam.unlockedHints) myTeam.unlockedHints = {};
        myTeam.unlockedHints[event.questionId] = event.hint;
        if (Engine.publicState.currentQuestion) {
          renderActiveQuestion(Engine.publicState.currentQuestion, Engine.publicState);
        }
      } else {
        alert("Hint request: " + (event.reason || "Hint unavailable."));
      }
    }
  }

  /* --------------------------------------------------------------------------
     5. PAID HINT CONFIRMATION MODAL (-25 XP)
     -------------------------------------------------------------------------- */
  function openHintConfirmModal(currentXP) {
    const modal = document.getElementById("hintModal");
    const text = document.getElementById("hintModalText");
    const confirmBtn = document.getElementById("btnConfirmHint");
    const cancelBtn = document.getElementById("btnCancelHint");

    text.textContent = `Spend 25 XP on a hint? Your balance will change from ${currentXP} to ${currentXP - 25} XP.`;
    modal.classList.add("open");

    confirmBtn.onclick = () => {
      confirmBtn.disabled = true; // prevent double tap
      Engine.purchaseHint();
      modal.classList.remove("open");
      confirmBtn.disabled = false;
    };

    cancelBtn.onclick = () => modal.classList.remove("open");
  }

  /* --------------------------------------------------------------------------
     6. IMAGE ZOOM & GENERAL MODALS
     -------------------------------------------------------------------------- */
  function openZoom(src) {
    const modal = document.getElementById("zoomModal");
    const img = document.getElementById("zoomModalImg");
    img.src = src;
    modal.classList.add("open");
  }

  function setupModals() {
    const rulesModal = document.getElementById("rulesModal");
    const zoomModal = document.getElementById("zoomModal");
    const historyModal = document.getElementById("historyModal");
    const hintModal = document.getElementById("hintModal");
    const leaveModal = document.getElementById("leaveModal");

    document.getElementById("btnOpenRules").onclick = () => rulesModal.classList.add("open");
    document.getElementById("btnCloseRules").onclick = () => rulesModal.classList.remove("open");
    document.getElementById("btnCloseZoom").onclick = () => zoomModal.classList.remove("open");
    document.getElementById("btnCloseHistory").onclick = () => historyModal.classList.remove("open");

    // History Modal
    document.getElementById("headerXpPill").onclick = () => {
      const list = document.getElementById("historyList");
      list.innerHTML = "";

      const history = myTeam.history || [];
      if (!history.length) {
        list.innerHTML = `<div style="color:var(--text-dim); padding:10px;">No score history yet.</div>`;
      } else {
        history.slice().reverse().forEach(h => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.justifyContent = "space-between";
          row.style.padding = "8px 0";
          row.style.borderBottom = "1px solid var(--charcoal-700)";

          const descSpan = document.createElement("span");
          descSpan.textContent = h.desc;

          const deltaSpan = document.createElement("strong");
          deltaSpan.style.color = h.delta >= 0 ? "var(--color-success)" : "var(--color-danger)";
          deltaSpan.textContent = `${h.delta >= 0 ? '+' : ''}${h.delta} XP`;

          row.appendChild(descSpan);
          row.appendChild(deltaSpan);
          list.appendChild(row);
        });
      }

      historyModal.classList.add("open");
    };

    // Close modals on overlay click or Escape key
    [rulesModal, zoomModal, historyModal, hintModal, leaveModal].forEach(m => {
      if (!m) return;
      m.addEventListener("click", (e) => {
        if (e.target === m) m.classList.remove("open");
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        [rulesModal, zoomModal, historyModal, hintModal, leaveModal].forEach(m => {
          if (m) m.classList.remove("open");
        });
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. PRACTICE SANDBOX (Dedicated separate practice bank)
     -------------------------------------------------------------------------- */
  function setupPracticeSandbox() {
    const btnOpen = document.getElementById("btnOpenPractice");
    const btnExit = document.getElementById("btnExitPractice");
    const viewEntrance = document.getElementById("viewEntrance");
    const viewPractice = document.getElementById("viewPractice");
    const container = document.getElementById("practiceContainer");

    let pIdx = 0;

    function renderPractice() {
      const item = PracticeBank[pIdx];
      if (!item) return;

      container.innerHTML = `
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--gold-400); text-transform:uppercase; margin-bottom:4px;">
          ${escapeHtml(item.roundName)} · Sample ${pIdx + 1} of ${PracticeBank.length}
        </div>
        <h3 class="question-title">${escapeHtml(item.title)}</h3>
        <p class="question-prompt">${escapeHtml(item.prompt)}</p>

        ${item.media ? `
          <div class="question-media-frame">
            <img src="${item.media}" alt="Practice item">
          </div>
        ` : ''}

        ${(item.passageA || item.textA) ? `
          <div class="stacked-passages">
            <div class="passage-card"><span class="passage-tag">Passage A</span>${escapeHtml(item.passageA || item.textA)}</div>
            <div class="passage-card"><span class="passage-tag">Passage B</span>${escapeHtml(item.passageB || item.textB)}</div>
          </div>
        ` : ''}

        ${item.audioUrl ? `
          <div class="audio-card-box">
            <div class="audio-script-quote">${escapeHtml(item.transcript)}</div>
            <button class="btn-option" id="btnPracticePlayAudio" style="margin:0 auto; padding:8px 16px; font-size:13px;">▶ Play Sample Audio</button>
          </div>
        ` : ''}

        <div class="unlocked-hint-box" style="margin-bottom:14px;">
          <strong style="color:var(--gold-400);">Sample Clue:</strong> ${escapeHtml(item.hint)}
        </div>

        <div class="options-grid" id="practiceOptions">
          ${item.options.map(opt => `
            <button class="btn-option" data-opt="${opt.id}">${escapeHtml(opt.label)}</button>
          `).join("")}
        </div>

        <div class="released-result-box" id="practiceResultBox" style="display:none;">
          <div style="font-family:var(--font-display); font-weight:800; margin-bottom:6px;" id="practiceVerdictText"></div>
          <div class="released-tell">${escapeHtml(item.tell)}</div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:20px;">
          <button class="btn-option" id="btnPrevPractice" style="padding:10px 16px; font-size:13px;" ${pIdx === 0 ? "disabled" : ""}>← Previous</button>
          <button class="btn-option" id="btnNextPractice" style="padding:10px 16px; font-size:13px;" ${pIdx === PracticeBank.length - 1 ? "disabled" : ""}>Next Sample →</button>
        </div>
      `;

      // Audio trigger
      const playBtn = document.getElementById("btnPracticePlayAudio");
      if (playBtn) {
        playBtn.onclick = () => {
          const a = new Audio(item.audioUrl);
          a.play();
        };
      }

      // Vote options
      const optBtns = container.querySelectorAll("#practiceOptions .btn-option");
      const resBox = document.getElementById("practiceResultBox");
      const verdText = document.getElementById("practiceVerdictText");

      optBtns.forEach(b => {
        b.onclick = () => {
          optBtns.forEach(btn => btn.disabled = true);
          const isCorrect = b.dataset.opt === item.ans;
          resBox.style.display = "block";
          resBox.className = `released-result-box ${isCorrect ? 'correct' : 'incorrect'}`;
          verdText.textContent = isCorrect ? `✓ Correct! Official Answer: ${item.ans}` : `✗ Tricked! Official Answer: ${item.ans}`;
        };
      });

      document.getElementById("btnPrevPractice").onclick = () => { if (pIdx > 0) { pIdx--; renderPractice(); } };
      document.getElementById("btnNextPractice").onclick = () => { if (pIdx < PracticeBank.length - 1) { pIdx++; renderPractice(); } };
    }

    btnOpen.onclick = () => {
      viewEntrance.style.display = "none";
      viewPractice.style.display = "flex";
      renderPractice();
    };

    btnExit.onclick = () => {
      viewPractice.style.display = "none";
      viewEntrance.style.display = "flex";
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

  window.GWICS_Participant = {
    init: init
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    if (!window.GWICS_App || window.GWICS_App.getMode() === "player") {
      init();
    }
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (!window.GWICS_App || window.GWICS_App.getMode() === "player") {
        init();
      }
    });
  }
})();
