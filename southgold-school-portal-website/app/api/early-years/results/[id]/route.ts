import { NextResponse } from 'next/server';
import * as repo from '../../../../../src/server/repo';
import { requireRole } from '../../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    await repo.EarlyYearsResults.update(id, body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
