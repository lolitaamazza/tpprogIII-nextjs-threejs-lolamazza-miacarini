// Secuencia "Panem arde": reglas puras (sin DOM ni imports con alias) para probarlas con `node --test`.
import { canEnterCapitol, withLitDistrict } from './progress.js';
import { MAP_IDS } from '../data/districts.js';

export const BURN_MESSAGE = 'If we burn, you burn with us';

// La grabación de «The Hanging Tree» tiene derechos de autor y NO viene en el repositorio:
// cada quien pone su copia en public/audio/. Si el archivo no está, la secuencia corre igual, en silencio.
export const BURN_AUDIO_SRC = '/audio/the-hanging-tree.mp3';
export const BURN_AUDIO_VOLUME = 0.85;
export const BURN_DUCK_LEVEL = 0.05; // la música procedural baja para que se oiga la canción

export const BURN_TIMING = Object.freeze({
  messageAt: 1800, // ms desde que se enciende: entra la primera palabra
  wordStaggerMs: 420, // separación entre palabras
  subtitleGapMs: 700, // el subtítulo entra después de la última palabra
  actionsGapMs: 1400, // y los botones, después del subtítulo
  songFadeInMs: 2500,
  leaveMs: 1400, // al salir, el fuego y la canción se apagan en este tiempo
});

// Con movimiento reducido no hay llamas animadas ni palabras que entran una a una: todo aparece de una vez.
export function burnPlan({ reducedMotion = false } = {}) {
  const words = BURN_MESSAGE.split(' ');
  if (reducedMotion) {
    return { animated: false, words, delays: words.map(() => 0), subtitleAt: 0, actionsAt: 1500 };
  }
  const delays = words.map((_, i) => BURN_TIMING.messageAt + i * BURN_TIMING.wordStaggerMs);
  const subtitleAt = delays.at(-1) + BURN_TIMING.subtitleGapMs;
  return { animated: true, words, delays, subtitleAt, actionsAt: subtitleAt + BURN_TIMING.actionsGapMs };
}

// Solo se prende cuando ESTE emblema es el que completa los tres (no al recargar con 3/3, no al repetir un distrito).
export function completesEmblems(progress, districtId) {
  if (canEnterCapitol(progress)) return false;
  return canEnterCapitol(withLitDistrict(progress, districtId));
}

// Durante el incendio se ven encendidos todos los distritos del mapa, salvo el Capitolio y el 13:
// esos dos los enciende el final de /capitolio, así la revelación del Distrito 13 sigue siendo una sorpresa.
export const BURN_LIT_IDS = Object.freeze(MAP_IDS.filter((id) => id !== 'c' && id !== '13'));

// Volumen en el instante `elapsedMs` de un fundido lineal de `from` a `to` que dura `durationMs`.
export function volumeAt(elapsedMs, durationMs, from, to) {
  if (durationMs <= 0) return to;
  const t = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return from + (to - from) * t;
}
