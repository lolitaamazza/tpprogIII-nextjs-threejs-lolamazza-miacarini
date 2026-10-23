'use client';
import { useRef, useState } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
import { FRAGMENTS, FRAGMENT_TOTAL, SIGNAL_FRAGMENT } from '@/lib/fragments';
import { PROTAGONISTS, STORY_DAYS } from '@/lib/story';
import { useRouter } from 'next/navigation';
import { useGames } from '@/components/games/GamesProvider';
import { usePanem } from './PanemProvider';

const MESSAGE_LABELS = { rebelion: 'Encender la rebelión', memoria: 'Recordar a los caídos' };

// Cómo está cada uno de los tres: su día (jugado, hoy o todavía no) y los papeles con su nombre en la urna.
function dayStatus(id, { progress, story, day }) {
  if (story.pending?.district === id) return 'Tiene que decidir si pide comida';
  if (progress.litDistricts.includes(id)) return story.tesserae[id] ? 'Pidió comida' : 'No pidió comida';
  return day?.district === id ? 'Hoy' : 'Todavía no';
}

// El archivo pirata: lo que la resistencia fue juntando. Reemplaza a los emblemas.
export default function PirateArchive({ onClose }) {
  const panem = usePanem();
  const { progress, story, resetAll, setBurning } = panem;
  const router = useRouter();
  const games = useGames();
  const [confirming, setConfirming] = useState(null); // 'all' | 'games'
  const panelRef = useRef(null);
  useDismiss([panelRef], onClose);
  const found = new Set(story.fragments);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="archive-title">
      <div ref={panelRef} className="modal-panel archive-panel">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <p className="eyebrow archive-eyebrow">ARCHIVO PIRATA · SEÑAL DEL 13</p>
        <h2 id="archive-title">Lo que el Capitolio no muestra</h2>

        <h3 className="archive-head">Veces que su nombre está en la urna</h3>
        <ul className="archive-papers">
          {STORY_DAYS.map((id) => (
            <li key={id}>
              <span>{PROTAGONISTS[id].name} <small>Distrito {id} · {PROTAGONISTS[id].age} años</small></span>
              <b aria-label={`${story.papers[id]} papeles`}>{story.papers[id]}</b>
              <small>{dayStatus(id, panem)}</small>
            </li>
          ))}
        </ul>

        <h3 className="archive-head">Fragmentos {story.fragments.length}/{FRAGMENT_TOTAL}</h3>
        <ol className="archive-fragments">
          {FRAGMENTS.map((f) => (found.has(f.id) ? (
            <li key={f.id} className="found"><span>{f.district}</span><div><strong>{f.title}</strong><p>{f.line}</p></div></li>
          ) : (
            <li key={f.id}><span>{f.district}</span><div><strong aria-label="Sin encontrar">???</strong></div></li>
          )))}
          <li className={found.has(SIGNAL_FRAGMENT) ? 'found' : ''}>
            <span>13</span>
            <div>{found.has(SIGNAL_FRAGMENT) ? <><strong>La señal del 13</strong><p>Alguien sigue transmitiendo.</p></> : <strong aria-label="Sin encontrar">???</strong>}</div>
          </li>
        </ol>

        {progress.finalMessage && <p>Mensaje transmitido · <strong>{MESSAGE_LABELS[progress.finalMessage]}</strong></p>}
        {progress.completedAt !== null && (
          <p><button type="button" onClick={() => { onClose(); setBurning(true); }}>Ver Panem arder otra vez</button></p>
        )}
        {confirming === 'all' && (
          <div className="confirm">
            <p>¿Apagar Panem y empezar de nuevo? Se borran los días, los fragmentos, los minijuegos y los Juegos.</p>
            <button type="button" className="primary" onClick={() => { onClose(); resetAll(); }}>Sí, reiniciar todo</button>
            <button type="button" onClick={() => setConfirming(null)}>Cancelar</button>
          </div>
        )}
        {confirming === 'games' && (
          <div className="confirm">
            <p>¿Empezar los Juegos de nuevo? La urna vuelve a sacar un nombre; los días y los fragmentos quedan.</p>
            <button type="button" className="primary" onClick={() => { games.clear(); onClose(); router.push('/cosecha'); }}>Sí, reiniciar los Juegos</button>
            <button type="button" onClick={() => setConfirming(null)}>Cancelar</button>
          </div>
        )}
        {!confirming && (
          <div className="archive-resets">
            {games?.run && <button type="button" className="archive-reset" onClick={() => setConfirming('games')}>Reiniciar los Juegos</button>}
            <button type="button" className="archive-reset" onClick={() => setConfirming('all')}>Reiniciar todo</button>
          </div>
        )}
      </div>
    </div>
  );
}
