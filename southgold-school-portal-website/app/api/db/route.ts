import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';
import { authenticateRequest } from '../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await authenticateRequest(request);
    const db = await repo.getDbSnapshot(user ?? undefined);
    return NextResponse.json(db);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
