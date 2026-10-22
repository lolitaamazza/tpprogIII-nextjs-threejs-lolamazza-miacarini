// Lo que muestra el HUD de un distrito (sin panel: arriba el título y una pista, abajo el avance y las vidas).
// Puro: se prueba con `node --test`.
import { helpLevel } from './minigame.js';

const NONE = { title: null, hint: null, score: null, lives: null, lost: null, help: null, action: null, birds: false, tag: null, signal: null };

export function districtHud({ district, match = null, lit = false, revealed = false, progress = 0, webgl = true }) {
  if (district.classified) {
    return {
      ...NONE, kind: 'classified',
      tag: { text: revealed ? 'Señal recuperada' : 'Acceso denegado', live: revealed },
      signal: revealed || !webgl ? null : progress,
    };
  }
  const title = `${district.number} · ${district.industry}`;
  if (!district.playable) return { ...NONE, kind: 'info', title, hint: district.quote };
  if (lit) return { ...NONE, kind: 'done', title, hint: 'Emblema obtenido.' };
  if (!match) return { ...NONE, kind: 'play', title, hint: district.instruction, action: district.actionLabel };

  const singing = match.step === 'song';
  const lost = match.phase === 'lost';
  // La pista acompaña hasta la primera jugada de cada parte (en el silbido, hasta la primera nota bien).
  const fresh = singing ? match.stepScore === 0 : match.score === 0 && match.livesLeft === match.lives && match.attempt === 1;
  return {
    ...NONE, kind: 'play', title,
    hint: !lost && match.prompt ? match.prompt : fresh && !lost ? (singing ? district.songInstruction : district.instruction) : null,
    inputs: match.inputs ?? null,
    score: { label: singing ? district.hud.song : district.hud.score, value: match.stepScore ?? match.score, total: match.stepGoal ?? match.goal },
    lives: { label: district.hud.lives, left: match.livesLeft, total: match.lives },
    lost: lost ? district.lostMessage : null,
    help: helpLevel(match) > 0 && !lost ? district.helpNote : null,
    action: lost ? null : singing ? district.songActionLabel : district.actionLabel,
    birds: singing && !lost,
  };
}
