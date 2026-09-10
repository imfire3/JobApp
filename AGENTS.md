# Project overview

JobTracker helps candidates manage and optimize job applications: import offers, analyze CV/ATS fit, score matches, generate cover letters, and track applications.

## Stack

Frontend:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Next.js API routes (`app/api/*`)
- Supabase (Auth, PostgreSQL, RLS)
- OpenAI (matching, ATS/CV analysis, cover letters)

## Important principles

Before writing code:

1. Inspect the existing code
2. Understand the architecture
3. Search for reusable components and lib helpers
4. Avoid duplicate implementation

Never:

- rewrite an entire page unnecessarily
- create duplicate components
- introduce new libraries without justification
- modify unrelated features
- invent CV facts or missing job fields

Always:

- preserve TypeScript types at system boundaries
- keep AI calls server-side
- respect RLS and user ownership
- test after implementation
- respect responsive behavior

## Canonical product flow

Import CV → Parse CV → Import job → Extract info → ATS analysis → Missing keywords → CV suggestions → Matching → Cover letter → Track application

Never introduce a feature that contradicts this flow.

## Where to look

- Product: `docs/product.md`
- Architecture: `docs/architecture.md`
- Agent rules: `.cursor/rules/` (`00-project` … `60-testing`)
