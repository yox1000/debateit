import assert from "node:assert";
import topics from "../data/debate-topics.json" with { type: "json" };
import { fuzzyTopicSearch } from "../src/utils/fuzzySearch.js";

const cases = [
  ["facial regonition", "Should facial recognition be banned in public spaces?"],
  ["shoud goverment ban face regonition", "Should facial recognition be banned in public spaces?"],
  ["smartfone school", "Should schools ban smartphones during class hours?"],
  ["college atheletes paid", "Should college athletes be paid directly by universities?"],
  ["Should meta glasses be banned from malls?", "Should facial recognition be banned in public spaces?"],
];

cases.forEach(([query, expected]) => {
  const results = fuzzyTopicSearch(topics, query, 6);
  assert(results.length > 0, `No result for ${query}`);
  assert(
    results.some((topic) => topic.title === expected),
    `Expected "${expected}" for "${query}", got: ${results.map((topic) => topic.title).join(" | ")}`,
  );
});

const semanticResults = fuzzyTopicSearch(topics, "Should meta glasses be banned from malls?", 6);
assert.equal(
  semanticResults[0].title,
  "Should facial recognition be banned in public spaces?",
  `Expected facial recognition to be the strongest semantic result, got: ${semanticResults[0]?.title}`,
);
assert.equal(semanticResults[0].matchType, "Related");

const customRooms = [
  {
    id: "custom-meta-glasses",
    title: "Should Meta glasses be banned from malls?",
    category: "Technology",
    tags: ["smart glasses", "malls", "privacy"],
  },
  ...topics,
];
const customResults = fuzzyTopicSearch(customRooms, "Should meta glasses be banned from malls?", 6);
assert.equal(
  customResults[0].title,
  "Should Meta glasses be banned from malls?",
  `Expected exact custom room to outrank related topics, got: ${customResults[0]?.title}`,
);

console.log("Fuzzy search checks passed");
