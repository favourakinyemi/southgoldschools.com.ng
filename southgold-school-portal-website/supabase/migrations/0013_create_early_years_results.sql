-- Migration 0013_create_early_years_results.sql
-- Create early_years_results table for Toddler, Creche, Playgroup, Nursery, Reception, Preschool

CREATE TABLE IF NOT EXISTS early_years_results (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id text,
  arm text,
  subject_id text REFERENCES subjects(id) ON DELETE SET NULL,
  term school_term,
  session text,
  rating text,
  teacher_comment text DEFAULT '',
  admin_review text DEFAULT '',
  overall_development text DEFAULT '',
  academic_readiness text DEFAULT '',
  behavioural_development text DEFAULT '',
  communication_skills text DEFAULT '',
  motor_skills text DEFAULT '',
  social_development text DEFAULT '',
  learning_readiness text DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_early_years_results_student ON early_years_results(student_id);
CREATE INDEX IF NOT EXISTS idx_early_years_results_class ON early_years_results(class_id, arm, term, session);

-- Enable RLS
ALTER TABLE early_years_results ENABLE ROW LEVEL SECURITY;

-- Security Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'early_years_results' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON early_years_results FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Extend Configurations table with early_years_grading_scale column
ALTER TABLE configurations ADD COLUMN IF NOT EXISTS early_years_grading_scale jsonb;
