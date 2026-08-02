import { NextResponse } from 'next/server';
import { login } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const result = await login(email, password);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
