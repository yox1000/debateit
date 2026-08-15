const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "data");
const dbPath = process.env.DB_PATH || path.join(dataDir, "debateit.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");

const passwordHashPrefix = "scrypt";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 14;
const debatePhases = [
  { key: "opening", label: "Opening statement", durationSeconds: 180 },
  { key: "rebuttal", label: "Rebuttal", durationSeconds: 180 },
  { key: "cross-question", label: "Cross-question", durationSeconds: 120 },
  { key: "closing", label: "Closing statement", durationSeconds: 120 },
];

function nowIso() {
  return new Date().toISOString();
}

function addSecondsIso(value, seconds) {
  return new Date(new Date(value).getTime() + seconds * 1000).toISOString();
}

function json(value, fallback = null) {
  if (value === undefined) {
    return JSON.stringify(fallback);
  }

  return JSON.stringify(value);
}

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getExperienceLevel(xp = 0) {
  if (xp >= 250) {
    return "Arena Veteran";
  }

  if (xp >= 100) {
    return "Policy Builder";
  }

  if (xp >= 50) {
    return "Calm Rebutter";
  }

  return "Newcomer";
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${passwordHashPrefix}$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword = "") {
  if (!storedPassword.startsWith(`${passwordHashPrefix}$`)) {
    return String(password) === storedPassword;
  }

  const [, salt, storedHash] = storedPassword.split("$");

  if (!salt || !storedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(String(password), salt, 64);
  const expectedHash = Buffer.from(storedHash, "hex");

  return expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash);
}

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function ensureColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      country TEXT NOT NULL DEFAULT '',
      survey_completed INTEGER NOT NULL DEFAULT 0,
      interests_json TEXT NOT NULL DEFAULT '[]',
      debate_bio TEXT NOT NULL DEFAULT '',
      debate_profile_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      stance TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_proposals (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      accepted_by_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_proposal_users (
      proposal_id TEXT NOT NULL REFERENCES match_proposals(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stance TEXT NOT NULL,
      request_id TEXT,
      PRIMARY KEY (proposal_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS debates (
      id TEXT PRIMARY KEY,
      proposal_id TEXT,
      topic_id TEXT,
      topic_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      phase_key TEXT NOT NULL DEFAULT 'opening',
      turn_index INTEGER NOT NULL DEFAULT 0,
      turn_deadline_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debate_participants (
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stance TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (debate_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT,
      speaker TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      speaker TEXT NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      quote TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      insight_type TEXT NOT NULL,
      transcript_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fact_check_reviews (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      claim_key TEXT NOT NULL,
      claim TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(debate_id, user_id, claim_key)
    );

    CREATE INDEX IF NOT EXISTS idx_match_requests_lookup
      ON match_requests(topic_id, stance, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_user
      ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_debate_participants_user
      ON debate_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_debate
      ON chat_messages(debate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_annotations_debate
      ON annotations(debate_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_insights_lookup
      ON ai_insights(debate_id, insight_type, transcript_hash);
    CREATE INDEX IF NOT EXISTS idx_fact_check_reviews_debate
      ON fact_check_reviews(debate_id, user_id);
  `);

  ensureColumn("match_requests", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("debates", "phase_key", "TEXT NOT NULL DEFAULT 'opening'");
  ensureColumn("debates", "turn_index", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("debates", "turn_deadline_at", "TEXT");
}

function seedUsers() {
  const createdAt = nowIso();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, name, email, password, xp, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ["empty-account", "Test Account", "", hashPassword(""), 0, "United States"],
    ["alex-account", "Alex", "alex@debate.it", hashPassword("test"), 120, "United States"],
    ["sam-account", "Sam", "sam@debate.it", hashPassword("test"), 95, "Canada"],
  ].forEach((user) => insert.run(...user, createdAt, createdAt));
}

function migrateLegacyPasswords() {
  const rows = db.prepare("SELECT id, password FROM users").all();
  const update = db.prepare("UPDATE users SET password = ?, updated_at = ? WHERE id = ?");

  rows.forEach((row) => {
    if (!row.password.startsWith(`${passwordHashPrefix}$`)) {
      update.run(hashPassword(row.password), nowIso(), row.id);
    }
  });
}

function migrateLegacyDebateTurns() {
  const updatedAt = nowIso();
  db.prepare(`
    UPDATE debates
    SET phase_key = 'opening',
        turn_index = 0,
        turn_deadline_at = ?,
        updated_at = ?
    WHERE status = 'active'
      AND (turn_deadline_at IS NULL OR turn_deadline_at = '')
  `).run(addSecondsIso(updatedAt, debatePhases[0].durationSeconds), updatedAt);
}

function toUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    xp: row.xp,
    country: row.country,
    surveyCompleted: Boolean(row.survey_completed),
    interests: parseJson(row.interests_json, []),
    debateBio: row.debate_bio,
    debateProfile: parseJson(row.debate_profile_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProposal(row) {
  if (!row) {
    return null;
  }

  const users = db
    .prepare(`
      SELECT user_id, stance, request_id
      FROM match_proposal_users
      WHERE proposal_id = ?
      ORDER BY rowid ASC
    `)
    .all(row.id)
    .map((user) => ({
      userId: user.user_id,
      stance: user.stance,
      requestId: user.request_id,
      name: getUserName(user.user_id),
      stats: getUserStats(user.user_id),
    }));

  return {
    id: row.id,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    status: row.status,
    acceptedBy: parseJson(row.accepted_by_json, []),
    users,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getUserByCredentials(email = "", password = "") {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim());

  if (!row || !verifyPassword(password, row.password)) {
    return null;
  }

  return toUser(row);
}

function createUser({ name, email = "", password = "" }) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).trim());

  if (existing) {
    const error = new Error("Email is already in use.");
    error.statusCode = 409;
    throw error;
  }

  const createdAt = nowIso();
  const id = createId("user");

  db.prepare(`
    INSERT INTO users (id, name, email, password, country, created_at, updated_at)
    VALUES (?, ?, ?, ?, '', ?, ?)
  `).run(id, String(name || "New Debater").trim(), String(email).trim(), hashPassword(password), createdAt, createdAt);

  return getUserById(id);
}

function createSession(userId) {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  const id = crypto.randomBytes(32).toString("hex");

  db.prepare(`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, createdAt, expiresAt);

  return { id, userId, expiresAt, maxAgeSeconds: Math.floor(sessionTtlMs / 1000) };
}

function deleteSession(sessionId) {
  if (sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
}

function cleanupExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
}

function getUserBySession(sessionId) {
  cleanupExpiredSessions();

  if (!sessionId) {
    return null;
  }

  return toUser(
    db
      .prepare(`
        SELECT u.*
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > ?
      `)
      .get(sessionId, nowIso()),
  );
}

function getUserById(userId) {
  return toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

function updateUserProfile(userId, payload = {}) {
  const updatedAt = nowIso();
  const existing = getUserById(userId);
  const { interests = [], debateBio = "", debateProfile = null } = payload;
  const nextInterests = interests.length ? interests : existing?.interests || [];
  const nextProfile = {
    ...(existing?.debateProfile || {}),
    ...(debateProfile || {}),
  };
  const nextName = payload.name !== undefined ? String(payload.name).trim() || existing?.name : null;
  const nextCountry = payload.country !== undefined ? String(payload.country).trim() || existing?.country : null;

  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        country = COALESCE(?, country),
        survey_completed = 1,
        interests_json = ?,
        debate_bio = ?,
        debate_profile_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    nextName,
    nextCountry,
    json(nextInterests, []),
    String(debateBio || existing?.debateBio || ""),
    json(Object.keys(nextProfile).length ? nextProfile : null, null),
    updatedAt,
    userId,
  );

  return getUserById(userId);
}

function listDebateParticipants(debateId) {
  return db
    .prepare(`
      SELECT p.user_id, u.name, p.stance
      FROM debate_participants p
      JOIN users u ON u.id = p.user_id
      WHERE p.debate_id = ?
      ORDER BY p.rowid ASC
    `)
    .all(debateId)
    .map((row) => ({
      userId: row.user_id,
      name: row.name,
      stance: row.stance,
    }));
}

function getDebateRow(debateId) {
  return db.prepare("SELECT * FROM debates WHERE id = ?").get(debateId);
}

function getDebateContext(debateId) {
  const row = getDebateRow(debateId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    proposalId: row.proposal_id,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    status: row.status,
    turnState: getDebateTurnState(debateId),
    participants: listDebateParticipants(debateId),
  };
}

function getPhaseByTurnIndex(turnIndex, participantCount = 2) {
  return debatePhases[Math.floor(turnIndex / Math.max(participantCount, 1))] || null;
}

function createRawSystemMessage(debateId, text) {
  const id = createId("message");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO chat_messages (id, debate_id, user_id, speaker, body, created_at)
    VALUES (?, ?, NULL, 'system', ?, ?)
  `).run(id, debateId, text, createdAt);

  return listMessages(debateId).find((message) => message.id === id);
}

function getDebateTurnState(debateId) {
  advanceExpiredDebateTurns(debateId);

  const row = getDebateRow(debateId);

  if (!row) {
    return null;
  }

  const participants = listDebateParticipants(debateId);
  const participantCount = Math.max(participants.length, 1);
  const phase = getPhaseByTurnIndex(row.turn_index, participantCount);
  const current = phase ? participants[row.turn_index % participantCount] : null;
  const remainingMs = row.turn_deadline_at ? new Date(row.turn_deadline_at).getTime() - Date.now() : 0;

  return {
    phaseKey: row.phase_key,
    phaseLabel: phase?.label || "Finished",
    status: row.status,
    turnIndex: row.turn_index,
    totalTurns: debatePhases.length * participantCount,
    turnUserId: current?.userId || "",
    turnUserName: current?.name || "",
    turnDeadlineAt: row.turn_deadline_at || "",
    secondsRemaining: Math.max(0, Math.ceil(remainingMs / 1000)),
    isFinished: row.status !== "active" || !phase,
  };
}

function setDebateTurn(debateId, turnIndex, reason = "") {
  const participants = listDebateParticipants(debateId);
  const participantCount = Math.max(participants.length, 1);
  const phase = getPhaseByTurnIndex(turnIndex, participantCount);
  const updatedAt = nowIso();

  if (!phase) {
    db.prepare(`
      UPDATE debates
      SET status = 'closed',
          phase_key = 'finished',
          turn_index = ?,
          turn_deadline_at = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(turnIndex, updatedAt, debateId);
    createRawSystemMessage(debateId, "Debate finished. Review the transcript and notes.");
    return getDebateTurnState(debateId);
  }

  const current = participants[turnIndex % participantCount];
  const deadline = addSecondsIso(updatedAt, phase.durationSeconds);

  db.prepare(`
    UPDATE debates
    SET status = 'active',
        phase_key = ?,
        turn_index = ?,
        turn_deadline_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(phase.key, turnIndex, deadline, updatedAt, debateId);

  if (reason) {
    createRawSystemMessage(
      debateId,
      `${reason} ${phase.label}: ${current?.name || "Next speaker"} is up.`,
    );
  }

  return getDebateTurnState(debateId);
}

function advanceDebateTurn(debateId, reason = "Turn advanced.") {
  const row = getDebateRow(debateId);

  if (!row || row.status !== "active") {
    return getDebateTurnState(debateId);
  }

  return setDebateTurn(debateId, row.turn_index + 1, reason);
}

function advanceExpiredDebateTurns(debateId) {
  let row = getDebateRow(debateId);
  let guard = 0;
  let changed = false;

  while (row?.status === "active" && row.turn_deadline_at && new Date(row.turn_deadline_at).getTime() <= Date.now()) {
    setDebateTurn(debateId, row.turn_index + 1, "Timer expired.");
    row = getDebateRow(debateId);
    guard += 1;
    changed = true;

    if (guard > debatePhases.length * 2 + 2) {
      break;
    }
  }

  return changed;
}

function listDebatesForUser(userId) {
  const debateRows = db
    .prepare(`
      SELECT d.id,
             d.topic_title,
             d.status,
             d.phase_key,
             d.turn_index,
             d.turn_deadline_at,
             d.updated_at,
             p.stance,
             p.detail
      FROM debates d
      JOIN debate_participants p ON p.debate_id = d.id
      WHERE p.user_id = ?
      ORDER BY d.updated_at DESC
    `)
    .all(userId)
    .map((row) => {
      const turnState = getDebateTurnState(row.id);

      return {
        id: row.id,
        topicTitle: row.topic_title,
        status: turnState?.status || row.status,
        stance: row.stance,
        detail: row.detail,
        participants: listDebateParticipants(row.id),
        turnState,
        updatedAt: row.updated_at,
      };
    });
  const requestRows = db
    .prepare(`
      SELECT id, topic_title, stance, updated_at
      FROM match_requests
      WHERE user_id = ? AND status = 'open'
      ORDER BY updated_at DESC
    `)
    .all(userId)
    .map((row) => ({
      id: row.id,
      topicTitle: row.topic_title,
      status: "pending",
      stance: row.stance,
      detail: "Finding an opponent. Match request remains open.",
      updatedAt: row.updated_at,
    }));
  const proposalRows = db
    .prepare(`
      SELECT p.id, p.topic_title, p.status, p.updated_at, u.stance, p.accepted_by_json
      FROM match_proposals p
      JOIN match_proposal_users u ON u.proposal_id = p.id
      WHERE u.user_id = ? AND p.status = 'pending'
      ORDER BY p.updated_at DESC
    `)
    .all(userId)
    .map((row) => {
      const accepted = parseJson(row.accepted_by_json, []);

      return {
        id: row.id,
        topicTitle: row.topic_title,
        status: "pending",
        stance: row.stance,
        detail: accepted.includes(userId)
          ? "You accepted. Waiting for the other side."
          : "Potential match. Waiting for both sides to accept.",
        updatedAt: row.updated_at,
      };
    });

  return [...proposalRows, ...requestRows, ...debateRows].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function listProposalsForUser(userId) {
  return db
    .prepare(`
      SELECT p.*
      FROM match_proposals p
      JOIN match_proposal_users u ON u.proposal_id = p.id
      WHERE u.user_id = ? AND p.status = 'pending'
      ORDER BY p.updated_at DESC
    `)
    .all(userId)
    .map(toProposal);
}

function createMatchProposal(currentRequest, opponentRequest) {
  const id = createId("proposal");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO match_proposals (
      id, topic_id, topic_title, accepted_by_json, created_at, updated_at
    ) VALUES (?, ?, ?, '[]', ?, ?)
  `).run(id, currentRequest.topic_id, currentRequest.topic_title, createdAt, createdAt);

  const insertUser = db.prepare(`
    INSERT INTO match_proposal_users (proposal_id, user_id, stance, request_id)
    VALUES (?, ?, ?, ?)
  `);
  insertUser.run(id, currentRequest.user_id, currentRequest.stance, currentRequest.id);
  insertUser.run(id, opponentRequest.user_id, opponentRequest.stance, opponentRequest.id);

  db.prepare("UPDATE match_requests SET status = 'matched', updated_at = ? WHERE id IN (?, ?)")
    .run(createdAt, currentRequest.id, opponentRequest.id);

  return getProposalById(id);
}

function getRequestMetadata(request) {
  return parseJson(request.metadata_json, {});
}

function getUserMatchSnapshot(userId) {
  const user = getUserById(userId);
  const profile = user?.debateProfile || {};

  return {
    country: user?.country || "",
    interests: user?.interests || [],
    debateStyle: profile.debateStyle || "",
    skillLevel: profile.skillLevel || "",
    preferredPace: profile.preferredPace || "",
    evidencePreference: profile.evidencePreference || "",
    civilityPreference: profile.civilityPreference || "",
    matchingSignals: profile.matchingSignals || {},
  };
}

function scoreRequestCompatibility(currentRequest, candidateRequest) {
  const current = getRequestMetadata(currentRequest);
  const candidate = getRequestMetadata(candidateRequest);
  let score = 0;

  if (current.country && current.country === candidate.country) {
    score += 4;
  }

  if (current.timezone && current.timezone === candidate.timezone) {
    score += 4;
  }

  if (current.debateStyle && current.debateStyle === candidate.debateStyle) {
    score += 6;
  }

  if (current.skillLevel && current.skillLevel === candidate.skillLevel) {
    score += 5;
  }

  if (current.preferredPace && current.preferredPace === candidate.preferredPace) {
    score += 3;
  }

  if (current.evidencePreference && current.evidencePreference === candidate.evidencePreference) {
    score += 4;
  }

  if (current.civilityPreference && current.civilityPreference === candidate.civilityPreference) {
    score += 3;
  }

  const currentInterests = new Set(current.interests || []);
  (candidate.interests || []).forEach((interest) => {
    if (currentInterests.has(interest)) {
      score += 3;
    }
  });

  const currentTags = new Set(current.topicTags || []);
  (candidate.topicTags || []).forEach((tag) => {
    if (currentTags.has(tag)) {
      score += 2;
    }
  });

  return score;
}

function createMatchRequest({ userId, topicId, topicTitle, stance, metadata = {} }) {
  const createdAt = nowIso();
  const userSnapshot = getUserMatchSnapshot(userId);
  const requestMetadata = {
    ...metadata,
    ...userSnapshot,
    requestedAt: createdAt,
  };
  const candidates = db
    .prepare(`
      SELECT *
      FROM match_requests
      WHERE topic_id = ?
        AND status = 'open'
        AND user_id <> ?
        AND stance <> ?
      ORDER BY created_at ASC
    `)
    .all(topicId, userId, stance);

  const currentId = createId("request");
  db.prepare(`
    INSERT INTO match_requests (
      id, user_id, topic_id, topic_title, stance, status, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(currentId, userId, topicId, topicTitle, stance, json(requestMetadata, {}), createdAt, createdAt);

  const current = db.prepare("SELECT * FROM match_requests WHERE id = ?").get(currentId);
  const opposite = candidates
    .map((request) => ({ request, score: scoreRequestCompatibility(current, request) }))
    .sort((a, b) => b.score - a.score || new Date(a.request.created_at).getTime() - new Date(b.request.created_at).getTime())
    .at(0)?.request;

  if (opposite) {
    const proposal = createMatchProposal(current, opposite);

    return {
      status: "proposal",
      request: current,
      proposal,
    };
  }

  return {
    status: "searching",
    request: {
      id: current.id,
      userId: current.user_id,
      topicId: current.topic_id,
      topicTitle: current.topic_title,
      stance: current.stance,
      metadata: requestMetadata,
      requestedAt: current.created_at,
    },
  };
}

function cancelMatchRequest(requestId, userId) {
  const updatedAt = nowIso();
  db.prepare(`
    UPDATE match_requests
    SET status = 'cancelled', updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'open'
  `).run(updatedAt, requestId, userId);
}

function getProposalById(proposalId) {
  return toProposal(db.prepare("SELECT * FROM match_proposals WHERE id = ?").get(proposalId));
}

function getUserName(userId) {
  return db.prepare("SELECT name FROM users WHERE id = ?").get(userId)?.name || "Opponent";
}

function getUserStats(userId) {
  const row = db.prepare("SELECT name, country, xp, created_at, interests_json, debate_bio, debate_profile_json FROM users WHERE id = ?").get(userId);

  if (!row) {
    return {
      country: "Unknown",
      since: "2026",
      xp: 25,
      level: "Newcomer",
      interests: [],
      debateBio: "",
      debateStyle: "Exploratory",
      summary: "",
    };
  }

  const profile = parseJson(row.debate_profile_json, {}) || {};

  return {
    name: row.name,
    country: row.country,
    since: String(new Date(row.created_at).getFullYear()),
    xp: row.xp,
    level: getExperienceLevel(row.xp),
    interests: parseJson(row.interests_json, []),
    debateBio: row.debate_bio,
    debateStyle: profile.debateStyle || "Exploratory",
    summary: profile.summary || "",
  };
}

function clearDebateRuntimeData() {
  db.exec(`
    DELETE FROM ai_insights;
    DELETE FROM annotations;
    DELETE FROM chat_messages;
    DELETE FROM debate_participants;
    DELETE FROM debates;
    DELETE FROM fact_check_reviews;
    DELETE FROM match_proposal_users;
    DELETE FROM match_proposals;
    DELETE FROM match_requests;
  `);

  return getStatus();
}

function toFactCheckReview(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    debateId: row.debate_id,
    userId: row.user_id,
    claimKey: row.claim_key,
    claim: row.claim,
    status: row.status,
    note: row.note,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listFactCheckReviews(debateId, userId) {
  return db
    .prepare(`
      SELECT *
      FROM fact_check_reviews
      WHERE debate_id = ? AND user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(debateId, userId)
    .map(toFactCheckReview);
}

function upsertFactCheckReview({ debateId, userId, claimKey, claim, status, note = "", sourceType = "" }) {
  if (!isDebateParticipant(debateId, userId)) {
    const error = new Error("User is not part of this debate.");
    error.statusCode = 403;
    throw error;
  }

  const safeStatus = String(status || "Needs source").trim();
  const safeClaimKey = String(claimKey || "").trim();
  const safeClaim = String(claim || "").trim();

  if (!safeClaimKey || !safeClaim) {
    const error = new Error("Claim key and claim are required.");
    error.statusCode = 400;
    throw error;
  }

  const existing = db
    .prepare(`
      SELECT id, created_at
      FROM fact_check_reviews
      WHERE debate_id = ? AND user_id = ? AND claim_key = ?
    `)
    .get(debateId, userId, safeClaimKey);
  const updatedAt = nowIso();
  const id = existing?.id || createId("fact");
  const createdAt = existing?.created_at || updatedAt;

  db.prepare(`
    INSERT INTO fact_check_reviews (
      id, debate_id, user_id, claim_key, claim, status, note, source_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(debate_id, user_id, claim_key) DO UPDATE SET
      claim = excluded.claim,
      status = excluded.status,
      note = excluded.note,
      source_type = excluded.source_type,
      updated_at = excluded.updated_at
  `).run(
    id,
    debateId,
    userId,
    safeClaimKey,
    safeClaim,
    safeStatus,
    String(note || "").trim(),
    String(sourceType || "").trim(),
    createdAt,
    updatedAt,
  );

  return toFactCheckReview(
    db
      .prepare("SELECT * FROM fact_check_reviews WHERE debate_id = ? AND user_id = ? AND claim_key = ?")
      .get(debateId, userId, safeClaimKey),
  );
}

function createActiveDebateFromProposal(proposal) {
  const existing = db.prepare("SELECT id FROM debates WHERE proposal_id = ?").get(proposal.id);

  if (existing) {
    return existing.id;
  }

  const createdAt = nowIso();
  const debateId = proposal.id;

  db.prepare(`
    INSERT INTO debates (
      id, proposal_id, topic_id, topic_title, status, phase_key, turn_index, turn_deadline_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'active', 'opening', 0, ?, ?, ?)
  `).run(
    debateId,
    proposal.id,
    proposal.topicId,
    proposal.topicTitle,
    addSecondsIso(createdAt, debatePhases[0].durationSeconds),
    createdAt,
    createdAt,
  );

  const insertParticipant = db.prepare(`
    INSERT INTO debate_participants (debate_id, user_id, stance, detail)
    VALUES (?, ?, ?, ?)
  `);

  proposal.users.forEach((user) => {
    const opponent = proposal.users.find((candidate) => candidate.userId !== user.userId);
    insertParticipant.run(
      debateId,
      user.userId,
      user.stance,
      `Matched with ${getUserName(opponent.userId)}. Your side: ${user.stance}.`,
    );
  });

  createMessage({
    debateId,
    userId: null,
    speaker: "system",
    text: `Debate started. Opening statement: ${getUserName(proposal.users[0].userId)} is up.`,
  });

  return debateId;
}

function acceptProposal(proposalId, userId) {
  const proposal = getProposalById(proposalId);

  if (!proposal || proposal.status !== "pending") {
    const error = new Error("Proposal not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!proposal.users.some((user) => user.userId === userId)) {
    const error = new Error("User is not part of this proposal.");
    error.statusCode = 403;
    throw error;
  }

  const acceptedBy = Array.from(new Set([...proposal.acceptedBy, userId]));
  const updatedAt = nowIso();
  const complete = acceptedBy.length === proposal.users.length;

  db.prepare(`
    UPDATE match_proposals
    SET accepted_by_json = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(json(acceptedBy, []), complete ? "accepted" : "pending", updatedAt, proposalId);

  const updatedProposal = getProposalById(proposalId);
  const debateId = complete ? createActiveDebateFromProposal({ ...updatedProposal, acceptedBy }) : null;

  return {
    proposal: getProposalById(proposalId),
    debateId,
  };
}

function rejectProposal(proposalId, userId) {
  const proposal = getProposalById(proposalId);

  if (!proposal || !proposal.users.some((user) => user.userId === userId)) {
    return null;
  }

  const updatedAt = nowIso();
  db.prepare(`
    UPDATE match_proposals
    SET status = 'rejected', updated_at = ?
    WHERE id = ?
  `).run(updatedAt, proposalId);

  return proposal;
}

function listMessages(debateId) {
  return db
    .prepare(`
      SELECT m.id,
             m.debate_id,
             m.user_id,
             m.speaker,
             m.body,
             m.created_at,
             u.name AS author_name
      FROM chat_messages m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.debate_id = ?
      ORDER BY m.created_at ASC
    `)
    .all(debateId)
    .map((row) => ({
      id: row.id,
      debateId: row.debate_id,
      userId: row.user_id,
      authorName: row.author_name || "",
      speaker: row.speaker,
      text: row.body,
      at: row.created_at,
    }));
}

function isDebateParticipant(debateId, userId) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM debate_participants WHERE debate_id = ? AND user_id = ?")
      .get(debateId, userId),
  );
}

function createMessage({ debateId, userId = null, speaker, text }) {
  if (userId && !isDebateParticipant(debateId, userId)) {
    const error = new Error("User is not part of this debate.");
    error.statusCode = 403;
    throw error;
  }

  if (userId) {
    advanceExpiredDebateTurns(debateId);
    const turnState = getDebateTurnState(debateId);

    if (turnState?.isFinished) {
      const error = new Error("This debate is finished.");
      error.statusCode = 409;
      throw error;
    }

    if (turnState?.turnUserId && turnState.turnUserId !== userId) {
      const error = new Error(`It is ${turnState.turnUserName}'s turn.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const body = String(text || "").trim();

  if (!body) {
    const error = new Error("Message cannot be empty.");
    error.statusCode = 400;
    throw error;
  }

  const id = createId("message");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO chat_messages (id, debate_id, user_id, speaker, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, debateId, userId, speaker, body, createdAt);

  const message = listMessages(debateId).find((candidate) => candidate.id === id);

  if (userId) {
    advanceDebateTurn(debateId, `${getUserName(userId)} submitted.`);
  }

  return message;
}

function listDebateParticipantIds(debateId) {
  return listDebateParticipants(debateId).map((participant) => participant.userId);
}

function listAnnotations(debateId) {
  return db
    .prepare(`
      SELECT id,
             debate_id,
             message_id,
             user_id,
             speaker,
             start_offset,
             end_offset,
             quote,
             note,
             created_at
      FROM annotations
      WHERE debate_id = ?
      ORDER BY created_at DESC
    `)
    .all(debateId)
    .map((row) => ({
      id: row.id,
      debateId: row.debate_id,
      messageId: row.message_id,
      userId: row.user_id,
      speaker: row.speaker,
      start: row.start_offset,
      end: row.end_offset,
      quote: row.quote,
      note: row.note,
      createdAt: row.created_at,
    }));
}

function createAnnotation({ debateId, messageId, userId, speaker, start, end, quote, note }) {
  if (!isDebateParticipant(debateId, userId)) {
    const error = new Error("User is not part of this debate.");
    error.statusCode = 403;
    throw error;
  }

  const id = createId("note");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO annotations (
      id, debate_id, message_id, user_id, speaker, start_offset, end_offset, quote, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, debateId, messageId, userId, speaker, start, end, quote, note, createdAt);

  return listAnnotations(debateId).find((annotation) => annotation.id === id);
}

function getAiInsight(debateId, insightType, transcriptHash) {
  const row = db
    .prepare(`
      SELECT payload_json, created_at
      FROM ai_insights
      WHERE debate_id = ? AND insight_type = ? AND transcript_hash = ?
    `)
    .get(debateId, insightType, transcriptHash);

  if (!row) {
    return null;
  }

  return {
    payload: parseJson(row.payload_json, null),
    createdAt: row.created_at,
  };
}

function saveAiInsight({ debateId, insightType, transcriptHash, payload }) {
  const id = createId("insight");
  const createdAt = nowIso();

  db.prepare(`
    INSERT OR REPLACE INTO ai_insights (
      id, debate_id, insight_type, transcript_hash, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, debateId, insightType, transcriptHash, json(payload, {}), createdAt);

  return getAiInsight(debateId, insightType, transcriptHash);
}

function getStatus() {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;

  return {
    path: dbPath,
    tables,
    userCount,
  };
}

initDatabase();
seedUsers();
migrateLegacyPasswords();
migrateLegacyDebateTurns();

module.exports = {
  createAnnotation,
  acceptProposal,
  cancelMatchRequest,
  clearDebateRuntimeData,
  createMessage,
  createMatchRequest,
  createSession,
  createUser,
  deleteSession,
  listDebateParticipantIds,
  listDebateParticipants,
  listFactCheckReviews,
  getStatus,
  getAiInsight,
  getDebateContext,
  getDebateTurnState,
  getUserByCredentials,
  getUserById,
  getUserBySession,
  isDebateParticipant,
  listAnnotations,
  listDebatesForUser,
  listMessages,
  listProposalsForUser,
  rejectProposal,
  saveAiInsight,
  updateUserProfile,
  upsertFactCheckReview,
};
