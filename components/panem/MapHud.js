'use client';
import { getDistrict } from '@/data/districts';
import { canEnterCapitol } from '@/lib/progress';
import { usePanem } from './PanemProvider';

function statusOf(district, { visibleLit, progress }) {
  if (district.id === 'c') return canEnterCapitol(progress) ? 'Abierto · la señal está lista' : `Blindado · ${progress.litDistricts.length}/3 emblemas`;
  if (visibleLit.includes(district.id)) return 'Encendido';
  if (district.classified) return 'SEÑAL NO ENCONTRADA';
  if (district.playable) return 'Todavía guarda una chispa';
  return 'Apagado';
}

export default function MapHud() {
  const panem = usePanem();
  const district = panem.hovered ? getDistrict(panem.hovered) : null;
  return (
    <>
      <div className={`hover-card${district ? ' visible' : ''}${district?.classified ? ' classified' : ''}`} aria-live="polite">
        {district && <>
          <p className="eyebrow">{district.id === 'c' ? 'CAPITOLIO' : `DISTRITO ${district.number}`}</p>
          <strong>{district.industry}</strong>
          <span>{statusOf(district, panem)}</span>
        </>}
      </div>
      {panem.webglFailed && (
        <p className="notice" role="status">Tu navegador no puede mostrar el mapa 3D. Podés recorrer Panem con el menú de distritos.</p>
      )}
    </>
  );
}
