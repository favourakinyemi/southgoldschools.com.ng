-- reset_database.sql
-- SouthGold School Portal database clean script.
--
-- This script safely removes all demo, mock, and seeded data without altering the schema or dropping tables.
-- It preserves the single Super Admin account: southgold@gmail.com.

BEGIN;

-- 1. Delete dependent/child records first to prevent foreign key constraint violations
DELETE FROM results;
DELETE FROM attendance;
DELETE FROM fees;

-- 2. Delete non-super-admin profiles and roles
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM parents;
DELETE FROM staff_admins;

-- 3. Clear logs, tickets, activities, and notifications
DELETE FROM tickets;
DELETE FROM activities;
DELETE FROM notifications;

-- 4. Clean up sessions and configurations (will be re-created/initialized upon application boot)
DELETE FROM configurations;
DELETE FROM sessions;

-- 5. Delete other users and super_admins except southgold@gmail.com
DELETE FROM super_admins WHERE email != 'southgold@gmail.com';
DELETE FROM users WHERE email != 'southgold@gmail.com';

COMMIT;

ANALYZE;
