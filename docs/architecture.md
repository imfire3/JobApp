# JobTracker Architecture (AI Job Search CRM)

This document describes the current scalable architecture of JobTracker after the CRM + automation redesign.

## 1) Tech stack

- Next.js App Router (`app/`)
- TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, RLS)
- OpenAI-based matching and CV parsing

## 2) High-level modules

### UI / Routes

- `app/dashboard` -> KPI dashboard + activity + AI recommendations
- `app/jobs` -> job board (cards/table + filters)
- `app/applications` -> application CRM pipeline
- `app/sources` -> connectors overview
- `app/sources/[sourceId]` -> connector detail and search configuration
- `app/profile-ai` -> CV upload/parsing and AI profile preferences
- `app/settings` -> general settings and provider keys

### API domain boundaries

- `app/api/jobs/*` -> jobs CRUD updates
- `app/api/analyze-job` -> AI match scoring
- `app/api/generate-cover-letter` -> cover letter generation
- `app/api/profile/*` -> profile + CV import and parsing
- `app/api/sources/*` -> connectors and saved searches
- `app/api/sync/*` -> daily/source/search automation entrypoints
- `app/api/applications` -> CRM applications data
- `app/api/settings` -> user-level product settings
- `app/api/notifications` -> in-app notifications
- `app/api/dashboard/summary` -> dashboard aggregate endpoint

### Services / business logic

- `lib/sources/*` -> connector catalog, criteria normalization, sync orchestration
- `lib/profile/parser.ts` -> local CV extraction fallback
- `lib/openai/client.ts` -> OpenAI matching, cover letter, CV structured parsing
- `lib/jobs/utils.ts` -> filters, KPIs, formatting helpers
- `lib/supabase/*` -> browser/server/proxy session clients

## 3) Data model (normalized)

Core tables:

- `profiles`
- `job_sources`
- `source_searches`
- `jobs`
- `applications`
- `cover_letters`
- `sync_logs`
- `notifications`
- `user_settings`

Related migrations:

- `001_initial_schema.sql`
- `002_sources_and_sync.sql`
- `003_crm_and_profile_ai.sql`

## 4) Automation flow

Daily automation runs via:

- `POST /api/sync/daily`
- `POST /api/sync/source/[sourceId]`
- `POST /api/sync/search/[searchId]`

For each enabled source and enabled search:

1. generate/import mock jobs
2. deduplicate by `(user_id, url)`
3. store import results
4. run AI scoring when CV + API key are available
5. append sync logs + notifications
6. update connector sync metadata

Scheduling targets:

- Vercel Cron
- Supabase scheduler/edge function
- GitHub Actions cron

See `docs/automation.md`.

## 5) Resilience and UX behavior

- Empty states for no data
- Non-fatal fallbacks for profile/jobs loading
- Guardrails for missing env vars
- Toast notifications for user actions
- Loading skeletons on key pages

## 6) Scalability notes

- Connectors are abstracted and replaceable (mock now, real APIs later)
- Search criteria stored in JSONB with shared universal schema + source-specific extension
- Dashboard uses aggregated API endpoint (single fetch for KPI/health/activity)
- API separation keeps future workers/queues migration straightforward

## 7) Suggested next enhancements

- Add command palette (`⌘K`) shortcuts for key actions
- Add charts for import volume, score distribution, pipeline conversion
- Add background queues for AI scoring and generation (for large volumes)
- Add webhook/event audit trail for sync observability
