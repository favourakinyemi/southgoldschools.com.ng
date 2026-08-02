import { NextResponse } from 'next/server';
import { ensureAppUserExists } from '../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await ensureAppUserExists(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
