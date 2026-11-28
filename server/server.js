/**
 * GWiCS BOT OR NOT? - Authoritative Backend Server
 * 
 * Provides:
 * 1. Authoritative organizer token-based authentication (POST /api/host/login)
 * 2. Secure server-side private pack and answer storage (never leaked to clients)
 * 3. Authoritative server-side answer validation and grading
 * 4. Authoritative XP economy and hint purchase management with refund support
 * 5. Synchronized state broadcasting via Server-Sent Events (SSE) and HTTP REST
 * 6. Session ID and pack-hash versioning to prevent stale restores
 * 7. Showdown text-and-identity shuffling in tandem
 * 8. Static file serving for standalone deployment
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const AUTH_SALT = "GWICS_SALT_2026_";
const EXPECTED_CREDENTIAL_DIGEST = "917f58c089fadb57c940a4ffd93b7f890bfc409483aa458592b1cc16744c205f";
const STATIC_DIR = path.resolve(__dirname, "..");

function verifyOrganizerSecret(secret) {
  if (!secret) return false;
  if (process.env.ORGANIZER_SECRET && secret === process.env.ORGANIZER_SECRET) {
    return true;
  }
  const hash = crypto.createHash("sha256").update(AUTH_SALT + secret).digest("hex");
  return hash === EXPECTED_CREDENTIAL_DIGEST;
}

// Server State
let currentSessionId = null;
let currentPackHash = null;
let privatePack = null;
let activeHostToken = null;

let publicState = {
  roomCode: "BOTORNOT",
  sessionId: null,
  packVersion: null,
  status: "LOBBY", // LOBBY, QUESTION, LOCKED, VOIDED, REVEALED, ROUND_STANDINGS, COMPLETED
  roundNum: 1,
  questionIndex: 0,
  totalQuestions: 25,
  currentQuestion: null,
  releasedAnswer: null,
  releasedTell: null,
  releasedSource: null,
  voidReason: null,
  timer: {
    total: 45,
    deadline: 0,
    remaining: 45,
    running: false
  },
  submittedCount: 0,
  totalTeams: 0,
  leaderboard: [],
  updatedAt: Date.now()
};

let players = {}; // playerId -> { id, name, xp, answers: { qid: choice }, unlockedHints: { qid: hint }, history: [] }
let timerInterval = null;
const sseClients = new Set();

function broadcast() {
  publicState.totalTeams = Object.keys(players).length;
  publicState.leaderboard = calculateLeaderboard();
  publicState.updatedAt = Date.now();

  const data = JSON.stringify({ type: "STATE_SYNC", state: publicState });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

function calculateDistribution() {
  const q = publicState.currentQuestion;
  if (!q) return null;
  const counts = {};
  let totalVotes = 0;
  (q.options || []).forEach(opt => { counts[opt.id] = 0; });

  for (const p of Object.values(players)) {
    const choice = p.answers?.[q.id];
    if (choice) {
      if (counts[choice] !== undefined) {
        counts[choice]++;
      } else {
        counts[choice] = 1;
      }
      totalVotes++;
    }
  }

  const dist = {};
  for (const optId in counts) {
    const cnt = counts[optId];
    const pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
    dist[optId] = { count: cnt, percent: pct };
  }
  return { totalVotes, dist };
}

function calculateLeaderboard() {
  return Object.values(players)
    .map(p => ({
      id: p.id,
      name: p.name,
      xp: p.xp,
      submittedCount: Object.keys(p.answers || {}).length
    }))
    .sort((a, b) => b.xp - a.xp);
}

function verifyHostToken(req) {
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  return activeHostToken && token === activeHostToken;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function computePackHash(pack) {
  const content = JSON.stringify(pack.rounds || pack);
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function preparePack(pack) {
  // 1. Shuffle whole records within rounds 1, 2, 3
  for (const round of pack.rounds || []) {
    if (round.roundNum === 4 || !Array.isArray(round.items)) continue;
    shuffle(round.items);
  }

  // 2. Prepare Round 4 Showdown items with synchronized text-and-identity shuffling
  const r4 = (pack.rounds || []).find(r => r.roundNum === 4);
  if (r4 && (!r4.items || !r4.items.length) && r4.prompts) {
    r4.items = r4.prompts.map((p, i) => {
      // Create initial 3 contenders with author identity and starter text
      const contendersList = [
        { author: "AI", text: `[AI Model response for duel ${i + 1}]` },
        { author: "HUMAN_1", text: `[Student Volunteer 1 response for duel ${i + 1}]` },
        { author: "HUMAN_2", text: `[Student Volunteer 2 response for duel ${i + 1}]` }
      ];

      // Shuffle contenders together
      shuffle(contendersList);

      const slots = ["A", "B", "C"];
      let aiSlot = "A";
      const contendersMap = {};

      slots.forEach((slot, idx) => {
        contendersMap[slot] = contendersList[idx].text;
        if (contendersList[idx].author === "AI") {
          aiSlot = slot;
        }
      });

      const humanSlots = slots.filter(s => s !== aiSlot);

      return {
        id: `r4_p${i + 1}`,
        type: "showdown",
        title: `Showdown Duel ${i + 1}`,
        prompt: p,
        timeLimit: 120,
        ans: aiSlot,
        aiSlot: aiSlot,
        contenders: contendersMap,
        options: [
          { id: "A", label: "Contender A is AI" },
          { id: "B", label: "Contender B is AI" },
          { id: "C", label: "Contender C is AI" }
        ],
        tell: `Contender ${aiSlot} was generated by Generative AI. Contenders ${humanSlots.join(" and ")} were written live by human student volunteers.`
      };
    });
  }
}

// Request Handler
function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. SSE Stream
  if (pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    res.write(`data: ${JSON.stringify({ type: "STATE_SYNC", state: publicState })}\n\n`);
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // 2. Health & Status
  if (pathname === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      backend: "authoritative_node",
      sessionId: currentSessionId,
      packLoaded: Boolean(privatePack),
      totalPlayers: Object.keys(players).length
    }));
    return;
  }

  // 3. Current State
  if (pathname === "/api/state" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(publicState));
    return;
  }

  // Helper to read JSON body
  function readJson(cb) {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        cb(null, parsed);
      } catch (err) {
        cb(err);
      }
    });
  }

  // 3b. Reset All Game Data (Cross-Device Wipe)
  if (pathname === "/api/reset" && (req.method === "POST" || req.method === "GET")) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    publicState.status = "LOBBY";
    publicState.roundNum = 1;
    publicState.questionIndex = 0;
    publicState.currentQuestion = null;
    publicState.releasedAnswer = null;
    publicState.releasedTell = null;
    publicState.releasedSource = null;
    publicState.submittedCount = 0;
    players = {};
    broadcast();

    const resetData = JSON.stringify({ type: "SESSION_RESET", state: publicState });
    for (const client of sseClients) {
      try {
        client.write(`data: ${resetData}\n\n`);
      } catch (e) {
        sseClients.delete(client);
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, message: "All game history and participant data wiped." }));
    return;
  }

  // 4. Host Login
  if (pathname === "/api/host/login" && req.method === "POST") {
    readJson((err, body) => {
      if (err || !body.passcode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing passcode" }));
        return;
      }
      if (!verifyOrganizerSecret(body.passcode)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid organizer credentials" }));
        return;
      }

      activeHostToken = generateToken();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        token: activeHostToken,
        sessionId: currentSessionId
      }));
    });
    return;
  }

  // 5. Host Upload Pack
  if (pathname === "/api/host/pack" && req.method === "POST") {
    if (!verifyHostToken(req)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    readJson((err, body) => {
      if (err || !body.pack || !Array.isArray(body.pack.rounds)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid pack structure" }));
        return;
      }

      const pack = body.pack;
      const packHash = computePackHash(pack);
      const sessionId = `session_${Date.now()}_${packHash.slice(0, 8)}`;

      preparePack(pack);
      privatePack = pack;
      currentSessionId = sessionId;
      currentPackHash = packHash;

      // Reset game state for new session
      publicState.sessionId = sessionId;
      publicState.packVersion = packHash;
      publicState.status = "LOBBY";
      publicState.roundNum = 1;
      publicState.questionIndex = 0;
      publicState.currentQuestion = null;
      publicState.releasedAnswer = null;
      publicState.releasedTell = null;
      publicState.releasedSource = null;
      publicState.submittedCount = 0;
      players = {};

      broadcast();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        sessionId: sessionId,
        packHash: packHash,
        packVersion: packHash,
        roundsCount: pack.rounds.length
      }));
    });
    return;
  }

  // 6. Host Actions
  if (pathname === "/api/host/action" && req.method === "POST") {
    if (!verifyHostToken(req)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    readJson((err, body) => {
      if (err || !body.action) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing action" }));
        return;
      }

      const action = body.action;

      if (action === "START_COUNTDOWN") {
        const roundNum = body.roundNum || publicState.roundNum;
        const qIdx = body.questionIndex !== undefined ? body.questionIndex : publicState.questionIndex;
        const round = (privatePack?.rounds || []).find(r => r.roundNum === roundNum);
        if (!round || !round.items || !round.items[qIdx]) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Question not found in pack" }));
          return;
        }

        if (timerInterval) clearInterval(timerInterval);
        publicState.status = "COUNTDOWN";
        publicState.roundNum = roundNum;
        publicState.roundTitle = round.title || round.name || `Round ${roundNum}`;
        publicState.questionIndex = qIdx;
        publicState.countdown = 3;
        broadcast();

        let count = 3;
        timerInterval = setInterval(() => {
          count--;
          publicState.countdown = count;
          if (count <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            // Launch question automatically
            launchQuestion(roundNum, qIdx);
          } else {
            broadcast();
          }
        }, 1000);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, status: "COUNTDOWN" }));
        return;
      }

      function launchQuestion(roundNum, qIdx) {
        const round = (privatePack?.rounds || []).find(r => r.roundNum === roundNum);
        if (!round || !round.items || !round.items[qIdx]) return;
        const fullItem = round.items[qIdx];
        const timeLimit = fullItem.timeLimit || round.timeLimit || 45;
        const isAudio = fullItem.type === "audio";
        const listenFirst = Boolean(fullItem.listenFirst || round.listenFirst);

        publicState.status = "QUESTION";
        publicState.roundNum = roundNum;
        publicState.roundTitle = round.title || round.name;
        publicState.questionIndex = qIdx;
        publicState.releasedAnswer = null;
        publicState.releasedTell = null;
        publicState.releasedSource = null;
        publicState.voidReason = null;
        publicState.distribution = null;
        publicState.audioPlaying = isAudio && listenFirst;
        publicState.replaysLeft = isAudio ? 1 : 0;
        publicState.submittedCount = 0;

        publicState.currentQuestion = {
          id: fullItem.id,
          roundNum: roundNum,
          roundName: round.title || round.name,
          title: fullItem.title,
          prompt: fullItem.prompt,
          type: fullItem.type,
          media: fullItem.media,
          audioUrl: fullItem.audioUrl,
          transcript: fullItem.transcript,
          passageA: fullItem.passageA,
          passageB: fullItem.passageB,
          contenders: fullItem.contenders,
          options: fullItem.options,
          timeLimit: timeLimit,
          listenFirst: listenFirst,
          hintAvailable: Boolean(fullItem.hint),
          hintCost: 25
        };

        publicState.timer = {
          total: timeLimit,
          deadline: Date.now() + timeLimit * 1000,
          remaining: timeLimit,
          running: !(isAudio && listenFirst)
        };

        if (timerInterval) clearInterval(timerInterval);
        if (publicState.timer.running) {
          timerInterval = setInterval(() => {
            if (!publicState.timer.running) return;
            const left = Math.max(0, Math.round((publicState.timer.deadline - Date.now()) / 1000));
            publicState.timer.remaining = left;
            if (left <= 0) {
              publicState.timer.running = false;
              publicState.status = "LOCKED";
              publicState.distribution = calculateDistribution();
              clearInterval(timerInterval);
              timerInterval = null;
            }
            broadcast();
          }, 1000);
        }

        broadcast();
      }

      if (action === "SET_QUESTION") {
        const roundNum = body.roundNum || publicState.roundNum;
        const qIdx = body.questionIndex !== undefined ? body.questionIndex : publicState.questionIndex;

        const round = (privatePack?.rounds || []).find(r => r.roundNum === roundNum);
        if (!round || !round.items || !round.items[qIdx]) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Question not found in pack" }));
          return;
        }

        launchQuestion(roundNum, qIdx);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, questionId: round.items[qIdx].id }));
        return;
      }

      if (action === "AUDIO_FINISHED") {
        if (publicState.audioPlaying) {
          publicState.audioPlaying = false;
          const timeLimit = publicState.timer.total || 20;
          publicState.timer.remaining = timeLimit;
          publicState.timer.deadline = Date.now() + timeLimit * 1000;
          publicState.timer.running = true;

          if (timerInterval) clearInterval(timerInterval);
          timerInterval = setInterval(() => {
            if (!publicState.timer.running) return;
            const left = Math.max(0, Math.round((publicState.timer.deadline - Date.now()) / 1000));
            publicState.timer.remaining = left;
            if (left <= 0) {
              publicState.timer.running = false;
              publicState.status = "LOCKED";
              publicState.distribution = calculateDistribution();
              clearInterval(timerInterval);
              timerInterval = null;
            }
            broadcast();
          }, 1000);

          broadcast();
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, audioPlaying: false }));
        return;
      }

      if (action === "REPLAY_AUDIO") {
        if (publicState.replaysLeft > 0) {
          publicState.replaysLeft--;
          publicState.audioPlaying = true;
          publicState.timer.running = false;
          if (timerInterval) clearInterval(timerInterval);
          broadcast();
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, replaysLeft: publicState.replaysLeft }));
        return;
      }

      if (action === "PAUSE_TIMER") {
        publicState.timer.running = !publicState.timer.running;
        if (publicState.timer.running) {
          publicState.timer.deadline = Date.now() + publicState.timer.remaining * 1000;
        }
        broadcast();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, running: publicState.timer.running }));
        return;
      }

      if (action === "LOCK_SUBMISSIONS") {
        publicState.status = "LOCKED";
        publicState.timer.running = false;
        publicState.distribution = calculateDistribution();
        if (timerInterval) clearInterval(timerInterval);
        broadcast();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, distribution: publicState.distribution }));
        return;
      }

      if (action === "REVEAL_ANSWER") {
        const round = (privatePack?.rounds || []).find(r => r.roundNum === publicState.roundNum);
        const item = round?.items?.[publicState.questionIndex];
        if (!item) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No active question to reveal" }));
          return;
        }

        publicState.status = "REVEALED";
        publicState.timer.running = false;
        if (timerInterval) clearInterval(timerInterval);

        publicState.releasedAnswer = item.ans;
        publicState.releasedTell = item.tell;
        publicState.releasedSource = item.source || "Official Answer Key";

        // Authoritative Server-side Grading
        for (const p of Object.values(players)) {
          const userChoice = p.answers[item.id];
          if (userChoice && !p.gradedQuestions?.[item.id]) {
            if (!p.gradedQuestions) p.gradedQuestions = {};
            p.gradedQuestions[item.id] = true;

            const isCorrect = userChoice === item.ans;
            const delta = isCorrect ? 100 : 0;
            p.xp += delta;
            p.history.push({
              qid: item.id,
              desc: `${item.title}: Answered ${userChoice} (${isCorrect ? "Correct" : "Incorrect"})`,
              delta: delta,
              balanceAfter: p.xp
            });
          }
        }

        broadcast();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, releasedAnswer: item.ans, releasedTell: item.tell }));
        return;
      }

      if (action === "ROUND_STANDINGS") {
        publicState.status = "ROUND_STANDINGS";
        broadcast();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (action === "END_GAME") {
        publicState.status = "COMPLETED";
        broadcast();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (action === "VOID_QUESTION") {
        const qid = publicState.currentQuestion?.id;
        publicState.status = "VOIDED";
        publicState.timer.running = false;
        publicState.voidReason = body.reason || "Voided by host";

        // Authoritatively refund hint XP
        if (qid) {
          for (const p of Object.values(players)) {
            if (p.unlockedHints?.[qid]) {
              delete p.unlockedHints[qid];
              p.xp += 25;
              p.history.push({
                qid: qid,
                desc: `Refund for voided question hint: ${qid}`,
                delta: 25,
                balanceAfter: p.xp
              });
            }
          }
        }

        broadcast();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (action === "SHUFFLE_SHOWDOWN") {
        // Synchronized Text and Identity Shuffle
        const r4 = (privatePack?.rounds || []).find(r => r.roundNum === 4);
        const item = r4?.items?.[publicState.questionIndex];
        if (!item) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Showdown duel not found" }));
          return;
        }

        // Current text and identities
        const currentContenders = [
          { author: item.ans === "A" ? "AI" : "HUMAN_1", text: item.contenders.A },
          { author: item.ans === "B" ? "AI" : (item.ans === "A" ? "HUMAN_1" : "HUMAN_2"), text: item.contenders.B },
          { author: item.ans === "C" ? "AI" : "HUMAN_2", text: item.contenders.C }
        ];

        shuffle(currentContenders);

        const slots = ["A", "B", "C"];
        let newAiSlot = "A";
        slots.forEach((s, idx) => {
          item.contenders[s] = currentContenders[idx].text;
          if (currentContenders[idx].author === "AI") {
            newAiSlot = s;
          }
        });

        item.ans = newAiSlot;
        item.aiSlot = newAiSlot;
        const humanSlots = slots.filter(s => s !== newAiSlot);
        item.tell = `Contender ${newAiSlot} was generated by Generative AI. Contenders ${humanSlots.join(" and ")} were written live by human student volunteers.`;

        // Update public state if currently active
        if (publicState.currentQuestion?.id === item.id) {
          publicState.currentQuestion.contenders = item.contenders;
          broadcast();
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, aiSlot: newAiSlot, contenders: item.contenders }));
        return;
      }

      if (action === "RESET_SESSION") {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        publicState.status = "LOBBY";
        publicState.roundNum = 1;
        publicState.questionIndex = 0;
        publicState.currentQuestion = null;
        publicState.releasedAnswer = null;
        publicState.releasedTell = null;
        publicState.releasedSource = null;
        publicState.submittedCount = 0;
        players = {};
        broadcast();

        const resetData = JSON.stringify({ type: "SESSION_RESET", state: publicState });
        for (const client of sseClients) {
          try {
            client.write(`data: ${resetData}\n\n`);
          } catch (e) {
            sseClients.delete(client);
          }
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "All game history and participant data wiped." }));
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
    });
    return;
  }

  // 7. Player Join
  if (pathname === "/api/player/join" && req.method === "POST") {
    readJson((err, body) => {
      const name = (body.name || "").trim().slice(0, 32);
      const id = body.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (!name) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing name" }));
        return;
      }

      if (!players[id]) {
        players[id] = {
          id: id,
          name: name,
          xp: 100,
          answers: {},
          unlockedHints: {},
          history: [{ qid: "join", desc: "Joined game", delta: 100, balanceAfter: 100 }]
        };
      } else {
        players[id].name = name;
      }

      broadcast();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        player: players[id],
        sessionId: currentSessionId
      }));
    });
    return;
  }

  // 8. Player Submit Answer
  if (pathname === "/api/player/submit" && req.method === "POST") {
    readJson((err, body) => {
      const { playerId, questionId, choice } = body;
      const player = players[playerId];
      if (!player) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Player not found" }));
        return;
      }

      if (publicState.status !== "QUESTION") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Submissions are currently closed" }));
        return;
      }

      if (publicState.currentQuestion?.id !== questionId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Question mismatch or inactive" }));
        return;
      }

      // Reject repeat submissions
      if (player.answers[questionId]) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Answer already submitted for this question" }));
        return;
      }

      player.answers[questionId] = choice;
      publicState.submittedCount = Object.values(players).filter(p => Boolean(p.answers[questionId])).length;
      broadcast();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, submitted: true }));
    });
    return;
  }

  // 9. Player Buy Hint
  if (pathname === "/api/player/hint" && req.method === "POST") {
    readJson((err, body) => {
      const { playerId, questionId } = body;
      const player = players[playerId];
      if (!player) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Player not found" }));
        return;
      }

      const round = (privatePack?.rounds || []).find(r => r.roundNum === publicState.roundNum);
      const item = round?.items?.find(it => it.id === questionId);
      if (!item || !item.hint) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Hint not available" }));
        return;
      }

      if (player.unlockedHints[questionId]) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, hint: player.unlockedHints[questionId], alreadyOwned: true }));
        return;
      }

      if (player.xp < 25) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Insufficient XP balance (need 25 XP)" }));
        return;
      }

      player.xp -= 25;
      player.unlockedHints[questionId] = item.hint;
      player.history.push({
        qid: questionId,
        desc: `Unlocked forensic hint for ${item.title}`,
        delta: -25,
        balanceAfter: player.xp
      });

      broadcast();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, hint: item.hint, xp: player.xp }));
    });
    return;
  }

  // Default: static file server
  let filePath = path.join(STATIC_DIR, pathname === "/" ? "index.html" : pathname);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".wav": "audio/wav",
      ".mp3": "audio/mpeg"
    };

    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(handleApi);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`GWiCS BOT OR NOT? Authoritative Backend Server Running`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Organizer Authentication: Salted SHA-256 Digest Active`);
  console.log(`=======================================================`);
});

server.handleApi = handleApi;
module.exports = server;
module.exports.handleApi = handleApi;
module.exports.verifyOrganizerSecret = verifyOrganizerSecret;
