# SouthGold Montessori School Portal

A comprehensive, multi-role **school management platform** for SouthGold Montessori School (Lekki-Ajah, Lagos, Nigeria). It provides dedicated portals for admins, teachers, parents, and students to manage students, staff, results, attendance, fees, messaging, activities, and support.

This file explains the workspace, the backend, the frontend, and the database. See [`WEBSITE_STRUCTURE.md`](./WEBSITE_STRUCTURE.md) for the full website/page/module structure.

---

## 1. Workspace Overview

| Item | Detail |
|------|--------|
| Project name | `react-example` (package.json) — the deployed app is the SouthGold Montessori School Portal |
| Type | Full-stack single-page app (SPA) with an integrated Node/Express API server |
| Source language | TypeScript + React (TSX) |
| Runtime | Node.js |
| Entry point (dev) | `server.ts` (boots Express + Vite middleware) |
| Frontend entry | `index.html` → `src/main.tsx` → `src/App.tsx` |
| Status | Local/AI-Studio generated app; not yet wired to a real cloud DB |

> **Note:** There is a `.npm-global/` folder in the workspace. This is an installed global Node module cache (typescript, tsx, esbuild, marked, etc.) and is **not** part of the app source. You can ignore it; it should ideally be git-ignored.

---

## 2. Frontend

- **Framework:** React 19 (`react`, `react-dom`).
- **Build tool / dev server:** Vite 6 (`vite`), with `@vitejs/plugin-react`.
- **Language:** TypeScript 5.8 (config in `tsconfig.json`).
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` (no separate `tailwind.config.js`; configured through the Vite plugin). Custom styles live in `src/index.css`. Supports a **light/dark theme** (toggled via `darkTheme` in `App.tsx`).
- **Icons / animation:** `lucide-react` (icons) and `motion` (animations).
- **Path alias:** `@/*` maps to the project root (set in `vite.config.ts` and `tsconfig.json`).

### Key frontend files
- `src/main.tsx` — React root render.
- `src/App.tsx` — Main app shell: holds all state, role switching, tab routing, and syncs state to the backend API.
- `src/index.css` — Global + Tailwind styles.
- `src/types.ts` — All TypeScript domain types (`Student`, `Teacher`, `ResultRecord`, `FeeRecord`, etc.).
- `src/components/` — One component per feature/module (see `WEBSITE_STRUCTURE.md`).
- `src/data/mockData.ts` — Initial seed data + localStorage helpers (`getStoredData`/`saveStoredData`).
- `src/data/preschoolSkills.ts` — Preschool skill definitions used in pre-school result views.

### Frontend data model
The UI is a **client-side state machine** in `App.tsx`:
1. On first load, state is seeded from `localStorage`.
2. A `useEffect` then fetches `/api/db` from the backend and overwrites state with the server copy.
3. Every mutation handler (e.g. `handleSetStudents`, `handleSetResults`) updates React state **and** writes to `localStorage` **and** calls the REST API to persist to the server `db.json`.

This means the app works fully offline via localStorage, but the backend is the source of truth after a sync.

---

## 3. Backend

- **Server:** Node.js + **Express 4** (`server.ts`).
- **Run modes:**
  - `npm run dev` → `tsx server.ts` (runs the server directly in TypeScript, with Vite in middleware mode for HMR).
  - `npm run build` → `vite build` (frontend) **and** `esbuild` bundles `server.ts` → `dist/server.cjs`.
  - `npm run start` → `node dist/server.cjs` (production; serves static `dist/` + API).
- **Port:** `3000` (binds `0.0.0.0`).
- **Dev integration:** In non-production, Vite runs in `middlewareMode` so the same Express server serves the SPA; in production it serves the built `dist/index.html`.

### API surface (all prefixed `/api`)
The backend is a **thin JSON file persistence layer** — it reads/writes a single `db.json` on disk.

| Resource | Endpoints |
|----------|-----------|
| Health | `GET /api/health` |
| Full DB sync | `GET /api/db` |
| Students | `GET/POST /api/students`, `PUT /api/students`, `PUT/DELETE /api/students/:id` |
| Teachers | `GET/POST /api/teachers`, `PUT /api/teachers`, `PUT /api/teachers/:id` |
| Results | `GET/POST /api/results`, `PUT /api/results/:id` |
| Attendance | `GET /api/attendance`, `POST /api/attendance` (batch, de-dupes by date+entity) |
| Fees | `GET /api/fees`, `POST /api/fees`, `PUT /api/fees/:id` |
| Notifications | `GET /api/notifications`, `POST /api/notifications` |
| Tickets | `GET/POST /api/tickets`, `PUT /api/tickets/:id` |
| Sessions | `GET /api/sessions`, `PUT /api/sessions` |
| Config | `GET /api/config`, `PUT /api/config` |
| Activities | `GET/POST /api/activities`, `PUT/DELETE /api/activities/:id` |
| Subjects | `GET /api/subjects`, `POST /api/subjects` |
| Classes↔Subjects | `GET /api/classes-subjects`, `PUT /api/classes-subjects` |

### Email / Notifications (Nodemailer)
- `server.ts` includes an SMTP email dispatcher using **`nodemailer`**.
- When a support/contact ticket is created (`POST /api/tickets`), if it has a `subject` + `senderEmail`, the server sends an email to `southgoldmontessorischools@gmail.com` via SMTP.
- Credentials are read from env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (with Gmail defaults). If unset, it logs a warning and skips sending. Loaded with `dotenv`.

---

## 4. Database

- **Type:** A **flat-file JSON "database"** — there is **no SQL/NoSQL engine**.
- **File:** `db.json` at the project root (created automatically on first run if missing).
- **How it works:** `server.ts` exposes `loadDB()` (reads/parses `db.json`, seeding defaults if absent) and `saveDB()` (stringifies + writes on every mutation). All REST endpoints operate on this in-memory object and persist back to disk.
- **Seeding:** On first run the server writes a rich seed dataset (sample students, teachers, results, attendance, fees, notifications, tickets, sessions, subjects, activities, classes, and grading config). It also back-fills classes/subjects and auto-generates placeholder students for classes that lack enough entries.
- **Schema (top-level keys in `db.json`):**

| Key | Description |
|-----|-------------|
| `students` | Pupil records (admission no, class, arm, parent info, subjects) |
| `teachers` | Staff records (staff id, department, assigned classes/subjects) |
| `results` | Exam/CA scores (test/assignment/exam/total, grade, approval flag) |
| `attendance` | Daily present/absent/late for students & staff |
| `fees` | Billing records + payment transaction history |
| `notifications` | Announcements/messages by role |
| `tickets` | Support desk tickets with replies |
| `sessions` | Academic sessions (e.g. `2025/2026`) with active flag |
| `config` | Current term, session, resumption/closing dates, grading scale |
| `activities` | Public-facing school activities (used on landing page) |
| `subjects` | Subject catalog (id, name, code) |
| `classesWithSubjects` | Mapping of class → subject list (with stage: Pre-School/Primary) |

Domain types are defined in `src/types.ts` and mirrored in the server seed in `server.ts`.

> **Implication:** Data is local to the machine running the server. For production you would replace `db.json` with a real database (e.g. PostgreSQL/MongoDB) and keep the same REST API contract.

---

## 5. Getting Started

**Prerequisites:** Node.js (LTS), npm.

```bash
npm install        # install dependencies
npm run dev        # start server + Vite dev server on http://localhost:3000
```

Production:

```bash
npm run build      # build frontend (dist/) + bundle server (dist/server.cjs)
npm run start      # serve on http://localhost:3000
```

Optional email (set in environment, e.g. `.env`):

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

Lint/type-check:

```bash
npm run lint       # tsc --noEmit
```

---

## 6. Tech Stack Summary

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, lucide-react, motion.
- **Backend:** Node.js, Express 4, tsx/esbuild, nodemailer (SMTP).
- **Database:** Local JSON file (`db.json`) via filesystem read/write.
- **Persistence:** Dual — `localStorage` (client cache) + `db.json` (server source of truth), kept in sync through REST calls.

---

## 7. Project Tree (source only)

```
.
├── index.html              # SPA HTML shell
├── package.json            # scripts + dependencies
├── package-lock.json
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite + React + Tailwind + @ alias
├── server.ts               # Express API + db.json persistence + SMTP
├── db.json                 # auto-created JSON database (seed data)
├── .env / .env.local       # optional SMTP credentials
├── src/
│   ├── main.tsx            # React entry
│   ├── App.tsx             # App shell, state, role/tab routing, API sync
│   ├── index.css           # Global styles (Tailwind)
│   ├── types.ts            # Domain TypeScript types
│   ├── components/         # One component per feature (see WEBSITE_STRUCTURE.md)
│   └── data/
│       ├── mockData.ts     # Seed data + localStorage helpers
│       └── preschoolSkills.ts
└── .npm-global/            # (ignore) global npm cache, not app source
```

See [`WEBSITE_STRUCTURE.md`](./WEBSITE_STRUCTURE.md) for the detailed website/module breakdown and what each screen does.
"# southgold-school-portal" 
"# southgold-school-portal" 
