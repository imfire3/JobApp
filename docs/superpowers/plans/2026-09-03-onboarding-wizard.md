# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After signup, force a 5-step onboarding wizard (CV → targets → ATS analysis → tracked search → optional collection) before entering `/jobs`.

**Architecture:** Persist `user_settings.onboarding_completed`, expose `GET/PATCH /api/onboarding` that derives the current step from existing tables, gate navigation with a lightweight `jobapp_onboarding` cookie read in middleware, and build a sidebar-free `/onboarding` wizard that reuses profile / analyze-cv / tracked-searches / import-jobs APIs.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres, existing local-auth cookie session, node:test + tsx for unit tests.

## Global Constraints

- FR-first UI labels for wizard steps (match product tone)
- Reuse existing APIs — do not invent live scraping inside the wizard
- `MIN_CV_LENGTH = 200` (from `lib/cv-analysis/service.ts`)
- Local-auth users still go through `ensureLocalAuthUserInSupabase`
- Do not force seeded `admin` through wizard if prerequisites already satisfied (auto-complete)
- Post-onboarding landing: `/jobs`
- Cookie name for gate: `jobapp_onboarding` values `pending` | `done`
- No redesign of Settings / CV Context beyond reuse

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/013_onboarding.sql` | Add onboarding columns |
| `types/index.ts` | Extend `UserSettings` |
| `lib/onboarding/status.ts` | Pure helpers: derive step, prerequisites |
| `lib/onboarding/status.test.ts` | Unit tests for step derivation |
| `lib/onboarding/cookie.ts` | Cookie name + options helpers |
| `app/api/onboarding/route.ts` | GET status + PATCH complete |
| `app/api/profile/route.ts` | Extend PUT/GET for targets |
| `lib/supabase/middleware.ts` | Gate incomplete users to `/onboarding` |
| `app/login/page.tsx` | Redirect to onboarding or `/jobs` |
| `app/onboarding/page.tsx` | Page entry |
| `components/onboarding/onboarding-wizard.tsx` | Stepper orchestration |
| `components/onboarding/steps/*.tsx` | Per-step UI |
| `supabase/SETUP_REMAINING.sql` / `SETUP_FRESH_PROJECT.sql` | Append migration snippet for fresh setups |

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/013_onboarding.sql`
- Modify: `types/index.ts` (`UserSettings`)
- Modify: `supabase/SETUP_REMAINING.sql` (append same SQL at end)
- Modify: `supabase/SETUP_FRESH_PROJECT.sql` (append same SQL at end)

**Interfaces:**
- Produces: `UserSettings.onboarding_completed: boolean`, `UserSettings.onboarding_completed_at: string | null`

- [ ] **Step 1: Add migration file**

```sql
-- Editable onboarding completion flag per user
alter table public.user_settings
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.user_settings.onboarding_completed is
  'True after the post-signup onboarding wizard is finished.';

comment on column public.user_settings.onboarding_completed_at is
  'Timestamp when onboarding was marked complete.';
```

- [ ] **Step 2: Extend `UserSettings` in `types/index.ts`**

Add:

```ts
onboarding_completed: boolean;
onboarding_completed_at: string | null;
```

- [ ] **Step 3: Append the same SQL block to both setup SQL dumps** (so fresh projects get the columns)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_onboarding.sql types/index.ts supabase/SETUP_REMAINING.sql supabase/SETUP_FRESH_PROJECT.sql
git commit -m "feat(onboarding): add onboarding_completed columns"
```

---

### Task 2: Pure onboarding status helpers (TDD)

**Files:**
- Create: `lib/onboarding/status.ts`
- Create: `lib/onboarding/status.test.ts`

**Interfaces:**
- Produces:
  - `export type OnboardingStep = "cv" | "targets" | "analysis" | "search" | "collect" | "done"`
  - `export type OnboardingFlags = { hasCv: boolean; hasTargets: boolean; hasAnalysis: boolean; hasTrackedSearch: boolean; completed: boolean }`
  - `export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep`
  - `export function canCompleteOnboarding(flags: OnboardingFlags): boolean`
  - `export function shouldAutoComplete(flags: Omit<OnboardingFlags, "completed">): boolean`

- [ ] **Step 1: Write failing tests** in `lib/onboarding/status.test.ts`

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCompleteOnboarding,
  deriveOnboardingStep,
  shouldAutoComplete,
} from "@/lib/onboarding/status";

describe("deriveOnboardingStep", () => {
  it("starts at cv when nothing is ready", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "cv"
    );
  });

  it("moves to targets after CV", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "targets"
    );
  });

  it("moves to analysis after targets", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "analysis"
    );
  });

  it("moves to search after analysis", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: false,
        completed: false,
      }),
      "search"
    );
  });

  it("moves to collect after search (optional step)", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      "collect"
    );
  });

  it("returns done when completed flag is true", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: true,
      }),
      "done"
    );
  });
});

describe("canCompleteOnboarding", () => {
  it("requires cv, targets, analysis, and tracked search", () => {
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      true
    );
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: false,
        completed: false,
      }),
      false
    );
  });
});

describe("shouldAutoComplete", () => {
  it("is true when all prerequisites already exist", () => {
    assert.equal(
      shouldAutoComplete({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
      }),
      true
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- lib/onboarding/status.test.ts
```

Expected: module not found / FAIL

- [ ] **Step 3: Implement `lib/onboarding/status.ts`**

```ts
export type OnboardingStep =
  | "cv"
  | "targets"
  | "analysis"
  | "search"
  | "collect"
  | "done";

export type OnboardingFlags = {
  hasCv: boolean;
  hasTargets: boolean;
  hasAnalysis: boolean;
  hasTrackedSearch: boolean;
  completed: boolean;
};

export function deriveOnboardingStep(flags: OnboardingFlags): OnboardingStep {
  if (flags.completed) return "done";
  if (!flags.hasCv) return "cv";
  if (!flags.hasTargets) return "targets";
  if (!flags.hasAnalysis) return "analysis";
  if (!flags.hasTrackedSearch) return "search";
  return "collect";
}

export function canCompleteOnboarding(flags: OnboardingFlags): boolean {
  return (
    flags.hasCv &&
    flags.hasTargets &&
    flags.hasAnalysis &&
    flags.hasTrackedSearch
  );
}

export function shouldAutoComplete(
  flags: Omit<OnboardingFlags, "completed">
): boolean {
  return (
    flags.hasCv &&
    flags.hasTargets &&
    flags.hasAnalysis &&
    flags.hasTrackedSearch
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- lib/onboarding/status.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/onboarding/status.ts lib/onboarding/status.test.ts
git commit -m "feat(onboarding): add step derivation helpers"
```

---

### Task 3: Onboarding cookie helpers

**Files:**
- Create: `lib/onboarding/cookie.ts`

**Interfaces:**
- Produces:
  - `export const ONBOARDING_COOKIE = "jobapp_onboarding"`
  - `export type OnboardingCookieValue = "pending" | "done"`
  - `export function getOnboardingCookieOptions()`

- [ ] **Step 1: Implement cookie helper**

```ts
export const ONBOARDING_COOKIE = "jobapp_onboarding";
export type OnboardingCookieValue = "pending" | "done";

export function getOnboardingCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/onboarding/cookie.ts
git commit -m "feat(onboarding): add onboarding gate cookie helper"
```

---

### Task 4: `GET/PATCH /api/onboarding`

**Files:**
- Create: `app/api/onboarding/route.ts`
- Modify: login/signup only later (Task 6) — this task sets cookies on GET auto-complete and PATCH

**Interfaces:**
- Consumes: `deriveOnboardingStep`, `canCompleteOnboarding`, `shouldAutoComplete`, `MIN_CV_LENGTH`, `getAuthenticatedUser`
- Produces JSON:
  - GET `{ completed, step, has_cv, has_targets, has_analysis, has_tracked_search }`
  - PATCH `{ completed: true, step: "done" }` + Set-Cookie `jobapp_onboarding=done`

- [ ] **Step 1: Implement status loader inside the route**

Logic for flags:

```ts
// hasCv: cv_contexts.cv_text.trim().length >= MIN_CV_LENGTH
// hasTargets: profiles.target_roles.length > 0 && profiles.target_locations.length > 0
// hasAnalysis: latest row in cv_analyses for user
// hasTrackedSearch: count tracked_searches > 0
// completed: user_settings.onboarding_completed === true
```

If `!completed && shouldAutoComplete(flags)`:
- upsert `user_settings` with `onboarding_completed=true`, `onboarding_completed_at=now()`
- set cookie `done`
- return `completed: true, step: "done"`

- [ ] **Step 2: Implement GET**

```ts
export async function GET() {
  // auth → load flags → maybe auto-complete → return payload
  // also if completed, ensure cookie=done; if !completed ensure cookie=pending
}
```

- [ ] **Step 3: Implement PATCH**

```ts
const bodySchema = z.object({ completed: z.literal(true) });
// reject 400 if !canCompleteOnboarding(flags)
// upsert user_settings onboarding fields
// Set-Cookie done
```

Ensure `user_settings` row exists via upsert `{ id: user.id, onboarding_completed: true, onboarding_completed_at: new Date().toISOString() }`.

- [ ] **Step 4: Manual smoke (dev server + curl with session cookie) OR skip if no session — at minimum `tsc --noEmit`**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/api/onboarding/route.ts
git commit -m "feat(onboarding): add onboarding status API"
```

---

### Task 5: Extend profile API for targets

**Files:**
- Modify: `app/api/profile/route.ts`

**Interfaces:**
- Consumes: existing `cv_contexts` upsert
- Produces GET profile including `target_roles`, `target_locations` from `profiles`
- Produces PUT accepting optional `target_roles: string[]`, `target_locations: string[]`

- [ ] **Step 1: Extend zod schema**

```ts
const profileSchema = z.object({
  cv_text: z.string().optional(),
  target_roles: z.array(z.string()).optional(),
  target_locations: z.array(z.string()).optional(),
});
```

- [ ] **Step 2: GET joins targets**

After loading `cv_contexts`, also:

```ts
const { data: profileRow } = await supabase
  .from("profiles")
  .select("target_roles,target_locations")
  .eq("id", user.id)
  .maybeSingle();
```

Return:

```ts
{
  profile: {
    ...cvContext,
    target_roles: profileRow?.target_roles ?? [],
    target_locations: profileRow?.target_locations ?? [],
  },
}
```

- [ ] **Step 3: PUT upserts targets when provided**

```ts
if (body.target_roles !== undefined || body.target_locations !== undefined) {
  await supabase.from("profiles").upsert({
    id: user.id,
    ...(body.target_roles !== undefined ? { target_roles: body.target_roles } : {}),
    ...(body.target_locations !== undefined
      ? { target_locations: body.target_locations }
      : {}),
  });
}
if (body.cv_text !== undefined) {
  // existing cv_contexts upsert
}
```

Keep CV-only saves working (settings page).

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat(profile): save target roles and locations"
```

---

### Task 6: Middleware gate + auth redirects

**Files:**
- Modify: `lib/supabase/middleware.ts`
- Modify: `app/login/page.tsx`
- Modify: `app/api/auth/login/route.ts` (set pending/done cookie after ensure)
- Modify: `app/api/auth/signup/route.ts` (set pending cookie + ensure user)

**Interfaces:**
- Consumes: `ONBOARDING_COOKIE`
- Middleware rules:
  - Public: `/login`, `/auth`, `/api/auth/*`, `/api/setup/*`, `/api/sync-jobs`
  - Onboarding-allowed while pending: `/onboarding`, `/api/onboarding`, `/api/profile`, `/api/profile/*`, `/api/tracked-searches`, `/api/import-jobs`, `/api/jobs` (GET only not required — skip), static assets
  - If `localUser` && cookie !== `done` && path not allowed → redirect `/onboarding`
  - If cookie missing for localUser → allow next but prefer treating as `pending` (redirect to onboarding except APIs that can auto-complete). Safer default: missing cookie = pending.
  - If cookie === `done` && path starts with `/onboarding` → redirect `/jobs`
  - Login route when already authed: if done → `/jobs`, else → `/onboarding`

- [ ] **Step 1: Update `isPublicRoute` / add helpers in middleware**

```ts
function isOnboardingAllowed(pathname: string) {
  return (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api/onboarding") ||
    pathname.startsWith("/api/profile") ||
    pathname.startsWith("/api/tracked-searches") ||
    pathname.startsWith("/api/import-jobs") ||
    pathname.startsWith("/api/auth")
  );
}
```

- [ ] **Step 2: Apply redirects for pending/done cookies**

- [ ] **Step 3: Login + signup set onboarding cookie**

After successful auth:
- signup → `pending`
- login → call lightweight check optional; default `pending` then client hits GET `/api/onboarding` which may auto-complete to `done`

Simplest reliable path for login page:

```ts
const statusRes = await fetch("/api/onboarding");
const status = await statusRes.json();
router.push(status.completed ? "/jobs" : "/onboarding");
```

Signup always → `/onboarding`.

- [ ] **Step 4: Change login success redirect accordingly**

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/middleware.ts app/login/page.tsx app/api/auth/login/route.ts app/api/auth/signup/route.ts
git commit -m "feat(onboarding): gate app behind onboarding cookie"
```

---

### Task 7: Onboarding wizard shell + stepper

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `components/onboarding/onboarding-wizard.tsx`
- Create: `components/onboarding/stepper.tsx`

**Interfaces:**
- Wizard loads `GET /api/onboarding` on mount and selects step
- If `completed` → `router.replace("/jobs")`

- [ ] **Step 1: Create page**

```tsx
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

- [ ] **Step 2: Implement stepper UI**

Labels: `CV`, `Cibles`, `Analyse`, `Search`, `Collecte`

Props:

```ts
type StepperProps = {
  current: OnboardingStep;
  steps: Array<{ id: OnboardingStep; label: string }>;
};
```

Skip rendering `done` in the strip.

- [ ] **Step 3: Implement wizard shell** (loading state + step switch)

Full-page centered layout, JobTracker mark, no `AppShell` sidebar.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/page.tsx components/onboarding/onboarding-wizard.tsx components/onboarding/stepper.tsx
git commit -m "feat(onboarding): add wizard shell and stepper"
```

---

### Task 8: Step components (CV, targets, analysis, search, collect)

**Files:**
- Create: `components/onboarding/steps/cv-step.tsx`
- Create: `components/onboarding/steps/targets-step.tsx`
- Create: `components/onboarding/steps/analysis-step.tsx`
- Create: `components/onboarding/steps/search-step.tsx`
- Create: `components/onboarding/steps/collect-step.tsx`
- Modify: `components/onboarding/onboarding-wizard.tsx` to render them

**Interfaces:**
- Each step: `{ onCompleted: () => void }` callback that re-fetches `/api/onboarding` and advances

#### CV step
- Textarea + PDF import (`FormData` → `/api/profile/import-cv`) + Save via `PUT /api/profile`
- Disable Continuer while `cv_text.trim().length < 200`
- Show character count

#### Targets step
- Multi inputs or comma-separated fields for roles + locations
- Defaults: roles `Product Owner`, `Product Manager`; locations `Paris`, `remote`
- Remote preference select: `any` | `remote` | `hybrid` (store remote/hybrid into tracked search later; for profile only roles/locations required)
- Save: `PUT /api/profile` with `target_roles`, `target_locations`

#### Analysis step
- Button `Analyser mon CV` → `POST /api/profile/analyze-cv`
- Display overall score, keyword score, detected skills/tools chips, missing product keywords, top recommendations (title + suggestion)
- Continuer enabled only after successful analysis in this session **or** `has_analysis` from status

#### Search step
- Preview of search name: `` `${roles.slice(0,2).join(" / ")} — ${locations.slice(0,2).join(", ")}` ``
- Button creates tracked search:

```ts
await fetch("/api/tracked-searches", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    enabled: true,
    job_titles: roles,
    keywords: roles,
    locations,
    remote_preference: remotePreference,
    hybrid: remotePreference === "hybrid",
    on_site: remotePreference === "any" || remotePreference === "onsite",
  }),
});
```

Idempotent UX: if `has_tracked_search` already true, show “Search déjà créée” + Continuer.

#### Collect step
- Card A: file input + upload to `/api/import-jobs` (multipart `file`) — show summary toast
- Card B: short instructions + link to `chrome-extension/README.md` path text (“Load unpacked from `/chrome-extension`”)
- Primary secondary actions: `Passer et ouvrir Jobs` and (if imported) `Terminer`
- Both call:

```ts
await fetch("/api/onboarding", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ completed: true }),
});
router.push("/jobs");
```

- [ ] **Step 1: Implement the five step components**
- [ ] **Step 2: Wire into wizard switch**
- [ ] **Step 3: Typecheck + lint touched files**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/
git commit -m "feat(onboarding): add wizard step screens"
```

---

### Task 9: End-to-end polish + docs touch

**Files:**
- Modify: `README.md` (short “First login → onboarding” note)
- Modify: `app/page.tsx` if needed (root redirect stays `/dashboard` but middleware will bounce pending users to onboarding)

- [ ] **Step 1: Ensure root `/` and `/dashboard` bounce pending users via middleware**
- [ ] **Step 2: README note under Setup / Run**

```md
After signup, complete the onboarding wizard (CV → targets → ATS → search → optional import) before using Jobs.
```

- [ ] **Step 3: Run full validation**

```bash
npm test
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add README.md app/page.tsx
git commit -m "docs: mention onboarding wizard in README"
```

---

### Task 10: Manual verification checklist

- [ ] Apply migration `013_onboarding.sql` on the Supabase SQL editor (or `db push`)
- [ ] Signup new user → lands on `/onboarding` (not dashboard)
- [ ] Cannot open `/jobs` until complete (middleware redirect)
- [ ] Step 1 blocks Continuers < 200 chars
- [ ] Step 3 shows ATS keywords + improvements after analyze
- [ ] Step 4 creates tracked search visible later on `/jobs`
- [ ] Step 5 skip works → `/jobs` + cookie `done`
- [ ] Login as `admin` with existing CV/targets/analysis/search → auto-complete, no forced wizard
- [ ] Refresh mid-wizard resumes correct step

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Wizard steps 1–5 | 7–8 |
| Optional collection | 8 (collect step) |
| `onboarding_completed` columns | 1 |
| GET/PATCH `/api/onboarding` | 4 |
| Middleware gating | 6 |
| Auto-complete existing admin | 4 (`shouldAutoComplete`) |
| Extend profile targets | 5 |
| Reuse analyze-cv / import / tracked-searches | 8 |
| Landing `/jobs` | 6, 8 |
| No live scrape in wizard | honored |

## Placeholder scan

No TBD / “implement later” left in tasks.

## Type consistency

- `OnboardingStep` / `OnboardingFlags` defined in Task 2 and reused by API + UI
- Cookie name `jobapp_onboarding` shared via Task 3
