import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/Navbar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        username={profile?.username ?? user.username}
        displayName={profile?.displayName}
        avatarUrl={profile?.avatarUrl}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
