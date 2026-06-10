import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://world-cup-2026-one-red.vercel.app'),
  title: { default: 'World Cup 2026 Pool', template: '%s · WC26 Pool' },
  description: 'Pick every match, fill your bracket, and compete with friends for the pot.',
  openGraph: {
    type: 'website',
    siteName: 'World Cup 2026 Pool',
  },
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WC26 Pool" />
        <link rel="apple-touch-icon" href="/trionda-ball/trionda-ball.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
