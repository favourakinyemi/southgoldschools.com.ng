-- full_system_reset.sql
-- SouthGold School Portal — Full Database Clean & System Reset Script
--
-- Safely removes all tables' transactional, academic, operational, and log data.
-- Preserves only the primary master Super Admin (southgold@gmail.com) user and profile.
-- Safe to execute directly in the Supabase SQL Editor.

BEGIN;

-- 1. Cascade delete dependent transactional/child tables first to avoid FK violations
DELETE FROM results;
DELETE FROM attendance;
DELETE FROM fees;

-- 2. Clear subjects and class-related associations
DELETE FROM classes_subjects;
DELETE FROM classes;
DELETE FROM subjects;

-- 3. Clear individual role profiles
DELETE FROM students;
DELETE FROM teachers;
DELETE FROM parents;
DELETE FROM staff_admins;

-- 4. Clear generic messaging and operational logs
DELETE FROM tickets;
DELETE FROM activities;
DELETE FROM notifications;

-- 5. Clear administrative configurations and sessions (will auto-reinitialize on next boot)
DELETE FROM configurations;
DELETE FROM sessions;

-- 6. Clean up public users tables, preserving only the master Super Admin profile
DELETE FROM super_admins WHERE email != 'southgold@gmail.com';
DELETE FROM users WHERE email != 'southgold@gmail.com';

COMMIT;

-- Run PostgreSQL analytics to update schema stats
ANALYZE;
