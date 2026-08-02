import { NextResponse } from 'next/server';
import { setUserStatus } from '../../../../src/server/auth';
import { requireRole } from '../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;
  try {
    const { email, status } = await request.json();
    if (!email || !status) {
      return NextResponse.json({ error: 'Email and status are required' }, { status: 400 });
    }
    if (auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only the Super Admin can suspend/reactivate users' }, { status: 403 });
    }
    await setUserStatus(email, status);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
