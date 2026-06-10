'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavbarProps {
  username: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
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
  {
    href: '/app/rules',
    label: 'Rules',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export default function Navbar({ username, displayName, avatarUrl, isAdmin = false }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isGuest = !username;
  const label = displayName ?? username ?? '';

  return (
    <nav className="sticky top-0 z-50">
      {/* FIFA WC 2026 host nations gradient stripe */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Brand */}
            <Link href="/app/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
              <img src="/trionda-ball/trionda-ball.png" alt="Trionda" className="w-9 h-9 object-contain flex-shrink-0" />
              <div className="hidden sm:block leading-none">
                <span className="text-gray-900 font-bold text-sm tracking-tight block">WC 2026</span>
                <span className="text-gray-400 text-[11px] font-semibold">Pool Picks</span>
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
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
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
              {isAdmin && (
                <Link
                  href="/app/admin"
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    pathname === '/app/admin' || pathname.startsWith('/app/admin/')
                      ? 'text-wc-gold-500 bg-wc-gold-400/10'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {(pathname === '/app/admin' || pathname.startsWith('/app/admin/')) && (
                    <span className="absolute inset-x-3.5 bottom-0 h-[2px] bg-wc-gold-400 rounded-full" />
                  )}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </Link>
              )}
            </div>

            {/* User area */}
            <div className="hidden md:flex items-center gap-3">
              {isGuest ? (
                <>
                  <Link href="/login"
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/register"
                    className="text-xs font-semibold bg-wc-blue-500 hover:bg-wc-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/app/profile"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={label}
                        className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-wc-blue-500/10 border border-wc-blue-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-wc-blue-500 uppercase leading-none">
                          {label.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-semibold group-hover:underline underline-offset-2 flex items-center gap-1">
                      {label}
                      {isAdmin && (
                        <svg aria-label="Admin" className="w-3.5 h-3.5 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-gray-900 font-semibold transition-colors border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </>
              )}
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
              {isAdmin && (
                <Link
                  href="/app/admin"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    pathname === '/app/admin' || pathname.startsWith('/app/admin/')
                      ? 'bg-wc-gold-400/10 text-wc-gold-500 border-l-2 border-wc-gold-400'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </Link>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              {isGuest ? (
                <div className="flex items-center gap-3 w-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-sm font-semibold text-white bg-wc-blue-500 hover:bg-wc-blue-600 rounded-lg py-2 transition-colors">
                    Register
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    href="/app/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={label}
                        className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-wc-blue-500/10 border border-wc-blue-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-wc-blue-500 uppercase leading-none">
                          {label.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-semibold flex items-center gap-1">
                      {label}
                      {isAdmin && (
                        <svg aria-label="Admin" className="w-3.5 h-3.5 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </span>
                  </Link>
                  <button onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-gray-900 font-semibold transition-colors">
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
