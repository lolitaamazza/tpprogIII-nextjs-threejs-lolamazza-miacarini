'use client';
import { Rajdhani } from 'next/font/google';
import './visor.css';

const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600'] });

// Íconos del visor: líneas finas, del mismo celeste (sin armas).
const PATHS = {
  bowl: 'M3 12h18a9 9 0 0 1-18 0zM7 9c0-2 2-2 2-4M12 9c0-2 2-2 2-4M17 9c0-2 2-2 2-4',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-5 4-7 8-7s7 2 8 7',
  urn: 'M5 9h14l-1.5 11h-11zM8 9a4 4 0 0 1 8 0M10 13h4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  heart: 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z',
};
// Quién depende de él o ella: adulto, enfermo (con una cruz), chico (más chico) o mayor (con bastón).
const FAMILY = {
  adult: 'M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21c0-5 3-8 6-8s6 3 6 8',
  sick: 'M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21c0-5 3-8 6-8s6 3 6 8M17 15h4M19 13v4',
  child: 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 21c0-4 2-6 4-6s4 2 4 6',
  elder: 'M11 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 21c0-5 3-8 6-8 2 0 4 1 5 3M18 12v9',
};
const Icon = ({ d, fill = false, className = '' }) => (
  <svg className={`visor-icon${fill ? ' fill' : ''} ${className}`} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

// Lo que ve el personaje sobre su distrito (ver lib/visor.js): el marco de casco, la comida que queda en su casa,
// quién es, los papeles en la urna y los días que faltan, su familia, el radar y el pulso. No se toca: es solo mirar.
export default function Visor({ state }) {
  if (!state) return null;
  const { name, age, district, portions, papers, days, family, pulse } = state;
  const beat = `${(60 / pulse).toFixed(2)}s`;
  return (
    <div className={`visor ${rajdhani.className}`} style={{ '--beat': beat }} aria-label={`${name}, ${age} años. ${portions.left === 1 ? 'Queda una porción' : `Quedan ${portions.left} porciones`} de comida. Su nombre está ${papers === 1 ? 'una vez' : `${papers} veces`} en la urna. ${days === 1 ? 'Mañana es la Cosecha' : `Faltan ${days} días para la Cosecha`}. Pulso ${pulse}.`} role="img">
      <svg className="visor-frame" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true">
        <path className="visor-line" d="M0 64 H190 L232 108 H560 L600 64 H1000 L1040 108 H1368 L1410 64 H1600" />
        <path className="visor-faint" d="M20 132 H300 L340 168 H520 M1580 132 H1300 L1260 168 H1080" />
        <path className="visor-line" d="M640 26 H960 L980 44 L960 62 H640 L620 44 Z" />
        <path className="visor-line" d="M0 880 H300 L370 940 H1230 L1300 880 H1600" />
        <path className="visor-faint" d="M60 480 H120 M1480 480 H1540 M560 905 H1040" />
        <circle className="visor-line" cx="800" cy="500" r="14" />
        <path className="visor-faint" d="M772 500 H786 M814 500 H828 M800 472 V486 M800 514 V528" />
      </svg>

      <div className="visor-food">
        <Icon d={PATHS.bowl} />
        <span className="visor-seg">{Array.from({ length: portions.total }, (_, i) => <i key={i} className={i < portions.left ? 'on' : ''} />)}</span>
      </div>
      <div className="visor-who">
        <Icon d={PATHS.person} />
        <span><b>{name}</b><small>{age} años  Distrito {district}</small></span>
      </div>
      <div className="visor-count">
        <span><b>{papers}</b><small>papeles</small></span><Icon d={PATHS.urn} />
        <span className="visor-gap" />
        <span><b>{days}</b><small>{days === 1 ? 'día' : 'días'}</small></span><Icon d={PATHS.sun} />
      </div>

      <div className="visor-radar" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <circle className="visor-line" cx="100" cy="100" r="92" /><circle className="visor-faint" cx="100" cy="100" r="58" /><circle className="visor-faint" cx="100" cy="100" r="26" />
          <path className="visor-sweep" d="M100 100 L100 8 A92 92 0 0 1 178 50 Z" />
          <circle cx="134" cy="66" r="5" className="visor-dot" /><circle cx="60" cy="128" r="4" className="visor-dot dim" /><circle cx="118" cy="146" r="4" className="visor-dot dim" />
        </svg>
      </div>
      <div className="visor-family">
        {family.map((f) => <Icon key={f.name} d={FAMILY[f.kind]} className={f.kind} />)}
      </div>
      <div className="visor-pulse">
        <svg className="visor-trace" viewBox="0 0 120 30" aria-hidden="true"><path d="M0 15 H30 L36 4 L44 26 L50 15 H72 L78 8 L84 22 L90 15 H120" /></svg>
        <Icon d={PATHS.heart} fill className="visor-heart" /><b>{pulse}</b>
      </div>
    </div>
  );
}
