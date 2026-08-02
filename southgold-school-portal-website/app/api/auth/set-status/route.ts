import { NextResponse } from 'next/server';
import { setUserStatus } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, status } = await request.json();
    await setUserStatus(email, status);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
