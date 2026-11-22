/* ==========================================================================
   GWiCS: AI vs Human Showdown - Game Arena Engine
   Interactive Solo Practice & Host Projector Console 2.0
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.GWICS_EVENT_DATA;
  if (!DATA) {
    console.error("GWICS_EVENT_DATA not found.");
    return;
  }

  // Audio synthesis helper for Round 3 clips without native mp3 files
  const AudioEngine = {
    audioEl: null,
    isPlaying: false,

    playFile(url, onEnd) {
      this.stop();
      this.audioEl = new Audio(url);
      this.isPlaying = true;
      this.audioEl.onended = () => {
        this.isPlaying = false;
        if (onEnd) onEnd();
      };
      this.audioEl.onerror = () => {
        this.isPlaying = false;
        if (onEnd) onEnd();
      };
      return this.audioEl.play();
    },

    speakScript(text, style, onEnd) {
      this.stop();
      if (!('speechSynthesis' in window)) {
        if (onEnd) onEnd();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = style === "human_laughter" ? 1.05 : 0.98;
      utterance.pitch = style === "human_voicemail" ? 0.95 : 1.0;
      utterance.onend = () => {
        this.isPlaying = false;
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        this.isPlaying = false;
        if (onEnd) onEnd();
      };
      this.isPlaying = true;
      window.speechSynthesis.speak(utterance);
    },

    stop() {
      if (this.audioEl) {
        this.audioEl.pause();
        this.audioEl = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.isPlaying = false;
    }
  };

  /* ==========================================================================
     1. SOLO PRACTICE ARENA CONTROLLER
     ========================================================================== */
  const PracticeArena = {
    currentRoundIdx: 0, // 0: R1, 1: R2, 2: R3, 3: R4
    currentItemIdx: 0,
    scores: { r1: 0, r2: 0, r3: 0, total: 0 },
    answered: {}, // item_id -> { selected, correct }

    init() {
      this.render();
      this.bindEvents();
    },

    render() {
      const round = DATA.rounds[this.currentRoundIdx];
      const items = round.items || [];
      const item = items[this.currentItemIdx];

      // Update Header
      const pill = document.getElementById("practiceRoundPill");
      const title = document.getElementById("practiceRoundTitle");
      const statScore = document.getElementById("practiceScoreVal");
      const statStreak = document.getElementById("practiceStreakVal");
      const fillBar = document.getElementById("practiceProgressFill");

      if (pill) pill.textContent = `Round ${round.number} of 4`;
      if (title) title.textContent = round.title;
      if (statScore) statScore.textContent = `${this.scores.total} XP`;
      
      const totalItems = items.length || 1;
      const pct = Math.round(((this.currentItemIdx + 1) / totalItems) * 100);
      if (fillBar) fillBar.style.width = `${pct}%`;

      // Render Stage Content depending on Round
      const stage = document.getElementById("practiceCardStage");
      if (!stage) return;

      if (this.currentRoundIdx === 0) {
        this.renderRound1Image(stage, item, this.currentItemIdx, totalItems);
      } else if (this.currentRoundIdx === 1) {
        this.renderRound2Text(stage, item, this.currentItemIdx, totalItems);
      } else if (this.currentRoundIdx === 2) {
        this.renderRound3Audio(stage, item, this.currentItemIdx, totalItems);
      } else if (this.currentRoundIdx === 3) {
        this.renderRound4Showdown(stage);
      }
    },

    renderRound1Image(stage, item, idx, total) {
      const ansState = this.answered[item.id];
      const isRevealed = !!ansState;
      
      // Fallback image source if not yet generated or loaded
      const imgSrc = item.image || `assets/media/round1-item0${idx + 1}.jpg`;

      stage.innerHTML = `
        <div class="practice-image-layout">
          <div class="practice-img-frame" id="practiceImgFrame">
            <img src="${imgSrc}" alt="${item.what}" onerror="this.onerror=null; this.src='assets/media/round1-item01.jpg';">
            <button class="practice-img-zoom-btn" id="btnZoomImage">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
              Inspect Close-up
            </button>
          </div>
          <div class="practice-content-pane">
            <div class="practice-q-num">Image Challenge ${idx + 1} of ${total}</div>
            <h3 class="practice-q-text">${item.what}</h3>
            <div class="practice-hint-box">
              <strong>Scout's Hint:</strong> ${item.hint}
            </div>
            
            <div class="practice-vote-row">
              <button class="practice-btn-vote btn-human" id="voteHuman" ${isRevealed ? "disabled" : ""}>
                <span>👤 REAL PHOTO</span>
                <small>Human Shot</small>
              </button>
              <button class="practice-btn-vote btn-ai" id="voteAI" ${isRevealed ? "disabled" : ""}>
                <span>🤖 AI GENERATED</span>
                <small>Synthetic Image</small>
              </button>
            </div>

            <div class="practice-reveal-card ${isRevealed ? 'revealed' : ''}" id="practiceRevealCard">
              <div class="practice-reveal-head">
                <span class="practice-verdict-pill ${item.ans === 'AI' ? 'is-ai' : 'is-human'}">
                  ${item.ans === 'AI' ? '🤖 GENERATED BY AI' : '👤 AUTHENTIC HUMAN PHOTO'}
                </span>
                <span style="font-weight:700; font-size:13px; color:${ansState && ansState.correct ? 'var(--color-success)' : 'var(--color-danger)'};">
                  ${ansState ? (ansState.correct ? '✓ Correct! +100 XP' : '✗ Deceived by the Bot') : ''}
                </span>
              </div>
              <div class="practice-tell-text">
                <span class="practice-tell-label">The Official Tell</span>
                ${item.tell}
              </div>
            </div>

            <div class="practice-nav-actions">
              <button class="btn btn-outline-charcoal btn-sm" id="btnPrevItem" ${idx === 0 ? "disabled" : ""}>← Previous</button>
              <button class="btn btn-primary-gold btn-sm" id="btnNextItem">${idx === total - 1 ? "Next Round →" : "Next Challenge →"}</button>
            </div>
          </div>
        </div>
      `;

      this.bindRound1Actions(item);
    },

    bindRound1Actions(item) {
      const voteHuman = document.getElementById("voteHuman");
      const voteAI = document.getElementById("voteAI");
      const btnNext = document.getElementById("btnNextItem");
      const btnPrev = document.getElementById("btnPrevItem");
      const btnZoom = document.getElementById("btnZoomImage");

      if (voteHuman) {
        voteHuman.onclick = () => this.handleVote(item, "HUMAN");
      }
      if (voteAI) {
        voteAI.onclick = () => this.handleVote(item, "AI");
      }
      if (btnNext) {
        btnNext.onclick = () => this.goNext();
      }
      if (btnPrev) {
        btnPrev.onclick = () => this.goPrev();
      }
      if (btnZoom) {
        btnZoom.onclick = () => this.openZoomModal(item.image || `assets/media/round1-item0${this.currentItemIdx + 1}.jpg`, item.what);
      }
    },

    renderRound2Text(stage, item, idx, total) {
      const ansState = this.answered[item.id];
      const isRevealed = !!ansState;
      const textA = item.ai === "A" ? item.x : item.h;
      const textB = item.ai === "B" ? item.x : item.h;

      stage.innerHTML = `
        <div class="practice-content-pane">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="practice-q-num">Literary Pair ${idx + 1} of ${total}</div>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">
              Question: <strong>Which passage was generated by AI?</strong>
            </div>
          </div>

          <div class="practice-text-duo">
            <div class="practice-poem-card ${isRevealed ? (item.ai === 'A' ? 'revealed-ai' : 'revealed-human') : ''}" id="cardPoemA">
              <span class="poem-tag-letter">PASSAGE A</span>
              <div class="poem-body-text">${textA}</div>
              ${isRevealed ? `<span class="poem-badge-reveal ${item.ai === 'A' ? 'btn-accent-ai' : 'btn-primary-gold'}">${item.ai === 'A' ? '🤖 AI MIMIC' : '👤 HUMAN ORIGINAL'}</span>` : ''}
            </div>

            <div class="practice-poem-card ${isRevealed ? (item.ai === 'B' ? 'revealed-ai' : 'revealed-human') : ''}" id="cardPoemB">
              <span class="poem-tag-letter">PASSAGE B</span>
              <div class="poem-body-text">${textB}</div>
              ${isRevealed ? `<span class="poem-badge-reveal ${item.ai === 'B' ? 'btn-accent-ai' : 'btn-primary-gold'}">${item.ai === 'B' ? '🤖 AI MIMIC' : '👤 HUMAN ORIGINAL'}</span>` : ''}
            </div>
          </div>

          <div class="practice-vote-row" style="max-width:540px; margin:0 auto;">
            <button class="practice-btn-vote btn-ai" id="voteTextA" ${isRevealed ? "disabled" : ""}>
              <span>PASSAGE A IS AI</span>
              <small>Click to Vote A</small>
            </button>
            <button class="practice-btn-vote btn-ai" id="voteTextB" ${isRevealed ? "disabled" : ""}>
              <span>PASSAGE B IS AI</span>
              <small>Click to Vote B</small>
            </button>
          </div>

          <div class="practice-reveal-card ${isRevealed ? 'revealed' : ''}">
            <div class="practice-reveal-head">
              <span class="practice-verdict-pill is-ai">Passage ${item.ai} is AI</span>
              <span style="font-weight:700; font-size:13px; color:var(--gold-400);">
                Human Source: ${item.src}
              </span>
            </div>
            <div class="practice-tell-text">
              <span class="practice-tell-label">Literary Deduction</span>
              ${item.tell}
            </div>
          </div>

          <div class="practice-nav-actions">
            <button class="btn btn-outline-charcoal btn-sm" id="btnPrevItem" ${idx === 0 ? "disabled" : ""}>← Previous</button>
            <button class="btn btn-primary-gold btn-sm" id="btnNextItem">${idx === total - 1 ? "Next Round →" : "Next Pair →"}</button>
          </div>
        </div>
      `;

      const voteA = document.getElementById("voteTextA");
      const voteB = document.getElementById("voteTextB");
      const cardA = document.getElementById("cardPoemA");
      const cardB = document.getElementById("cardPoemB");

      if (voteA) voteA.onclick = () => this.handleVote(item, "A");
      if (voteB) voteB.onclick = () => this.handleVote(item, "B");
      if (cardA && !isRevealed) cardA.onclick = () => this.handleVote(item, "A");
      if (cardB && !isRevealed) cardB.onclick = () => this.handleVote(item, "B");

      const btnNext = document.getElementById("btnNextItem");
      const btnPrev = document.getElementById("btnPrevItem");
      if (btnNext) btnNext.onclick = () => this.goNext();
      if (btnPrev) btnPrev.onclick = () => this.goPrev();
    },

    renderRound3Audio(stage, item, idx, total) {
      const ansState = this.answered[item.id];
      const isRevealed = !!ansState;

      stage.innerHTML = `
        <div class="practice-audio-layout">
          <div class="practice-q-num">Audio Clip ${idx + 1} of ${total}</div>
          <h3 class="practice-q-text">${item.what}</h3>

          <div class="audio-orb-player" id="practiceAudioOrb">
            <div class="audio-waveform-bars">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
          </div>

          <button class="btn btn-accent-ai btn-sm" id="btnPlayPracticeAudio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Play Audio Clip
          </button>

          <p style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted); max-width:440px;">
            Script: “${item.script}”
          </p>

          <div class="practice-vote-row" style="width:100%; max-width:480px;">
            <button class="practice-btn-vote btn-human" id="voteAudioHuman" ${isRevealed ? "disabled" : ""}>
              <span>👤 REAL HUMAN</span>
              <small>Authentic Voice</small>
            </button>
            <button class="practice-btn-vote btn-ai" id="voteAudioAI" ${isRevealed ? "disabled" : ""}>
              <span>🤖 AI SYNTHESIS</span>
              <small>Cloned / TTS</small>
            </button>
          </div>

          <div class="practice-reveal-card ${isRevealed ? 'revealed' : ''}" style="width:100%; text-align:left;">
            <div class="practice-reveal-head">
              <span class="practice-verdict-pill ${item.ans === 'AI' ? 'is-ai' : 'is-human'}">
                ${item.ans === 'AI' ? '🤖 AI SYNTHETIC VOICE' : '👤 REAL HUMAN VOICE'}
              </span>
            </div>
            <div class="practice-tell-text">
              <span class="practice-tell-label">Acoustic Analysis</span>
              ${item.tell}
            </div>
          </div>

          <div class="practice-nav-actions" style="width:100%;">
            <button class="btn btn-outline-charcoal btn-sm" id="btnPrevItem" ${idx === 0 ? "disabled" : ""}>← Previous</button>
            <button class="btn btn-primary-gold btn-sm" id="btnNextItem">${idx === total - 1 ? "Next Round →" : "Next Audio →"}</button>
          </div>
        </div>
      `;

      const orb = document.getElementById("practiceAudioOrb");
      const btnPlay = document.getElementById("btnPlayPracticeAudio");

      const playAudio = () => {
        orb.classList.add("playing");
        if (item.audio && item.hasBuiltIn) {
          AudioEngine.playFile(item.audio, () => orb.classList.remove("playing"));
        } else {
          AudioEngine.speakScript(item.script, item.synthVoice, () => orb.classList.remove("playing"));
        }
      };

      if (orb) orb.onclick = playAudio;
      if (btnPlay) btnPlay.onclick = playAudio;

      const voteHuman = document.getElementById("voteAudioHuman");
      const voteAI = document.getElementById("voteAudioAI");
      if (voteHuman) voteHuman.onclick = () => this.handleVote(item, "HUMAN");
      if (voteAI) voteAI.onclick = () => this.handleVote(item, "AI");

      const btnNext = document.getElementById("btnNextItem");
      const btnPrev = document.getElementById("btnPrevItem");
      if (btnNext) btnNext.onclick = () => this.goNext();
      if (btnPrev) btnPrev.onclick = () => this.goPrev();
    },

    renderRound4Showdown(stage) {
      const prompts = DATA.rounds[3].prompts || [];
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

      stage.innerHTML = `
        <div style="max-width:800px; margin:0 auto; text-align:center; padding:20px 0;">
          <div class="practice-q-num">Round 4 · Live Prompt Duel Arena</div>
          <h2 style="font-family:var(--font-display); font-size:28px; margin:16px 0 8px;">
            Human Ingenuity vs LLM Hallucination
          </h2>
          <p style="color:var(--text-muted); font-size:15px; margin-bottom:28px;">
            In the live event, two student volunteers compete against ChatGPT/Gemini in real time under a 120-second timer.
          </p>

          <div style="background:var(--charcoal-800); border:1px solid var(--gold-border); border-radius:var(--radius-lg); padding:24px; margin-bottom:28px;">
            <span style="font-family:var(--font-mono); font-size:11px; color:var(--gold-400); text-transform:uppercase; display:block; margin-bottom:8px;">Live Duel Prompt</span>
            <div style="font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--text-main);" id="showdownPromptText">
              “${randomPrompt}”
            </div>
            <button class="btn btn-outline-charcoal btn-sm" style="margin-top:16px;" id="btnRerollPrompt">🎲 Spin New Prompt</button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:28px; text-align:left;">
            <div class="pillar-box">
              <b style="color:var(--gold-400);">Volunteer 1</b>
              <span>Crafting human wit live on stage</span>
            </div>
            <div class="pillar-box">
              <b style="color:var(--gold-400);">Volunteer 2</b>
              <span>Campus context & localized humor</span>
            </div>
            <div class="pillar-box">
              <b style="color:var(--accent-3);">Generative AI</b>
              <span>Probabilistic mimicry in 5 seconds</span>
            </div>
          </div>

          <div style="background:var(--charcoal-900); border:1px solid var(--charcoal-700); border-radius:var(--radius-md); padding:16px 20px; display:inline-flex; align-items:center; gap:16px;">
            <span style="font-size:14px; color:var(--text-main);">Want to run this live on your classroom or auditorium projector?</span>
            <button class="btn btn-primary-gold btn-sm" id="btnSwitchToProjector">Switch to Host Projector Mode</button>
          </div>
        </div>
      `;

      const btnReroll = document.getElementById("btnRerollPrompt");
      if (btnReroll) {
        btnReroll.onclick = () => {
          const nextP = prompts[Math.floor(Math.random() * prompts.length)];
          document.getElementById("showdownPromptText").textContent = `“${nextP}”`;
        };
      }

      const btnSwitch = document.getElementById("btnSwitchToProjector");
      if (btnSwitch) {
        btnSwitch.onclick = () => {
          const hostTab = document.getElementById("arenaModeProjector");
          if (hostTab) hostTab.click();
        };
      }
    },

    handleVote(item, choice) {
      const correctChoice = this.currentRoundIdx === 1 ? item.ai : item.ans;
      const isCorrect = choice === correctChoice;

      this.answered[item.id] = { selected: choice, correct: isCorrect };
      if (isCorrect) {
        this.scores.total += 100;
      }
      this.render();
    },

    goNext() {
      const items = DATA.rounds[this.currentRoundIdx].items || [];
      if (this.currentItemIdx < items.length - 1) {
        this.currentItemIdx++;
        this.render();
      } else {
        // Move to next round
        if (this.currentRoundIdx < DATA.rounds.length - 1) {
          this.switchRound(this.currentRoundIdx + 1);
        } else {
          alert(`Congratulations! You completed all rounds with ${this.scores.total} XP.`);
        }
      }
    },

    goPrev() {
      if (this.currentItemIdx > 0) {
        this.currentItemIdx--;
        this.render();
      }
    },

    switchRound(idx) {
      this.currentRoundIdx = idx;
      this.currentItemIdx = 0;
      
      // Update Tab Pill UI
      const tabs = document.querySelectorAll(".arena-round-tab");
      tabs.forEach((t, i) => {
        t.classList.toggle("active", i === idx);
      });

      this.render();
    },

    openZoomModal(src, title) {
      let modal = document.getElementById("imageZoomModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "imageZoomModal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
          <div class="modal-content" style="max-width:960px; padding:20px; background:var(--charcoal-950);">
            <button class="modal-close" id="closeZoomModal">✕</button>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--gold-400); margin-bottom:10px;">HIGH-RESOLUTION INSPECTION</div>
            <div style="border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--charcoal-700);">
              <img id="zoomModalImg" src="" style="width:100%; height:auto; max-height:80vh; object-fit:contain;">
            </div>
            <div style="margin-top:12px; font-size:13px; color:var(--text-muted);" id="zoomModalDesc"></div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector("#closeZoomModal").onclick = () => modal.classList.remove("open");
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("open"); };
      }
      modal.querySelector("#zoomModalImg").src = src;
      modal.querySelector("#zoomModalDesc").textContent = title;
      modal.classList.add("open");
    },

    bindEvents() {
      const tabs = document.querySelectorAll(".arena-round-tab");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const rIdx = parseInt(tab.dataset.round, 10);
          this.switchRound(rIdx);
        });
      });
    }
  };

  /* ==========================================================================
     2. PROJECTOR STAGE CONTROLLER (HOST GAME CONSOLE 2.0)
     ========================================================================== */
  const ProjectorDeck = {
    slides: [],
    currentPos: 0,
    revealed: {},
    teams: ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"],
    awards: {}, // slideKey -> [teamIndices]
    timerLeft: 120,
    timerInterval: null,

    init() {
      this.buildSlideList();
      this.loadStorage();
      this.render();
      this.bindHostControls();
    },

    buildSlideList() {
      this.slides = [];
      const add = (s) => this.slides.push(s);

      // Title & Rules
      add({ type: "title", name: "Welcome Title" });
      add({ type: "rules", name: "Rules & Scoring" });

      // Round 1
      add({ type: "round_intro", num: 1, title: "Real or AI?", sub: "10 Images · Hold up HUMAN or AI card.", name: "Round 1 Intro" });
      const r1 = DATA.rounds[0].items || [];
      r1.forEach((it, i) => {
        add({ type: "img", item: it, idx: i, key: it.id, name: `R1 · Image ${i + 1}` });
      });
      add({ type: "board", roundNum: 1, name: "Standings · After Round 1" });

      // Round 2
      add({ type: "round_intro", num: 2, title: "Who Wrote It?", sub: "10 Literary Pairs · Hold up A or B (Which is AI?)", name: "Round 2 Intro" });
      const r2 = DATA.rounds[1].items || [];
      r2.forEach((it, i) => {
        add({ type: "txt", item: it, idx: i, key: it.id, name: `R2 · Pair ${i + 1}` });
      });
      add({ type: "board", roundNum: 2, name: "Standings · After Round 2" });

      // Round 3
      add({ type: "round_intro", num: 3, title: "Sound Check", sub: "5 Vocal Clips · Listen twice. Hold up HUMAN or AI card.", name: "Round 3 Intro" });
      const r3 = DATA.rounds[2].items || [];
      r3.forEach((it, i) => {
        add({ type: "aud", item: it, idx: i, key: it.id, name: `R3 · Clip ${i + 1}` });
      });
      add({ type: "board", roundNum: 3, name: "Standings · After Round 3" });

      // Round 4 & Bonus
      add({ type: "showdown", name: "Round 4 · Live Showdown" });
      add({ type: "bonus", name: "Bonus Round · Beat the Bot" });
      add({ type: "board", final: true, name: "Final Standings & Trophy" });
      add({ type: "debrief", name: "Debrief · 5 Ways to Spot AI" });
    },

    loadStorage() {
      try {
        const saved = localStorage.getItem("gwics_projector_state");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.teams) this.teams = parsed.teams;
          if (parsed.awards) this.awards = parsed.awards;
          if (typeof parsed.pos === "number") this.currentPos = parsed.pos;
        }
      } catch (e) {
        console.warn("Storage load error:", e);
      }
    },

    saveStorage() {
      try {
        localStorage.setItem("gwics_projector_state", JSON.stringify({
          teams: this.teams,
          awards: this.awards,
          pos: this.currentPos
        }));
      } catch (e) {}
    },

    calcScores() {
      const sc = this.teams.map(() => 0);
      for (const k in this.awards) {
        const pts = k.startsWith("sd") ? 2 : 1;
        (this.awards[k] || []).forEach((tIdx) => {
          if (tIdx < sc.length) sc[tIdx] += pts;
        });
      }
      return sc;
    },

    render() {
      AudioEngine.stop();
      const s = this.slides[this.currentPos];
      const stage = document.getElementById("projectorSlideCanvas");
      const isRevealed = !!this.revealed[this.currentPos];
      if (!stage || !s) return;

      const eb = (l, r = "") => `<div class="slide-eyebrow"><span>${l}</span><span>${r}</span></div>`;
      let html = "";

      if (s.type === "title") {
        html = `
          ${eb("GWiCS Annual Tech Showdown", "Campus Center Ballroom")}
          <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:2cqw;">
            <h1 class="slide-main-title"><span style="color:var(--gold-500)">AI</span> vs <span style="color:var(--accent-3)">Human</span></h1>
            <p class="slide-lede">Can your table tell the machine from the mind? 4 competitive rounds, 1 Grand Champion trophy.</p>
          </div>
          ${eb("Hosted by Graduate Women in Computing Sciences", "Free Pizza & Tech Prizes")}
        `;
      } else if (s.type === "rules") {
        html = `
          ${eb("Rules of Engagement")}
          <h2 class="slide-sub-title">Every question, your table holds up one voting card.</h2>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:2cqw; margin:2cqw 0;">
            <div class="pillar-box" style="padding:2cqw; font-size:1.8cqw;">
              <b style="font-size:2.2cqw; color:var(--gold-500)">1 Point</b>
              For every correct consensus vote in Rounds 1 to 3.
            </div>
            <div class="pillar-box" style="padding:2cqw; font-size:1.8cqw;">
              <b style="font-size:2.2cqw; color:var(--accent-3)">No Phones</b>
              Zero web searches. Argue, inspect, and vote as a team.
            </div>
            <div class="pillar-box" style="padding:2cqw; font-size:1.8cqw;">
              <b style="font-size:2.2cqw; color:var(--gold-400)">2 Points</b>
              For the audience favorite in the Live Showdown.
            </div>
          </div>
          <p class="slide-lede">Rounds: Visual Turing → Literary Duel → Voice Synthesis → Live LLM Prompt Duel.</p>
        `;
      } else if (s.type === "round_intro") {
        html = `
          ${eb(`Round ${s.num} of 4`)}
          <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:2cqw;">
            <h1 class="slide-main-title">${s.title}</h1>
            <p class="slide-lede">${s.sub}</p>
          </div>
          ${eb("All tables prepare your paddles")}
        `;
      } else if (s.type === "img") {
        const it = s.item;
        const imgSrc = it.image || `assets/media/round1-item0${s.idx + 1}.jpg`;
        html = `
          ${eb("Round 1 · Real or AI?", `Image ${s.idx + 1} / 10`)}
          <div class="stage-media-box">
            <img src="${imgSrc}" alt="${it.what}" onerror="this.onerror=null; this.src='assets/media/round1-item01.jpg';">
          </div>
          ${isRevealed ? `
            <div class="stage-verdict-bar">
              <span class="stage-pill-badge ${it.ans === 'AI' ? 'ai' : 'human'}">${it.ans === 'AI' ? 'AI GENERATED' : 'REAL PHOTO'}</span>
              <div class="stage-tell-block"><strong>The Tell:</strong> ${it.tell}</div>
            </div>
          ` : `
            <div style="font-family:var(--font-mono); font-size:1.8cqw; color:var(--text-muted); display:flex; gap:2cqw; align-items:center;">
              Hold up your table card: <span style="color:var(--gold-500); font-weight:800;">[ HUMAN ]</span> or <span style="color:var(--accent-3); font-weight:800;">[ AI ]</span>
            </div>
          `}
        `;
      } else if (s.type === "txt") {
        const it = s.item;
        const textA = it.ai === "A" ? it.x : it.h;
        const textB = it.ai === "B" ? it.x : it.h;
        html = `
          ${eb("Round 2 · Who Wrote It?", `Pair ${s.idx + 1} / 10`)}
          <div class="stage-text-duo">
            <div class="stage-poem-card ${isRevealed ? (it.ai === 'A' ? 'is-ai' : 'is-human') : ''}">
              <span class="card-tag">A</span>
              <div class="card-txt">${textA}</div>
              ${isRevealed ? `<span style="font-family:var(--font-mono); font-size:1.4cqw; font-weight:800; color:${it.ai === 'A' ? 'var(--accent-3)' : 'var(--gold-500)'};">${it.ai === 'A' ? '🤖 AI MIMIC' : '👤 HUMAN ORIGINAL'}</span>` : ''}
            </div>
            <div class="stage-poem-card ${isRevealed ? (it.ai === 'B' ? 'is-ai' : 'is-human') : ''}">
              <span class="card-tag">B</span>
              <div class="card-txt">${textB}</div>
              ${isRevealed ? `<span style="font-family:var(--font-mono); font-size:1.4cqw; font-weight:800; color:${it.ai === 'B' ? 'var(--accent-3)' : 'var(--gold-500)'};">${it.ai === 'B' ? '🤖 AI MIMIC' : '👤 HUMAN ORIGINAL'}</span>` : ''}
            </div>
          </div>
          ${isRevealed ? `
            <div class="stage-verdict-bar">
              <span class="stage-pill-badge ai">Passage ${it.ai} is AI</span>
              <div class="stage-tell-block"><strong>Human Source:</strong> ${it.src} · ${it.tell}</div>
            </div>
          ` : `
            <div style="font-family:var(--font-mono); font-size:1.8cqw; color:var(--text-muted);">
              Which one is AI? Hold up paddle <span style="color:var(--text-main); font-weight:800;">[ A ]</span> or <span style="color:var(--text-main); font-weight:800;">[ B ]</span>
            </div>
          `}
        `;
      } else if (s.type === "aud") {
        const it = s.item;
        html = `
          ${eb("Round 3 · Sound Check", `Clip ${s.idx + 1} / 5`)}
          <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:5cqw;">
            <div class="audio-orb-player" style="width:18cqw; height:18cqw;" id="stageOrb">
              <span style="font-family:var(--font-display); font-size:2.2cqw; font-weight:800;">Clip ${s.idx + 1}</span>
            </div>
            <div style="max-width:55cqw; display:flex; flex-direction:column; gap:1.6cqw;">
              <p class="slide-lede" style="color:var(--text-main);">Listen twice. Is this speaker authentic human or AI synthesis?</p>
              ${isRevealed ? `
                <div class="stage-verdict-bar">
                  <span class="stage-pill-badge ${it.ans === 'AI' ? 'ai' : 'human'}">${it.ans}</span>
                  <div class="stage-tell-block"><strong>Tell:</strong> ${it.tell}</div>
                </div>
              ` : `
                <div style="font-family:var(--font-mono); font-size:1.8cqw; color:var(--text-muted);">
                  Vote with paddle: <span style="color:var(--gold-500); font-weight:800;">[ HUMAN ]</span> or <span style="color:var(--accent-3); font-weight:800;">[ AI ]</span>
                </div>
              `}
            </div>
          </div>
          ${eb("Click Play Clip in Host Dock below", "Turn laptop audio up")}
        `;
      } else if (s.type === "board") {
        const sc = this.calcScores();
        const maxScore = Math.max(1, ...sc);
        const ranked = this.teams.map((n, i) => ({ n, s: sc[i] })).sort((a, b) => b.s - a.s);
        html = `
          ${eb(s.final ? "Official Final Standings" : `Standings after Round ${s.roundNum}`, s.final ? "GWiCS Grand Champion" : "")}
          <h2 class="slide-sub-title">${s.final ? `🏆 Table <span style="color:var(--gold-400);">${ranked[0]?.n || '1'}</span> Takes The Trophy!` : "Who's In The Lead?"}</h2>
          <div class="stage-leaderboard">
            ${ranked.map((t, idx) => `
              <div class="stage-board-row">
                <span class="stage-board-rank">#${idx + 1}</span>
                <span class="stage-board-name">${t.n}</span>
                <div class="stage-board-bar">
                  <span class="stage-board-fill" style="width:${(t.s / maxScore) * 100}%"></span>
                </div>
                <span class="stage-board-score">${t.s} pts</span>
              </div>
            `).join("")}
          </div>
          ${eb("Scored live by GWiCS moderators")}
        `;
      } else if (s.type === "showdown") {
        html = `
          ${eb("Round 4 · Live Showdown", `<span style="font-family:var(--font-mono); font-size:2.4cqw; color:var(--gold-400);">${Math.floor(this.timerLeft / 60)}:${String(this.timerLeft % 60).padStart(2, "0")}</span>`)}
          <h2 class="slide-sub-title">Write a 4-line poem about the NJIT campus shuttle.</h2>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:2cqw; margin:2cqw 0; flex:1;">
            <div class="stage-poem-card"><span class="card-tag">A</span><div class="card-txt">Student Volunteer 1 Answer</div></div>
            <div class="stage-poem-card"><span class="card-tag">B</span><div class="card-txt">Student Volunteer 2 Answer</div></div>
            <div class="stage-poem-card is-ai"><span class="card-tag">C</span><div class="card-txt">Generative Model Response</div></div>
          </div>
          ${eb("Vote 1: Crowd Favorite (+2 pts)", "Vote 2: Spot Which is AI")}
        `;
      } else if (s.type === "bonus") {
        html = `
          ${eb("Bonus Round", "quickdraw.withgoogle.com")}
          <h2 class="slide-sub-title">Can AI Guess Your Doodle in 20 Seconds?</h2>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:2cqw; margin:2.5cqw 0;">
            <div class="pillar-box" style="padding:2cqw; font-size:1.8cqw;">
              <b style="color:var(--accent-3); font-size:2.2cqw;">Quick, Draw!</b>
              A volunteer doodles on screen; neural net guesses under 20s.
            </div>
            <div class="pillar-box" style="padding:2cqw; font-size:1.8cqw;">
              <b style="color:var(--gold-500); font-size:2.2cqw;">Hyper-Local Vibe</b>
              “Describe the 3rd floor of the library at 2:30 AM.”
            </div>
            <div class="pillar-box" style="padding:2cqw; font-size:1.8cqw;">
              <b style="color:var(--gold-400); font-size:2.2cqw;">Reverse Turing</b>
              Audience asks 1 spontaneous question to bot & human.
            </div>
          </div>
          <p class="slide-lede">Cheer for human unpredictability!</p>
        `;
      } else if (s.type === "debrief") {
        html = `
          ${eb("Takeaways & Digital Literacy", "GWiCS Keynote")}
          <h2 class="slide-sub-title">5 Telltale Signs to Spot AI in the Wild</h2>
          <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:1.4cqw; margin:2cqw 0;">
            <div class="pillar-box" style="padding:1.4cqw; font-size:1.5cqw;"><b style="color:var(--accent-3); font-size:2.2cqw;">01</b>Garbled typography & melted glyphs on signage.</div>
            <div class="pillar-box" style="padding:1.4cqw; font-size:1.5cqw;"><b style="color:var(--accent-3); font-size:2.2cqw;">02</b>Anatomical deformities, fused digits, mismatched earrings.</div>
            <div class="pillar-box" style="padding:1.4cqw; font-size:1.5cqw;"><b style="color:var(--accent-3); font-size:2.2cqw;">03</b>Polished, high-probability prose without specific nouns.</div>
            <div class="pillar-box" style="padding:1.4cqw; font-size:1.5cqw;"><b style="color:var(--accent-3); font-size:2.2cqw;">04</b>Speech lacks respiratory friction, breathing, or laughter.</div>
            <div class="pillar-box" style="padding:1.4cqw; font-size:1.5cqw;"><b style="color:var(--accent-3); font-size:2.2cqw;">05</b>Physical inconsistency: impossible shadow angles & optics.</div>
          </div>
          ${eb("Thank you for participating! Connect with GWiCS at njit.edu")}
        `;
      }

      stage.innerHTML = html;
      this.renderDock();
    },

    renderDock() {
      const s = this.slides[this.currentPos];
      const isRevealed = !!this.revealed[this.currentPos];

      const posLabel = document.getElementById("dockSlidePos");
      const jumpSel = document.getElementById("dockJumpSelect");
      const chipsBox = document.getElementById("dockScoreChips");
      const revealBtn = document.getElementById("dockRevealBtn");
      const playBtn = document.getElementById("dockPlayAudioBtn");

      if (posLabel) posLabel.textContent = `${this.currentPos + 1} / ${this.slides.length} · ${s.name}`;

      if (jumpSel && jumpSel.options.length !== this.slides.length) {
        jumpSel.innerHTML = this.slides.map((sl, idx) => `<option value="${idx}">${idx + 1}. ${sl.name}</option>`).join("");
      }
      if (jumpSel) jumpSel.value = this.currentPos;

      if (revealBtn) {
        if (["img", "txt", "aud"].includes(s.type)) {
          revealBtn.style.display = "inline-flex";
          revealBtn.textContent = isRevealed ? "Hide Answer" : "Reveal Answer";
        } else {
          revealBtn.style.display = "none";
        }
      }

      if (playBtn) {
        playBtn.style.display = s.type === "aud" ? "inline-flex" : "none";
      }

      // Render table chips
      if (chipsBox) {
        if (s.key) {
          const awarded = this.awards[s.key] || [];
          chipsBox.innerHTML = `
            <span style="font-family:var(--font-mono); font-size:12px; color:var(--text-dim); text-transform:uppercase; margin-right:6px;">Got It Right:</span>
            ${this.teams.map((tn, tIdx) => `
              <button class="table-score-chip" data-tidx="${tIdx}" aria-pressed="${awarded.includes(tIdx)}">
                ${tn}
              </button>
            `).join("")}
          `;
          chipsBox.querySelectorAll(".table-score-chip").forEach((chip) => {
            chip.onclick = () => {
              const tIdx = parseInt(chip.dataset.tidx, 10);
              const cur = this.awards[s.key] || [];
              if (cur.includes(tIdx)) {
                this.awards[s.key] = cur.filter((x) => x !== tIdx);
              } else {
                this.awards[s.key] = [...cur, tIdx];
              }
              this.saveStorage();
              this.renderDock();
            };
          });
        } else {
          chipsBox.innerHTML = `<span style="font-family:var(--font-mono); font-size:12px; color:var(--text-dim);">Slide navigation active.</span>`;
        }
      }
    },

    next() {
      const s = this.slides[this.currentPos];
      if (["img", "txt", "aud"].includes(s.type) && !this.revealed[this.currentPos]) {
        this.revealed[this.currentPos] = true;
        this.render();
        return;
      }
      if (this.currentPos < this.slides.length - 1) {
        this.currentPos++;
        this.saveStorage();
        this.render();
      }
    },

    prev() {
      if (this.currentPos > 0) {
        this.currentPos--;
        this.saveStorage();
        this.render();
      }
    },

    toggleReveal() {
      this.revealed[this.currentPos] = !this.revealed[this.currentPos];
      this.render();
    },

    bindHostControls() {
      const nextBtn = document.getElementById("dockNextBtn");
      const prevBtn = document.getElementById("dockPrevBtn");
      const revealBtn = document.getElementById("dockRevealBtn");
      const jumpSel = document.getElementById("dockJumpSelect");
      const fsBtn = document.getElementById("dockFsBtn");
      const playBtn = document.getElementById("dockPlayAudioBtn");

      if (nextBtn) nextBtn.onclick = () => this.next();
      if (prevBtn) prevBtn.onclick = () => this.prev();
      if (revealBtn) revealBtn.onclick = () => this.toggleReveal();
      if (jumpSel) {
        jumpSel.onchange = (e) => {
          this.currentPos = parseInt(e.target.value, 10);
          this.saveStorage();
          this.render();
        };
      }
      if (fsBtn) {
        fsBtn.onclick = () => {
          const el = document.getElementById("projectorCinemaStage");
          if (!document.fullscreenElement) {
            el.requestFullscreen().catch(() => alert("Fullscreen unavailable"));
          } else {
            document.exitFullscreen();
          }
        };
      }
      if (playBtn) {
        playBtn.onclick = () => {
          const s = this.slides[this.currentPos];
          if (s && s.type === "aud") {
            const it = s.item;
            const orb = document.getElementById("stageOrb");
            if (orb) orb.classList.add("playing");
            if (it.audio && it.hasBuiltIn) {
              AudioEngine.playFile(it.audio, () => orb && orb.classList.remove("playing"));
            } else {
              AudioEngine.speakScript(it.script, it.synthVoice, () => orb && orb.classList.remove("playing"));
            }
          }
        };
      }

      // Keyboard Controls
      document.addEventListener("keydown", (e) => {
        // Only trigger if host console view is visible and not typing in input
        const projectorView = document.getElementById("projectorViewWrapper");
        if (!projectorView || projectorView.style.display === "none") return;
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;

        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          this.next();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          this.prev();
        } else if (e.key === "f" || e.key === "F") {
          if (fsBtn) fsBtn.click();
        } else if (e.key === "r" || e.key === "R") {
          this.toggleReveal();
        }
      });
    }
  };

  /* ==========================================================================
     ARENA MODE SWITCHER (PRACTICE VS PROJECTOR)
     ========================================================================== */
  function setupModeTabs() {
    const btnSolo = document.getElementById("arenaModeSolo");
    const btnProjector = document.getElementById("arenaModeProjector");
    const soloWrapper = document.getElementById("soloPracticeWrapper");
    const projWrapper = document.getElementById("projectorViewWrapper");

    if (btnSolo && btnProjector) {
      btnSolo.onclick = () => {
        btnSolo.classList.add("active");
        btnProjector.classList.remove("active");
        if (soloWrapper) soloWrapper.style.display = "flex";
        if (projWrapper) projWrapper.style.display = "none";
        PracticeArena.render();
      };

      btnProjector.onclick = () => {
        btnProjector.classList.add("active");
        btnSolo.classList.remove("active");
        if (soloWrapper) soloWrapper.style.display = "none";
        if (projWrapper) projWrapper.style.display = "flex";
        ProjectorDeck.render();
      };
    }
  }

  // Initialize both engines when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    setupModeTabs();
    PracticeArena.init();
    ProjectorDeck.init();
  });

})();
