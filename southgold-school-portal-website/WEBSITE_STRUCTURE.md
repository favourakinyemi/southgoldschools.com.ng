# SouthGold Montessori School Portal — Website Structure

This document describes the **full structure of the website**: its screens, navigation, roles, and the components/modules that make up the portal. It complements the workspace overview in [`README.md`](./README.md).

---

## 1. High-Level Layout

The app is a single-page application with two main states:

1. **Logged out → Landing Page** (`LandingPage.tsx`)
2. **Logged in → Dashboard shell** (`Sidebar` + `Header` + active module view)

```
App (src/App.tsx)
├── if NOT logged in ──► LandingPage
│                        ├─ Public marketing/branding
│                        ├─ School activities carousel
│                        ├─ Login (pick a role → onLogin)
│                        └─ Admissions / contact inquiry (creates a support ticket + SMTP email)
│
└── if logged in ─────► Shell
                         ├─ Sidebar (role switcher, nav menu, logout)
                         ├─ Header (session/term switcher, theme toggle)
                         ├─ Term-boundary banner (resumption/closing dates)
                         └─ <Active Module>  ← switched by `activeTab`
```

---

## 2. User Roles

Defined in `src/types.ts` as `UserRole`:

| Role | Purpose |
|------|---------|
| `SUPER_ADMIN` | Top-level administrator |
| `SCHOOL_ADMIN` | Day-to-day school administration (headmaster) |
| `TEACHER` | Staff portal: enter scores, mark attendance, view assigned classes |
| `PARENT` | View child records, fees, results, messages |
| `STUDENT` | View own results, profile |

The active role is selected on the landing page (`handleLogin`) or switched from the `Sidebar` (`handleRoleChange`). Some tabs/features are gated by `currentRole`.

---

## 3. Navigation / Sidebar Tabs

`activeTab` in `App.tsx` decides which module renders. Mapping:

| Tab key | Module Component | Description |
|---------|------------------|-------------|
| `dashboard` | `DashboardStats` | Summary statistics (students, teachers, fees, attendance, notifications) |
| `students` | `StudentManager` | CRUD for student records; admission numbers, classes, arms, parents |
| `staff` / `attendance` | `TeacherPortal` | Teacher/staff management, attendance marking, assigned classes |
| `results` | `ResultProcessor` | Enter & compute test/assignment/exam scores, grades, approvals |
| `session` | `AcademicTermManager` | Manage academic sessions & terms, resumption/closing dates |
| `billing` | `FeePaymentTracker` | School fees: amounts, payments, balances, receipts |
| `messaging` | `MessagingSystem` | Internal messaging / notifications |
| `announcements` | `MessagingSystem` | Announcements (reuses MessagingSystem) |
| `idcards` | `PrintableIdCard` | Generate/print student & teacher ID cards |
| `helpdesk` | `SupportDesk` | Support tickets with threaded replies |
| `classes` | `ClassSubjectManager` | Map classes ↔ subjects, manage subjects, assign teachers |
| `activities` | `ActivityManager` | Manage public school activities (landing page content) |

> `staff` and `attendance` both render `TeacherPortal`. `messaging` and `announcements` both render `MessagingSystem`.

---

## 4. Module-by-Module Detail

### Landing Page (`LandingPage.tsx`)
- Public home screen shown before login.
- Branding for SouthGold Montessori School.
- Displays `activities` (fetched from backend) in a showcase carousel.
- Role-based login buttons (Admin, Teacher, Parent, Student).
- Admissions/contact inquiry form → `POST /api/tickets` and triggers SMTP email.

### Dashboard (`DashboardStats.tsx`)
- Role-aware summary cards and quick stats.
- Pulls counts/aggregates from students, teachers, fees, attendance, notifications, results.
- Quick links to other modules (`setActiveTab`).

### Student Manager (`StudentManager.tsx`)
- Add / edit / delete students.
- Fields: admission number, name, photo, gender, DOB, parent name/email/phone, class, arm, status, subjects.
- Persists via `handleSetStudents` → `localStorage` + `PUT /api/students`.

### Teacher Portal (`TeacherPortal.tsx`) — also Attendance
- Manage teachers (staff id, department, status, assigned classes/subjects).
- Mark attendance (present/absent/late) for students & staff.
- Attendance records batched to `POST /api/attendance`.

### Result Processor (`ResultProcessor.tsx`)
- Enter per-student, per-subject scores: test (max 20), assignment (max 20), exam (max 60).
- Auto-computes total + grade using `config.gradingScale`.
- `isApproved` flag requires admin approval before publication.
- `StudentScoresEditor.tsx` is the inline editor for scores.
- `ClassStudentsTable.tsx` shows a class roster for result entry.

### Academic Term Manager (`AcademicTermManager.tsx`)
- List/create/switch academic sessions (`isActive`).
- Switch current term (First/Second/Third).
- Edit resumption & closing dates (stored in `config`).

### Fee Payment Tracker (`FeePaymentTracker.tsx`)
- View/manage fee records per student.
- Track `amount`, `amountPaid`, `status` (Paid / Partially Paid / Unpaid).
- Payment transaction history with receipt numbers.

### Messaging System (`MessagingSystem.tsx`)
- Used for both `messaging` and `announcements` tabs.
- Create notifications targeted by `recipientRole` (ALL / specific role).
- Notification categories: Announcement, Academic, Billing, System.

### Printable ID Card (`PrintableIdCard.tsx`)
- Generate printable ID cards for students and teachers (photo, name, id, class).

### Support Desk (`SupportDesk.tsx`)
- List/create/reply to support tickets (`SupportTicket` type).
- Status: Open / In Progress / Resolved.
- New tickets POST to `/api/tickets` and optionally fire the SMTP email.

### Class–Subject Manager (`ClassSubjectManager.tsx`)
- Define subjects (`Subject` type: id, name, code).
- Map each class to its subject list (`classesWithSubjects`), grouped by stage (Pre-School / Primary).
- Assign teachers to class/subject/arm.

### Activity Manager (`ActivityManager.tsx`)
- CRUD for `SchoolActivity` items shown on the landing page.

---

## 5. Data Flow (frontend ⇄ backend)

```
User action in a component
        │
        ▼
handleSetX() in App.tsx
        ├─► setX(local React state)
        ├─► saveStoredData('school_x', ...)   → localStorage (offline cache)
        └─► fetch('/api/x', {...})            → Express server
                                            │
                                            ▼
                                     loadDB() / saveDB()
                                            │
                                            ▼
                                        db.json  (source of truth)

On app mount:
   fetch('/api/db')  →  overwrites all React state with server data
```

- `db.json` is the **server source of truth**.
- `localStorage` is a **client cache** so the UI survives reloads/offline.
- After mount, the backend copy wins (full `/api/db` sync).

---

## 6. Component File Map (`src/components/`)

| File | Module / Responsibility |
|------|--------------------------|
| `LandingPage.tsx` | Public home + login + admissions inquiry |
| `Sidebar.tsx` | Left nav, role switcher, logout |
| `Header.tsx` | Top bar: session/term switcher, theme toggle |
| `DashboardStats.tsx` | Dashboard summary |
| `StudentManager.tsx` | Student CRUD |
| `TeacherPortal.tsx` | Staff + attendance |
| `ResultProcessor.tsx` | Results entry & grading |
| `StudentScoresEditor.tsx` | Inline score editor (used by ResultProcessor) |
| `ClassStudentsTable.tsx` | Class roster table (used by ResultProcessor) |
| `AcademicTermManager.tsx` | Sessions & terms |
| `FeePaymentTracker.tsx` | Billing & payments |
| `MessagingSystem.tsx` | Messaging + announcements |
| `PrintableIdCard.tsx` | ID card print |
| `SupportDesk.tsx` | Support tickets |
| `ClassSubjectManager.tsx` | Classes ↔ subjects, teacher assignment |
| `ActivityManager.tsx` | Public activities CRUD |

### Supporting files
| File | Purpose |
|------|---------|
| `src/App.tsx` | App shell, state, routing, API sync |
| `src/main.tsx` | React root |
| `src/index.css` | Tailwind + global styles |
| `src/types.ts` | Domain types |
| `src/data/mockData.ts` | Seed data + localStorage helpers |
| `src/data/preschoolSkills.ts` | Pre-school skill definitions |

---

## 7. Routing Summary

There is **no URL-based router** — navigation is in-app state (`activeTab`) managed by `App.tsx`. The Express server serves the SPA from a single `index.html` and only exposes the `/api/*` JSON endpoints described in `README.md`. All "pages" are conditional renders of `renderActiveComponent()` based on `activeTab`.
