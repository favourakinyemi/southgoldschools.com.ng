import { NextResponse } from 'next/server';
import { authenticate } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();
    const user = await authenticate(accessToken);
    return NextResponse.json({ user, ok: !!user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
