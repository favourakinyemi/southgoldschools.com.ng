import { NextResponse } from 'next/server';
import { resetPasswordToDefault } from '../../../../src/server/auth';
import { requireRole } from '../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireRole(request, 'SUPER_ADMIN', 'SCHOOL_ADMIN');
  if (auth instanceof NextResponse) return auth;
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    await resetPasswordToDefault(email);
    return NextResponse.json({ success: true, message: 'Password reset to configured default.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
