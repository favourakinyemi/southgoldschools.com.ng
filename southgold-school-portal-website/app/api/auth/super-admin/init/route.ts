import { NextResponse } from 'next/server';
import { ensureSuperAdmin } from '../../../../../src/server/auth';
import { requireRole } from '../../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN');
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSuperAdmin();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
