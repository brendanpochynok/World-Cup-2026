'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavbarProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

const navLinks = [
  {
    href: '/app/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/app/picks',
    label: 'My Picks',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    href: '/app/scores',
    label: 'Scores',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/app/standings',
    label: 'Standings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Navbar({ username, displayName, avatarUrl }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50">
      {/* FIFA WC 2026 host nations gradient stripe */}
      <div className="h-[3px] bg-gradient-to-r from-wc-blue-500 via-wc-green-500 to-wc-red-500" />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Brand */}
            <Link href="/app/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
              <img src="/trionda-ball/trionda-ball.png" alt="Trionda" className="w-9 h-9 object-contain flex-shrink-0" />
              <div className="hidden sm:block leading-none">
                <span className="text-gray-900 font-black text-[13px] tracking-tight block">WC 2026</span>
                <span className="text-gray-400 text-[10px] uppercase tracking-[0.12em] font-semibold">Pool Picks</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                      active
                        ? 'text-wc-blue-500 bg-wc-blue-500/8'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-x-3.5 bottom-0 h-[2px] bg-wc-blue-500 rounded-full" />
                    )}
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* User area */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/app/profile"
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName ?? username}
                    className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-wc-blue-500/10 border border-wc-blue-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-black text-wc-blue-500 uppercase leading-none">
                      {(displayName ?? username).charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-[13px] font-semibold group-hover:underline underline-offset-2">
                  {displayName ?? username}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-[12px] text-gray-500 hover:text-gray-900 font-semibold transition-colors border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-gray-500 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-3 py-2 space-y-0.5">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-wc-blue-500/8 text-wc-blue-500 border-l-2 border-wc-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <Link
                href="/app/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName ?? username}
                    className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-wc-blue-500/10 border border-wc-blue-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-black text-wc-blue-500 uppercase leading-none">
                      {(displayName ?? username).charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-sm font-semibold">{displayName ?? username}</span>
              </Link>
              <button onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-900 font-semibold transition-colors">
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
