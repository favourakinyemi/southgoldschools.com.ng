import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('DATABASE_URL is not set. Skipping SQL update.');
    return;
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    console.log('Running database updates...');
    
    // Add early_years_grading_scale and early_years_competencies columns to configurations table if not exists
    await client.query(`
      ALTER TABLE configurations 
      ADD COLUMN IF NOT EXISTS early_years_grading_scale jsonb,
      ADD COLUMN IF NOT EXISTS early_years_competencies jsonb;
    `);
    console.log('configurations table updated with early_years_grading_scale and early_years_competencies columns.');

    // Create early_years_results table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS early_years_results (
        id text PRIMARY KEY,
        student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id text,
        arm text,
        subject_id text REFERENCES subjects(id) ON DELETE SET NULL,
        term school_term,
        session text,
        rating text,
        teacher_comment text,
        admin_review text,
        overall_development text,
        academic_readiness text,
        behavioural_development text,
        communication_skills text,
        motor_skills text,
        social_development text,
        learning_readiness text,
        is_approved boolean NOT NULL DEFAULT false,
        status text NOT NULL DEFAULT 'DRAFT',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('early_years_results table created or verified.');

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_early_years_results_student ON early_years_results(student_id);
      CREATE INDEX IF NOT EXISTS idx_early_years_results_class ON early_years_results(class_id, arm, term, session);
    `);
    console.log('Indexes for early_years_results verified.');

    // Enable RLS and setup policies
    await client.query(`
      ALTER TABLE early_years_results ENABLE ROW LEVEL SECURITY;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'early_years_results' AND policyname = 'service_role_all'
        ) THEN
          CREATE POLICY "service_role_all" ON early_years_results FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);
    console.log('RLS and security policies applied to early_years_results.');

  } catch (err: any) {
    console.error('Database update failed:', err.message);
  } finally {
    await client.end();
  }
}

main();
