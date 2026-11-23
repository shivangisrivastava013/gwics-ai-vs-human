/* ==========================================================================
   GWiCS: BOT OR NOT? - Unified Application Router & View Coordinator
   Consolidates Player, Organizer, and Presentation views into a single URL.
   ========================================================================== */

(function () {
  "use strict";

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

    if (!playerContainer || !organizerContainer || !presentationContainer) return;

    if (mode === "presentation") {
      document.body.className = "mode-presentation";
      playerContainer.style.display = "none";
      organizerContainer.style.display = "none";
      presentationContainer.style.display = "grid";

      if (window.GWICS_Projector && typeof window.GWICS_Projector.init === "function") {
        window.GWICS_Projector.init();
      }
    } else if (mode === "organizer") {
      document.body.className = "mode-organizer";
      playerContainer.style.display = "none";
      presentationContainer.style.display = "none";
      organizerContainer.style.display = "block";

      if (window.GWICS_Host && typeof window.GWICS_Host.init === "function") {
        window.GWICS_Host.init();
      }
    } else {
      document.body.className = "mode-player";
      organizerContainer.style.display = "none";
      presentationContainer.style.display = "none";
      playerContainer.style.display = "block";

      if (window.GWICS_Participant && typeof window.GWICS_Participant.init === "function") {
        window.GWICS_Participant.init();
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
    init: init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
