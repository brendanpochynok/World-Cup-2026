import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Without this, mobile browsers render at ~980px desktop width and scale
// down — the whole UI looks shrunk and the nav never adapts. viewportFit
// 'cover' lets the bottom nav's safe-area insets take effect on notched phones.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1d4ed8',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://world-cup-2026-one-red.vercel.app'),
  title: { default: 'World Cup 2026 Pool', template: '%s · WC26 Pool' },
  description: 'Pick every match, fill your bracket, and compete with friends for the pot.',
  icons: {
    icon: '/trionda-ball/trionda-ball.png',
    apple: '/trionda-ball/trionda-ball.png',
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'WC26 Pool', statusBarStyle: 'default' },
  openGraph: { type: 'website', siteName: 'World Cup 2026 Pool' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
