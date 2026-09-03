# Onboarding wizard (post-signup) — Design

**Date:** 2026-09-03  
**Status:** Approved in conversation (Approach A, collection option 3, sections 1–3)  
**Product:** JobTracker

## Goal

When a user creates an account, they do not land on the empty app. They complete a guided setup that:

1. Imports their CV / profile  
2. Chooses target job types (and locations)  
3. Runs ATS analysis (keywords + improvement suggestions)  
4. Creates a tracked search from those targets  
5. Optionally imports a first CSV / installs the WTTJ extension  
6. Then enters the main app on `/jobs`

## Non-goals

- Redesigning the full Settings / CV Context pages  
- Live scraping inside the wizard (MVP still uses CSV / extension / later sync)  
- Multi-language onboarding copy beyond FR-first UI labels already used in product  
- Forcing existing seeded admin to re-run onboarding if already set up

## Chosen approach

**Approach A — Linear wizard** at `/onboarding`, with middleware gating until `onboarding_completed`.

Collection policy (**option 3**): create a tracked search (required) + optional first collection step (CSV and/or extension), skippable.

## User flow

```text
Signup / first login
        │
        ▼
   /onboarding
   ┌─────────────────────────────────────────────┐
   │ 1. CV          (required)                   │
   │ 2. Targets     (required)                   │
   │ 3. ATS analysis(required)                   │
   │ 4. Tracked search (required)                │
   │ 5. First collection (optional / skippable)  │
   └─────────────────────────────────────────────┘
        │
        ▼
 onboarding_completed = true
        │
        ▼
     /jobs
```

### Step details

| Step | Screen | Required | Persistence / APIs |
|------|--------|----------|--------------------|
| 1 | Import CV (PDF or paste) | yes | `POST /api/profile/import-cv` or `PUT /api/profile` → `cv_contexts` |
| 2 | Target roles + locations (+ remote preference) | yes | `profiles.target_roles`, `profiles.target_locations` (extend profile API if needed) |
| 3 | ATS analysis results | yes | `POST /api/profile/analyze-cv` → scores, detected keywords, missing keywords, recommendations |
| 4 | Create tracked search | yes | `POST /api/tracked-searches` from targets; auto name e.g. `PO/PM — {locations}` |
| 5 | First collection | no | Reuse import UI patterns + link/instructions for Chrome extension; **Passer** allowed |
| Done | Mark complete | — | `PATCH /api/onboarding` → flag + redirect `/jobs` |

## Access control / middleware

- Authenticated user with `onboarding_completed = false`:
  - Allowed: `/onboarding`, auth routes, and APIs needed by the wizard (`/api/auth/*`, `/api/profile*`, `/api/onboarding`, `/api/tracked-searches`, `/api/import-jobs`, analyze-cv)
  - Other app pages → redirect `/onboarding`
- Authenticated user with `onboarding_completed = true` visiting `/onboarding` → redirect `/jobs`
- Logged-in user on `/login` → if incomplete onboarding → `/onboarding`, else `/dashboard` or `/jobs` (prefer `/jobs` as post-onboarding landing)
- Seeded `admin` (or any user): if CV already present and targets exist and a CV analysis exists, backend may treat onboarding as complete (or set flag once) so Loom/demo accounts are not blocked

## UI

- Full-page `/onboarding` **without** the main app sidebar (dedicated shell)
- Horizontal stepper: `CV → Cibles → Analyse → Search → Collecte`
- One primary CTA per step
- Step 3 reuses analysis presentation patterns from Settings (scores, keyword chips, improvement list)
- Step 5: two cards — **Importer CSV** | **Extension WTTJ** + secondary **Passer et ouvrir Jobs**

## Data model

Minimal schema addition on `user_settings`:

```sql
alter table public.user_settings
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;
```

Reuse existing:

- `cv_contexts.cv_text`
- `profiles.target_roles`, `profiles.target_locations`
- `cv_analyses` (latest analysis)
- `tracked_searches`
- Import pipeline (`/api/import-jobs`)

No new business tables.

## API

### `GET /api/onboarding`

Returns:

```json
{
  "completed": false,
  "step": "cv" | "targets" | "analysis" | "search" | "collect" | "done",
  "has_cv": true,
  "has_targets": true,
  "has_analysis": false,
  "has_tracked_search": false
}
```

Derived step = first incomplete required step (collect never blocks completion once search exists; collect is optional before mark-complete).

### `PATCH /api/onboarding`

Body:

```json
{ "completed": true }
```

Validates required prerequisites server-side (CV, targets, analysis, ≥1 tracked search) then sets `onboarding_completed` + `onboarding_completed_at`.

## Edge cases

- Step 1 blocked while CV empty / below existing analysis min length  
- Step 3 failure → error + retry; no skip  
- Step 4 creates exactly one search from wizard targets (idempotent if equivalent search already exists: reuse)  
- Step 5 always skippable  
- Refresh mid-wizard → `GET /api/onboarding` resumes at first incomplete required step  
- Local-auth users must still be ensured in `auth.users` (existing `ensureLocalAuthUserInSupabase`) before CV writes  

## Success criteria

A new signup user can:

1. Create account  
2. Complete steps 1–4 without leaving onboarding  
3. Skip or complete step 5  
4. Land on `/jobs` with CV saved, ATS analysis available, and a tracked search created  

## Out of scope for v1 implementation follow-ups

- Editing prompts during onboarding  
- Auto-running job match on imported jobs inside the wizard  
- Mobile-specific onboarding redesign  

## Implementation notes (for planning)

Likely touchpoints:

- `app/onboarding/page.tsx` + `components/onboarding/*`
- `app/api/onboarding/route.ts`
- `lib/supabase/middleware.ts` (gating)
- `app/api/auth/login|signup` redirect hints / client redirect after auth
- Migration `013_onboarding.sql`
- Possibly extend `PUT /api/profile` to accept `target_roles` / `target_locations`
- Types: `UserSettings.onboarding_completed`

Prefer reusing `SettingsForm` CV upload pieces and `CvAnalysisPanel` display chunks rather than duplicating AI logic.
