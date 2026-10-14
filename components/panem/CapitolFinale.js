'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { capitolGate } from '@/lib/progress';
import { usePanem } from './PanemProvider';

const MESSAGES = {
  rebelion: {
    label: 'Encender la rebelión',
    title: 'Panem ya no está a oscuras.',
    body: 'La señal recorrió los distritos uno por uno. Ningún Agente de la Paz puede apagar trece fuegos al mismo tiempo.',
  },
  memoria: {
    label: 'Recordar a los caídos',
    title: 'Panem recuerda.',
    body: 'La transmisión no habla de victorias: nombra a cada tributo que el Capitolio quiso borrar. Mientras alguien recuerde, la chispa sigue encendida.',
  },
};
const BROADCAST_MS = 2600;

export default function CapitolFinale() {
  const router = useRouter();
  const { progress, stageApiRef, setFinalePlaying, sfx, notify, resetAll } = usePanem();
  const [phase, setPhase] = useState('choose');
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const gate = capitolGate({ ready: progress.ready, synced: progress.synced, progress });
  const litCount = progress.litDistricts.length;

  useEffect(() => {
    if (gate === 'blocked') {
      notify(`El Capitolio está blindado · ${litCount}/3 emblemas`);
      router.replace('/mapa');
    }
  }, [gate, litCount, notify, router]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    stageApiRef.current?.cancelFinale();
    setFinalePlaying(false);
  }, [stageApiRef, setFinalePlaying]);

  if (gate !== 'allowed') {
    return <section className="panel capitol-panel" aria-busy="true"><p className="eyebrow">VERIFICANDO CREDENCIALES…</p></section>;
  }

  const shownPhase = progress.finalMessage && phase === 'choose' ? 'end' : phase;

  function choose(message) {
    progress.chooseFinalMessage(message);
    setFinalePlaying(true);
    setPhase('broadcast');
    sfx.play('glitch');
    timerRef.current = window.setTimeout(() => {
      setPhase('lighting');
      const finish = () => { setFinalePlaying(false); setPhase('end'); };
      const api = stageApiRef.current;
      if (api) api.playFinale(finish); else finish();
    }, BROADCAST_MS);
  }

  if (shownPhase === 'choose') {
    return (
      <section className="panel capitol-panel crt-lite" aria-labelledby="capitol-title">
        <p className="eyebrow">CAPITOLIO · SALA DE TRANSMISIÓN</p>
        <h1 id="capitol-title">La señal está lista.</h1>
        <p>Tres distritos encendidos alcanzan para tomar la transmisión oficial. ¿Qué mensaje va a escuchar Panem?</p>
        <div className="choices">
          {Object.entries(MESSAGES).map(([key, m]) => (
            <button key={key} type="button" className="primary" onClick={() => choose(key)}>{m.label}</button>
          ))}
        </div>
        <Link href="/mapa" className="back">← Todavía no</Link>
      </section>
    );
  }

  if (shownPhase === 'broadcast') {
    return (
      <section className="crt broadcast" role="status" aria-live="assertive">
        <div className="crt-inner">
          <p className="eyebrow">INTERRUPCIÓN DE LA SEÑAL OFICIAL</p>
          <h1 className="glitch-text">EL SINSAJO TOMA LA TRANSMISIÓN</h1>
        </div>
      </section>
    );
  }

  if (shownPhase === 'lighting') {
    return <p className="lighting-caption" role="status">Panem se enciende…</p>;
  }

  const message = MESSAGES[progress.finalMessage];
  return (
    <section className="panel capitol-panel end" aria-labelledby="end-title">
      <p className="eyebrow">FIN DE LA TRANSMISIÓN · {message.label.toUpperCase()}</p>
      <h1 id="end-title">{message.title}</h1>
      <p>{message.body}</p>
      <p>Y en el noreste, donde el mapa oficial decía que no quedaba nada, una luz respondió: el Distrito 13.</p>
      <div className="choices">
        <Link href="/mapa" className="primary">Ver Panem encendido</Link>
        {confirming ? (
          <>
            <button type="button" onClick={() => resetAll()}>Sí, apagar todo y empezar de nuevo</button>
            <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}>Volver a empezar</button>
        )}
      </div>
      <details className="credits">
        <summary>Créditos</summary>
        <p>
          Experiencia de fans sin fines comerciales, realizada para Programación Multimedial III (UMAI). <cite>The Hunger Games</cite> © Suzanne Collins / Scholastic; películas © Lionsgate.
          Mapa basado en una ilustración de referencia de fans (ver README). Música y sonidos generados por código.
          Tipografías Oswald e Inter (SIL Open Font License).
        </p>
      </details>
    </section>
  );
}
