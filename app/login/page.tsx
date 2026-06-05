'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        router.push('/app/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wc-navy-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-wc-gold-400 mb-5 shadow-lg shadow-wc-gold-900/50">
            <svg className="w-7 h-7 text-wc-navy-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 2c1.85 0 3.56.63 4.93 1.68L5.68 16.93A7.95 7.95 0 014 12c0-4.41 3.59-8 8-8zm0 16a7.95 7.95 0 01-4.93-1.68L18.32 7.07A7.95 7.95 0 0120 12c0 4.41-3.59 8-8 8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">World Cup 2026</h1>
          <p className="text-wc-navy-400 text-xs mt-1.5 tracking-widest uppercase font-medium">Pool Picks</p>
        </div>

        {/* Card */}
        <div className="bg-wc-navy-900 border border-wc-navy-700 rounded-2xl p-7 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-white mb-5">Sign in</h2>

          {error && (
            <div className="bg-wc-red-700/20 border border-wc-red-600/50 text-wc-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="your username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-wc-navy-400 text-sm mt-5">
            No account?{' '}
            <Link href="/register" className="text-wc-gold-400 hover:text-wc-gold-300 font-semibold transition-colors">
              Register
            </Link>
          </p>
        </div>

        {/* Host nations flag strip */}
        <div className="flex justify-center gap-3 mt-8">
          {['🇺🇸', '🇨🇦', '🇲🇽'].map((flag) => (
            <span key={flag} className="text-2xl opacity-40">{flag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
