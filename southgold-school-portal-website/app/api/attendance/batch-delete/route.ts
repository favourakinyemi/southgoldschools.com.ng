import { NextResponse } from 'next/server';
import * as repo from '../../../../src/server/repo';
import { requireRole } from '../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    const { ids } = await request.json();
    await repo.Attendance.removeMany(ids || []);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
