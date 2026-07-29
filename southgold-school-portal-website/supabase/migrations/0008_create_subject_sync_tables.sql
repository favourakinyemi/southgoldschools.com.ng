-- Migration 0008_create_subject_sync_tables.sql
-- Create student_subjects and teacher_subjects tables to support robust normalized subject loading

CREATE TABLE IF NOT EXISTS student_subjects (
  student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id text NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id, class_id)
);

-- Enable RLS and add permissive policies
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_all" ON student_subjects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "service_role_all" ON teacher_subjects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
