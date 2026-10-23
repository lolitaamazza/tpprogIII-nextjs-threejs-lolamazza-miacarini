'use client';
import { getDistrict } from '@/data/districts';
import { capitolGate } from '@/lib/progress';
import { PROTAGONISTS } from '@/lib/story';
import { usePanem } from './PanemProvider';

function statusOf(district, { visibleLit, progress, story, day }) {
  if (district.id === 'c') return capitolGate({ ready: true, synced: true, progress, story }) === 'allowed' ? 'Abierto · la señal está lista' : 'Blindado';
  if (story.pending?.district === district.id) return `${PROTAGONISTS[district.id].name} tiene que decidir`;
  if (day?.district === district.id && !story.pending) return `Hoy · ${PROTAGONISTS[district.id].name}`;
  if (visibleLit.includes(district.id)) return 'Encendido';
  if (district.classified) return 'SEÑAL NO ENCONTRADA';
  if (district.playable) return 'Todavía no';
  return district.explore ? 'Para explorar' : 'Apagado';
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
