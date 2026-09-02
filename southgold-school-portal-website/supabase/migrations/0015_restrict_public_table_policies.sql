-- Migration 0015_restrict_public_table_policies.sql
-- Restrict broad legacy "service_role_all" policies so direct anon/authenticated
-- Supabase clients cannot read or write portal tables by relying on USING (true).
--
-- The Next.js API continues to use the server-side service-role client and
-- must keep its application-layer route guards. This migration is defense in
-- depth, not a replacement for API authorization.

do $$
declare
  table_name text;
  tables text[] := array[
    'users',
    'super_admins',
    'staff_admins',
    'teachers',
    'parents',
    'students',
    'subjects',
    'classes',
    'classes_subjects',
    'sessions',
    'attendance',
    'results',
    'fees',
    'notifications',
    'tickets',
    'activities',
    'configurations',
    'cms_content',
    'student_subjects',
    'teacher_subjects',
    'result_approval_requests',
    'early_years_results'
  ];
begin
  foreach table_name in array tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists service_role_all on public.%I', table_name);
    execute format(
      'create policy service_role_all on public.%I as permissive for all to service_role using (true) with check (true)',
      table_name
    );
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

revoke execute on function public.onboard_student_transaction(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text[], uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.onboard_student_transaction(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text[], uuid, uuid, uuid
) to service_role;
