'use client';
import { useEffect, useState } from 'react';

const LINE_MS = 3600;

// Su voz al llegar: las líneas de quién es (PROTAGONISTS[id].voice), una por vez sobre la escena.
// Se cierra sola al terminar o con "Saltear"; con movimiento reducido se ven todas juntas.
// `paused`: durante la jornada no se ve ni avanza (sigue donde quedó al salir).
export default function ArrivalVoice({ lines, reducedMotion, paused = false }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || paused) return undefined;
    const timer = window.setTimeout(() => {
      if (reducedMotion || index >= lines.length - 1) setDone(true);
      else setIndex(index + 1);
    }, reducedMotion ? LINE_MS * 3 : LINE_MS);
    return () => clearTimeout(timer);
  }, [index, done, paused, lines.length, reducedMotion]);
  if (done || paused || !lines?.length) return null;
  return (
    <div className="arrival-voice" role="status" aria-live="polite">
      {reducedMotion
        ? lines.map((line) => <p key={line}>{line}</p>)
        : <p key={index} className="arrival-line">{lines[index]}</p>}
      <button type="button" className="arrival-skip" onClick={() => setDone(true)}>Saltear</button>
    </div>
  );
}
