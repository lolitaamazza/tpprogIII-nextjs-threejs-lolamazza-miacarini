'use client';
import { useEffect, useRef } from 'react';

// Regla general de los carteles: se cierran con la X, con Esc o tocando afuera.
// `refs`: lo que cuenta como "adentro" (el cartel y, si hace falta, el botón que lo abre).
// `consume`: el toque que cierra no llega a la escena de atrás (para no jugar sin querer al cerrar).
export function useDismiss(refs, onClose, { enabled = true, consume = false } = {}) {
  const latest = useRef({ refs, onClose, consume });
  useEffect(() => { latest.current = { refs, onClose, consume }; });
  useEffect(() => {
    if (!enabled) return undefined;
    const inside = (target) => latest.current.refs.some((ref) => ref.current?.contains(target));
    const onPointer = (event) => {
      if (inside(event.target)) return;
      if (latest.current.consume) event.stopPropagation();
      latest.current.onClose();
    };
    const onKey = (event) => { if (event.key === 'Escape') latest.current.onClose(); };
    // Un ciclo después: el mismo toque que abrió el cartel no lo cierra.
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointer, true));
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled]);
}
