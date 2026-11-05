'use client';
import { useRef, useState } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
import { FRAGMENTS, FRAGMENT_TOTAL, SIGNAL_FRAGMENT } from '@/lib/fragments';
import { PROTAGONISTS, STORY_DAYS } from '@/lib/story';
import { HINTS, MARKS, MARK_TOTAL, TOOLS } from '@/lib/clues';
import { useRouter } from 'next/navigation';
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi';
import { useGames } from '@/components/games/GamesProvider';
import { usePanem } from './PanemProvider';

const MESSAGE_LABELS = { rebelion: 'Encender la rebelión', memoria: 'Recordar a los caídos' };

// Cómo está cada uno de los tres: su día (jugado, hoy o todavía no) y los papeles con su nombre en la urna.
function dayStatus(id, { progress, story, day }) {
  if (story.pending?.district === id) return 'Tiene que decidir si pide comida';
  if (progress.litDistricts.includes(id)) return story.tesserae[id] ? 'Pidió comida' : 'No pidió comida';
  return day?.district === id ? 'Hoy' : 'Todavía no';
}

// Una colección del archivo como visor: una fila de celdas (una por pista, encendida si ya la encontraste) y una
// sola tarjeta que pasa con las flechas, en vez de una lista larga de "???".
function ArchiveSlider({ items, empty }) {
  const first = Math.max(0, items.findIndex((it) => it.found));
  const [index, setIndex] = useState(first);
  if (!items.length) return <p className="archive-empty">{empty}</p>;
  const i = Math.min(index, items.length - 1);
  const item = items[i];
  const step = (d) => setIndex((i + d + items.length) % items.length);
  return (
    <div className="archive-slider">
      <div className="archive-cells" role="tablist" aria-label="Elegir">
        {items.map((it, k) => (
          <button key={it.key} type="button" role="tab" aria-selected={k === i} aria-label={it.found ? it.title : `Sin encontrar, Distrito ${it.district}`}
            className={`${it.found ? 'found' : ''} ${k === i ? 'current' : ''}`} onClick={() => setIndex(k)}>{it.district}</button>
        ))}
      </div>
      <div className={`archive-card ${item.found ? 'found' : ''}`} aria-live="polite">
        <button type="button" className="archive-arrow" onClick={() => step(-1)} aria-label="Anterior"><PiCaretLeft aria-hidden="true" /></button>
        <div>
          <small>Distrito {item.district} <span>{i + 1}/{items.length}</span></small>
          {item.found ? <><strong>{item.title}</strong><p>{item.line}</p></> : <><strong>Sin encontrar</strong><p>Seguí buscando en el Distrito {item.district}.</p></>}
        </div>
        <button type="button" className="archive-arrow" onClick={() => step(1)} aria-label="Siguiente"><PiCaretRight aria-hidden="true" /></button>
      </div>
    </div>
  );
}

const asItem = (clue, found) => ({ key: clue.id, district: clue.district, title: clue.title, line: clue.line, found });

// El archivo pirata: lo que la resistencia fue juntando. Reemplaza a los emblemas.
export default function PirateArchive({ onClose }) {
  const panem = usePanem();
  const { progress, story, resetAll } = panem;
  const router = useRouter();
  const games = useGames();
  const [confirming, setConfirming] = useState(null); // 'all' | 'games'
  const panelRef = useRef(null);
  useDismiss([panelRef], onClose);
  const [tab, setTab] = useState('fragmentos');
  const found = new Set(story.fragments);
  const signal = { id: SIGNAL_FRAGMENT, district: '13', title: 'La señal del 13', line: 'Alguien sigue transmitiendo.' };
  const foundHints = HINTS.filter((h) => story.hints.includes(h.id));
  const sections = [
    { id: 'fragmentos', label: 'Fragmentos', count: `${story.fragments.length}/${FRAGMENT_TOTAL}`, items: [...FRAGMENTS, signal].map((f) => asItem(f, found.has(f.id))) },
    { id: 'herramientas', label: 'Herramientas', count: `${story.tools.length}/${TOOLS.length}`, items: TOOLS.map((t) => asItem(t, story.tools.includes(t.id))) },
    { id: 'marcas', label: 'Marcas', count: `${story.marks.length}/${MARK_TOTAL}`, items: MARKS.map((m) => asItem(m, story.marks.includes(m.id))) },
    { id: 'pistas', label: 'Pistas', count: foundHints.length, items: foundHints.map((h) => asItem(h, true)), empty: 'Todavía no encontraste ninguna.' },
  ];
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="archive-title">
      <div ref={panelRef} className="modal-panel archive-panel">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <p className="eyebrow archive-eyebrow">ARCHIVO PIRATA / SEÑAL DEL 13</p>
        <h2 id="archive-title">Lo que el Capitolio no muestra</h2>

        <h3 className="archive-head">Veces que su nombre está en la urna</h3>
        <ul className="archive-papers">
          {STORY_DAYS.map((id) => (
            <li key={id}>
              <span>{PROTAGONISTS[id].name} <small>Distrito {id}, {PROTAGONISTS[id].age} años</small></span>
              <b aria-label={`${story.papers[id]} papeles`}>{story.papers[id]}</b>
              <small>{dayStatus(id, panem)}</small>
            </li>
          ))}
        </ul>

        <div className="archive-tabs" role="tablist" aria-label="Lo que encontraste">
          {sections.map((sec) => (
            <button key={sec.id} type="button" role="tab" aria-selected={tab === sec.id} className={tab === sec.id ? 'active' : ''} onClick={() => setTab(sec.id)}>
              {sec.label} <b>{sec.count}</b>
            </button>
          ))}
        </div>
        {sections.filter((sec) => sec.id === tab).map((sec) => <ArchiveSlider key={sec.id} items={sec.items} empty={sec.empty} />)}

        {progress.finalMessage && <p>Mensaje transmitido / <strong>{MESSAGE_LABELS[progress.finalMessage]}</strong></p>}
        {/* «Ver Panem arder otra vez» quedó afuera junto con el fuego del final (2026-11-05). */}
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
