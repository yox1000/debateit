function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeaningfulTerms(query = "") {
  const stopWords = new Set(["a", "an", "and", "are", "be", "do", "does", "for", "from", "in", "is", "of", "on", "or", "should", "the", "to"]);

  return normalize(query)
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term));
}

function getClientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();

  return forwarded || request.socket?.remoteAddress || "unknown";
}

function createSearchLimiter({
  perMinute = Number(process.env.SEARCH_EMBEDDINGS_PER_MINUTE || 20),
  perDay = Number(process.env.SEARCH_EMBEDDINGS_PER_DAY || 200),
} = {}) {
  const minuteBuckets = new Map();
  const dayBuckets = new Map();

  function assertAllowed({ request, user, query }) {
    const terms = getMeaningfulTerms(query);

    if (normalize(query).length < 4 || terms.length < 2) {
      const error = new Error("Search query is too short for semantic search.");
      error.statusCode = 400;
      throw error;
    }

    const actor = user?.id || getClientIp(request);
    const now = Date.now();
    const minuteWindowStart = now - 60_000;
    const recent = (minuteBuckets.get(actor) || []).filter((timestamp) => timestamp > minuteWindowStart);

    if (recent.length >= perMinute) {
      const error = new Error("Search rate limit exceeded. Try again in a minute.");
      error.statusCode = 429;
      throw error;
    }

    recent.push(now);
    minuteBuckets.set(actor, recent);

    const dayKey = `${new Date().toISOString().slice(0, 10)}:${actor}`;
    const dayCount = dayBuckets.get(dayKey) || 0;

    if (dayCount >= perDay) {
      const error = new Error("Daily semantic search limit exceeded.");
      error.statusCode = 429;
      throw error;
    }

    dayBuckets.set(dayKey, dayCount + 1);
  }

  return {
    assertAllowed,
  };
}

module.exports = {
  createSearchLimiter,
  getMeaningfulTerms,
};
