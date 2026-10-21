'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePanem } from '@/components/panem/PanemProvider';
import { interceptAt } from '@/lib/games/intercept';

const SEEN_KEY = 'panem-archive-intercept'; // se ve una vez por sesión

// La resistencia entra al archivo del Capitolio por la frecuencia del 13: el acceso se niega, se fuerza y el sello
// del Capitolio queda tachado. Un clic o cualquier tecla la saltea.
export default function ArchiveIntercept() {
  const { reducedMotion, sfx } = usePanem();
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const lastPhase = useRef('connecting');

  useEffect(() => {
    let seen = false;
    try { seen = window.sessionStorage.getItem(SEEN_KEY) === '1'; window.sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* sin storage: se muestra */ }
    if (!seen) setRunning(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const start = performance.now();
    let frame;
    const tick = () => {
      const now = (performance.now() - start) / 1000;
      const { phase } = interceptAt(now, { reducedMotion });
      if (phase !== lastPhase.current) {
        if (phase === 'denied') sfx.play('glitch');
        if (phase === 'granted') sfx.play('tvOn');
        lastPhase.current = phase;
      }
      setT(now);
      if (phase === 'done') setRunning(false); else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const skip = () => setRunning(false);
    window.addEventListener('keydown', skip);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', skip); };
  }, [running, reducedMotion, sfx]);

  if (!running) return null;
  const { lines, phase } = interceptAt(t, { reducedMotion });
  return (
    <div className={`archive-intercept phase-${phase}`} role="status" aria-label="Interceptando el archivo del Capitolio" onClick={() => setRunning(false)}>
      <div className="intercept-seal" aria-hidden="true">
        <Image src="/assets/brand/panem-seal.png" alt="" width={96} height={96} />
        <span className="intercept-strike" />
      </div>
      <ol className="intercept-lines">
        {lines.map((line) => <li key={line.text} className={line.tone ? `tone-${line.tone}` : undefined}>&gt; {line.text}</li>)}
      </ol>
      <button type="button" className="intercept-skip">saltar</button>
    </div>
  );
}
