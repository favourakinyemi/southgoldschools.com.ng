import { NextResponse } from 'next/server';
import { login } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const result = await login(email, password);
    const res = NextResponse.json(result);
    res.cookies.set('sb-access-token', result.accessToken, {
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
