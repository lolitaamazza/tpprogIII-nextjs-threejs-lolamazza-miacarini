// La entrada al archivo de los Juegos: la resistencia lo intercepta por la frecuencia del Distrito 13.
// Puro: se prueba con `node --test`. Los textos son del mundo (del Capitolio), por eso en inglés.
export const INTERCEPT_LINES = [
  { at: 0.15, text: 'FREQ 13.00 · LINK ESTABLISHED' },
  { at: 0.55, text: 'CAPITOL ARCHIVE · GAMES DIVISION' },
  { at: 0.95, text: 'ACCESS DENIED', tone: 'denied' },
  { at: 1.55, text: 'ACCESS GRANTED', tone: 'granted' },
];
const DONE_AT = 2.5;
const CALM_DONE_AT = 1.2; // con movimiento reducido: todo de una vez, un momento para leerlo

export function interceptAt(t, { reducedMotion = false } = {}) {
  if (reducedMotion) return { lines: INTERCEPT_LINES, phase: t >= CALM_DONE_AT ? 'done' : 'granted' };
  const lines = INTERCEPT_LINES.filter((line) => t >= line.at);
  const tone = lines.findLast((line) => line.tone)?.tone;
  return { lines, phase: t >= DONE_AT ? 'done' : tone ?? 'connecting' };
}
