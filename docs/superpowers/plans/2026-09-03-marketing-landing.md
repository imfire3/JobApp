# Marketing Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/` redirect with a bilingual (FR/EN toggle) JobTracker marketing landing that sends visitors to login/signup, and redirects authenticated users to the dashboard.

**Architecture:** Server `app/page.tsx` checks local-auth session and either redirects or renders a client `LandingPage`. Copy lives in a typed FR/EN dictionary. Middleware redirects logged-in users away from `/`. Login accepts `?signup=1` for the create-account CTA. Marketing fonts (Syne + Manrope) are loaded only on the landing tree via a route-local layout wrapper or font class on the landing root—without changing the authenticated app’s Montserrat default.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, `next/font/google`, existing local-auth (`getAuthenticatedUser` / session cookie), existing `/login` modes.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-03-marketing-landing-design.md`
- Visual: Ops Signal — graphite / cool off-white, signal cyan accent; Syne + Manrope; no purple-indigo, no warm cream+terracotta, no broadsheet look
- CTAs: `/login` and `/login?signup=1`
- Locale: client toggle + `localStorage` key `jobtracker_landing_locale`, default `fr`
- No waitlist / email capture in v1
- Do not redesign authenticated UI
- Do not commit unless the user explicitly asks
- Validation: `npm run test`, `npx tsc --noEmit` (or project typecheck), `npm run lint` when available

## File map

| File | Role |
| --- | --- |
| `lib/marketing/landing-copy.ts` | FR/EN copy + `LandingLocale` type |
| `lib/marketing/landing-copy.test.ts` | Unit tests for locale resolution / copy keys |
| `components/marketing/landing-page.tsx` | Client landing UI + toggle |
| `app/page.tsx` | Server: auth redirect or `<LandingPage />` |
| `lib/supabase/middleware.ts` | Redirect authenticated users off `/` |
| `app/login/login-client.tsx` | Honor `?signup=1` initial mode |
| `app/layout.tsx` or landing-only fonts | Load Syne/Manrope for marketing without breaking app font |

---

### Task 1: Landing copy dictionary + tests

**Files:**
- Create: `lib/marketing/landing-copy.ts`
- Create: `lib/marketing/landing-copy.test.ts`

**Interfaces:**
- Produces:
  - `export type LandingLocale = "fr" | "en"`
  - `export const LANDING_LOCALE_STORAGE_KEY = "jobtracker_landing_locale"`
  - `export function isLandingLocale(value: unknown): value is LandingLocale`
  - `export function resolveLandingLocale(stored: string | null): LandingLocale`
  - `export const landingCopy: Record<LandingLocale, LandingCopy>`
  - `export type LandingCopy` with fields used by the UI (nav, hero, problem, steps, zoom, closing)

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isLandingLocale,
  resolveLandingLocale,
  landingCopy,
} from "./landing-copy"

describe("landing-copy", () => {
  it("accepts only fr and en", () => {
    assert.equal(isLandingLocale("fr"), true)
    assert.equal(isLandingLocale("en"), true)
    assert.equal(isLandingLocale("de"), false)
    assert.equal(isLandingLocale(null), false)
  })

  it("defaults to fr when storage missing or invalid", () => {
    assert.equal(resolveLandingLocale(null), "fr")
    assert.equal(resolveLandingLocale("nope"), "fr")
    assert.equal(resolveLandingLocale("en"), "en")
  })

  it("exposes matching keys for fr and en", () => {
    const frKeys = Object.keys(landingCopy.fr).sort()
    const enKeys = Object.keys(landingCopy.en).sort()
    assert.deepEqual(frKeys, enKeys)
    assert.equal(landingCopy.fr.brand, "JobTracker")
    assert.ok(landingCopy.fr.heroHeadline.includes("candidature"))
    assert.ok(landingCopy.en.heroHeadline.toLowerCase().includes("application"))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/marketing/landing-copy.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

Create `lib/marketing/landing-copy.ts` with:

```ts
export type LandingLocale = "fr" | "en"

export const LANDING_LOCALE_STORAGE_KEY = "jobtracker_landing_locale"

export type LandingCopy = {
  brand: string
  navLogin: string
  navSignup: string
  heroHeadline: string
  heroSub: string
  ctaSignup: string
  ctaLogin: string
  problemTitle: string
  problemBody: string
  problemPoints: [string, string, string, string]
  howTitle: string
  steps: [
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
  ]
  zoomTitle: string
  zoomSections: [string, string, string, string, string]
  zoomBody: string
  closingTitle: string
  closingBody: string
  localeFr: string
  localeEn: string
}

export const landingCopy: Record<LandingLocale, LandingCopy> = {
  fr: {
    brand: "JobTracker",
    navLogin: "Se connecter",
    navSignup: "Créer un compte",
    heroHeadline: "De l’offre scrapée à la candidature prête",
    heroSub:
      "Importe, score le fit avec ton CV, génère une cover letter — sans jongler entre Excel, WTTJ et ChatGPT.",
    ctaSignup: "Créer un compte",
    ctaLogin: "Se connecter",
    problemTitle: "Le vrai problème n’est pas de trouver des offres",
    problemBody:
      "C’est de les centraliser, décider lesquelles valent le coup, adapter son CV sans inventer, et écrire une lettre crédible — vite.",
    problemPoints: [
      "Onglets WTTJ / LinkedIn / Indeed",
      "Excel ou Notion pour le suivi",
      "ChatGPT hors contexte à chaque offre",
      "Candidatures au feeling",
    ],
    howTitle: "Le parcours",
    steps: [
      { title: "CV", body: "Compte + import CV. L’IA extrait structure, mots-clés ATS et manques." },
      { title: "Import", body: "Offres via CSV / extension WTTJ. Dedup par URL." },
      { title: "Triage", body: "Board Jobs + actions bulk : En cours, Archiver, Candidaté." },
      { title: "Décision", body: "Fiche job : score fit, keywords, améliorations, cover letter." },
      { title: "Pipeline", body: "Applications + dashboard KPI pour piloter le rythme." },
    ],
    zoomTitle: "Le moment décision",
    zoomSections: [
      "Analyse CV",
      "Analyse poste",
      "Keywords match",
      "Amélios CV",
      "Cover letter",
    ],
    zoomBody: "Tu ne décides plus au feeling. Tu décides avec des preuves.",
    closingTitle: "Prêt à tester JobTracker ?",
    closingBody:
      "Objectif : aider plus de gens à trouver du travail, plus vite, avec moins de friction.",
    localeFr: "FR",
    localeEn: "EN",
  },
  en: {
    brand: "JobTracker",
    navLogin: "Log in",
    navSignup: "Create account",
    heroHeadline: "From scraped job to ready-to-send application",
    heroSub:
      "Import roles, score CV fit, generate a credible cover letter — without juggling tabs, spreadsheets, and ChatGPT.",
    ctaSignup: "Create account",
    ctaLogin: "Log in",
    problemTitle: "The hard part isn’t finding jobs",
    problemBody:
      "It’s centralizing them, knowing which ones are worth it, adapting your CV without inventing, and writing a credible letter — fast.",
    problemPoints: [
      "Tabs across WTTJ / LinkedIn / Indeed",
      "Spreadsheets or Notion for tracking",
      "ChatGPT out of context on every role",
      "Applications on gut feel",
    ],
    howTitle: "How it works",
    steps: [
      { title: "CV", body: "Sign up + import your CV. AI extracts structure, ATS keywords, and gaps." },
      { title: "Import", body: "Jobs via CSV / WTTJ extension. Deduped by URL." },
      { title: "Triage", body: "Jobs board + bulk actions: In progress, Archive, Applied." },
      { title: "Decide", body: "Job page: fit score, keywords, CV upgrades, cover letter." },
      { title: "Pipeline", body: "Applications + dashboard KPIs to keep your pace." },
    ],
    zoomTitle: "The decision moment",
    zoomSections: [
      "CV analysis",
      "Job analysis",
      "Keyword match",
      "CV upgrades",
      "Cover letter",
    ],
    zoomBody: "Stop guessing. Decide with evidence.",
    closingTitle: "Ready to try JobTracker?",
    closingBody:
      "Goal: help more people find work, faster, with less friction.",
    localeFr: "FR",
    localeEn: "EN",
  },
}

export const isLandingLocale = (value: unknown): value is LandingLocale =>
  value === "fr" || value === "en"

export const resolveLandingLocale = (stored: string | null): LandingLocale =>
  isLandingLocale(stored) ? stored : "fr"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test lib/marketing/landing-copy.test.ts`  
Expected: PASS

---

### Task 2: Signup deep-link on login

**Files:**
- Modify: `app/login/login-client.tsx` (initial `mode` state)

**Interfaces:**
- Consumes: `searchParams.get("signup")`, existing `Mode`
- Produces: initial mode `signup` when `?signup=1` (and `cv` still wins if both present)

- [ ] **Step 1: Update initial mode resolution**

Replace the `useState<Mode>(...)` initializer with:

```tsx
const [mode, setMode] = useState<Mode>(() => {
  if (searchParams.get("cv") === "1") return "cv"
  if (searchParams.get("signup") === "1") return "signup"
  return "login"
})
```

- [ ] **Step 2: Manual check**

Open `/login?signup=1` — signup form visible.  
Open `/login?cv=1` — still CV mode.  
Open `/login` — login mode.

---

### Task 3: Middleware redirect for authenticated `/`

**Files:**
- Modify: `lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `localUser`, `onboardingDone`, `pathname`
- Produces: redirect `/` → `/dashboard` when session + onboarding done; `/` → `/login?cv=1` when session + onboarding pending

- [ ] **Step 1: Add `/` handling inside `if (localUser)` block**

Immediately after `const onboardingPending = !onboardingDone` / inside `if (localUser)`, before or after `isAuthRoute` handling, add:

```ts
if (pathname === "/") {
  const url = request.nextUrl.clone()
  if (onboardingDone) {
    url.pathname = "/dashboard"
  } else {
    url.pathname = "/login"
    url.searchParams.set("cv", "1")
  }
  return NextResponse.redirect(url)
}
```

- [ ] **Step 2: Sanity check**

Logged-out `/` still passes through (`isPublicRoute`).  
Logged-in + done → dashboard.  
Logged-in + pending → login CV.

---

### Task 4: Landing page UI + home route

**Files:**
- Create: `components/marketing/landing-page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx` — add Syne + Manrope CSS variables **in addition to** existing fonts (landing applies them via className; app shell keeps Montserrat via `font-sans`)

**Interfaces:**
- Consumes: `landingCopy`, `resolveLandingLocale`, `LANDING_LOCALE_STORAGE_KEY`, `LandingLocale`
- Produces: `<LandingPage />` client component
- `app/page.tsx` uses `getAuthenticatedUser()` — if `user` redirect `/dashboard`, else render landing (middleware also guards; page-level is belt-and-suspenders)

- [ ] **Step 1: Extend root fonts in `app/layout.tsx`**

Add:

```ts
import { Geist_Mono, Manrope, Montserrat, Syne } from "next/font/google"

const syne = Syne({
  variable: "--font-marketing-display",
  subsets: ["latin"],
})

const manrope = Manrope({
  variable: "--font-marketing-sans",
  subsets: ["latin"],
})
```

Append `${syne.variable} ${manrope.variable}` to the `<html className=...>`.

In `app/globals.css` `@theme inline`, add:

```css
--font-marketing-display: var(--font-marketing-display);
--font-marketing-sans: var(--font-marketing-sans);
```

(Only if required for Tailwind utilities; otherwise use arbitrary `font-[family-name:var(--font-marketing-display)]` on the landing root.)

- [ ] **Step 2: Implement `components/marketing/landing-page.tsx`**

Client component requirements:

- `useState` locale from `resolveLandingLocale(null)` then `useEffect` read `localStorage`
- Toggle writes `localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, next)`
- `const t = landingCopy[locale]`
- Structure: nav · hero · problem · how (5 steps) · zoom · closing
- Links: signup `href="/login?signup=1"`, login `href="/login"`
- Visual: Ops Signal palette via local CSS variables on a wrapper (`--jt-bg`, `--jt-ink`, `--jt-accent` cyan ~`#2ec4b6` or similar on cool graphite)
- Hero: brand `t.brand` as dominant text signal; headline; sub; CTA pair; full-bleed product plane using `/` public asset — copy `.showcase-refs/jobs.png` to `public/marketing/jobs-board.png` and use `next/image` or `<img>`
- Motion: CSS `@keyframes` fade-up on hero; staggered steps via `animation-delay`; CTA hover
- No cards in hero
- A11y: lang toggle `aria-pressed`, buttons/links with clear labels, keyboard focus

Skeleton:

```tsx
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  LANDING_LOCALE_STORAGE_KEY,
  landingCopy,
  resolveLandingLocale,
  type LandingLocale,
} from "@/lib/marketing/landing-copy"

export const LandingPage = () => {
  const [locale, setLocale] = useState<LandingLocale>("fr")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY)
    setLocale(resolveLandingLocale(stored))
    setReady(true)
  }, [])

  const handleLocale = (next: LandingLocale) => {
    setLocale(next)
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, next)
  }

  const t = landingCopy[locale]

  return (
    <div
      className="min-h-screen bg-[var(--jt-bg)] text-[var(--jt-ink)]"
      style={{
        // Ops Signal tokens — cool graphite + signal cyan
        ["--jt-bg" as string]: "#0f1419",
        ["--jt-surface" as string]: "#171d24",
        ["--jt-ink" as string]: "#e8eef4",
        ["--jt-muted" as string]: "#9aa8b5",
        ["--jt-accent" as string]: "#2ec4b6",
        fontFamily: "var(--font-marketing-sans), system-ui, sans-serif",
      }}
      lang={locale}
    >
      {/* nav, hero, sections using t.* */}
    </div>
  )
}
```

Fill all sections from the spec copy (already in `landingCopy`). Use `font-[family-name:var(--font-marketing-display)]` on brand + H1s.

- [ ] **Step 3: Copy showcase image to public**

```bash
mkdir -p public/marketing
cp .showcase-refs/jobs.png public/marketing/jobs-board.png
```

- [ ] **Step 4: Replace `app/page.tsx`**

```tsx
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth"
import { LandingPage } from "@/components/marketing/landing-page"

export default async function Home() {
  const { user } = await getAuthenticatedUser()
  if (user) {
    redirect("/dashboard")
  }
  return <LandingPage />
}
```

Note: pending onboarding users may still hit page before middleware; middleware Task 3 should send them to CV. If `getAuthenticatedUser` returns user for pending, prefer middleware as source of truth — page redirect to dashboard is OK if middleware already redirected pending away from `/`. Align page with middleware: only redirect when you can detect onboarding done, OR keep page redirect to dashboard and rely on middleware on `/dashboard` to bounce pending to login. Simplest: page redirects any `user` to `/dashboard`; existing middleware on protected routes handles pending. But `/` middleware from Task 3 already redirects pending to login — page may not run. Good.

- [ ] **Step 5: Visual pass in browser**

`npm run dev` → open `http://localhost:3000/` logged out.  
Toggle FR/EN.  
CTAs hit `/login` and `/login?signup=1`.  
Mobile width: stacked hero.

---

### Task 5: Validation

**Files:** none new

- [ ] **Step 1: Unit tests**

Run: `npm test`  
Expected: PASS including `landing-copy` tests

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`  
Expected: exit 0

- [ ] **Step 3: Lint**

Run: `npm run lint`  
Expected: exit 0 (fix only new issues from this change)

- [ ] **Step 4: Manual checklist**

- [ ] Logged-out `/` shows landing  
- [ ] FR/EN toggle persists after refresh  
- [ ] Créer un compte → signup form  
- [ ] Se connecter → login form  
- [ ] Logged-in `/` → dashboard (or CV if pending)

---

## Spec coverage check

| Spec item | Task |
| --- | --- |
| `/` landing, not blind redirect | 4 |
| Auth CTAs login + signup | 2, 4 |
| FR/EN toggle + localStorage | 1, 4 |
| Logged-in `/` → dashboard | 3, 4 |
| Ops Signal look + Syne/Manrope | 4 |
| Sections hero→problem→how→zoom→closing | 4 |
| No waitlist | (omitted) |
| Showcase visual | 4 (`public/marketing/jobs-board.png`) |

## Placeholder scan

None intentional. Commit steps omitted per repo user rule (commit only on request).
