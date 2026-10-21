'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { usePanem } from '@/components/panem/PanemProvider';
const SYMBOLS = { decision: '◈', hazard: '☁', encounter: '⚔', elimination: '✕', alliance: '∞', supply: '✚', rest: '☾', opening: '◉', move: '➜', winner: '♜', final: '◈' };
const LABELS = { decision: 'TU DECISIÓN', hazard: 'PELIGRO', encounter: 'ENCUENTRO', elimination: 'SEÑAL PERDIDA', alliance: 'ALIANZA', supply: 'SUMINISTROS', rest: 'RECUPERACIÓN', opening: 'EN DIRECTO', move: 'DESPLAZAMIENTO', winner: 'SOBREVIVIENTE', final: 'ÚLTIMO DESAFÍO' };
export default function LiveBroadcast({ run, onInspect, paused }) {
  const events = run.events.filter((e) => e.turn === run.turn);
  const [eventIndex, setEventIndex] = useState(0);
  const selected = events[eventIndex] || events.find((e) => e.actors.includes(run.selectedId)) || events[0];
  const ref = useRef(null);
  const animation = useRef(null);
  const { reducedMotion, stageApiRef } = usePanem();
  useEffect(() => {
    if (!selected) return;
    const dangerous = ['elimination', 'hazard', 'encounter'].includes(selected.type);
    const scope = gsap.context(() => {
      animation.current = gsap.timeline();
      if (!reducedMotion) {
        animation.current.from('.event-spotlight', { y: 14, opacity: 0, duration: .45, ease: 'power2.out' });
        if (dangerous) animation.current.to('.signal-noise', { opacity: .22, duration: .08 }).to('.event-spotlight', { x: 4, duration: .06 }).to('.event-spotlight', { x: -3, duration: .06 }).to('.event-spotlight', { x: 0, duration: .1 }).to('.signal-noise', { opacity: 0, duration: .2 });
        animation.current.from('.event-actor', { scale: .9, opacity: 0, duration: .3, stagger: .1 }, 0);
      }
    }, ref);
    return () => { scope.revert(); animation.current = null; };
  }, [selected, reducedMotion]);
  useEffect(() => { if (paused) animation.current?.pause(); else animation.current?.resume(); }, [paused, selected]);
  function show(index) { setEventIndex(index); stageApiRef.current?.focusGamesTribute(events[index]?.actors[0]); }
  if (!selected) return null;
  return <section className={`live-broadcast broadcast-${selected.type}`} ref={ref} aria-label="Transmisión en vivo">
    <div className="signal-noise" aria-hidden="true" />
    <article className="event-spotlight" aria-live="polite" aria-atomic="true">
      <div className="event-topline"><span><i /> {LABELS[selected.type] || 'ARCHIVO'}</span><span>T{run.turn.toString().padStart(2,'0')} / {eventIndex + 1} de {events.length}</span></div>
      <div className="event-visual"><span className="event-symbol" aria-hidden="true">{SYMBOLS[selected.type] || '◈'}</span><div className="event-actors">{selected.actors.slice(0,3).map((id) => { const actor = run.tributes.find((t) => t.id === id); return actor && <button key={id} className="event-actor" onClick={() => onInspect(id)}><span>D{actor.district}</span><b>{actor.name}</b><small>{actor.alive ? `${actor.health} salud` : 'En memoria'}</small></button>; })}</div></div>
      <p className="event-story">{selected.text}</p>
      {selected.changes && <div className="event-changes">{selected.changes.map(({stat,value}) => <span key={stat} className={value < 0 ? 'negative' : ''}>{value > 0 ? '+' : ''}{value} {({health:'salud',energy:'energía',food:'comida',water:'agua',equipment:'equipo'})[stat] || stat}</span>)}</div>}
      <div className="event-navigation"><button disabled={eventIndex === 0} onClick={() => show(eventIndex-1)} aria-label="Evento anterior">←</button><span>Lo que está pasando</span><button disabled={eventIndex >= events.length-1} onClick={() => show(eventIndex+1)} aria-label="Evento siguiente">→</button></div>
    </article>
    <div className="event-ribbon" aria-label="Eventos de este turno">{events.map((event,i) => <button key={i} aria-pressed={i===eventIndex} onClick={() => show(i)}><span aria-hidden="true">{SYMBOLS[event.type] || '◈'}</span><span>{event.actors.length ? event.actors.slice(0,2).map((id) => run.tributes.find((t) => t.id===id)?.name).join(' + ') : 'La arena'}</span><small>{LABELS[event.type] || 'EVENTO'}</small></button>)}</div>
  </section>;
}
