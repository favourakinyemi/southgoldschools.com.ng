import { NextResponse } from 'next/server';
import { ensureSuperAdmin } from '../../../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await ensureSuperAdmin();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
