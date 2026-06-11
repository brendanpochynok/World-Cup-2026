import { getSessionUser } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import DashboardChat from '@/components/DashboardChat';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chat' };
export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const isAdmin = await isAdminUser(user.userId, user.username);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">Chat</h1>
        <p className="text-gray-500 text-sm mt-2">Talk with the pool</p>
      </div>
      <DashboardChat
        me={{ userId: user.userId, username: user.username }}
        isAdmin={isAdmin}
        tall
      />
    </div>
  );
}
