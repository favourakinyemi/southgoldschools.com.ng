-- Migration 0012_remove_onboarding_activities_coupling.sql
-- Remove coupling where student onboarding automatically inserts into activities

DROP FUNCTION IF EXISTS onboard_student_transaction(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text[], uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION onboard_student_transaction(
  p_student_id text,
  p_admission_no text,
  p_first_name text,
  p_last_name text,
  p_photo text,
  p_gender text,
  p_date_of_birth text,
  p_student_email text,
  p_parent_id text,
  p_parent_name text,
  p_parent_email text,
  p_parent_phone text,
  p_parent_address text,
  p_class_id text,
  p_arm text,
  p_status text,
  p_subjects text[],
  p_student_user_id uuid,
  p_parent_user_id uuid,
  p_created_by uuid
)
RETURNS void AS $$
DECLARE
  v_gender gender_type;
  v_status user_status;
  v_sub text;
BEGIN
  -- Safe conversion of text parameters to domain enums
  BEGIN
    v_gender := p_gender::gender_type;
  EXCEPTION WHEN OTHERS THEN
    v_gender := 'Male'::gender_type;
  END;

  BEGIN
    v_status := p_status::user_status;
  EXCEPTION WHEN OTHERS THEN
    v_status := 'Active'::user_status;
  END;

  -- 1. Validate inputs
  IF p_student_id IS NULL OR p_first_name IS NULL OR p_last_name IS NULL THEN
    RAISE EXCEPTION 'Student ID, first name, and last name are mandatory.';
  END IF;

  IF p_parent_id IS NULL OR p_parent_name IS NULL OR p_parent_email IS NULL THEN
    RAISE EXCEPTION 'Parent ID, parent name, and parent email are mandatory.';
  END IF;

  -- 2. Upsert Parent user profile
  INSERT INTO public.users (id, email, full_name, user_role, status, created_by)
  VALUES (p_parent_user_id, p_parent_email, p_parent_name, 'PARENT', v_status, p_created_by)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    status = EXCLUDED.status;

  -- Upsert Parent details
  INSERT INTO public.parents (id, first_name, last_name, email, phone, address, status, user_id, created_by)
  VALUES (
    p_parent_id,
    split_part(p_parent_name, ' ', 1),
    COALESCE(nullif(substring(p_parent_name from position(' ' in p_parent_name) + 1), p_parent_name), 'Parent'),
    p_parent_email,
    p_parent_phone,
    p_parent_address,
    v_status,
    p_parent_user_id,
    p_created_by
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    user_id = EXCLUDED.user_id;

  -- 3. Upsert Student user profile
  INSERT INTO public.users (id, email, full_name, user_role, status, created_by)
  VALUES (p_student_user_id, COALESCE(p_student_email, p_student_id || '@southgold.com'), p_first_name || ' ' || p_last_name, 'STUDENT', v_status, p_created_by)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    status = EXCLUDED.status;

  -- 4. Upsert Student profile
  INSERT INTO public.students (
    id, admission_no, first_name, last_name, email, photo, gender, date_of_birth,
    parent_id, parent_name, parent_email, parent_phone, class_id, arm, status, subjects, user_id
  )
  VALUES (
    p_student_id, p_admission_no, p_first_name, p_last_name, COALESCE(p_student_email, p_student_id || '@southgold.com'), p_photo, v_gender, p_date_of_birth,
    p_parent_id, p_parent_name, p_parent_email, p_parent_phone, p_class_id, p_arm, v_status, p_subjects, p_student_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    admission_no = EXCLUDED.admission_no,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    photo = EXCLUDED.photo,
    gender = EXCLUDED.gender,
    date_of_birth = EXCLUDED.date_of_birth,
    parent_id = EXCLUDED.parent_id,
    parent_name = EXCLUDED.parent_name,
    parent_email = EXCLUDED.parent_email,
    parent_phone = EXCLUDED.parent_phone,
    class_id = EXCLUDED.class_id,
    arm = EXCLUDED.arm,
    status = EXCLUDED.status,
    subjects = EXCLUDED.subjects,
    user_id = EXCLUDED.user_id;

  -- Update linkages in users
  UPDATE public.users SET linked_id = p_parent_id WHERE id = p_parent_user_id;
  UPDATE public.users SET linked_id = p_student_id WHERE id = p_student_user_id;

  -- 5. Synchronize student_subjects
  DELETE FROM public.student_subjects WHERE student_id = p_student_id;
  IF p_subjects IS NOT NULL THEN
    FOREACH v_sub IN ARRAY p_subjects LOOP
      -- Create subject row if missing
      INSERT INTO public.subjects (id, name, code)
      VALUES (v_sub, upper(v_sub), upper(v_sub))
      ON CONFLICT (id) DO NOTHING;

      -- Create linkage
      INSERT INTO public.student_subjects (student_id, subject_id)
      VALUES (p_student_id, v_sub)
      ON CONFLICT (student_id, subject_id) DO NOTHING;
    END LOOP;
  END IF;

END;
$$ LANGUAGE plpgsql;
