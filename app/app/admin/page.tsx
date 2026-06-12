import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?from=/app/admin');

  const admin = await isAdminUser(user.userId, user.username);
  if (!admin) redirect('/app/dashboard');

  const [matchResults, bracketResults, poolConfig, playerCount, users] = await Promise.all([
    prisma.matchResult.findMany(),
    prisma.bracketResult.findMany(),
    prisma.poolConfig.findUnique({ where: { id: 1 } }),
    prisma.user.count(),
    prisma.user.findMany({
      select: { username: true, displayName: true, lastSeenAt: true },
      orderBy: { username: 'asc' },
    }),
  ]);

  return (
    <AdminPanel
      matchResults={matchResults.map((r) => ({
        matchId: r.matchId,
        homeGoals: r.homeGoals,
        awayGoals: r.awayGoals,
        status: r.status,
      }))}
      bracketResults={bracketResults.map((r) => ({
        round: r.round,
        slot: r.slot,
        team: r.team,
      }))}
      entryFee={poolConfig?.entryFeePerPlayer ?? 0}
      playerCount={playerCount}
      users={users.map((u) => ({ username: u.username, displayName: u.displayName }))}
      players={users.map((u) => ({
        username: u.username,
        displayName: u.displayName,
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      }))}
    />
  );
}
