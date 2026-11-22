/* ==========================================================================
   GWiCS AI vs Human - Main Website Logic (Theme, Countdown, Warmup, RSVP)
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.GWICS_EVENT_DATA;

  /* --------------------------------------------------------------------------
     1. COLOR PALETTE SWITCHER (CHARCOAL + GOLD + CUSTOMIZABLE 3RD ACCENT)
     -------------------------------------------------------------------------- */
  function initThemeSwitcher() {
    const dots = document.querySelectorAll(".palette-dot");
    const currentTheme = localStorage.getItem("gwics_accent_theme") || "cyan";

    function setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("gwics_accent_theme", theme);
      dots.forEach((dot) => {
        dot.classList.toggle("active", dot.dataset.pick === theme);
      });
    }

    setTheme(currentTheme);

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const picked = dot.dataset.pick;
        setTheme(picked);
      });
    });
  }

  /* --------------------------------------------------------------------------
     2. EVENT COUNTDOWN CLOCK
     -------------------------------------------------------------------------- */
  function initCountdown() {
    // Target: Dec 5, 2026, 18:00:00 EST
    const targetDate = new Date("2026-12-05T18:00:00-05:00").getTime();

    const dEl = document.getElementById("timeDays");
    const hEl = document.getElementById("timeHours");
    const mEl = document.getElementById("timeMins");
    const sEl = document.getElementById("timeSecs");

    if (!dEl || !hEl || !mEl || !sEl) return;

    function update() {
      const now = new Date().getTime();
      let diff = targetDate - now;

      if (diff <= 0) {
        dEl.textContent = "00";
        hEl.textContent = "00";
        mEl.textContent = "00";
        sEl.textContent = "00";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      dEl.textContent = String(days).padStart(2, "0");
      hEl.textContent = String(hours).padStart(2, "0");
      mEl.textContent = String(minutes).padStart(2, "0");
      sEl.textContent = String(seconds).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
  }

  /* --------------------------------------------------------------------------
     3. 60-SECOND TURING WARMUP MINI-CHALLENGE
     -------------------------------------------------------------------------- */
  const WarmupGame = {
    step: 0,
    score: 0,
    questions: [
      {
        type: "img",
        title: "Look closely at this university walkway. Real camera photo or AI?",
        img: "assets/media/round1-item01.jpg",
        ans: "AI",
        tell: "Zoom into the bulletin board posters! The lettering consists of garbled, melted pseudo-glyphs characteristic of diffusion model hallucinations."
      },
      {
        type: "txt",
        title: "Which passage was authored by Robert Frost?",
        choiceA: "“Whose woods these are I think I know.\nHis house is in the village though;\nHe will not see me stopping here\nTo watch his woods fill up with snow.”",
        choiceB: "“Whose fields these are I cannot say;\nThe farmer left at end of day;\nHe will not mind me lingering here\nTo see the light go soft and gray.”",
        ans: "A",
        tell: "Passage A is the authentic 1923 masterpiece. Frost grounds his poem with concrete human geography (a village, a specific house), whereas the AI version resorts to bland rhyming filler (“the light go soft and gray”)."
      },
      {
        type: "aud",
        title: "Is this urgent emergency voicemail real human speech or synthetic voice cloning?",
        script: "“Hey, it's me. I'm kind of stuck right now and my phone's about to die. Can you call me back as soon as you get this? It's important.”",
        ans: "AI",
        tell: "Acoustically sterile! A real emergency call from a dying phone has ambient environmental background noise, room resonance, and natural vocal friction. This is exactly how voice cloning scams deceive unsuspecting families."
      }
    ],

    init() {
      this.render();
      const nextBtn = document.getElementById("warmupNextBtn");
      if (nextBtn) {
        nextBtn.onclick = () => {
          this.step++;
          this.render();
        };
      }
    },

    render() {
      const q = this.questions[this.step];
      const stepInd = document.getElementById("warmupStepIndicator");
      const scoreBadge = document.getElementById("warmupScoreBadge");
      const body = document.getElementById("warmupCardBody");
      const verdict = document.getElementById("warmupVerdict");
      const nextBtn = document.getElementById("warmupNextBtn");

      if (verdict) verdict.className = "warmup-verdict";
      if (nextBtn) nextBtn.style.display = "none";

      if (!q) {
        // Complete state
        if (stepInd) stepInd.textContent = "Challenge Completed!";
        if (body) {
          body.innerHTML = `
            <div style="text-align:center; padding:30px 0;">
              <div style="font-size:44px; margin-bottom:12px;">🏆</div>
              <h3 style="font-family:var(--font-display); font-size:24px; margin-bottom:8px;">
                Warmup Score: ${this.score} / 3 Correct
              </h3>
              <p style="color:var(--text-muted); font-size:15px; margin-bottom:24px;">
                ${this.score >= 2 ? "Impressive human instinct! You're ready for the full 4-round showdown." : "AI fooled you on a few subtleties—dive into the Arena to train your eye!"}
              </p>
              <a href="#arena" class="btn btn-primary-gold btn-lg">Launch Full Interactive Arena ↓</a>
            </div>
          `;
        }
        return;
      }

      if (stepInd) stepInd.textContent = `Warmup Challenge ${this.step + 1} of 3`;
      if (scoreBadge) scoreBadge.textContent = `Score: ${this.score} pts`;

      if (q.type === "img") {
        body.innerHTML = `
          <h4 class="warmup-question-title">${q.title}</h4>
          <div class="warmup-img-wrapper">
            <img src="${q.img}" alt="Turing Warmup Image">
          </div>
          <div class="warmup-options">
            <button class="warmup-opt-btn human-opt" id="warmupVoteHuman">👤 Real Photo</button>
            <button class="warmup-opt-btn ai-opt" id="warmupVoteAI">🤖 AI Generated</button>
          </div>
        `;
        document.getElementById("warmupVoteHuman").onclick = () => this.handleVote("HUMAN");
        document.getElementById("warmupVoteAI").onclick = () => this.handleVote("AI");
      } else if (q.type === "txt") {
        body.innerHTML = `
          <h4 class="warmup-question-title">${q.title}</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
            <div class="practice-poem-card" style="padding:16px;" id="warmupTextA">
              <span class="poem-tag-letter">OPTION A</span>
              <div class="poem-body-text" style="font-size:14px;">${q.choiceA}</div>
            </div>
            <div class="practice-poem-card" style="padding:16px;" id="warmupTextB">
              <span class="poem-tag-letter">OPTION B</span>
              <div class="poem-body-text" style="font-size:14px;">${q.choiceB}</div>
            </div>
          </div>
          <div class="warmup-options">
            <button class="warmup-opt-btn human-opt" id="warmupVoteA">Option A is Frost</button>
            <button class="warmup-opt-btn ai-opt" id="warmupVoteB">Option B is Frost</button>
          </div>
        `;
        document.getElementById("warmupVoteA").onclick = () => this.handleVote("A");
        document.getElementById("warmupVoteB").onclick = () => this.handleVote("B");
      } else if (q.type === "aud") {
        body.innerHTML = `
          <h4 class="warmup-question-title">${q.title}</h4>
          <div style="background:var(--charcoal-900); border:1px solid var(--charcoal-700); border-radius:var(--radius-md); padding:16px; margin-bottom:20px; font-family:var(--font-serif); font-size:15px; color:var(--text-main);">
            ${q.script}
          </div>
          <div style="text-align:center; margin-bottom:20px;">
            <button class="btn btn-accent-ai btn-sm" id="btnPlayWarmupAudio">▶ Play Voicemail Audio</button>
          </div>
          <div class="warmup-options">
            <button class="warmup-opt-btn human-opt" id="warmupVoteAudHuman">👤 Real Human</button>
            <button class="warmup-opt-btn ai-opt" id="warmupVoteAudAI">🤖 AI Synthetic</button>
          </div>
        `;
        const playBtn = document.getElementById("btnPlayWarmupAudio");
        if (playBtn) {
          playBtn.onclick = () => {
            const a = new Audio("assets/audio/a3.mp3");
            a.play();
          };
        }
        document.getElementById("warmupVoteAudHuman").onclick = () => this.handleVote("HUMAN");
        document.getElementById("warmupVoteAudAI").onclick = () => this.handleVote("AI");
      }
    },

    handleVote(choice) {
      const q = this.questions[this.step];
      const isCorrect = choice === q.ans;
      if (isCorrect) this.score++;

      const verdict = document.getElementById("warmupVerdict");
      const nextBtn = document.getElementById("warmupNextBtn");

      if (verdict) {
        verdict.className = `warmup-verdict ${isCorrect ? 'correct' : 'wrong'}`;
        verdict.innerHTML = `
          <div style="font-weight:800; font-family:var(--font-display); font-size:15px; color:${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}; margin-bottom:4px;">
            ${isCorrect ? "✓ Spot On! You deduced correctly." : "✗ Tricked by the Machine!"}
          </div>
          <div style="font-size:13px; color:var(--text-muted); line-height:1.5;">
            <strong>The Tell:</strong> ${q.tell}
          </div>
        `;
      }

      // Disable option buttons
      document.querySelectorAll(".warmup-opt-btn").forEach((b) => (b.disabled = true));

      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = this.step === this.questions.length - 1 ? "See Final Score →" : "Next Question →";
      }
    }
  };

  /* --------------------------------------------------------------------------
     4. RSVP & VIP TABLE PASS GENERATOR MODAL
     -------------------------------------------------------------------------- */
  function initRsvpModal() {
    const modal = document.getElementById("rsvpModal");
    const openBtns = document.querySelectorAll("[data-open-rsvp]");
    const closeBtn = document.getElementById("closeRsvpModal");
    const form = document.getElementById("rsvpForm");

    if (!modal) return;

    openBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.add("open");
      });
    });

    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove("open");
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });

    // Real-time pass preview
    const nameInput = document.getElementById("rsvpName");
    const teamInput = document.getElementById("rsvpTeam");
    const passName = document.getElementById("passAttendeeName");
    const passTeam = document.getElementById("passAttendeeTeam");
    const passSeat = document.getElementById("passSeatNumber");

    if (nameInput && passName) {
      nameInput.addEventListener("input", (e) => {
        passName.textContent = e.target.value.trim() || "Alex Mercer";
      });
    }

    if (teamInput && passTeam) {
      teamInput.addEventListener("input", (e) => {
        passTeam.textContent = e.target.value.trim() ? `Team: ${e.target.value.trim()}` : "Table Team: Highlighters";
      });
    }

    // Generate pseudo-QR code onto canvas
    const qrCanvas = document.getElementById("ticketQrCanvas");
    if (qrCanvas) {
      const ctx = qrCanvas.getContext("2d");
      const size = 64;
      qrCanvas.width = size;
      qrCanvas.height = size;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#0B0E14";
      
      // Draw simulated matrix pattern
      for (let x = 0; x < size; x += 8) {
        for (let y = 0; y < size; y += 8) {
          if (Math.random() > 0.45 || (x < 24 && y < 24) || (x > 36 && y < 24) || (x < 24 && y > 36)) {
            ctx.fillRect(x + 1, y + 1, 6, 6);
          }
        }
      }
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Registration confirmed! Your VIP Table Pass has been issued for Friday, Dec 5.");
        modal.classList.remove("open");
      });
    }
  }

  /* --------------------------------------------------------------------------
     5. ORGANIZER TOOLKIT & ASSET PACK MODAL
     -------------------------------------------------------------------------- */
  function initOrganizerModal() {
    const modal = document.getElementById("organizerModal");
    const openBtns = document.querySelectorAll("[data-open-organizer]");
    const closeBtn = document.getElementById("closeOrganizerModal");

    if (!modal) return;

    openBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.classList.add("open");
      });
    });

    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove("open");
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }

  /* --------------------------------------------------------------------------
     6. SCROLL & NAVBAR DYNAMICS
     -------------------------------------------------------------------------- */
  function initScrollNav() {
    const header = document.querySelector(".site-header");
    window.addEventListener("scroll", () => {
      if (window.scrollY > 30) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });

    // Mobile nav toggle
    const toggle = document.querySelector(".mobile-toggle");
    const navMenu = document.querySelector(".nav-menu");
    if (toggle && navMenu) {
      toggle.addEventListener("click", () => {
        const isHidden = window.getComputedStyle(navMenu).display === "none";
        navMenu.style.display = isHidden ? "flex" : "none";
        navMenu.style.flexDirection = "column";
        navMenu.style.position = "absolute";
        navMenu.style.top = "76px";
        navMenu.style.left = "0";
        navMenu.style.right = "0";
        navMenu.style.background = "var(--charcoal-900)";
        navMenu.style.padding = "20px";
        navMenu.style.borderBottom = "1px solid var(--charcoal-700)";
      });
    }
  }

  // DOM Boot
  document.addEventListener("DOMContentLoaded", () => {
    initThemeSwitcher();
    initCountdown();
    WarmupGame.init();
    initRsvpModal();
    initOrganizerModal();
    initScrollNav();
  });

})();
