import { NextResponse } from 'next/server';
import { ensureAppUserExists } from '../../../../src/server/auth';
import { requireRole } from '../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    if (!body?.email || !body?.role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }
    // Only Super Admin may create Staff Admins.
    if (body.role === 'SCHOOL_ADMIN' && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only the Super Admin can create Staff Admins' }, { status: 403 });
    }
    const result = await ensureAppUserExists({ ...body, createdBy: auth.id });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
