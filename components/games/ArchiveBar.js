'use client';
import { useEffect, useRef } from 'react';
import { PiCubeFocus, PiGlobeHemisphereWest, PiPause, PiPlay, PiScroll, PiUsers, PiX } from 'react-icons/pi';
import { useDismiss } from '@/hooks/useDismiss';

const TITLES = { tributes: 'Tributos', chronicle: 'Crónica' };

// Arriba a la derecha: la vista (arena), los tributos, la crónica y la pausa. Tributos y crónica se abren en un
// cajón, de a uno; se cierra con la X, con Esc o tocando afuera.
export default function ArchiveBar({ chapter, run, view, onView, paused, onPause, drawer, onDrawer, onInspect }) {
  const drawerRef = useRef(null);
  const barRef = useRef(null);
  // Afuera = ni el cajón ni la barra (si no, tocar el ícono abierto lo cerraría y lo volvería a abrir).
  // Con una ficha abierta (dialog), Esc y los toques son de la ficha.
  useDismiss([drawerRef, barRef], () => { if (!document.querySelector('dialog[open]')) onDrawer(null); }, { enabled: Boolean(drawer) });
  const arena = chapter === 'arena' || chapter === 'ended';
  useEffect(() => { if (drawer) drawerRef.current?.focus(); }, [drawer]);
  const toggle = (name) => onDrawer(drawer === name ? null : name);
  const icon = (label, Icon, onClick, pressed) => (
    <button type="button" className="archive-icon" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}><Icon aria-hidden="true" /></button>
  );

  return (
    <>
      <nav ref={barRef} className="archive-bar" aria-label="Controles del archivo">
        {arena && run && (view === 'table'
          ? icon(`Seguir a ${run.tributes.find((t) => t.id === run.selectedId)?.name ?? 'tu tributo'}`, PiCubeFocus, () => onView('follow'), false)
          : icon('Ver la mesa de los Vigilantes', PiGlobeHemisphereWest, () => onView('table'), false))}
        {run && icon('Tributos', PiUsers, () => toggle('tributes'), drawer === 'tributes')}
        {arena && run && icon('Crónica', PiScroll, () => toggle('chronicle'), drawer === 'chronicle')}
        {icon(paused ? 'Reanudar la escena' : 'Pausar la escena', paused ? PiPlay : PiPause, onPause, paused)}
      </nav>
      {drawer && (
        <aside ref={drawerRef} tabIndex={-1} className="archive-drawer" aria-label={TITLES[drawer]}>
          <header><p className="eyebrow">{TITLES[drawer]}</p><button type="button" className="archive-icon" aria-label="Cerrar" onClick={() => onDrawer(null)}><PiX aria-hidden="true" /></button></header>
          {drawer === 'tributes' && run && (
            <ol className="drawer-tributes">
              {run.tributes.map((t) => (
                <li key={t.id}>
                  <button type="button" className={`${t.alive ? '' : 'fallen'}${t.id === run.selectedId ? ' mine' : ''}`} onClick={() => onInspect(t.id)}>
                    <span>{String(t.district).padStart(2, '0')}</span> {t.name}
                    <small>{t.alive ? (t.id === run.selectedId ? 'Tu tributo' : 'En pie') : `Cayó · T${t.eliminatedTurn}`}</small>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {drawer === 'chronicle' && run && (
            <ol className="drawer-chronicle" reversed>
              {[...run.events].reverse().map((event, i) => <li key={i} className={`event-${event.type}`}><small>T{event.turn}</small> {event.text}</li>)}
            </ol>
          )}
        </aside>
      )}
    </>
  );
}
