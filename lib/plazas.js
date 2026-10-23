// La Cosecha por plazas: el tren pasa por la plaza del 12, la del 11 y la del 4, y en cada una se saca un papel.
// Quién fue a los Juegos lo decidió la urna al abrir la edición (`run.protagonist`, con los papeles de cada uno);
// en las otras dos plazas sale otro chico o chica del distrito (los mismos nombres que usan los Juegos de Lola).
// Puro: se prueba con `node --test`.
import { ALTERNATES } from './games/simulation.js';
import { PROTAGONISTS, papersLine } from './story.js';

export const PLAZA_ORDER = ['12', '11', '4'];
// Lo que dura el viaje en tren entre una plaza y otra (o del mapa a un distrito), en segundos.
export const TRAIN_SECONDS = 5;

export function plazaDraws(run, papers) {
  const reaped = PLAZA_ORDER.find((d) => PROTAGONISTS[d].tributeId === run?.protagonist);
  if (!reaped) return [];
  return PLAZA_ORDER.map((district) => {
    const { name, tributeId } = PROTAGONISTS[district];
    const protagonist = district === reaped;
    return {
      district,
      protagonist,
      name: protagonist ? name : ALTERNATES[tributeId],
      line: protagonist ? papersLine(district, papers) : `${name} se salvó este año. ${papersLine(district, papers)}`,
    };
  });
}
