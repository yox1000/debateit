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
const defaultRoomConfig = {
  sourceRoomId: "",
  visibility: "Public",
  format: "1v1",
  sideSize: "1",
  pace: "Timed rounds",
  evidence: "Evidence encouraged",
};
const pacePhaseDurations = {
  "Rapid fire": [90, 90, 60, 60],
  "Timed rounds": [180, 180, 120, 120],
  "Slow evidence review": [300, 300, 180, 180],
};

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

function normalizeRoomConfig(config = {}) {
  return {
    sourceRoomId: String(config.sourceRoomId || "").trim(),
    visibility: String(config.visibility || defaultRoomConfig.visibility).trim() || defaultRoomConfig.visibility,
    format: String(config.format || defaultRoomConfig.format).trim() || defaultRoomConfig.format,
    sideSize: String(config.sideSize || config.side_size || defaultRoomConfig.sideSize).trim() || defaultRoomConfig.sideSize,
    pace: String(config.pace || defaultRoomConfig.pace).trim() || defaultRoomConfig.pace,
    evidence: String(config.evidence || defaultRoomConfig.evidence).trim() || defaultRoomConfig.evidence,
  };
}

function getRoomConfigFromRow(row = {}) {
  return normalizeRoomConfig({
    sourceRoomId: row.source_room_id || row.id || "",
    visibility: row.visibility,
    format: row.format,
    sideSize: row.side_size,
    pace: row.pace,
    evidence: row.evidence,
  });
}

function getPhasePlanForConfig(config = {}) {
  const normalized = normalizeRoomConfig(config);
  const durations = pacePhaseDurations[normalized.pace] || pacePhaseDurations[defaultRoomConfig.pace];

  return debatePhases.map((phase, index) => ({
    ...phase,
    durationSeconds: durations[index] || phase.durationSeconds,
  }));
}

function parseRoomConfig(value, fallback = defaultRoomConfig) {
  return normalizeRoomConfig(parseJson(value, fallback) || fallback);
}

function roomConfigsCompatible(currentRequest, candidateRequest) {
  const current = parseRoomConfig(currentRequest.room_config_json);
  const candidate = parseRoomConfig(candidateRequest.room_config_json);
  const currentSource = currentRequest.source_room_id || current.sourceRoomId;
  const candidateSource = candidateRequest.source_room_id || candidate.sourceRoomId;

  if (currentSource || candidateSource) {
    return currentSource && candidateSource && currentSource === candidateSource;
  }

  return ["visibility", "format", "sideSize", "pace", "evidence"].every((key) => current[key] === candidate[key]);
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
      source_room_id TEXT NOT NULL DEFAULT '',
      room_config_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_proposals (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      source_room_id TEXT NOT NULL DEFAULT '',
      room_config_json TEXT NOT NULL DEFAULT '{}',
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
      source_room_id TEXT NOT NULL DEFAULT '',
      room_config_json TEXT NOT NULL DEFAULT '{}',
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

    CREATE TABLE IF NOT EXISTS open_rooms (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      host_name TEXT NOT NULL DEFAULT 'Host',
      visibility TEXT NOT NULL DEFAULT 'Public',
      format TEXT NOT NULL DEFAULT '1v1',
      side_size TEXT NOT NULL DEFAULT '1',
      need TEXT NOT NULL DEFAULT 'opponent',
      pace TEXT NOT NULL DEFAULT 'Timed rounds',
      evidence TEXT NOT NULL DEFAULT 'Evidence encouraged',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(requester_id <> recipient_id),
      UNIQUE(requester_id, recipient_id)
    );

    CREATE TABLE IF NOT EXISTS friendships (
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY(user_a_id, user_b_id),
      CHECK(user_a_id <> user_b_id)
    );

    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id TEXT PRIMARY KEY,
      feature TEXT NOT NULL,
      prompt_id TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      prompt_variant TEXT NOT NULL DEFAULT 'default',
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      input_hash TEXT NOT NULL,
      output_json TEXT,
      score INTEGER,
      review_note TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS search_embeddings (
      cache_key TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'openai-compatible',
      model TEXT NOT NULL,
      text TEXT NOT NULL,
      vector_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    CREATE INDEX IF NOT EXISTS idx_open_rooms_status
      ON open_rooms(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient
      ON friend_requests(recipient_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_friendships_user_b
      ON friendships(user_b_id);
    CREATE INDEX IF NOT EXISTS idx_ai_request_logs_feature
      ON ai_request_logs(feature, created_at);
    CREATE INDEX IF NOT EXISTS idx_search_embeddings_model
      ON search_embeddings(model, updated_at);
  `);

  ensureColumn("match_requests", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("match_requests", "source_room_id", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("match_requests", "room_config_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("match_proposals", "source_room_id", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("match_proposals", "room_config_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("debates", "phase_key", "TEXT NOT NULL DEFAULT 'opening'");
  ensureColumn("debates", "turn_index", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("debates", "turn_deadline_at", "TEXT");
  ensureColumn("debates", "source_room_id", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("debates", "room_config_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("ai_request_logs", "score", "INTEGER");
  ensureColumn("ai_request_logs", "review_note", "TEXT NOT NULL DEFAULT ''");
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
    sourceRoomId: row.source_room_id || "",
    roomConfig: parseRoomConfig(row.room_config_json),
    acceptedBy: parseJson(row.accepted_by_json, []),
    users,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOpenRoom(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    topicId: row.topic_id,
    topic: row.topic_title,
    category: row.category,
    hostUserId: row.host_user_id,
    host: row.host_name,
    visibility: row.visibility,
    format: row.format,
    sideSize: row.side_size,
    need: row.need,
    pace: row.pace,
    evidence: row.evidence,
    roomConfig: getRoomConfigFromRow(row),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFriendPair(userAId, userBId) {
  return [String(userAId), String(userBId)].sort();
}

function toFriendRequest(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status,
    requester: {
      id: row.requester_id,
      name: row.requester_name || getUserName(row.requester_id),
      stats: getUserStats(row.requester_id),
    },
    recipient: {
      id: row.recipient_id,
      name: row.recipient_name || getUserName(row.recipient_id),
      stats: getUserStats(row.recipient_id),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function areFriends(userAId, userBId) {
  if (!userAId || !userBId || userAId === userBId) {
    return false;
  }

  const [userA, userB] = normalizeFriendPair(userAId, userBId);

  return Boolean(db.prepare("SELECT 1 FROM friendships WHERE user_a_id = ? AND user_b_id = ?").get(userA, userB));
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

function listOpenRooms(limit = 50) {
  return db
    .prepare(`
      SELECT *
      FROM open_rooms
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .map(toOpenRoom);
}

function createOpenRoom({ userId, topicId, topicTitle, category, visibility, format, sideSize, pace, evidence }) {
  const host = getUserById(userId);

  if (!host) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const title = String(topicTitle || "").trim();

  if (!title) {
    const error = new Error("Topic is required.");
    error.statusCode = 400;
    throw error;
  }

  const createdAt = nowIso();
  const id = createId("room");
  const safeSideSize = String(sideSize || "1").trim();
  const need = safeSideSize === "1" ? "opponent" : `${safeSideSize} per side`;

  db.prepare(`
    INSERT INTO open_rooms (
      id, topic_id, topic_title, category, host_user_id, host_name,
      visibility, format, side_size, need, pace, evidence, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    id,
    String(topicId || id).trim(),
    title,
    String(category || "General").trim() || "General",
    host.id,
    host.name || "Host",
    String(visibility || "Public").trim() || "Public",
    String(format || "1v1").trim() || "1v1",
    safeSideSize || "1",
    need,
    String(pace || "Timed rounds").trim() || "Timed rounds",
    String(evidence || "Evidence encouraged").trim() || "Evidence encouraged",
    createdAt,
    createdAt,
  );

  return toOpenRoom(db.prepare("SELECT * FROM open_rooms WHERE id = ?").get(id));
}

function listOpenRoomsForUser(userId = "") {
  const rooms = listOpenRooms(200);

  return rooms.filter((room) => {
    if (room.visibility === "Public") {
      return true;
    }

    if (room.hostUserId === userId) {
      return true;
    }

    if (room.visibility === "Friends") {
      return areFriends(userId, room.hostUserId);
    }

    if (room.visibility === "Followers") {
      return areFriends(userId, room.hostUserId);
    }

    return false;
  });
}

function getFriendStatus(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) {
    return "unknown";
  }

  if (currentUserId === targetUserId) {
    return "self";
  }

  if (areFriends(currentUserId, targetUserId)) {
    return "friends";
  }

  const request = db
    .prepare(`
      SELECT *
      FROM friend_requests
      WHERE status = 'pending'
        AND (
          (requester_id = ? AND recipient_id = ?)
          OR (requester_id = ? AND recipient_id = ?)
        )
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(currentUserId, targetUserId, targetUserId, currentUserId);

  if (!request) {
    return "none";
  }

  return request.requester_id === currentUserId ? "outgoing" : "incoming";
}

function sendFriendRequest(requesterId, recipientId) {
  if (requesterId === recipientId) {
    const error = new Error("You cannot friend yourself.");
    error.statusCode = 400;
    throw error;
  }

  if (!getUserById(recipientId)) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  if (areFriends(requesterId, recipientId)) {
    return { status: "friends", request: null };
  }

  const reverse = db
    .prepare("SELECT * FROM friend_requests WHERE requester_id = ? AND recipient_id = ? AND status = 'pending'")
    .get(recipientId, requesterId);

  if (reverse) {
    return acceptFriendRequest(reverse.id, requesterId);
  }

  const existing = db
    .prepare("SELECT * FROM friend_requests WHERE requester_id = ? AND recipient_id = ? AND status = 'pending'")
    .get(requesterId, recipientId);

  if (existing) {
    return { status: "outgoing", request: toFriendRequest(existing) };
  }

  const previous = db
    .prepare("SELECT * FROM friend_requests WHERE requester_id = ? AND recipient_id = ?")
    .get(requesterId, recipientId);

  if (previous) {
    const updatedAt = nowIso();

    db.prepare("UPDATE friend_requests SET status = 'pending', updated_at = ? WHERE id = ?").run(updatedAt, previous.id);

    return {
      status: "outgoing",
      request: getFriendRequestById(previous.id),
    };
  }

  const id = createId("friend-request");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO friend_requests (id, requester_id, recipient_id, status, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(id, requesterId, recipientId, createdAt, createdAt);

  return {
    status: "outgoing",
    request: getFriendRequestById(id),
  };
}

function getFriendRequestById(requestId) {
  return toFriendRequest(
    db
      .prepare(`
        SELECT fr.*,
               requester.name AS requester_name,
               recipient.name AS recipient_name
        FROM friend_requests fr
        JOIN users requester ON requester.id = fr.requester_id
        JOIN users recipient ON recipient.id = fr.recipient_id
        WHERE fr.id = ?
      `)
      .get(requestId),
  );
}

function acceptFriendRequest(requestId, currentUserId) {
  const request = getFriendRequestById(requestId);

  if (!request || request.status !== "pending") {
    const error = new Error("Friend request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (request.recipientId !== currentUserId) {
    const error = new Error("Only the recipient can accept this request.");
    error.statusCode = 403;
    throw error;
  }

  const updatedAt = nowIso();
  const [userA, userB] = normalizeFriendPair(request.requesterId, request.recipientId);

  db.prepare("UPDATE friend_requests SET status = 'accepted', updated_at = ? WHERE id = ?").run(updatedAt, requestId);
  db.prepare(`
    INSERT OR IGNORE INTO friendships (user_a_id, user_b_id, created_at)
    VALUES (?, ?, ?)
  `).run(userA, userB, updatedAt);

  return {
    status: "friends",
    request: getFriendRequestById(requestId),
  };
}

function rejectFriendRequest(requestId, currentUserId) {
  const request = getFriendRequestById(requestId);

  if (!request || request.status !== "pending") {
    return null;
  }

  if (request.recipientId !== currentUserId && request.requesterId !== currentUserId) {
    const error = new Error("You are not part of this friend request.");
    error.statusCode = 403;
    throw error;
  }

  const status = request.requesterId === currentUserId ? "cancelled" : "rejected";
  db.prepare("UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), requestId);

  return {
    status,
    request: getFriendRequestById(requestId),
  };
}

function listFriendRequestsForUser(userId) {
  return db
    .prepare(`
      SELECT fr.*,
             requester.name AS requester_name,
             recipient.name AS recipient_name
      FROM friend_requests fr
      JOIN users requester ON requester.id = fr.requester_id
      JOIN users recipient ON recipient.id = fr.recipient_id
      WHERE (fr.requester_id = ? OR fr.recipient_id = ?)
        AND fr.status = 'pending'
      ORDER BY fr.updated_at DESC
    `)
    .all(userId, userId)
    .map(toFriendRequest);
}

function listFriendsForUser(userId) {
  return db
    .prepare(`
      SELECT CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END AS friend_id,
             created_at
      FROM friendships
      WHERE user_a_id = ? OR user_b_id = ?
      ORDER BY created_at DESC
    `)
    .all(userId, userId, userId)
    .map((row) => {
      const user = getUserById(row.friend_id);

      return {
        id: user.id,
        name: user.name,
        country: user.country,
        xp: user.xp,
        stats: getUserStats(user.id),
        createdAt: row.created_at,
      };
    });
}

function removeFriend(currentUserId, friendUserId) {
  const [userA, userB] = normalizeFriendPair(currentUserId, friendUserId);

  db.prepare("DELETE FROM friendships WHERE user_a_id = ? AND user_b_id = ?").run(userA, userB);
  db.prepare(`
    UPDATE friend_requests
    SET status = 'removed', updated_at = ?
    WHERE status = 'accepted'
      AND (
        (requester_id = ? AND recipient_id = ?)
        OR (requester_id = ? AND recipient_id = ?)
      )
  `).run(nowIso(), currentUserId, friendUserId, friendUserId, currentUserId);

  return {
    status: "none",
  };
}

function getPublicUserProfile(targetUserId, viewerId) {
  const user = getUserById(targetUserId);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    country: user.country,
    xp: user.xp,
    interests: user.interests,
    debateBio: user.debateBio,
    debateProfile: user.debateProfile,
    stats: getUserStats(user.id),
    friendStatus: getFriendStatus(viewerId, user.id),
    friendCount: listFriendsForUser(user.id).length,
    createdAt: user.createdAt,
  };
}

function getSearchEmbedding(cacheKey) {
  const row = db.prepare("SELECT * FROM search_embeddings WHERE cache_key = ?").get(cacheKey);

  if (!row) {
    return null;
  }

  return {
    cacheKey: row.cache_key,
    provider: row.provider,
    model: row.model,
    text: row.text,
    vector: parseJson(row.vector_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function upsertSearchEmbedding({ cacheKey, provider = "openai-compatible", model, text, vector }) {
  const updatedAt = nowIso();
  const existing = getSearchEmbedding(cacheKey);
  const createdAt = existing?.createdAt || updatedAt;

  db.prepare(`
    INSERT INTO search_embeddings (
      cache_key, provider, model, text, vector_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      provider = excluded.provider,
      model = excluded.model,
      text = excluded.text,
      vector_json = excluded.vector_json,
      updated_at = excluded.updated_at
  `).run(
    cacheKey,
    String(provider || "openai-compatible"),
    String(model || ""),
    String(text || ""),
    json(vector || [], []),
    createdAt,
    updatedAt,
  );

  return getSearchEmbedding(cacheKey);
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

function listDebateParticipantsForUser(debateId, viewerId) {
  return listDebateParticipants(debateId).map((participant) => ({
    ...participant,
    stats: getUserStats(participant.userId),
    friendStatus: getFriendStatus(viewerId, participant.userId),
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
    sourceRoomId: row.source_room_id || "",
    roomConfig: parseRoomConfig(row.room_config_json),
    status: row.status,
    turnState: getDebateTurnState(debateId),
    participants: listDebateParticipants(debateId),
  };
}

function getDebatePhasePlan(debateId) {
  const row = getDebateRow(debateId);

  return getPhasePlanForConfig(parseRoomConfig(row?.room_config_json));
}

function getPhaseByTurnIndex(turnIndex, participantCount = 2, phasePlan = debatePhases) {
  return phasePlan[Math.floor(turnIndex / Math.max(participantCount, 1))] || null;
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
  const phasePlan = getDebatePhasePlan(debateId);
  const phase = getPhaseByTurnIndex(row.turn_index, participantCount, phasePlan);
  const current = phase ? participants[row.turn_index % participantCount] : null;
  const remainingMs = row.turn_deadline_at ? new Date(row.turn_deadline_at).getTime() - Date.now() : 0;

  return {
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    sourceRoomId: row.source_room_id || "",
    roomConfig: parseRoomConfig(row.room_config_json),
    phasePlan,
    phaseKey: row.phase_key,
    phaseLabel: phase?.label || "Finished",
    status: row.status,
    turnIndex: row.turn_index,
    totalTurns: phasePlan.length * participantCount,
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
  const phasePlan = getDebatePhasePlan(debateId);
  const phase = getPhaseByTurnIndex(turnIndex, participantCount, phasePlan);
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

    if (guard > getDebatePhasePlan(debateId).length * 2 + 2) {
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
             d.source_room_id,
             d.room_config_json,
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
        sourceRoomId: row.source_room_id || "",
        roomConfig: parseRoomConfig(row.room_config_json),
        participants: listDebateParticipants(row.id),
        turnState,
        updatedAt: row.updated_at,
      };
    });
  const requestRows = db
    .prepare(`
      SELECT id, topic_title, stance, source_room_id, room_config_json, updated_at
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
      sourceRoomId: row.source_room_id || "",
      roomConfig: parseRoomConfig(row.room_config_json),
      updatedAt: row.updated_at,
    }));
  const proposalRows = db
    .prepare(`
      SELECT p.id, p.topic_title, p.status, p.source_room_id, p.room_config_json, p.updated_at, u.stance, p.accepted_by_json
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
        sourceRoomId: row.source_room_id || "",
        roomConfig: parseRoomConfig(row.room_config_json),
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
    .map(toProposal)
    .map((proposal) => ({
      ...proposal,
      users: proposal.users.map((proposalUser) => ({
        ...proposalUser,
        friendStatus: getFriendStatus(userId, proposalUser.userId),
      })),
    }));
}

function createMatchProposal(currentRequest, opponentRequest) {
  const id = createId("proposal");
  const createdAt = nowIso();
  const sourceRoomId = currentRequest.source_room_id || opponentRequest.source_room_id || "";
  const roomConfig = parseRoomConfig(currentRequest.room_config_json || opponentRequest.room_config_json);

  db.prepare(`
    INSERT INTO match_proposals (
      id, topic_id, topic_title, source_room_id, room_config_json, accepted_by_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '[]', ?, ?)
  `).run(id, currentRequest.topic_id, currentRequest.topic_title, sourceRoomId, json(roomConfig, defaultRoomConfig), createdAt, createdAt);

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

function createMatchRequest({ userId, topicId, topicTitle, stance, sourceRoomId = "", roomConfig = {}, metadata = {} }) {
  const createdAt = nowIso();
  const userSnapshot = getUserMatchSnapshot(userId);
  const safeRoomConfig = normalizeRoomConfig({
    ...roomConfig,
    sourceRoomId: sourceRoomId || roomConfig.sourceRoomId,
  });

  if (safeRoomConfig.sideSize !== "1") {
    const error = new Error("Direct chat matchmaking currently supports 1 per side. This group room remains discoverable.");
    error.statusCode = 400;
    throw error;
  }

  const safeSourceRoomId = safeRoomConfig.sourceRoomId;
  const requestMetadata = {
    ...metadata,
    roomConfig: safeRoomConfig,
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
      id, user_id, topic_id, topic_title, stance, status, source_room_id, room_config_json, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).run(
    currentId,
    userId,
    topicId,
    topicTitle,
    stance,
    safeSourceRoomId,
    json(safeRoomConfig, defaultRoomConfig),
    json(requestMetadata, {}),
    createdAt,
    createdAt,
  );

  const current = db.prepare("SELECT * FROM match_requests WHERE id = ?").get(currentId);
  const opposite = candidates
    .filter((request) => roomConfigsCompatible(current, request))
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
      sourceRoomId: current.source_room_id || "",
      roomConfig: parseRoomConfig(current.room_config_json),
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
  const roomConfig = normalizeRoomConfig(proposal.roomConfig);
  const phasePlan = getPhasePlanForConfig(roomConfig);

  db.prepare(`
    INSERT INTO debates (
      id, proposal_id, topic_id, topic_title, status, phase_key, turn_index,
      turn_deadline_at, source_room_id, room_config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'active', 'opening', 0, ?, ?, ?, ?, ?)
  `).run(
    debateId,
    proposal.id,
    proposal.topicId,
    proposal.topicTitle,
    addSecondsIso(createdAt, phasePlan[0].durationSeconds),
    proposal.sourceRoomId || roomConfig.sourceRoomId || "",
    json(roomConfig, defaultRoomConfig),
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

  if (proposal.sourceRoomId) {
    db.prepare("UPDATE open_rooms SET status = 'matched', updated_at = ? WHERE id = ?").run(createdAt, proposal.sourceRoomId);
  }

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

  const message = db
    .prepare("SELECT speaker FROM chat_messages WHERE id = ? AND debate_id = ?")
    .get(messageId, debateId);

  if (!message) {
    const error = new Error("Message not found.");
    error.statusCode = 404;
    throw error;
  }

  if (message.speaker === "system") {
    const error = new Error("System messages cannot be annotated.");
    error.statusCode = 400;
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

function createAiRequestLog({
  feature,
  promptId,
  promptVersion,
  promptVariant = "default",
  status,
  durationMs = 0,
  inputHash,
  output = null,
  error = "",
}) {
  const id = createId("ailog");
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO ai_request_logs (
      id, feature, prompt_id, prompt_version, prompt_variant, status, duration_ms,
      input_hash, output_json, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(feature || "unknown"),
    String(promptId || "unknown"),
    String(promptVersion || "unknown"),
    String(promptVariant || "default"),
    String(status || "unknown"),
    Number(durationMs) || 0,
    String(inputHash || ""),
    output === undefined || output === null ? null : json(output, null),
    String(error || "").slice(0, 1200),
    createdAt,
  );

  return {
    id,
    feature,
    promptId,
    promptVersion,
    promptVariant,
    status,
    durationMs,
    inputHash,
    createdAt,
  };
}

function listAiRequestLogs(limit = 50) {
  return db
    .prepare(`
      SELECT *
      FROM ai_request_logs
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .map((row) => ({
      id: row.id,
      feature: row.feature,
      promptId: row.prompt_id,
      promptVersion: row.prompt_version,
      promptVariant: row.prompt_variant,
      status: row.status,
      durationMs: row.duration_ms,
      inputHash: row.input_hash,
      output: parseJson(row.output_json, null),
      score: row.score,
      reviewNote: row.review_note,
      error: row.error,
      createdAt: row.created_at,
    }));
}

function scoreAiRequestLog(logId, { score = null, reviewNote = "" } = {}) {
  const safeScore = score === null || score === undefined ? null : Math.max(1, Math.min(5, Number(score) || 1));

  db.prepare(`
    UPDATE ai_request_logs
    SET score = ?, review_note = ?
    WHERE id = ?
  `).run(safeScore, String(reviewNote || "").trim(), logId);

  return listAiRequestLogs(200).find((log) => log.id === logId) || null;
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
  createAiRequestLog,
  acceptProposal,
  cancelMatchRequest,
  clearDebateRuntimeData,
  createMessage,
  createMatchRequest,
  createOpenRoom,
  createSession,
  createUser,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  deleteSession,
  getFriendStatus,
  getPublicUserProfile,
  listDebateParticipantIds,
  listDebateParticipants,
  listDebateParticipantsForUser,
  listAiRequestLogs,
  listFactCheckReviews,
  listFriendsForUser,
  listFriendRequestsForUser,
  listOpenRooms,
  listOpenRoomsForUser,
  getStatus,
  getAiInsight,
  getDebateContext,
  getDebateTurnState,
  getSearchEmbedding,
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
  scoreAiRequestLog,
  sendFriendRequest,
  updateUserProfile,
  upsertSearchEmbedding,
  upsertFactCheckReview,
};
