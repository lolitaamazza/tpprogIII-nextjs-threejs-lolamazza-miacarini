'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePanem } from './PanemProvider';

export default function DistrictPanel({ district }) {
  const { progress, interaction, performAction } = usePanem();
  const { id } = district;
  const { ready, markVisited } = progress;
  useEffect(() => { if (ready) markVisited(id); }, [ready, markVisited, id]);

  const lit = progress.litDistricts.includes(id);
  const value = lit ? 1 : interaction.districtId === id ? interaction.value : 0;

  return (
    <aside className={`panel district-panel${district.classified ? ' classified' : ''}`} aria-labelledby="district-title">
      <Link href="/mapa" className="back">← Volver al mapa</Link>
      <div className="district-heading">
        <Image src={`/assets/seals/${id}.png`} alt="" width={64} height={64} />
        <span className="district-number">{district.number}</span>
      </div>
      <p className="eyebrow">{district.classified ? 'ARCHIVO CLASIFICADO' : `DISTRITO ${district.number} · ${district.industry.toUpperCase()}`}</p>
      <h1 id="district-title">{district.name}</h1>
      <p className="quote">{district.quote}</p>
      {district.playable ? (
        lit ? (
          <p className="done" role="status"><strong>Emblema obtenido.</strong> El {district.name} está encendido.</p>
        ) : (
          <>
            <p className="instruction">{district.instruction}</p>
            <div className="meter" role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
              <span style={{ width: `${value * 100}%` }} />
            </div>
            <button type="button" className="primary" onClick={performAction}>{district.actionLabel}</button>
            <p className="hint">Podés usar este botón en lugar del mouse o la pantalla táctil.</p>
          </>
        )
      ) : (
        <p className="status">{district.classified ? 'SEÑAL NO ENCONTRADA · Según el Capitolio, este distrito no existe.' : 'Señal aún no alcanzada.'}</p>
      )}
    </aside>
  );
}
