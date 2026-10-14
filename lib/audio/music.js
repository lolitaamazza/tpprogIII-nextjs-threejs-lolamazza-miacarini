// Partitura procedural de La chispa. Puro: se prueba con `node --test`.
export const BPM = 80;
export const STEPS_PER_BAR = 16;
export const BARS = 4;
export const STEP_SECONDS = 60 / BPM / 4;
// Re menor: Dm – Bb – F – C (MIDI)
export const CHORDS = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];
// Motivo original de 4 notas (no es la melodía de las películas).
export const MOTIF = [74, 77, 72, 69];
export const LAYER_BY_DISTRICT = { 12: 'percusion', 11: 'silbido', 4: 'pad' };

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

export function layerTargets({ lit = [], previewDistrict = null, finale = null } = {}) {
  const targets = { percusion: 0, silbido: 0, pad: 0 };
  if (finale) return { percusion: finale === 'memoria' ? 0 : 1, silbido: 1, pad: 1 };
  for (const id of lit) if (LAYER_BY_DISTRICT[id]) targets[LAYER_BY_DISTRICT[id]] = 1;
  const preview = LAYER_BY_DISTRICT[previewDistrict];
  if (preview && !lit.includes(previewDistrict)) targets[preview] = 0.25;
  return targets;
}
