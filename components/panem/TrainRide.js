'use client';
import { useEffect, useRef, useState } from 'react';
import { TRAIN } from '@/lib/locations/train';
import { TRAIN_SECONDS } from '@/lib/plazas';

const FADE_MS = 400;

// Un viaje corto en tren: el vagón con el paisaje que pasa por la ventana durante unos segundos, y se llega.
// Se puede saltear (botón, Esc, Enter o la barra). Con movimiento reducido es un fundido; si la escena no carga, se llega igual.
export default function TrainRide({ label, onArrive, reducedMotion, sfx }) {
  const mountRef = useRef(null);
  const arriveRef = useRef(onArrive);
  useEffect(() => { arriveRef.current = onArrive; });
  const [phase, setPhase] = useState('loading');
  const doneRef = useRef(false);
  const arrive = () => { if (doneRef.current) return; doneRef.current = true; arriveRef.current(); };

  useEffect(() => {
    if (reducedMotion) {
      const timer = window.setTimeout(arrive, FADE_MS);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    let api = null;
    let timer = 0;
    import('@/components/stage/locations/locationScene').then(({ createLocationScene }) => {
      if (cancelled || !mountRef.current) return;
      try {
        api = createLocationScene(mountRef.current, TRAIN, {
          onReady: () => { setPhase('riding'); sfx?.play('whistle'); timer = window.setTimeout(arrive, TRAIN_SECONDS * 1000); },
          onError: arrive,
        });
      } catch { arrive(); }
    }).catch(arrive);
    return () => { cancelled = true; clearTimeout(timer); api?.dispose(); };
  }, [reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps -- el viaje se arma una vez

  useEffect(() => {
    const onKey = (event) => {
      if (['Escape', 'Enter', ' '].includes(event.key)) { event.preventDefault(); arrive(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // `arrive` solo llama a la referencia

  return (
    <section className="location train" aria-label={label}>
      <div ref={mountRef} className="location-mount" />
      <p className="train-label" role="status">{label}</p>
      {phase === 'loading' && !reducedMotion && <p className="location-loading">Subiendo al tren…</p>}
      <button type="button" className="train-skip" onClick={arrive}>Saltear</button>
      {reducedMotion && <div className="location-fade on" aria-hidden="true" />}
    </section>
  );
}
