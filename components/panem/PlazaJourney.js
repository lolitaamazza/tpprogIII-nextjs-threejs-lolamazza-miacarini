'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { archiveGate } from '@/lib/progress';
import { PLAZA_ORDER, plazaDraws } from '@/lib/plazas';
import { plazaFor } from '@/lib/locations/plaza';
import { PHASE_PATH } from '@/lib/games/simulation';
import { useGames } from '@/components/games/GamesProvider';
import BackLink from './BackLink';
import TrainRide from './TrainRide';
import { usePanem } from './PanemProvider';

// La Cosecha por plazas: el tren pasa por la plaza del 12, la del 11 y la del 4; en cada una se saca un papel de la urna.
// Quién sale lo decide la edición de los Juegos (la urna según los papeles); al terminar se siguen los Juegos.
// La urna de 24 papeles de Lola (`/cosecha`) queda igual: las plazas la completan sin mostrarla.
export default function PlazaJourney() {
  const router = useRouter();
  const games = useGames();
  const { progress, story, storyReady, stageApiRef, reducedMotion, sfx } = usePanem();
  const gate = archiveGate({ ready: progress.ready && storyReady, synced: progress.synced, progress, story });
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState('train'); // 'train' | 'plaza' | 'drawn'
  const [status, setStatus] = useState('loading');
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const district = PLAZA_ORDER[index];
  const draws = plazaDraws(games.run, story.papers);
  const draw = draws[index];

  useEffect(() => { if (gate === 'blocked') router.replace('/mapa'); }, [gate, router]);
  // Sin edición todavía, se abre una al llegar: ahí la urna decide quién va (recargar no lo cambia).
  useEffect(() => { if (gate === 'allowed' && games.ready && !games.run) games.start(); }, [gate, games.ready, games.run]); // eslint-disable-line react-hooks/exhaustive-deps -- `start` cambia en cada render
  useEffect(() => {
    const stageApi = stageApiRef.current;
    stageApi?.setGamesCovered(true);
    return () => stageApi?.setGamesCovered(false);
  }, [stageApiRef]);

  // La plaza se arma al bajar del tren y se libera al volver a subir.
  useEffect(() => {
    if (stage === 'train') return undefined;
    let cancelled = false;
    let api = null;
    import('@/components/stage/locations/locationScene').then(({ createLocationScene }) => {
      if (cancelled || !mountRef.current) return;
      try {
        api = createLocationScene(mountRef.current, plazaFor(district), {
          reducedMotion, sfx, jobMode: 'play',
          onReady: () => setStatus('ready'),
          onError: () => setStatus('ready'),
          onJobComplete: () => setStage('drawn'),
        });
        apiRef.current = api;
      } catch { setStatus('ready'); }
    }).catch(() => setStatus('ready'));
    return () => { cancelled = true; api?.dispose(); apiRef.current = null; };
  }, [stage === 'train', district]); // eslint-disable-line react-hooks/exhaustive-deps -- se arma una vez por plaza

  useEffect(() => { if (stage === 'drawn' && draw?.protagonist) sfx.play('cannon'); }, [stage, draw?.protagonist, sfx]);

  const next = () => {
    sfx.play('click');
    if (index < PLAZA_ORDER.length - 1) { setIndex(index + 1); setStage('train'); setStatus('loading'); return; }
    // Terminadas las tres plazas: la urna de la edición queda completa y se siguen los Juegos.
    const run = games.run?.phase === 'reaping' ? games.skipReaping() : games.run;
    router.push(PHASE_PATH[run?.phase] ?? '/cosecha');
  };
  const pull = () => { if (!apiRef.current?.jobAction()) setStage('drawn'); };

  if (gate !== 'allowed' || !draw) return <section className="location"><p className="location-loading" role="status">Preparando la Cosecha…</p></section>;
  if (stage === 'train') {
    return <TrainRide key={`tren-${index}`} label={`En tren a la plaza del Distrito ${district}`} reducedMotion={reducedMotion} sfx={sfx} onArrive={() => setStage('plaza')} />;
  }
  const last = index === PLAZA_ORDER.length - 1;
  return (
    <section className="location plaza" aria-label={`La plaza del Distrito ${district}`}>
      <div ref={mountRef} className="location-mount" />
      <header className="district-hud-top location-top"><div className="district-hud-title"><BackLink /><h1>La Cosecha · Distrito {district}</h1></div></header>
      {status === 'loading' && <p className="location-loading" role="status">Llegando a la plaza…</p>}
      {status === 'ready' && stage === 'plaza' && (
        <div className="tesserae-card plaza-card">
          <p>Hoy se saca un nombre de la urna del Distrito {district}.</p>
          <button type="button" className="primary" onClick={pull}>Sacar el papel</button>
        </div>
      )}
      {stage === 'drawn' && (
        <div className="tesserae-card plaza-card" role="status">
          <p>Del Distrito {district} sale</p>
          <p className="plaza-name">{draw.name}</p>
          <p className="plaza-line">{draw.line}</p>
          <button type="button" className="primary" onClick={next}>{last ? 'Ir a los Juegos' : `En tren al Distrito ${PLAZA_ORDER[index + 1]}`}</button>
        </div>
      )}
    </section>
  );
}
