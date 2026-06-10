import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
      <head>
        <meta name="theme-color" content="#1d4ed8" />
      </head>
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
