import { NextResponse } from 'next/server';
import * as repo from '../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await repo.CMS.get());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await repo.CMS.update(body));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
