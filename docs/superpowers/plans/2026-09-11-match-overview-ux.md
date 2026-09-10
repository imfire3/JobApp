# Match overview UX redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/jobs/[id]` overview match card: full-width second-person narrative, deterministic projected score, criteria chips, L/R priority actions — preserving JobTracker lab design.

**Architecture:** Extend `job-detail-lab-model.ts` with narrative, projected score via `computeScoreFromCriteria`, and L/R action cards; wire `job-detail-lab-page.tsx` overview; tighten job-match prompt tone to « tu ».

**Tech Stack:** Next.js App Router, React, TypeScript, existing lab UI (shadcn Card/Badge/Button), node:test.

**Spec:** `docs/superpowers/specs/2026-09-11-match-overview-ux-design.md`

## Global Constraints

- Never invent experience; only safe suggestions bump projected score (+1 evidence max per criterion).
- Keep existing lab visual language (no new theme).
- Do not persist CV mutations.
- Do not invent AI-authored projected scores.
- French UI copy; address user as « tu ».

## File map

| File | Responsibility |
|------|----------------|
| `lib/jobs/job-detail-lab-model.ts` | `projectOptimizedScore`, `buildMatchNarrative`, `buildPriorityActionCards`, chip-friendly rows (reuse `buildCriteriaRows`) |
| `lib/jobs/job-detail-lab-model.test.ts` | Unit tests for score projection, narrative, L/R cards |
| `lib/jobs/criteria-score.ts` | Reuse `computeScoreFromCriteria` only |
| `components/jobs/lab/job-detail-lab-page.tsx` | Overview UI: narrative, projection copy, chips, L/R cards |
| `lib/ai/prompts/job-match.ts` | Second-person instructions |
| `lib/ai/prompts/job-match.test.ts` | Assert prompt tone rules |

---

### Task 1: Projected score + narrative + L/R action view-model (TDD)

**Files:**
- Modify: `lib/jobs/job-detail-lab-model.ts`
- Modify: `lib/jobs/job-detail-lab-model.test.ts`

**Interfaces:**
- Consumes: `Job`, `JobCriterionAssessment`, `JobCvImprovementItem`, `computeScoreFromCriteria`, `isSafeSuggestion`
- Produces:
  - `projectOptimizedScore(job: Job): { current: number | null; projected: number | null; safeSuggestionCount: number; missingKeywordCount: number; bumpedCriterionIds: string[] }`
  - `buildMatchNarrative(job: Job): { fromCv: string; fromJob: string }`
  - `buildPriorityActionCards(job: Job): LabPriorityActionCard[]` where card has `id`, `title`, `importance`, `estimatedImpact`, `cvSection`, `fromCv`, `rewrite`, `keywords`, `kind: "safe_rewrite" | "gap" | "confirm"`

- [ ] **Step 1: Write failing tests** for bump +1, no bump on unsafe, double-map +1 max, narrative framing, L/R fields + keyword chips from `keywords_missing`
- [ ] **Step 2: Run** `npm test -- lib/jobs/job-detail-lab-model.test.ts` — expect FAIL
- [ ] **Step 3: Implement** helpers (text-overlap criterion linking; isolated impact recompute)
- [ ] **Step 4: Run tests** — expect PASS
- [ ] **Step 5: Commit** `feat(match): add projected score and overview action view-model`

---

### Task 2: Overview UI (chips + L/R + full width + copy)

**Files:**
- Modify: `components/jobs/lab/job-detail-lab-page.tsx`

- [ ] **Step 1:** Replace `estimatePotentialScore` usage with `projectOptimizedScore`; use `buildMatchNarrative` instead of raw `score_explanation` when possible
- [ ] **Step 2:** Render criteria as chip row (reuse row data); keep confirm flow in expanded chip/detail under chips or for `needsConfirmation` rows only
- [ ] **Step 3:** Replace dual-column rewritePairs + old priority list with stacked L/R cards from `buildPriorityActionCards`
- [ ] **Step 4:** Update potentiel copy to « sans inventer » + levers; keep Card/Badge/`rounded-[18px]` patterns; ensure match card uses full `max-w-[1200px]` content width (no nested narrow max-w)
- [ ] **Step 5: Commit** `feat(match): redesign overview chips and L/R priority actions`

---

### Task 3: Prompt tone « tu »

**Files:**
- Modify: `lib/ai/prompts/job-match.ts`
- Modify: `lib/ai/prompts/job-match.test.ts`

- [ ] **Step 1:** Add rules: free-text in « tu »; `score_explanation` = ton CV vs fiche; forbid « le candidat » in user-facing strings
- [ ] **Step 2:** Assert in tests
- [ ] **Step 3: Commit** `fix(ai): address job-match free text in second person`

---

### Task 4: Validation

- [ ] Run `npm test -- lib/jobs/job-detail-lab-model.test.ts lib/ai/prompts/job-match.test.ts`
- [ ] Run `npm run lint` (scoped if needed)
- [ ] Manual: open `/jobs/[id]` overview after analyze

---

**Execution:** User requested immediate testability → inline execution in this session.
