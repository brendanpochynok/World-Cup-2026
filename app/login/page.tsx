import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/app/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
