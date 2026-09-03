import { NextResponse } from 'next/server';
import * as repo from '../../../../src/server/repo';
import { requireRole } from '../../../../src/server/routeAuth';
import { ResultScoreValidationException } from '../../../../src/lib/resultScoreValidation';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    await repo.Results.update(id, body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e instanceof ResultScoreValidationException ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
