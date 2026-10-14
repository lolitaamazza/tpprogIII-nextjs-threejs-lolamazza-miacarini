'use client';
import { useState } from 'react';
import Image from 'next/image';
import { PLAYABLE_IDS, getDistrict } from '@/data/districts';
import { usePanem } from './PanemProvider';

const MESSAGE_LABELS = { rebelion: 'Encender la rebelión', memoria: 'Recordar a los caídos' };

export default function EmblemsDialog({ onClose }) {
  const { progress, resetAll } = usePanem();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="emblems-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal-panel">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <p className="eyebrow">TU RECORRIDO</p>
        <h2 id="emblems-title">Emblemas {progress.litDistricts.length}/3</h2>
        <ul className="emblems">
          {PLAYABLE_IDS.map((id) => {
            const d = getDistrict(id);
            const lit = progress.litDistricts.includes(id);
            return (
              <li key={id} className={lit ? 'lit' : ''}>
                <Image src={`/assets/seals/${id}.png`} alt="" width={56} height={56} />
                <span>{d.name} · {d.industry}</span>
                <small>{lit ? 'Encendido' : 'Pendiente'}</small>
              </li>
            );
          })}
        </ul>
        {progress.finalMessage && <p>Mensaje transmitido: <strong>{MESSAGE_LABELS[progress.finalMessage]}</strong></p>}
        <p className="hint">Distritos explorados: {progress.visited.length}/13</p>
        {confirming ? (
          <div className="confirm">
            <p>¿Apagar Panem y empezar de nuevo? Se borra tu progreso.</p>
            <button type="button" className="primary" onClick={() => { onClose(); resetAll(); }}>Sí, reiniciar</button>
            <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}>Reiniciar recorrido</button>
        )}
      </div>
    </div>
  );
}
