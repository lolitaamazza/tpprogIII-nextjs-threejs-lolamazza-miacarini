'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePanem } from './PanemProvider';
import BackLink from './BackLink';
import { districtHud } from '@/lib/districtHud';

// Distrito 13: cuánta señal se descubrió, como las rayitas de cobertura.
function SignalBars({ value }) {
  const lit = Math.round(value * 4);
  return (
    <span className="signal-bars" role="progressbar" aria-label="Señal descubierta" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      {[0, 1, 2, 3].map((i) => <span key={i} className={i < lit ? 'on' : ''} />)}
    </span>
  );
}

// El avance como pastillas (▮▮▯) cuando son pocas; si no, en números.
function Score({ label, value, total }) {
  return (
    <span className="hud-score" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <span aria-hidden="true">{label} <b>{total <= 8 ? `${'▮'.repeat(value)}${'▯'.repeat(total - value)}` : `${value}/${total}`}</b></span>
    </span>
  );
}

// Las vidas como puntos (●●○): el lector de pantalla lee la etiqueta.
function Lives({ label, left, total }) {
  return (
    <span className="hud-lives" aria-label={`${label}: ${left} de ${total}`}>
      <span aria-hidden="true">{label} <b>{'●'.repeat(left)}{'○'.repeat(total - left)}</b></span>
    </span>
  );
}

// Sin panel: arriba la flecha, el distrito y una pista; abajo el avance, las vidas y el botón alternativo.
export default function DistrictHud({ district }) {
  const { progress, interaction, performAction, retryMinigame, minigameInput, classified, webglFailed, goToMap } = usePanem();
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

  const lit = progress.litDistricts.includes(id);
  const mine = interaction.districtId === id;
  const match = !lit && mine ? interaction.match ?? null : null;
  const hud = districtHud({ district, match, lit, revealed: classified.revealed, progress: classified.progress, webgl: !webglFailed });
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
        {hud.hint && <p className="district-hud-hint">{hud.hint}</p>}
      </header>
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
