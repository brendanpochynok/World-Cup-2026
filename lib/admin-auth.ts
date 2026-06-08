import { NextRequest } from 'next/server';
import { getSessionUser } from './auth';
import { prisma } from './prisma';

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;

  const user = await getSessionUser();
  if (!user) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin === true;
}
