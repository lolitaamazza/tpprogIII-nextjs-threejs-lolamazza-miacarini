'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { capitolGate } from '@/lib/progress';
import { MONTAGE_MIN, foundFragments } from '@/lib/fragments';
import { PROTAGONISTS, STORY_DAYS, endingLines } from '@/lib/story';
import { useGames } from '@/components/games/GamesProvider';
import { usePanem } from './PanemProvider';
import BackLink from './BackLink';

const MESSAGES = {
  rebelion: {
    label: 'Encender la rebelión',
    title: 'Panem ya no está a oscuras.',
    body: 'La señal recorrió los distritos uno por uno. Ningún Agente de la Paz puede apagar trece fuegos al mismo tiempo.',
  },
  memoria: {
    label: 'Recordar a los caídos',
    title: 'Panem recuerda.',
    body: 'La transmisión no habla de victorias. Nombra a cada tributo que el Capitolio quiso borrar. Mientras alguien recuerde, la chispa sigue encendida.',
  },
};
const BROADCAST_MS = 2600;
const FRAGMENT_MS = 2500; // cada fragmento de la transmisión pirata

// La transmisión pirata: lo que se encontró sale al aire, de a uno. Se puede saltear.
function Montage({ fragments, onDone }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => (index + 1 < fragments.length ? setIndex(index + 1) : onDone()), FRAGMENT_MS);
    return () => clearTimeout(timer);
  }, [index, fragments.length, onDone]);
  const fragment = fragments[index];
  return (
    <section className="crt broadcast montage" role="status" aria-live="polite">
      <div className="crt-inner" key={fragment.id}>
        <p className="eyebrow">SEÑAL PIRATA · {index + 1}/{fragments.length} · DISTRITO {fragment.district}</p>
        <h1>{fragment.title}</h1>
        <p className="montage-line">{fragment.line}</p>
      </div>
      <button type="button" className="burn-skip" onClick={onDone} aria-label="Saltar la transmisión pirata">saltar</button>
    </section>
  );
}

export default function CapitolFinale() {
  const router = useRouter();
  const { progress, story, storyReady, stageApiRef, setFinalePlaying, sfx, notify, resetAll, classified, burning, setBurning } = usePanem();
  const { run } = useGames() ?? {};
  const [phase, setPhase] = useState('choose');
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const gate = capitolGate({ ready: progress.ready && storyReady, synced: progress.synced, progress, story });

  useEffect(() => {
    if (gate === 'blocked') {
      notify('El Capitolio está blindado hasta que terminen los Juegos.');
      router.replace('/mapa');
    }
  }, [gate, notify, router]);

  // Después del fuego ("If we burn") se enciende todo Panem y responde el 13.
  const wasBurning = useRef(false);
  useEffect(() => {
    if (phase === 'burn' && wasBurning.current && !burning) {
      setPhase('lighting');
      const finish = () => { setFinalePlaying(false); setPhase('end'); };
      const api = stageApiRef.current;
      if (api) api.playFinale(finish); else finish();
    }
    wasBurning.current = burning;
  }, [phase, burning, stageApiRef, setFinalePlaying]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    stageApiRef.current?.cancelFinale();
    setFinalePlaying(false);
  }, [stageApiRef, setFinalePlaying]);

  if (gate !== 'allowed') {
    return <section className="panel capitol-panel" aria-busy="true"><p className="eyebrow">VERIFICANDO CREDENCIALES…</p></section>;
  }

  const shownPhase = progress.finalMessage && phase === 'choose' ? 'end' : phase;
  const aired = foundFragments(story.fragments);
  const reaped = STORY_DAYS.find((d) => PROTAGONISTS[d].tributeId === run?.protagonist) ?? null;

  // Toma de la señal → (si hay con qué) los fragmentos al aire → el fuego → Panem encendido.
  function burn() { setPhase('burn'); setBurning(true); }
  function choose(message) {
    progress.chooseFinalMessage(message);
    setFinalePlaying(true);
    setPhase('broadcast');
    sfx.play('glitch');
    timerRef.current = window.setTimeout(() => (aired.length >= MONTAGE_MIN ? setPhase('montage') : burn()), BROADCAST_MS);
  }

  if (shownPhase === 'choose') {
    return (
      <section className="panel capitol-panel crt-lite" aria-labelledby="capitol-title">
        <p className="eyebrow">CAPITOLIO · SALA DE TRANSMISIÓN</p>
        <h1 id="capitol-title">La señal está lista.</h1>
        <p>Los Juegos terminaron. Por unos minutos podés cortar la transmisión del Capitolio. ¿Qué querés decirle a Panem?</p>
        <div className="choices">
          {Object.entries(MESSAGES).map(([key, m]) => (
            <button key={key} type="button" className="primary" onClick={() => choose(key)}>{m.label}</button>
          ))}
        </div>
        <BackLink label="Volver al mapa" />
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

  if (shownPhase === 'montage') return <Montage fragments={aired} onDone={burn} />;
  if (shownPhase === 'burn') return null; // el fuego ocupa la pantalla (BurnSequence)

  if (shownPhase === 'lighting') {
    return <p className="lighting-caption" role="status">Panem se enciende…</p>;
  }

  const message = MESSAGES[progress.finalMessage];
  return (
    <section className="panel capitol-panel end" aria-labelledby="end-title">
      <p className="eyebrow">FIN DE LA TRANSMISIÓN · {message.label.toUpperCase()}</p>
      <h1 id="end-title">{message.title}</h1>
      <p>{message.body}</p>
      <p>Y en el noreste, donde el mapa oficial decía que no quedaba nada, una luz respondió. Era el Distrito 13.{classified.revealed ? ' Era la misma señal que encontraste debajo de la estática.' : ''}</p>
      {endingLines(story, reaped).map((line) => <p key={line} className="ending-line">{line}</p>)}
      <div className="choices">
        <Link href="/mapa" className="primary">Ver Panem encendido</Link>
        <Link href="/cosecha">Volver al archivo de los Juegos</Link>
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
          Mapa basado en una ilustración de referencia de fans (ver README). La intro incrusta desde YouTube un fragmento del video oficial «President Snow’s Panem Address #2 – Unity» (The Hunger Games / Lionsgate). Música y sonidos generados por código; al final suena «The Hanging Tree» (James Newton Howard ft. Jennifer Lawrence, © Lionsgate / Universal Music), y la frase «If we burn, you burn with us» pertenece a la saga de Suzanne Collins.
          Tipografías Oswald e Inter (SIL Open Font License).
        </p>
        <p>
          Modelos 3D: <a href="https://sketchfab.com/3d-models/the-hunger-games-arena-8735e8c171254663bd7db82878915190" target="_blank" rel="noreferrer">The Hunger Games Arena</a> · Flashness (adaptada y optimizada);
          {' '}<a href="https://sketchfab.com/3d-models/rigged-t-pose-human-male-w-50-face-blendshapes-cc7e4596bcd145208a6992c757854c07" target="_blank" rel="noreferrer">humano masculino</a> · Mike Alger / Doob / High Fidelity;
          {' '}<a href="https://sketchfab.com/3d-models/valery-tpose-blender-rigged-woman-1cce3c0410634a9497fec3afc1fb8eda" target="_blank" rel="noreferrer">Valery</a> · xander.dice (Sketchfab, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>).
          Distrito 12 (Sketchfab, CC BY 4.0): Abandoned Mine · Miguel-Angel; Mine Cart 3December 2022 · watermelon256; Abandoned House · Sengchor; Abandoned House · DMC_RELAX; Copper And Glass Hand Lamp · Portland Museum.
          {' '}Distrito 11 (Sketchfab, CC BY 4.0): Old Wooden Watchtower · Blenderust; Wooden Cabin · donnichols; Crate of Pears · Meerschaum Digital; Ladder Wooden y Scarecrow · Mehdi Shahsavan; Wooden Wheelbarrow · Peter Nox.
          {' '}Distrito 4 (Sketchfab, CC BY 4.0): Old Lighthouse · Nirved Kamble; Fishing boat · Aurélien Duval; Fishing boat · Pabooklas; Fishing net · Alex Martire; Fishing Supplies Set · FrodoUndead; Skipskranen · Tidvis; Glass Bowl · Juan Carlos.
          {' '}El tren y las plazas (Sketchfab, CC BY 4.0): Train&apos;s Compartments · ROY; Utrecht Stadhuis · Dybo; Classical Pillar · Samuel F. Angrick-Johanns; RCA 44-BX Microphone · Tom Seddon.
          Packs de Kenney (CC0); materiales, roca e iluminación de <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven</a> (CC0). Detalle en <code>public/models/CREDITS.md</code>.
        </p>
      </details>
    </section>
  );
}
