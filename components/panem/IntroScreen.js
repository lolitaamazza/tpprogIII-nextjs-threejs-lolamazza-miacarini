'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePanem } from './PanemProvider';

export default function IntroScreen() {
  const router = useRouter();
  const { startAudio, sfx, progress } = usePanem();
  const [leaving, setLeaving] = useState(false);

  async function ignite() {
    setLeaving(true);
    await startAudio(); // este clic es el gesto que el navegador exige para habilitar el audio
    sfx.play('glitch');
    window.setTimeout(() => router.push('/mapa'), 700);
  }

  return (
    <section className={`intro crt${leaving ? ' leaving' : ''}`}>
      <div className="crt-inner">
        <Image className="intro-seal" src="/assets/brand/panem-seal.png" alt="Sello de Panem" width={104} height={104} priority />
        <p className="eyebrow">TRANSMISIÓN OFICIAL DEL CAPITOLIO · CANAL OBLIGATORIO</p>
        <h1>Panem vive en paz.</h1>
        <p>Los distritos trabajan. El Capitolio cuida. Toda señal no autorizada será eliminada.</p>
        <button type="button" className="primary ignite" onClick={ignite} disabled={leaving}>
          {progress.litDistricts.length ? 'Retomar la señal' : 'Encender la señal'}
        </button>
        <p className="fineprint">
          Experiencia de fans con fines académicos, inspirada en <cite>The Hunger Games</cite> de Suzanne Collins. Con sonido.
        </p>
      </div>
    </section>
  );
}
