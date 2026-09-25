# Project Architecture & Directory Guide — KawaiiMedicine

Medical-education web platform: **video lessons** (VDO), **exams** (EXAM), and **anatomical identify cards** (IDENTIFY) with server-side grading, progress tracking, and admin telemetry.

---

## 🏗️ Directory Map

```text
KawaiiMedicine/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (lint, build, db test)
├── docs/
│   ├── architecture.md          # Complete project structure & architectural guide (this file)
│   └── roadmap.md               # Product roadmap & feature logs from student feedback
├── public/
│   ├── icons/                   # Medical topic icons (heart, lungs, brain, blood-cell, etc.)
│   └── mascot/                  # Mascot brand illustrations (happy.png, README.md)
├── src/
│   ├── app/                     # Next.js 16 App Router (routes, layouts, server actions)
│   │   ├── (public)/            # Landing & authentication entry points
│   │   │   ├── page.tsx         # Guest landing page
│   │   │   └── login/           # Google OAuth & Magic Link authentication
│   │   ├── auth/                # Auth handlers
│   │   │   ├── callback/        # PKCE code & token hash exchange
│   │   │   └── signout/         # Session signout endpoint
│   │   ├── learn/               # Video courses & lesson player
│   │   │   ├── [slug]/          # Course syllabus & video listing
│   │   │   │   ├── [videoId]/   # Interactive video player & watch progress
│   │   │   │   └── feedback/    # Course & video feedback form
│   │   │   └── files/[fileId]/  # Authenticated course PDF slide downloads (signed URL)
│   │   ├── exam/                # Multiple-choice examinations
│   │   │   └── [slug]/          # Exam start & instructions
│   │   │       └── attempt/     # Active attempt runner & results with feedback
│   │   ├── identify/            # Spaced repetition typing flashcards
│   │   │   └── identify-runner  # Daily quota & Netter-style anatomical card solver
│   │   ├── profile/             # Student profile, study streak, & exam history
│   │   ├── admin/               # Staff management & analytics dashboard
│   │   │   ├── courses/         # Course curriculum, video management & file uploads
│   │   │   ├── exams/           # Exam authoring, questions, & bulk image import
│   │   │   ├── identify/        # Card & label editor with organ-system categorization
│   │   │   ├── users/           # Student directory, last-active monitor, inactive badges
│   │   │   ├── feedback/        # Student course/exam feedback reviews
│   │   │   ├── learning-time/   # Video engagement analytics & pace tracking
│   │   │   ├── video-reports/   # Per-video progress summaries
│   │   │   └── results/         # Exam score ledger & CSV grade export
│   │   ├── layout.tsx           # Root HTML layout with theme script & font configuration
│   │   ├── globals.css          # Tailwind CSS v4 design tokens & theme variables
│   │   ├── error.tsx            # Global error boundary (Sentry integration)
│   │   ├── global-error.tsx     # Root-level catastrophic error boundary
│   │   └── not-found.tsx        # 404 page with mascot illustration
│   ├── components/              # Shared UI components & design system
│   │   ├── app-shell.tsx        # Responsive page container with theme-aware navigation
│   │   ├── app-header.tsx       # Main navigation header & user profile menu
│   │   ├── nav-links.tsx        # Navigation links with active route indicators
│   │   ├── theme-script.tsx     # Flash-of-unstyled-content (FOUC) prevention script
│   │   ├── theme-toggle.tsx     # Light / Dark / System theme switcher
│   │   ├── ui.ts                # Shared Tailwind design token classes (btn, card, badge, etc.)
│   │   ├── icons.tsx            # Zero-dependency SVG icon set & brand logo
│   │   ├── topic-icon.tsx       # Dynamic medical topic badge renderer
│   │   ├── mascot.tsx           # Kawaii brand mascot avatar
│   │   ├── empty-state.tsx      # Standard empty list placeholder
│   │   ├── confirm-button.tsx   # Action button with confirmation modal
│   │   ├── flash.tsx            # Toast / Alert banners
│   │   ├── answer-diff.tsx      # Text diff renderer for free-text answers
│   │   ├── organ-system-picker  # Dropdown / badge filter for medical organ systems
│   │   ├── image-field.tsx      # Image URL / storage upload input
│   │   ├── file-list.tsx        # Course PDF attachments list with direct download
│   │   └── line-name-modal.tsx  # Student LINE display name collection dialog
│   ├── lib/                     # Business logic, helpers & database clients
│   │   ├── auth/
│   │   │   ├── require-user.ts  # Server auth gate (requireUser, requireStaff, requireAdmin)
│   │   │   └── site-url.ts      # Deployment origin & redirect URI resolution
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client (Client Components)
│   │   │   ├── server.ts        # Server-side Supabase client with request cookie store
│   │   │   ├── admin.ts         # Service-role Supabase client (Server Functions only)
│   │   │   ├── proxy.ts         # Middleware session cookie refresher & route protection
│   │   │   └── database.types.ts# TypeScript database schema definitions
│   │   ├── exam-status.ts       # Exam window state machine (upcoming, open, closed)
│   │   ├── pace.ts              # Cohort video completion pace calculator (60% milestone)
│   │   ├── storage.ts           # Private storage bucket signed URL batch generator
│   │   └── format.ts            # Thai locale dates, numbers, slugs & duration helpers
│   ├── instrumentation.ts       # Server / Edge Sentry initialization & error hook
│   ├── instrumentation-client.ts# Browser Sentry error monitoring
│   └── proxy.ts                 # Next.js 16 Edge middleware entry point
├── supabase/
│   ├── config.toml              # Local Supabase development configuration
│   ├── migrations/              # Versioned SQL migrations (schema, RLS, triggers, RPCs)
│   └── tests/database/          # pgTAP automated test suites
├── eslint.config.mjs            # Flat ESLint configuration (ignores .next, .claude, etc.)
├── next.config.ts               # Next.js configuration wrapped with Sentry
├── package.json                 # Dependencies & project scripts
├── tsconfig.json                # TypeScript compiler settings
└── vercel.json                  # Vercel deployment headers & configuration
```

---

## 🔐 Security Boundaries & Authorization

1. **Role-Based Access Control**:
   - `profiles.role` ∈ `['student', 'instructor', 'admin']`
   - `is_staff()` helper in SQL checks if current user is instructor or admin.
   - `requireUser()`, `requireStaff()`, and `requireAdmin()` in `src/lib/auth/require-user.ts` enforce permissions on the server.
2. **Exam Answer Key Protection**:
   - `choices.is_correct` is **never** readable by students. Students read options via the `exam_choices` view.
   - Grading happens exclusively on the Postgres server via the `submit_exam_attempt(uuid)` RPC.
3. **Identify Card Answers**:
   - `id_card_labels` table is restricted to staff.
   - Students receive questions via `next_id_question()` and submit answers via `answer_id_label()`.
   - Daily quotas (5/day standard, 10/day for course completers) are strictly enforced in SQL.
4. **Storage Privacy**:
   - Videos and course PDFs live in private buckets (`videos`, `course-files`).
   - Served exclusively via short-lived signed URLs generated on-demand.

---

## 🛠️ Verification & Maintenance Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start local development server with Turbopack |
| `npm run check` | Run fast combined validation: ESLint + TypeScript typecheck (`tsc --noEmit`) |
| `npm run lint` | Run ESLint with project-specific rules |
| `npm run typecheck` | Run TypeScript compiler type-checking without emitting files |
| `npm run build` | Compile optimized production build |
| `npm run db:types` | Regenerate TypeScript schema types from the remote Supabase project |
| `npm run db:push` | Push pending SQL migrations to the Supabase database |
