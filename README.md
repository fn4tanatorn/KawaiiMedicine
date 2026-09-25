# KawaiiMedicine

Medical-education web platform: **video lessons** and **exams**.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

## Database

Migrations live in `supabase/migrations/`. The CLI is linked to the `KawaiiMedicine` Supabase project.

```bash
supabase link --project-ref tbyqvtgafqcgvpqqmhfi   # once per machine
supabase db push                                    # apply migrations
npm run db:types                                    # regenerate TS types
```

## Commands

```bash
npm run dev        # start local dev server at http://localhost:3000
npm run check      # fast combined lint & typecheck (eslint + tsc)
npm run lint       # run ESLint
npm run typecheck  # run TypeScript compiler check (tsc --noEmit)
npm run build      # compile optimized production build
npm run db:types   # regenerate src/lib/supabase/database.types.ts
npm run db:push    # apply migrations to linked Supabase project
```

## Documentation & Architecture

- [Architecture & Directory Map](docs/architecture.md) — Detailed breakdown of routes, components, data flows, and security policies.
- [Feature Roadmap](docs/roadmap.md) — Living document tracking student survey priorities and implementation milestones.
- [Agent Protocol & Rules](AGENTS.md) — Architecture, Next.js 16 conventions, and strict security rules.

## Deploy

Production: https://kawaiimedicine.vercel.app (Vercel, auto-deploys from `main`).
Required Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
