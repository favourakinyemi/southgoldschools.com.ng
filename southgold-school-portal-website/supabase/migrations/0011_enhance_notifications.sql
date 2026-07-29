-- Migration 0011_enhance_notifications.sql
-- Enhance notifications table with recipient_id and is_read status for individual tracking

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Re-create policies or make sure it's fully accessible
DO $$
BEGIN
  -- We don't necessarily have restrictive RLS policies, but let's ensure it's fully permitted
  NULL;
END $$;
