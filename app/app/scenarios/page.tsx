import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import WinScenarios from '@/components/scenarios/WinScenarios';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Win Scenarios' };
export const dynamic = 'force-dynamic';

export default async function ScenariosPage() {
  const session = await getSessionUser();
  let meLabel: string | undefined;
  if (session) {
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { displayName: true, username: true },
    });
    meLabel = me?.displayName || me?.username || undefined;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Win Scenarios</h1>
        <p className="text-gray-500 text-sm mt-1.5">
          What has to happen for each entry to win — live win chances, expected payout, and a tap-through
          of the games that decide it.
        </p>
      </div>
      <WinScenarios apiBase="/api/scenarios" meLabel={meLabel} />
    </div>
  );
}
