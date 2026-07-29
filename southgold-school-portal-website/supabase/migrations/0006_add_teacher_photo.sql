-- Migration 0006_add_teacher_photo.sql
-- SouthGold School Portal — Add photo column to teachers table

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo text;
