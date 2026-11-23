/* ==========================================================================
   GWiCS: BOT OR NOT? - Unified Application Router & View Coordinator
   Consolidates Player, Organizer, and Presentation views into a single URL.
   ========================================================================== */

(function () {
  "use strict";

  function clearAllGameStorage() {
    try {
      localStorage.clear();
    } catch (e) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("gwics_") || k.startsWith("botornot_") || k.startsWith("peerjs"))) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
      } catch (err) {}
    }

    try {
      sessionStorage.clear();
    } catch (e) {
      try {
        const skeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith("gwics_") || k.startsWith("botornot_") || k.startsWith("peerjs"))) skeys.push(k);
        }
        skeys.forEach(k => sessionStorage.removeItem(k));
      } catch (err) {}
    }
  }

  function getModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const modeParam = (params.get("mode") || "").toLowerCase().trim();
    const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase().trim();

    if (modeParam === "organizer" || modeParam === "host" || hash === "organizer" || hash === "host") {
      return "organizer";
    }
    if (modeParam === "presentation" || modeParam === "projector" || hash === "presentation" || hash === "projector") {
      return "presentation";
    }
    return "player"; // Default individual player join screen
  }

  function setAppMode(mode) {
    const playerContainer = document.getElementById("appModePlayer");
    const organizerContainer = document.getElementById("appModeOrganizer");
    const presentationContainer = document.getElementById("appModePresentation");
    const drawer = document.getElementById("hostPanelDrawer");
    const toggleBtn = document.getElementById("btnToggleHostDrawer");

    if (!playerContainer || !organizerContainer || !presentationContainer) return;

    if (mode === "presentation") {
      document.body.className = "mode-presentation";
      playerContainer.style.display = "none";
      if (drawer) drawer.classList.remove("open");
      presentationContainer.style.display = "grid";

      if (window.GWICS_Projector && typeof window.GWICS_Projector.init === "function") {
        window.GWICS_Projector.init();
      }
    } else if (mode === "organizer") {
      document.body.className = "mode-player";
      presentationContainer.style.display = "none";
      playerContainer.style.display = "block";
      if (drawer) {
        drawer.classList.add("open");
      }
      if (toggleBtn) toggleBtn.classList.add("active");
      organizerContainer.style.display = "block";

      if (window.GWICS_Participant && typeof window.GWICS_Participant.init === "function") {
        window.GWICS_Participant.init();
      }
      if (window.GWICS_Host && typeof window.GWICS_Host.init === "function") {
        window.GWICS_Host.init();
      }
    } else {
      document.body.className = "mode-player";
      presentationContainer.style.display = "none";
      playerContainer.style.display = "block";
      if (drawer) {
        drawer.classList.remove("open");
      }
      if (toggleBtn) toggleBtn.classList.remove("active");

      if (window.GWICS_Participant && typeof window.GWICS_Participant.init === "function") {
        window.GWICS_Participant.init();
      }
      if (window.GWICS_Host && typeof window.GWICS_Host.init === "function") {
        window.GWICS_Host.init();
      }
    }
  }

  function switchMode(newMode, extraParams = {}) {
    const params = new URLSearchParams(window.location.search);
    if (newMode === "player") {
      params.delete("mode");
    } else {
      params.set("mode", newMode);
    }
    for (const k in extraParams) {
      if (extraParams[k] !== undefined && extraParams[k] !== null) {
        params.set(k, extraParams[k]);
      }
    }
    const query = params.toString();
    const newUrl = window.location.pathname + (query ? "?" + query : "");
    window.history.pushState({ mode: newMode }, "", newUrl);
    setAppMode(newMode);
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || "").toLowerCase();

    // Reset URL trigger: ?reset=true, ?reset=1, ?clear=1, ?clear=true, #reset, #clear
    const isReset = params.get("reset") === "1" || params.get("reset") === "true" ||
                    params.get("clear") === "1" || params.get("clear") === "true" ||
                    hash === "#reset" || hash === "#clear";
    if (isReset) {
      clearAllGameStorage();
      params.delete("reset");
      params.delete("clear");
      const cleanQuery = params.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? "?" + cleanQuery : "");
      window.history.replaceState({}, "", cleanUrl);
    }

    const currentMode = getModeFromUrl();
    setAppMode(currentMode);

    window.addEventListener("popstate", () => {
      setAppMode(getModeFromUrl());
    });
    window.addEventListener("hashchange", () => {
      setAppMode(getModeFromUrl());
    });
  }

  window.GWICS_App = {
    getMode: getModeFromUrl,
    setMode: setAppMode,
    switchMode: switchMode,
    resetGame: clearAllGameStorage,
    init: init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
