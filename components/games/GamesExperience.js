'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePanem } from '@/components/panem/PanemProvider';
import { capitolGate } from '@/lib/progress';
import { PHASE_PATH, TRAINING } from '@/lib/games/simulation';
import { useGames } from './GamesProvider';
import { encounterFor } from '@/lib/games/encounters';
import { statusLine } from '@/lib/games/hud';
import ReapingDraw from './ReapingDraw';
import ArchiveIntercept from './ArchiveIntercept';
import ArchiveBar from './ArchiveBar';
import ArenaHud from './ArenaHud';
import TributeModal from './TributeModal';
import { autoAdvance, gamesView } from '@/lib/games/view';
import './games.css';
import BackLink from '@/components/panem/BackLink';

const TITLES = { reaping: 'La Cosecha', preparation: 'El Capitolio', arena: 'La arena', ended: 'Una sola voz' };
const CHAPTERS = ['reaping', 'preparation', 'arena', 'ended'];
const STAT = { strength: 'fuerza', stealth: 'sigilo', survival: 'supervivencia', empathy: 'empatía', agility: 'agilidad' };

// El archivo de los Juegos, interceptado. El 3D ocupa la pantalla: arriba a la izquierda el estado, arriba a la
// derecha los íconos (lo demás está en cajones) y abajo solo lo que hay que decidir.
export default function GamesExperience({ chapter: requestedChapter }) {
  const games = useGames();
  const { progress, sfx, startAudio, webglFailed, stageApiRef, reducedMotion } = usePanem();
  const { run } = games;
  const router = useRouter();
  const restartRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [inspecting, setInspecting] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [view, setView] = useState('follow');
  const [choices, setChoices] = useState({ '12': 'endurance', '11': 'plants', '4': 'fishing' });
  const [confirmNew, setConfirmNew] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [arenaStatus, setArenaStatus] = useState(null);
  const gate = capitolGate({ ready: progress.ready, synced: progress.synced, progress });
  const { chapter, canShow, redirect } = gamesView({ chapter: requestedChapter, run, ready: games.ready, gate });
  const turn = run?.turn ?? 0;
  const arena = chapter === 'arena' || chapter === 'ended';

  useEffect(() => { if (redirect) router.replace(redirect); }, [redirect, router]);

  useEffect(()=>{
    const stage=stageApiRef.current;
    stage?.setGamesCovered(canShow && chapter==='reaping' && !run?.reapingComplete);
    return()=>stage?.setGamesCovered(false);
  },[canShow,chapter,run?.reapingComplete,stageApiRef]);

  useEffect(() => {
    const stage = stageApiRef.current;
    stage?.setGamesPaused(paused || !!inspecting);
    return () => stage?.setGamesPaused(false);
  }, [paused, inspecting, stageApiRef]);

  useEffect(() => { stageApiRef.current?.setGamesQuality(quality); }, [quality, stageApiRef]);
  // La mesa solo existe en la arena y el desenlace; en el resto la escena se ve de cerca.
  useEffect(() => { stageApiRef.current?.setGamesView(arena ? view : 'follow'); }, [arena, view, stageApiRef]);

  useEffect(() => {
    const update = (event) => setArenaStatus(event.detail);
    window.addEventListener('panem-arena-status', update);
    const timer = setTimeout(() => setArenaStatus(stageApiRef.current?.getGamesAssetStatus?.()), 0);
    return () => { clearTimeout(timer); window.removeEventListener('panem-arena-status', update); };
  }, [chapter, stageApiRef]);

  // Tocar a alguien en 3D abre su ficha (si ya hay una abierta, no se apila otra).
  useEffect(() => {
    const pick = (event) => setInspecting((current) => current ?? event.detail);
    window.addEventListener('panem-pick-tribute', pick);
    return () => window.removeEventListener('panem-pick-tribute', pick);
  }, []);

  // Esc saltea la presentación de la cámara (los cajones y las fichas se cierran solos con Esc).
  useEffect(() => {
    const key = (event) => {
      if (event.key !== 'Escape' || inspecting || drawer) return;
      stageApiRef.current?.skipGamesIntro();
      setPaused(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [stageApiRef, inspecting, drawer]);

  useEffect(() => { if (confirmNew) restartRef.current?.focus(); }, [confirmNew]);

  function newRun() { const next = games.start(); if (next) { setConfirmNew(false); router.push('/cosecha'); } }
  function select(id) { setInspecting(null); const next = games.select(id); if (next) { sfx.play('reaping'); router.push(PHASE_PATH[next.phase]); } }
  function prepare() { const next = games.prepare(choices); if (next) { sfx.play('fanfare'); router.push(PHASE_PATH[next.phase]); } }
  function advance(decision = 'shelter') {
    const next = games.advance(decision);
    if (!next || next === run) return;
    sfx.play(next.events.some((e) => e.turn === next.turn && e.type === 'elimination') ? 'cannon' : 'whoosh');
    if (next.phase === 'ended') router.push('/desenlace');
  }
  const inspect = useCallback((id) => { setInspecting(id); stageApiRef.current?.focusGamesTribute(id); }, [stageApiRef]);

  // Los turnos sin pregunta avanzan solos después de unos segundos; pausar la escena (o abrir una ficha) los frena.
  const advanceRef = useRef(advance);
  useEffect(() => { advanceRef.current = advance; });
  const encounter = encounterFor(run);
  const holdAuto = !canShow || chapter !== 'arena' || paused || !!inspecting || !!games.conflict || games.status === 'saving';
  const autoDelay = autoAdvance({ run, encounter, paused: holdAuto });
  const [autoLeft, setAutoLeft] = useState(null);
  useEffect(() => {
    if (autoDelay === null) return undefined;
    const until = performance.now() + autoDelay * 1000;
    const timer = setInterval(() => {
      const left = (until - performance.now()) / 1000;
      if (left <= 0) { clearInterval(timer); advanceRef.current(); } else setAutoLeft({ turn, left: Math.ceil(left) });
    }, 250);
    return () => clearInterval(timer);
  }, [autoDelay, turn, run?.id]);
  const encounterId = encounter?.id;
  const decide = useCallback((optionId) => advanceRef.current({ encounterId, optionId }), [encounterId]);

  if (gate === 'blocked') return <section className="panel"><p className="eyebrow">ARCHIVO CLASIFICADO</p><h1>Tres señales para entrar.</h1><p>Completá Carbón, Agricultura y Pesca para intervenir la transmisión del Capitolio.</p><Link className="primary" href="/mapa">Volver a los distritos</Link></section>;
  if (!canShow) return <section className="panel" aria-busy="true"><p>Recuperando el archivo…</p><p className="hint">La partida guardada se conserva.</p><button onClick={() => window.location.reload()}>Reintentar carga</button><BackLink /></section>;

  const selected = run?.tributes.find((t) => t.id === run.selectedId);
  const winner = run?.tributes.find((t) => t.id === run.winnerId);
  const inspected = run?.tributes.find((t) => t.id === inspecting);
  const disabled = paused || !!games.conflict || games.status === 'saving';
  const status = run && chapter === 'arena' ? statusLine(run) : null;

  if(chapter==='reaping' && run && !run.reapingComplete)return <ReapingDraw key={run.id} run={run} onDraw={games.draw} onContinue={games.revealStage} disabled={disabled}/>;

  return (
    <div className={`games-experience games-${chapter}`}>
      <ArchiveIntercept />
      <div className="games-vignette" aria-hidden="true" />
      <header className="games-top">
        {status ? (
          <p className="games-status"><span className="live">● En vivo · {status.label}</span> <span>{status.alive} en pie</span></p>
        ) : (
          <>
            <p className="games-step">0{CHAPTERS.indexOf(chapter) + 1} / 04</p>
            <h1 className="games-title">{TITLES[chapter]}</h1>
          </>
        )}
        <p className="pirate-tag"><span aria-hidden="true">●</span> Señal pirata · FREQ 13</p>
        {chapter === 'reaping' && run && <p className="games-hint">Tocá un tributo en el escenario para conocerlo, <button type="button" className="link" onClick={() => setDrawer('tributes')}>o elegí de la lista</button>.</p>}
        {webglFailed && <p className="games-hint">Vista 3D no disponible: elegí y seguí desde los íconos de arriba.</p>}
        {arena && arenaStatus === 'loading' && <p className="games-hint" role="status">Cargando el bosque y la Cornucopia…</p>}
        {arena && arenaStatus === 'error' && <p className="games-hint" role="alert">No se pudo cargar la arena. <button type="button" className="link" onClick={() => window.location.reload()}>Reintentar</button></p>}
      </header>

      <ArchiveBar chapter={chapter} run={run} view={view} onView={setView} paused={paused} onPause={() => setPaused((v) => !v)}
        drawer={drawer} onDrawer={setDrawer} onInspect={inspect} games={games} quality={quality} onQuality={setQuality} />

      {chapter === 'reaping' && !run && (
        <section className="games-card">
          <h2>Entramos.</h2>
          <p>Así guarda el Capitolio cada edición de los Juegos. Reconstruí una y acompañá a un tributo: esta vez, la crónica es nuestra.</p>
          <button type="button" className="primary" onClick={() => { startAudio(); newRun(); }} disabled={disabled}>Abrir una edición</button>
        </section>
      )}

      {chapter === 'preparation' && selected && (
        <section className="games-card games-prep" aria-label={`Preparar a ${selected.name}`}>
          <h2>Prepará a {selected.name}.</h2>
          {TRAINING.map((training) => (
            <div key={training.district} className="prep-row" role="radiogroup" aria-label={training.label}>
              <span>{training.label}</span>
              {training.options.map((option) => (
                <button key={option.id} type="button" role="radio" aria-checked={choices[training.district] === option.id} disabled={disabled}
                  onClick={() => setChoices((old) => ({ ...old, [training.district]: option.id }))}>
                  {option.label}<small>+8 {STAT[option.stat]}</small>
                </button>
              ))}
            </div>
          ))}
          <button type="button" className="primary" disabled={disabled} onClick={prepare}>Entrar a la arena</button>
        </section>
      )}

      {chapter === 'arena' && run && (
        <ArenaHud run={run} encounter={encounter} onDecide={decide} onAdvance={() => advance()} disabled={disabled}
          autoDelay={autoDelay} autoLeft={autoLeft?.turn === turn ? autoLeft.left : null} />
      )}

      {chapter === 'ended' && winner && (
        <section className="games-winner">
          <p className="winner-kicker">Sobreviviente · Distrito {winner.district}</p>
          <h2 className="winner-name">{winner.name}</h2>
          <p>{winner.id === selected?.id ? 'Tu tributo sobrevivió. Su historia ya no le pertenece al Capitolio.' : `${selected?.name} forma parte de la memoria de esta edición.`}</p>
          <div className="winner-actions">
            <Link className="primary" href="/capitolio">Transmitir el mensaje final</Link>
            <button type="button" disabled={disabled} onClick={() => setConfirmNew(true)}>Volver a jugar</button>
          </div>
          {confirmNew && <section ref={restartRef} tabIndex={-1} className="restart-confirm" aria-label="Reiniciar los Juegos"><p>¿Abrir una nueva edición? Los emblemas se conservan.</p><button type="button" onClick={games.exportRun}>Descargar esta partida</button><button type="button" className="primary" onClick={newRun} disabled={disabled}>Crear nueva edición</button><button type="button" onClick={() => setConfirmNew(false)}>Cancelar</button></section>}
        </section>
      )}

      {inspected && <TributeModal key={inspected.id} tribute={inspected} canSelect={chapter === 'reaping'} disabled={disabled} onSelect={select} onClose={() => setInspecting(null)} reducedMotion={reducedMotion} />}
    </div>
  );
}
