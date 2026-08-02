import { NextResponse } from 'next/server';
import * as repo from '../../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    await repo.Attendance.removeMany(ids || []);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
