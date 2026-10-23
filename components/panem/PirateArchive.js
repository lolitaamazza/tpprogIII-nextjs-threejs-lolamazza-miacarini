'use client';
import { useRef, useState } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
import { FRAGMENTS, FRAGMENT_TOTAL, SIGNAL_FRAGMENT } from '@/lib/fragments';
import { PROTAGONISTS, STORY_DAYS } from '@/lib/story';
import { HINTS, MARKS, MARK_TOTAL, TOOLS } from '@/lib/clues';
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

// Una pista en la lista del archivo: encontrada (título y línea) o "???" con su distrito.
function ClueRow({ clue, found }) {
  return found ? (
    <li className="found"><span>{clue.district}</span><div><strong>{clue.title}</strong><p>{clue.line}</p></div></li>
  ) : (
    <li><span>{clue.district}</span><div><strong aria-label="Sin encontrar">???</strong></div></li>
  );
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

        <h3 className="archive-head">Herramientas {story.tools.length}/{TOOLS.length}</h3>
        <ol className="archive-fragments">
          {TOOLS.map((t) => <ClueRow key={t.id} clue={t} found={story.tools.includes(t.id)} />)}
        </ol>

        <h3 className="archive-head">Marcas del sinsajo {story.marks.length}/{MARK_TOTAL}</h3>
        <ol className="archive-fragments">
          {MARKS.map((m) => <ClueRow key={m.id} clue={m} found={story.marks.includes(m.id)} />)}
        </ol>

        <h3 className="archive-head">Pistas</h3>
        {story.hints.length ? (
          <ol className="archive-fragments">
            {HINTS.filter((h) => story.hints.includes(h.id)).map((h) => <ClueRow key={h.id} clue={h} found />)}
          </ol>
        ) : <p className="archive-empty">Todavía no encontraste ninguna.</p>}

        {progress.finalMessage && <p>Mensaje transmitido · <strong>{MESSAGE_LABELS[progress.finalMessage]}</strong></p>}
        {progress.completedAt !== null && (
          <p><button type="button" onClick={() => { onClose(); setBurning(true); }}>Ver Panem arder otra vez</button></p>
        )}
        {confirming === 'all' && (
          <div className="confirm">
            <p>¿Apagar Panem y empezar de nuevo? Se borran los días, los fragmentos, las pistas, los minijuegos y los Juegos.</p>
            <button type="button" className="primary" onClick={() => { onClose(); resetAll(); }}>Sí, reiniciar todo</button>
            <button type="button" onClick={() => setConfirming(null)}>Cancelar</button>
          </div>
        )}
        {confirming === 'games' && (
          <div className="confirm">
            <p>¿Empezar los Juegos de nuevo? La urna vuelve a sacar un nombre. Los días, los fragmentos y las pistas quedan.</p>
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
