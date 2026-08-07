-- reset_database.sql
-- SouthGold School Portal -- Database Clean & Fresh Reset Script
--
-- Safely removes all operational/transactional data (students, staff,
-- results, attendance, tickets, sessions, etc.) without dropping any
-- schema or tables. Preserves the master Super Admin account
-- (southgold@gmail.com) and the public landing page CMS content
-- (cms_content) -- resetting school records for a new term shouldn't
-- also wipe the website's marketing copy/gallery/news.
--
-- Safe to run directly in the Supabase SQL Editor. Table list matches
-- supabase/migrations/0001 - 0013 as of the last time this file was
-- updated; if you add a new table that holds per-term/per-student
-- data, add a DELETE for it here too.
--
-- Note: public.users.id references auth.users(id) on delete cascade,
-- which only cascades that direction (deleting an auth.users row
-- clears its public.users row, not the reverse). This script clears
-- public.users but leaves the underlying Supabase Auth accounts for
-- deleted students/teachers/parents/staff in place -- delete those
-- separately via the Supabase Auth admin API/dashboard if you also
-- want their login credentials removed.

BEGIN;

-- 1. Tables with foreign keys into students/teachers/subjects/classes --
--    delete these first to avoid FK violations (most of these already
--    cascade from their parent, but deleting explicitly keeps this
--    script correct even if a cascade rule ever changes).
DELETE FROM early_years_results;
DELETE FROM student_subjects;
DELETE FROM teacher_subjects;
DELETE FROM result_approval_requests;
DELETE FROM results;
DELETE FROM fees;
DELETE FROM attendance;

-- 2. Class/subject structure
DELETE FROM classes_subjects;
DELETE FROM classes;
DELETE FROM subjects;

-- 3. Role profiles
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM parents;
DELETE FROM staff_admins;

-- 4. Communication and support records
DELETE FROM tickets;
DELETE FROM activities;
DELETE FROM notifications;

-- 5. Academic session/config (re-initialized on next app boot)
DELETE FROM sessions;
DELETE FROM configurations;

-- 6. Auth/profile cleanup -- keep only the master Super Admin
DELETE FROM super_admins WHERE email != 'southgold@gmail.com';
DELETE FROM users WHERE email != 'southgold@gmail.com';

COMMIT;

ANALYZE;
