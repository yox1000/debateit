# Debate.it

Responsive prototype for a debate app.

## Run locally

```bash
node server.js
```

Open `http://localhost:8080`.

To use DeepSeek for profile generation:

```bash
cp .env.example .env
```

Then set `DEEPSEEK_API_KEY` in `.env` and run:

```bash
node server.js
```

Without `DEEPSEEK_API_KEY`, the app uses a local mock profile generator.

## Mock accounts

- Empty email / empty password
- `alex@debate.it` / `test`
- `sam@debate.it` / `test`

Sign-up creates additional browser-local mock accounts with `localStorage`.
Each account sees a first-login interests survey before reaching the home screen.

## Matching engine

- `data/debate-topics.json` contains 100 test debate topics.
- `POST /api/profile` turns the survey response into a debate profile.
- `POST /api/matches` ranks the 100-topic catalog against that profile.
- `GET /api/topics` returns the full topic catalog for testing.
- Match recommendations are cached per mock user until the debate profile or topic catalog version changes.
