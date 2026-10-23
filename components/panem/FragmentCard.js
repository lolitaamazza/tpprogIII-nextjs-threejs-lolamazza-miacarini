'use client';
import { useEffect, useRef } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
import { clueById, clueMeta } from '@/lib/clues';
import { usePanem } from './PanemProvider';

const CARD_MS = 9000;

// Lo recién encontrado, en el centro: un fragmento (un documento del Capitolio que no debía salir, con su sello),
// una herramienta, una marca del sinsajo o una pista. Se cierra solo, con la X, con Esc o tocando afuera
// (ese toque no juega en la maqueta).
export default function FragmentCard() {
  const { shownFragment, closeFragment, story } = usePanem();
  const cardRef = useRef(null);
  useDismiss([cardRef], closeFragment, { enabled: Boolean(shownFragment), consume: true });
  useEffect(() => {
    if (!shownFragment) return undefined;
    const timer = window.setTimeout(closeFragment, CARD_MS);
    return () => clearTimeout(timer);
  }, [shownFragment, closeFragment]);
  const clue = clueById(shownFragment);
  if (!clue) return null;
  return (
    <aside ref={cardRef} className={`fragment-card fragment-card-${clue.kind}`} role="status" key={clue.id}>
      <button type="button" className="fragment-close" onClick={closeFragment} aria-label="Cerrar la tarjeta">×</button>
      <p className="fragment-meta">{clueMeta(clue, story)}</p>
      {clue.kind === 'fragment' && <span className="fragment-stamp" aria-hidden="true">Classified</span>}
      <h2>{clue.title}</h2>
      <p className="fragment-line">{clue.line}</p>
    </aside>
  );
}
