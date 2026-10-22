'use client';
import { useEffect, useRef } from 'react';
import { PiCubeFocus, PiGlobeHemisphereWest, PiList, PiPause, PiPlay, PiScroll, PiUsers, PiX } from 'react-icons/pi';
import BackLink from '@/components/panem/BackLink';

const STATUS = { local: 'Copia local', cloud: 'Copia de nube actualizada', saving: 'Guardando en nube…', conflict: 'Hay dos versiones' };
const TITLES = { tributes: 'Tributos', chronicle: 'Crónica', menu: 'Archivo' };

// Arriba a la derecha: la vista (arena), los tributos, la crónica, la pausa y el menú. Lo demás queda guardado en
// un cajón que se abre de a uno y se cierra con Esc.
export default function ArchiveBar({ chapter, run, view, onView, paused, onPause, drawer, onDrawer, onInspect, games, quality, onQuality }) {
  const drawerRef = useRef(null);
  const arena = chapter === 'arena' || chapter === 'ended';
  useEffect(() => { if (drawer) drawerRef.current?.focus(); }, [drawer]);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (event) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) onDrawer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, onDrawer]);
  const toggle = (name) => onDrawer(drawer === name ? null : name);
  const icon = (label, Icon, onClick, pressed) => (
    <button type="button" className="archive-icon" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}><Icon aria-hidden="true" /></button>
  );
  const disabled = !!games.conflict || games.status === 'saving';

  return (
    <>
      <nav className="archive-bar" aria-label="Controles del archivo">
        {arena && run && (view === 'table'
          ? icon(`Seguir a ${run.tributes.find((t) => t.id === run.selectedId)?.name ?? 'tu tributo'}`, PiCubeFocus, () => onView('follow'), false)
          : icon('Ver la mesa de los Vigilantes', PiGlobeHemisphereWest, () => onView('table'), false))}
        {run && icon('Tributos', PiUsers, () => toggle('tributes'), drawer === 'tributes')}
        {arena && run && icon('Crónica', PiScroll, () => toggle('chronicle'), drawer === 'chronicle')}
        {icon(paused ? 'Reanudar la escena' : 'Pausar la escena', paused ? PiPlay : PiPause, onPause, paused)}
        {icon('Archivo y guardado', PiList, () => toggle('menu'), drawer === 'menu')}
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
          {drawer === 'menu' && (
            <div className="drawer-menu">
              <label>Detalle <select value={quality} onChange={(e) => onQuality(e.target.value)} aria-label="Calidad visual"><option value="auto">Automático</option><option value="low">Ligero</option><option value="high">Alto</option></select></label>
              <p role="status">{STATUS[games.status]}{games.error ? ` · ${games.error}` : ''}</p>
              {games.conflict && <div className="save-conflict" role="alert"><p>Las partidas son diferentes. Elegí una copia completa; sus eventos no se mezclan.</p><p>Actual: turno {run?.turn ?? 0}. Entrante: turno {games.conflict.turn}.</p><button type="button" onClick={() => games.resolveConflict(false)}>Conservar actual</button><button type="button" onClick={() => games.resolveConflict(true)}>Usar copia entrante</button></div>}
              {run && <div className="save-actions"><button type="button" className="chip" onClick={games.exportRun}>Descargar partida</button>{games.uid && <button type="button" className="chip" disabled={disabled} onClick={games.saveCloud}>Guardar en nube</button>}</div>}
              <label className="import-run">Importar partida <input type="file" accept="application/json,.json" disabled={disabled} onChange={(e) => { games.importRun(e.target.files?.[0]); e.target.value = ''; }} /></label>
              <details className="model-credits"><summary>Créditos de los modelos 3D</summary><p><a href="https://sketchfab.com/3d-models/the-hunger-games-arena-8735e8c171254663bd7db82878915190" target="_blank" rel="noreferrer">The Hunger Games Arena</a> · Flashness. Adaptada y optimizada para esta experiencia.</p><p><a href="https://sketchfab.com/3d-models/rigged-t-pose-human-male-w-50-face-blendshapes-cc7e4596bcd145208a6992c757854c07" target="_blank" rel="noreferrer">Humano masculino</a> · Mike Alger / Doob / High Fidelity. <a href="https://sketchfab.com/3d-models/valery-tpose-blender-rigged-woman-1cce3c0410634a9497fec3afc1fb8eda" target="_blank" rel="noreferrer">Valery</a> · xander.dice. Vestuario, proporciones y movimiento adaptados.</p><p>Materiales PBR, roca fotogramétrica e iluminación: <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven · CC0</a>.</p><p>Modelos de Sketchfab bajo <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p></details>
              <BackLink />
            </div>
          )}
        </aside>
      )}
    </>
  );
}
