import { NextResponse } from 'next/server';
import { resetPasswordToDefault } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, defaultPassword } = await request.json();
    await resetPasswordToDefault(email, defaultPassword);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
