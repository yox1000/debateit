const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "evals", "prompt-fixtures.json"), "utf8"));

function loadPrompt(promptName) {
  return JSON.parse(fs.readFileSync(path.join(root, "prompts", `${promptName}.v1.json`), "utf8"));
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

fixtures.forEach((fixture) => {
  const prompt = loadPrompt(fixture.promptName);
  const missingKeys = fixture.requiredKeys.filter((key) => !(prompt.requiredKeys || []).includes(key));

  if (missingKeys.length) {
    fail(`${fixture.name}: prompt missing required keys: ${missingKeys.join(", ")}`);
  }

  if (!prompt.system || prompt.system.length < 40) {
    fail(`${fixture.name}: system prompt is too short`);
  }

  if (!prompt.userTemplate?.task) {
    fail(`${fixture.name}: userTemplate.task is missing`);
  }

  if (prompt.temperature < 0 || prompt.temperature > 1) {
    fail(`${fixture.name}: temperature must be between 0 and 1`);
  }

  console.log(`ok ${fixture.name} -> ${prompt.id}@${prompt.version}`);
});
