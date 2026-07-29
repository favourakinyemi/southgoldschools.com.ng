-- Migration 0002_storage.sql
-- SouthGold School Portal — Storage Bucket setup

-- 1. Create storage bucket 'school-assets' if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing storage policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "Public Read school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete school-assets" ON storage.objects;

-- 3. Configure storage policy: Allow public read of objects in school-assets
CREATE POLICY "Public Read school-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

-- 4. Configure storage policy: Allow Super Admin & School/Staff Admin to upload/insert
CREATE POLICY "Admin Upload school-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-assets' AND
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'SCHOOL_ADMIN') OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN')
    )
  )
);

-- 5. Configure storage policy: Allow Super Admin & School/Staff Admin to update
CREATE POLICY "Admin Update school-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'SCHOOL_ADMIN') OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN')
    )
  )
);

-- 6. Configure storage policy: Allow Super Admin & School/Staff Admin to delete
CREATE POLICY "Admin Delete school-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'SCHOOL_ADMIN') OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.user_role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN')
    )
  )
);
