# Mock System Audit

## Scope
This report lists every file, line number, and function that still references the old mock/system behavior so they can be removed or replaced with Supabase-backed logic.

---

## CRITICAL FINDINGS

### 1. App.tsx — localStorage auth + mock data initialization
- File: `src/App.tsx`
- Lines 3-17: Imports `getStoredData`, `saveStoredData`, and all `INITIAL_*` mock arrays from `./data/mockData`
- Lines 53-107: All state initialized from `localStorage` with mock fallbacks:
  - Line 54: `getStoredData('school_students', INITIAL_STUDENTS)`
  - Line 58: `getStoredData('school_teachers', INITIAL_TEACHERS)`
  - Line 60-64: `localStorage.getItem('school_teachers_primary_wipe_v3')` wipe logic
  - Line 70: `getStoredData('school_results', INITIAL_RESULTS)`
  - Line 74: `getStoredData('school_attendance', INITIAL_ATTENDANCE)`
  - Line 78: `getStoredData('school_fees', INITIAL_FEES)`
  - Line 82: `getStoredData('school_notifications', INITIAL_NOTIFICATIONS)`
  - Line 86: `getStoredData('school_tickets', INITIAL_TICKETS)`
  - Line 90: `getStoredData('school_sessions', INITIAL_SESSIONS)`
  - Line 94: `getStoredData('school_config', DEFAULT_CONFIG)`
  - Line 98: `getStoredData('school_activities', INITIAL_ACTIVITIES)`
  - Line 102: `getStoredData('school_subjects', INITIAL_SUBJECTS)`
  - Line 106: `getStoredData('school_parents', [])`
  - Line 110-127: `getStoredData('school_classes_with_subjects', [...])`
- Lines 130-136: `localStorage.getItem('school_logged_in')` for auth state
- Lines 138-144: `localStorage.getItem('school_logged_role')` for role state
- Lines 147-153: `localStorage.getItem('school_theme')` for theme state
- Lines 159-163: HARDCODED user email mapping by role:
  - `SUPER_ADMIN` → `favourakinyemi2001@gmail.com`
  - `SCHOOL_ADMIN` → `headmaster@primary.edu`
  - `TEACHER` → `sarah.jenkins@primary.edu`
  - `PARENT` → `robert.ade@primary.edu`
  - `STUDENT` → `kemi.oluwu@primary.edu`
- Lines 188: Console log "Successfully loaded synced full-stack DB!"
- Lines 207-459: All `handleSet*` functions call `saveStoredData()` after every mutation
- Lines 480-508: `handleRoleChange`, `handleLogin`, `handleLogout` use localStorage
- Function: `handleLogin` — no API call, just sets localStorage and state

### 2. LandingPage.tsx — Hardcoded demo credentials + mock login UI
- File: `src/components/LandingPage.tsx`
- Lines 65-111: `portalRolesConfig` array with hardcoded demo emails:
  - Line 71: `demoEmail: "favourakinyemi2001@gmail.com"` (SUPER_ADMIN)
  - Line 80: `demoEmail: "headmaster@primary.edu"` (SCHOOL_ADMIN)
  - Line 89: `demoEmail: "sarah.jenkins@primary.edu"` (TEACHER)
  - Line 98: `demoEmail: "robert.ade@primary.edu"` (PARENT)
  - Line 107: `demoEmail: "kemi.oluwu@primary.edu"` (STUDENT)
- Lines 150-167: `handleOpenLoginModal` and `handleOpenLoginPage` pre-fill demo emails
- Line 154: `setPasswordInput(role === 'SUPER_ADMIN' ? '1234' : '••••••••')`
- Lines 169-187: `handleLoginSubmit` — validates SUPER_ADMIN against hardcoded email/password:
  - Line 174: `emailInput.trim() !== 'favourakinyemi2001@gmail.com'`
  - Line 175: Error message references hardcoded credentials
- Lines 433-444: **MOCK LOGIN UI BANNER**:
  - Line 435: `"💡 Presetted Access Account"`
  - Line 438: Displays `demoEmail` from config
  - Line 442: `"The academic SMS database has synced this sandbox mock profile. Press 'Access Workplace' to sign in instantly."`
- Lines 1156-1160: Duplicate mock banner in mobile view
- Line 1208: Button text `"Access Workplace"`

### 3. mockData.ts — localStorage helpers + seeded fake data
- File: `src/data/mockData.ts`
- Lines 17-50: `INITIAL_ACTIVITIES` — seeded fake activities
- Lines 52-55: `INITIAL_SESSIONS` — seeded fake sessions
- Lines 57-66: `INITIAL_SUBJECTS` — reference data (OK to keep as static defaults)
- Lines 68-75: `INITIAL_CLASSES` — reference data (OK to keep as static defaults)
- Lines 77: `INITIAL_ARMS` — reference data (OK to keep)
- Lines 79-113: `INITIAL_TEACHERS` — seeded fake teachers with hardcoded emails
- Lines 115-180: `INITIAL_STUDENTS` — seeded fake students
- Lines 182-285: `INITIAL_RESULTS` — seeded fake results
- Lines 287-298: `INITIAL_TIMETABLE` — seeded fake timetable
- Lines 300-323: `INITIAL_ATTENDANCE` — seeded fake attendance
- Lines 318-365: `INITIAL_FEES` — seeded fake fees
- Lines 367-389: `INITIAL_NOTIFICATIONS` — seeded fake notifications
- Lines 394-423: `INITIAL_TICKETS` — seeded fake tickets
- Lines 425-431: `INITIAL_TIMETABLE` — seeded fake timetable entries
- Lines 442-458: `getStoredData` and `saveStoredData` — localStorage wrappers
- Lines 461-491: `DEFAULT_CONFIG` — seeded fake config

### 4. DashboardStats.tsx — Hardcoded parent/student/teacher references
- File: `src/components/DashboardStats.tsx`
- Line 74-78: Hardcoded recent activity strings referencing fake names
- Line 82: `teachers.find(t => t.id === 'tch_1')` — hardcoded teacher lookup
- Line 92: `const parentEmail = 'robert.ade@primary.edu'` — HARDCODED parent email
- Line 93: `students.filter(s => s.parentEmail === parentEmail)` — filters by hardcoded email
- Line 99: `const currentStudentId = 'std_3'` — HARDCODED student ID
- Line 100: `students.find(s => s.id === currentStudentId)` — hardcoded student lookup

### 5. FeePaymentTracker.tsx — Hardcoded parent email filter
- File: `src/components/FeePaymentTracker.tsx`
- Line 13: Imports `INITIAL_CLASSES` from mockData
- Line 28: `classes = INITIAL_CLASSES` default prop
- Line 65: `const matchesParentScope = !isParent || student.parentEmail === 'robert.ade@primary.edu'` — HARDCODED

### 6. StudentManager.tsx — Imports mock reference data
- File: `src/components/StudentManager.tsx`
- Line 19: Imports `INITIAL_SUBJECTS`, `INITIAL_CLASSES`, `INITIAL_ARMS` from mockData
- Line 43: `classes = INITIAL_CLASSES` default prop
- Line 718: Uses `INITIAL_SUBJECTS.map(...)`

### 7. TeacherPortal.tsx — Imports mock reference data
- File: `src/components/TeacherPortal.tsx`
- Line 19: Imports `INITIAL_CLASSES`, `INITIAL_ARMS`, `INITIAL_SUBJECTS` from mockData
- Line 50: `classes = INITIAL_CLASSES` default prop

### 8. ResultProcessor.tsx — Imports mock reference data
- File: `src/components/ResultProcessor.tsx`
- Line 24: Imports `INITIAL_CLASSES`, `INITIAL_ARMS`, `INITIAL_SUBJECTS`, `SchoolConfigState` from mockData
- Line 127: `classes = INITIAL_CLASSES` default prop

### 9. SupportDesk.tsx — Imports mock FAQ data
- File: `src/components/SupportDesk.tsx`
- Line 14: Imports `FAQ_DATA` from `../data/mockData`

### 10. db.json — Complete fake database
- File: `db.json`
- Contains 4 students, 3 teachers, 7 results, 11 attendance records, 4 fees, 3 notifications, 2 tickets, 2 sessions, config, 4 activities, 8 subjects, 6 classesWithSubjects
- All data is fake/seeded with hardcoded emails
- This file should be deleted or emptied

### 11. server.ts — Auth endpoints
- File: `server.ts`
- Line 9: Imports `createAppUser`, `resetPasswordToDefault`, `setUserStatus`, `ensureSuperAdmin`
- Lines 320-328: `/api/auth/login` — correctly uses Supabase auth
- Lines 330-333: `/api/auth/me` — correctly uses Bearer token auth
- Lines 335-337: `/api/auth/super-admin/init` — correctly calls `ensureSuperAdmin`
- Lines 340-368: `/api/auth/users` — correctly creates users with role-specific logic
- Lines 370-377: `/api/auth/reset-password` — resets to default password
- Lines 379-389: `/api/auth/set-status` — sets user status
- Line 409: Calls `ensureSuperAdmin()` on server start

### 12. auth.ts — Super admin creation
- File: `src/server/auth.ts`
- Line 3: `SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'southgold@gmail.com'` — CORRECT
- Line 4: `SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Southgold1234'` — CORRECT
- Lines 178-203: `ensureSuperAdmin()` — creates super admin if missing
- Lines 60-158: `createAppUser()` — creates auth user + profile + role-specific row
- Lines 160-167: `resetPasswordToDefault()` — resets password to default (hardcoded '1234')
- Lines 169-176: `setUserStatus()` — sets user active/suspended

### 13. repo.ts — Supabase-backed data layer
- File: `src/server/repo.ts`
- Already fully Supabase-backed
- All CRUD operations use `supabase.from(...)`
- No mock data references

### 14. db.ts — Supabase client
- File: `src/server/db.ts`
- Already properly configured for Supabase

### 15. Migration script
- File: `scripts/migrate.ts`
- Migrates db.json to Supabase
- Should only be run once, then db.json should be cleared

---

## SUMMARY OF ALL MOCK ARTIFACTS

| Category | File | Count | Severity |
|----------|------|-------|----------|
| Hardcoded credentials | LandingPage.tsx | 5 emails + passwords | CRITICAL |
| localStorage auth | App.tsx | 9 localStorage keys | CRITICAL |
| localStorage data | App.tsx | 13 data keys | CRITICAL |
| Mock data arrays | mockData.ts + App.tsx | 10 INITIAL_* arrays | HIGH |
| Hardcoded user emails | App.tsx, DashboardStats.tsx, FeePaymentTracker.tsx | 6 hardcoded emails | HIGH |
| Fake database | db.json | 1 file (704 lines) | CRITICAL |
| Mock login UI | LandingPage.tsx | 3 UI sections | HIGH |
| Mock FAQ data | SupportDesk.tsx | 1 import | MEDIUM |

---

## REMEDIATION PLAN

### Immediate (Phase 1-2)
1. Update this audit with complete findings
2. Create `reset_database.sql` to wipe all data
3. Create `seed_super_admin.sql` to ensure only southgold@gmail.com exists

### Short-term (Phase 3-6)
4. Remove all `INITIAL_*` user data from App.tsx (keep reference data like classes, subjects)
5. Remove all `localStorage` usage from App.tsx for auth and data
6. Remove hardcoded demo emails from LandingPage.tsx
7. Remove mock login UI ("Presetted Access Account", "sandbox mock profile", "Access Workplace")
8. Replace mock login with actual `/api/auth/login` call
9. Remove hardcoded emails from DashboardStats.tsx, FeePaymentTracker.tsx

### Medium-term (Phase 7-9)
10. Implement proper AuthContext for frontend auth state
11. Wire all API calls to include Bearer token
12. Implement password rules per role
13. Connect existing onboarding forms to Supabase
14. Remove db.json or replace with empty schema

### Verification (Phase 10)
15. Run `npm run dev` and verify no errors
16. Test all login roles
17. Test onboarding flows
18. Test data persistence
