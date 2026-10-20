'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { usePanem } from '@/components/panem/PanemProvider';
import { capitolGate } from '@/lib/progress';
import { PHASE_PATH, STRATEGIES, TRAINING, ZONES } from '@/lib/games/simulation';
import { useGames } from './GamesProvider';
import './games.css';

const TITLES = { reaping: 'La Cosecha', preparation: 'El Capitolio', arena: 'La arena', ended: 'Una sola voz' };
const CHAPTERS = ['reaping', 'preparation', 'arena', 'ended'];
const STATUS = { local: 'Copia local', cloud: 'Copia de nube actualizada', saving: 'Guardando en nube…', conflict: 'Hay dos versiones' };

export default function GamesExperience({ chapter }) {
  const games = useGames();
  const { progress, reducedMotion, sfx, startAudio, webglFailed, stageApiRef } = usePanem();
  const { run } = games;
  const router = useRouter();
  const root = useRef(null);
  const timeline = useRef(null);
  const [paused, setPaused] = useState(false);
  const [cinemaDone, setCinemaDone] = useState(false);
  const [strategy, setStrategy] = useState('shelter');
  const [choices, setChoices] = useState({ '12': 'endurance', '11': 'plants', '4': 'fishing' });
  const [confirmNew, setConfirmNew] = useState(false);
  const [quality, setQuality] = useState('auto');
  const gate = capitolGate({ ready: progress.ready, synced: progress.synced, progress });
  const expected = run ? PHASE_PATH[run.phase] : '/cosecha';
  const canShow = gate === 'allowed' && games.ready && (!run ? chapter === 'reaping' : chapter === run.phase);
  const turn = run?.turn ?? 0;

  useEffect(() => {
    if (gate === 'allowed' && games.ready && ((!run && chapter !== 'reaping') || (run && run.phase !== chapter))) router.replace(expected);
  }, [gate, games.ready, run, chapter, expected, router]);

  useEffect(() => {
    if (!canShow) return;
    const scope = gsap.context(() => {
      timeline.current = gsap.timeline({ onComplete: () => setCinemaDone(true) });
      timeline.current.from('.games-heading', { opacity: 0, y: reducedMotion ? 0 : 18, duration: reducedMotion ? 0 : 0.7 })
        .from('.tribute-card', { opacity: 0, y: reducedMotion ? 0 : 12, stagger: reducedMotion ? 0 : 0.025, duration: reducedMotion ? 0 : 0.5 }, 0.2);
    }, root);
    return () => { scope.revert(); timeline.current = null; };
  }, [canShow, reducedMotion, chapter]);

  useEffect(() => {
    const stage = stageApiRef.current;
    stage?.setGamesPaused(paused);
    if (paused) timeline.current?.pause(); else timeline.current?.resume();
    return () => stage?.setGamesPaused(false);
  }, [paused, stageApiRef]);

  useEffect(() => {
    stageApiRef.current?.setGamesQuality(quality);
  }, [quality, stageApiRef]);

  function skipCinema() {
    timeline.current?.progress(1).pause();
    stageApiRef.current?.skipGamesIntro();
    setCinemaDone(true);
    setPaused(false);
  }
  useEffect(() => {
    const key = (event) => { if (event.key === 'Escape') { timeline.current?.progress(1).pause(); stageApiRef.current?.skipGamesIntro(); setCinemaDone(true); setPaused(false); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [stageApiRef]);

  function newRun() { const next = games.start(); if (next) { setConfirmNew(false); router.push('/cosecha'); } }
  function select(id) { const next = games.select(id); if (next) { sfx.play('reaping'); router.push(PHASE_PATH[next.phase]); } }
  function prepare() { const next = games.prepare(choices); if (next) { sfx.play('fanfare'); router.push(PHASE_PATH[next.phase]); } }
  function advance() {
    const next = games.advance(strategy);
    if (!next || next === run) return;
    sfx.play(next.events.some((e) => e.turn === next.turn && e.type === 'elimination') ? 'cannon' : 'whoosh');
    if (next.phase === 'ended') router.push('/desenlace');
  }

  if (gate === 'blocked') return <section className="panel"><p className="eyebrow">ARCHIVO CLASIFICADO</p><h1>Tres señales para entrar.</h1><p>Completá Carbón, Agricultura y Pesca para intervenir la transmisión del Capitolio.</p><Link className="primary" href="/mapa">Volver a los distritos</Link></section>;
  if (!canShow) return <section className="panel" aria-busy="true"><p>Recuperando el archivo…</p></section>;

  const selected = run?.tributes.find((t) => t.id === run.selectedId);
  const winner = run?.tributes.find((t) => t.id === run.winnerId);
  const alive = run?.tributes.filter((t) => t.alive).length ?? 24;
  const currentEvents = run?.events.filter((e) => e.turn === turn) ?? [];
  const fallen = run?.tributes.filter((t) => !t.alive && t.eliminatedTurn === turn) ?? [];
  const disabled = paused || !!games.conflict || games.status === 'saving';

  return (
    <div className={`games-experience games-${chapter}`} ref={root}>
      <div className="games-vignette" aria-hidden="true" />
      <section className="games-heading">
        <p className="eyebrow">ARCHIVO INTERVENIDO / EDICIÓN ALTERNATIVA</p>
        <h1>{TITLES[chapter]}<span aria-hidden="true">.</span></h1>
        <nav aria-label="Capítulos del archivo"><ol className="games-chapters">{CHAPTERS.map((key, i) => <li key={key} aria-current={chapter === key ? 'step' : undefined}><span>0{i + 1}</span> {TITLES[key]}</li>)}</ol></nav>
        {chapter === 'arena' && <p className="arena-counter"><b>{String(alive).padStart(2, '0')}</b> / 24 EN PIE <span>{turn === 0 ? 'APERTURA' : `JORNADA ${Math.ceil(turn / 2)} · ${turn % 2 ? 'DÍA' : 'NOCHE'}`}</span></p>}
        <div className="cinema-controls">
          <button className="chip" onClick={() => setPaused((v) => !v)} aria-pressed={paused}>{paused ? 'Reanudar' : 'Pausar escena'}</button>
          {!cinemaDone && <button className="chip" onClick={skipCinema}>Saltar presentación</button>}
          <label>Detalle <select value={quality} onChange={(e) => setQuality(e.target.value)} aria-label="Calidad visual"><option value="auto">Automático</option><option value="low">Ligero</option><option value="high">Alto</option></select></label>
        </div>
        {webglFailed && <p className="hint">Vista 3D no disponible. Podés jugar con las fichas y controles.</p>}
      </section>

      <aside className="games-console" aria-label="Controles de la mentora">
        <p className="eyebrow">{chapter === 'arena' ? 'TU CANAL PRIVADO' : 'SEÑAL DEL CAPITOLIO'}</p>
        {!run && <><h2>El archivo está abierto.</h2><p>La chispa llegó al Capitolio. Reconstruí una edición de los Juegos y acompañá a un tributo desde la Cosecha.</p><p>Los nombres y los resultados pertenecen a esta simulación. Cada edición tiene un destino diferente.</p><button className="primary" onClick={() => { startAudio(); newRun(); }} disabled={disabled}>Abrir una edición</button></>}
        {chapter === 'reaping' && run && <><h2>Veinticuatro nombres.</h2><p>Dos por distrito. Elegí a quién vas a acompañar como mentora. Podés consultar sus atributos antes de decidir.</p><p className="hint">La Cosecha ya está registrada. Saltar la presentación no cambia los tributos.</p></>}
        {chapter === 'preparation' && selected && <><h2>Prepará a {selected.name}.</h2><p>Los tres emblemas te permiten transmitir conocimientos desde los distritos. Elegí una especialidad por emblema.</p>{TRAINING.map((training) => <fieldset key={training.district}><legend>{training.label}</legend>{training.options.map((option) => <label className="training-choice" key={option.id}><input type="radio" name={`training-${training.district}`} value={option.id} checked={choices[training.district] === option.id} disabled={disabled} onChange={() => setChoices((old) => ({ ...old, [training.district]: option.id }))} /><span>{option.label}<small>+8 {({ strength: 'fuerza', stealth: 'sigilo', survival: 'supervivencia', empathy: 'empatía', agility: 'agilidad' })[option.stat]}</small></span></label>)}</fieldset>)}<button className="primary" disabled={disabled} onClick={prepare}>Entrar a la arena</button></>}
        {chapter === 'arena' && selected && <>
          <h2>{selected.name} <small>D{selected.district}</small></h2>
          <p>{selected.alive ? `${ZONES[selected.zone]} · ${selected.allyId ? `Alianza con ${run.tributes.find((t) => t.id === selected.allyId)?.name}` : 'Sin alianza'}` : 'Tu tributo cayó. Podés seguir la transmisión hasta el desenlace.'}</p>
          <div className="tribute-vitals">{[['Salud', selected.health], ['Energía', selected.energy]].map(([label, value]) => <label key={label}>{label}<b>{value}/100</b><meter min="0" max="100" value={value}>{value}</meter></label>)}</div>
          <p className="hint">Comida {selected.food} · Agua {selected.water} · Hambre {selected.hunger}/100 · Sed {selected.thirst}/100</p>
          {selected.alive && <fieldset><legend>Decisión para el próximo turno</legend>{Object.entries(STRATEGIES).map(([id, item]) => <label className="training-choice" key={id}><input type="radio" name="strategy" checked={strategy === id} disabled={disabled} onChange={() => setStrategy(id)} /><span>{item.label}<small>{item.description}</small></span></label>)}</fieldset>}
          <button className="primary" onClick={advance} disabled={disabled}>{paused ? 'Escena en pausa' : 'Avanzar turno'}</button>
          <p className="hint">La simulación solo avanza cuando lo decidís. Cierre máximo: 12 jornadas.</p>
        </>}
        {chapter === 'ended' && winner && <><p className="winner-kicker">SOBREVIVIENTE · DISTRITO {winner.district}</p><h2 className="winner-name">{winner.name}</h2><p>{winner.id === selected?.id ? 'Tu tributo sobrevivió. Su historia ya no le pertenece al Capitolio.' : `${selected?.name} forma parte de la memoria de esta edición. La historia sigue en quienes la cuentan.`}</p><p>{run.turn} turnos · 23 nombres para recordar.</p><Link className="primary" href="/capitolio">Transmitir el mensaje final</Link><button onClick={() => setConfirmNew(true)}>Abrir otra edición</button></>}
        <div className="games-save">
          <p role="status">{STATUS[games.status]}{games.error ? ` · ${games.error}` : ''}</p>
          {games.conflict && <div className="save-conflict" role="alert"><p>Las partidas son diferentes. Elegí una copia completa; sus eventos no se mezclan.</p><p>Actual: turno {run?.turn ?? 0}. Entrante: turno {games.conflict.turn}.</p><button onClick={() => games.resolveConflict(false)}>Conservar actual</button><button onClick={() => games.resolveConflict(true)}>Usar copia entrante</button></div>}
          {run && <div className="save-actions"><button className="chip" onClick={games.exportRun}>Descargar partida</button>{games.uid && <button className="chip" disabled={disabled} onClick={games.saveCloud}>Guardar en nube</button>}</div>}
          <label className="import-run">Importar partida <input type="file" accept="application/json,.json" disabled={disabled} onChange={(e) => { games.importRun(e.target.files?.[0]); e.target.value = ''; }} /></label>
          {confirmNew && <div role="alert"><p>La nueva edición reemplaza la copia activa local. Descargá la actual si querés conservarla.</p><button onClick={newRun} disabled={disabled}>Crear nueva edición</button><button onClick={() => setConfirmNew(false)}>Cancelar</button></div>}
          <Link className="back" href="/mapa">← Volver al mapa</Link>
        </div>
      </aside>

      {run && <section className="games-roster" aria-label={chapter === 'reaping' ? 'Seleccionar tributo' : 'Estado de los tributos'}>
        <div className="roster-label"><p className="eyebrow">{chapter === 'reaping' ? 'LOS NOMBRES DE LA COSECHA' : 'REGISTRO DE TRIBUTOS'}</p><span>{alive} en pie</span></div>
        <div className="tribute-grid">{run.tributes.map((t) => <button key={t.id} className={`tribute-card${t.alive ? '' : ' fallen'}${t.id === run.selectedId ? ' selected' : ''}`} disabled={chapter !== 'reaping' || disabled} onClick={() => select(t.id)} aria-label={`${t.name}, Distrito ${t.district}. Fuerza ${t.strength}, supervivencia ${t.survival}, agilidad ${t.agility}, sigilo ${t.stealth}, empatía ${t.empathy}. ${t.alive ? 'En pie' : 'Caído'}`}><span className="tribute-number">{String(t.district).padStart(2, '0')}</span><span className="tribute-name">{t.name}<small>{t.alive ? (t.id === run.selectedId ? 'TU TRIBUTO' : 'EN PIE') : `CAÍDO · T${t.eliminatedTurn}`}</small></span>{chapter === 'reaping' && <span className="tribute-stats">F {t.strength} · S {t.survival}<br />A {t.agility} · Si {t.stealth} · E {t.empathy}</span>}</button>)}</div>
      </section>}
      {(chapter === 'arena' || chapter === 'ended') && run && <section className="games-journal" aria-label="Crónica de la arena"><details open><summary>Crónica · turno {turn}</summary><div className="journal-events" aria-live="polite" aria-atomic="true"><p className="sr-only">{alive} tributos en pie. {fallen.length} caídos este turno.</p>{currentEvents.map((event, i) => <p className={`event-${event.type}`} key={`${turn}-${i}`}>{event.text}</p>)}</div></details>{fallen.length > 0 && <details><summary>En memoria · {fallen.length} caídos</summary><ul>{fallen.map((t) => <li key={t.id}>{t.name} · Distrito {t.district}</li>)}</ul></details>}<details><summary>Archivo completo · {run.events.length} eventos</summary><ol>{run.events.map((event, i) => <li key={i}><small>T{event.turn}</small> {event.text}</li>)}</ol></details></section>}
    </div>
  );
}
