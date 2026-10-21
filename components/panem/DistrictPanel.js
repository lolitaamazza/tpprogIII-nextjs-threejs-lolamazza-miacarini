'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePanem } from './PanemProvider';
import BackLink from './BackLink';
import { helpLevel } from '@/lib/minigame';

// Distrito 13: cuánta señal se descubrió, como las rayitas de cobertura.
function SignalBars({ value }) {
  const lit = Math.round(value * 4);
  return (
    <span className="signal-bars" role="progressbar" aria-label="Señal descubierta" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      {[0, 1, 2, 3].map((i) => <span key={i} className={i < lit ? 'on' : ''} />)}
    </span>
  );
}

// Las vidas como puntos (●●○): el lector de pantalla lee la etiqueta.
function Lives({ label, left, total }) {
  return (
    <span className="hud-lives" aria-label={`${label}: ${left} de ${total}`}>
      <span aria-hidden="true">{label} {'●'.repeat(left)}{'○'.repeat(total - left)}</span>
    </span>
  );
}

export default function DistrictPanel({ district }) {
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
  const value = lit ? 1 : interaction.districtId === id ? interaction.value : 0;
  const match = !lit && interaction.districtId === id ? interaction.match ?? null : null;
  const lost = match?.phase === 'lost';
  const singing = match?.step === 'song'; // Distrito 11: la segunda parte, repetir el silbido de los sinsajos
  // Recién perdido, la barra no reintenta enseguida: si no, quien venía apretando no llega a leer qué pasó.
  const lostAt = useRef(0);
  useEffect(() => { if (lost) lostAt.current = performance.now(); }, [lost]);

  // La barra espaciadora juega (o reintenta) desde cualquier lado del distrito; sobre un botón o un enlace
  // se deja su comportamiento propio (en el botón de la acción, su clic ya juega).
  useEffect(() => {
    if (!district.playable || lit) return undefined;
    const onKey = (event) => {
      if (event.repeat || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const digit = /^Digit([1-4])$/.exec(event.code);
      if (singing && digit) { minigameInput(Number(digit[1]) - 1); return; }
      if (event.code !== 'Space' || event.target.closest?.('button, a')) return;
      event.preventDefault();
      if (!lost) performAction();
      else if (performance.now() - lostAt.current > 800) retryMinigame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [district.playable, lit, lost, singing, performAction, retryMinigame, minigameInput]);

  return (
    <aside className={`panel district-panel${district.classified ? ' classified' : ''}`} aria-labelledby="district-title">
      <BackLink />
      <div className="district-heading">
        <Image src={`/assets/seals/${id}.png`} alt="" width={64} height={64} />
        <span className="district-number">{district.number}</span>
      </div>
      <p className="eyebrow">{district.classified ? 'ARCHIVO CLASIFICADO' : `DISTRITO ${district.number} · ${district.industry.toUpperCase()}`}</p>
      <h1 id="district-title">{district.name}</h1>
      <p className="quote">{district.quote}</p>
      {district.playable ? (
        lit ? (
          <p className="done" role="status"><strong>Emblema obtenido.</strong> El {district.name} está encendido.</p>
        ) : (
          <>
            <p className="instruction">{singing ? district.songInstruction : district.instruction}</p>
            {match && district.hud && (
              <p className="hud">
                <span>{singing ? district.hud.song : district.hud.score} {match.stepScore ?? match.score}/{match.stepGoal ?? match.goal}</span>
                <Lives label={district.hud.lives} left={match.livesLeft} total={match.lives} />
              </p>
            )}
            <div className="meter" role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
              <span style={{ width: `${value * 100}%` }} />
            </div>
            {lost ? (
              <>
                <p className="lost" role="status">{district.lostMessage}</p>
                <button type="button" className="primary" onClick={retryMinigame}>Reintentar</button>
              </>
            ) : (
              <>
                {singing && (
                  <div className="bird-buttons" role="group" aria-label="Sinsajos, de izquierda a derecha">
                    {[0, 1, 2, 3].map((i) => (
                      <button key={i} type="button" onClick={() => minigameInput(i)} aria-label={`Sinsajo ${i + 1}`}>{i + 1}</button>
                    ))}
                  </div>
                )}
                <button type="button" className="primary" onClick={performAction}>{singing ? district.songActionLabel : district.actionLabel}</button>
              </>
            )}
            {match && helpLevel(match) > 0 && !lost && <p className="hint help-note">{district.helpNote}</p>}
            <p className="hint">{singing ? district.songKeyHint : match && district.keyHint ? district.keyHint : 'Podés usar este botón en lugar del mouse o la pantalla táctil.'}</p>
          </>
        )
      ) : (
        district.classified ? (
          // Lo dice la imagen rota, no el panel: acá solo una etiqueta como las de la pantalla y la señal.
          <>
            <p className="classified-signal" role="status">
              <span className={`classified-tag${classified.revealed ? ' live' : ''}`}>{classified.revealed ? 'Señal recuperada' : 'Acceso denegado'}</span>
              {!classified.revealed && !webglFailed && <SignalBars value={classified.progress} />}
            </p>
            {!classified.revealed && !webglFailed && <p className="hint">Arrastrá los pedazos.</p>}
          </>
        ) : (
          <p className="status">Señal aún no alcanzada.</p>
        )
      )}
    </aside>
  );
}
