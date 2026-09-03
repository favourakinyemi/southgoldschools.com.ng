import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';
import { requireRole } from '../../../src/server/routeAuth';
import { ResultScoreValidationException } from '../../../src/lib/resultScoreValidation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json(await repo.Results.list());
  } catch (e: any) {
    const status = e instanceof ResultScoreValidationException ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    const r = await request.json();
    if (!r.id) r.id = `res_${Date.now()}`;
    await repo.Results.insert([r]);
    return NextResponse.json(r, { status: 201 });
  } catch (e: any) {
    const status = e instanceof ResultScoreValidationException ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function PUT(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];
    await repo.Results.upsert(rows);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e instanceof ResultScoreValidationException ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
