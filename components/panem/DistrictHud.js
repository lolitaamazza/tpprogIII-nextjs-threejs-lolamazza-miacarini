'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePanem } from './PanemProvider';
import BackLink from './BackLink';
import { districtHud } from '@/lib/districtHud';

// Distrito 13: cuánta señal se descubrió, como las rayitas de cobertura. (Score, Lives y DecisionCard también los usa la escena del 12.)
function SignalBars({ value }) {
  const lit = Math.round(value * 4);
  return (
    <span className="signal-bars" role="progressbar" aria-label="Señal descubierta" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      {[0, 1, 2, 3].map((i) => <span key={i} className={i < lit ? 'on' : ''} />)}
    </span>
  );
}

// El avance como pastillas (▮▮▯) cuando son pocas; si no, en números.
export function Score({ label, value, total }) {
  return (
    <span className="hud-score" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <span aria-hidden="true">{label} <b>{total <= 8 ? `${'▮'.repeat(value)}${'▯'.repeat(total - value)}` : `${value}/${total}`}</b></span>
    </span>
  );
}

// Las vidas como puntos (●●○): el lector de pantalla lee la etiqueta.
export function Lives({ label, left, total }) {
  return (
    <span className="hud-lives" aria-label={`${label}: ${left} de ${total}`}>
      <span aria-hidden="true">{label} <b>{'●'.repeat(left)}{'○'.repeat(total - left)}</b></span>
    </span>
  );
}

const FAREWELL_MS = 2600;

// Pedir comida al Capitolio: la familia come, pero su nombre entra más veces en la urna. Ninguna opción es la correcta.
export function DecisionCard({ hud, onDecide }) {
  return (
    <section className="tesserae-card" aria-labelledby="tesserae-question">
      <p>{hud.line}</p>
      <p id="tesserae-question" className="tesserae-question">¿{hud.who} pide comida al Capitolio?</p>
      <p className="tesserae-papers">Hoy su nombre está {hud.papers.from} veces en la urna. Si pide comida, va a estar <b>{hud.papers.to}</b>.</p>
      <div className="tesserae-actions">
        <button type="button" className="primary" onClick={() => onDecide(true)}>Pedir comida</button>
        <button type="button" onClick={() => onDecide(false)}>No pedir</button>
      </div>
    </section>
  );
}

// Sin panel: arriba la flecha, el distrito y una pista; abajo el avance, las vidas y el botón alternativo.
export default function DistrictHud({ district }) {
  const { progress, story, day, interaction, performAction, retryMinigame, minigameInput, classified, webglFailed, goToMap, decideTesserae, showBulletin, practice, replayDay } = usePanem();
  const { id } = district;
  const { ready, markVisited } = progress;
  useEffect(() => { if (ready) markVisited(id); }, [ready, markVisited, id]);
  // En el 13 la imagen rota ocupa toda la pantalla: Esc vuelve al mapa.
  useEffect(() => {
    if (!district.classified) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') goToMap(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [district.classified, goToMap]);

  const practicing = practice === id;
  const lit = progress.litDistricts.includes(id) && !practicing;
  const mine = interaction.districtId === id;
  const match = !lit && mine ? interaction.match ?? null : null;
  const hud = districtHud({ district, match, lit, revealed: classified.revealed, progress: classified.progress, webgl: !webglFailed, story, day, practice: practicing });
  // Decidido, una línea con lo que cuesta; después la tele del Capitolio y, detrás, el mapa.
  const [farewell, setFarewell] = useState(null);
  const decide = (accept) => {
    decideTesserae(accept);
    setFarewell(accept ? `Esta noche comen todos. El nombre de ${hud.who} está ${hud.papers.to} veces en la urna.` : `${hud.refused} Su nombre sigue ${hud.papers.from} veces en la urna.`);
  };
  useEffect(() => {
    if (!farewell) return undefined;
    const timer = window.setTimeout(() => { showBulletin(id); goToMap(); }, FAREWELL_MS);
    return () => clearTimeout(timer);
  }, [farewell, goToMap, showBulletin, id]);
  const fallback = !lit && !match && mine ? interaction.value : 0; // sin WebGL el avance se cuenta con el botón
  const lost = Boolean(hud.lost);
  // Recién perdido, la barra no reintenta enseguida: si no, quien venía apretando no llega a leer qué pasó.
  const lostAt = useRef(0);
  useEffect(() => { if (lost) lostAt.current = performance.now(); }, [lost]);

  // La barra espaciadora juega (o reintenta) desde cualquier lado del distrito; sobre un botón o un enlace
  // se deja su comportamiento propio (en el botón de la acción, su clic ya juega).
  useEffect(() => {
    if (hud.kind !== 'play') return undefined;
    const onKey = (event) => {
      if (event.repeat || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const digit = /^Digit([1-4])$/.exec(event.code);
      if ((hud.birds || hud.inputs) && digit) { minigameInput(Number(digit[1]) - 1); return; }
      if (event.code !== 'Space' || event.target.closest?.('button, a')) return;
      event.preventDefault();
      if (!lost) performAction();
      else if (performance.now() - lostAt.current > 800) retryMinigame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.kind, hud.birds, hud.inputs, lost, performAction, retryMinigame, minigameInput]);

  return (
    <>
      <header className={`district-hud-top${hud.kind === 'classified' ? ' classified' : ''}`}>
        <div className="district-hud-title">
          <BackLink />
          {hud.title ? (
            <>
              <Image src={`/assets/seals/${id}.png`} alt="" width={28} height={28} />
              <h1><span className="sr-only">Distrito </span>{hud.title}</h1>
            </>
          ) : <h1 className="sr-only">{district.name}</h1>}
          {hud.tag && (
            <p className="classified-signal" role="status">
              <span className={`classified-tag${hud.tag.live ? ' live' : ''}`}>{hud.tag.text}</span>
              {hud.signal !== null && <SignalBars value={hud.signal} />}
            </p>
          )}
        </div>
        {hud.hint && !farewell && <p className="district-hud-hint">{hud.hint}</p>}
      </header>
      {hud.kind === 'decision' && !farewell && <DecisionCard hud={hud} onDecide={decide} />}
      {hud.kind === 'done' && !farewell && district.playable && (
        <div className="district-hud-bottom"><button type="button" onClick={() => replayDay(id)}>Jugar de nuevo</button></div>
      )}
      {farewell && <p className="tesserae-card tesserae-farewell" role="status">{farewell}</p>}
      {hud.kind === 'play' && (
        <div className="district-hud-bottom">
          {hud.score && <Score {...hud.score} />}
          {!hud.score && fallback > 0 && <Score label="Avance" value={Math.round(fallback * 4)} total={4} />}
          {hud.lives && <Lives {...hud.lives} />}
          {hud.help && <span className="help-note">{hud.help}</span>}
          {lost ? (
            <>
              <span className="lost" role="status">{hud.lost}</span>
              <button type="button" className="primary" onClick={retryMinigame}>Reintentar</button>
            </>
          ) : (
            <>
              {hud.inputs && <span className="bird-buttons" role="group" aria-label="Opciones del taller">{hud.inputs.map((label,i)=><button key={i} onClick={()=>minigameInput(i)}>{i+1} · {label}</button>)}</span>}
              {hud.birds && (
                <span className="bird-buttons" role="group" aria-label="Sinsajos, de izquierda a derecha">
                  {[0, 1, 2, 3].map((i) => <button key={i} type="button" onClick={() => minigameInput(i)} aria-label={`Sinsajo ${i + 1}`}>{i + 1}</button>)}
                </span>
              )}
              {hud.action && <button type="button" className="hud-action" onClick={performAction}>{hud.action}</button>}
            </>
          )}
        </div>
      )}
    </>
  );
}
