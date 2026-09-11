# Job collection

JobTracker ingests offers through three honest paths:

| Path | Sources | How |
|------|---------|-----|
| **France Travail API** | `/sources` → France Travail → **Run now** | Official Offres d'emploi v2 (`FRANCE_TRAVAIL_*`) |
| **Extension / URL / CSV** | LinkedIn, WTTJ, Indeed, APEC, etc. | Chrome extension or `/imports` — no server scrape |
| **Tracked-search Apify (legacy)** | `/jobs` tracked searches | Mock or Apify actors — not the Sources cards |

Scraping never runs in the browser. LinkedIn / WTTJ / Indeed are **not** synced by the Sources "Run now" button.

```
France Travail API → POST /api/sources/france-travail/sync → jobs
Extension / paste / CSV → /api/import-jobs → jobs
Tracked search (legacy) → Apify/mock → jobs
```

## France Travail (Sources UI)

1. Create an app on [francetravail.io](https://francetravail.io) and subscribe to **Offres d'emploi v2**.
2. Set in `.env`:

```bash
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
# optional: FRANCE_TRAVAIL_SCOPE=api_offresdemploiv2 o2dsoffre
```

3. On `/sources`, France Travail shows **API connectée** when credentials are present.
4. **Run now** calls `POST /api/sources/france-travail/sync` (also available via `POST /api/sync/source/[sourceId]` for that slug only).
5. Without credentials the UI shows **Configurer l’API** and the sync returns **503**.

Criteria come from the user’s enabled France Travail `source_searches` (default: Product Owner / PM Paris). Jobs are deduped by `(user_id, url)` and logged in `sync_logs`.

Other catalog cards link to `/extension` or `/imports?paste=1` — they do not expose server Run now.

## Legacy Apify / tracked searches

```bash
JOB_SYNC_MODE=mock            # mock | apify
JOB_SYNC_SECRET=your-secret   # required for POST /api/sync-jobs
APIFY_TOKEN=                  # required in apify mode
APIFY_WTTJ_ACTOR_ID=          # Welcome to the Jungle actor
APIFY_LINKEDIN_ACTOR_ID=      # LinkedIn Jobs actor
SUPABASE_SERVICE_ROLE_KEY=    # required for multi-user cron
```

## Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/sources/france-travail/sync` | User session | France Travail API sync for current user |
| `POST /api/sync/source/[sourceId]` | User session | FT if slug=`france-travail`; 400 for extension sources |
| `POST /api/tracked-searches/[id]/run` | User session | Run one tracked search now (legacy) |
| `POST /api/tracked-searches/run-all` | User session | Sync all enabled searches for current user |
| `POST /api/sync-jobs` | `Authorization: Bearer <JOB_SYNC_SECRET>` | Cron — all users, all enabled searches |

## Sync flow

1. User creates a tracked search on `/jobs`
2. User clicks **Run now** (or cron calls `/api/sync-jobs`)
3. API loads tracked search criteria
4. Connectors fetch jobs (`lib/connectors/mock.ts` or `lib/connectors/apify.ts`)
5. Jobs are normalized to app format
6. Jobs older than 24h are ignored when `posted_at` exists
7. Deduplication by `(user_id, url)`
8. New rows inserted into `jobs` with `status = new`
9. Run logged in `connector_run_logs`
10. Jobs board refreshes

## Option 1: Vercel Cron

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync-jobs",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Set `JOB_SYNC_SECRET` in Vercel env vars. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` by default — use the same value for `JOB_SYNC_SECRET`, or call via GitHub Actions below.

## Option 2: GitHub Actions

`.github/workflows/sync-jobs.yml`:

```yaml
name: Sync Jobs Daily
on:
  schedule:
    - cron: "0 8 * * *"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger job sync
        run: |
          curl -fsS -X POST "${{ secrets.APP_URL }}/api/sync-jobs" \
            -H "Authorization: Bearer ${{ secrets.JOB_SYNC_SECRET }}"
```

Secrets: `APP_URL`, `JOB_SYNC_SECRET`

## Option 3: Local cron (macOS/Linux)

```bash
0 8 * * * curl -fsS -X POST "http://localhost:3000/api/sync-jobs" -H "Authorization: Bearer $JOB_SYNC_SECRET"
```

## Manual testing

**Mock mode (no Apify):**

```bash
JOB_SYNC_MODE=mock npm run dev

# Logged in — one search
curl -X POST http://localhost:3000/api/tracked-searches/<search-id>/run \
  -H "Cookie: <your-session-cookie>"

# Logged in — all enabled
curl -X POST http://localhost:3000/api/tracked-searches/run-all \
  -H "Cookie: <your-session-cookie>"
```

**Cron (all users):**

```bash
curl -X POST http://localhost:3000/api/sync-jobs \
  -H "Authorization: Bearer $JOB_SYNC_SECRET"
```

## Apify mode

1. Create actors for WTTJ / LinkedIn on Apify (or use marketplace actors)
2. Set `JOB_SYNC_MODE=apify`, `APIFY_TOKEN`, actor IDs
3. Actor output should include at minimum: `title`, `url`, and ideally `company`, `location`, `description`, `posted_at`
4. Run a tracked search — Apify actors are called server-side only

CSV/Excel import (`/imports`) remains available and is not affected by sync mode.
