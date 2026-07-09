# JobApp

A minimal job board web app: post jobs and apply to them.

- **Backend/server:** `server.js` — Express (ESM) serving a JSON API and static files.
- **Frontend:** `public/` — plain HTML/CSS/JS (no build step), served by the same server.
- **Data:** in-memory (see `jobs` array in `server.js`); resets on restart. Swap for a real database as the app grows.

## Cursor Cloud specific instructions

Single Node.js service; no database or external services required.

- Install: `npm install` (this is what the startup update script runs).
- Run (dev): `npm run dev` — starts on `http://localhost:3000` with `node --watch` (auto-reloads on file changes). Override the port with `PORT`.
- Run (prod-ish): `npm start`.
- Test: `npm test` — Node's built-in test runner (`node --test`) against `test/`. Tests import `app` from `server.js`; `server.js` only calls `app.listen` when `NODE_ENV !== "test"`, so the runner binds its own ephemeral port.
- Lint: none configured yet.

Non-obvious notes:
- The API is under `/api` (`GET /api/health`, `GET/POST /api/jobs`, `POST /api/jobs/:id/apply`). The frontend at `/` calls these.
- Because the store is in-memory, seeded jobs and any posted jobs/applications disappear on server restart — expected, not a bug.
