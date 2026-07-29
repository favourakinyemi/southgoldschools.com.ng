-- fresh_reset.sql
-- SouthGold School Portal — Database Clean & Fresh Reset Script
-- Safely removes all records, transactions, logs, and configurations to start fresh.
-- Preserves the master Super Admin user (southgold@gmail.com) without dropping schemas or tables.

BEGIN;

-- 1. Clear relational data with foreign key cascades first
DELETE FROM results;
DELETE FROM attendance;
DELETE FROM fees;

-- 2. Clear classes subjects associations and core class/subject definitions
DELETE FROM classes_subjects;
DELETE FROM classes;
DELETE FROM subjects;

-- 3. Clear users related collections
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM parents;
DELETE FROM staff_admins;

-- 4. Clear communication and support records
DELETE FROM tickets;
DELETE FROM activities;
DELETE FROM notifications;

-- 5. Clear academic session history
DELETE FROM sessions;

-- 6. Clear custom global configuration values (can be reinitialized on boot)
DELETE FROM configurations;

-- 7. Safely clear all users except the master super admin
DELETE FROM super_admins WHERE email != 'southgold@gmail.com';
DELETE FROM users WHERE email != 'southgold@gmail.com';

COMMIT;

ANALYZE;
