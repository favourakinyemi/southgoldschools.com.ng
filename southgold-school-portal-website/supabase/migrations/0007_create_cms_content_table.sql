-- Migration 0007_create_cms_content_table.sql
-- Create cms_content table to store landing page CMS config cleanly

CREATE TABLE IF NOT EXISTS cms_content (
  id text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Copy existing data from configurations if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM configurations WHERE id = 'landing_cms') THEN
    INSERT INTO cms_content (id, content)
    SELECT 'landing_cms', grading_scale
    FROM configurations
    WHERE id = 'landing_cms'
    ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;
  END IF;
END $$;

-- Enable RLS and add permissive policy for the Express service role backend
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_all" ON cms_content FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
