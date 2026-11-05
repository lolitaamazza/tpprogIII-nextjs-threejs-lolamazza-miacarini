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
  const dayNum = Number(label.day.match(/(\d)\//)?.[1] ?? 0); // 'Día 2/3' → 2; en la Cosecha, 0
  return (
    <header className="site-header">
      <Link href="/mapa" className="brand" aria-label="Panem, mapa de distritos">
        <Image src="/assets/brand/panem-seal.png" alt="" width={38} height={38} priority />
        <span>PANEM</span>
      </Link>
      <div className="header-actions">
        {gamesOpen && <Link className="chip" href={PHASE_PATH[run?.phase] || '/cosecha'}>Los Juegos</Link>}
        {/* El sonido, como un ecualizador del visor: las barras se mueven si suena. */}
        <button type="button" className={`chip hud-sound${soundOn ? ' on' : ''}`} onClick={toggleSound} aria-pressed={soundOn} disabled={audioState === 'unsupported'} aria-label={soundOn ? 'Sonido activado' : 'Sonido desactivado'}>
          <span className="hud-eq" aria-hidden="true"><i /><i /><i /><i /></span>{soundOn ? 'Sonido' : 'Silencio'}
        </button>
        {progress.firebaseConfigured && (
          <button type="button" className="chip" onClick={() => setAuthOpen(true)}>
            {user && !user.isAnonymous ? (user.displayName || user.email) : 'Invitado'}
          </button>
        )}
        <button type="button" className="chip chip-accent" onClick={() => setArchiveOpen(true)} aria-label={`Archivo pirata, ${label.day}, fragmentos ${label.fragments}`}>
          {/* El día (tres celdas, una por día) y los fragmentos (trece celdas). */}
          <span className="hud-stat"><small>{dayNum ? 'Día' : label.day}</small>{dayNum > 0 && <span className="hud-cells" aria-hidden="true">{[1, 2, 3].map((d) => <i key={d} className={d <= dayNum ? 'on' : ''} />)}</span>}</span>
          <span className="hud-stat"><small className="chip-long">Fragmentos</small><b>{label.fragments}</b><span className="hud-cells small chip-long" aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <i key={i} className={i < story.fragments.length ? 'on' : ''} />)}</span></span>
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
