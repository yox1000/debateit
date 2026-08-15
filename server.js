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
const courtListenerApiToken = process.env.COURTLISTENER_API_TOKEN || "";
const topicCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "debate-topics.json"), "utf8"));
const topicCatalogVersion = crypto.createHash("sha1").update(JSON.stringify(topicCatalog)).digest("hex").slice(0, 12);
const sessionCookieName = "debateit_session";
const promptsDir = path.join(__dirname, "prompts");
const aiRepairEnabled = process.env.AI_REPAIR_ENABLED !== "false";
const factCheckSourceVersion = "multi-agent-v1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function loadPrompt(promptName) {
  const filePath = path.join(promptsDir, `${promptName}.v1.json`);

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getPromptVariant(prompt, seed = "") {
  if (!Array.isArray(prompt.variants) || !prompt.variants.length) {
    return { name: "default", system: prompt.system, userTemplate: prompt.userTemplate };
  }

  const forced = process.env.PROMPT_VARIANT || "";
  const forcedVariant = prompt.variants.find((variant) => variant.name === forced);

  if (forcedVariant) {
    return {
      name: forcedVariant.name,
      system: forcedVariant.system || prompt.system,
      userTemplate: forcedVariant.userTemplate || prompt.userTemplate,
    };
  }

  const hash = crypto.createHash("sha1").update(`${prompt.id}:${seed}`).digest();
  const index = hash[0] % prompt.variants.length;
  const variant = prompt.variants[index];

  return {
    name: variant.name || `variant-${index}`,
    system: variant.system || prompt.system,
    userTemplate: variant.userTemplate || prompt.userTemplate,
  };
}

function createInputHash(payload) {
  return crypto.createHash("sha1").update(JSON.stringify(payload || {})).digest("hex").slice(0, 16);
}

function hasRequiredKeys(value, requiredKeys = []) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key)),
  );
}

function stripMarkup(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value = "", length = 700) {
  const text = stripMarkup(value);

  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function getDateParts(parts) {
  const dateParts = parts?.["date-parts"]?.[0] || [];

  return dateParts.length ? dateParts.filter(Boolean).join("-") : "";
}

function decodeOpenAlexAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return "";
  }

  const words = [];

  Object.entries(invertedIndex).forEach(([word, positions]) => {
    (positions || []).forEach((position) => {
      words[position] = word;
    });
  });

  return words.filter(Boolean).join(" ");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Debate.it prototype fact-checker (local development)",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Source request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Debate.it prototype fact-checker (local development)",
    },
  });

  if (!response.ok) {
    throw new Error(`Source request failed: ${response.status}`);
  }

  return response.text();
}

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

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  sendJson(response, error.statusCode || 500, { error: error.message || "Server error" });
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf("=");
        const key = separator === -1 ? cookie : cookie.slice(0, separator);
        const value = separator === -1 ? "" : cookie.slice(separator + 1);
        return [decodeURIComponent(key), decodeURIComponent(value)];
      }),
  );
}

function getSessionId(request) {
  return parseCookies(request)[sessionCookieName] || "";
}

function createSessionCookie(session) {
  return `${sessionCookieName}=${encodeURIComponent(session.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${session.maxAgeSeconds}`;
}

function clearSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getAuthenticatedUser(request) {
  return database.getUserBySession(getSessionId(request));
}

function requireAuthenticatedUser(request, response) {
  const user = getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 401, { error: "Authentication required." });
    return null;
  }

  return user;
}

function requireSameUser(request, response, userId) {
  const user = requireAuthenticatedUser(request, response);

  if (!user) {
    return null;
  }

  if (user.id !== userId) {
    sendJson(response, 403, { error: "You can only access your own account." });
    return null;
  }

  return user;
}

function requireDebateParticipant(request, response, debateId) {
  const user = requireAuthenticatedUser(request, response);

  if (!user) {
    return null;
  }

  if (!database.isDebateParticipant(debateId, user.id)) {
    sendJson(response, 403, { error: "You are not part of this debate." });
    return null;
  }

  return user;
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
    skillLevel: "Casual",
    preferredPace: "Standard",
    evidencePreference: "Balanced",
    civilityPreference: "Strict civility",
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
    try {
      const match = content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }
}

async function callDeepSeekJson({ feature, promptName, payload, seed = "", fallback, validate }) {
  const prompt = loadPrompt(promptName);
  const variant = getPromptVariant(prompt, seed || createInputHash(payload));
  const inputHash = createInputHash({ feature, promptName, payload });
  const startedAt = Date.now();

  if (!deepSeekApiKey) {
    database.createAiRequestLog({
      feature,
      promptId: prompt.id,
      promptVersion: prompt.version,
      promptVariant: variant.name,
      status: "local",
      durationMs: 0,
      inputHash,
      output: fallback,
    });
    return fallback;
  }

  try {
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
            content: variant.system,
          },
          {
            role: "user",
            content: JSON.stringify({
              ...variant.userTemplate,
              payload,
              requiredKeys: prompt.requiredKeys || [],
            }),
          },
        ],
        temperature: prompt.temperature ?? 0.2,
        stream: false,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`DeepSeek ${feature} request failed: ${apiResponse.status} ${errorText}`);
    }

    const data = await apiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    let parsed = parseJsonContent(content);
    let repaired = false;

    if ((!hasRequiredKeys(parsed, prompt.requiredKeys) || !parsed) && aiRepairEnabled) {
      parsed = await repairDeepSeekJson({
        feature,
        originalPrompt: prompt,
        rawContent: content,
        payload,
      });
      repaired = true;
    }

    if (!hasRequiredKeys(parsed, prompt.requiredKeys)) {
      throw new Error(`DeepSeek ${feature} returned invalid JSON shape`);
    }

    const output = validate ? validate(parsed) : parsed;

    database.createAiRequestLog({
      feature,
      promptId: prompt.id,
      promptVersion: prompt.version,
      promptVariant: variant.name,
      status: repaired ? "repaired" : "ok",
      durationMs: Date.now() - startedAt,
      inputHash,
      output,
    });

    return output;
  } catch (error) {
    database.createAiRequestLog({
      feature,
      promptId: prompt.id,
      promptVersion: prompt.version,
      promptVariant: variant.name,
      status: "error",
      durationMs: Date.now() - startedAt,
      inputHash,
      error: error.message,
    });
    throw error;
  }
}

async function repairDeepSeekJson({ feature, originalPrompt, rawContent, payload }) {
  const repairPrompt = loadPrompt("repair-json");
  const variant = getPromptVariant(repairPrompt, `${feature}:${createInputHash(payload)}`);
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
          content: variant.system,
        },
        {
          role: "user",
          content: JSON.stringify({
            ...variant.userTemplate,
            requiredKeys: originalPrompt.requiredKeys || [],
            rawContent,
            payload,
          }),
        },
      ],
      temperature: repairPrompt.temperature ?? 0,
      stream: false,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`DeepSeek repair request failed: ${apiResponse.status} ${errorText}`);
  }

  const data = await apiResponse.json();
  const content = data.choices?.[0]?.message?.content || "";
  const parsed = parseJsonContent(content);

  return parsed?.repaired || null;
}

async function createDeepSeekProfile(payload) {
  return callDeepSeekJson({
    feature: "profile",
    promptName: "profile",
    payload: {
      selectedTopics: payload.selectedTopics || [],
      debateBio: payload.debateBio || "",
      profileSignals: payload.profileSignals || {},
    },
    seed: payload.debateBio || "",
    fallback: createMockProfile(payload),
    validate: (profile) => ({
      ...profile,
      source: deepSeekApiKey ? "deepseek" : profile.source || "mock",
    }),
  });
}

async function createDeepSeekMatches(payload) {
  const profile = payload.debateProfile || {};
  const limit = Math.min(Number(payload.limit || 8), 12);

  return callDeepSeekJson({
    feature: "topic-match",
    promptName: "topic-match",
    payload: {
      requestedLimit: limit,
      debateProfile: profile,
      candidateTopics: topicCatalog,
    },
    seed: JSON.stringify(profile),
    fallback: createMockMatches(profile, limit),
    validate: (result) => {
      if (!result?.matches?.length) {
        throw new Error("DeepSeek returned no topic matches");
      }

      return {
        source: deepSeekApiKey ? "deepseek" : result.source || "mock",
        catalogVersion: topicCatalogVersion,
        matches: result.matches.slice(0, limit),
      };
    },
  });
}

function normalizeTranscript(messages = []) {
  return messages
    .filter((message) => message.text?.trim())
    .slice(-28)
    .map((message) => ({
      id: message.id,
      speaker: message.speaker === "system" ? "System" : message.authorName || "Debater",
      text: message.text,
      at: message.at,
    }));
}

function createTranscriptHash({ debate, messages }) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify({
      debateId: debate.id,
      turnIndex: debate.turnState?.turnIndex,
      messages: messages.map((message) => [message.id, message.userId, message.text]),
    }))
    .digest("hex")
    .slice(0, 16);
}

function createLocalCopilotAnalysis({ debate, messages }) {
  const transcript = normalizeTranscript(messages);
  const debateMessages = transcript.filter((message) => message.speaker !== "System");
  const latest = debateMessages.at(-1);
  const claimWords = ["study", "studies", "data", "evidence", "research", "percent", "%", "always", "never", "proves"];
  const claimMessages = debateMessages.filter((message) =>
    claimWords.some((word) => message.text.toLowerCase().includes(word)),
  );
  const opponent = debate.participants.find((participant) => participant.userId !== debate.turnState?.turnUserId);

  return {
    source: "local",
    phaseSummary: {
      phase: debate.turnState?.phaseLabel || "Current phase",
      summary: latest
        ? `${latest.speaker} most recently argued: ${latest.text.slice(0, 140)}${latest.text.length > 140 ? "..." : ""}`
        : "No substantive debate messages yet.",
      speakerProgress: debate.participants.map((participant) => ({
        speaker: participant.name,
        progress: "Waiting for more material before judging progress.",
      })),
      keyClaims: debateMessages.slice(-4).map((message) => `${message.speaker}: ${message.text.slice(0, 120)}`),
    },
    unansweredClaims: latest
      ? [
          {
            from: latest.speaker,
            claim: latest.text.slice(0, 160),
            whyItMatters: "This is the most recent point and should be answered directly.",
            suggestedResponse: "Restate the claim, accept or challenge its premise, then give one reason.",
          },
        ]
      : [],
    crossQuestions: [
      {
        target: opponent?.name || "Opponent",
        question: "What evidence would change your position on this topic?",
        purpose: "Clarifies standards of proof before the debate drifts.",
      },
    ],
    factChecks: claimMessages.slice(-4).map((message) => ({
      speaker: message.speaker,
      claim: message.text.slice(0, 180),
      status: "Needs source",
      reasoning: "The claim uses factual or evidence language and should be sourced before being treated as established.",
      suggestedSourceType: "Primary source, study, official statistic, or reputable report.",
    })),
    focus: {
      priority: debate.turnState?.turnUserName
        ? `${debate.turnState.turnUserName} should answer the strongest recent claim before adding a new argument.`
        : "Keep the next response tied to the current phase.",
      nextMove: debate.turnState?.phaseKey === "cross-question"
        ? "Ask one narrow question that exposes an assumption."
        : "Make one claim, give one reason, and connect it to the debate topic.",
      driftWarning: "Avoid changing topics unless you explicitly explain why the new point matters.",
    },
  };
}

function createCopilotPromptPayload({ debate, messages }) {
  return {
    product: "Debate.it",
    debate: {
      topic: debate.topicTitle,
      status: debate.status,
      currentPhase: debate.turnState?.phaseLabel,
      currentSpeaker: debate.turnState?.turnUserName,
      participants: debate.participants.map((participant) => ({
        name: participant.name,
        stance: participant.stance,
      })),
    },
    promptEngineering: {
      phaseSummary:
        "Summarize only the current debate phase and the phase-relevant progress each side has made. Do not score who is winning.",
      unansweredClaims:
        "Identify claims or challenges that have not yet been directly answered. Prefer the strongest unresolved point over every minor point.",
      crossQuestions:
        "Generate concise cross-question prompts that are neutral, specific, and hard to dodge. Do not write speeches.",
      factCheckTriage:
        "Flag factual claims for verification. Since you cannot browse, do not invent citations. Use only these statuses: Needs source, Likely supported, Questionable, Opinion/Value claim.",
      focusGuard:
        "Give one next-move recommendation that keeps the current speaker inside the active debate phase and prevents topic drift.",
    },
    transcript: normalizeTranscript(messages),
  };
}

function validateCopilotAnalysis(analysis) {
  return {
    source: analysis.source || "deepseek",
    phaseSummary: {
      phase: analysis.phaseSummary?.phase || "Current phase",
      summary: analysis.phaseSummary?.summary || "No summary available.",
      speakerProgress: Array.isArray(analysis.phaseSummary?.speakerProgress)
        ? analysis.phaseSummary.speakerProgress.slice(0, 4)
        : [],
      keyClaims: Array.isArray(analysis.phaseSummary?.keyClaims) ? analysis.phaseSummary.keyClaims.slice(0, 6) : [],
    },
    unansweredClaims: Array.isArray(analysis.unansweredClaims) ? analysis.unansweredClaims.slice(0, 5) : [],
    crossQuestions: Array.isArray(analysis.crossQuestions) ? analysis.crossQuestions.slice(0, 5) : [],
    factChecks: Array.isArray(analysis.factChecks) ? analysis.factChecks.slice(0, 6) : [],
    focus: {
      priority: analysis.focus?.priority || "Answer the current phase prompt directly.",
      nextMove: analysis.focus?.nextMove || "Make one clear claim and support it.",
      driftWarning: analysis.focus?.driftWarning || "Avoid drifting away from the debate topic.",
    },
  };
}

async function createDeepSeekCopilotAnalysis(payload) {
  const phaseKey = payload.debate?.turnState?.phaseKey || "default";
  const promptName = [
    "opening",
    "rebuttal",
    "cross-question",
    "closing",
  ].includes(phaseKey)
    ? `copilot.${phaseKey}`
    : "copilot.default";

  return callDeepSeekJson({
    feature: "copilot",
    promptName,
    payload: createCopilotPromptPayload(payload),
    seed: `${payload.debate?.id || ""}:${phaseKey}`,
    fallback: createLocalCopilotAnalysis(payload),
    validate: (analysis) => validateCopilotAnalysis({ ...analysis, source: deepSeekApiKey ? "deepseek" : analysis.source }),
  });
}

function createLocalDebateRecap({ debate, messages }) {
  const transcript = normalizeTranscript(messages).filter((message) => message.speaker !== "System");
  const claims = transcript.slice(-6).map((message) => `${message.speaker}: ${message.text.slice(0, 160)}`);
  const factChecks = createLocalCopilotAnalysis({ debate, messages }).factChecks;

  return {
    source: "local",
    summary: transcript.length
      ? `The debate covered ${debate.topicTitle}. The last major point was: ${transcript.at(-1).text.slice(0, 180)}`
      : `The debate on ${debate.topicTitle} closed without substantive messages.`,
    strongestClaims: claims.length ? claims.slice(0, 4) : ["No substantive claims were recorded."],
    unresolvedQuestions: ["Which factual claims need outside sources before either side relies on them?"],
    factCheckQueue: factChecks.length ? factChecks : [],
    xpNotes: "Award XP for completing phases, answering directly, and using sourced claims.",
    civilityNotes: "Review whether both sides answered the topic directly and avoided personal attacks.",
    nextSteps: ["Review flagged claims.", "Save useful annotations.", "Start a rematch with a narrower framing."],
  };
}

function createRecapPromptPayload({ debate, messages }) {
  return {
    product: "Debate.it",
    debate: {
      topic: debate.topicTitle,
      status: debate.status,
      participants: debate.participants.map((participant) => ({
        name: participant.name,
        stance: participant.stance,
      })),
    },
    promptEngineering: {
      summary:
        "Write a neutral post-debate summary. Do not name a winner. Explain the main clash and what each side tried to prove.",
      strongestClaims:
        "Extract the strongest claim from each side when available. Prefer claims that connect directly to the topic.",
      unresolvedQuestions:
        "List unresolved questions that would improve a rematch or future research.",
      factCheckQueue:
        "Queue factual claims for later verification. Do not invent citations. Use statuses: Needs source, Likely supported, Questionable, Opinion/Value claim.",
      xpAndCivility:
        "Give concise XP and civility notes based on completion, directness, sourcing, and tone. Do not shame users.",
    },
    transcript: normalizeTranscript(messages),
  };
}

function validateDebateRecap(recap) {
  return {
    source: recap.source || "deepseek",
    summary: recap.summary || "No recap available.",
    strongestClaims: Array.isArray(recap.strongestClaims) ? recap.strongestClaims.slice(0, 6) : [],
    unresolvedQuestions: Array.isArray(recap.unresolvedQuestions) ? recap.unresolvedQuestions.slice(0, 6) : [],
    factCheckQueue: Array.isArray(recap.factCheckQueue) ? recap.factCheckQueue.slice(0, 8) : [],
    xpNotes: recap.xpNotes || "XP review pending.",
    civilityNotes: recap.civilityNotes || "Civility review pending.",
    nextSteps: Array.isArray(recap.nextSteps) ? recap.nextSteps.slice(0, 5) : [],
  };
}

function createLocalCitationPlan({ claim, sourceType = "" }) {
  const cleanClaim = String(claim || "").trim();

  return {
    source: "local",
    claim: cleanClaim,
    verificationPlan: "Find a primary or reputable secondary source, compare the source wording to the claim, then mark the claim as supported or questionable.",
    searchQueries: [
      `"${cleanClaim}"`,
      `${cleanClaim} study`,
      `${cleanClaim} official data`,
    ].filter((query) => query.trim().length > 2).slice(0, 6),
    sourceTargets: [
      sourceType || "Peer-reviewed study",
      "Official statistics or government report",
      "Reputable explanatory reporting",
    ],
    citationNotes: "This is a search plan, not verified evidence yet.",
  };
}

function validateCitationPlan(plan) {
  return {
    source: plan.source || "deepseek",
    claim: plan.claim || "",
    verificationPlan: plan.verificationPlan || "Search for a reliable source and compare it to the claim.",
    searchQueries: Array.isArray(plan.searchQueries) ? plan.searchQueries.slice(0, 6) : [],
    sourceTargets: Array.isArray(plan.sourceTargets) ? plan.sourceTargets.slice(0, 6) : [],
    citationNotes: plan.citationNotes || "No citations verified yet.",
  };
}

function inferClaimType({ claim = "", sourceType = "", debateTopic = "" }) {
  const text = `${claim} ${sourceType} ${debateTopic}`.toLowerCase();

  if (isLegalClaim({ claim, sourceType, debateTopic })) {
    return "legal";
  }

  if (/\b(study|studies|research|scientific|clinical|experiment|peer-reviewed|biology|medicine|health|climate)\b/.test(text)) {
    return "science";
  }

  if (/\b(percent|percentage|rate|statistics|data|survey|poll|increase|decrease|more than|less than|majority)\b/.test(text)) {
    return "statistics";
  }

  if (/\b(history|historical|war|ancient|century|founded|invented)\b/.test(text)) {
    return "history";
  }

  if (/\b(policy|regulation|ban|tax|government program|public policy)\b/.test(text)) {
    return "policy";
  }

  if (/\b(should|better|worse|moral|ethical|fair|unfair|good|bad)\b/.test(text)) {
    return "opinion/value";
  }

  return "general";
}

function createSearchQueriesForClaim({ claim = "", sourceType = "", debateTopic = "", claimType = "" }) {
  const cleanClaim = String(claim || "").trim();
  const baseQuery = [cleanClaim, debateTopic].filter(Boolean).join(" ");

  if (claimType === "legal" || isLegalClaim({ claim, sourceType, debateTopic })) {
    return getLegalQueries({ claim, debateTopic });
  }

  const queries = [
    `"${cleanClaim}"`,
    baseQuery,
    `${baseQuery} official data`,
    `${baseQuery} peer reviewed study`,
    `${baseQuery} government report`,
  ];

  return [...new Set(queries.filter((query) => query.trim().length > 3))].slice(0, 6);
}

function createLocalClaimClassification(payload = {}) {
  const claimType = inferClaimType(payload);
  const checkability = claimType === "opinion/value" ? "Opinion/Value claim" : "Medium";

  return {
    source: "local",
    claim: String(payload.claim || "").trim(),
    claimType,
    checkability,
    sourceStrategy: claimType === "legal"
      ? "Search case law, constitutional text, and legal explainers before using general background."
      : "Search authoritative public sources, academic indexes, and official references before using general background.",
    searchQueries: createSearchQueriesForClaim({ ...payload, claimType }),
    reasoning: "Local classifier used keywords to route the claim to the search agent.",
  };
}

function validateClaimClassification(result, payload = {}) {
  const claimType = result.claimType || inferClaimType(payload);

  return {
    source: result.source || "deepseek",
    claim: result.claim || payload.claim || "",
    claimType,
    checkability: result.checkability || (claimType === "opinion/value" ? "Opinion/Value claim" : "Medium"),
    sourceStrategy: result.sourceStrategy || createLocalClaimClassification({ ...payload, claimType }).sourceStrategy,
    searchQueries: Array.isArray(result.searchQueries) && result.searchQueries.length
      ? result.searchQueries.slice(0, 6)
      : createSearchQueriesForClaim({ ...payload, claimType }),
    reasoning: result.reasoning || "No classifier reasoning provided.",
  };
}

async function createDeepSeekClaimClassification(payload) {
  return callDeepSeekJson({
    feature: "claim-classifier",
    promptName: "claim-classifier",
    payload: {
      claim: payload.claim || "",
      sourceType: payload.sourceType || "",
      debateTopic: payload.debateTopic || "",
    },
    seed: payload.claim || "",
    fallback: createLocalClaimClassification(payload),
    validate: (result) => validateClaimClassification({ ...result, source: deepSeekApiKey ? "deepseek" : result.source }, payload),
  });
}

async function searchWikipediaSources(query) {
  const data = await fetchJson(
    `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=3`,
  );

  return (data.pages || []).map((page) => ({
    provider: "Wikipedia",
    sourceType: "Reference",
    title: page.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key || page.title).replace(/%20/g, "_")}`,
    snippet: truncate(`${page.description || ""}. ${page.excerpt || ""}`),
    publishedAt: "",
    trustReason: "Useful for general background; should be treated as secondary context.",
  }));
}

async function searchCrossrefSources(query) {
  const data = await fetchJson(
    `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=3`,
  );

  return (data.message?.items || []).map((item) => ({
    provider: "Crossref",
    sourceType: "Academic metadata",
    title: truncate((item.title || [])[0] || "Untitled work", 180),
    url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
    snippet: truncate(item.abstract || `${(item["container-title"] || [])[0] || "Scholarly work"}${item["is-referenced-by-count"] ? `, referenced by ${item["is-referenced-by-count"]} works` : ""}.`),
    publishedAt: getDateParts(item.published) || getDateParts(item["published-print"]) || getDateParts(item["published-online"]),
    trustReason: "Scholarly index metadata. Full text may still need review.",
  }));
}

async function searchOpenAlexSources(query) {
  const data = await fetchJson(
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=3`,
  );

  return (data.results || []).map((item) => ({
    provider: "OpenAlex",
    sourceType: "Academic index",
    title: truncate(item.display_name || "Untitled work", 180),
    url: item.doi || item.primary_location?.landing_page_url || item.id || "",
    snippet: truncate(decodeOpenAlexAbstract(item.abstract_inverted_index) || `${item.host_venue?.display_name || "Academic work"}${item.cited_by_count ? `, cited by ${item.cited_by_count} works` : ""}.`),
    publishedAt: item.publication_year ? String(item.publication_year) : "",
    trustReason: "Open academic index metadata and abstracts when available.",
  }));
}

function isLegalClaim({ claim = "", sourceType = "", debateTopic = "" }) {
  const text = `${claim} ${sourceType} ${debateTopic}`.toLowerCase();

  return /\b(fourth amendment|first amendment|constitutional|constitution|unconstitutional|legal|law|court|case law|supreme court|warrant|seizure|search and seizure|privacy right|facial recognition)\b/.test(text);
}

function getLegalQueries({ claim = "", debateTopic = "" }) {
  const text = `${claim} ${debateTopic}`.toLowerCase();
  const queries = [];

  if (text.includes("facial recognition") && text.includes("fourth amendment")) {
    queries.push("\"facial recognition\" \"Fourth Amendment\"");
    queries.push("\"facial recognition\" warrant privacy");
  }

  if (text.includes("fourth amendment")) {
    queries.push("\"Fourth Amendment\" \"reasonable expectation of privacy\"");
    queries.push("\"Fourth Amendment\" warrant search seizure");
  }

  queries.push([claim, debateTopic].filter(Boolean).join(" "));

  return [...new Set(queries.filter((query) => query.trim().length > 3))].slice(0, 4);
}

async function searchCourtListenerSources(query) {
  const data = await fetchJson(
    `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o`,
    courtListenerApiToken ? { headers: { Authorization: `Token ${courtListenerApiToken}` } } : {},
  );

  return (data.results || []).slice(0, 4).map((result) => {
    const opinionSnippet = (result.opinions || []).map((opinion) => opinion.snippet).find(Boolean);
    const citation = Array.isArray(result.citation) ? result.citation.join(", ") : result.citation || "";
    const courtLine = [result.court, result.dateFiled, citation].filter(Boolean).join(" | ");

    return {
      provider: "CourtListener",
      sourceType: "Case law",
      title: truncate(result.caseNameFull || result.caseName || citation || "Court opinion", 180),
      url: result.absolute_url ? `https://www.courtlistener.com${result.absolute_url}` : "",
      snippet: truncate(opinionSnippet || result.syllabus || courtLine),
      publishedAt: result.dateFiled || "",
      trustReason: "Public legal database with court opinions and legal-document search.",
    };
  });
}

function extractHtmlTitle(html) {
  return stripMarkup((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
}

function extractMetaDescription(html) {
  const named = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
  const reversed = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

  return stripMarkup((named || reversed || [])[1] || "");
}

function extractFirstParagraph(html) {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripMarkup(match[1]))
    .filter((paragraph) => paragraph.length > 80);

  return paragraphs[0] || "";
}

async function createReferenceSource({ provider, sourceType, url, trustReason }) {
  const html = await fetchText(url);
  const title = extractHtmlTitle(html);
  const snippet = extractMetaDescription(html) || extractFirstParagraph(html);

  return {
    provider,
    sourceType,
    title: truncate(title || url, 180),
    url,
    snippet: truncate(snippet),
    publishedAt: "",
    trustReason,
  };
}

async function searchLegalReferenceSources({ claim = "", debateTopic = "" }) {
  const text = `${claim} ${debateTopic}`.toLowerCase();
  const references = [];

  if (text.includes("fourth amendment")) {
    references.push(
      {
        provider: "Cornell LII",
        sourceType: "Legal reference",
        url: "https://www.law.cornell.edu/wex/fourth_amendment",
        trustReason: "Legal Information Institute explainer for Fourth Amendment doctrine.",
      },
      {
        provider: "Cornell LII",
        sourceType: "Constitution text",
        url: "https://www.law.cornell.edu/constitution/fourth_amendment",
        trustReason: "Primary constitutional text hosted by Cornell Legal Information Institute.",
      },
      {
        provider: "Oyez",
        sourceType: "Supreme Court summary",
        url: "https://www.oyez.org/cases/2017/16-402",
        trustReason: "Supreme Court case summary for Carpenter v. United States.",
      },
      {
        provider: "Oyez",
        sourceType: "Supreme Court summary",
        url: "https://www.oyez.org/cases/1967/35",
        trustReason: "Supreme Court case summary for Katz v. United States.",
      },
    );
  }

  if (text.includes("facial recognition")) {
    references.push({
      provider: "NIST",
      sourceType: "Government technical report",
      url: "https://www.nist.gov/programs-projects/face-recognition-vendor-test-frvt",
      trustReason: "U.S. government technical testing program for facial recognition systems.",
    });
  }

  const results = await Promise.allSettled(references.map((reference) => createReferenceSource(reference)));

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

function dedupeSources(sources = []) {
  const seen = new Set();

  return sources.filter((source) => {
    const title = String(source.title || "").trim();
    const url = String(source.url || "").trim();
    const key = url || title.toLowerCase();

    if (!title || /^untitled\b/i.test(title) || !url || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function searchTrustedSources({ claim, debateTopic = "", sourceType = "", classification = null }) {
  const query = [claim, debateTopic].filter(Boolean).join(" ");
  const legalClaim = classification?.claimType === "legal" || isLegalClaim({ claim, sourceType, debateTopic });
  const classifierQueries = Array.isArray(classification?.searchQueries) ? classification.searchQueries : [];
  const legalQueries = legalClaim
    ? [...new Set([...classifierQueries, ...getLegalQueries({ claim, debateTopic })])].slice(0, 5)
    : [];
  const generalQueries = classifierQueries.length ? classifierQueries.slice(0, 2) : [query];
  const legalSearches = legalQueries.map((legalQuery) => searchCourtListenerSources(legalQuery));
  const referenceSearches = legalClaim ? [searchLegalReferenceSources({ claim, debateTopic })] : [];
  const generalSearches = generalQueries.flatMap((searchQuery) => [
    searchWikipediaSources(searchQuery),
    searchCrossrefSources(searchQuery),
    searchOpenAlexSources(searchQuery),
  ]);
  const searches = await Promise.allSettled([
    ...legalSearches,
    ...referenceSearches,
    ...generalSearches,
  ]);
  const sources = searches
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((source) => source.title && source.url);

  return dedupeSources(sources).slice(0, 10);
}

function createLocalTrustedFactCheck({ claim, sources = [] }) {
  return {
    source: "local",
    claim: String(claim || "").trim(),
    verdict: sources.length ? "Not enough evidence" : "Not enough evidence",
    confidence: sources.length ? "Low" : "Low",
    interpretation: sources.length
      ? "Trusted source search returned possible sources, but DeepSeek is unavailable to interpret them. Review the linked sources before marking the claim."
      : "No trusted source results were found from the configured public source APIs.",
    stats: [],
    evidence: sources.slice(0, 5).map((source) => ({
      title: source.title,
      provider: source.provider,
      url: source.url,
      relevance: "Potentially relevant source result.",
      whatItSays: source.snippet,
    })),
    limitations: "This fallback does not decide truth. It only reports available source results.",
    checkedAt: new Date().toISOString(),
  };
}

function normalizeConfidence(confidence) {
  if (typeof confidence === "number") {
    if (confidence < 0.4) {
      return "Low";
    }

    if (confidence < 0.75) {
      return "Medium";
    }

    return "High";
  }

  const value = String(confidence || "").trim();

  if (/^0?\.\d+$/.test(value)) {
    return normalizeConfidence(Number(value));
  }

  return value || "Low";
}

function normalizeEvidence(evidence = [], sourceBundle = []) {
  return evidence.slice(0, 8).map((item) => {
    const title = String(item.title || item.sourceTitle || "").trim();
    const match = sourceBundle.find((source) => {
      const sourceTitle = String(source.title || "").toLowerCase();
      const itemTitle = title.toLowerCase();

      return item.url === source.url || (itemTitle && (sourceTitle === itemTitle || sourceTitle.includes(itemTitle) || itemTitle.includes(sourceTitle)));
    });

    return {
      title: title || match?.title || "",
      provider: item.provider || match?.provider || "Source",
      url: item.url || match?.url || "",
      relevance: item.relevance || match?.trustReason || "",
      whatItSays: item.whatItSays || item.summary || item.note || match?.snippet || "",
    };
  }).filter((item) => item.title && item.url && !/^untitled\b/i.test(item.title));
}

function normalizeRankedSources(rankedSources = [], sourceBundle = []) {
  const items = Array.isArray(rankedSources) ? rankedSources : [];

  return items.slice(0, 10).map((item) => {
    const title = String(item.title || item.sourceTitle || "").trim();
    const match = sourceBundle.find((source) => {
      const sourceTitle = String(source.title || "").toLowerCase();
      const itemTitle = title.toLowerCase();

      return item.url === source.url || (itemTitle && (sourceTitle === itemTitle || sourceTitle.includes(itemTitle) || itemTitle.includes(sourceTitle)));
    });

    return {
      title: title || match?.title || "",
      provider: item.provider || match?.provider || "Source",
      url: item.url || match?.url || "",
      strength: item.strength || item.rating || "Useful context",
      reason: item.reason || item.relevance || match?.trustReason || "",
      whatItSays: item.whatItSays || item.summary || match?.snippet || "",
    };
  }).filter((item) => item.title && item.url && !/^untitled\b/i.test(item.title));
}

function createLocalSourceEvaluation({ claim, sources = [] }) {
  const rankedSources = sources.slice(0, 8).map((source, index) => ({
    title: source.title,
    provider: source.provider,
    url: source.url,
    strength: index < 3 ? "Useful context" : "Weak",
    reason: source.trustReason || "Potentially relevant retrieved source.",
    whatItSays: source.snippet || "",
  }));

  return {
    source: "local",
    claim: String(claim || "").trim(),
    rankedSources,
    bestEvidence: rankedSources.slice(0, 3),
    weaknesses: sources.length
      ? ["Local source ranking cannot fully evaluate source quality without DeepSeek."]
      : ["No source results were retrieved."],
    searchGaps: sources.length
      ? ["Open each source before relying on the claim."]
      : ["Try a narrower claim or a different source type."],
  };
}

function validateSourceEvaluation(result, sourceBundle = []) {
  const rankedSources = normalizeRankedSources(result.rankedSources || [], sourceBundle);

  return {
    source: result.source || "deepseek",
    claim: result.claim || "",
    rankedSources,
    bestEvidence: normalizeRankedSources(result.bestEvidence || rankedSources.slice(0, 3), sourceBundle),
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.slice(0, 5) : [],
    searchGaps: Array.isArray(result.searchGaps) ? result.searchGaps.slice(0, 5) : [],
  };
}

async function createDeepSeekSourceEvaluation(payload) {
  return callDeepSeekJson({
    feature: "source-evaluator",
    promptName: "source-evaluator",
    payload: {
      claim: payload.claim || "",
      claimClassification: payload.classification || {},
      sources: payload.sources || [],
      sourcePolicy: "Rank only provided sources. Do not add outside citations.",
    },
    seed: payload.claim || "",
    fallback: createLocalSourceEvaluation(payload),
    validate: (result) => validateSourceEvaluation({ ...result, source: deepSeekApiKey ? "deepseek" : result.source }, payload.sources || []),
  });
}

function validateTrustedFactCheck(result, sourceBundle = []) {
  return {
    source: result.source || "deepseek",
    claim: result.claim || "",
    verdict: result.verdict || "Not enough evidence",
    confidence: normalizeConfidence(result.confidence),
    interpretation: result.interpretation || "No interpretation available.",
    stats: Array.isArray(result.stats) ? result.stats.slice(0, 6) : [],
    evidence: Array.isArray(result.evidence) ? normalizeEvidence(result.evidence, sourceBundle) : [],
    limitations: result.limitations || "Review source links directly before relying on this fact-check.",
    checkedAt: result.checkedAt || new Date().toISOString(),
  };
}

function createLocalFactPresentation({ factCheck = {}, sourceEvaluation = {} }) {
  return {
    source: "local",
    headline: `${factCheck.verdict || "Not enough evidence"}: ${factCheck.claim || "Claim"}`,
    summary: factCheck.interpretation || "Review the evidence links before relying on this claim.",
    nextStep: sourceEvaluation.searchGaps?.[0] || "Open the strongest source and compare it to the exact claim.",
    caveat: factCheck.limitations || "This is an assisted research summary, not a final authority.",
  };
}

function validateFactPresentation(result, payload = {}) {
  const fallback = createLocalFactPresentation(payload);

  return {
    source: result.source || "deepseek",
    headline: result.headline || fallback.headline,
    summary: result.summary || fallback.summary,
    nextStep: result.nextStep || fallback.nextStep,
    caveat: result.caveat || fallback.caveat,
  };
}

async function createDeepSeekFactPresentation(payload) {
  return callDeepSeekJson({
    feature: "fact-presentation",
    promptName: "fact-presentation",
    payload: {
      claim: payload.factCheck?.claim || "",
      claimClassification: payload.classification || {},
      sourceEvaluation: payload.sourceEvaluation || {},
      finalEvaluation: payload.factCheck || {},
    },
    seed: payload.factCheck?.claim || "",
    fallback: createLocalFactPresentation(payload),
    validate: (result) => validateFactPresentation({ ...result, source: deepSeekApiKey ? "deepseek" : result.source }, payload),
  });
}

async function createDeepSeekTrustedFactCheck(payload) {
  return callDeepSeekJson({
    feature: "fact-check",
    promptName: "fact-check",
    payload: {
      claim: payload.claim || "",
      debateTopic: payload.debateTopic || "",
      sourceType: payload.sourceType || "",
      sourceVersion: payload.sourceVersion || factCheckSourceVersion,
      claimClassification: payload.classification || {},
      sourceEvaluation: payload.sourceEvaluation || {},
      sources: payload.sources || [],
      sourcePolicy: "Use only these trusted source search results. If they are indirect or insufficient, say Not enough evidence.",
    },
    seed: payload.claim || "",
    fallback: createLocalTrustedFactCheck({ claim: payload.claim, sources: payload.sources || [] }),
    validate: (result) => validateTrustedFactCheck({ ...result, source: deepSeekApiKey ? "deepseek" : result.source }, payload.sources || []),
  });
}

async function runFactCheckAgents(payload) {
  const classification = await createDeepSeekClaimClassification(payload);
  const sources = await searchTrustedSources({ ...payload, classification });
  const sourceEvaluation = await createDeepSeekSourceEvaluation({
    claim: payload.claim,
    classification,
    sources,
  });
  const factCheck = await createDeepSeekTrustedFactCheck({
    ...payload,
    classification,
    sourceEvaluation,
    sources,
  });
  const presentation = await createDeepSeekFactPresentation({
    classification,
    sourceEvaluation,
    factCheck,
  });

  return {
    ...factCheck,
    presentation,
    researchTrail: [
      {
        agent: "Claim Agent",
        status: "complete",
        summary: `${classification.claimType} claim, ${classification.checkability} checkability`,
        details: classification.reasoning,
      },
      {
        agent: "Search Agent",
        status: "complete",
        summary: `${sources.length} trusted source candidates found`,
        details: classification.sourceStrategy,
      },
      {
        agent: "Source Agent",
        status: "complete",
        summary: `${sourceEvaluation.rankedSources.length} sources ranked`,
        details: sourceEvaluation.searchGaps?.[0] || sourceEvaluation.weaknesses?.[0] || "Sources ranked by relevance and authority.",
      },
      {
        agent: "Evaluation Agent",
        status: "complete",
        summary: `${factCheck.verdict} with ${factCheck.confidence} confidence`,
        details: factCheck.limitations,
      },
      {
        agent: "Presentation Agent",
        status: "complete",
        summary: presentation.headline,
        details: presentation.nextStep,
      },
    ],
    claimClassification: classification,
    sourceEvaluation,
  };
}

async function createDeepSeekCitationPlan(payload) {
  return callDeepSeekJson({
    feature: "citation-search",
    promptName: "citation-search",
    payload: {
      claim: payload.claim || "",
      sourceType: payload.sourceType || "",
      debateTopic: payload.debateTopic || "",
      sourceText: payload.sourceText || "",
    },
    seed: payload.claim || "",
    fallback: createLocalCitationPlan(payload),
    validate: (plan) => validateCitationPlan({ ...plan, source: deepSeekApiKey ? "deepseek" : plan.source }),
  });
}

async function createDeepSeekDebateRecap(payload) {
  return callDeepSeekJson({
    feature: "recap",
    promptName: "recap",
    payload: createRecapPromptPayload(payload),
    seed: payload.debate?.id || "",
    fallback: createLocalDebateRecap(payload),
    validate: (recap) => validateDebateRecap({ ...recap, source: deepSeekApiKey ? "deepseek" : recap.source }),
  });
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

function broadcastToUsersExcept(userIds, excludedUserId, payload) {
  const recipients = new Set(userIds.filter((userId) => userId && userId !== excludedUserId));

  websocketClients.forEach((client) => {
    if (recipients.has(client.userId)) {
      sendWebSocketJson(client, payload);
    }
  });
}

function broadcastDebate(debateId, payload) {
  broadcastToUsers(database.listDebateParticipantIds(debateId), payload);
}

function broadcastDebateExcept(debateId, excludedUserId, payload) {
  broadcastToUsersExcept(database.listDebateParticipantIds(debateId), excludedUserId, payload);
}

async function getOrCreateDebateRecap(debateId) {
  const debate = database.getDebateContext(debateId);
  const messages = database.listMessages(debateId);

  if (!debate) {
    const error = new Error("Debate not found.");
    error.statusCode = 404;
    throw error;
  }

  const transcriptHash = createTranscriptHash({ debate, messages });
  const cached = database.getAiInsight(debateId, "recap", transcriptHash);

  if (cached?.payload) {
    return { recap: cached.payload, cached: true, transcriptHash };
  }

  const recap = await createDeepSeekDebateRecap({ debate, messages });
  database.saveAiInsight({
    debateId,
    insightType: "recap",
    transcriptHash,
    payload: recap,
  });

  return { recap, cached: false, transcriptHash };
}

async function broadcastDebateRecap(debateId) {
  try {
    const result = await getOrCreateDebateRecap(debateId);

    broadcastDebate(debateId, {
      type: "debate_recap",
      debateId,
      recap: result.recap,
      transcriptHash: result.transcriptHash,
    });
  } catch {
    // Recaps are a secondary workflow; the debate state should still update if AI is unavailable.
  }
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
    if (!client.userId) {
      sendWebSocketJson(client, { type: "error", message: "Unknown user." });
      return;
    }

    sendWebSocketJson(client, { type: "connected", userId: client.userId });
    return;
  }

  if (message.type === "join_room") {
    if (!database.isDebateParticipant(message.debateId, client.userId)) {
      sendWebSocketJson(client, { type: "error", message: "Cannot join that debate room." });
      return;
    }

    client.rooms.add(message.debateId);
    broadcastDebateExcept(message.debateId, client.userId, {
      type: "room_presence",
      debateId: message.debateId,
      userId: client.userId,
      name: client.name,
      status: "joined",
    });
    return;
  }

  if (message.type === "leave_room") {
    client.rooms.delete(message.debateId);
    broadcastDebateExcept(message.debateId, client.userId, {
      type: "room_presence",
      debateId: message.debateId,
      userId: client.userId,
      name: client.name,
      status: "left",
    });
    return;
  }

  if (message.type === "typing") {
    if (!client.rooms.has(message.debateId)) {
      return;
    }

    broadcastDebateExcept(message.debateId, client.userId, {
      type: "typing",
      debateId: message.debateId,
      userId: client.userId,
      name: client.name,
      isTyping: Boolean(message.isTyping),
    });
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

  const user = getAuthenticatedUser(request);

  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
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
    userId: user.id,
    name: user.name,
    rooms: new Set(),
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

  const removeClient = () => {
    websocketClients.delete(client);
    client.rooms.forEach((debateId) => {
      broadcastDebateExcept(debateId, client.userId, {
        type: "room_presence",
        debateId,
        userId: client.userId,
        name: client.name,
        status: "left",
      });
    });
    client.rooms.clear();
  };

  socket.on("close", removeClient);
  socket.on("end", removeClient);
  socket.on("error", removeClient);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/db/status") {
    sendJson(response, 200, database.getStatus());
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/ai/logs") {
    const user = requireAuthenticatedUser(request, response);

    if (user) {
      sendJson(response, 200, { logs: database.listAiRequestLogs(Number(requestUrl.searchParams.get("limit") || 50)) });
    }
    return;
  }

  const aiLogScoreMatch = requestUrl.pathname.match(/^\/api\/ai\/logs\/([^/]+)\/score$/);

  if (request.method === "POST" && aiLogScoreMatch) {
    try {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const log = database.scoreAiRequestLog(aiLogScoreMatch[1], {
        score: payload.score,
        reviewNote: payload.reviewNote,
      });
      sendJson(response, log ? 200 : 404, log ? { log } : { error: "Log not found." });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/ai/prompts") {
    const user = requireAuthenticatedUser(request, response);

    if (user) {
      const prompts = fs
        .readdirSync(promptsDir)
        .filter((fileName) => fileName.endsWith(".json"))
        .map((fileName) => {
          const prompt = JSON.parse(fs.readFileSync(path.join(promptsDir, fileName), "utf8"));

          return {
            fileName,
            id: prompt.id,
            version: prompt.version,
            requiredKeys: prompt.requiredKeys || [],
            variants: (prompt.variants || []).map((variant) => variant.name),
          };
        });
      sendJson(response, 200, { prompts });
    }
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

      const session = database.createSession(user.id);
      sendJson(response, 200, { user }, { "Set-Cookie": createSessionCookie(session) });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/logout") {
    database.deleteSession(getSessionId(request));
    sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/session") {
    const user = requireAuthenticatedUser(request, response);

    if (user) {
      sendJson(response, 200, { user });
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/signup") {
    try {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const user = database.createUser(payload);
      const session = database.createSession(user.id);
      sendJson(response, 201, { user }, { "Set-Cookie": createSessionCookie(session) });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const userMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)$/);

  if (request.method === "GET" && userMatch) {
    const user = requireSameUser(request, response, userMatch[1]);

    if (!user) {
      return;
    }

    sendJson(response, 200, { user });
    return;
  }

  const profileMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)\/profile$/);

  if (request.method === "PUT" && profileMatch) {
    try {
      const currentUser = requireSameUser(request, response, profileMatch[1]);

      if (!currentUser) {
        return;
      }

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
    const user = requireSameUser(request, response, debatesMatch[1]);

    if (user) {
      sendJson(response, 200, { debates: database.listDebatesForUser(user.id) });
    }
    return;
  }

  const proposalsMatch = requestUrl.pathname.match(/^\/api\/users\/([^/]+)\/proposals$/);

  if (request.method === "GET" && proposalsMatch) {
    const user = requireSameUser(request, response, proposalsMatch[1]);

    if (user) {
      sendJson(response, 200, { proposals: database.listProposalsForUser(user.id) });
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/match-requests") {
    try {
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const result = database.createMatchRequest({
        userId: user.id,
        topicId: payload.topicId,
        topicTitle: payload.topicTitle,
        stance: payload.stance,
        metadata: {
          topicCategory: payload.topicCategory || "",
          topicTags: payload.topicTags || [],
          timezone: payload.timezone || "",
        },
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
        broadcastToUsers([user.id], {
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
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      database.cancelMatchRequest(matchRequestCancel[1], user.id);
      sendJson(response, 200, { ok: true });
      broadcastToUsers([user.id], {
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
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      const result = database.acceptProposal(proposalAccept[1], user.id);
      const debateState = result.debateId ? database.getDebateTurnState(result.debateId) : null;
      sendJson(response, 200, result);
      broadcastToUsers(
        result.proposal.users.map((user) => user.userId),
        {
          type: result.debateId ? "debate_started" : "proposal_updated",
          proposal: result.proposal,
          debateId: result.debateId,
          debateState,
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
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

      const proposal = database.rejectProposal(proposalReject[1], user.id);
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
  const debateStateMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/state$/);
  const copilotMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/copilot$/);
  const recapMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/recap$/);
  const factCheckMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/fact-checks$/);
  const citationMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/citation-plan$/);
  const trustedFactCheckMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/fact-check-claim$/);

  if (request.method === "GET" && debateStateMatch) {
    const user = requireDebateParticipant(request, response, debateStateMatch[1]);

    if (user) {
      const debateState = database.getDebateTurnState(debateStateMatch[1]);
      sendJson(response, 200, { debateState });
      broadcastDebate(debateStateMatch[1], {
        type: "debate_state",
        debateId: debateStateMatch[1],
        debateState,
      });

      if (debateState?.isFinished) {
        broadcastDebateRecap(debateStateMatch[1]);
      }
    }
    return;
  }

  if (messagesMatch) {
    if (request.method === "GET") {
      const user = requireDebateParticipant(request, response, messagesMatch[1]);

      if (user) {
        database.getDebateTurnState(messagesMatch[1]);
        sendJson(response, 200, { messages: database.listMessages(messagesMatch[1]) });
      }
      return;
    }

    if (request.method === "POST") {
      try {
        const user = requireDebateParticipant(request, response, messagesMatch[1]);

        if (!user) {
          return;
        }

        const body = await readBody(request);
        const payload = JSON.parse(body || "{}");
        const message = database.createMessage({
          debateId: messagesMatch[1],
          userId: user.id,
          speaker: "debater",
          text: payload.text,
        });
        const messages = database.listMessages(messagesMatch[1]);
        const debateState = database.getDebateTurnState(messagesMatch[1]);
        sendJson(response, 201, { message, messages, debateState });
        broadcastDebate(messagesMatch[1], {
          type: "chat_message",
          debateId: messagesMatch[1],
          message,
          messages,
          debateState,
        });

        if (debateState?.isFinished) {
          broadcastDebateRecap(messagesMatch[1]);
        }
      } catch (error) {
        sendError(response, error);
      }
      return;
    }
  }

  if (request.method === "POST" && copilotMatch) {
    try {
      const user = requireDebateParticipant(request, response, copilotMatch[1]);

      if (!user) {
        return;
      }

      const debate = database.getDebateContext(copilotMatch[1]);
      const messages = database.listMessages(copilotMatch[1]);
      const transcriptHash = createTranscriptHash({ debate, messages });
      const cached = database.getAiInsight(copilotMatch[1], "copilot", transcriptHash);

      if (cached?.payload) {
        sendJson(response, 200, { analysis: cached.payload, cached: true, transcriptHash });
        return;
      }

      const analysis = await createDeepSeekCopilotAnalysis({ debate, messages, user });
      database.saveAiInsight({
        debateId: copilotMatch[1],
        insightType: "copilot",
        transcriptHash,
        payload: analysis,
      });
      sendJson(response, 200, { analysis, cached: false, transcriptHash });
      broadcastDebate(copilotMatch[1], {
        type: "copilot_analysis",
        debateId: copilotMatch[1],
        analysis,
        transcriptHash,
      });
    } catch (error) {
      try {
        const debate = database.getDebateContext(copilotMatch[1]);
        const messages = database.listMessages(copilotMatch[1]);

        if (!debate) {
          throw error;
        }

        sendJson(response, 200, {
          analysis: createLocalCopilotAnalysis({ debate, messages }),
          cached: false,
          fallback: true,
        });
      } catch {
        sendError(response, error);
      }
    }
    return;
  }

  if (request.method === "POST" && recapMatch) {
    try {
      const user = requireDebateParticipant(request, response, recapMatch[1]);

      if (!user) {
        return;
      }

      const result = await getOrCreateDebateRecap(recapMatch[1]);
      sendJson(response, 200, result);
      broadcastDebate(recapMatch[1], {
        type: "debate_recap",
        debateId: recapMatch[1],
        recap: result.recap,
        transcriptHash: result.transcriptHash,
      });
    } catch (error) {
      try {
        const debate = database.getDebateContext(recapMatch[1]);
        const messages = database.listMessages(recapMatch[1]);

        if (!debate) {
          throw error;
        }

        sendJson(response, 200, {
          recap: createLocalDebateRecap({ debate, messages }),
          cached: false,
          fallback: true,
        });
      } catch {
        sendError(response, error);
      }
    }
    return;
  }

  if (factCheckMatch) {
    if (request.method === "GET") {
      const user = requireDebateParticipant(request, response, factCheckMatch[1]);

      if (user) {
        sendJson(response, 200, { reviews: database.listFactCheckReviews(factCheckMatch[1], user.id) });
      }
      return;
    }

    if (request.method === "POST") {
      try {
        const user = requireDebateParticipant(request, response, factCheckMatch[1]);

        if (!user) {
          return;
        }

        const body = await readBody(request);
        const payload = JSON.parse(body || "{}");
        const review = database.upsertFactCheckReview({
          debateId: factCheckMatch[1],
          userId: user.id,
          claimKey: payload.claimKey,
          claim: payload.claim,
          status: payload.status,
          note: payload.note,
          sourceType: payload.sourceType,
        });
        sendJson(response, 200, { review });
        broadcastDebate(factCheckMatch[1], {
          type: "fact_check_review",
          debateId: factCheckMatch[1],
          review,
        });
      } catch (error) {
        sendError(response, error);
      }
      return;
    }
  }

  if (request.method === "POST" && citationMatch) {
    try {
      const user = requireDebateParticipant(request, response, citationMatch[1]);

      if (!user) {
        return;
      }

      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const debate = database.getDebateContext(citationMatch[1]);
      const plan = await createDeepSeekCitationPlan({
        claim: payload.claim,
        sourceType: payload.sourceType,
        sourceText: payload.sourceText,
        debateTopic: debate?.topicTitle || "",
      });
      sendJson(response, 200, { plan });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (request.method === "POST" && trustedFactCheckMatch) {
    try {
      const user = requireDebateParticipant(request, response, trustedFactCheckMatch[1]);

      if (!user) {
        return;
      }

      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const debate = database.getDebateContext(trustedFactCheckMatch[1]);
      const claim = String(payload.claim || "").trim();

      if (!claim) {
        sendJson(response, 400, { error: "Claim is required." });
        return;
      }

      const claimHash = createInputHash({
        claim,
        sourceType: payload.sourceType || "",
        topic: debate?.topicTitle || "",
        sourceVersion: factCheckSourceVersion,
      });
      const cached = database.getAiInsight(trustedFactCheckMatch[1], "fact-check", claimHash);

      if (cached?.payload) {
        sendJson(response, 200, { factCheck: cached.payload, cached: true });
        return;
      }

      const factCheck = await runFactCheckAgents({
        claim,
        sourceType: payload.sourceType,
        debateTopic: debate?.topicTitle || "",
        sourceVersion: factCheckSourceVersion,
      });
      database.saveAiInsight({
        debateId: trustedFactCheckMatch[1],
        insightType: "fact-check",
        transcriptHash: claimHash,
        payload: factCheck,
      });
      sendJson(response, 200, { factCheck, cached: false });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  const annotationsMatch = requestUrl.pathname.match(/^\/api\/debates\/([^/]+)\/annotations$/);

  if (annotationsMatch) {
    if (request.method === "GET") {
      const user = requireDebateParticipant(request, response, annotationsMatch[1]);

      if (user) {
        sendJson(response, 200, { annotations: database.listAnnotations(annotationsMatch[1]) });
      }
      return;
    }

    if (request.method === "POST") {
      try {
        const user = requireDebateParticipant(request, response, annotationsMatch[1]);

        if (!user) {
          return;
        }

        const body = await readBody(request);
        const payload = JSON.parse(body || "{}");
        const annotation = database.createAnnotation({
          debateId: annotationsMatch[1],
          messageId: payload.messageId,
          userId: user.id,
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
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

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
      const user = requireAuthenticatedUser(request, response);

      if (!user) {
        return;
      }

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
