# Match overview UX redesign — Design

**Date:** 2026-09-11  
**Status:** Approved in conversation (Architecture 1, score B, layout C → visual A, tone C)  
**Product:** JobTracker  
**Surface:** `/jobs/[id]` overview tab (`JobDetailLabPage`)

## Goal

Make the match overview full-width, first-person, and actionable:

1. Explain the score as **ton CV vs la fiche de poste** (never “le candidat”).
2. Show a **recalculated** “score after safe optimization” (reformulation + ATS keywords, no invented experience).
3. Replace the unclear criteria×proofs wall with a **compact diagnostic chip grid**.
4. Show priority actions as **left = current CV excerpt / right = rewrite + keywords**.
5. Preserve the existing JobTracker visual language (shadcn, dark lab chrome).

## Non-goals

- Persisting CV mutations from “apply suggestion” (remains local / Optimize tab).
- Redesigning the Optimize, Offre, or Candidature tabs.
- Inventing a new visual theme, card system, or typography.
- Letting the model invent a projected score (no AI-authored `projected_match_score`).
- Changing the authoritative live `match_score` formula (`computeScoreFromCriteria`).

## Chosen approach

**View-model + deterministic re-score (Architecture 1):**

- Prompt + UI templates enforce “tu” and CV↔job framing.
- `projectOptimizedScore` clones criteria, bumps evidence only for **safe** suggestions linked to criteria, then calls `computeScoreFromCriteria`.
- Overview layout: chips for diagnosis; stacked L/R cards for safe priority actions (visual option A).

## Decisions locked

| Decision | Choice |
|----------|--------|
| Projected score | Real recalculation via criteria evidence bumps (not heuristic +3/+5) |
| Overview structure | Compact criteria chips + comparative priority actions |
| Tone | Prompt writes in “tu” + UI templates assemble “Sur ton CV / La fiche demande” |
| Visual layout | A — chips + stacked L/R action cards |
| Design fidelity | Reuse existing Card/Badge/Button, borders, `rounded-[18px]`, muted uppercase labels |

## Overview information architecture

```text
┌─ Match card (full width of main content) ───────────────────────┐
│ Match avec ton profil · {score}/100                              │
│ Sur ton CV : …                                                   │
│ La fiche demande : …                                             │
│ Si tu reformules + mots-clés ATS (sans inventer) → {score} → {Y} │
│ Leviers : N reformulations safe · K mots-clés · gaps non bumpés  │
│                                                                  │
│ Critères (diagnostic) — chip row                                 │
│ [label · n/3 · poids · pts · must?] …                            │
│                                                                  │
│ Actions prioritaires — stacked cards                             │
│ ┌ Gauche: extrait CV / section ┐ ┌ Droite: rewrite + KW ATS ┐   │
└──────────────────────────────────────────────────────────────────┘
```

Copy rules:

- Prefer UI-assembled narrative from `evidence_from_cv` / `evidence_from_job` (and improvement pairs).
- If `score_explanation` is shown, it must already be second-person or be replaced by the template.
- Never surface raw third-person recruiter prose as the primary explanation.

## Projected score (`projectOptimizedScore`)

### Inputs

- `criteria_assessment`
- `cv_improvement_items` filtered by `isSafeSuggestion` (`suggested_rewrite` present and `information_to_confirm` empty)
- `keywords_missing` (listed as levers in copy only; do not add a separate magic keyword boost on top of criteria)

### Algorithm

1. Start from a deep copy of criteria (current score = `computeScoreFromCriteria`).
2. Link each safe suggestion to 0..n criteria:
   - Prefer explicit `related_criterion_ids` if/when the prompt schema provides them.
   - Else text overlap between suggestion (`action`, `evidence_from_job`) and criterion (`label`, `evidence_from_job`).
3. For each linked criterion: bump `evidence_level` by **at most +1**, cap at 3, **once** even if multiple suggestions map to it.
4. Never bump criteria that remain `not_evidenced` / `contradicted` with **no** linked safe suggestion (e.g. missing insurance experience stays 0).
5. Recompute with `computeScoreFromCriteria` → `projectedScore`.
6. Per-action impact = delta from applying that suggestion alone (isolated recompute), not the legacy fake +2/+3/+5.

### UI copy

> Si tu améliores ces parties par reformulation et mots-clés ATS, **sans inventer d’expérience**, tu atteins **X → Y**.

If no safe levers: show Y = X (or hide arrow) + “Rien à gagner sans inventer / confirmer”.

Replace `estimatePotentialScore` heuristic for this surface.

## Criteria chips (diagnostic)

Each chip shows:

- Criterion label
- Evidence `n/3` with existing tone (Absent / Faible / Pertinent / Fort)
- Weight %
- Score contribution points
- Optional badges: must-have / high recruiter risk / needs confirmation

No long proof paragraphs in the chip row. Optional expand/hover may show `evidence_from_cv` vs `evidence_from_job` without changing the primary layout.

## Priority actions (L/R cards)

Source: safe `cv_improvement_items` first (top 3–5 by priority). Fallback gaps without rewrite stay as non-comparative “gap” cards (no fake rewrite).

| Left | Right |
|------|-------|
| CV section / experience hint (`cv_section`) | Action title + recalculated impact |
| Current excerpt (`evidence_from_cv`) | `suggested_rewrite` |
| | Keyword chips: missing ATS terms relevant to this rewrite |

To-confirm items: keep confirmation CTA; do not present as “apply-ready” L/R rewrite.

Unfillable gaps (no safe rewrite): visible in chips + optional honesty card (“écart non comblable sans mentir”), never a fabricated rewrite.

## Prompt changes

File: `lib/ai/prompts/job-match.ts` (+ tests)

- Address the candidate in **tu** in free-text fields (`score_explanation`, questions, improvement actions).
- Prefer structured evidence fields over long third-person essays.
- Optional schema addition: `related_criterion_ids` on improvement items (backward compatible if absent; UI falls back to overlap linking).
- Reinforce: never invent experience; safe rewrites only rephrase / add keywords grounded in CV proof.

UI remains the last line of defense: templates wrap evidence even if the model drifts.

## Design system constraints

- Keep lab look: `Card`, `border-border/80`, gradient card header already used, `rounded-[18px]` inner panels, Badge tones, emerald accent for projected score.
- Full width: remove overly narrow `max-w-*` / centered prose on the match card so narrative and L/R use the main content width.
- Do not introduce a new mock visual language from brainstorm companion screens.

## Architecture / modules

```text
analyze-job → job_fit (criteria + improvements + keywords)
                    │
                    ▼
        job-detail-lab-model
          · buildMatchNarrative()
          · buildCriteriaRows() / chips VM
          · buildPriorityActionCards()  // L/R + keywords
          · projectOptimizedScore()
                    │
                    ▼
        job-detail-lab-page (overview)
          · full-width match card
          · chips row
          · stacked L/R action cards
```

Reuse `computeScoreFromCriteria` from `lib/jobs/criteria-score.ts`. Prefer extending `job-detail-lab-model.ts` (and tests) over a parallel model file unless the file becomes unwieldy enough to extract `project-optimized-score.ts`.

## Error handling & edge cases

| Case | Behavior |
|------|----------|
| No criteria | Keep legacy sub-score / explanation path; no fake projected re-score from criteria |
| Criteria but no safe suggestions | Projected = current; honest empty state |
| Ambiguous suggestion→criterion link | Skip bump for that suggestion (conservative) |
| Confirmation-only gaps | CTA confirm; no projected bump until confirmed via existing confirm API |
| Partial analysis | Existing partial/insufficient states unchanged |

## Testing

Add/extend unit tests in `lib/jobs/job-detail-lab-model.test.ts` (and criteria-score if helpers land there):

- Safe suggestion bumps linked criterion by +1 and raises projected score.
- Unsafe / to-confirm suggestion does not bump.
- Unlinked gap criterion stays at 0.
- Double-mapping same criterion still +1 max.
- Per-action isolated impact matches recompute.
- Narrative templates use second person / CV vs job framing.
- Prompt tests assert “tu” / no “le candidat” instructions where appropriate.

Manual:

1. Open an analyzed job on `/jobs/[id]` overview.
2. Confirm full-width match card and second-person copy.
3. Confirm projected score ≠ old heuristic when safe rewrites exist.
4. Confirm L/R cards show CV excerpt vs rewrite + keyword chips.
5. Confirm visual parity with surrounding lab UI.

## Out of scope follow-ups

- Persist applied rewrites into CV context.
- Backend-stored projected score on `job_fit`.
- Unify Optimize tab with the new L/R cards (Optimize can later reuse the same VM).
