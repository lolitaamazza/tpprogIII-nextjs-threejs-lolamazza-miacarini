'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthPanel from '@/components/AuthPanel';
import EmblemsDialog from './EmblemsDialog';
import { usePanem } from './PanemProvider';
import { useGames } from '@/components/games/GamesProvider';
import { PHASE_PATH } from '@/lib/games/simulation';

const SYNC_LABEL = { cloud: '● NUBE', connecting: '◌ CONECTANDO', local: '○ LOCAL' };

export default function SiteHeader() {
  const { route, progress, audioState, toggleSound } = usePanem();
  const {run} = useGames();
  const [authOpen, setAuthOpen] = useState(false);
  const [emblemsOpen, setEmblemsOpen] = useState(false);
  if (route.scene === 'intro') return null;
  const soundOn = audioState === 'on';
  const user = progress.authUser;
  return (
    <header className="site-header">
      <Link href="/mapa" className="brand" aria-label="Panem, mapa de distritos">
        <Image src="/assets/brand/panem-seal.png" alt="" width={38} height={38} priority />
        <span>PANEM</span>
      </Link>
      <div className="header-actions">
        {progress.litDistricts.length === 3 && <><Link className="chip" href="/rebelion">La historia</Link><Link className="chip" href={PHASE_PATH[run?.phase] || '/cosecha'}>Los Juegos</Link></>}
        <span className="sync" title={progress.syncState === 'cloud' ? 'Progreso guardado en Firestore' : 'Progreso guardado en este navegador'}>
          {SYNC_LABEL[progress.syncState] ?? SYNC_LABEL.local}
        </span>
        <button type="button" className="chip" onClick={toggleSound} aria-pressed={soundOn} disabled={audioState === 'unsupported'}>
          {soundOn ? '♪ Sonido' : '♪ Silencio'}<span className="sr-only">{soundOn ? ': activado' : ': desactivado'}</span>
        </button>
        {progress.firebaseConfigured && (
          <button type="button" className="chip" onClick={() => setAuthOpen(true)}>
            {user && !user.isAnonymous ? (user.displayName || user.email) : 'Invitado'}
          </button>
        )}
        <button type="button" className="chip chip-accent" onClick={() => setEmblemsOpen(true)}>
          Emblemas <b>{progress.litDistricts.length}/3</b>
        </button>
      </div>
      {authOpen && (
        <AuthPanel
          user={user} authError={progress.authError} authLoading={progress.authLoading}
          onClose={() => setAuthOpen(false)} onGoogle={progress.signInWithGoogle}
          onSubmitEmail={progress.submitEmail} onContinueAsGuest={progress.continueAsGuest}
        />
      )}
      {emblemsOpen && <EmblemsDialog onClose={() => setEmblemsOpen(false)} />}
    </header>
  );
}
