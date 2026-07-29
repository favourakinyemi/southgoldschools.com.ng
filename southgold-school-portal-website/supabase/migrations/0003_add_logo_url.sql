-- Migration 0003_add_logo_url.sql
-- SouthGold School Portal — Add logo_url column to configurations

ALTER TABLE configurations ADD COLUMN IF NOT EXISTS logo_url TEXT;
