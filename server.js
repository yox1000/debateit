const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

const server = http.createServer(async (request, response) => {
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

server.listen(port, host, () => {
  console.log(`Debate.it running at http://${host}:${port}`);
  console.log(deepSeekApiKey ? `DeepSeek enabled with ${deepSeekModel}` : "DeepSeek key not set; using mock profiles");
});
