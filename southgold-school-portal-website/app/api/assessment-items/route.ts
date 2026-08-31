import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';
import { requireRole } from '../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json(await repo.AssessmentItems.list());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    await repo.AssessmentItems.save(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
