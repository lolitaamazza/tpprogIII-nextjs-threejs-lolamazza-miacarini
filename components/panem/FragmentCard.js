'use client';
import { useEffect, useRef } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
import { clueById, clueMeta } from '@/lib/clues';
import { FRAGMENTS } from '@/lib/fragments';
import { DOCS, NOTES, tallyGroups } from '@/lib/notes';
import { usePanem } from './PanemProvider';

const CARD_MS = 9000;
// Los papeles del Capitolio (a máquina, con membrete). Los fragmentos que son documentos también.
const PRINTED = new Set(['p-12-cartel', 'p-11-envio']);

// Cómo se ve cada cosa encontrada: una nota escrita a mano (`hand`, lo que dice el papel de verdad, ver lib/notes.js),
// un documento del Capitolio a máquina (`doc`) o un objeto registrado por el visor (`tag`: herramientas, marcas, objetos).
function paperFor(clue) {
  if (NOTES[clue.id]) return 'hand';
  if (DOCS[clue.id] || PRINTED.has(clue.id)) return 'doc';
  if (clue.kind === 'fragment') return FRAGMENTS.find((f) => f.id === clue.id)?.kind === 'document' || clue.district === '13' ? 'doc' : 'tag';
  return 'tag';
}

const hand = (name) => ({ fontFamily: `var(--hand-${name})` });

// Rayas de a cinco: cuatro palitos y uno que los cruza.
function Tally({ n }) {
  return (
    <span className="note-tally" aria-hidden="true">
      {tallyGroups(n).map((count, g) => (
        <svg key={g} viewBox="0 0 60 44">
          {Array.from({ length: Math.min(count, 4) }, (_, i) => <path key={i} d={`M${10 + i * 11} ${6 + (i % 2)} L${8 + i * 11} 38`} />)}
          {count === 5 && <path d="M2 30 L56 12" />}
        </svg>
      ))}
    </span>
  );
}

// Las cuatro notas del silbido, dibujadas en un pentagrama torcido.
function Whistle() {
  return (
    <svg className="note-whistle" viewBox="0 0 220 60" aria-hidden="true">
      {[14, 24, 34, 44].map((y) => <path key={y} d={`M4 ${y} Q110 ${y - 3} 216 ${y + 1}`} className="staff" />)}
      {[[40, 34], [80, 24], [120, 44], [160, 29]].map(([x, y]) => <g key={x}><ellipse cx={x} cy={y} rx="7" ry="5" transform={`rotate(-20 ${x} ${y})`} /><path d={`M${x + 6} ${y - 2} V${y - 26}`} /></g>)}
    </svg>
  );
}

function NoteBody({ note }) {
  return note.blocks.map((b, i) => {
    const style = b.hand ? hand(b.hand) : undefined;
    if (b.t === 'title') return <p key={i} className="note-title">{b.s}</p>;
    if (b.t === 'tally') return <Tally key={i} n={b.n} />;
    if (b.t === 'notes') return <Whistle key={i} />;
    if (b.t === 'strike') return <p key={i} className="note-text"><s>{b.s}</s></p>;
    if (b.t === 'sign') return <p key={i} className="note-sign" style={style}>{b.s}</p>;
    if (b.t === 'cols') {
      return (
        <div key={i} className="note-cols">
          {[b.left, b.right].map((col, c) => <ul key={c}>{col.map((line, k) => <li key={line} className={k === 0 ? 'head' : ''}>{line}</li>)}</ul>)}
        </div>
      );
    }
    return <p key={i} className="note-text" style={style}>{b.s}</p>;
  });
}

// Un documento del Capitolio como el papel de verdad: títulos, tablas, sellos, firmas tachadas y lo escrito encima a mano.
function DocBody({ doc }) {
  return doc.blocks.map((b, i) => {
    if (b.t === 'head') return <p key={i} className="doc-head">{b.s}</p>;
    if (b.t === 'big') return <p key={i} className="doc-big">{b.s}</p>;
    if (b.t === 'stamp') return <p key={i} className="doc-stamp">{b.s}</p>;
    if (b.t === 'strike') return <p key={i} className="doc-line"><s>{b.s}</s></p>;
    if (b.t === 'scrawl') return <p key={i} className="doc-scrawl" style={hand(b.hand)}>{b.s}</p>;
    if (b.t === 'rows') {
      return (
        <table key={i} className="doc-rows"><tbody>
          {b.rows.map((row, r) => <tr key={r} className={r === 0 && b.rows[0].length > 2 ? 'head' : ''}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}
        </tbody></table>
      );
    }
    return <p key={i} className="doc-line">{b.s}</p>;
  });
}

// Lo recién encontrado, en el centro. Se cierra solo (salvo las notas largas), con la X, con Esc o tocando afuera
// (ese toque no juega en la escena).
export default function FragmentCard() {
  const { shownFragment, closeFragment, story } = usePanem();
  const cardRef = useRef(null);
  useDismiss([cardRef], closeFragment, { enabled: Boolean(shownFragment), consume: true });
  useEffect(() => {
    if (!shownFragment || clueById(shownFragment)?.detail || NOTES[shownFragment] || DOCS[shownFragment]) return undefined;
    const timer = window.setTimeout(closeFragment, CARD_MS);
    return () => clearTimeout(timer);
  }, [shownFragment, closeFragment]);
  const clue = clueById(shownFragment);
  if (!clue) return null;
  const paper = paperFor(clue);
  const note = NOTES[clue.id];
  const doc = DOCS[clue.id];
  return (
    <aside ref={cardRef} className={`fragment-card fragment-card-${clue.kind} paper-${paper}`} role="status" key={clue.id}>
      <button type="button" className="fragment-close" onClick={closeFragment} aria-label="Cerrar la tarjeta">×</button>
      <p className="fragment-meta">{clueMeta(clue, story)}</p>
      {paper === 'doc' && <p className="paper-letterhead" aria-hidden="true">Capitolio de Panem</p>}
      {clue.kind === 'fragment' && <span className="fragment-stamp" aria-hidden="true">Classified</span>}
      {note ? (
        <div className="note-paper" style={hand(note.hand)}>
          <h2 className="sr-only">{clue.title}</h2>
          <p className="sr-only">{clue.detail ?? clue.line}</p>
          <div aria-hidden="true"><NoteBody note={note} /></div>
        </div>
      ) : doc ? (
        <div className="doc-paper">
          <h2 className="sr-only">{clue.title}</h2>
          <p className="sr-only">{clue.detail ?? clue.line}</p>
          <div aria-hidden="true"><DocBody doc={doc} /></div>
        </div>
      ) : (
        <>
          <h2>{clue.title}</h2>
          <p className="fragment-line">{clue.detail ?? clue.line}</p>
        </>
      )}
    </aside>
  );
}
