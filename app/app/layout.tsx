import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
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

  // After redirect(), user is guaranteed non-null (redirect throws)
  const username = user!.username;

  return (
    <div className="min-h-screen bg-wc-navy-950">
      <Navbar username={username} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
