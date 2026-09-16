# JobTracker v2 — Complete Codebase Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Architecture](#architecture)
5. [Pages & Routes](#pages--routes)
6. [API Routes Reference](#api-routes-reference)
7. [Lib Modules](#lib-modules)
8. [Components](#components)
9. [Database Schema](#database-schema)
10. [Authentication](#authentication)
11. [AI Integration](#ai-integration)
12. [Sources & Connectors](#sources--connectors)
13. [Types](#types)
14. [Configuration](#configuration)
15. [Scripts & Tooling](#scripts--tooling)

---

## Project Overview

**JobTracker** is a personal SaaS-style job application CRM for Product Owner / Product Manager candidates. It centralizes job importing, CV-based AI matching, ATS analysis, cover letter generation, and application tracking.

### Core Product Flow

```
Import CV → Parse CV → Import job offer → Extract job information →
Analyze ATS compatibility → Identify missing keywords → Suggest CV improvements →
Score job/CV match → Generate cover letter → Track application
```

### Job Status Pipeline

```
new → selected → cover_generated → applied → interview → offer / rejected / archived
```

### Company Prospection Flow

```
Describe target companies → Parse criteria → Search connector →
Score match + opportunity → Persist company → Generate outreach → Track status
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui |
| Database | Supabase (PostgreSQL, Auth, RLS, Storage) |
| AI | OpenAI (`gpt-4o-mini` for all AI features) |
| PDF Parsing | `unpdf`, `mammoth` (DOCX) |
| Scraper | Apify (WTTJ, LinkedIn connectors) |
| Job API | France Travail (OAuth2 client credentials) |
| Deployment | Vercel |
| Testing | Node.js test runner (`node --import tsx --test`) |
| Linting | ESLint 9 (flat config) |

### Key Dependencies

- `@supabase/ssr` + `@supabase/supabase-js` — Supabase client
- `openai` — OpenAI SDK
- `zod` — Schema validation
- `date-fns` — Date utilities
- `xlsx` — Excel file parsing/export
- `sonner` — Toast notifications
- `next-themes` — Dark/light mode
- `lucide-react` — Icons
- `class-variance-authority`, `clsx`, `tailwind-merge` — Styling utilities

---

## Directory Structure

```
appjobs-v2/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # Backend API routes
│   ├── auth/               # Auth callback
│   ├── dashboard/          # Dashboard page
│   ├── login/              # Login page
│   ├── onboarding/         # Onboarding wizard
│   ├── jobs/               # Jobs board + detail
│   ├── companies/          # Company CRM
│   ├── applications/       # Application tracker
│   ├── research/           # AI research plans
│   ├── sources/            # Job source connectors
│   ├── profile-ai/         # CV upload/parsing
│   ├── settings/           # User settings
│   ├── imports/            # CSV/Excel import
│   └── extension/          # Chrome extension guide
│
├── components/             # React components
│   ├── auth/               # Auth card
│   ├── dashboard/          # Dashboard views (KPIs, kanban, table)
│   ├── jobs/               # Job detail, tracked searches
│   ├── companies/          # Company search + detail
│   ├── sources/            # Source management
│   ├── imports/            # Import UI
│   ├── settings/           # Settings panels
│   ├── profile/            # Profile forms
│   ├── onboarding/         # Onboarding steps
│   ├── research/           # Research page
│   ├── landing/            # Landing page + demo request
│   ├── layout/             # App shell, sidebar, mobile nav
│   └── ui/                 # shadcn/ui primitives (21 components)
│
├── lib/                    # Business logic & services
│   ├── ai/                 # AI prompts + schemas
│   ├── applications/       # Application upsert logic
│   ├── ats/                # ATS keyword catalog + matching
│   ├── connectors/         # Job connectors (mock, Apify, France Travail)
│   ├── cover-letters/      # Cover letter generation service
│   ├── cv/                 # CV parsing (PDF, experiences)
│   ├── cv-analysis/        # CV ATS analysis service
│   ├── demo-request/       # Demo request handling
│   ├── dev/                # Dev seed data
│   ├── imports/            # File import logic
│   ├── jobs/               # Job utilities (scoring, normalization, caching)
│   ├── onboarding/         # Onboarding flow logic
│   ├── openai/             # OpenAI client + API key management
│   ├── profile/            # Profile extraction + schema
│   ├── research/           # Research execution
│   ├── resume/             # Resume parsing (text, OCR, matchers)
│   ├── sources/            # Source constants, bootstrap, sync
│   ├── supabase/           # Supabase client configs + middleware
│   └── sync/               # Tracked search sync orchestration
│
├── types/                  # Shared TypeScript types (822 lines)
├── supabase/               # Database migrations (27 files)
├── scripts/                # Utility scripts
├── chrome-extension/       # Chrome extension for WTTJ/Indeed
├── docs/                   # Documentation
├── public/                 # Static assets
├── data/                   # Sample CSV data
└── test/                   # Test fixtures
```

---

## Architecture

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Chrome     │     │  France      │     │   Apify     │
│  Extension   │     │  Travail API │     │  Scraper    │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       └───────────┬───────┴────────────────────┘
                   ▼
        ┌─────────────────────┐
        │   Import / Sync     │
        │   (lib/imports/)    │
        └─────────┬───────────┘
                  ▼
        ┌─────────────────────┐
        │   Supabase DB       │
        │   (jobs, profiles,  │
        │    companies, etc.) │
        └─────────┬───────────┘
                  ▼
        ┌─────────────────────┐     ┌─────────────┐
        │   AI Analysis       │────▶│   OpenAI    │
        │   (lib/ai/)         │     │  gpt-4o-mini│
        └─────────┬───────────┘     └─────────────┘
                  ▼
        ┌─────────────────────┐
        │   Next.js UI        │
        │   (app/, components/)│
        └─────────────────────┘
```

### Supabase Client Variants

1. **Browser Client** (`lib/supabase/client.ts`) — `createBrowserClient`, uses custom fetch for reachability
2. **Server Client** (`lib/supabase/server.ts`) — `createServerClient`, reads cookies via `next/headers`
3. **Service-Role Client** (`lib/supabase/admin.ts`) — Bypasses RLS, used for admin operations

### Middleware Flow

`proxy.ts` → `updateSession()` in `lib/supabase/middleware.ts`:
- Public routes: `/`, `/login`, `/auth/*`, `/api/setup/*`, `/api/demo-request`
- Onboarding-allowed: `/onboarding`, `/api/profile`, `/api/settings`
- Logged-in at `/` → redirect to `/dashboard`
- Onboarding pending → redirect to `/login?cv=1`
- Unauthenticated API → 401 JSON

---

## Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Marketing landing page |
| `/login` | `LoginPageClient` | Email/password login form |
| `/dashboard` | `DashboardOverview` | KPIs, kanban board, job table |
| `/jobs` | `TrackedJobsPage` | Tracked searches + job board |
| `/jobs/[id]` | `JobDetailLabPage` | Job detail with AI analysis |
| `/companies` | `CompanySearchPage` | Company CRM search |
| `/companies/[id]` | `CompanyDetailPage` | Company detail + contacts + outreach |
| `/applications` | Inline page | Application pipeline (kanban + table) |
| `/sources` | `SourcesPage` | Job source connectors overview |
| `/sources/[sourceId]` | Placeholder | Source detail (coming soon) |
| `/imports` | `ImportsPage` | CSV/Excel job import |
| `/research` | `ResearchPage` | AI research plan execution |
| `/profile-ai` | `ProfilePage` | CV upload + candidate profile |
| `/profile-ai/optimize` | `CvOptimizePage` | CV optimization suggestions |
| `/settings` | `GeneralSettingsForm` | User settings, ATS keywords, AI prompts |
| `/extension` | `ExtensionGuide` | Chrome extension installation |
| `/onboarding` | Redirect | Redirects to `/login?cv=1` |
| `/onboarding/profile` | Onboarding profile | Profile onboarding step |
| `/onboarding/metiers` | `MetiersPageClient` | Job titles onboarding step |

---

## API Routes Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Local auth login |
| `/api/auth/signup` | POST | Local self-signup (gated) |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/create-user` | POST | Admin-only user creation |
| `/api/auth/reset-local` | GET/POST | Reset local auth state |
| `/api/auth/callback` | GET | Supabase OAuth callback |

### Jobs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | GET | List all user jobs |
| `/api/jobs` | PATCH | Update job status (single/batch) |
| `/api/jobs` | DELETE | Delete jobs |
| `/api/jobs/[id]` | GET | Single job detail |
| `/api/analyze-job` | POST | AI job match analysis |
| `/api/analyze-job/confirm` | POST | Confirm/deny criterion |

### Cover Letters

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-cover-letter` | POST | Generate single cover letter |
| `/api/generate-cover-letter/batch` | POST | Batch generate (up to 10) |

### Profile & CV

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET/PUT | Load/save CV + profile |
| `/api/profile/extract` | POST | Parse CV → structured profile |
| `/api/profile/import-cv` | POST | Upload CV (PDF/image) |
| `/api/profile/analyze-cv` | GET/POST | CV ATS analysis |
| `/api/profile/cv-analysis-prompt` | GET/PUT | AI prompt customization |

### Applications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/applications` | GET/POST/PATCH | Application CRUD + history |

### Companies

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/companies` | GET/POST | List/create companies |
| `/api/companies/[id]` | GET/PATCH | Company detail + update |
| `/api/companies/[id]/contacts` | GET | Company contacts |
| `/api/companies/[id]/outreach` | POST | Generate outreach messages |
| `/api/companies/export` | POST | Export companies to XLSX |
| `/api/searches/companies/parse` | POST | NL → structured search |
| `/api/searches/companies/run` | POST | Execute company search |

### Sources & Sync

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sources` | GET | List sources |
| `/api/sources/[sourceId]` | GET/PUT | Source detail |
| `/api/sources/[sourceId]/searches` | GET/POST | Source searches |
| `/api/sources/france-travail/sync` | POST | France Travail sync |
| `/api/sync/daily` | POST | Daily cron sync |
| `/api/sync/source/[sourceId]` | POST | Sync single source |
| `/api/sync/search/[searchId]` | POST | Sync single search |

### Tracked Searches

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tracked-searches` | GET/POST | List/create tracked searches |
| `/api/tracked-searches/[searchId]` | PATCH/DELETE | Update/delete search |
| `/api/tracked-searches/[searchId]/run` | POST | Run single search |
| `/api/tracked-searches/run-all` | POST | Run all enabled searches |

### Imports

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/import-jobs` | POST | Import from CSV/XLSX/JSON |
| `/api/import-jobs/preview` | POST | Preview import (no DB write) |
| `/api/import-jobs/json` | POST | Import WTTJ JSON |
| `/api/import-jobs/sample` | POST | Import 10 sample jobs |

### Other

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/summary` | GET | Dashboard aggregate data |
| `/api/notifications` | GET/PATCH | User notifications |
| `/api/settings` | GET/PUT | User settings |
| `/api/onboarding` | GET/PATCH | Onboarding state |
| `/api/welcome` | GET/POST | Product welcome |
| `/api/setup/status` | GET | Health check |
| `/api/demo-request` | POST | Demo request submission |
| `/api/dev/seed-jobs` | POST | Dev seed data |
| `/api/research/plan` | POST | NL → research plan |
| `/api/research/run` | POST | Execute research |
| `/api/research/import` | POST | Import research candidates |

---

## Lib Modules

### Authentication (`lib/auth.ts`, `lib/local-auth.ts`)

- `getAuthenticatedUser()` — Main auth gateway (local cookie → Supabase JWT)
- Local auth: HMAC-based passwords, base64url session tokens (30-day expiry)
- Self-signup gate: enabled locally, disabled on Vercel

### Supabase (`lib/supabase/`)

| File | Purpose |
|------|---------|
| `client.ts` | Browser client |
| `server.ts` | Server client |
| `admin.ts` | Service-role client (bypasses RLS) |
| `env.ts` | Environment validation |
| `fetch.ts` | Custom fetch with 8s timeout + circuit breaker |
| `reachability.ts` | Supabase reachability state (15s TTL) |
| `offline.ts` | Fake client when Supabase unreachable |
| `middleware.ts` | Next.js middleware (session, redirects) |
| `ensure-local-user.ts` | Bridge local auth → Supabase |

### AI Services (`lib/ai/`, `lib/openai/`)

| Module | Purpose |
|--------|---------|
| `cv-analysis.ts` | ATS CV analysis (5 scores + recommendations) |
| `cover-letter.ts` | Cover letter generation (FR/EN auto-detect) |
| `research-plan.ts` | NL → structured research plan |
| `company-ai.ts` | Company enrichment + outreach |
| `cv-extract.ts` | CV structured extraction |
| `openai/client.ts` | Core OpenAI wrappers |
| `openai/api-key.ts` | Key resolution + error mapping |
| `ai/prompts/` | 12 prompt modules with version tracking |
| `ai/schemas/` | Zod parsers for AI JSON responses |

### Jobs (`lib/jobs/`)

| Module | Purpose |
|--------|---------|
| `mapper.ts` | DB row → UI view model transformation |
| `normalize.ts` | Field normalization (location, salary, remote) |
| `derive-match-score.ts` | Multi-source score derivation |
| `criteria-score.ts` | Weighted criteria scoring (0-3 evidence) |
| `ats-offer-score.ts` | Deterministic ATS offer-CV score |
| `job-fit-cache.ts` | Content-hash caching |
| `company-prospecting.ts` | Company search pipeline |
| `company-score.ts` | Opportunity scoring |
| `tracked-search-schema.ts` | Zod validation |

### Connectors (`lib/connectors/`)

| Module | Purpose |
|--------|---------|
| `index.ts` | Connector orchestration |
| `types.ts` | `JobConnector` interface |
| `mock.ts` | Mock connectors (dev) |
| `apify.ts` | Apify connectors (WTTJ, LinkedIn) |
| `france-travail/` | France Travail OAuth2 + API client |

### Sources (`lib/sources/`)

| Module | Purpose |
|--------|---------|
| `constants.ts` | 8 source definitions + default searches |
| `bootstrap.ts` | Idempotent source creation |
| `presentation.ts` | UI metadata mapping |
| `france-travail-sync.ts` | France Travail sync pipeline |

### CV & Resume (`lib/cv/`, `lib/resume/`)

| Module | Purpose |
|--------|---------|
| `extract-pdf-text.ts` | PDF text extraction (unpdf) |
| `experiences.ts` | CV experience parsing |
| `resume/extract-text.ts` | PDF/image text extraction |
| `resume/ocr-vision.ts` | OpenAI Vision OCR |
| `resume/parse-resume.ts` | Full resume parser |
| `resume/map-to-profile.ts` | Resume → profile mapping |

### ATS Keywords (`lib/ats/`)

| Module | Purpose |
|--------|---------|
| `catalog.ts` | 200+ PM/PO ATS keywords with aliases + weights |
| `index.ts` | Catalog builder, lookup index, matching |
| `types.ts` | Normalization + type definitions |

### Other Modules

| Module | Purpose |
|--------|---------|
| `lib/imports/` | File parsing (CSV, XLSX, JSON), WTTJ normalization |
| `lib/cover-letters/service.ts` | Full cover letter pipeline |
| `lib/cv-analysis/service.ts` | CV analysis lifecycle + caching |
| `lib/onboarding/` | Onboarding flow state machine |
| `lib/research/` | Research plan execution + import |
| `lib/profile/` | Profile extraction + caching |
| `lib/demo-request/` | Demo request + email notification |
| `lib/sync/` | Tracked search sync orchestration |
| `lib/applications/` | Application upsert from jobs |

---

## Components

### Layout (5)

| Component | File | Description |
|-----------|------|-------------|
| `AppShell` | `components/layout/app-shell.tsx` | Main layout wrapper (sidebar + content) |
| `Sidebar` | `components/layout/sidebar.tsx` | Desktop sidebar navigation |
| `MobileNav` | `components/layout/mobile-nav.tsx` | Mobile bottom navigation |
| `StickyPageHeader` | `components/layout/sticky-page-header.tsx` | Sticky header with actions |
| `navItems` | `components/layout/nav-items.ts` | Navigation item definitions |

### Dashboard (9)

| Component | Description |
|-----------|-------------|
| `DashboardOverview` | Main dashboard with KPIs + job views |
| `KpiCards` | Summary metric cards |
| `JobBoard` | Job board wrapper |
| `JobKanban` | Kanban board view |
| `JobTable` | Table view |
| `JobCard` | Individual job card |
| `JobFilters` | Filter controls |
| `JobBulkActions` | Bulk action bar |
| `CoverLetterModal` | Cover letter display/edit |

### Jobs (6)

| Component | Description |
|-----------|-------------|
| `TrackedJobsPage` | Tracked jobs + search management |
| `TrackedSearchForm` | Search create/edit form |
| `JobDetailLabPage` | Job detail with AI analysis |
| `JobDetailOverview` | Lab overview component |
| `JobScoringProgress` | Scoring progress indicator |
| `SearchableMultiSelect` | Multi-select dropdown |

### Companies (5)

| Component | Description |
|-----------|-------------|
| `CompanySearchPage` | Company CRM search interface |
| `CompanyDetailPage` | Company detail + contacts + outreach |
| `CompanyCard` | Company display card |
| `CompanyLabels` | Status/type labels |
| `OpportunityScore` | Opportunity score display |

### Settings (6)

| Component | Description |
|-----------|-------------|
| `GeneralSettingsForm` | Settings wrapper |
| `AiPromptsPanel` | AI prompt customization |
| `AtsKeywordsPanel` | ATS keyword management |
| `CvAnalysisPanel` | CV analysis display |
| `CvOptimizePage` | CV optimization page |
| `AdminCreateAccessForm` | Admin user creation |

### Profile (7)

| Component | Description |
|-----------|-------------|
| `ProfilePage` | Profile page |
| `CandidateProfileForm` | Profile form |
| `ExperienceDialog` | Experience add/edit |
| `EducationDialog` | Education add/edit |
| `EducationEntriesCard` | Education display |
| `LanguageEntriesField` | Languages field |
| `DateOfBirthField` | DOB picker |
| `SortableList` | Drag-and-drop list (HTML5 API) |

### UI Primitives (21 shadcn/ui)

`badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `field`, `input`, `label`, `native-select`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`, `use-anchored-dropdown-style`

---

## Database Schema

### Core Tables (27 migrations)

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (CV, skills, experience, education, languages, contact) |
| `jobs` | Normalized job listings (50+ columns, AI analysis, keywords) |
| `applications` | Application pipeline tracking with history |
| `cover_letters` | Generated cover letters (unique per user+job) |
| `user_settings` | Theme, notifications, AI keys, prompts, onboarding |
| `job_sources` | Connector sources (FT, WTTJ, LinkedIn, Indeed, etc.) |
| `source_searches` | Saved search configurations per source |
| `tracked_searches` | Alert-style tracked searches |
| `cv_contexts` | CV text storage per user |
| `cv_analyses` | Cached CV ATS analysis per user |
| `sync_logs` | Sync operation logs |
| `connector_run_logs` | External scraper run logs |
| `notifications` | In-app notifications |
| `company_searches` | NL company search criteria + results |
| `companies` | Company CRM records |
| `company_contacts` | Contact persons at companies |
| `outreach_messages` | Email/LinkedIn outreach drafts |
| `demo_requests` | Landing page demo requests |

### Storage

- **Bucket**: `cv-files` (private, 8MB limit, PDF/image MIME types)

### RLS Policies

Every table has Row Level Security with `auth.uid() = user_id` policies.

---

## Authentication

### Local Auth Mode

- HMAC-based password hashing (sha256 + pepper)
- Base64url session tokens (30-day expiry)
- Seeded admin user: `admin@gmail.com` / `admin`
- In-memory user registry
- Bridges to Supabase via `ensureLocalAuthUserInSupabase()`

### Supabase Auth Mode

- Standard Supabase JWT-based auth
- Cookie-based session management via `@supabase/ssr`
- Custom fetch wrapper with reachability detection

### Auth Flow

1. User logs in → local cookie set OR Supabase session created
2. `getAuthenticatedUser()` checks local cookie first, falls back to Supabase
3. If local user not in Supabase → auto-creates via Admin API
4. RLS enforced at database level

---

## AI Integration

### Models

- Default: `gpt-4o-mini` (configurable via `OPENAI_MODEL` env)
- All AI features use server-side OpenAI calls
- User API keys are NOT used (security gate)

### AI Features

| Feature | Endpoint | Output |
|---------|----------|--------|
| Job Match | `/api/analyze-job` | Match score, keywords, criteria, ATS breakdown, CV improvements |
| CV Analysis | `/api/profile/analyze-cv` | 5 ATS scores + recommendations |
| Cover Letter | `/api/generate-cover-letter` | Letter + angle briefing + subject + coach notes |
| CV Extraction | `/api/profile/extract` | Structured profile from CV text |
| Research Plan | `/api/research/plan` | NL → structured research criteria |
| Company Search | `/api/searches/companies/parse` | NL → structured company criteria |
| Outreach | `/api/companies/[id]/outreach` | AI-generated outreach messages |

### Prompt System

- 12 prompt modules in `lib/ai/prompts/`
- Editable via Settings UI (`AiPromptsPanel`)
- Version-tracked prompts
- System + user prompt separation

### Response Validation

- Zod schemas in `lib/ai/schemas/`
- Structured JSON output from OpenAI
- Validation + error handling on all AI responses

---

## Sources & Connectors

### 8 Job Sources

| Source | Slug | Ingestion Mode |
|--------|------|----------------|
| France Travail | `france-travail` | API (OAuth2) |
| Welcome to the Jungle | `wttj` | Extension |
| LinkedIn | `linkedin` | Extension |
| Indeed | `indeed` | Extension |
| APEC | `apec` | Extension |
| Hellowork | `hellowork` | Extension |
| LesJeudis | `lesjeudis` | Extension |
| Talent.io | `talent-io` | Extension |

### Ingestion Modes

- **`api`**: Direct API integration (France Travail)
- **`extension`**: Chrome extension parsing
- **`url_or_extension`**: URL paste or extension

### Sync Modes

- **`mock`**: Development/testing (random fake jobs)
- **`apify`**: Production scraper (WTTJ, LinkedIn)
- **`api`**: Direct API (France Travail)

---

## Types

**File**: `types/index.ts` (822 lines)

### Key Types

| Type | Description |
|------|-------------|
| `JobStatus` | `"new" | "selected" | "cover_generated" | "applied" | "interview" | "offer" | "rejected" | "archived"` |
| `JobRecord` | Full DB row (55+ fields) |
| `Job` | UI view model with computed fields |
| `ImportedJob` | Normalized import format |
| `JobAnalysis` | AI match results |
| `CvAtsAnalysis` | CV ATS analysis |
| `Company` | Company CRM record |
| `CompanyContact` | Contact person |
| `OutreachMessage` | Outreach draft |
| `CoverLetter` | Generated cover letter |
| `Application` | Application record |
| `Profile` | Candidate profile |
| `UserSettings` | User preferences |
| `TrackedSearch` | Saved search |
| `JobSource` | Source configuration |

### Constants

`JOB_STATUSES`, `COMPANY_PIPELINE_STATUSES`, `APPLICATION_STATUSES`, `REMOTE_MODES`, `EXPERIENCE_LEVELS`, `SYNC_STATUSES`

---

## Configuration

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Auth
LOCAL_ADMIN_ID=
AUTH_SECRET=

# Connectors
JOB_SYNC_MODE=mock|apify
APIFY_TOKEN=

# France Travail
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=

# Cron
CRON_SECRET=
JOB_SYNC_SECRET=

# Self-signup
ALLOW_SELF_SIGNUP=true|false
```

### Next.js Config

- Turbopack enabled
- Allowed dev origins: `192.168.1.31`, `localhost`, `127.0.0.1`
- Server external packages: `unpdf`, `mammoth`, `@napi-rs/canvas`

### TypeScript Config

- Target: ES2017, strict mode
- Path alias: `@/*` → `./*`

---

## Scripts & Tooling

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start dev server |
| `build` | `npm run build` | Production build |
| `test` | `npm test` | Run all test files |
| `lint` | `npm run lint` | ESLint check |
| `seed:ats` | `npm run seed:ats` | Seed ATS keyword catalog |
| `pack:extension` | `npm run pack:extension` | Zip Chrome extension |
| `import:wttj` | `npm run import:wttj` | Import WTTJ JSON data |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed-ats-keywords.ts` | Seed ATS catalog to DB |
| `scripts/import-wttj-json.ts` | Import WTTJ JSON data |
| `scripts/replace-wttj-jobs.ts` | Replace WTTJ jobs in DB |
| `scripts/capture-screens.mjs` | Capture app screenshots (Playwright) |

### Testing

```bash
# Run all tests
node --import tsx --test $(find lib -name '*.test.ts' | sort)

# Test files exist in:
# lib/local-auth.test.ts
# lib/auth/self-signup.test.ts
# lib/ai/schemas/*.test.ts
# lib/jobs/*.test.ts
# lib/imports/*.test.ts
# lib/cv/*.test.ts
# lib/cv-analysis/service.test.ts
# lib/profile/*.test.ts
# lib/sources/presentation.test.ts
# lib/supabase/*.test.ts
# lib/onboarding/*.test.ts
# lib/demo-request/notify.test.ts
# lib/dev/fake-jobs.test.ts
```

---

## Chrome Extension

**Location**: `chrome-extension/`

- Manifest V3
- Permissions: WTTJ + Indeed content scripts
- Parses job pages via JSON-LD `JobPosting` or DOM fallback
- Maintains single CSV for re-import
- Install via `npm run pack:extension` → `public/downloads/jobtracker-chrome-extension.zip`

---

*Generated from codebase analysis — Last updated: 2026-09-15*
