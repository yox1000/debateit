const assert = require("assert");

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8080";
let cookie = "";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }

  const text = await response.text();

  assert(response.ok, `${path} returned ${response.status}: ${text.slice(0, 120)}`);
  return text;
}

function get(path) {
  return request(path);
}

function postJson(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  const html = await get("/");
  assert(html.includes("<div id=\"root\"></div>"), "React root was not served");
  assert(html.includes("/assets/"), "Built asset references were not served");

  const topics = JSON.parse(await get("/api/topics"));
  assert(Array.isArray(topics.topics), "Topics response missing topics array");
  assert(topics.topics.length >= 100, "Expected at least 100 test topics");

  const rooms = JSON.parse(await get("/api/open-rooms"));
  assert(Array.isArray(rooms.rooms), "Open rooms response missing rooms array");
  assert(rooms.rooms.length > 0, "Expected prototype open rooms");

  await postJson("/api/auth/login", { email: "", password: "" });
  const search = JSON.parse(await get("/api/search?q=meta%20glasses%20malls"));
  assert(["embedding", "local-fallback"].includes(search.source), "Search response missing source");
  assert(Array.isArray(search.results), "Search response missing results array");

  console.log("Smoke checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
