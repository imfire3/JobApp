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
- `app/companies` -> spontaneous-application prospection CRM (search + pipeline + outreach)
- `app/companies/[id]` -> company detail (opportunity score, contacts, outreach, status)
- `app/research` -> AI search plans feeding offer connectors
- `app/sources` -> connectors overview
- `app/sources/[sourceId]` -> connector detail and search configuration
- `app/profile-ai` -> CV upload/parsing and AI profile preferences
- `app/settings` -> general settings and provider keys

### API domain boundaries

- `app/api/jobs/*` -> jobs CRUD updates
- `POST /api/jobs/[id]/correct-paste` -> preview then explicit confirmation of pasted metadata correction; signed, user/job/version-bound preview, metadata allowlist, CRM preserved, previous analysis flagged stale (no schema migration)
- `POST /api/import-jobs` -> multipart uploads for CSV/XLSX/Apify JSON or a JSON body `{ text, url? }` for a copied offer; metadata extraction and validation run server-side
- `app/api/analyze-job` -> AI match scoring
- `app/api/analyze-job/answer` and `/confirm` -> candidate clarifications and confirmation of analysis criteria
- `app/api/generate-cover-letter` -> cover letter generation
- `app/api/profile/*` -> profile + CV import and parsing
- `app/api/jobs/[id]/optimize/*` -> guarded CV rewrite proposals for one offer
- `app/api/sources/*` -> connectors and saved searches
- `app/api/sync/*` -> daily/source/search automation entrypoints
- `app/api/applications` -> CRM applications data
- `app/api/searches/companies/parse` -> NL → company search criteria
- `app/api/searches/companies/run` -> connector search + scoring + persistence
- `app/api/companies` / `app/api/companies/[id]` -> company CRM read/update
- `app/api/companies/[id]/contacts` -> company contacts
- `app/api/companies/[id]/outreach` -> outreach message generation (email + LinkedIn)
- `app/api/settings` -> user-level product settings
- `app/api/notifications` -> in-app notifications
- `app/api/dashboard/summary` -> dashboard aggregate endpoint

### Services / business logic

- `lib/sources/*` -> connector catalog, criteria normalization, sync orchestration
- `lib/profile/parser.ts` -> local CV extraction fallback
- `lib/openai/client.ts` -> OpenAI matching, cover letter, CV structured parsing
- `lib/ai/company-ai.ts` -> company search intent / enrichment / outreach AI calls
- `lib/connectors/companies/*` -> company prospection connector (mock provider, web fetch ready)
- `lib/jobs/company-score.ts` -> deterministic match + opportunity scoring
- `lib/jobs/company-prospecting.ts` -> company search pipeline (persistence, contacts, outreach)
- `lib/jobs/utils.ts` -> filters, KPIs, formatting helpers
- `lib/supabase/*` -> browser/server/proxy session clients

Prompt diagnostics collect request content only in local development. Hosted builds neither store this trace content nor serve the diagnostic API.

Production builds authenticate with Supabase Auth and read/write candidate data using the candidate session and RLS. The local development session cookie is ignored in production. Creating an invited account is an explicit administrator operation and uses the Supabase Admin API on the server.

## 3) Data model (normalized)

Core tables:

- `profiles`
- `cv_contexts`
- `job_sources`
- `source_searches`
- `jobs`
- `applications`
- `cover_letters`
- `sync_logs`
- `notifications`
- `user_settings`
- `company_searches`
- `companies`
- `company_contacts`
- `outreach_messages`

Related migrations:

- `001_initial_schema.sql`
- `002_sources_and_sync.sql`
- `003_crm_and_profile_ai.sql`
- `027_company_prospecting.sql` (companies CRM: search, prospects, contacts, outreach)

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

### Frontières UX / données

- `lib/jobs/job-analysis-model.ts` construit le résumé et les compteurs à partir des critères évalués. Les déclarations du candidat ne sont jamais rendues comme citation CV; la ligne de critère garde la réponse candidat séparée.
- `app/applications` fournit la mise à jour de statut dans les cartes du pipeline; les dates d’entretien ne sont affichées que si présentes. La recherche offres (`app/research`) et la prospection (`app/companies`) restent deux parcours et modèles distincts.
- Le rendu Entreprises déduplique la vue par domaine/nom normalisés uniquement : aucune suppression ni fusion de données persistées n’est effectuée.
- L’inscription hébergée Supabase reste opt-in jusqu’à validation des e-mails de confirmation et des URLs `/auth/callback`; elle est activée par `ALLOW_HOSTED_SIGNUP=true`.
