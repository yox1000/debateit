const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const database = require("./database");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
const publicDir = __dirname;
const deepSeekApiKey = process.env.DEEPSEEK_API_KEY || "";
const deepSeekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const topicCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "debate-topics.json"), "utf8"));
const topicCatalogVersion = crypto.createHash("sha1").update(JSON.stringify(topicCatalog)).digest("hex").slice(0, 12);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
}

function createMockProfile({ selectedTopics = [], debateBio = "" }) {
  const text = `${selectedTopics.join(" ")} ${debateBio}`.toLowerCase();
  const keywordMap = [
    ["Technology", ["ai", "algorithm", "tech", "social media", "phone", "internet", "data"]],
    ["Politics", ["policy", "government", "election", "law", "regulation", "rights", "tax"]],
    ["Ethics", ["moral", "ethic", "fair", "justice", "bias", "harm", "responsible"]],
    ["Science", ["science", "climate", "health", "research", "space", "biology", "energy"]],
    ["Culture", ["culture", "media", "school", "education", "art", "identity", "society"]],
    ["Business", ["business", "market", "startup", "money", "company", "labor", "work"]],
    ["History", ["history", "war", "empire", "revolution", "past", "civilization"]],
    ["Sports", ["sports", "league", "athlete", "team", "competition", "game"]],
  ];
  const inferredTopics = keywordMap
    .filter(([topic, words]) => selectedTopics.includes(topic) || words.some((word) => text.includes(word)))
    .map(([topic]) => topic);
  const topics = Array.from(new Set([...selectedTopics, ...inferredTopics])).slice(0, 5);
  const style = text.includes("policy") || text.includes("law") || text.includes("regulation")
    ? "Policy-focused"
    : text.includes("moral") || text.includes("ethic") || text.includes("should")
      ? "Principle-driven"
      : "Exploratory";

  return {
    source: "mock",
    topics: topics.length ? topics : ["Technology", "Ethics"],
    debateStyle: style,
    summary: debateBio
      ? "Interested in debates where clear claims, evidence, and tradeoffs matter."
      : "Open to broad debates across ideas, policy, and culture.",
    suggestedTopics: [
      "Should AI-generated content be labeled everywhere?",
      "Should schools ban smartphones during class?",
      "Is online anonymity good for public debate?",
    ],
    matchingSignals: {
      difficulty: "casual",
      prefers: ["clear time limits", "evidence-based arguments", "civil rebuttals"],
      avoids: [],
    },
  };
}

function scoreTopic(topic, profile = {}) {
  const profileTopics = (profile.topics || []).map((topicName) => topicName.toLowerCase());
  const preferredText = [
    profile.debateStyle || "",
    profile.summary || "",
    ...(profile.matchingSignals?.prefers || []),
  ]
    .join(" ")
    .toLowerCase();
  const avoidText = (profile.matchingSignals?.avoids || []).join(" ").toLowerCase();
  const topicText = [topic.title, topic.category, ...(topic.tags || [])].join(" ").toLowerCase();
  let score = 35;

  if (profileTopics.includes(topic.category.toLowerCase())) {
    score += 30;
  }

  (topic.tags || []).forEach((tag) => {
    if (profileTopics.includes(tag.toLowerCase())) {
      score += 16;
    }

    if (preferredText.includes(tag.toLowerCase())) {
      score += 10;
    }
  });

  profileTopics.forEach((topicName) => {
    if (topicText.includes(topicName)) {
      score += 8;
    }
  });

  if (avoidText && topicText.split(/\W+/).some((word) => word.length > 3 && avoidText.includes(word))) {
    score -= 20;
  }

  return Math.max(1, Math.min(99, score));
}

function createMockMatches(profile = {}, limit = 8) {
  const matches = topicCatalog
    .map((topic) => ({
      topicId: topic.id,
      title: topic.title,
      category: topic.category,
      score: scoreTopic(topic, profile),
      reason: `Matches ${topic.category} interest signals and related tags: ${(topic.tags || []).slice(0, 3).join(", ")}.`,
      stancePrompt: "Choose the side you can argue most clearly, then prepare one opening claim and one rebuttal.",
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return {
    source: "mock",
    catalogVersion: topicCatalogVersion,
    matches,
  };
}

function parseJsonContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function createDeepSeekProfile(payload) {
  if (!deepSeekApiKey) {
    return createMockProfile(payload);
  }

  const apiResponse = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepSeekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: deepSeekModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You create compact debate-matching profiles. Respond only with valid JSON using these keys: source, topics, debateStyle, summary, suggestedTopics, matchingSignals. matchingSignals must include difficulty, prefers, and avoids.",
        },
        {
          role: "user",
          content: JSON.stringify({
            selectedTopics: payload.selectedTopics || [],
            debateBio: payload.debateBio || "",
          }),
        },
      ],
      temperature: 0.4,
      stream: false,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`DeepSeek request failed: ${apiResponse.status} ${errorText}`);
  }

  const data = await apiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  const profile = parseJsonContent(content);

  if (!profile) {
    throw new Error("DeepSeek returned non-JSON content");
  }

  return {
    ...profile,
    source: "deepseek",
  };
}

async function createDeepSeekMatches(payload) {
  const profile = payload.debateProfile || {};
  const limit = Math.min(Number(payload.limit || 8), 12);

  if (!deepSeekApiKey) {
    return createMockMatches(profile, limit);
  }

  const apiResponse = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepSeekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: deepSeekModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Debate.it's topic matching engine. Rank a candidate topic catalog against a user's debate-matching profile. Use shared categories, tags, style fit, stated preferences, and avoid signals. Prefer topics likely to produce specific, civil, balanced 1v1 debates. Return only valid JSON with keys: source and matches. matches must be an array of exactly the requested limit. Each match must include topicId, title, category, score, reason, and stancePrompt. score must be an integer from 1 to 100. reason must be one concise sentence. stancePrompt must invite the user to choose a side without deciding for them.",
        },
        {
          role: "user",
          content: JSON.stringify({
            requestedLimit: limit,
            debateProfile: profile,
            candidateTopics: topicCatalog,
          }),
        },
      ],
      temperature: 0.25,
      stream: false,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`DeepSeek match request failed: ${apiResponse.status} ${errorText}`);
  }

  const data = await apiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  const result = parseJsonContent(content);

  if (!result?.matches?.length) {
    throw new Error("DeepSeek returned no topic matches");
  }

  return {
    source: "deepseek",
    catalogVersion: topicCatalogVersion,
    matches: result.matches.slice(0, limit),
  };
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });
    response.end(data);
  });
}

const websocketClients = new Set();
const websocketGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function createWebSocketAccept(key) {
  return crypto.createHash("sha1").update(`${key}${websocketGuid}`).digest("base64");
}

function createWebSocketFrame(payload, opcode = 0x1) {
  const body = Buffer.from(payload);
  const length = body.length;
  let header;

  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, body]);
}

function sendWebSocketJson(client, payload) {
  if (client.socket.destroyed) {
    return;
  }

  try {
    client.socket.write(createWebSocketFrame(JSON.stringify(payload)));
  } catch {
    websocketClients.delete(client);
  }
}

function sendWebSocketControl(client, opcode, payload = "") {
  if (!client.socket.destroyed) {
    client.socket.write(createWebSocketFrame(payload, opcode));
  }
}

function broadcastToUsers(userIds, payload) {
  const recipients = new Set(userIds.filter(Boolean));

  websocketClients.forEach((client) => {
    if (recipients.has(client.userId)) {
      sendWebSocketJson(client, payload);
    }
  });
}

function broadcastDebate(debateId, payload) {
  broadcastToUsers(database.listDebateParticipantIds(debateId), payload);
}

function parseWebSocketFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const masked = Boolean(secondByte & 0x80);
    let length = secondByte & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }

      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }

      const longLength = buffer.readBigUInt64BE(offset + 2);

      if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        return { frames, remaining: Buffer.alloc(0), tooLarge: true };
      }

      length = Number(longLength);
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + length;

    if (offset + frameLength > buffer.length) {
      break;
    }

    const payloadStart = offset + headerLength + maskLength;
    const payload = Buffer.from(buffer.subarray(payloadStart, payloadStart + length));

    if (masked) {
      const mask = buffer.subarray(offset + headerLength, offset + headerLength + 4);

      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    frames.push({ opcode, payload });
    offset += frameLength;
  }

  return { frames, remaining: buffer.subarray(offset) };
}

function handleWebSocketMessage(client, rawMessage) {
  let message;

  try {
    message = JSON.parse(rawMessage);
  } catch {
    sendWebSocketJson(client, { type: "error", message: "Invalid WebSocket JSON." });
    return;
  }

  if (message.type === "subscribe") {
    const user = database.getUserById(message.userId);

    if (!user) {
      sendWebSocketJson(client, { type: "error", message: "Unknown user." });
      return;
    }

    client.userId = user.id;
    sendWebSocketJson(client, { type: "connected", userId: user.id });
    return;
  }

  if (message.type === "ping") {
    sendWebSocketJson(client, { type: "pong", at: new Date().toISOString() });
  }
}

function handleWebSocketUpgrade(request, socket) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const key = request.headers["sec-websocket-key"];

  if (!key) {
    socket.destroy();
    return;
  }

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${createWebSocketAccept(key)}`,
      "",
      "",
    ].join("\r\n"),
  );

  const client = {
    socket,
    userId: "",
    buffer: Buffer.alloc(0),
  };

  websocketClients.add(client);

  socket.on("data", (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    const { frames, remaining, tooLarge } = parseWebSocketFrames(client.buffer);
    client.buffer = remaining;

    if (tooLarge) {
      sendWebSocketControl(client, 0x8);
      socket.destroy();
      return;
    }

    frames.forEach((frame) => {
      if (frame.opcode === 0x1) {
        handleWebSocketMessage(client, frame.payload.toString("utf8"));
      } else if (frame.opcode === 0x8) {
        sendWebSocketControl(client, 0x8);
        socket.end();
      } else if (frame.opcode === 0x9) {
        sendWebSocketControl(client, 0xA, frame.payload);
      }
    });
  });

  socket.on("close", () => websocketClients.delete(client));
  socket.on("end", () => websocketClients.delete(client));
  socket.on("error", () => websocketClients.delete(client));
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/db/status") {
    sendJson(response, 200, database.getStatus());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/db/clear-runtime") {
    sendJson(response, 200, database.clearDebateRuntimeData());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/login") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const user = database.getUserByCredentials(payload.email, payload.password);

      if (!user) {
        sendJson(response, 401, { error: "Invalid email or password." });
        return;
      }

      sendJson(response, 200, { user });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/signup") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const user = database.createUser(payload);
      sendJson(response, 201, { user });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const userMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)$/);

  if (request.method === "GET" && userMatch) {
    const user = database.getUserById(userMatch[1]);

    if (!user) {
      sendJson(response, 404, { error: "User not found." });
      return;
    }

    sendJson(response, 200, { user });
    return;
  }

  const profileMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)\/profile$/);

  if (request.method === "PUT" && profileMatch) {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const user = database.updateUserProfile(profileMatch[1], payload);
      sendJson(response, 200, { user });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const debatesMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)\/debates$/);

  if (request.method === "GET" && debatesMatch) {
    sendJson(response, 200, { debates: database.listDebatesForUser(debatesMatch[1]) });
    return;
  }

  const proposalsMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)\/proposals$/);

  if (request.method === "GET" && proposalsMatch) {
    sendJson(response, 200, { proposals: database.listProposalsForUser(proposalsMatch[1]) });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/match-requests") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const result = database.createMatchRequest({
        userId: payload.userId,
        topicId: payload.topicId,
        topicTitle: payload.topicTitle,
        stance: payload.stance,
      });
      sendJson(response, 201, result);

      if (result.status === "proposal") {
        broadcastToUsers(
          result.proposal.users.map((user) => user.userId),
          {
            type: "proposal_found",
            proposal: result.proposal,
          },
        );
      } else {
        broadcastToUsers([payload.userId], {
          type: "match_request_started",
          request: result.request,
        });
      }
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const matchRequestCancel = requestUrl.pathname.match(/^\/api\/match-requests\/([^/]+)\/cancel$/);

  if (request.method === "POST" && matchRequestCancel) {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      database.cancelMatchRequest(matchRequestCancel[1], payload.userId);
      sendJson(response, 200, { ok: true });
      broadcastToUsers([payload.userId], {
        type: "match_request_cancelled",
        requestId: matchRequestCancel[1],
      });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const proposalAccept = requestUrl.pathname.match(/^\/api\/proposals\/([^/]+)\/accept$/);

  if (request.method === "POST" && proposalAccept) {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const result = database.acceptProposal(proposalAccept[1], payload.userId);
      sendJson(response, 200, result);
      broadcastToUsers(
        result.proposal.users.map((user) => user.userId),
        {
          type: result.debateId ? "debate_started" : "proposal_updated",
          proposal: result.proposal,
          debateId: result.debateId,
        },
      );
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const proposalReject = requestUrl.pathname.match(/^\/api\/proposals\/([^/]+)\/reject$/);

  if (request.method === "POST" && proposalReject) {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const proposal = database.rejectProposal(proposalReject[1], payload.userId);
      sendJson(response, 200, { ok: true });

      if (proposal) {
        broadcastToUsers(
          proposal.users.map((user) => user.userId),
          {
            type: "proposal_rejected",
            proposalId: proposal.id,
          },
        );
      }
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const messagesMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/messages$/);

  if (messagesMatch) {
    if (request.method === "GET") {
      sendJson(response, 200, { messages: database.listMessages(messagesMatch[1]) });
      return;
    }

    if (request.method === "POST") {
      try {
        const body = await readBody(request);
        const payload = JSON.parse(body || "{}");
        const message = database.createMessage({
          debateId: messagesMatch[1],
          userId: payload.userId,
          speaker: payload.speaker,
          text: payload.text,
        });
        sendJson(response, 201, { message });
        broadcastDebate(messagesMatch[1], {
          type: "chat_message",
          debateId: messagesMatch[1],
          message,
        });
      } catch (error) {
        sendError(response, error);
      }
      return;
    }
  }

  const annotationsMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/annotations$/);

  if (annotationsMatch) {
    if (request.method === "GET") {
      sendJson(response, 200, { annotations: database.listAnnotations(annotationsMatch[1]) });
      return;
    }

    if (request.method === "POST") {
      try {
        const body = await readBody(request);
        const payload = JSON.parse(body || "{}");
        const annotation = database.createAnnotation({
          debateId: annotationsMatch[1],
          messageId: payload.messageId,
          userId: payload.userId,
          speaker: payload.speaker,
          start: payload.start,
          end: payload.end,
          quote: payload.quote,
          note: payload.note,
        });
        sendJson(response, 201, { annotation });
        broadcastDebate(annotationsMatch[1], {
          type: "annotation_created",
          debateId: annotationsMatch[1],
          annotation,
        });
      } catch (error) {
        sendError(response, error);
      }
      return;
    }
  }

  if (request.method === "POST" && request.url === "/api/profile") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const profile = await createDeepSeekProfile(payload);
      sendJson(response, 200, { profile });
    } catch (error) {
      sendJson(response, 500, {
        error: error.message,
        profile: createMockProfile({}),
      });
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/topics") {
    sendJson(response, 200, { topics: topicCatalog, version: topicCatalogVersion });
    return;
  }

  if (request.method === "POST" && request.url === "/api/matches") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const result = await createDeepSeekMatches(payload);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 500, {
        error: error.message,
        ...createMockMatches({}, 8),
      });
    }
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.on("upgrade", handleWebSocketUpgrade);

server.listen(port, host, () => {
  console.log(`Debate.it running at http://${host}:${port}`);
  console.log(deepSeekApiKey ? `DeepSeek enabled with ${deepSeekModel}` : "DeepSeek key not set; using mock profiles");
});
