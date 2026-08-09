# JobApp

A minimal job board web app: post jobs, apply to them, **export to Excel/CSV, and authenticate with Google/Apple**.

- **Backend/server:** `server.js` — Express (ESM) serving a JSON API and static files.
- **Frontend:** `public/` — plain HTML/CSS/JS (no build step), served by the same server.
- **Data:** in-memory (see `jobs` array in `server.js`); resets on restart. Swap for a real database as the app grows.
- **Export:** Built-in Excel (.xlsx) and CSV export functionality for all jobs.
- **Authentication:** Optional OAuth 2.0 with Google and Apple Sign In (configured via environment variables).

## Cursor Cloud specific instructions

Single Node.js service; no database or external services required.

- Install: `npm install` (this is what the startup update script runs).
- Run (dev): `npm run dev` — starts on `http://localhost:3000` with `node --watch` (auto-reloads on file changes). Override the port with `PORT`.
- Run (prod-ish): `npm start`.
- Test: `npm test` — Node's built-in test runner (`node --test`) against `test/`. Tests import `app` from `server.js`; `server.js` only calls `app.listen` when `NODE_ENV !== "test"`, so the runner binds its own ephemeral port.
- Lint: none configured yet.

Non-obvious notes:
- The API is under `/api` (`GET /api/health`, `GET/POST /api/jobs`, `POST /api/jobs/:id/apply`, `POST /api/import/wttj/mock`, **`GET /api/export/excel`**, **`GET /api/export/csv`**, `GET /api/auth/user`, `GET /api/auth/config`). The frontend at `/` calls these.
- Authentication routes: `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/apple`, `GET /auth/apple/callback`, `GET /auth/logout`.
- OAuth is **optional**: if environment variables for Google/Apple are not set, the app shows "Authentication not configured" instead of login buttons. The app works fully without OAuth.
- Session management uses `express-session` with in-memory store (fine for dev; use Redis/database in production).
- User data is stored in-memory in a `Map` and resets on restart (like jobs data).
- `POST /api/import/wttj/mock` inserts 10 hard-coded mock "Welcome to the Jungle" Product Owner/Manager jobs (no scraping, no external calls). It deduplicates by `url`, so calling it repeatedly imports 0 the second time and returns `{ imported, duplicates, total }`.
- **`GET /api/export/excel`** exports all jobs to Microsoft Excel format (.xlsx) with auto-sized columns and professional formatting.
- **`GET /api/export/csv`** exports all jobs to CSV format with UTF-8 encoding and Excel compatibility.
- Job model fields: `title`, `company`, `location`, `description`, `source`, `url`, `postedAt`, `status`, plus server-managed `id`, `createdAt`, `applications`.
- User model fields: `id`, `provider` (google/apple), `providerId`, `email`, `name`, `photo`, `createdAt`.
- Because the store is in-memory, seeded jobs and any posted/imported jobs/applications disappear on server restart — expected, not a bug. Same for authenticated users.
- **Export files** are generated on-demand and downloaded with timestamped filenames (e.g., `JobApp_Export_2026-08-08.xlsx`).
