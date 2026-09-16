# JobTracker marketing landing — design

Date: 2026-09-03  
Status: approved for planning  
Scope: public marketing site at `/` inside the existing Next.js app

## Goal

Official launch surface for JobTracker: explain the use case, attract early users, and route them to login / signup. Bilingual FR/EN with an in-page toggle.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Placement | Same Next.js app; `/` is the landing |
| Auth CTAs | Login + create account → `/login` (signup mode when available) |
| Language | FR + EN via client toggle (`localStorage`, default FR) |
| Waitlist | Out of scope for v1 |
| Logged-in visit to `/` | Redirect to `/dashboard` |

## Routing & auth

- Replace current `app/page.tsx` redirect-to-dashboard with a landing page for anonymous visitors.
- Keep `/` in the middleware public-route list (already present).
- If a session exists when hitting `/`, redirect to `/dashboard` (page-level or middleware).
- Do not change authenticated app shell, onboarding, or API routes beyond what `/` requires.

## Information architecture

1. **Top nav** — JobTracker wordmark · FR/EN toggle · Se connecter · Créer un compte  
2. **Hero** — brand-first · one headline · one supporting sentence · CTA pair · full-bleed product visual  
3. **Problem** — chaos of multi-tool job search (tabs / Excel / ChatGPT)  
4. **How it works** — five steps: CV → Import → Triage → Decision → Pipeline  
5. **Product zoom** — job detail: CV analysis, job analysis, keywords, CV improvements, cover letter  
6. **Closing CTA** — repeat create account + login  

## Visual direction — “Ops Signal”

- Palette: graphite / cool off-white surfaces; **signal cyan** accent for CTAs and highlights. No purple-indigo theme, no warm cream + terracotta, no broadsheet newspaper look.
- Type: **Syne** for brand and display headings; **Manrope** for body.
- Hero: one composition; brand is hero-level; no cards in the hero; product UI as dominant visual plane (screenshot or stylized board mock).
- Motion (2–3 intentional): hero content fade/rise; step sequence reveal; CTA hover/focus states.
- Mobile: stack hero copy above visual; CTAs full-width; toggle remains reachable in nav.

## Copy — FR

- Brand: JobTracker  
- Hero headline: De l’offre scrapée à la candidature prête  
- Hero sub: Importe, score le fit avec ton CV, génère une cover letter — sans jongler entre Excel, WTTJ et ChatGPT.  
- Primary CTA: Créer un compte  
- Secondary CTA: Se connecter  
- Problem framing: centraliser, décider lesquelles valent le coup, adapter le CV sans inventer, écrire une lettre crédible vite.  
- Closing: Objectif — aider plus de gens à trouver du travail, plus vite, avec moins de friction.

## Copy — EN

- Hero headline: From scraped job to ready-to-send application  
- Hero sub: Import roles, score CV fit, generate a credible cover letter — without juggling tabs, spreadsheets, and ChatGPT.  
- Primary CTA: Create account  
- Secondary CTA: Log in  
- Closing: Help more people find work, faster, with less friction.

## Technical sketch

- `app/page.tsx` — server entry: session check → redirect or render landing.
- `components/marketing/landing-page.tsx` (client) — locale state, sections, CTAs.
- `lib/marketing/landing-copy.ts` — FR/EN string dictionary.
- Fonts via `next/font/google` (Syne + Manrope) scoped to marketing layout or landing root.
- Prefer existing Tailwind tokens where possible; add marketing-only CSS variables if needed without redesigning the authenticated UI.
- Signup deep-link: reuse current login page modes (`/login` + signup query/mode already used by onboarding work).

## Out of scope (v1)

- Waitlist / email capture table  
- Separate marketing repo or domain  
- Blog, pricing, billing  
- Full i18n of the authenticated app  
- SEO blog content beyond basic title/description meta  

## Success criteria

- Anonymous user opens `/` and understands JobTracker in <10 seconds.  
- Can switch FR ↔ EN without reload.  
- Can reach login and signup from primary CTAs.  
- Authenticated user on `/` lands on dashboard.  
- Landing does not break existing middleware public/auth rules.

## Open risks

- Product screenshot asset may be missing — use a stylized UI mock if no approved screenshot.  
- Login signup URL/query must match current `login-client` modes.  
- Font loading should not regress app-wide layout; scope fonts to marketing when practical.
