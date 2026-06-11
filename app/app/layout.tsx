import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/admin-auth';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  let profile: { username: string; displayName: string | null; avatarUrl: string | null; isAdmin: boolean } | null = null;
  if (user) {
    const dbProfile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { username: true, displayName: true, avatarUrl: true, isAdmin: true },
    });
    if (dbProfile) {
      const admin = await isAdminUser(user.userId, user.username);
      profile = { ...dbProfile, isAdmin: admin };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        username={profile?.username ?? user?.username ?? null}
        displayName={profile?.displayName}
        avatarUrl={profile?.avatarUrl}
        isAdmin={profile?.isAdmin ?? false}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        {children}
      </main>
      <BottomNav loggedIn={!!user} />
    </div>
  );
}
