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
| Company outcome score | 0-100 spontaneous-application opportunity: profile, sector, location, product team, growth, contact |
| Recommendations | Actionable improvements (CV or prioritization), not invented experience |
| Cover letters | Personalized letters grounded in CV + job description |

## Décisions produit maintenues

- L’interface est en français, avec tutoiement; le score s’appelle toujours **Correspondance**.
- Un score de Correspondance et un statut de candidature sont deux informations distinctes et lisibles sans couleur seule.
- Les champs de revue du profil peuvent rester vides : le candidat peut poursuivre l’onboarding puis compléter plus tard.
- L’accès à la version hébergée se fait sur invitation, par adresse e-mail et mot de passe, avec un compte persistant.
- L’IA prépare une analyse, une suggestion, une lettre ou un message. Elle ne présente pas une supposition comme un fait et n’envoie jamais une candidature ou une prospection à la place du candidat.
- Les connecteurs, recherches sauvegardées et synchronisations sont des capacités dépendantes de la configuration : ne pas les décrire comme une collecte live universelle sans preuve d’exécution.

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
| `/companies` | Spontaneous-application prospection CRM (search, opportunity score, pipeline, outreach) |
| `/research` | AI search plans feeding connectors (offer search, distinct from company prospection) |
| `/profile-ai` | CV upload/parsing and AI profile preferences |
| `/sources` | Connectors and saved searches |
| `/settings` | Settings, ATS keywords, prompts, provider keys |
| `/imports` | CSV/Excel import |

## Company prospection flow (Phase A)

Spontaneous applications complement the offer loop — no published offer required:

```text
Describe target companies in one sentence
→ Parse into criteria (roles, sectors, locations, size, remote)
→ Search connector (mock first)  [Phase B: similar companies]
→ Score match (CV/profile) + opportunity score
→ Persist company + mock contact suggestions → pipeline
→ Generate outreach (email + LinkedIn) grounded in real company info
→ Track status: to_contact → … → opportunity
```

- **No invented facts** — outreach and enrichment must cite real company/product information; outreach emails never assert personal experience absent from the CV.
- **No auto-send** — messages are copied and sent by the candidate.
- Discovery is *spontaneous* or *offer_detected*; Phase B (similar companies) is deferred.

## Product principles

- **CV first** — ATS, matching, and cover letters share one CV context; do not invent skills or results.
- **One job board** — imports (CSV, WTTJ, Apify, extension, sync) land in the same jobs model.
- **Selection → action** — checkbox selection feeds batch analyze / cover-letter flows.
- **Grounded AI** — suggestions and letters must cite or derive from CV + job text only.
- **Tracking is the end state** — applied work should remain visible in applications, not only on the board.
- **Deepen the loop** — prefer improving import → ATS → match → letter → track over unrelated surfaces.
- **Preserve existing flows** — authentication, imports, selection, and cover letters stay intact unless a task explicitly replaces them.

## UX decisions for the candidate loop

- **Correspondance** is based on the same criterion list for the summary, counts and details. The offer requirement, CV documentation and the candidate’s own confirmation remain separate; “Non documenté dans le CV” is not the same as “Je n’ai pas cette expérience”.
- CV rewrites remain previews until explicitly applied to the adapted CV. An unchanged score estimate is neutral, and an item still to confirm never becomes an experience added to the CV.
- **Candidatures** is the primary tracking reference. Status can be changed from the keyboard/touch-accessible pipeline as well as the detail sheet. Letters and applications are always sent manually by the candidate.
- The dashboard shows four KPIs with a next action, not duplicated totals: offers registered (how many still need a CV comparison), applications sent (how many are still in progress), interviews (next date), responses received (response rate). The journey card is not rendered; the “À faire maintenant” list already carries the next step and its first item is labelled “À faire en premier”.
- The job detail “Candidature” tab is staged: update the status, prepare or regenerate the letter, review and copy it, then confirm “J’ai envoyé ma candidature”. Confirmation opens a dialog because the app cannot verify the send. Screens must not advertise unavailable actions (“Bientôt — API à brancher”).
- Offer research and company prospecting are separate paths. Each offer source must state whether it queries a configured live service or filters imported offers. Company identity, company-site links, indirect evidence sources and unverified contact names must not be conflated.
- CV analysis prioritizes two evidence-backed improvements before sub-scores and keyword details. The word **Correspondance** is reserved for CV ↔ specific offer.

## Hébergement et ouverture des inscriptions

Local self-signup is for development only. Keep hosted signup closed until the Supabase Auth confirmation sender/templates and callback have been verified. To open it, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, validate the Auth sender and email templates, set the Supabase Site URL and allow the deployed `/auth/callback` redirect, then set `ALLOW_HOSTED_SIGNUP=true`. Show “Demander un accès démo” only when the request endpoint can persist requests (`SUPABASE_SERVICE_ROLE_KEY`).

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
