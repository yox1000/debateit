const crypto = require("crypto");

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashText(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex");
}

function cosineSimilarity(a = [], b = []) {
  const length = Math.min(a.length, b.length);

  if (!length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < length; index += 1) {
    const left = Number(a[index]) || 0;
    const right = Number(b[index]) || 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function makeCacheKey(model, text) {
  return `${model}:${hashText(text)}`;
}

function createTopicDocument(topic) {
  const tags = (topic.tags || []).filter(Boolean).join(", ");

  return [
    `Debate topic: ${topic.title}`,
    `Category: ${topic.category || "General"}`,
    tags ? `Tags: ${tags}` : "",
  ].filter(Boolean).join("\n");
}

function createRoomDocument(room) {
  return [
    `Open debate room: ${room.topic}`,
    `Category: ${room.category || "General"}`,
    `Format: ${room.format || ""}`,
    `Pace: ${room.pace || ""}`,
    `Evidence: ${room.evidence || ""}`,
    `Visibility: ${room.visibility || ""}`,
    `Needs: ${room.need || ""}`,
  ].filter(Boolean).join("\n");
}

function createSearchCandidates({ topics = [], openRooms = [] }) {
  const roomCandidates = openRooms.map((room) => ({
    kind: "room",
    id: room.id || room.topicId || room.topic,
    title: room.topic,
    category: room.category || "General",
    room,
    text: createRoomDocument(room),
  }));
  const topicCandidates = topics.map((topic) => ({
    kind: "topic",
    id: topic.id,
    title: topic.title,
    category: topic.category || "General",
    topic,
    text: createTopicDocument(topic),
  }));

  return [...roomCandidates, ...topicCandidates].filter((candidate) => candidate.title && candidate.text);
}

async function requestEmbeddingBatch({ input, apiUrl, apiKey, model }) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `Embeddings request failed: ${response.status}`);
  }

  if (!Array.isArray(data.data)) {
    throw new Error("Embeddings response missing data array.");
  }

  return data.data.map((item) => item.embedding);
}

async function getEmbeddings({ texts, database, provider, apiUrl, apiKey, model }) {
  const vectors = new Array(texts.length);
  const missing = [];

  texts.forEach((text, index) => {
    const cacheKey = makeCacheKey(model, text);
    const cached = database.getSearchEmbedding(cacheKey);

    if (cached?.vector?.length) {
      vectors[index] = cached.vector;
      return;
    }

    missing.push({ index, text, cacheKey });
  });

  for (let start = 0; start < missing.length; start += 64) {
    const batch = missing.slice(start, start + 64);
    const batchVectors = await requestEmbeddingBatch({
      input: batch.map((item) => item.text),
      apiUrl,
      apiKey,
      model,
    });

    batch.forEach((item, batchIndex) => {
      const vector = batchVectors[batchIndex] || [];
      vectors[item.index] = vector;
      database.upsertSearchEmbedding({
        cacheKey: item.cacheKey,
        provider,
        model,
        text: item.text,
        vector,
      });
    });
  }

  return vectors;
}

async function searchWithEmbeddings({ query, topics, openRooms, database, config }) {
  const cleanQuery = normalize(query);

  if (!cleanQuery) {
    return { source: "embedding", results: [] };
  }

  if (!config.apiUrl || !config.apiKey || !config.model) {
    const error = new Error("Embeddings are not configured.");
    error.statusCode = 503;
    throw error;
  }

  const candidates = createSearchCandidates({ topics, openRooms });
  const documents = [cleanQuery, ...candidates.map((candidate) => candidate.text)];
  const vectors = await getEmbeddings({
    texts: documents,
    database,
    provider: config.provider,
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    model: config.model,
  });
  const queryVector = vectors[0] || [];

  const results = candidates
    .map((candidate, index) => {
      const similarity = cosineSimilarity(queryVector, vectors[index + 1] || []);
      const score = Math.max(0, Math.min(100, Math.round(similarity * 100)));

      return {
        kind: candidate.kind,
        id: candidate.id,
        title: candidate.title,
        category: candidate.category,
        searchScore: score,
        matchType: candidate.kind === "room" ? "Open room" : "Semantic",
        room: candidate.room,
        topic: candidate.topic,
      };
    })
    .filter((result) => result.searchScore >= 32)
    .sort((a, b) => {
      if (a.kind !== b.kind && Math.abs(a.searchScore - b.searchScore) <= 4) {
        return a.kind === "room" ? -1 : 1;
      }

      return b.searchScore - a.searchScore || a.title.localeCompare(b.title);
    })
    .slice(0, 8);

  return {
    source: "embedding",
    model: config.model,
    results,
  };
}

async function primeSearchEmbeddings({ topics, openRooms, database, config }) {
  if (!config.apiUrl || !config.apiKey || !config.model) {
    return { source: "local-fallback", indexed: 0, reason: "Embeddings are not configured." };
  }

  const candidates = createSearchCandidates({ topics, openRooms });

  await getEmbeddings({
    texts: candidates.map((candidate) => candidate.text),
    database,
    provider: config.provider,
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    model: config.model,
  });

  return {
    source: "embedding",
    model: config.model,
    indexed: candidates.length,
  };
}

module.exports = {
  primeSearchEmbeddings,
  searchWithEmbeddings,
};
