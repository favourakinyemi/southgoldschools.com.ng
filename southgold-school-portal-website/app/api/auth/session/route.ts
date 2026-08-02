import { NextResponse } from 'next/server';
import { authenticate } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();
    if (!accessToken) {
      const res = NextResponse.json({ success: true });
      res.cookies.set('sb-access-token', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 });
      return res;
    }

    const user = await authenticate(accessToken);
    const res = NextResponse.json({ user, ok: !!user });
    res.cookies.set('sb-access-token', accessToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
