-- Migration 0010_create_result_approvals.sql
-- Create result_approval_requests table to track results submissions, status, and comments

CREATE TABLE IF NOT EXISTS result_approval_requests (
  id text PRIMARY KEY, -- usually class_id || '_' || session || '_' || term
  class_id text NOT NULL,
  session text NOT NULL,
  term text NOT NULL,
  teacher_id text NOT NULL,
  submission_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, PUBLISHED, REJECTED, RETURNED_FOR_CORRECTION
  head_teacher_comment text DEFAULT '',
  principal_comment text DEFAULT '',
  review_history jsonb DEFAULT '[]'::jsonb -- [{timestamp, action, user, comment}]
);

-- Enable RLS
ALTER TABLE result_approval_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_all" ON result_approval_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
