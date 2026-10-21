// Una partida de minijuego: objetivo, vidas (redes, intentos...), ganar, perder y reintentar.
// Puro: se prueba con `node --test`. Cada distrito decide qué es un punto y qué cuesta una vida.

export function createMatch({ goal, lives, completed = false }) {
  return { phase: completed ? 'won' : 'playing', score: completed ? goal : 0, goal, lives, livesLeft: lives, attempt: 1, losses: 0 };
}

// Lo que pasó en una jugada: `points` suma al objetivo (o resta, sin bajar de cero) y `cost` gasta vidas.
// Ganar se mira antes que perder.
export function resolve(match, { points = 0, cost = 0 } = {}) {
  if (match.phase !== 'playing') return match;
  const score = Math.max(0, Math.min(match.goal, match.score + points));
  const livesLeft = Math.max(0, match.livesLeft - cost);
  if (score >= match.goal) return { ...match, score, livesLeft, phase: 'won' };
  if (livesLeft === 0) return { ...match, score, livesLeft, phase: 'lost', losses: match.losses + 1 };
  return { ...match, score, livesLeft };
}

export function retry(match) {
  if (match.phase !== 'lost') return match;
  return { ...match, phase: 'playing', score: 0, livesLeft: match.lives, attempt: match.attempt + 1 };
}

// Perder dos veces trae ayuda: cada juego la usa para ser más generoso (ventanas más anchas, red más grande).
export function helpLevel(match) {
  return match.losses >= 2 ? 1 : 0;
}
