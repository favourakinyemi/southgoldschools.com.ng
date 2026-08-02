import { NextResponse } from 'next/server';
import { changePassword } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId, oldPassword, newPassword } = await request.json();
    await changePassword(userId, oldPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
