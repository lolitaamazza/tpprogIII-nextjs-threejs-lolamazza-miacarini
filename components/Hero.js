'use client';
import { useRef } from 'react';
const points = [
  ['forest','01','El bosque','SEÑAL DETECTADA'],
  ['lake','02','El lago','ARCHIVO SUMERGIDO'],
  ['tower','03','La torre','FRECUENCIA INACTIVA'],
];
export default function Hero({ progress, onStart, onScene, soundOn, onSound }) {
  const hero = useRef(null);
  const pointerFrame = useRef(0);
  function move(e) {
    if (e.pointerType !== 'mouse' || pointerFrame.current || document.body.classList.contains('motion-paused')) return;
    pointerFrame.current = requestAnimationFrame(() => {
      if (!hero.current) return;
      const r = hero.current.getBoundingClientRect();
      hero.current.style.setProperty('--camera-x', `${(e.clientX - r.left) / r.width * 18 - 9}px`);
      hero.current.style.setProperty('--camera-y', `${(e.clientY - r.top) / r.height * 12 - 6}px`);
      pointerFrame.current = 0;
    });
  }
  function leave() {
    if (!hero.current) return;
    hero.current.style.setProperty('--camera-x','0px');
    hero.current.style.setProperty('--camera-y','0px');
  }
  return <section ref={hero} className="hero" id="arenaView" onPointerMove={move} onPointerLeave={leave}>
    <div className="landscape" /><div className="grain" />
    <div className="atmosphere" aria-hidden="true"><div className="mist" /><div className="mist second" />
      {Array.from({ length: 28 }, (_, i) => <i key={i} className="mote" style={{ '--x': `${(i * 37) % 100}%`, '--size': `${1 + i % 3}px`, '--duration': `${14 + i % 11}s`, '--delay': `${-i * 1.7}s` }} />)}
    </div>
    <div className="coordinates">PANEM / SECTOR 07 <span>35° 42′ N · 82° 18′ W</span></div>
    <div className="hero-copy">
      <p className="eyebrow"><i /> UNA SEÑAL SIGUE VIVA</p>
      <h1>ECOS DE<br />LA <em>ARENA.</em></h1>
      <p className="intro">Los Juegos terminaron.<br />La historia que ocultaron, no.</p>
      <p className="summary">Una transmisión perdida. Tres fragmentos.<br />Un camino que el Capitolio borró del mapa.</p>
      <button id="start" className="primary" onClick={onStart}>{progress.started ? 'Continuar la historia' : 'Entrar en la historia'} <span>↗</span></button>
      <div className="duration">EXPERIENCIA INTERACTIVA <span>·</span> 8–12 MIN</div>
    </div>
    <div className="explore-label">EXPLORA EL TERRITORIO <span>↓</span></div>
    {points.map(([id, number, label, sub]) => <button key={id} className={`hotspot ${id} ${progress.clues.includes(id) ? 'found' : ''}`} onClick={() => onScene(id)} aria-label={`${label}: ${sub}`}>
      <span>{number}</span><strong className="hotspot-label">{label}<small>{sub}</small></strong>
    </button>)}
    <div className="hero-bottom"><span><i className="live" /> CONEXIÓN CLANDESTINA</span><span>EL CAPITOLIO NO CONTROLA LO QUE RECUERDAS.</span>
      <button aria-pressed={soundOn} onClick={onSound}>{soundOn ? '◉ Sonido activado' : '◌ Sonido desactivado'}</button>
    </div>
  </section>;
}
