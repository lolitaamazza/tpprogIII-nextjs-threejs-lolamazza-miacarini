'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthPanel from '@/components/AuthPanel';
import PirateArchive from './PirateArchive';
import { usePanem } from './PanemProvider';
import { useGames } from '@/components/games/GamesProvider';
import { PHASE_PATH } from '@/lib/games/simulation';
import { archiveGate } from '@/lib/progress';
import { archiveLabel } from '@/lib/mapCopy';

export default function SiteHeader() {
  const { route, progress, story, storyReady, day, phase, audioState, toggleSound } = usePanem();
  const {run} = useGames();
  const [authOpen, setAuthOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  if (route.scene === 'intro') return null;
  const soundOn = audioState === 'on';
  const user = progress.authUser;
  const gamesOpen = archiveGate({ ready: progress.ready && storyReady, synced: progress.synced, progress, story }) === 'allowed';
  const label = archiveLabel({ phase, day, pending: story.pending, found: story.fragments.length });
  return (
    <header className="site-header">
      <Link href="/mapa" className="brand" aria-label="Panem, mapa de distritos">
        <Image src="/assets/brand/panem-seal.png" alt="" width={38} height={38} priority />
        <span>PANEM</span>
      </Link>
      <div className="header-actions">
        {gamesOpen && <Link className="chip" href={PHASE_PATH[run?.phase] || '/cosecha'}>Los Juegos</Link>}
        <button type="button" className="chip" onClick={toggleSound} aria-pressed={soundOn} disabled={audioState === 'unsupported'}>
          {soundOn ? '♪ Sonido' : '♪ Silencio'}<span className="sr-only">{soundOn ? ': activado' : ': desactivado'}</span>
        </button>
        {progress.firebaseConfigured && (
          <button type="button" className="chip" onClick={() => setAuthOpen(true)}>
            {user && !user.isAnonymous ? (user.displayName || user.email) : 'Invitado'}
          </button>
        )}
        <button type="button" className="chip chip-accent" onClick={() => setArchiveOpen(true)} aria-label={`Archivo pirata, ${label.day}, fragmentos ${label.fragments}`}>
          {label.day} · <span className="chip-long">Fragmentos </span><b>{label.fragments}</b>
        </button>
      </div>
      {authOpen && (
        <AuthPanel
          user={user} authError={progress.authError} authLoading={progress.authLoading}
          onClose={() => setAuthOpen(false)} onGoogle={progress.signInWithGoogle}
          onSubmitEmail={progress.submitEmail} onContinueAsGuest={progress.continueAsGuest}
        />
      )}
      {archiveOpen && <PirateArchive onClose={() => setArchiveOpen(false)} />}
    </header>
  );
}
