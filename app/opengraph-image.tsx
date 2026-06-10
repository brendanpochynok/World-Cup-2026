import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'World Cup 2026 Pool';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px)',
        }} />

        <div style={{ display: 'flex', marginBottom: 32 }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h12v6a6 6 0 01-12 0V2zM6 4H2a2 2 0 000 4h4M18 4h4a2 2 0 010 4h-4M12 14v4M8 18h8" />
          </svg>
        </div>

        <div style={{
          fontSize: 72, fontWeight: 900, color: '#ffffff',
          letterSpacing: '-2px', lineHeight: 1, marginBottom: 20,
          textAlign: 'center',
        }}>
          World Cup 2026
        </div>

        <div style={{
          fontSize: 36, color: '#94a3b8', fontWeight: 600,
          marginBottom: 48, textAlign: 'center',
        }}>
          Prediction Pool
        </div>

        <div style={{
          fontSize: 22, color: '#64748b', fontWeight: 500,
          textAlign: 'center', maxWidth: 700,
        }}>
          Pick every match · Fill your bracket · Win the pot
        </div>

        <div style={{
          position: 'absolute', bottom: 48,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: '10px 24px',
          color: '#94a3b8', fontSize: 16, fontWeight: 600,
        }}>
          June – July 2026
        </div>
      </div>
    ),
    size,
  );
}
