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
- The API is under `/api` (`GET /api/health`, `GET/POST /api/jobs`, `POST /api/jobs/:id/apply`, `POST /api/import/wttj/mock`). The frontend at `/` calls these.
- `POST /api/import/wttj/mock` inserts 10 hard-coded mock "Welcome to the Jungle" Product Owner/Manager jobs (no scraping, no external calls). It deduplicates by `url`, so calling it repeatedly imports 0 the second time and returns `{ imported, duplicates, total }`.
- Job model fields: `title`, `company`, `location`, `description`, `source`, `url`, `postedAt`, `status`, plus server-managed `id`, `createdAt`, `applications`.
- Because the store is in-memory, seeded jobs and any posted/imported jobs/applications disappear on server restart — expected, not a bug.
