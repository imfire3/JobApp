# Why-score coach briefing — Design

**Date:** 2026-09-11  
**Status:** Approved (approach C + UI/data sections)  
**Product:** JobTracker  
**Surface:** Job match prompt + `/jobs/[id]` overview (`JobDetailLabPage`)

## Goal

Always explain **why** the match score is what it is, in a coach-style briefing (second person « tu »), and surface it both:

1. In `score_explanation` (full narrative from the model)
2. In a dedicated **Pourquoi ce score** UI block under the score

## Non-goals

- Changing `computeScoreFromCriteria` / `/100` scale
- DB migration (reuse `job_fit.score_explanation`)
- Replacing `criteria_assessment` as score source of truth
- Inventing experience absent from the CV

## Approach C (locked)

- Prompt writes a structured coach briefing into `score_explanation` (score cited as **/100**)
- UI composes: briefing + criteria table (from `criteria_assessment`) + keeps projected score / actions
- When `score_explanation` is rich (≥ ~280 chars / multi-paragraph), it replaces the short « Sur ton CV / La fiche demande » pair to avoid duplication

## Briefing outline (prompt)

1. Intro CV ↔ offre (title mismatch / URL note if relevant)
2. Score X/100 + global read + main blocker
3. Strengths with CV evidence (« Là où ton profil est fort »)
4. Exactly 3 challengeable points
5. Positioning + ready-to-say pitch
6. Apply / hold advice and why the score is capped

Criteria table is **not** required inside the text (UI renders it from `criteria_assessment`).

## UI

Under match score card:

- Section title **Pourquoi ce score**
- Prose: `score_explanation` (whitespace-preserving paragraphs)
- Table: Critère | Poids | Match (emoji + score/10 from `evidence_level`)
- Fallback: existing `buildMatchNarrative` if explanation missing/short

## Prompt version

Bump `JOB_MATCH_PROMPT_VERSION` to `v7`.
