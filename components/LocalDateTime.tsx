'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

interface LocalDateTimeProps {
  iso: string;
  showDate?: boolean;
  showTime?: boolean;
  className?: string;
}

export default function LocalDateTime({ iso, showDate = true, showTime = true, className }: LocalDateTimeProps) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return null;

  const d = new Date(iso);
  const parts: string[] = [];
  if (showDate) parts.push(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
  if (showTime) parts.push(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }));
  return <span className={className}>{parts.join(' at ')}</span>;
}
