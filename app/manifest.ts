import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'World Cup 2026 Pool',
    short_name: 'WC2026',
    description: 'FIFA World Cup 2026 prediction pool',
    start_url: '/app/dashboard',
    display: 'standalone',
    theme_color: '#1d4ed8',
    background_color: '#f9fafb',
    icons: [
      { src: '/trionda-ball/trionda-ball.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/trionda-ball/trionda-ball.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
