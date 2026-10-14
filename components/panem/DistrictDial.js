'use client';
import Image from 'next/image';
import { DISTRICTS } from '@/data/districts';
import { canEnterCapitol } from '@/lib/progress';
import { usePanem } from './PanemProvider';

export default function DistrictDial() {
  const { progress, visibleLit, hovered, setHovered, selectDistrict } = usePanem();
  const capitolOpen = canEnterCapitol(progress);
  return (
    <nav className="dial" aria-label="Distritos de Panem">
      <ol>
        {DISTRICTS.map((d, i) => {
          const lit = visibleLit.includes(d.id);
          const status = d.id === 'c' ? (capitolOpen ? 'abierto' : 'blindado')
            : lit ? 'encendido' : d.classified ? 'clasificado' : d.playable ? 'guarda una chispa' : 'apagado';
          const classes = [lit && 'lit', d.playable && 'playable', d.classified && 'classified', hovered === d.id && 'hover'].filter(Boolean).join(' ');
          return (
            <li key={d.id} style={{ '--i': i, '--n': DISTRICTS.length }}>
              <button
                type="button" className={classes} onClick={() => selectDistrict(d.id)}
                onMouseEnter={() => setHovered(d.id)} onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(d.id)} onBlur={() => setHovered(null)}
                aria-label={`${d.name}, ${d.industry}: ${status}`}
              >
                {d.number}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="dial-core" aria-hidden="true"><Image src="/assets/brand/panem-seal.png" alt="" width={96} height={96} /></div>
    </nav>
  );
}
