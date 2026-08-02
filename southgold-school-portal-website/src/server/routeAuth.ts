import { NextResponse } from 'next/server';
import { authenticateRequest, AuthUser } from './auth';

// Route Handler equivalent of the old Express requireRole middleware.
// Returns the authenticated user, or a NextResponse to return immediately.
export async function requireRole(request: Request, ...roles: string[]): Promise<AuthUser | NextResponse> {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden: insufficient privileges' }, { status: 403 });
  }
  return user;
}
