const typoHints = {
  ai: ["artificial intelligence", "algorithm", "automation"],
  face: ["facial", "recognition", "biometric"],
  gov: ["government", "politics", "public"],
  govt: ["government", "politics", "public"],
  nba: ["basketball", "sports", "athletes"],
  phone: ["smartphone", "phones", "school"],
};

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "be",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "shoud",
  "the",
  "to",
]);

const lowValueTerms = new Set(["ban", "banned", "required", "allow", "allowed"]);

const semanticConcepts = [
  {
    name: "privacy and surveillance",
    terms: [
      "biometric",
      "biometrics",
      "camera",
      "cameras",
      "facial",
      "face",
      "glasses",
      "mall",
      "malls",
      "meta",
      "privacy",
      "public spaces",
      "recognition",
      "recording",
      "smart glasses",
      "surveillance",
      "tracking",
      "wearable",
      "wearables",
    ],
  },
  {
    name: "public space rules",
    terms: ["airport", "airports", "campus", "cities", "city", "downtown", "mall", "malls", "public", "public spaces", "school", "schools"],
  },
  {
    name: "consumer technology",
    terms: ["ai", "algorithm", "app", "apps", "automation", "camera", "content", "device", "devices", "glasses", "meta", "platform", "platforms", "smartphone", "technology", "wearable"],
  },
  {
    name: "civil liberties",
    terms: ["civil liberties", "constitutional", "fourth amendment", "government", "law", "legal", "police", "privacy", "rights", "surveillance"],
  },
];

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function wordSimilarity(queryWord, candidateWord) {
  if (!queryWord || !candidateWord) return 0;
  if (candidateWord === queryWord) return 1;

  if (queryWord.length <= 2 || candidateWord.length <= 2) {
    return 0;
  }

  if (candidateWord.startsWith(queryWord) || queryWord.startsWith(candidateWord)) return 0.88;
  if (queryWord.length >= 4 && candidateWord.includes(queryWord)) return 0.78;
  if (candidateWord.length >= 4 && queryWord.includes(candidateWord)) return 0.78;

  const distance = levenshtein(queryWord, candidateWord);
  const longest = Math.max(queryWord.length, candidateWord.length);
  const similarity = 1 - distance / longest;

  if (queryWord.length <= 4 && distance <= 1) return Math.max(similarity, 0.72);
  if (queryWord.length > 4 && distance <= 2) return Math.max(similarity, 0.7);

  return similarity;
}

function expandTerms(terms) {
  return terms.flatMap((term) => [term, ...(typoHints[term] || [])]);
}

function getSearchTerms(query) {
  const normalizedQuery = normalize(query);
  const baseTerms = normalizedQuery
    .split(" ")
    .filter((term) => term && !stopWords.has(term));

  return expandTerms(baseTerms);
}

function getSemanticHits(value = "") {
  const normalizedValue = normalize(value);
  const words = new Set(normalizedValue.split(" ").filter(Boolean));

  return semanticConcepts
    .filter((concept) => concept.terms.some((term) => {
      const normalizedTerm = normalize(term);
      return normalizedTerm.includes(" ") ? normalizedValue.includes(normalizedTerm) : words.has(normalizedTerm);
    }))
    .map((concept) => concept.name);
}

function scoreTopic(topic, query) {
  const normalizedQuery = normalize(query);
  const terms = getSearchTerms(query);
  const title = normalize(topic.title);
  const category = normalize(topic.category);
  const tags = (topic.tags || []).map(normalize);
  const haystack = [title, category, ...tags].join(" ");
  const words = haystack.split(" ").filter(Boolean);

  let lexicalScore = 0;

  if (normalizedQuery && title.includes(normalizedQuery)) lexicalScore += 55;
  if (normalizedQuery && haystack.includes(normalizedQuery)) lexicalScore += 40;

  terms.forEach((term) => {
    let best = 0;
    words.forEach((word) => {
      best = Math.max(best, wordSimilarity(term, word));
    });
    lexicalScore += best * (lowValueTerms.has(term) ? 8 : 18);
  });

  if (terms.length) {
    const coverage = terms.filter((term) => words.some((word) => wordSimilarity(term, word) >= 0.7)).length / terms.length;
    lexicalScore += coverage * 35;
  }

  const queryConcepts = new Set(getSemanticHits(normalizedQuery));
  const topicConcepts = new Set(getSemanticHits(haystack));
  const sharedConcepts = [...queryConcepts].filter((concept) => topicConcepts.has(concept));
  const semanticScore = queryConcepts.size
    ? Math.round((sharedConcepts.length / queryConcepts.size) * 68 + Math.min(sharedConcepts.length, 3) * 6)
    : 0;
  const searchScore = Math.round(Math.min(100, Math.max(lexicalScore, semanticScore, lexicalScore * 0.72 + semanticScore * 0.45)));

  return {
    searchScore,
    lexicalScore: Math.round(Math.min(100, lexicalScore)),
    semanticScore: Math.round(Math.min(100, semanticScore)),
    matchType: lexicalScore >= 44 ? "Text match" : semanticScore >= 38 ? "Related" : "Weak",
    sharedConcepts,
  };
}

export function fuzzyTopicSearch(topics, query, limit = 6) {
  return topics
    .map((topic) => ({ ...topic, ...scoreTopic(topic, query) }))
    .filter((topic) => topic.searchScore >= 38)
    .sort((a, b) => {
      if (b.lexicalScore !== a.lexicalScore && Math.max(b.lexicalScore, a.lexicalScore) >= 70) {
        return b.lexicalScore - a.lexicalScore;
      }

      return b.searchScore - a.searchScore || b.semanticScore - a.semanticScore || a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

export function cleanSearchQuery(query) {
  return normalize(query);
}
