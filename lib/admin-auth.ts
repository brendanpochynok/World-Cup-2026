import { NextRequest } from 'next/server';
import { getSessionUser } from './auth';
import { prisma } from './prisma';

// Returns the set of usernames that are always admin via env var (no DB needed)
function envAdminUsernames(): Set<string> {
  const raw = process.env.ADMIN_USERNAME ?? '';
  return new Set(raw.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean));
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;

  const user = await getSessionUser();
  if (!user) return false;

  if (envAdminUsernames().has(user.username.toLowerCase())) return true;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin === true;
}

// For server components / layouts — checks a session user against DB flag or env var
export async function isAdminUser(userId: number, username: string): Promise<boolean> {
  if (envAdminUsernames().has(username.toLowerCase())) return true;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin === true;
}
