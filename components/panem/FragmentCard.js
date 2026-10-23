'use client';
import { useEffect, useRef } from 'react';
import { useDismiss } from '@/hooks/useDismiss';
import { FRAGMENTS, FRAGMENT_TOTAL } from '@/lib/fragments';
import { usePanem } from './PanemProvider';

const CARD_MS = 9000;

// Un fragmento encontrado: un documento del Capitolio que no debía salir, en el centro.
// Se cierra solo, con la X, con Esc o tocando afuera (ese toque no juega en la maqueta).
export default function FragmentCard() {
  const { shownFragment, closeFragment, story } = usePanem();
  const cardRef = useRef(null);
  useDismiss([cardRef], closeFragment, { enabled: Boolean(shownFragment), consume: true });
  useEffect(() => {
    if (!shownFragment) return undefined;
    const timer = window.setTimeout(closeFragment, CARD_MS);
    return () => clearTimeout(timer);
  }, [shownFragment, closeFragment]);
  const fragment = FRAGMENTS.find((f) => f.id === shownFragment);
  if (!fragment) return null;
  return (
    <aside ref={cardRef} className="fragment-card" role="status" key={fragment.id}>
      <button type="button" className="fragment-close" onClick={closeFragment} aria-label="Cerrar el fragmento">×</button>
      <p className="fragment-meta">Fragmento {story.fragments.length}/{FRAGMENT_TOTAL} · Distrito {fragment.district}</p>
      <span className="fragment-stamp" aria-hidden="true">Classified</span>
      <h2>{fragment.title}</h2>
      <p className="fragment-line">{fragment.line}</p>
    </aside>
  );
}
