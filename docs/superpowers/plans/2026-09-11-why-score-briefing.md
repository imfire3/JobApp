# Why-score coach briefing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Always explain why the match score is X/100 via a coach briefing in `score_explanation` + a **Pourquoi ce score** block on the job lab overview.

**Architecture:** Prompt v7 fills `score_explanation`; UI renders it and a criteria match table derived from `criteria_assessment`. No DB migration.

**Tech stack:** Next.js, existing job-match prompt/schema, `JobDetailLabPage`, `job-detail-lab-model`.

---

### Task 1: Prompt + tests

**Files:**
- Modify: `lib/ai/prompts/job-match.ts`
- Modify: `lib/ai/prompts/job-match.test.ts`

**Steps:**
1. Bump version to `v7`
2. Document `score_explanation` outline (intro, score+blocker, strengths, 3 challenges, pitch, advice) in **/100**, tutoiement
3. Assert prompt contains key phrases in tests

### Task 2: Lab helpers

**Files:**
- Modify: `lib/jobs/job-detail-lab-model.ts`
- Modify: `lib/jobs/job-detail-lab-model.test.ts`

**Steps:**
1. Add `isRichScoreExplanation(text)`
2. Add `criterionMatchDisplay(level)` → emoji + `/10`
3. Tests for both

### Task 3: UI

**Files:**
- Modify: `components/jobs/lab/job-detail-lab-page.tsx`

**Steps:**
1. Add **Pourquoi ce score** under the score
2. Prefer rich `score_explanation`; else narrative fallback
3. Criteria table Critère / Poids / Match

### Task 4: Validate

Run targeted tests for prompts + lab model.
