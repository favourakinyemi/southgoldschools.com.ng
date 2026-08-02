import { NextResponse } from 'next/server';
import * as repo from '../../../../src/server/repo';
import { requireRole } from '../../../../src/server/routeAuth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireRole(request, 'SUPER_ADMIN');
  if (auth instanceof NextResponse) return auth;
  try {
    const { userId } = await params;
    const body = await request.json();
    await repo.StaffAdmins.update(userId, body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireRole(request, 'SUPER_ADMIN');
  if (auth instanceof NextResponse) return auth;
  try {
    const { userId } = await params;
    await repo.StaffAdmins.remove(userId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
