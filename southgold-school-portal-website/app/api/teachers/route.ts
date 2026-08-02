import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await repo.Teachers.list());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const t = await request.json();
    if (!t.id) t.id = `tch_${Date.now()}`;
    await repo.Teachers.insert([t]);
    return NextResponse.json(t, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await repo.Teachers.replace(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
