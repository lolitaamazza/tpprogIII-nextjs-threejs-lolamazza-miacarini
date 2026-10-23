'use client';
import { useEffect } from 'react';
import { BULLETINS } from '@/lib/story';
import { usePanem } from './PanemProvider';

const BULLETIN_MS = 4000;

// Entre días, la tele del Capitolio cuenta su versión feliz del distrito (lo que los fragmentos desmienten).
export default function CapitolBulletin() {
  const { bulletin, closeBulletin } = usePanem();
  useEffect(() => {
    if (!bulletin) return undefined;
    const timer = window.setTimeout(closeBulletin, BULLETIN_MS);
    const onKey = (event) => { if (event.key === 'Escape') closeBulletin(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, [bulletin, closeBulletin]);
  if (!bulletin || !BULLETINS[bulletin]) return null;
  const { headline, body, ticker } = BULLETINS[bulletin];
  return (
    // Tocar en cualquier lado la apaga (ocupa toda la pantalla: no hay "afuera").
    <section className="bulletin" aria-labelledby="bulletin-hd" aria-live="polite" onPointerDown={closeBulletin}>
      <div className="bulletin-screen" lang="en">
        <div className="bulletin-content">
          <span className="bulletin-seal" aria-hidden="true" />
          <p className="bulletin-eb">CAPITOL TV · PANEM TODAY</p>
          <p id="bulletin-hd" className="bulletin-hd">{headline}</p>
          <p className="bulletin-tx">{body}</p>
        </div>
        <div className="bulletin-ticker" aria-label={ticker}><span aria-hidden="true">{ticker}  ·  {ticker}  ·  {ticker}  ·  </span></div>
        <div className="bulletin-scan" aria-hidden="true" />
      </div>
      <button type="button" className="bulletin-skip" onClick={closeBulletin} aria-label="Saltar la transmisión">saltar</button>
    </section>
  );
}
