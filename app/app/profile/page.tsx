'use client';

import { useState, useEffect, useRef } from 'react';
import { ALL_TEAMS } from '@/lib/worldcup-data';
import type { MeStats } from '@/app/api/me/stats/route';

interface ProfileData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  favoriteTeam: string | null;
  createdAt: string;
}

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        // Center-crop to square
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<MeStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null | 'remove'>(undefined as unknown as null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password form state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/me/stats').then((r) => r.json()).catch(() => null),
    ]).then(([data, statsData]: [ProfileData, MeStats | null]) => {
      setProfile(data);
      setDisplayName(data.displayName ?? '');
      setFavoriteTeam(data.favoriteTeam ?? '');
      setAvatarPreview(data.avatarUrl);
      if (statsData && 'score' in statsData) setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ ok: false, text: 'Please select an image file.' });
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarPreview(dataUrl);
      setPendingAvatar(dataUrl);
      setProfileMsg(null);
    } catch {
      setProfileMsg({ ok: false, text: 'Failed to process image.' });
    }
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    setPendingAvatar('remove');
    setProfileMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    const updates: Record<string, string | null> = {
      displayName: displayName.trim() || null,
      favoriteTeam: favoriteTeam || null,
    };

    if (pendingAvatar === 'remove') {
      updates.avatarUrl = null;
    } else if (typeof pendingAvatar === 'string') {
      updates.avatarUrl = pendingAvatar;
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();

    if (res.ok) {
      setProfileMsg({ ok: true, text: 'Profile saved.' });
      setPendingAvatar(null as unknown as null);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: displayName.trim() || null,
              favoriteTeam: favoriteTeam || null,
              avatarUrl: avatarPreview,
            }
          : prev
      );
    } else {
      setProfileMsg({ ok: false, text: data.error ?? 'Save failed.' });
    }

    setProfileSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);

    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }

    setPwSaving(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();

    if (res.ok) {
      setPwMsg({ ok: true, text: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } else {
      setPwMsg({ ok: false, text: data.error ?? 'Failed to change password.' });
    }

    setPwSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-wc-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-gray-500 text-sm">Could not load profile.</p>;
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="text-3xl font-black text-gray-900">Your Profile</h1>
      </div>

      {/* ── Stats card ── */}
      {stats && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900 text-lg">Your Stats</h2>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              #{stats.rank} of {stats.totalPlayers}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-wc-blue-50 border border-wc-blue-100 px-3 py-3">
              <div className="text-[10px] font-bold text-wc-blue-500 uppercase tracking-wider mb-0.5">Rank</div>
              <div className="text-2xl font-black text-wc-blue-600">#{stats.rank}</div>
              <div className="text-[10px] text-wc-blue-400 mt-0.5">of {stats.totalPlayers} players</div>
            </div>
            <div className="rounded-xl bg-wc-gold-50 border border-wc-gold-200 px-3 py-3">
              <div className="text-[10px] font-bold text-wc-gold-600 uppercase tracking-wider mb-0.5">Score</div>
              <div className="text-2xl font-black text-wc-gold-600">{stats.score}</div>
              <div className="text-[10px] text-wc-gold-400 mt-0.5">points</div>
            </div>
            <div className="rounded-xl bg-wc-green-50 border border-wc-green-200 px-3 py-3">
              <div className="text-[10px] font-bold text-wc-green-600 uppercase tracking-wider mb-0.5">Group picks</div>
              <div className="text-2xl font-black text-wc-green-600">{stats.groupCorrect}</div>
              <div className="text-[10px] text-wc-green-500 mt-0.5">
                correct · {stats.groupWrong} wrong
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Bracket</div>
              <div className="text-2xl font-black text-gray-700">{stats.bracketPicksCount}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">picks made</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile card ── */}
      <form onSubmit={handleProfileSave} className="card space-y-6">
        <h2 className="font-black text-gray-900 text-lg">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-wc-blue-400 transition-colors flex-shrink-0 group focus:outline-none focus:ring-2 focus:ring-wc-blue-400"
          >
            {avatarPreview ? (
              <>
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <svg className="w-6 h-6 text-gray-400 group-hover:text-wc-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] text-gray-400 group-hover:text-wc-blue-400 transition-colors font-semibold">Upload</span>
              </div>
            )}
          </button>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="block text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
              >
                Remove photo
              </button>
            )}
            <p className="text-[11px] text-gray-400">JPG, PNG, GIF · Max ~2 MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Display name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={profile.username}
            maxLength={50}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-400 focus:border-transparent transition"
          />
          <p className="text-[11px] text-gray-400 mt-1">Shown on the leaderboard. Defaults to your username.</p>
        </div>

        {/* Favorite team */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Favourite team
          </label>
          <select
            value={favoriteTeam}
            onChange={(e) => setFavoriteTeam(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-400 focus:border-transparent transition bg-white"
          >
            <option value="">— None selected —</option>
            {ALL_TEAMS.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Save message */}
        {profileMsg && (
          <p className={`text-sm font-semibold ${profileMsg.ok ? 'text-wc-green-600' : 'text-red-500'}`}>
            {profileMsg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={profileSaving}
          className="btn-primary text-sm disabled:opacity-60"
        >
          {profileSaving ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      {/* ── Account info ── */}
      <div className="card space-y-4">
        <h2 className="font-black text-gray-900 text-lg">Account</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Username</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">{profile.username}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Member since</p>
            <p className="text-sm font-semibold text-gray-900">{memberSince}</p>
          </div>
        </div>
      </div>

      {/* ── Change password ── */}
      <form onSubmit={handlePasswordChange} className="card space-y-4">
        <h2 className="font-black text-gray-900 text-lg">Change password</h2>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Current password
          </label>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-400 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            New password
          </label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-400 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            required
            className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${
              confirmPw && newPw !== confirmPw
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-300 focus:ring-wc-blue-400'
            }`}
          />
          {confirmPw && newPw !== confirmPw && (
            <p className="text-[11px] text-red-500 mt-1">Passwords don&apos;t match</p>
          )}
        </div>

        {pwMsg && (
          <p className={`text-sm font-semibold ${pwMsg.ok ? 'text-wc-green-600' : 'text-red-500'}`}>
            {pwMsg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={pwSaving || (confirmPw.length > 0 && newPw !== confirmPw)}
          className="btn-primary text-sm disabled:opacity-60"
        >
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
