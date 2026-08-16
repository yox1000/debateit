# Debate.it

Responsive prototype for a debate app.

## Run locally

Install frontend dependencies once:

```bash
npm install
```

For the normal local app served by the Node backend:

```bash
npm run build
node server.js
```

Open `http://localhost:8080`.

For frontend-only React development with Vite hot reload, run the backend in
one terminal:

```bash
node server.js
```

Then run Vite in another terminal:

```bash
npm run dev
```

Open the Vite URL, usually `http://127.0.0.1:5173`. Vite proxies `/api` and
`/ws` to the Node backend.

To use DeepSeek for AI profile generation, topic matching, co-pilot analysis,
post-debate recaps, and citation planning:

```bash
cp .env.example .env
```

Then set `DEEPSEEK_API_KEY` in `.env` and run:

```bash
node server.js
```

Without `DEEPSEEK_API_KEY`, the app uses local fallback generators and still
logs the AI workflow shape.

The server also creates a local SQLite database at:

```bash
data/debateit.sqlite
```

The database file and SQLite WAL/SHM files are ignored by git.

## Mock accounts

- Empty email / empty password
- `alex@debate.it` / `test`
- `sam@debate.it` / `test`

Sign-up creates additional SQLite-backed test accounts.
Each account sees a first-login interests survey before reaching the home screen.

Passwords are stored as scrypt hashes. Login/signup create an HttpOnly session
cookie, and protected API/WebSocket routes use that session instead of trusting
browser-sent user ids.

## Matching engine

- `data/debate-topics.json` contains 100 test debate topics.
- `POST /api/profile` turns the survey response into a debate profile.
- `POST /api/matches` ranks the 100-topic catalog against that profile.
- `GET /api/topics` returns the full topic catalog for testing.
- Match recommendations are cached per mock user until the debate profile or topic catalog version changes.

Opponent matching also snapshots profile preferences including skill level,
preferred pace, evidence style, civility setting, debate style, interests,
country, timezone, and topic tags.

## Prompt Engineering

Versioned prompts live in `prompts/*.v1.json`.

Current prompt families:

- `profile`
- `topic-match`
- `copilot.default`
- `copilot.opening`
- `copilot.rebuttal`
- `copilot.cross-question`
- `copilot.closing`
- `recap`
- `fact-check`
- `claim-classifier`
- `source-evaluator`
- `fact-presentation`
- `citation-search`
- `repair-json`

The server loads prompts by id/version, checks required JSON keys, optionally
repairs malformed JSON through `repair-json`, and logs each AI call in SQLite.
Some prompts include deterministic A/B variants; set `PROMPT_VARIANT` to force
a specific variant during testing.

Run prompt shape evals with:

```bash
node scripts/run-prompt-evals.js
```

AI inspection endpoints:

- `GET /api/ai/prompts`
- `GET /api/ai/logs?limit=50`
- `POST /api/ai/logs/:logId/score`

Citation planning is available through:

- `POST /api/debates/:debateId/citation-plan`

This creates search queries and source targets for a claim. It does not pretend
to verify live citations until a real external search provider is connected.

Trusted-source fact checks are available through:

- `POST /api/debates/:debateId/fact-check-claim`

This runs a chained research workflow:

1. Claim Agent classifies the claim and creates source-aware queries.
2. Search Agent searches public trusted-source APIs, currently Wikipedia,
   Crossref, OpenAlex, CourtListener, Cornell LII, Oyez, and relevant
   government technical references when available.
3. Source Agent ranks the retrieved sources by relevance and authority.
4. Evaluation Agent asks DeepSeek to interpret the claim using only the gathered
   source bundle.
5. Presentation Agent turns the result into a concise Facts tab summary.

The Facts tab keeps a compact verdict in the debate room. Full source
summaries, ranked sources, confidence reasoning, limitations, and the
research-agent trail open in a dedicated fact-check research page so the chat
does not get crowded.

## Database API

Initial SQLite-backed endpoints:

- `GET /api/db/status`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `PUT /api/users/:userId/profile`
- `GET /api/users/:userId/debates`
- `GET /api/users/:userId/proposals`
- `POST /api/match-requests`
- `POST /api/match-requests/:requestId/cancel`
- `POST /api/proposals/:proposalId/accept`
- `POST /api/proposals/:proposalId/reject`
- `GET /api/debates/:debateId/messages`
- `POST /api/debates/:debateId/messages`
- `GET /api/debates/:debateId/annotations`
- `POST /api/debates/:debateId/annotations`
- `GET /api/debates/:debateId/fact-checks`
- `POST /api/debates/:debateId/fact-checks`
- `POST /api/debates/:debateId/copilot`
- `POST /api/debates/:debateId/recap`
- `POST /api/debates/:debateId/citation-plan`
- `POST /api/debates/:debateId/fact-check-claim`

The frontend now writes auth, survey profile, matchmaking, debates, messages,
and annotations through the SQLite API. The browser keeps only a lightweight
session marker and in-memory UI caches; the server-side HttpOnly cookie is the
real auth state.

## Realtime

The server exposes a no-dependency WebSocket endpoint at `/ws`.

- WebSocket upgrades authenticate from the same session cookie.
- Match proposals, proposal accept/reject, debate activation, chat messages,
  annotations, room presence, and typing indicators are pushed live.
- The frontend keeps a slower 30-second polling fallback for recovery if a
  socket disconnects.

## Debate format

Active debates use a fixed turn sequence:

- Opening statement
- Rebuttal
- Cross-question
- Closing statement
- Finished

The database stores the current phase, turn index, and turn deadline. Message
creation is rejected unless the authenticated session belongs to the current
speaker. When a valid message is sent, the server advances to the next turn and
broadcasts the updated debate state. Expired timers advance when clients refresh
debate state through the API.
