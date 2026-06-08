import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/app/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-wc-blue-500 via-wc-green-500 to-wc-red-500 z-10" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
