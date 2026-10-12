'use client';
import { useEffect, useState } from 'react';
const places = {
  forest: ['CAPÍTULO I · SECTOR 07', 'EL BOSQUE'],
  lake: ['CAPÍTULO II · SECTOR 04', 'LA MEMORIA DEL AGUA'],
  tower: ['CAPÍTULO III · SECTOR 12', 'UNA VOZ EN EL CIELO'],
  final: ['EPÍLOGO · TRANSMISIÓN ABIERTA', 'MÁS ALLÁ DE LA ARENA'],
  intro: ['PRÓLOGO · ARCHIVO INTERCEPTADO', 'LA SEÑAL'],
};
export default function MotionLayer({ location }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    // El valor inicial se controla por CSS; React sigue los cambios del usuario.
    const update = () => setPaused(media.matches);
    const frame = requestAnimationFrame(update);
    media.addEventListener('change', update);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    document.body.classList.toggle('motion-paused', paused);
    return () => document.body.classList.remove('motion-paused');
  }, [paused]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .1 });
    document.querySelectorAll('.section-top,.radar-wrap,.mission,.person,footer').forEach((el) => { el.classList.add('reveal-on-scroll'); observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  return <>
    <div className={`chapter-stage ${location && places[location] ? 'active' : ''}`} data-place={location || ''} aria-hidden="true">
      <div className="chapter-backdrop" /><div className="water-glow" /><div className="mist" /><div className="mist second" />
      <div className="atmosphere">{Array.from({ length: 22 }, (_, i) => <i key={i} className="mote" style={{ '--x': `${(i * 37) % 100}%`, '--size': `${1 + i % 3}px`, '--duration': `${14 + i % 11}s`, '--delay': `${-i * 1.7}s` }} />)}</div>
      {location && places[location] && <div className="chapter-caption"><small>{places[location][0]}</small>{places[location][1]}</div>}
    </div>
    <button className="motion-toggle" aria-label="Pausar o activar animaciones" aria-pressed={!paused} onClick={() => setPaused((x) => !x)}>{paused ? '▷ Activar movimiento' : 'Ⅱ Pausar movimiento'}</button>
  </>;
}
