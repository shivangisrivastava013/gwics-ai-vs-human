# BOT OR NOT? · GWiCS Collegiate Tech Showdown

Official live competition application for **BOT OR NOT? The Ultimate Showdown** hosted by the **Graduate Women in Computing Society (GWiCS)**.

---

## 🏛️ Architecture: The Three Connected Views

| View | Target URL | Who Uses It | What It Shows |
| :--- | :--- | :--- | :--- |
| **📱 Participant View** | [`index.html`](index.html) | Table Team Captains | Playful Robot Checkbox gate, Join session, active question, big answer buttons, 25 XP paid hints, submission confirmation, revealed results. |
| **📽️ Projector Stage** | [`projector.html`](projector.html) | Main Hall Screen (16:9) | Giant room code, current question & media, countdown timer, live submitted count, grand reveal verdict, animated leaderboard. |
| **🔐 Private Host Dashboard** | [`host.html`](host.html) | Event Organizer / Host Laptop | Protected by passcode, question launcher, secret answer key & tells, pause/resume, lock submissions, manual XP adjustments, audio test, CSV export. |

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
* **Persistent Sessions:** Captains receive a private session token saved in `localStorage`. Refreshing or reconnecting preserves team identity, XP balance, unlocked hints, and submitted answers.

---

## 🔑 Host Passcode
* **Default Organizer Passcode:** `GWICS2026!`

---

## 🚀 Pushing to GitHub Pages

1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd C:\Users\SHIVANGI\.gemini\antigravity\scratch\gwics-ai-vs-human-website
   git add .
   git commit -m "Implement 3-view architecture: Participant, Projector, and Host with XP hint system"
   git push -u origin main
   ```
2. Your live URLs:
   * **Participant Portal:** `https://shivangisrivastava013.github.io/gwics-ai-vs-human/`
   * **Projector Stage:** `https://shivangisrivastava013.github.io/gwics-ai-vs-human/projector.html`
   * **Host Dashboard:** `https://shivangisrivastava013.github.io/gwics-ai-vs-human/host.html`
