const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "data");
const dbPath = process.env.DB_PATH || path.join(dataDir, "debateit.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");

function nowIso() {
  return new Date().toISOString();
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

    CREATE INDEX IF NOT EXISTS idx_match_requests_lookup
      ON match_requests(topic_id, stance, status);
    CREATE INDEX IF NOT EXISTS idx_debate_participants_user
      ON debate_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_debate
      ON chat_messages(debate_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_annotations_debate
      ON annotations(debate_id, created_at);
  `);
}

function seedUsers() {
  const createdAt = nowIso();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, name, email, password, xp, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ["empty-account", "Test Account", "", "", 0, "United States"],
    ["alex-account", "Alex", "alex@debate.it", "test", 120, "United States"],
    ["sam-account", "Sam", "sam@debate.it", "test", 95, "Canada"],
  ].forEach((user) => insert.run(...user, createdAt, createdAt));
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
  return toUser(
    db
      .prepare("SELECT * FROM users WHERE email = ? AND password = ?")
      .get(String(email).trim(), String(password)),
  );
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
  `).run(id, String(name || "New Debater").trim(), String(email).trim(), String(password), createdAt, createdAt);

  return getUserById(id);
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

function listDebatesForUser(userId) {
  const debateRows = db
    .prepare(`
      SELECT d.id,
             d.topic_title,
             d.status,
             d.updated_at,
             p.stance,
             p.detail
      FROM debates d
      JOIN debate_participants p ON p.debate_id = d.id
      WHERE p.user_id = ?
      ORDER BY d.updated_at DESC
    `)
    .all(userId)
    .map((row) => ({
      id: row.id,
      topicTitle: row.topic_title,
      status: row.status,
      stance: row.stance,
      detail: row.detail,
      updatedAt: row.updated_at,
    }));
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

function createMatchRequest({ userId, topicId, topicTitle, stance }) {
  const createdAt = nowIso();
  const opposite = db
    .prepare(`
      SELECT *
      FROM match_requests
      WHERE topic_id = ?
        AND status = 'open'
        AND user_id <> ?
        AND stance <> ?
      ORDER BY created_at ASC
      LIMIT 1
    `)
    .get(topicId, userId, stance);

  const currentId = createId("request");
  db.prepare(`
    INSERT INTO match_requests (
      id, user_id, topic_id, topic_title, stance, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(currentId, userId, topicId, topicTitle, stance, createdAt, createdAt);

  const current = db.prepare("SELECT * FROM match_requests WHERE id = ?").get(currentId);

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
    DELETE FROM annotations;
    DELETE FROM chat_messages;
    DELETE FROM debate_participants;
    DELETE FROM debates;
    DELETE FROM match_proposal_users;
    DELETE FROM match_proposals;
    DELETE FROM match_requests;
  `);

  return getStatus();
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
      id, proposal_id, topic_id, topic_title, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'active', ?, ?)
  `).run(debateId, proposal.id, proposal.topicId, proposal.topicTitle, createdAt, createdAt);

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
    text: "Debate started. Keep arguments focused, civil, and evidence-based.",
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
      SELECT id, debate_id, user_id, speaker, body, created_at
      FROM chat_messages
      WHERE debate_id = ?
      ORDER BY created_at ASC
    `)
    .all(debateId)
    .map((row) => ({
      id: row.id,
      debateId: row.debate_id,
      userId: row.user_id,
      speaker: row.speaker,
      text: row.body,
      at: row.created_at,
    }));
}

function createMessage({ debateId, userId = null, speaker, text }) {
  const id = createId("message");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO chat_messages (id, debate_id, user_id, speaker, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, debateId, userId, speaker, text, createdAt);

  return listMessages(debateId).find((message) => message.id === id);
}

function listDebateParticipantIds(debateId) {
  return db
    .prepare("SELECT user_id FROM debate_participants WHERE debate_id = ?")
    .all(debateId)
    .map((row) => row.user_id);
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
  const id = createId("note");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO annotations (
      id, debate_id, message_id, user_id, speaker, start_offset, end_offset, quote, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, debateId, messageId, userId, speaker, start, end, quote, note, createdAt);

  return listAnnotations(debateId).find((annotation) => annotation.id === id);
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

module.exports = {
  createAnnotation,
  acceptProposal,
  cancelMatchRequest,
  clearDebateRuntimeData,
  createMessage,
  createMatchRequest,
  createUser,
  listDebateParticipantIds,
  getStatus,
  getUserByCredentials,
  getUserById,
  listAnnotations,
  listDebatesForUser,
  listMessages,
  listProposalsForUser,
  rejectProposal,
  updateUserProfile,
};
