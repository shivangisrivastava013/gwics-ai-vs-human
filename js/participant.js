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

  let selectedChoice = null;
  let isSubmittedForCurrentQ = false;
  let currentAudio = null;

  /* --------------------------------------------------------------------------
     1. INITIALIZATION & RECONNECTION
     -------------------------------------------------------------------------- */
  function init() {
    setupRobotCheckbox();
    setupModals();
    setupJoinForm();
    setupPracticeSandbox();

    // Check for existing captain session in localStorage
    const saved = localStorage.getItem(SESSION_KEY);
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

    // Save session so page refresh preserves team & submissions
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      roomCode: roomCode,
      teamName: teamName,
      teamId: teamId
    }));

    Engine.initAsParticipant(roomCode, teamName, teamId);

    // Transition view
    document.getElementById("viewEntrance").style.display = "none";
    document.getElementById("viewPractice").style.display = "none";
    document.getElementById("viewInGame").style.display = "flex";
    document.getElementById("headerXpPill").style.display = "flex";
    document.getElementById("gameTeamNameLabel").textContent = `Team: ${teamName}`;
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

    // Update Timer
    if (state.timer) {
      timerText.textContent = `${state.timer.remaining}s`;
      timerPill.classList.toggle("urgent", state.timer.remaining <= 10 && state.timer.running);
    }

    if (state.status === "LOBBY") {
      cardLobby.style.display = "block";
      cardActive.style.display = "none";
      if (roundTag) roundTag.textContent = "Lobby";
      return;
    }

    // Question or Result State
    cardLobby.style.display = "none";
    cardActive.style.display = "block";

    const q = state.currentQuestion;
    if (!q) return;

    if (roundTag) {
      roundTag.textContent = `Round ${state.roundNum} · ${q.title}`;
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

    imgFrame.style.display = "none";
    textFrame.style.display = "none";
    audioFrame.style.display = "none";

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
      btnPlay.onclick = () => {
        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(q.audioUrl);
        btnPlay.textContent = "🔊 Playing...";
        currentAudio.onended = () => { btnPlay.textContent = "▶ Play Audio Clip"; };
        currentAudio.onerror = () => { btnPlay.textContent = "⚠️ Audio unavailable (see cues below)"; };
        currentAudio.play().catch(() => { btnPlay.textContent = "▶ Tap again to play"; });
      };
    }

    // 2. Options Grid
    const grid = document.getElementById("optionsGrid");
    const submitBtn = document.getElementById("btnSubmitAnswer");
    const submittedBanner = document.getElementById("submittedBanner");
    const submitBar = document.getElementById("submitBar");

    // Check if team already submitted for this question
    const teamSub = (myTeam.answers || {})[q.id];
    isSubmittedForCurrentQ = !!teamSub;

    grid.innerHTML = "";
    (q.options || []).forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "btn-option";
      btn.dataset.id = opt.id;
      btn.textContent = opt.label;

      const isChosen = isSubmittedForCurrentQ ? teamSub.choice === opt.id : selectedChoice === opt.id;
      if (isChosen) btn.classList.add("selected");

      btn.disabled = isSubmittedForCurrentQ || state.status === "LOCKED" || state.status === "REVEALED";

      btn.onclick = () => {
        if (isSubmittedForCurrentQ) return;
        selectedChoice = opt.id;
        grid.querySelectorAll(".btn-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        submitBtn.disabled = false;
        submitBtn.textContent = `Lock in: ${opt.label}`;
      };

      grid.appendChild(btn);
    });

    // Submission Bar State
    if (isSubmittedForCurrentQ) {
      submitBar.style.display = "none";
      submittedBanner.style.display = "flex";
    } else {
      submitBar.style.display = "block";
      submittedBanner.style.display = "none";
      submitBtn.disabled = !selectedChoice || state.status !== "QUESTION";
      submitBtn.onclick = () => {
        if (!selectedChoice) return;
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
      hintBar.style.display = q.hintAvailable ? "flex" : "none";

      const canBuy = myTeam.xp >= 25 && state.status === "QUESTION" && !isSubmittedForCurrentQ;
      hintBtn.disabled = !canBuy;
      hintBtn.textContent = myTeam.xp >= 25 ? "Unlock hint · 25 XP" : "Insufficient XP (25 required)";

      hintBtn.onclick = () => openHintConfirmModal(myTeam.xp);
    }

    // 4. Released Results (When host reveals answer)
    const resultBox = document.getElementById("releasedResultBox");
    if (state.status === "REVEALED" || state.status === "RESULTS") {
      resultBox.style.display = "block";
      const isCorrect = teamSub && teamSub.choice === state.releasedAnswer;
      resultBox.className = `released-result-box ${isCorrect ? 'correct' : 'incorrect'}`;

      document.getElementById("releasedVerdictBadge").textContent = 
        `Official Answer: ${state.releasedAnswer}`;
      document.getElementById("releasedPointsDelta").textContent = 
        teamSub ? (isCorrect ? "+100 XP (Correct!)" : "0 XP (Incorrect)") : "No Answer Submitted";
      document.getElementById("releasedPointsDelta").style.color = isCorrect ? "var(--color-success)" : "var(--color-danger)";
      document.getElementById("releasedTellText").innerHTML = `
        <strong>The Tell:</strong> ${state.releasedTell || "Verified by host."}
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

    document.getElementById("btnOpenRules").onclick = () => rulesModal.classList.add("open");
    document.getElementById("btnCloseRules").onclick = () => rulesModal.classList.remove("open");
    document.getElementById("btnCloseZoom").onclick = () => zoomModal.classList.remove("open");
    document.getElementById("btnCloseHistory").onclick = () => historyModal.classList.remove("open");

    // History Modal
    document.getElementById("headerXpPill").onclick = () => {
      const list = document.getElementById("historyList");
      list.innerHTML = (myTeam.history || []).map(h => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--charcoal-700);">
          <span>${h.desc}</span>
          <strong style="color:${h.delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${h.delta >= 0 ? '+' : ''}${h.delta} XP</strong>
        </div>
      `).join("") || "<div>No score history yet.</div>";
      historyModal.classList.add("open");
    };

    [rulesModal, zoomModal, historyModal].forEach(m => {
      m.addEventListener("click", (e) => {
        if (e.target === m) m.classList.remove("open");
      });
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
          ${item.roundName} · Sample ${pIdx + 1} of ${PracticeBank.length}
        </div>
        <h3 class="question-title">${item.title}</h3>
        <p class="question-prompt">${item.prompt}</p>

        ${item.media ? `
          <div class="question-media-frame">
            <img src="${item.media}" alt="Practice item">
          </div>
        ` : ''}

        ${item.textA ? `
          <div class="stacked-passages">
            <div class="passage-card"><span class="passage-tag">Passage A</span>${item.textA}</div>
            <div class="passage-card"><span class="passage-tag">Passage B</span>${item.textB}</div>
          </div>
        ` : ''}

        ${item.audioUrl ? `
          <div class="audio-card-box">
            <div class="audio-script-quote">${item.transcript}</div>
            <button class="btn-option" id="btnPracticePlayAudio" style="margin:0 auto; padding:8px 16px; font-size:13px;">▶ Play Sample Audio</button>
          </div>
        ` : ''}

        <div class="unlocked-hint-box" style="margin-bottom:14px;">
          <strong style="color:var(--gold-400);">Sample Clue:</strong> ${item.hint}
        </div>

        <div class="options-grid" id="practiceOptions">
          ${item.options.map(opt => `
            <button class="btn-option" data-opt="${opt.id}">${opt.label}</button>
          `).join("")}
        </div>

        <div class="released-result-box" id="practiceResultBox" style="display:none;">
          <div style="font-family:var(--font-display); font-weight:800; margin-bottom:6px;" id="practiceVerdictText"></div>
          <div class="released-tell">${item.tell}</div>
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

  // Run on DOM ready
  document.addEventListener("DOMContentLoaded", init);
})();
