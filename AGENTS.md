# Project overview

JobTracker helps candidates manage and optimize job applications: import offers, analyze CV/ATS fit, score matches, generate cover letters, and track applications.

## Stack

Frontend:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend / data:

- Next.js API routes (`app/api/*`)
- Supabase (Auth, PostgreSQL, RLS)
- OpenAI (matching, CV parsing, cover letters)

## Important principles

Before writing code:

1. Inspect the existing code
2. Understand the architecture
3. Search for reusable components
4. Avoid duplicate implementation

Never:

- rewrite an entire page unnecessarily
- create duplicate components
- introduce new libraries without justification
- modify unrelated features
- contradict the canonical product flow in `docs/product.md`

Always:

- preserve TypeScript types
- test after implementation
- respect responsive behavior
- keep AI and secrets server-side
- verify user ownership and RLS assumptions

## Agent guidance

- Operational rules live in `.cursor/rules/` (`00-project` through `60-testing`).
- Product intent: `docs/product.md`.
- Technical overview: `docs/architecture.md` and `docs/guide-fonctionnement-app.md`.
