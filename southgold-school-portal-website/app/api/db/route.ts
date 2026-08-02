import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';
import { authenticate } from '../../../src/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = authHeader ? await authenticate(authHeader) : null;
    const db = await repo.getDbSnapshot(user ?? undefined);
    return NextResponse.json(db);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
