import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await repo.Tickets.list());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];
    const inserted = await repo.Tickets.insert(rows);
    return NextResponse.json(inserted || rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
