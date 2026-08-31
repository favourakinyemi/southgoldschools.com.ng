import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';
import { requireRole } from '../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT');
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json(await repo.Tickets.list());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];
    const inserted = await repo.Tickets.insert(rows);
    return NextResponse.json(inserted || rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
