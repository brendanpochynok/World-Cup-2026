'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fromParam = searchParams.get('from');
  const postLoginDest = fromParam && fromParam.startsWith('/app') ? fromParam : '/app/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        router.push(postLoginDest);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-10">
        <img src="/trionda-ball/trionda-ball.png" alt="Trionda" className="w-20 h-20 object-contain mx-auto mb-4" />
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">World Cup 2026</h1>
        <p className="text-gray-400 text-xs mt-1.5 tracking-[0.15em] uppercase font-semibold">Pool Picks</p>
      </div>

      {/* Card */}
      <div className="relative bg-white border border-gray-200 rounded-2xl p-7 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-wc-blue-500 rounded-t-2xl" style={{ borderRadius: '16px 16px 0 0' }} />

        <h2 className="text-xl font-black text-gray-900 mb-6">Sign in</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="input-field" placeholder="your username"
              required autoComplete="username" autoFocus />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="••••••••"
              required autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-1 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in…
              </>
            ) : 'Sign in →'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          No account?{' '}
          <Link href="/register" className="text-wc-blue-500 hover:text-wc-blue-600 font-bold transition-colors">
            Register
          </Link>
        </p>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/app/dashboard"
          className="text-gray-400 hover:text-gray-600 text-sm font-semibold transition-colors"
        >
          Continue as guest →
        </Link>
      </div>
    </div>
  );
}
