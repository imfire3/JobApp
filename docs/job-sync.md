# Automated Job Collection (24h)

JobTracker collects jobs through **external scraper providers** (Apify) or **mock mode** for local development. Scraping never runs in the browser.

```
External scraper (Apify actor) → API route → Supabase → Jobs board
```

## Environment

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
| `POST /api/tracked-searches/[id]/run` | User session | Run one tracked search now |
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
