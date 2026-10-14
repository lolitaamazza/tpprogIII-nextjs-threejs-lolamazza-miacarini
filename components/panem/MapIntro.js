'use client';
import { mapIntroCopy } from '@/lib/mapCopy';
import { usePanem } from './PanemProvider';

export default function MapIntro() {
  const { progress } = usePanem();
  const copy = mapIntroCopy({ litCount: progress.litDistricts.length, completed: progress.completedAt !== null });
  return (
    <section className="map-intro" aria-live="polite">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
    </section>
  );
}
