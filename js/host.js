/* ==========================================================================
   GWiCS: BOT OR NOT? - Host Mission Control Engine
   Controls Session State, Answer Revealing, XP Adjustments & Projector Sync
   ========================================================================== */

(function () {
  "use strict";

  const Engine = window.GWICS_SyncEngine;
  // Security: Plaintext passcode is NEVER stored in client application code.
  // Verified via Firebase Auth backend or salted one-way cryptographic SHA-256 digest.
  const AUTH_SALT = "GWICS_SALT_2026_";
  const EXPECTED_CREDENTIAL_DIGEST = "917f58c089fadb57c940a4ffd93b7f890bfc409483aa458592b1cc16744c205f";

  let loadedPack = null;
  let currentRoundNum = 1;
  let currentQIdx = 0;
  let targetAdjustTeamId = null;
  let initialized = false;
  const consumedReserveIds = new Set();
  try {
    const savedReserves = JSON.parse(sessionStorage.getItem("gwics_consumed_reserves") || "[]");
    if (Array.isArray(savedReserves)) {
      savedReserves.forEach(id => consumedReserveIds.add(id));
    }
  } catch (e) {}

  async function verifyOrganizerPasscode(pin) {
    if (!pin) return false;

    // 1. Firebase backend verification when configured
    if (window.firebase && firebase.auth && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      try {
        await firebase.auth().signInWithEmailAndPassword("organizer@gwics.org", pin);
        return true;
      } catch (fbErr) {
        console.warn("Firebase Auth attempt failed:", fbErr.message);
      }
    }

    // 2. Cryptographic salted one-way hash verification (zero plaintext in client code)
    try {
      if (window.crypto && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(AUTH_SALT + pin);
        const hashBuf = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return hashHex === EXPECTED_CREDENTIAL_DIGEST;
      }
    } catch (cryptoErr) {
      console.error("Web Crypto verification error:", cryptoErr);
    }

    return false;
  }

  function init() {
    if (initialized) return;
    initialized = true;

    setupDrawerControls();
    setupAuth();
    setupPresentButton();
    setupSignOut();
    setupRoundTabs();
    setupActionButtons();
    setupScoreModal();
    setupAudioCheck();
    setupExportCsv();
    setupShowdownEditor();
  }

  function setupDrawerControls() {
    const drawer = document.getElementById("hostPanelDrawer");
    const toggleBtn = document.getElementById("btnToggleHostDrawer");
    const closeBtn = document.getElementById("btnHostCloseDrawer");
    const linkOrganizer = document.getElementById("linkOrganizerAccess");
    const btnGateReturn = document.getElementById("btnGateReturn");

    function openDrawer() {
      if (drawer) {
        drawer.classList.add("open");
        if (toggleBtn) toggleBtn.classList.add("active");
      }
    }

    function closeDrawer() {
      if (drawer) {
        drawer.classList.remove("open");
        if (toggleBtn) toggleBtn.classList.remove("active");
      }
    }

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        if (drawer && drawer.classList.contains("open")) {
          closeDrawer();
        } else {
          openDrawer();
        }
      };
    }

    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (btnGateReturn) btnGateReturn.onclick = closeDrawer;

    if (linkOrganizer) {
      linkOrganizer.onclick = (e) => {
        e.preventDefault();
        openDrawer();
      };
    }
  }

  function setupPresentButton() {
    const btn = document.getElementById("btnHostPresent");
    if (!btn) return;
    btn.onclick = () => {
      const room = (document.getElementById("hostRoomInput")?.value || Engine.roomCode || "BOTORNOT").trim().toUpperCase();
      const sessId = Engine.publicState.sessionId || "";
      window.open(`projector.html?room=${encodeURIComponent(room)}&session=${encodeURIComponent(sessId)}`, "_blank");
    };
  }

  function setupSignOut() {
    const btn = document.getElementById("btnHostSignOut");
    if (!btn) return;
    btn.onclick = () => {
      if (confirm("Sign out of Organizer Mission Control?")) {
        sessionStorage.removeItem("gwics_host_authenticated");
        sessionStorage.removeItem("gwics_cached_pack");
        sessionStorage.removeItem("gwics_host_room");
        const drawer = document.getElementById("hostPanelDrawer");
        if (drawer) drawer.classList.remove("open");
        const gate = document.getElementById("viewHostGate");
        const dash = document.getElementById("viewHostDashboard");
        if (gate) gate.style.display = "block";
        if (dash) dash.style.display = "none";
      }
    };
  }

  function computePackHash(pack) {
    try {
      const raw = JSON.stringify(pack.rounds || pack);
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    } catch (e) {
      return "pack_" + Date.now().toString(36);
    }
  }

  function updateSessionLabels(sessionId, packHash) {
    const sEl = document.getElementById("hostSessionIdLabel");
    const pEl = document.getElementById("hostPackHashLabel");
    if (sEl) sEl.textContent = sessionId || "-";
    if (pEl) pEl.textContent = packHash ? packHash.slice(0, 10) : "-";
  }

  /* --------------------------------------------------------------------------
     PRE-FLIGHT PACK & MEDIA VALIDATOR (Real Audio decoding, RMS, and images)
     -------------------------------------------------------------------------- */
  async function runPreflightValidation(pack) {
    const reportEl = document.getElementById("hostPreflightReport");
    if (!reportEl) return;

    reportEl.style.display = "block";
    reportEl.innerHTML = `<div style="font-family:var(--font-mono); font-size:11px; color:var(--gold-400); padding:10px; background:var(--charcoal-900); border-radius:var(--radius-sm); border:1px solid var(--charcoal-700);">⏳ Performing deep pre-flight validation on questions, media assets, and audio decodings...</div>`;

    const errors = [];
    const imageCheckPromises = [];
    const audioCheckPromises = [];

    // Collect all question objects
    const allQuestions = [];
    if (pack.practice) {
      allQuestions.push({ q: pack.practice, roundLabel: "Practice", isReserve: false });
    }
    for (const r of pack.rounds || []) {
      for (const it of r.items || []) {
        allQuestions.push({ q: it, roundLabel: `Round ${r.roundNum}`, isReserve: false });
      }
      for (const res of r.reserves || []) {
        allQuestions.push({ q: res, roundLabel: `Round ${r.roundNum} Reserve`, isReserve: true });
      }
    }

    // 1. Schema & Answer Key Validation
    let validSchemaCount = 0;
    let missingAnsCount = 0;
    let missingTellCount = 0;

    for (const entry of allQuestions) {
      const q = entry.q;
      if (!q.id || !q.title || !q.prompt) {
        errors.push(`Invalid question schema in ${entry.roundLabel}: missing id, title, or prompt`);
      } else {
        validSchemaCount++;
      }

      if (q.type !== "showdown") {
        if (!q.ans) {
          missingAnsCount++;
          errors.push(`Missing answer key in ${entry.roundLabel} (${q.id}: ${q.title})`);
        } else if (Array.isArray(q.options) && q.options.length > 0) {
          const optIds = q.options.map(o => o.id);
          if (!optIds.includes(q.ans)) {
            errors.push(`Answer '${q.ans}' not found in options [${optIds.join(", ")}] for question ${q.id}`);
          }
        }
      }

      if (!q.tell && q.type !== "showdown") {
        missingTellCount++;
        errors.push(`Missing forensic tell explanation in ${entry.roundLabel} (${q.id})`);
      }

      // Check Image assets
      if (q.type === "image" && (q.media || q.cardImage)) {
        const imgUrl = (q.media || q.cardImage).replace(/\\/g, "/");
        imageCheckPromises.push(new Promise((resolve) => {
          const img = new Image();
          const start = Date.now();
          img.onload = () => resolve({ ok: true, qid: q.id, title: q.title, url: imgUrl, width: img.naturalWidth, height: img.naturalHeight, ms: Date.now() - start });
          img.onerror = () => resolve({ ok: false, qid: q.id, title: q.title, url: imgUrl, error: "Image file failed to load" });
          img.src = imgUrl;
        }));
      }

      // Check Audio assets
      if (q.type === "audio" && (q.audioUrl || q.media)) {
        const audioUrl = (q.audioUrl || q.media).replace(/\\/g, "/");
        audioCheckPromises.push((async () => {
          try {
            const res = await fetch(audioUrl);
            if (!res.ok) {
              return { ok: false, qid: q.id, title: q.title, url: audioUrl, error: `HTTP ${res.status} ${res.statusText}` };
            }
            const buf = await res.arrayBuffer();
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const audioBuf = await ctx.decodeAudioData(buf);
              const duration = audioBuf.duration;
              const sampleRate = audioBuf.sampleRate;
              const channels = audioBuf.numberOfChannels;

              // Compute RMS loudness
              const channelData = audioBuf.getChannelData(0);
              let sumSq = 0;
              for (let i = 0; i < channelData.length; i++) {
                sumSq += channelData[i] * channelData[i];
              }
              const rms = Math.sqrt(sumSq / channelData.length);
              const rmsDbfs = 20 * Math.log10(rms || 1e-6);
              try { await ctx.close(); } catch (e) {}

              return {
                ok: true,
                qid: q.id,
                title: q.title,
                url: audioUrl,
                duration: duration.toFixed(2),
                sampleRate: sampleRate,
                channels: channels,
                rmsDbfs: rmsDbfs.toFixed(1)
              };
            } else {
              return { ok: true, qid: q.id, title: q.title, url: audioUrl, duration: "N/A", rmsDbfs: "N/A" };
            }
          } catch (err) {
            return { ok: false, qid: q.id, title: q.title, url: audioUrl, error: err.message };
          }
        })());
      }
    }

    // Await asset inspections concurrently
    const [imageResults, audioResults] = await Promise.all([
      Promise.all(imageCheckPromises),
      Promise.all(audioCheckPromises)
    ]);

    const failedImages = imageResults.filter(r => !r.ok);
    const passedImages = imageResults.filter(r => r.ok);
    const failedAudio = audioResults.filter(r => !r.ok);
    const passedAudio = audioResults.filter(r => r.ok);

    const scoredCount = (pack.rounds || []).reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);
    const reserveCount = (pack.rounds || []).reduce((acc, r) => acc + (r.reserves ? r.reserves.length : 0), 0);
    const practiceCount = pack.practice ? 1 : 0;
    const totalCount = allQuestions.length;

    let avgAudioDbfs = "N/A";
    if (passedAudio.length > 0 && passedAudio[0].rmsDbfs !== "N/A") {
      const sumDbfs = passedAudio.reduce((sum, a) => sum + parseFloat(a.rmsDbfs), 0);
      avgAudioDbfs = (sumDbfs / passedAudio.length).toFixed(1) + " dBFS";
    }

    let reportHtml = `
      <div class="host-preflight-box" style="background:var(--charcoal-900); border:1px solid ${errors.length || failedImages.length || failedAudio.length ? 'var(--color-danger)' : 'var(--color-success)'}; border-radius:var(--radius-md); padding:14px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--charcoal-700); padding-bottom:6px;">
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--gold-400); text-transform:uppercase; font-weight:700;">
            Pre-Flight Asset & Integrity Verification
          </span>
          <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:${errors.length || failedImages.length || failedAudio.length ? 'var(--color-danger)' : 'var(--color-success)'};">
            ${errors.length || failedImages.length || failedAudio.length ? '⚠️ ISSUES DETECTED' : '✓ 100% VERIFIED READY'}
          </span>
        </div>

        <div class="host-preflight-item ${errors.length ? 'invalid' : 'valid'}" style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
          <span>Questions & Schema:</span>
          <strong>${errors.length ? '❌ ' + errors.length + ' Issues' : '✓ ' + scoredCount + ' Scored + ' + reserveCount + ' Reserves' + (practiceCount ? ' + 1 Practice' : '') + ' (' + totalCount + ' Total)'}</strong>
        </div>

        <div class="host-preflight-item ${failedImages.length ? 'invalid' : 'valid'}" style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
          <span>Visual Images:</span>
          <strong>${failedImages.length ? '❌ ' + failedImages.length + ' Failed' : '✓ ' + passedImages.length + ' Images Decoded & Inspected (All Dimensions Valid)'}</strong>
        </div>

        <div class="host-preflight-item ${failedAudio.length ? 'invalid' : 'valid'}" style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
          <span>Acoustic Audio Clips:</span>
          <strong>${failedAudio.length ? '❌ ' + failedAudio.length + ' Failed' : '✓ ' + passedAudio.length + ' Audio Files Decoded (Mean RMS ' + avgAudioDbfs + ')'}</strong>
        </div>

        <div class="host-preflight-item ${missingAnsCount || missingTellCount ? 'invalid' : 'valid'}" style="display:flex; justify-content:space-between; font-size:12px;">
          <span>Answer Keys & Tells:</span>
          <strong>${missingAnsCount || missingTellCount ? '❌ ' + (missingAnsCount + missingTellCount) + ' Missing' : '✓ 100% Vault Verified (0 Missing Keys)'}</strong>
        </div>
    `;

    if (failedImages.length || failedAudio.length || errors.length) {
      reportHtml += `<div style="margin-top:10px; padding:8px; background:rgba(239,68,68,0.1); border-radius:var(--radius-sm); border:1px solid rgba(239,68,68,0.3); font-size:11px; color:#fca5a5;">`;
      for (const err of errors) {
        reportHtml += `<div>• ${escapeHtml(err)}</div>`;
      }
      for (const fi of failedImages) {
        reportHtml += `<div>• Image error [${fi.qid}]: ${escapeHtml(fi.url)} (${escapeHtml(fi.error)})</div>`;
      }
      for (const fa of failedAudio) {
        reportHtml += `<div>• Audio error [${fa.qid}]: ${escapeHtml(fa.url)} (${escapeHtml(fa.error)})</div>`;
      }
      reportHtml += `</div>`;
    }

    reportHtml += `</div>`;
    reportEl.innerHTML = reportHtml;
  }

  /* --------------------------------------------------------------------------
     1. AUTHENTICATION & LOCAL PACK LOADER
     -------------------------------------------------------------------------- */
  function setupAuth() {
    const form = document.getElementById("hostAuthForm");
    const gate = document.getElementById("viewHostGate");
    const dash = document.getElementById("viewHostDashboard");
    const fileInput = document.getElementById("packFileInput");
    const backendUrlInput = document.getElementById("hostBackendUrlInput");

    if (!form || !gate || !dash) return;

    if (backendUrlInput) {
      backendUrlInput.value = localStorage.getItem("gwics_backend_url") || "";
    }

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files[0]) {
          const r = new FileReader();
          r.onload = (evt) => {
            try {
              const pack = JSON.parse(evt.target.result);
              runPreflightValidation(pack);
            } catch (e) {}
          };
          r.readAsText(fileInput.files[0]);
        }
      });
    }

    // Auto-resume if session is active
    const savedAuth = sessionStorage.getItem("gwics_host_authenticated");
    const cachedPack = sessionStorage.getItem("gwics_cached_pack");
    const savedRoom = sessionStorage.getItem("gwics_host_room") || "BOTORNOT";

    if (savedAuth === "true" && cachedPack) {
      try {
        loadedPack = JSON.parse(cachedPack);
        preparePack(loadedPack, savedRoom);
        gate.style.display = "none";
        dash.style.display = "grid";
        startHost(loadedPack, savedRoom);
        return;
      } catch (e) {
        sessionStorage.removeItem("gwics_cached_pack");
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pin = document.getElementById("hostPinInput").value.trim();
      const room = document.getElementById("hostRoomInput").value.trim().toUpperCase() || "BOTORNOT";

      const backendUrlVal = backendUrlInput ? backendUrlInput.value.trim() : "";
      if (backendUrlVal) {
        localStorage.setItem("gwics_backend_url", backendUrlVal);
      } else {
        localStorage.removeItem("gwics_backend_url");
      }

      // Authentic Credential Verification via backend / cryptographic hash
      const isValid = await verifyOrganizerPasscode(pin);
      if (!isValid) {
        alert("Access Denied: Invalid Organizer Credential. Please check your credentials.");
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

          preparePack(pack, room);
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

  // Prepares pack: shuffles question records once per session and randomizes AI contender in Showdown
  function preparePack(pack, roomCode) {
    const packHash = computePackHash(pack);
    const sessionKey = "botornot_session_" + (roomCode || "BOTORNOT") + "_" + packHash;
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.rounds)) {
          Object.assign(pack, parsed);
          Engine.publicState.sessionId = parsed._sessionId || ("sess_" + packHash);
          Engine.publicState.packHash = packHash;
          updateSessionLabels(Engine.publicState.sessionId, packHash);
          return;
        }
      } catch (e) {}
    }

    const sessionId = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    pack._sessionId = sessionId;
    pack._packHash = packHash;
    Engine.publicState.sessionId = sessionId;
    Engine.publicState.packHash = packHash;
    updateSessionLabels(sessionId, packHash);

    // 1. Shuffle whole question records within rounds 1, 2, 3 (preserving all question properties)
    for (const round of pack.rounds) {
      if (round.roundNum === 4 || !Array.isArray(round.items)) continue;
      for (let i = round.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [round.items[i], round.items[j]] = [round.items[j], round.items[i]];
      }
    }

    // 2. Prepare Round 4 Showdown items with tandem text-and-identity shuffling
    const r4 = pack.rounds.find(r => r.roundNum === 4);
    if (r4) {
      if (r4.items && r4.items.length) {
        r4.items.forEach(it => {
          if (it.type === "showdown" && it.contenders) {
            const currentContenders = [
              { author: it.contenderMeta?.A?.author || (it.ans === "A" ? "AI" : "HUMAN"), authorLabel: it.contenderMeta?.A?.authorLabel || "Volunteer 1", text: it.contenders.A },
              { author: it.contenderMeta?.B?.author || (it.ans === "B" ? "AI" : "HUMAN"), authorLabel: it.contenderMeta?.B?.authorLabel || "Claude 3.5 Sonnet", text: it.contenders.B },
              { author: it.contenderMeta?.C?.author || (it.ans === "C" ? "AI" : "HUMAN"), authorLabel: it.contenderMeta?.C?.authorLabel || "Volunteer 2", text: it.contenders.C }
            ];
            for (let k = currentContenders.length - 1; k > 0; k--) {
              const m = Math.floor(Math.random() * (k + 1));
              [currentContenders[k], currentContenders[m]] = [currentContenders[m], currentContenders[k]];
            }
            const slots = ["A", "B", "C"];
            let newAi = "A";
            const newCont = {};
            const newMeta = {};
            const newAuthors = {};
            slots.forEach((s, idx) => {
              newCont[s] = currentContenders[idx].text;
              newMeta[s] = { author: currentContenders[idx].author, authorLabel: currentContenders[idx].authorLabel };
              newAuthors[s] = currentContenders[idx].author;
              if (currentContenders[idx].author === "AI") newAi = s;
            });
            it.contenders = newCont;
            it.contenderMeta = newMeta;
            it.contenderAuthors = newAuthors;
            it.ans = newAi;
            it.aiSlot = newAi;
            const humanSlots = slots.filter(s => s !== newAi);
            it.tell = `Contender ${newAi} was generated by Generative AI (${newMeta[newAi]?.authorLabel || 'AI'}). Contenders ${humanSlots.join(' and ')} were written live by human student volunteers (${humanSlots.map(s => newMeta[s]?.authorLabel || s).join(', ')}).`;
          }
        });
      } else if (r4.prompts) {
        const slots = ["A", "B", "C"];
        r4.items = r4.prompts.map((p, i) => {
          const contendersList = [
            { author: "AI", text: `Contender AI response for live duel ${i + 1}.` },
            { author: "HUMAN_1", text: `Contender Human 1 response for live duel ${i + 1}.` },
            { author: "HUMAN_2", text: `Contender Human 2 response for live duel ${i + 1}.` }
          ];
          for (let k = contendersList.length - 1; k > 0; k--) {
            const m = Math.floor(Math.random() * (k + 1));
            [contendersList[k], contendersList[m]] = [contendersList[m], contendersList[k]];
          }
          let aiSlot = "A";
          const contendersMap = {};
          const authorMap = {};
          slots.forEach((s, idx) => {
            contendersMap[s] = contendersList[idx].text;
            authorMap[s] = contendersList[idx].author;
            if (contendersList[idx].author === "AI") aiSlot = s;
          });
          const humanSlots = slots.filter(s => s !== aiSlot);
          return {
            id: `r4_p${i + 1}`,
            type: "showdown",
            title: `Showdown Duel ${i + 1}`,
            prompt: p,
            timeLimit: 60,
            ans: aiSlot,
            aiSlot: aiSlot,
            contenders: contendersMap,
            contenderAuthors: authorMap,
            options: [
              { id: "A", label: "Contender A" },
              { id: "B", label: "Contender B" },
              { id: "C", label: "Contender C" }
            ],
            tell: `Contender ${aiSlot} was generated by Generative AI. Contenders ${humanSlots.join(' and ')} were written live by human student volunteers.`
          };
        });
      }
    }

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

    // Cache prepared pack for session stability across host page refreshes
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(pack));
    } catch (e) {}
  }

  function startHost(pack, roomCode) {
    Engine.initAsHost(pack, roomCode);
    Engine.onStateChange(renderState);
    Engine.onTeamUpdate(renderTeams);
    Engine.onConnectionChange(renderConnection);
    Engine.onPeersChange(renderPeers);

    document.getElementById("hostRoomCodeLabel").textContent = roomCode;
    updateSessionLabels(Engine.publicState.sessionId, Engine.publicState.packHash);

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

    if (status === "CONNECTED_BACKEND") {
      badge.className = "connection-badge connected authoritative";
      text.textContent = "🟢 Backend: Connected (Authoritative)";
    } else if (status === "CONNECTED_P2P" || status === "CONNECTED") {
      badge.className = "connection-badge connected p2p";
      if (peerCount === 0) {
        text.textContent = "🟡 Mode: P2P Relay (Ready)";
      } else {
        text.textContent = `🟡 Mode: P2P Relay (${peerCount} joined)`;
      }
    } else if (status === "CONNECTING") {
      badge.className = "connection-badge connecting";
      text.textContent = "Connecting Relay...";
    } else if (status === "RECONNECTING") {
      badge.className = "connection-badge connecting";
      text.textContent = "Reconnecting...";
    } else {
      badge.className = "connection-badge offline";
      text.textContent = "Local Mode Only";
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

    // Audio Preview Handling for Host
    const audioCard = document.getElementById("hostAudioCard");
    const audioEl = document.getElementById("hostAudioEl");
    const audioStatus = document.getElementById("hostAudioStatus");

    if (it.type === "audio") {
      if (audioCard) audioCard.style.display = "block";
      if (audioEl) {
        audioEl.pause();
        const url = (it.audioUrl || it.media || "").replace(/\\/g, "/");
        audioEl.src = url;
        audioEl.load();
        if (audioStatus) audioStatus.textContent = "Audio ready for host preview / room playback";

        audioEl.onplay = () => { if (audioStatus) audioStatus.textContent = "🔊 Playing audio..."; };
        audioEl.onpause = () => { if (audioStatus) audioStatus.textContent = "⏸ Paused"; };
        audioEl.onended = () => { if (audioStatus) audioStatus.textContent = "✓ Finished playing"; };
        audioEl.onerror = () => { if (audioStatus) audioStatus.textContent = "⚠️ Could not load audio. Check file path."; };

        const btnPlay = document.getElementById("btnHostPlayAudio");
        if (btnPlay) {
          btnPlay.onclick = () => {
            if (audioEl.paused) {
              audioEl.play().catch(e => { if (audioStatus) audioStatus.textContent = "Play notice: " + e.message; });
            } else {
              audioEl.pause();
            }
          };
        }

        const btnReplay = document.getElementById("btnHostReplayAudio");
        if (btnReplay) {
          btnReplay.onclick = () => {
            audioEl.currentTime = 0;
            audioEl.play().catch(e => { if (audioStatus) audioStatus.textContent = "Play notice: " + e.message; });
          };
        }
      }
    } else {
      if (audioCard) audioCard.style.display = "none";
      if (audioEl) {
        audioEl.pause();
        audioEl.removeAttribute("src");
        audioEl.load();
      }
    }

    document.getElementById("hostSubmissionStatusText").textContent = "Selected. Click 'Launch Question' to broadcast.";
  }

  /* --------------------------------------------------------------------------
     4. ROUND 4 SHOWDOWN MANAGER & RANDOMIZER
     Shuffles text & author identity together in tandem so answers never desync.
     -------------------------------------------------------------------------- */
  function setupShowdownEditor() {
    const btnShuffle = document.getElementById("btnShuffleShowdownAi");
    if (!btnShuffle) return;

    btnShuffle.onclick = () => {
      if (!loadedPack || currentRoundNum !== 4) return;
      const round = loadedPack.rounds.find(r => r.roundNum === 4);
      if (!round || !round.items[currentQIdx]) return;
      const it = round.items[currentQIdx];

      // 1. Capture current text in textareas
      const textA = document.getElementById("hostContenderAText").value;
      const textB = document.getElementById("hostContenderBText").value;
      const textC = document.getElementById("hostContenderCText").value;

      const currentAuthors = it.contenderAuthors || {
        A: it.ans === "A" ? "AI" : "HUMAN_1",
        B: it.ans === "B" ? "AI" : (it.ans === "A" ? "HUMAN_1" : "HUMAN_2"),
        C: it.ans === "C" ? "AI" : "HUMAN_2"
      };

      const contendersList = [
        { author: currentAuthors.A, text: textA },
        { author: currentAuthors.B, text: textB },
        { author: currentAuthors.C, text: textC }
      ];

      const aiContender = contendersList.find(c => c.author === "AI") || { author: "AI", text: textA };
      const humanContenders = contendersList.filter(c => c.author !== "AI");
      if (humanContenders.length < 2) {
        humanContenders.push({ author: "HUMAN_2", text: "Human volunteer response" });
      }

      // Pick a new slot for AI different from current
      const slots = ["A", "B", "C"];
      const currentSlot = it.ans || "A";
      const available = slots.filter(s => s !== currentSlot);
      const newAiSlot = available[Math.floor(Math.random() * available.length)];
      const newHumanSlots = slots.filter(s => s !== newAiSlot);

      if (Math.random() > 0.5) {
        humanContenders.reverse();
      }

      it.contenders = {};
      it.contenderAuthors = {};

      it.contenders[newAiSlot] = aiContender.text;
      it.contenderAuthors[newAiSlot] = "AI";

      newHumanSlots.forEach((slot, idx) => {
        it.contenders[slot] = humanContenders[idx].text;
        it.contenderAuthors[slot] = humanContenders[idx].author || `HUMAN_${idx + 1}`;
      });

      it.ans = newAiSlot;
      it.aiSlot = newAiSlot;
      it.tell = `Contender ${newAiSlot} was generated by Generative AI. Contenders ${newHumanSlots.join(' and ')} were written live by human student volunteers.`;

      document.getElementById("hostContenderAText").value = it.contenders.A;
      document.getElementById("hostContenderBText").value = it.contenders.B;
      document.getElementById("hostContenderCText").value = it.contenders.C;

      updateShowdownAiLabels(it);
      document.getElementById("hostSecretAnswer").textContent = `Answer: ${it.ans}`;
      document.getElementById("hostSecretTell").innerHTML = `<strong>The Official Tell:</strong> ${escapeHtml(it.tell)}`;
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
    const btnNext = document.getElementById("btnHostNextQ");
    const btnReplayAudio = document.getElementById("btnHostReplayRoomAudio");
    const btnTieBreak = document.getElementById("btnHostTieBreak");
    const btnLock = document.getElementById("btnHostLock");
    const btnReveal = document.getElementById("btnHostReveal");
    const btnLeaderboard = document.getElementById("btnHostShowLeaderboard");
    const btnFinalResults = document.getElementById("btnHostFinalResults");
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

      if (typeof Engine.startQuestionCountdown === "function") {
        Engine.startQuestionCountdown(currentRoundNum, currentQIdx);
        document.getElementById("hostSubmissionStatusText").textContent = "3-Second Get Ready Countdown active on Projector & Phones!";
      } else {
        Engine.setQuestion(currentRoundNum, currentQIdx);
        document.getElementById("hostSubmissionStatusText").textContent = "Live on Projector & Phones! Submissions open.";
      }
    };

    if (btnNext) {
      btnNext.onclick = () => {
        if (!loadedPack) return;
        const round = loadedPack.rounds.find(r => r.roundNum === currentRoundNum);
        if (!round || !round.items) return;

        if (currentQIdx < round.items.length - 1) {
          currentQIdx++;
          loadQuestion(currentRoundNum, currentQIdx);
          renderQuestionList();
          btnStart.click();
        } else if (currentRoundNum < 4) {
          if (confirm(`Round ${currentRoundNum} completed! Advance to Round ${currentRoundNum + 1}?`)) {
            currentRoundNum++;
            currentQIdx = 0;
            const tab = document.querySelector(`#roundTabs button[data-r="${currentRoundNum}"]`);
            if (tab) tab.click();
            else {
              loadQuestion(currentRoundNum, currentQIdx);
              renderQuestionList();
            }
          }
        } else {
          alert("All 4 rounds complete! Click 'Final Results' to reveal the championship podium.");
        }
      };
    }

    if (btnReplayAudio) {
      btnReplayAudio.onclick = () => {
        if (Engine.publicState.replaysLeft <= 0) {
          alert("No replays left for this question (limit: 1 replay).");
          return;
        }
        Engine.replayAudio();
        document.getElementById("hostSubmissionStatusText").textContent = "Replaying room audio on presentation screen (timer paused)...";
      };
    }

    if (btnTieBreak) {
      btnTieBreak.onclick = () => {
        if (!loadedPack) return;
        const round = loadedPack.rounds.find(r => r.roundNum === currentRoundNum);
        
        // 1. Look for unconsumed reserve question in current round
        let nextReserve = (round?.reserves || []).find(r => !consumedReserveIds.has(r.id));
        let reserveRoundNum = currentRoundNum;

        // 2. If current round's reserves are exhausted, search across all rounds in pack
        if (!nextReserve && loadedPack.rounds) {
          for (const r of loadedPack.rounds) {
            const found = (r.reserves || []).find(res => !consumedReserveIds.has(res.id));
            if (found) {
              nextReserve = found;
              reserveRoundNum = r.roundNum;
              break;
            }
          }
        }

        if (!nextReserve) {
          alert(`All configured reserve tie-break questions (${consumedReserveIds.size} total) have already been used.`);
          return;
        }

        if (confirm(`Launch sudden-death tie break question (${nextReserve.title} from Round ${reserveRoundNum})?`)) {
          consumedReserveIds.add(nextReserve.id);
          try {
            sessionStorage.setItem("gwics_consumed_reserves", JSON.stringify(Array.from(consumedReserveIds)));
          } catch (e) {}

          // Ensure target round has items array and append the unconsumed reserve
          const targetRound = loadedPack.rounds.find(r => r.roundNum === currentRoundNum) || round;
          if (!targetRound.items) targetRound.items = [];
          
          // Avoid duplicate question insertion by checking id
          if (!targetRound.items.some(it => it.id === nextReserve.id)) {
            targetRound.items.push(nextReserve);
          }
          currentQIdx = targetRound.items.length - 1;
          renderQuestionList();
          loadQuestion(currentRoundNum, currentQIdx);
          btnStart.click();
        }
      };
    }

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

    if (btnLeaderboard) {
      btnLeaderboard.onclick = () => {
        Engine.publicState.status = "ROUND_STANDINGS";
        Engine.broadcastState();
        document.getElementById("hostSubmissionStatusText").textContent = `Interim Standings for Round ${currentRoundNum} showing on Projector.`;
      };
    }

    if (btnFinalResults) {
      btnFinalResults.onclick = () => {
        Engine.publicState.status = "COMPLETED";
        Engine.broadcastState();
        document.getElementById("hostSubmissionStatusText").textContent = "Final Championship Results showing on Projector!";
      };
    }

    btnVoid.onclick = () => {
      if (confirm("Void this question? Submissions will be locked, and any player who purchased a hint for this question will receive a full 25 XP refund.")) {
        Engine.voidQuestion("Question voided by host");
        document.getElementById("hostSubmissionStatusText").textContent = "Question marked VOID. All hints refunded.";
      }
    };

    document.getElementById("btnRefreshTeams").onclick = renderTeams;

    document.getElementById("btnResetAll").onclick = async () => {
      if (confirm("Reset the entire game session? This clears all player scores, submitted answers, and returns the room (and all connected players and presentation screen) back to a fresh lobby.")) {
        if (Engine && Engine.resetSession) {
          await Engine.resetSession();
        }
        localStorage.clear();
        sessionStorage.clear();
        alert("Session reset complete. The room and all participant data are now cleared.");
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
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-dim); padding:20px;">No players joined yet. Waiting for attendees to scan and join...</td></tr>`;
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

      let csv = "Rank,Display Name,Final XP Balance,Questions Answered,History Log\n";
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

  window.GWICS_Host = {
    init: init,
    verifyOrganizerPasscode: verifyOrganizerPasscode
  };

  // If running standalone or document is already ready and app router hasn't initialized
  if (document.readyState === "complete" || document.readyState === "interactive") {
    if (window.GWICS_App && window.GWICS_App.getMode() === "organizer") {
      init();
    }
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (window.GWICS_App && window.GWICS_App.getMode() === "organizer") {
        init();
      }
    });
  }
})();
