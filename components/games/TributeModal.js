'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { getDistrict } from '@/data/districts';
import { ZONES } from '@/lib/games/simulation';
import TributePortrait from './TributePortrait';
const STATS = { strength:'Fuerza', agility:'Agilidad', survival:'Supervivencia', stealth:'Sigilo', empathy:'Empatía' };
export default function TributeModal({ tribute, canSelect, disabled, onSelect, onClose, reducedMotion }) {
  const dialog = useRef(null);
  const district = getDistrict(tribute.district);
  const strongest = Object.keys(STATS).sort((a,b) => tribute[b]-tribute[a])[0];
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node.showModal();
    const animation = gsap.context(() => {
      if (!reducedMotion) gsap.from('.dossier-content', { y: 25, opacity: 0, duration: .45, ease: 'power3.out' });
      gsap.from('.dossier-stat-fill', { scaleX: reducedMotion ? 1 : 0, transformOrigin:'left', duration: reducedMotion ? 0 : .7, stagger: .07 });
    }, node);
    return () => { animation.revert(); node.close(); previous?.focus?.(); };
  }, [reducedMotion]);
  return <dialog ref={dialog} className="tribute-dossier" aria-labelledby="dossier-title" onCancel={(e) => {e.preventDefault();onClose();}} onClick={(e) => {if(e.target===e.currentTarget)onClose();}}>
    <div className="dossier-content"><button className="dossier-close" onClick={onClose} aria-label="Cerrar ficha">×</button>
      <div className="dossier-portrait"><TributePortrait tribute={tribute} reducedMotion={reducedMotion}/><span className="dossier-stamp">DISTRITO {tribute.district}<small>{district.industry}</small></span></div>
      <div className="dossier-info"><p className="eyebrow">CAPITOL FILE · {tribute.id.replace('tribute-','').padStart(2,'0')} <span className="capitol-stamp">Property of the Capitol</span></p><h2 id="dossier-title">{tribute.name}</h2><p className="dossier-trait">Su ventaja: {STATS[strongest].toLowerCase()}.</p><p>{district.quote}</p>
        <div className="dossier-stats">{Object.entries(STATS).map(([key,label]) => <div key={key}><span>{label}<b>{tribute[key]}/100</b></span><div className="dossier-stat-track"><i className="dossier-stat-fill" style={{width:`${tribute[key]}%`}} /></div></div>)}</div>
        <p className="dossier-condition">{tribute.alive ? `${ZONES[tribute.zone]} · Salud ${tribute.health} · Energía ${tribute.energy}` : `Caído en el turno ${tribute.eliminatedTurn}`}</p>
        {canSelect && <button className="primary" disabled={disabled} onClick={() => onSelect(tribute.id)}>Acompañar a {tribute.name}</button>}
        <button className="dossier-back" onClick={onClose}>{canSelect ? 'Seguir conociendo tributos' : 'Volver a la transmisión'}</button>
      </div>
    </div>
  </dialog>;
}
