import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: admin sets a new password for any user (no email infra, so resets are
// admin-initiated). Body: { username, newPassword }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const newPassword = body?.newPassword;

  if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }
  if (newPassword.length > 128) {
    return NextResponse.json({ error: 'New password is too long' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });

  return NextResponse.json({ ok: true, username });
}
