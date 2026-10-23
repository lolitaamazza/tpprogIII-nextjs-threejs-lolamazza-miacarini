'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { LOCATIONS } from '@/lib/locations';
import { spotForKey } from '@/lib/guidedCamera';
import { districtHud } from '@/lib/districtHud';
import { getDistrict } from '@/data/districts';
import BackLink from './BackLink';
import { DecisionCard, Lives, Score } from './DistrictHud';
import { usePanem } from './PanemProvider';

const FADE_MS = 400;
const FAREWELL_MS = 2600;

// La escena realista de un distrito: tapa el mapa mientras está abierta y monta su propio renderer.
// Abajo, los lugares (lo mismo que tocar en la escena); 1 a 5 con el teclado, Esc vuelve al mapa.
export default function LocationExperience({ id }) {
  const data = LOCATIONS[id];
  const district = getDistrict(id);
  const {
    stageApiRef, reducedMotion, goToMap, story, day, progress, practice, handleFragment, handleComplete, decideTesserae, showBulletin, replayDay, sfx,
  } = usePanem();
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const [status, setStatus] = useState({ phase: 'loading', progress: 0 });
  const [spot, setSpot] = useState(data.start);
  const [heading, setHeading] = useState(null); // a dónde camina la cámara
  const [moved, setMoved] = useState(false); // la pista se va con el primer viaje
  const [fading, setFading] = useState(false);
  const [seamMatch, setSeamMatch] = useState(null);
  const [farewell, setFarewell] = useState(null);

  // La jornada del día en el frente de carbón: hoy (sin decisión pendiente), o "Jugar de nuevo".
  const lit = progress.litDistricts.includes(id);
  const practicing = practice === id;
  const today = !lit && !story.pending && day?.district === id;
  const seamMode = practicing || today ? 'play' : lit ? 'done' : 'idle';

  // La escena se arma una sola vez: lo que cambia del provider le llega por referencia.
  const handlersRef = useRef({ handleFragment, handleComplete, seamMode });
  useEffect(() => { handlersRef.current = { handleFragment, handleComplete, seamMode }; });

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
          onReady: () => setStatus({ phase: 'ready', progress: 1 }),
          onError: () => setStatus({ phase: 'error', progress: 0 }),
          onWalk: (to) => { setHeading(to); setMoved(true); },
          onSpot: (at) => { setSpot(at); setHeading(null); },
          onFragment: (fragmentId) => handlersRef.current.handleFragment(fragmentId),
          seamMode: handlersRef.current.seamMode,
          sfx,
          onSeamMatch: setSeamMatch,
          onSeamComplete: (m) => handlersRef.current.handleComplete(id, { perfect: m.livesLeft === m.lives }),
        });
        apiRef.current = api;
      } catch (error) {
        console.warn('La escena no está disponible:', error);
        setStatus({ phase: 'error', progress: 0 });
      }
    }).catch(() => setStatus({ phase: 'error', progress: 0 }));
    return () => { cancelled = true; api?.dispose(); apiRef.current = null; };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps -- la escena se arma una vez; el movimiento reducido se pasa abajo

  useEffect(() => { apiRef.current?.setReducedMotion(reducedMotion); }, [reducedMotion]);
  useEffect(() => { apiRef.current?.setFound(story.fragments); }, [story.fragments, status.phase]);
  useEffect(() => { if (status.phase === 'ready') apiRef.current?.setSeamMode(seamMode); }, [seamMode, status.phase]);

  const atSeam = Boolean(data.seam) && spot === data.seam.spot && !heading;
  // La partida vale solo mientras hay jornada (al ganar, el frente queda picado y la partida termina).
  const hud = districtHud({ district, match: seamMode === 'play' ? seamMatch : null, lit: lit && !practicing, story, day, practice: practicing });
  const deciding = atSeam && (hud.kind === 'decision' || Boolean(farewell));

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

  const pick = () => apiRef.current?.seamAction();
  const retrySeam = () => { sfx.play('click'); apiRef.current?.seamRetry(); };
  const seamRef = useRef({ atSeam, kind: hud.kind, lost: Boolean(hud.lost) });
  useEffect(() => { seamRef.current = { atSeam, kind: hud.kind, lost: Boolean(hud.lost) }; });

  // Con movimiento reducido no se camina: un fundido corto tapa el salto de cámara.
  const go = (to) => {
    if (!apiRef.current || status.phase !== 'ready') return;
    sfx.play('click');
    if (!reducedMotion) { apiRef.current.goTo(to); return; }
    setFading(true);
    window.setTimeout(() => { apiRef.current?.goTo(to); setFading(false); }, FADE_MS / 2);
  };
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; });

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') { goToMap(); return; }
      if (event.target.closest?.('input, textarea, select')) return;
      // La barra espaciadora pica (o reintenta) frente al carbón; sobre un botón queda su propio clic.
      if (event.code === 'Space' && seamRef.current.atSeam && seamRef.current.kind === 'play' && !event.target.closest?.('button, a')) {
        event.preventDefault();
        if (seamRef.current.lost) apiRef.current?.seamRetry(); else apiRef.current?.seamAction();
        return;
      }
      const to = spotForKey(event.key, data.spots);
      if (to) goRef.current(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToMap, data.spots]);

  // El fuego del tambor cruje de a ratos estando en el galpón.
  useEffect(() => {
    if (spot !== 'galpon' || heading) return undefined;
    let timer;
    const crackle = () => { sfx.play('crackle'); timer = window.setTimeout(crackle, 1200 + Math.random() * 2600); };
    timer = window.setTimeout(crackle, 600);
    return () => clearTimeout(timer);
  }, [spot, heading, sfx]);

  const here = data.spots.find((s) => s.id === (heading ?? spot));

  return (
    <section className="location" aria-label={`Distrito ${id}`}>
      <div ref={mountRef} className="location-mount" />
      <header className="district-hud-top location-top">
        <div className="district-hud-title">
          <BackLink />
          <Image src={`/assets/seals/${id}.png`} alt="" width={28} height={28} />
          <h1><span className="sr-only">Distrito </span>{data.title}</h1>
        </div>
      </header>
      {status.phase === 'ready' && (
        <>
          <p className="location-place" aria-live="polite">
            {here.label}
            {!moved && <span>Tocá un lugar para ir.</span>}
            {atSeam && hud.hint && !deciding && <span>{hud.hint}</span>}
            {atSeam && practicing && <span>Jugás de nuevo. La historia no cambia y no hay pregunta de comida.</span>}
          </p>
          {atSeam && hud.kind === 'play' && seamMode === 'play' && seamMatch && (
            <div className="district-hud-bottom location-hud">
              {hud.score && <Score {...hud.score} />}
              {hud.lives && <Lives {...hud.lives} />}
              {hud.help && <span className="help-note">{hud.help}</span>}
              {hud.lost ? (
                <>
                  <span className="lost" role="status">{hud.lost}</span>
                  <button type="button" className="primary" onClick={retrySeam}>Reintentar</button>
                </>
              ) : <button type="button" className="hud-action" onClick={pick}>{hud.action}</button>}
            </div>
          )}
          {atSeam && hud.kind === 'done' && !farewell && (
            <div className="district-hud-bottom location-hud"><button type="button" onClick={() => replayDay(id)}>Jugar de nuevo</button></div>
          )}
          {atSeam && hud.kind === 'decision' && !farewell && <DecisionCard hud={hud} onDecide={decide} />}
          {atSeam && farewell && <p className="tesserae-card tesserae-farewell" role="status">{farewell}</p>}
          {!deciding && <nav className="location-spots" aria-label="Lugares del distrito">
            {data.spots.map((s, i) => (
              <button key={s.id} type="button" aria-current={s.id === spot && !heading ? 'location' : undefined}
                className={s.id === (heading ?? spot) ? 'active' : ''} onClick={() => go(s.id)}>
                <span aria-hidden="true">{i + 1}</span>{s.label}
              </button>
            ))}
          </nav>}
        </>
      )}
      <div className={`location-fade${fading ? ' on' : ''}`} aria-hidden="true" />
      {status.phase === 'loading' && (
        <p className="location-loading" role="status">Cargando el Distrito {id}… {Math.round(status.progress * 100)} %</p>
      )}
      {status.phase === 'error' && (
        <p className="location-loading" role="alert">La escena no se pudo cargar en este navegador. Podés volver al mapa con la flecha.</p>
      )}
    </section>
  );
}
