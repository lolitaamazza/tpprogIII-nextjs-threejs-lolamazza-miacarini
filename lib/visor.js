// El visor de las escenas: lo que ve el personaje sobre su distrito (quién es, la comida que queda en su casa, los
// papeles en la urna, los días que faltan, quién depende de él o ella y su pulso). Puro: se prueba con `node --test`.
import { PROTAGONISTS, STORY_DAYS } from './story.js';

export const PORTIONS_TOTAL = 8;
// Pedir comida llena la casa por unos días (y suma su nombre en la urna).
const FED = 4;
// El pulso según el momento: tranquilo, en la jornada (el reflector, el carbón, la red) o al decidir.
const PULSE = { calm: 76, decision: 94, job: 112 };

export function visorState({ id, story, moment = 'calm' }) {
  const who = PROTAGONISTS[id];
  if (!who) return null;
  const asked = (story.tesserae?.[id] ?? 0) > 0;
  return {
    name: who.name,
    age: who.age,
    district: id,
    portions: { left: Math.min(PORTIONS_TOTAL, who.portions + (asked ? FED : 0)), total: PORTIONS_TOTAL },
    papers: story.papers[id],
    days: STORY_DAYS.length - STORY_DAYS.indexOf(id),
    family: who.family,
    pulse: PULSE[moment] ?? PULSE.calm,
  };
}
