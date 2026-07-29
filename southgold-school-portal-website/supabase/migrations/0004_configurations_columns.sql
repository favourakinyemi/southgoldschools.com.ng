-- Migration 0004_configurations_columns.sql
-- SouthGold School Portal — Add missing configurations columns

ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS school_name text default 'SOUTHGOLD MONTESSORI SCHOOL',
ADD COLUMN IF NOT EXISTS school_address text default '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria',
ADD COLUMN IF NOT EXISTS school_email text default 'southgoldmontessorischools@gmail.com',
ADD COLUMN IF NOT EXISTS school_phone text default '+234 803 123 4567';
