-- Migration 0005_add_student_email.sql
-- SouthGold School Portal — Add email column to students table

ALTER TABLE students ADD COLUMN IF NOT EXISTS email text;
