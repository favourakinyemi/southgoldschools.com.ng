import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await repo.Parents.list());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await repo.Parents.insert([body]);
    return NextResponse.json(body, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
