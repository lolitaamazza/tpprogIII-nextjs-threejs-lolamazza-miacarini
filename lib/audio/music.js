// Partitura procedural de Panem. Puro: se prueba con `node --test`.
export const BPM = 80;
export const STEPS_PER_BAR = 16;
export const BARS = 4;
export const STEP_SECONDS = 60 / BPM / 4;
// Re menor: Dm – Bb – F – C (MIDI)
export const CHORDS = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];
// Motivo original de 4 notas (no es la melodía de las películas).
export const MOTIF = [74, 77, 72, 69];
export const LAYER_BY_DISTRICT = { 1:'pad',2:'percusion',3:'silbido',4:'pad',5:'pad',6:'percusion',7:'percusion',8:'silbido',9:'pad',10:'silbido',11:'silbido',12:'percusion' };

export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function eventsForStep(step, finale = null) {
  const bar = Math.floor(step / STEPS_PER_BAR) % BARS;
  const s = step % STEPS_PER_BAR;
  const events = [];
  const kicks = finale === 'rebelion' ? [0, 2, 6, 8, 10, 14] : [0, 6, 8, 14];
  if (kicks.includes(s)) events.push({ layer: 'percusion', type: 'kick' });
  if (s === 4 || s === 12) events.push({ layer: 'percusion', type: 'hit' });
  if (s === 0) {
    const notes = finale === 'rebelion' && bar === BARS - 1 ? [50, 54, 57] : CHORDS[bar];
    events.push({ layer: 'pad', type: 'chord', notes, seconds: STEP_SECONDS * STEPS_PER_BAR });
  }
  if (bar % 2 === 1 && s % 4 === 0) {
    events.push({ layer: 'silbido', type: 'note', midi: MOTIF[s / 4], length: finale === 'memoria' ? 0.7 : 0.35 });
  }
  return events;
}

const level = (percusion, silbido, pad) => ({ percusion, silbido, pad });
const GAMES = { reaping: level(0.45, 0, 0), preparation: level(0, 0, 0.5), arena: level(0.8, 0, 0.5), ended: level(0, 0.5, 0.6) };

// Volumen de cada capa según dónde se está (no lo encendido en todo el recorrido): el mapa es calmo,
// la jornada del día suena con su capa, las teselas se deciden en silencio y la arena es la más intensa.
// `today`: el distrito que se juega ahora; `deciding`: la decisión de teselas pendiente en este distrito.
export function layerTargets({ scene = 'mapa', chapter = null, lit = [], district = null, today = null, deciding = false, finale = null } = {}) {
  if (finale) return level(finale === 'memoria' ? 0 : 1, 1, 1);
  if (scene === 'intro') return level(0, 0, 0);
  if (scene === 'mapa') return level(0, lit.includes('11') ? 0.3 : 0, lit.length ? 0.5 : 0.35);
  if (scene === 'games') return GAMES[chapter] ?? level(0, 0, 0.4);
  if (scene === 'distrito') {
    if (deciding) return level(0, 0, 0);
    const layer = LAYER_BY_DISTRICT[district];
    if (!layer || district !== today) return level(0, 0, 0.25);
    return { ...level(0, 0, 0.3), [layer]: 0.7 };
  }
  return level(0, 0, 0.4);
}
