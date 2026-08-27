import { NextResponse } from 'next/server';
import { requireRole } from '../../../../src/server/routeAuth';
import { getSupabaseProjectRef, supabase, SUPABASE_CONFIGURED } from '../../../../src/server/db';

export const dynamic = 'force-dynamic';

function summarize(error?: { message?: string } | null) {
  return error?.message ? { ok: false, error: error.message } : { ok: true };
}

export async function GET(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;

  const [database, authCheck, storage] = await Promise.all([
    supabase
      .from('configurations')
      .select('id')
      .eq('id', 'global')
      .maybeSingle(),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
    supabase.storage.from('school-assets').list('cms', { limit: 1 }),
  ]);

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: {
      configured: SUPABASE_CONFIGURED,
      projectRef: getSupabaseProjectRef(),
      database: {
        ...summarize(database.error),
        checkedTable: 'configurations',
        hasGlobalConfig: Boolean(database.data),
      },
      auth: summarize(authCheck.error),
      storage: {
        ...summarize(storage.error),
        bucket: 'school-assets',
        checkedPath: 'cms',
        reachable: !storage.error,
      },
    },
  });
}
