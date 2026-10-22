'use client';
import { useEffect, useState } from 'react';
import { headlineAt, turnHeadlines, vitalsFor } from '@/lib/games/hud';

// Lo que pasa en la arena, abajo: tu tributo y sus vitales a la izquierda; al centro la pregunta (como subtítulos,
// con clic o con las teclas 1, 2 y 3) o una sola línea con los eventos del turno, que rota.
export default function ArenaHud({ run, encounter, onDecide, onAdvance, autoDelay, autoLeft, disabled }) {
  const selected = run.tributes.find((t) => t.id === run.selectedId);
  const vitals = vitalsFor(selected);
  const headlines = turnHeadlines(run);
  const [clock, setClock] = useState({ turn: run.turn, seconds: 0 });
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setClock({ turn: run.turn, seconds: (performance.now() - start) / 1000 }), 500);
    return () => clearInterval(timer);
  }, [run.turn]);
  const headline = headlineAt(headlines, clock.turn === run.turn ? clock.seconds : 0);

  useEffect(() => {
    if (!encounter || disabled) return undefined;
    const onKey = (event) => {
      const digit = /^Digit([1-3])$/.exec(event.code);
      if (!digit || event.repeat || document.querySelector('dialog[open]') || event.target.closest?.('input, select, textarea')) return;
      const option = encounter.options[Number(digit[1]) - 1];
      if (option) onDecide(option.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [encounter, disabled, onDecide]);

  return (
    <>
      {selected && (
        <section className="arena-tribute" aria-label={`Tu tributo: ${selected.name}`}>
          <p><strong>{selected.name}</strong> <span>D{selected.district}</span>{!selected.alive && <em> · cayó en el turno {selected.eliminatedTurn}</em>}</p>
          {vitals.map((v) => (
            <div key={v.key} className={`arena-vital${v.warning ? ' warning' : ''}`}>
              <span>{v.label}</span>
              <meter min="0" max="100" value={v.value} aria-label={`${v.label} ${v.value} de 100`} />
            </div>
          ))}
        </section>
      )}
      <section className="arena-subtitles" aria-live="polite">
        {encounter ? (
          <>
            <p className="arena-question">{encounter.title} {encounter.body.split('. ').at(-1)}</p>
            <div className="arena-options">
              {encounter.options.map((option, i) => (
                <button key={option.id} type="button" disabled={disabled} onClick={() => onDecide(option.id)} title={option.hint}>
                  <b>{i + 1}</b> {option.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {headline && <p className={`arena-headline${headline.type === 'elimination' ? ' fallen' : ''}`} key={`${run.turn}-${headline.text}`}>{headline.text}</p>}
            <p className="arena-next">
              <button type="button" onClick={onAdvance} disabled={disabled}>Seguir</button>
              <span>{autoDelay === null ? 'En pausa' : `Sigue sola en ${autoLeft ?? Math.ceil(autoDelay)} s`}</span>
            </p>
          </>
        )}
      </section>
    </>
  );
}
