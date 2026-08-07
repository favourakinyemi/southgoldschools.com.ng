# SouthGold School Portal — Website Structure

This document describes the **screens, navigation, roles, and components** that make up the app. It complements the architecture overview in [`README.md`](./README.md) — read that first for how the Next.js/Supabase layers fit together; this file is about what's actually on screen.

---

## 1. High-Level Layout

The authenticated portal (`src/App.tsx`) is a single-page app with two states, based on whether a Supabase session is present:

```
App (src/App.tsx)
├── if NOT logged in ──► LandingPage.tsx
│                        ├─ Public marketing/branding, hero
│                        ├─ "Our School Activities" (click a card for full details)
│                        ├─ "Latest School News" / "Important Announcements" (click to read more)
│                        ├─ "School Gallery" (click a photo for a lightbox)
│                        ├─ Role-specific login forms (/login/super-admin, /login/staff-admin,
│                        │  /login/teacher, /login/parent, /login/student), with "Remember me"
│                        └─ Admission inquiry form → creates a support ticket AND notifies
│                           both Super Admin and School Admin dashboards
│
└── if logged in ─────► Dashboard shell
                         ├─ Sidebar (role-specific nav menu, logout)
                         ├─ Header (session/term display, theme toggle)
                         └─ <Active Module>  ← switched by `activeTab` (no URL routing)
```

There is **no URL-based router** for the authenticated portal — `app/[[...slug]]/page.tsx` is the only page, rendering `<App />` for every path. Navigation between features is an `activeTab` string in React state.

---

## 2. User Roles

Defined in `src/types.ts` as `UserRole`:

| Role | Purpose |
|------|---------|
| `SUPER_ADMIN` | Top-level administrator (can also manage School Admin accounts) |
| `SCHOOL_ADMIN` | Day-to-day school administration |
| `TEACHER` | Enter scores, mark attendance, view assigned classes |
| `PARENT` | View child's results/attendance, message teachers, raise tickets |
| `STUDENT` | View own results/attendance, profile |

The role is fixed by which login form was used (`/login/:role`) and stored on the `users` table — there's no in-app role switcher. Sidebar tabs and API route access are both gated by `currentRole`.

---

## 3. Navigation / Sidebar Tabs

`activeTab` in `App.tsx` decides which module renders (see `renderActiveComponent()`):

| Tab key | Component | Notes |
|---|---|---|
| `dashboard` | `DashboardStats` | Role-specific summary; Parent's includes the announcement ticker |
| `students` | `StudentManager` | Admin/Super Admin only |
| `staff` | `TeacherPortal` | Staff directory (Admin/Super Admin) |
| `classes` | `ClassSubjectManager` | Classes ↔ subjects, teacher assignment |
| `activities` | `ActivityManager` | CRUD for the landing page's "Our School Activities" |
| `results` | `ResultProcessor` | Score entry/grading (Admin/Teacher) or read-only viewer (Parent/Student), branches internally to `StudentScoresEditor`, `EarlyYearsResultEditor`, `ParentStudentResultViewer`, `ReportCardPrintout` |
| `attendance` | `ParentStudentAttendanceViewer` (Parent/Student) or `TeacherPortal` (everyone else) | Role-branched at the `App.tsx` level |
| `session` | `AcademicTermManager` | Sessions/terms, school profile, **and** the landing page CMS editor (motto, hero images, gallery, news, announcements) |
| `messaging` / `announcements` | `MessagingSystem` | Same component for both tab keys — Notices Board + broadcast composer (Admin) + parent-teacher messaging |
| `idcards` | `PrintableIdCard` | Admin/Super Admin only |
| `helpdesk` | `SupportDesk` | FAQ + support tickets + (for Parent/Teacher) direct messaging |
| `profile` | `MyProfile` | Own account details / password change |

Which tabs a role can see is defined by the `allowedTabs` map in `App.tsx`; there is no `billing`/fees tab in the current UI (the `fees` Postgres table still exists from an earlier iteration but nothing in the app reads or writes it today).

---

## 4. Module-by-Module Detail

### Landing Page (`LandingPage.tsx`)
Public site + all `/login/*` forms. CMS-driven content (motto, welcome/about text, mission/vision, principal message, hero images, gallery, news, announcements) is fetched from `GET /api/cms` and editable from the portal's `session` tab. "Our School Activities" comes from `GET /api/activities` / the `activities` table, editable via the `activities` tab.

### Dashboard (`DashboardStats.tsx`)
Role-aware summary cards, quick stats, and shortcuts (`setActiveTab`) into other modules. The Parent view's "School Announcement Ticker" links into the `announcements` tab.

### Student Manager (`StudentManager.tsx`)
Add/edit/delete students: admission number, name, photo, gender, DOB, parent info, class, arm, status, subjects. Persists via `handleSetStudents` in `App.tsx`, which calls `PUT/POST /api/students`.

### Teacher Portal (`TeacherPortal.tsx`)
Manage teachers (staff id, department, status, assigned classes/subjects) and mark attendance for students/staff (batched to `POST /api/attendance`).

### Result Processor (`ResultProcessor.tsx`)
Score entry (test/assignment/exam, auto-computed total + grade from `config.gradingScale`), approval workflow (`result_approval_requests`), and printable report cards. Delegates to `StudentScoresEditor.tsx` (inline score entry), `ClassStudentsTable.tsx` (roster), `EarlyYearsResultEditor.tsx` (Toddler/Creche/Nursery/Preschool narrative assessments), `ParentStudentResultViewer.tsx` (read-only view), and `ReportCardPrintout.tsx` (print layout).

### Academic Term Manager (`AcademicTermManager.tsx`)
Sessions/terms (create, switch active), resumption/closing dates, school profile (name, logo, address, contact), and the full landing-page CMS editor (motto, hero/gallery image uploads, news & announcements with optional images).

### Messaging System (`MessagingSystem.tsx`)
Renders for both `messaging` and `announcements` tabs. "Notices Board" lists notifications (click to expand); Admin/Super Admin get a broadcast composer targeting a role or "ALL"; Parent/Teacher get direct messaging threads.

### Printable ID Card (`PrintableIdCard.tsx`)
Generates printable ID cards for students and teachers.

### Support Desk (`SupportDesk.tsx`)
FAQ accordion, support ticket list/create/reply, and (for Parent/Teacher) parent-teacher direct messaging. Tickets created here and from the landing page's admission inquiry form share the same `tickets` table.

### Class–Subject Manager (`ClassSubjectManager.tsx`)
Defines subjects and maps each class to its subject list (`classes_subjects`), grouped by stage (Pre-School/Primary), and assigns teachers.

### Activity Manager (`ActivityManager.tsx`)
CRUD for `SchoolActivity` items shown on the landing page, including the optional longer "Full Details" text shown in the read-more popup.

### My Profile (`MyProfile.tsx`)
Own account details and password change (only for accounts with `can_change_password`).

---

## 5. Data Flow (frontend ⇄ backend)

```
User action in a component
        │
        ▼
handleSetX() in App.tsx
        │
        ▼
fetch('/api/x', {...})           → Next.js Route Handler (app/api/x/route.ts)
        │
        ▼
requireRole() check (if mutating) → src/server/repo.ts query
        │
        ▼
Supabase Postgres

On app mount: fetch('/api/db') → populates all of App.tsx's React state from Supabase in one round trip.
```

There is no `localStorage` cache and no flat-file database — Supabase Postgres is the only source of truth. See `README.md` for the full API route table and the auth/cookie model.

---

## 6. Component File Map (`src/components/`)

| File | Responsibility |
|---|---|
| `LandingPage.tsx` | Public site, login forms, admission inquiry, live-chat-adjacent widgets |
| `Sidebar.tsx` / `Header.tsx` | Portal chrome |
| `DashboardStats.tsx` | Per-role dashboard |
| `StudentManager.tsx` | Student CRUD |
| `TeacherPortal.tsx` | Staff directory + attendance marking |
| `ParentStudentAttendanceViewer.tsx` | Read-only attendance view for Parent/Student |
| `ResultProcessor.tsx` | Result entry & grading orchestration |
| `StudentScoresEditor.tsx` | Inline score editor (used by `ResultProcessor`) |
| `ClassStudentsTable.tsx` | Class roster table (used by `ResultProcessor`) |
| `EarlyYearsResultEditor.tsx` | Narrative assessments for early-years classes |
| `ParentStudentResultViewer.tsx` | Read-only results view for Parent/Student |
| `ReportCardPrintout.tsx` | Printable report card layout |
| `AcademicTermManager.tsx` | Sessions/terms, school profile, landing page CMS editor |
| `MessagingSystem.tsx` | Notices Board, broadcasts, parent-teacher messaging |
| `PrintableIdCard.tsx` | ID card print |
| `SupportDesk.tsx` | FAQ + support tickets |
| `ClassSubjectManager.tsx` | Classes ↔ subjects, teacher assignment |
| `ActivityManager.tsx` | Landing page activities CRUD |
| `MyProfile.tsx` | Account details / password change |

### Supporting files
| File | Purpose |
|---|---|
| `src/App.tsx` | Portal shell: state, role/tab routing, API sync |
| `src/types.ts` | Domain types |
| `src/server/` | API-route-only code: Supabase client, auth, role guard, DB queries |
| `src/data/preschoolSkills.ts` | Early-years skill definitions |
