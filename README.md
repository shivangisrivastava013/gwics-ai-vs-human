# BOT OR NOT? · GWiCS Collegiate Tech Showdown

Official live multi-device competition platform for **BOT OR NOT? The Ultimate Showdown** hosted by the **Graduate Women in Computing Society (GWiCS)** at NJIT.

---

## 🏛️ Architecture: One Consolidated App with Three Role-Based Modes

The application runs entirely from a single unified entry URL (`https://shivangisrivastava013.github.io/gwics-ai-vs-human/`):

| Mode | Entry Route | Who Uses It | What Appears |
| :--- | :--- | :--- | :--- |
| **📱 Player** | Default entry (`/` or `?mode=player`) | Attendees on their phones | Clean "Join Game" screen with Game PIN and display name, active questions, zoomable media, answer buttons, 25 XP paid hints with modal confirmation, locked submissions, revealed verdicts, personal XP and rank. Reconnects and persists across phone refreshes. |
| **🔐 Organizer** | Click "Organizer Access" or `?mode=organizer` | Event Organizer (Laptop) | Secure authentication gate (backend / cryptographic verification), private `competition_pack.json` loader from local vault, question launcher, secret answer key & forensic tells, pause/resume timers, lock submissions, manual XP adjustments, neutral audio check, void question (with hint refunds), and CSV export. Includes "📺 Present ↗" button to launch presentation stage in a new window. |
| **📽️ Presentation** | Launched via Host "Present" button or `?mode=presentation&room=BOTORNOT` | Main Hall Projector Display (16:9) | Viewport-height-constrained stage with giant room code, join URL, current question & media, countdown timer, live submitted count, grand reveal verdict, animated leaderboard, and designated room audio player. Receives public game state only with zero host controls or answer keys. |

> **Backward Compatibility:** Visiting `host.html` or `projector.html` automatically and instantly redirects to the corresponding consolidated application view (`index.html?mode=organizer` and `index.html?mode=presentation`).

---

## 🔒 Zero-Leak Security & Organizer Vault

* **Secure Organizer Authentication:** The organizer signs in with their organizer credential. Authentication is verified via backend (Firebase Auth when configured) or a salted cryptographic one-way SHA-256 hash digest. **No plaintext password exists in downloadable client code.**
* **Public GitHub Pages Static Safety:** GitHub Pages hosts only public static assets. **No confidential answer keys, tells, or organizer download packs are committed to the public GitHub repository.**
* **Local Pack Loader:** The organizer keeps `local_organizer_vault/competition_pack.json` locally on their laptop. Upon logging into organizer mode, the organizer selects this file via the secure file picker. The competition pack is parsed locally in browser memory (`FileReader`) and never transmitted across the public internet.
* **Payload Sanitation:** The host engine strips answers (`ans`), explanations (`tell`), and unrevealed questions before broadcasting any state to participants or the presentation screen.
* **URL Parameter Defense:** Passing `?mode=organizer` or `#organizer` acts purely as visual navigation to the login gate. It does not authorize or unlock mission control without valid organizer credentials and the local pack file.
* **Round 4 Live Showdown Privacy:** Contender options are strictly neutral (`Contender A is AI`, `Contender B is AI`, `Contender C is AI`). The host dashboard automatically randomizes which letter represents the AI model for each duel, keeping both the emcee and audience unbiased.

---

## 🌐 Real-time Multi-Device Sync

* **WebRTC Cloud Relay (Zero Configuration):** Uses built-in peer-to-peer WebRTC DataChannels (via PeerJS) with multi-STUN resilience and automatic heartbeat keep-alive pings to prevent cellular or NAT timeouts. Attendees on mobile phones (campus Wi-Fi or cellular) connect directly to the host laptop room (`BOTORNOT`).
* **Live Connection Accuracy:** The host dashboard displays the exact number of active phones connected (`Cloud Sync Active (X phones joined)`), distinguishing true cloud sync from local tab fallbacks.
* **Question-Level Timing:** Each item uses its exact designated duration (120s for Round 4 duels, 60s for tie-breakers, 45s for standard rounds). Timers synchronize via absolute epoch deadlines (`deadline = Date.now() + duration * 1000`). If a participant backgrounds their browser tab or phone sleeps, the timer remains strictly accurate upon wake-up.
* **Private Team Messaging:** When the host scores answers or reveals hints, each team receives only their own private record. Other teams cannot inspect their competitors' choices over the network.
* **Offline / Multi-tab Rehearsal Fallback:** BroadcastChannel & storage events are supported automatically for single-laptop rehearsal.

---

## ⚡ XP & Hint Economy System

* **Starting Balance:** Every team starts with **100 XP** upon joining.
* **Correct Answer:** **+100 XP**
* **Incorrect Answer:** **0 XP**
* **Unlock Forensic Hint:** **−25 XP** (Max 1 hint per question).
  * Prompts with confirmation: *"Spend 25 XP on a hint? Your balance will change from X to Y XP."*
  * Private to that team only.
  * Remains unlocked after page reload.
  * Disabled after submission or when time expires.
* **Question Voiding:** If the host voids a question, any team that bought a hint for that question is automatically refunded **+25 XP**, and points are safely reversed.
* **Persistent Sessions:** Captains receive a private session token saved in `localStorage`. Refreshing or reconnecting preserves team identity, XP balance, unlocked hints, and submitted answers.

---

## 🚀 Deployment Instructions

### 1. Stage and Commit Changes
```powershell
cd C:\Users\SHIVANGI\.gemini\antigravity\scratch\gwics-ai-vs-human-website
git add .
git commit -m "Deploy production multi-device sync, secure organizer vault, and neutral audio check"
git push -u origin main
```

### 2. Live URLs
* **Participant Portal:** `https://shivangisrivastava013.github.io/gwics-ai-vs-human/`
* **Projector Stage:** `https://shivangisrivastava013.github.io/gwics-ai-vs-human/projector.html`
* **Host Dashboard:** `https://shivangisrivastava013.github.io/gwics-ai-vs-human/host.html`
