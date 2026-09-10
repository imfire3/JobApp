# Product — JobTracker

JobTracker is a job application assistant and CRM. It helps candidates (especially PO/PM profiles) import offers, optimize their CV against ATS expectations, score fit, generate personalized cover letters, and track applications.

For technical architecture, see [architecture.md](./architecture.md). For a feature walkthrough, see [guide-fonctionnement-app.md](./guide-fonctionnement-app.md).

## Vision

One workflow from CV to tracked application — not a generic Kanban board and not a standalone ATS checker.

JobTracker centralizes:

- job ingestion (CSV/Excel, Welcome to the Jungle, Apify, Chrome extension)
- CV context used across the product
- ATS / keyword analysis and improvement suggestions
- AI matching against each offer
- cover-letter generation grounded in the CV and job text
- application CRM / follow-up

## Core concepts

| Concept | Meaning |
|---------|---------|
| Job offer | Normalized opportunity stored for the user (`jobs`) |
| Application | Tracked candidature linked to a job (`applications`) |
| CV | Candidate source text / parsed profile used as AI context |
| ATS analysis | Scores, structure/keyword signals, recommendations on the CV |
| Keywords | Skills/tools/terms detected or missing vs a target role or job |
| Matching score | AI fit between CV context and a specific job |
| Recommendations | Actionable CV or positioning suggestions |
| Cover letter | Personalized letter generated from CV + job description |

## Canonical user flow

```text
Import CV
→ Parse CV
→ Import job offer
→ Extract job information
→ Analyze ATS compatibility
→ Identify missing keywords
→ Suggest CV improvements
→ Score job–CV match
→ Generate cover letter
→ Track application
```

Product and engineering work must reinforce this flow. Do not ship features that invent a parallel path (for example a second tracking system, matching without CV context, or cover letters disconnected from the saved CV).

## Main surfaces

| Route | Role in the flow |
|-------|------------------|
| `/profile-ai` (and CV context) | Import / parse CV; ATS and keyword work |
| `/jobs` | Board: filter, select, analyze match, generate letters |
| `/jobs/[id]` | Job detail: fit, keywords, cover letter |
| `/applications` | CRM pipeline and follow-up |
| `/sources` | Connectors and saved searches |
| `/dashboard` | KPIs, activity, high-level recommendations |
| `/settings` | ATS keywords, prompts, provider-related settings |
| `/imports` | CSV / Excel import |

## Product principles

1. **CV is shared context** — ATS, matching, recommendations, and cover letters use the same saved CV.
2. **No invented facts** — never invent experience, skills, education, or company details.
3. **Normalize, don’t invent jobs** — external imports map into the existing schema; preserve `raw_data`.
4. **Server-side AI only** — keys and model calls stay on the server.
5. **Extend existing surfaces** — prefer improving `/jobs`, `/profile-ai`, `/applications`, etc. over competing pages.
6. **Partial failure is OK** — batch import / analyze / generate must report per-item success and failure.

## Out of scope (unless explicitly requested)

- Full ATS simulation for arbitrary third-party portals unrelated to the user’s jobs
- Rewriting the authenticated app as a marketing site
- Parallel job boards or CRM models that bypass `jobs` / `applications`

## Related docs

- [architecture.md](./architecture.md) — stack, modules, data model
- [guide-fonctionnement-app.md](./guide-fonctionnement-app.md) — how the app works day to day
- [automation.md](./automation.md) / [job-sync.md](./job-sync.md) — sync and connectors
