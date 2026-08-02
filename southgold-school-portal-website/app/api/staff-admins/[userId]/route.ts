import { NextResponse } from 'next/server';
import * as repo from '../../../../src/server/repo';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const body = await request.json();
    await repo.StaffAdmins.update(userId, body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    await repo.StaffAdmins.remove(userId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
