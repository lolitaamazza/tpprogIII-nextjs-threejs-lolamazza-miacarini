'use client';
import Link from 'next/link';
import { mapIntroCopy } from '@/lib/mapCopy';
import { usePanem } from './PanemProvider';

export default function MapIntro() {
  const { progress, story, storyReady, day, phase } = usePanem();
  // Hasta leer la historia guardada no se sabe qué día es: mejor no mostrar el día equivocado.
  if (!storyReady) return <section className="map-intro" aria-live="polite" />;
  const copy = mapIntroCopy({ phase, day, pending: story.pending, completed: progress.completedAt !== null });
  return (
    <section className="map-intro" aria-live="polite">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
      {copy.action && <Link className="primary map-intro-action" href={copy.action.href}>{copy.action.label}</Link>}
    </section>
  );
}
