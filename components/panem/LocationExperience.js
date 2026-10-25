'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { PiArrowLeft } from 'react-icons/pi';
import { roomItemDefinitions } from '@/lib/locations/interiors';
import { clueById } from '@/lib/clues';
import { LOCATIONS } from '@/lib/locations';
import { spotForKey, visibleSpots } from '@/lib/guidedCamera';
import { districtHud } from '@/lib/districtHud';
import { getDistrict } from '@/data/districts';
import BackLink from './BackLink';
import { DecisionCard, Lives, Score } from './DistrictHud';
import { usePanem } from './PanemProvider';

const FAREWELL_MS = 2600;
const HOLD_HINT_MS = 2600;

// La escena realista de un distrito: tapa el mapa mientras está abierta y monta su propio renderer.
// Los destinos y las salidas siempre tienen botones visibles.
export default function LocationExperience({ id }) {
  const data = LOCATIONS[id];
  const district = getDistrict(id);
  const {
    stageApiRef, reducedMotion, goToMap, story, day, progress, practice, handleFragment, handleClue, handleComplete, decideTesserae, showBulletin, replayDay, sfx,
  } = usePanem();
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const [status, setStatus] = useState({ phase: 'loading', progress: 0 });
  const [zone, setZone] = useState(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [spot, setSpot] = useState(data.start);
  const [heading, setHeading] = useState(null); // a dónde camina la cámara
  const [moved, setMoved] = useState(false); // la pista se va con el primer viaje
  const [fading, setFading] = useState(false);
  const [jobMatch, setJobMatch] = useState(null);
  const [farewell, setFarewell] = useState(null);
  const [hold, setHold] = useState(null); // { id, progress } de lo que se está limpiando
  const [holdHint, setHoldHint] = useState(null); // el aviso de mantener presionado después de un toque corto
  const [pressAt, setPressAt] = useState(null); // dónde se apoyó el dedo: la barra de limpiar va ahí abajo

  // La jornada del día en el frente de carbón: hoy (sin decisión pendiente), o "Jugar de nuevo".
  const lit = progress.litDistricts.includes(id);
  const practicing = practice === id;
  const today = !lit && !story.pending && day?.district === id;
  const jobMode = practicing || today ? 'play' : lit ? 'done' : 'idle';

  // Lo encontrado de la historia (para que la escena lo muestre hecho) y los lugares que se ven con las herramientas de hoy.
  const clues = useMemo(() => [...story.fragments, ...story.tools, ...story.marks, ...story.hints], [story.fragments, story.tools, story.marks, story.hints]);
  const spots = useMemo(() => visibleSpots(zone?.spots ?? data.spots, story.tools), [data.spots, story.tools, zone]);

  // La escena se arma una sola vez: lo que cambia del provider le llega por referencia.
  const handlersRef = useRef({ handleFragment, handleClue, handleComplete, jobMode, clues, tools: story.tools });
  useEffect(() => { handlersRef.current = { handleFragment, handleClue, handleComplete, jobMode, clues, tools: story.tools }; });

  useEffect(() => {
    const stage = stageApiRef.current;
    stage?.setGamesCovered(true);
    return () => stage?.setGamesCovered(false);
  }, [stageApiRef]);

  useEffect(() => {
    let cancelled = false;
    let api = null;
    import('@/components/stage/locations/locationScene').then(({ createLocationScene }) => {
      if (cancelled || !mountRef.current) return;
      try {
        api = createLocationScene(mountRef.current, data, {
          reducedMotion,
          onProgress: (progress) => setStatus((s) => (s.phase === 'loading' ? { ...s, progress } : s)),
          onZone: (next) => { setZone(next); setRoomError(null); setHold(null); },
          onTransition: (phase) => { setRoomLoading(Boolean(phase)); setFading(Boolean(phase)); },
          onRoomError: setRoomError,
          onReady: () => setStatus({ phase: 'ready', progress: 1 }),
          onError: () => setStatus({ phase: 'error', progress: 0 }),
          onWalk: (to) => { setHeading(to); setMoved(true); setHold(null); }, // el avance a medias queda en la escena
          onSpot: (at) => { setSpot(at); setHeading(null); },
          onFragment: (fragmentId) => handlersRef.current.handleFragment(fragmentId),
          jobMode: handlersRef.current.jobMode,
          sfx,
          onJobMatch: setJobMatch,
          onJobComplete: (m) => handlersRef.current.handleComplete(id, { perfect: m.livesLeft === m.lives }),
          tools: handlersRef.current.tools,
          clues: handlersRef.current.clues,
          onClue: (clueId) => handlersRef.current.handleClue(clueId),
          onHoldProgress: (itemId, value) => setHold({ id: itemId, progress: value }),
          onHoldHint: (itemId) => setHoldHint(data.interactables?.find((i) => i.id === itemId)?.prompt ?? null),
        });
        apiRef.current = api;
        // Con ?debug en la URL la escena queda a mano en la consola (como el mapa).
        if (new URLSearchParams(window.location.search).has('debug')) window.__panemLocation = api;
      } catch (error) {
        console.warn('La escena no está disponible:', error);
        setStatus({ phase: 'error', progress: 0 });
      }
    }).catch(() => setStatus({ phase: 'error', progress: 0 }));
    return () => { cancelled = true; api?.dispose(); apiRef.current = null; };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps -- la escena se arma una vez; el movimiento reducido se pasa abajo

  useEffect(() => { apiRef.current?.setReducedMotion(reducedMotion); }, [reducedMotion]);
  // Si quedó pendiente decidir si pide comida, la escena abre frente a la jornada (ahí está la pregunta).
  const pendingHere = story.pending?.district === id;
  useEffect(() => { if (status.phase === 'ready' && pendingHere && data.job) apiRef.current?.goTo(data.job.spot); }, [status.phase, pendingHere, data.job]);
  useEffect(() => { apiRef.current?.setFound(story.fragments); }, [story.fragments, status.phase]);
  useEffect(() => { apiRef.current?.setClues(clues); }, [clues, status.phase]);
  useEffect(() => { apiRef.current?.setTools(story.tools); }, [story.tools, status.phase]);
  useEffect(() => {
    if (!holdHint) return undefined;
    const timer = window.setTimeout(() => setHoldHint(null), HOLD_HINT_MS);
    return () => clearTimeout(timer);
  }, [holdHint]);
  useEffect(() => { if (status.phase === 'ready') apiRef.current?.setJobMode(jobMode); }, [jobMode, status.phase]);

  const atJob = !zone && Boolean(data.job) && spot === data.job.spot && !heading;
  const roomItems = zone ? roomItemDefinitions(data, zone) : [];
  const gameName = { '12': 'Picar carbón', '11': 'Cosechar y silbar', '4': 'Pescar' }[id];
  // La partida vale solo mientras hay jornada (al ganar, el frente queda picado y la partida termina).
  const hud = districtHud({ district, match: jobMode === 'play' ? jobMatch : null, lit: lit && !practicing, story, day, practice: practicing });
  const deciding = atJob && (hud.kind === 'decision' || Boolean(farewell));

  // Decidido si pide comida: una línea con lo que pasa esa noche, la tele del Capitolio y el mapa.
  const decide = (accept) => {
    decideTesserae(accept);
    setFarewell(accept ? `Esta noche comen todos. El nombre de ${hud.who} está ${hud.papers.to} veces en la urna.` : `${hud.refused} Su nombre sigue ${hud.papers.from} veces en la urna.`);
  };
  useEffect(() => {
    if (!farewell) return undefined;
    const timer = window.setTimeout(() => { showBulletin(id); goToMap(); }, FAREWELL_MS);
    return () => clearTimeout(timer);
  }, [farewell, showBulletin, goToMap, id]);

  const pick = () => apiRef.current?.jobAction();
  const retryJob = () => { sfx.play('click'); apiRef.current?.jobRetry(); };
  const jobRef = useRef({ atJob, kind: hud.kind, lost: Boolean(hud.lost), birds: hud.birds });
  useEffect(() => { jobRef.current = { atJob, kind: hud.kind, lost: Boolean(hud.lost), birds: hud.birds }; });

  // Con movimiento reducido no se camina: un fundido corto tapa el salto de cámara.
  const go = (to) => {
    if (!apiRef.current || status.phase !== 'ready') return;
    sfx.play('click');
    apiRef.current.goTo(to);
  };
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; });

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (document.querySelector('.fragment-card')) return;
        if (!apiRef.current?.exitInterior()) goToMap();
        return;
      }
      if (event.target.closest?.('input, textarea, select')) return;
      // La barra espaciadora pica (o reintenta) frente al carbón; sobre un botón queda su propio clic.
      if (event.code === 'Space' && jobRef.current.atJob && jobRef.current.kind === 'play' && !event.target.closest?.('button, a')) {
        event.preventDefault();
        if (jobRef.current.lost) apiRef.current?.jobRetry(); else apiRef.current?.jobAction();
        return;
      }
      // Durante el silbido, frente al campo, los números eligen el sinsajo (como en el diorama), no el lugar.
      if (jobRef.current.atJob && jobRef.current.birds && /^[1-9]$/.test(event.key)) { apiRef.current?.jobInput(Number(event.key) - 1); return; }
      const to = spotForKey(event.key, spots);
      if (to) goRef.current(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToMap, spots]);

  // El fuego cruje de a ratos estando en el lugar del fuego (`crackle`, en el 12 el galpón).
  useEffect(() => {
    if (!data.crackle || spot !== data.crackle || heading) return undefined;
    let timer;
    const crackle = () => { sfx.play('crackle'); timer = window.setTimeout(crackle, 1200 + Math.random() * 2600); };
    timer = window.setTimeout(crackle, 600);
    return () => clearTimeout(timer);
  }, [spot, heading, sfx, data.crackle]);

  const here = spots.find((s) => s.id === (heading ?? spot));
  // La barra de limpiar: se ve mientras hay avance a medias en lo que está en este lugar.
  const holdItem = hold && data.interactables?.find((i) => i.id === hold.id);
  const cleaning = holdItem && holdItem.spot === spot && !heading && hold.progress > 0 && hold.progress < 1;

  return (
    <section className="location" aria-label={`Distrito ${id}`} onPointerDown={(event) => setPressAt([event.clientX, event.clientY])}>
      <div ref={mountRef} className="location-mount" />
      <header className="district-hud-top location-top">
        <div className="district-hud-title">
          {zone || roomLoading ? <button type="button" className="back location-exit" aria-label={zone?.id === 'galpon' ? 'Salir del granero' : 'Salir de la casa'} onClick={() => apiRef.current?.exitInterior()}><PiArrowLeft aria-hidden="true" /> Salir al distrito</button> : <BackLink />}
          <Image src={`/assets/seals/${id}.png`} alt="" width={28} height={28} />
          <h1><span className="sr-only">Distrito </span>{data.title}</h1>
        </div>
      </header>
      {status.phase === 'ready' && (
        <>
          <p className="location-place" aria-live="polite">
            <strong>{zone?.title ?? here?.label}</strong>
            {!moved && <span className="location-intro-hint">Elegí un lugar abajo. Arrastrá para mirar alrededor.</span>}
            {/* El día de este distrito: dónde se juega la jornada y qué pasa al terminarla. */}
            {today && !zone && !moved && data.dayHint && <span className="location-intro-hint">{data.dayHint}</span>}
            {roomError && <span role="alert">{roomError}</span>}
            {atJob && hud.hint && !deciding && <span>{hud.hint}</span>}
            {atJob && practicing && <span>Jugás de nuevo. La historia no cambia y no hay pregunta de comida.</span>}
            {holdHint && !heading && <span>{holdHint}</span>}
          </p>
          {cleaning && (
            <div className="hold-meter" style={pressAt ? { left: pressAt[0], top: pressAt[1] + 40 } : undefined} role="progressbar" aria-label="Limpiando" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hold.progress * 100)}>
              <span style={{ transform: `scaleX(${hold.progress})` }} />
            </div>
          )}
          {atJob && hud.kind === 'play' && jobMode === 'play' && jobMatch && (
            <div className="district-hud-bottom location-hud">
              {hud.score && <Score {...hud.score} />}
              {hud.lives && <Lives {...hud.lives} />}
              {hud.help && <span className="help-note">{hud.help}</span>}
              {hud.birds && (
                <span className="bird-buttons" role="group" aria-label="Sinsajos, de izquierda a derecha">
                  {[0, 1, 2, 3].map((i) => <button key={i} type="button" onClick={() => apiRef.current?.jobInput(i)} aria-label={`Sinsajo ${i + 1}`}>{i + 1}</button>)}
                </span>
              )}
              {hud.lost ? (
                <>
                  <span className="lost" role="status">{hud.lost}</span>
                  <button type="button" className="primary" onClick={retryJob}>Reintentar</button>
                </>
              ) : <button type="button" className="hud-action" onClick={pick}>{hud.action}</button>}
            </div>
          )}
          {atJob && (hud.kind === 'done' || jobMode === 'idle') && !farewell && (
            <div className="district-hud-bottom location-hud"><button type="button" onClick={() => replayDay(id)}>{lit ? 'Jugar de nuevo' : `Practicar: ${gameName}`}</button></div>
          )}
          {atJob && hud.kind === 'decision' && !farewell && <DecisionCard hud={hud} onDecide={decide} />}
          {atJob && farewell && <p className="tesserae-card tesserae-farewell" role="status">{farewell}</p>}
          {zone && !heading && roomItems.some((item) => item.spot === spot) && <aside className="location-discoveries" aria-label="Objetos para investigar">
            <span>En este lugar</span>
            {roomItems.filter((item) => item.spot === spot).map((item) => <button key={item.id} type="button" onClick={() => clues.includes(item.reveals) ? handleClue(item.reveals) : apiRef.current?.interact(item.id)}>
              {clues.includes(item.reveals) ? 'Volver a leer: ' : 'Examinar: '}{item.label ?? clueById(item.reveals)?.title ?? item.id}
            </button>)}
          </aside>}
          {!deciding && <nav className="location-keyboard-nav" aria-label="Lugares del distrito">
            {spots.map((s, i) => (
              <button key={s.id} type="button" aria-current={s.id === spot && !heading ? 'location' : undefined}
                className={s.id === (heading ?? spot) ? 'active' : ''} onClick={() => go(s.id)}>
                <span aria-hidden="true">{i + 1} · </span>{!zone && s.id === data.job?.spot ? `${s.label} · ${gameName}` : s.label}
              </button>
            ))}

          </nav>}
        </>
      )}
      <div className={`location-fade${fading ? ' on' : ''}`} aria-hidden="true" />
      {roomLoading && <p className="location-loading" role="status">Entrando…</p>}
      {status.phase === 'loading' && (
        <p className="location-loading" role="status">Cargando el Distrito {id}… {Math.round(status.progress * 100)} %</p>
      )}
      {status.phase === 'error' && (
        <p className="location-loading" role="alert">La escena no se pudo cargar en este navegador. Podés volver al mapa con la flecha.</p>
      )}
    </section>
  );
}
