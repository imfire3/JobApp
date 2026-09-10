# JobTracker — Product

JobTracker is a job-application assistant and CRM for candidates (PO/PM-oriented). It helps import offers, ground every AI action in the candidate CV, improve ATS/keyword fit, score matches, generate cover letters, and track applications end to end.

For technical architecture, see [architecture.md](./architecture.md) and [guide-fonctionnement-app.md](./guide-fonctionnement-app.md).

## Vision

Centralize the job-search loop in one product:

1. One CV context shared across the app
2. Offers ingested from multiple sources into a single board
3. ATS and keyword feedback before and during applications
4. Match scoring and personalized cover letters
5. Application tracking as the durable outcome

## Core concepts

| Concept | Meaning |
|---------|---------|
| Job offers | Normalized openings stored per user (board, filters, selection) |
| Applications | CRM pipeline / status of candidatures |
| CV | Source profile text and structured parse used by ATS, matching, and letters |
| ATS analysis | Parsing/structure/impact/keyword view of the CV vs expectations |
| Keywords | Detected and missing terms that drive CV suggestions |
| Matching score | AI fit between CV and a specific job |
| Recommendations | Actionable improvements (CV or prioritization), not invented experience |
| Cover letters | Personalized letters grounded in CV + job description |

## Canonical user flow

Never ship a feature that contradicts this loop:

```text
Import CV
→ Parse CV
→ Import job offer
→ Extract job information
→ Analyze ATS compatibility
→ Identify missing keywords
→ Suggest CV improvements
→ Score job/CV match
→ Generate cover letter
→ Track application
```

Typical product paths that stay inside this loop:

- Onboarding: CV → targets → ATS → tracked search → optional import → jobs board
- Daily use: import/sync jobs → filter/select → analyze match → generate letter(s) → update application status

## Main surfaces

| Route | Role |
|-------|------|
| `/dashboard` | KPIs, activity, high-level recommendations |
| `/jobs` | Job board (cards/table), filters, selection, analyze, batch letters |
| `/jobs/[id]` | Job detail, match, ATS keywords, cover letter |
| `/applications` | Application CRM pipeline |
| `/profile-ai` | CV upload/parsing and AI profile preferences |
| `/sources` | Connectors and saved searches |
| `/settings` | Settings, ATS keywords, prompts, provider keys |
| `/imports` | CSV/Excel import |

## Product principles

- **CV first** — ATS, matching, and cover letters share one CV context; do not invent skills or results.
- **One job board** — imports (CSV, WTTJ, Apify, extension, sync) land in the same jobs model.
- **Selection → action** — checkbox selection feeds batch analyze / cover-letter flows.
- **Grounded AI** — suggestions and letters must cite or derive from CV + job text only.
- **Tracking is the end state** — applied work should remain visible in applications, not only on the board.
- **Deepen the loop** — prefer improving import → ATS → match → letter → track over unrelated surfaces.
- **Preserve existing flows** — authentication, imports, selection, and cover letters stay intact unless a task explicitly replaces them.

## Non-goals

- Replacing a full ATS for recruiters
- Generic multi-tenant recruiting SaaS features unrelated to the candidate loop
- Client-side exposure of AI or Supabase service secrets
- Features that invent candidate experience or company facts

## Related docs

- [architecture.md](./architecture.md) — stack, modules, data model
- [guide-fonctionnement-app.md](./guide-fonctionnement-app.md) — how the app works day to day
- [automation.md](./automation.md) / [job-sync.md](./job-sync.md) — sync and connectors
- Cursor agent entrypoint: [`AGENTS.md`](../AGENTS.md) and `.cursor/rules/`
