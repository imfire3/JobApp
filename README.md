# JobTracker — Personal PO/PM Job Search Dashboard

A personal SaaS-style dashboard to track Product Owner and Product Manager job offers, score fit with AI, and generate tailored cover letters.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** + **shadcn/ui**
- **Supabase** — auth, Postgres, RLS
- **OpenAI** — job matching & cover letter generation

## Features

- Job board with card/table views and filters (source, location, remote, status, match score, last 24h)
- CSV/Excel job import (`/imports`) with strict schema validation and URL deduplication
- CV profile & target roles/locations (`/settings`)
- AI match analysis (`/api/analyze-job`) — score, reasons, gaps, cover letter angle
- Cover letter generation (`/api/generate-cover-letter`) with edit/copy modal
- Application pipeline: `new → selected → cover_generated → applied → interview → rejected → archived`
- KPI dashboard: jobs today, selected, cover letters, applications, avg. match score

## Setup

### 1. Clone & install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` via the SQL editor
3. Enable Email auth (Authentication → Providers → Email)
4. Copy your project URL and anon key

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Optional, defaults to `gpt-4o-mini` |

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, paste your CV in Settings, then upload a CSV/XLSX file from **Imports**.

## MVP import pipeline

For MVP, live scraping is disabled. Instead:

1. Generate a CSV/XLSX file with your scraper tool (Apify, Browse AI, Octoparse, or custom scripts)
2. Keep columns exactly as: `source,title,company,location,remote,salary,posted_at,url,description`
3. Upload the file in `/imports` (or POST multipart form-data to `/api/import-jobs`)

This keeps ingestion deterministic while still preserving the connector abstraction for later automation.

## Adding real job sources later

Job sources are pluggable via the `JobConnector` interface in `lib/connectors/types.ts`.

1. Create a connector (e.g. `lib/connectors/apify-wttj-connector.ts`)
2. Implement `fetchJobs()` — map external API output to `ImportedJob`
3. Register it in `lib/connectors/index.ts`

See `lib/connectors/apify.ts` and `lib/connectors/mock.ts` for connector integration points.

Deduplication happens automatically by `url` per user at import time.

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/import-jobs` | POST | Import CSV/XLSX jobs file |
| `/api/jobs` | GET, PATCH | List / update jobs |
| `/api/profile` | GET, PUT | CV profile |
| `/api/analyze-job` | POST | AI match analysis |
| `/api/generate-cover-letter` | POST | AI cover letter |

## Project structure

```
app/
  dashboard/          # Main job board
  settings/           # CV & preferences
  login/              # Auth
  api/                # API routes
components/
  dashboard/          # Job board UI
  layout/             # Sidebar
lib/
  connectors/         # Job source abstraction
  openai/             # AI client
  supabase/           # DB clients
supabase/
  migrations/         # SQL schema
types/                # Shared TypeScript types
```

## License

Private / personal use.
