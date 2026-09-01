# Daily Import Automation (08:00)

This project ships a mock sync engine that runs enabled connectors and enabled tracked searches, imports jobs, deduplicates by URL, logs sync runs, and can trigger AI match scoring.

## How it works

- Endpoint: `POST /api/sync/daily`
- For each user:
  - reads enabled rows in `job_sources`
  - reads enabled rows in `tracked_searches`
  - for each tracked search, runs every enabled connector
  - deduplicates by `(user_id, url)`
  - writes `sync_logs`
  - updates `job_sources.last_sync_at` and `job_sources.next_sync_at`
  - updates `jobs_imported_today` and tracked search stats (`last_run`, `next_run`, `jobs_found_today`, `jobs_imported`, `duplicates_removed`, `average_ai_score`)

Manual endpoints:

- `POST /api/sync/source/[sourceId]` -> sync one source
- `POST /api/sync/search/[searchId]` -> run one tracked search across enabled connectors

## Security with `CRON_SECRET`

Set:

```bash
CRON_SECRET=your-long-random-secret
```

When set, `/api/sync/daily` accepts:

- `Authorization: Bearer <CRON_SECRET>`
- or `x-cron-secret: <CRON_SECRET>`

## Option 1: Vercel Cron (recommended)

Add `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/sync/daily", "schedule": "0 8 * * *" }
  ]
}
```

Then ensure the request includes `CRON_SECRET` header (via project env + middleware/proxy or rewrite if needed).

## Option 2: GitHub Actions Cron

Create `.github/workflows/daily-sync.yml`:

```yaml
name: Daily Job Sync
on:
  schedule:
    - cron: "0 8 * * *"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger daily sync
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/sync/daily" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Secrets:

- `APP_URL` (e.g. `https://your-app.vercel.app`)
- `CRON_SECRET`

## Option 3: Supabase Edge Function Scheduler

Call your deployed app endpoint from a scheduled Supabase function and pass:

- `Authorization: Bearer <CRON_SECRET>`

## Testing manually

While logged in:

```bash
curl -X POST http://localhost:3000/api/sync/daily
curl -X POST http://localhost:3000/api/sync/source/<sourceId>
curl -X POST http://localhost:3000/api/sync/search/<searchId>
```

With secret:

```bash
curl -X POST http://localhost:3000/api/sync/daily \
  -H "Authorization: Bearer $CRON_SECRET"
```
