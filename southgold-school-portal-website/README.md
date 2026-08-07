# SouthGold School Portal

A multi-role **school management platform** for SouthGold Montessori School (Lagos, Nigeria) — a public marketing site plus a role-based portal (Super Admin, School Admin, Teacher, Parent, Student) for managing students, staff, results, attendance, academic sessions, CMS content, and support tickets.

> This file describes the project **as it actually runs today**. The app was originally built as a Vite + Express single-page app storing data in a flat `db.json` file; it has since been migrated to **Next.js (App Router)** with a **Supabase (Postgres)** backend. Older docs in this repo (`WEBSITE_STRUCTURE.md`, `MOCK_SYSTEM_AUDIT.md`) describe that earlier architecture and are out of date.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (App Router), React 18, TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/postcss`) |
| Icons | `lucide-react` |
| Database | **Supabase Postgres** (via `@supabase/supabase-js`) |
| Auth | Supabase Auth (email + password), httpOnly cookie session |
| File storage | Supabase Storage (bucket: `school-assets` — logos, passports, CMS images) |
| Email | `nodemailer` (SMTP; optional, used for ticket/inquiry routing) |
| Hosting | Netlify (`@netlify/plugin-nextjs`) |

---

## 2. Architecture

This is **not** a classic multi-page Next.js site. Almost the entire authenticated portal is a single client-side React app; Next.js is mainly used for its API routes and hosting integration.

```
app/
├── [[...slug]]/page.tsx   # Catch-all route -> renders <App /> (src/App.tsx)
├── layout.tsx             # Root HTML shell + metadata
├── globals.css
└── api/                   # Route handlers, one folder per resource (see below)

src/
├── App.tsx                 # The authenticated portal: role/tab-based SPA (no client-side routing library)
├── components/
│   ├── LandingPage.tsx      # Public site (rendered when logged out): hero, activities,
│   │                        #   news/announcements, gallery, admission inquiry form, login
│   ├── Sidebar.tsx / Header.tsx
│   ├── DashboardStats.tsx   # Per-role dashboard (admin/teacher/parent/student)
│   ├── StudentManager.tsx, ClassStudentsTable.tsx, ClassSubjectManager.tsx
│   ├── ResultProcessor.tsx, StudentScoresEditor.tsx, EarlyYearsResultEditor.tsx,
│   │   ParentStudentResultViewer.tsx, ReportCardPrintout.tsx
│   ├── ParentStudentAttendanceViewer.tsx
│   ├── AcademicTermManager.tsx  # Sessions/terms + school profile + landing page CMS editor
│   ├── ActivityManager.tsx      # "Our School Activities" (landing page) admin CRUD
│   ├── MessagingSystem.tsx      # Notices Board + broadcast composer
│   ├── SupportDesk.tsx          # FAQ + support tickets + parent-teacher messaging
│   ├── PrintableIdCard.tsx, MyProfile.tsx, TeacherPortal.tsx
│   └── ...
├── server/                 # Server-only modules, imported by app/api/*/route.ts
│   ├── db.ts                # Supabase client (fetch forced to no-store, see note below)
│   ├── auth.ts               # login/session/user CRUD via Supabase Auth
│   ├── routeAuth.ts          # requireRole() guard for Route Handlers
│   └── repo.ts                # All DB queries + camelCase <-> snake_case mapping
├── types.ts                 # Shared TypeScript domain types
└── data/                    # Static seed data (early-years skills, etc.)

supabase/migrations/         # SQL migrations (0001 - 0013), applied via `npm run migrate`
```

### How the portal "routes"
`src/App.tsx` does not use Next.js pages or a router for the authenticated app. It's one component that:
- Restores the Supabase session on mount (`supabase.auth.getSession()`), syncs it to an httpOnly cookie via `POST /api/auth/session`.
- Renders `LandingPage` (public site + login) while logged out, or the dashboard shell (`Sidebar` + whichever tab is active) while logged in.
- Switches between features via an `activeTab` string in React state — there's no `/students`, `/results`, etc. URL for the portal itself.

### API routes (`app/api/**/route.ts`)
Every route is `export const dynamic = 'force-dynamic'` and reads/writes Supabase directly through `src/server/repo.ts`. Routes that mutate data call `requireRole()` from `src/server/routeAuth.ts` to check the caller's session cookie and role.

| Resource | Routes |
|---|---|
| Auth | `login`, `logout`, `session`, `me`, `change-password`, `reset-password`, `set-status`, `users`, `super-admin/init` |
| Core data | `students`, `teachers`, `parents`, `staff-admins`, `subjects`, `classes-subjects`, `sessions`, `config` |
| Results | `results`, `early-years/results`, `assessment-items`, `result-approvals` (+ `transition`) |
| Attendance | `attendance` (+ `batch-delete`) |
| Comms | `notifications`, `tickets`, `cms` |
| Files | `school/logo`, `school/passport`, `school/upload` (all go to Supabase Storage) |
| Misc | `db` (full snapshot used by `src/App.tsx` on load), `health` |

### Auth model
- Supabase Auth issues a JWT on login (`src/server/auth.ts#login`).
- The token is stored **both** client-side (in `localStorage` or `sessionStorage`, depending on the "Remember me" choice) **and** server-side as an httpOnly `sb-access-token` cookie (set by `POST /api/auth/session`), so API routes can authenticate the request without the client having to attach a header.
- Roles: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `PARENT`, `STUDENT` — stored on the `users` table and checked per-route via `requireRole()`.

### A note on caching
`src/server/db.ts` creates the Supabase client with a custom `fetch` that forces `cache: 'no-store'`. This is necessary because Next.js patches the server-side global `fetch()` with its own Data Cache — without this override, a write could succeed in Postgres while the very next read still returned stale data (this was a real, confirmed bug). `next.config.js` additionally sets `Cache-Control: no-store` on all `/api/*` responses so Netlify's edge doesn't cache them either.

---

## 3. Database (Supabase Postgres)

No flat-file/JSON database — all data lives in Supabase Postgres. Schema is defined by the SQL files in `supabase/migrations/`, applied via `npm run migrate` (or `npm run apply-schema`). Key tables:

`users`, `students`, `parents`, `teachers`, `staff_admins`, `super_admins`, `subjects`, `classes_subjects`, `results`, `early_years_results`, `assessment_items`, `result_approvals`, `attendance`, `sessions`, `configurations`, `cms_content`, `notifications`, `tickets`.

- `configurations` (single `id = 'global'` row) holds the active term/session, grading scale, school profile (name, logo, address, contact), and CA/exam mark weights.
- `cms_content` (single `id = 'landing_cms'` row, JSON `content` column) holds all public landing-page copy: motto, welcome/about text, mission/vision, principal message, hero images, gallery, admissions blurb, news, and announcements. Saves **merge** onto existing content rather than replacing it, so a partial update can't wipe out the rest.
- File uploads (logos, passport photos, CMS images) go to the `school-assets` bucket in Supabase Storage and only the public URL is stored in Postgres.

---

## 4. Public landing page features

Rendered by `LandingPage.tsx` when no one is logged in:
- Hero section, "Our School Activities" (click a card to read the full write-up in a popup)
- "Latest School News" / "Important Announcements" (click to read more; admin can optionally attach an image to each)
- "School Gallery" (click a photo for a full-size lightbox with keyboard/arrow navigation)
- Admission inquiry form — creates a support ticket **and** notifies both Super Admin and School Admin dashboards
- Role-specific login forms (`/login/super-admin`, `/login/staff-admin`, `/login/teacher`, `/login/parent`, `/login/student`) with a "Remember me" option
- Floating WhatsApp quick-connect button

All of the above (except the login forms) is editable from the portal's **Academic Term Settings** tab (school profile + landing page CMS editor) or the **School Activities** tab, for Super Admin / School Admin.

---

## 5. Getting Started

**Prerequisites:** Node.js (LTS), npm, a Supabase project.

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase project's values:

```ini
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...        # service_role key -- keep this secret, server-only
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

> `SUPABASE_SECRET_KEY` must be the **secret/service_role** key (`sb_secret_...`), not the publishable key — using the wrong one causes Supabase Storage/RLS-protected writes to fail with "row-level security policy" errors.

Apply the database schema and seed a Super Admin:

```bash
npm run migrate          # or: npm run apply-schema
npm run setup-admin
```

Run locally:

```bash
npm run dev               # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

Type-check:

```bash
npm run lint              # tsc --noEmit
```

---

## 6. Deployment

Hosted on **Netlify**, via `@netlify/plugin-nextjs`. Two things about this repo's layout are load-bearing for the deploy config:

- The git repository root is **one level above** this project folder (`southgold-school-portal-website/` is a subfolder, not the repo root). `netlify.toml` lives at the actual repo root and sets `base = "southgold-school-portal-website"` so Netlify finds `package.json` and builds from the right directory.
- The Google Search Console verification file is served via an explicit route (`app/googlea5a363ddc526766a.html/route.ts`), not a `public/` static file — Next.js's `[[...slug]]` catch-all route shadows same-named public files on Netlify's Next.js Runtime, so a real static file at that path was silently served as the app's 404 page instead of its actual content.

---

## 7. Project Tree

```
.
├── netlify.toml                       # (repo root, one level up) build config
├── southgold-school-portal-website/   # this project
│   ├── app/
│   │   ├── [[...slug]]/page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/**/route.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── server/
│   │   ├── types.ts
│   │   └── data/
│   ├── supabase/migrations/
│   ├── scripts/                       # migrate.ts, apply-schema.ts, setupAdmin.ts
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   └── .env.example
```
