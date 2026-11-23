# BOT OR NOT? · GWiCS Collegiate Tech Showdown

Official live multi-device competition platform for **BOT OR NOT? The Ultimate Showdown** hosted by the **Graduate Women in Computing Society (GWiCS)** at NJIT.

---

## 🏛️ Architecture: The Three Connected Views

| View | Target URL | Who Uses It | What It Shows |
| :--- | :--- | :--- | :--- |
| **📱 Participant View** | [`index.html`](index.html) | Table Team Captains (Mobile) | Playful Robot Checkbox gate, Join session, active question, high-res zoomable media, answer buttons, 25 XP paid hints with modal confirmation, submission locking ("Waiting for host"), revealed verdicts, and score history. |
| **📽️ Projector Stage** | [`projector.html`](projector.html) | Main Hall Screen (16:9) | Giant room code, current question & media, countdown timer, live submitted count, grand reveal verdict, animated leaderboard. Zero host controls or answer keys. |
| **🔐 Private Host Dashboard** | [`host.html`](host.html) | Event Organizer (Laptop Only) | Passcode protected, local pack file loader, question launcher, secret answer key & forensic tells, pause/resume, lock submissions, manual XP adjustments, neutral audio check, void question (with hint refunds), and CSV export. |

---

## 🔒 Zero-Leak Security & Organizer Vault

* **Public GitHub Pages Static Safety:** GitHub Pages hosts only public static assets. **No confidential answer keys, tells, or organizer download packs are committed to the public GitHub repository.**
* **Local Pack Loader:** The organizer keeps `local_organizer_vault/competition_pack.json` locally on their laptop. Upon logging into `host.html`, the organizer selects this file via the secure file picker. The competition pack is parsed locally in browser memory (`FileReader`) and never transmitted across the public internet.
* **Payload Sanitation:** The host engine strips answers (`ans`) and explanations (`tell`) before broadcasting any active question to participants or projector.

---

## 🌐 Real-time Multi-Device Sync

* **WebRTC Cloud Relay (Zero Configuration):** Uses built-in peer-to-peer WebRTC DataChannels (via PeerJS). Attendees on mobile phones (campus Wi-Fi or cellular) connect directly to the host laptop room (`BOTORNOT`).
* **Absolute Timestamp Deadlines:** Timers synchronize via absolute epoch deadlines (`deadline = Date.now() + duration * 1000`). If a participant backgrounds their browser tab or phone sleeps, the timer remains strictly accurate upon wake-up.
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
