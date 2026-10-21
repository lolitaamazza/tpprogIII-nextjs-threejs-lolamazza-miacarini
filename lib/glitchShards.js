// Distrito 13: la imagen se rompe en fragmentos que se pueden empujar y arrastrar. Puro: se prueba con `node --test`.
// Coordenadas normalizadas de pantalla: x de 0 a 1 hacia la derecha, y de 0 a 1 hacia abajo.

export const REVEAL_SHARE = 0.3; // con un 30 % de los fragmentos movidos aparece el mensaje oculto
const MOVED = 0.06; // cuánto hay que correr un fragmento para que cuente como movido
const SPRING = 6;
const DAMPING = 4.9;
const PUSH_RADIUS = 0.12;
const PUSH_FORCE = 1.6;
const OPEN_GAP = 0.012; // aire entre la ventana abierta y los pedazos que se corrieron

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Cortes de [0, 1] en tramos de largo entre min y max; el último absorbe el resto.
function cuts(random, min, max) {
  const out = [];
  let at = 0;
  while (at < 1) {
    let size = min + random() * (max - min);
    if (1 - (at + size) < min) size = 1 - at;
    out.push([at, size]);
    at += size;
  }
  return out;
}

// Franjas horizontales partidas en bloques, como una señal que se desarma.
export function shardLayout({ seed = 13 } = {}) {
  const random = lcg(seed);
  const shards = [];
  for (const [y, h] of cuts(random, 0.05, 0.16)) {
    for (const [x, w] of cuts(random, 0.05, 0.32)) shards.push({ id: shards.length, x, y, w, h });
  }
  return shards;
}

// Cada fragmento vuelve a su lugar de reposo (rx, ry), que no siempre es el original: la imagen está rota.
export function createShards(layout) {
  return {
    shards: layout.map((s) => ({ ...s, rx: 0, ry: 0, ox: 0, oy: 0, vx: 0, vy: 0, moved: 0 })),
    drag: null,
  };
}

// La rotura: algunas franjas enteras quedan corridas hacia un costado, como una señal que perdió la sincronía.
export function breakShards(state, { seed = 31 } = {}) {
  const random = lcg(seed);
  for (const y of [...new Set(state.shards.map((s) => s.y))]) {
    if (random() >= 0.38) continue;
    const slip = (random() < 0.5 ? -1 : 1) * (0.012 + random() * 0.028);
    for (const s of state.shards) if (s.y === y) { s.rx = slip; s.ox = slip; }
  }
  return state;
}

// Al descubrir la señal, los pedazos que tapan `rect` se corren hacia el costado más cercano y se quedan ahí.
// Con `instant` ya aparecen corridos (para quien vuelve al Distrito 13 después de haberlo descubierto).
export function openShards(state, rect, { instant = false } = {}) {
  const middle = (rect.x0 + rect.x1) / 2;
  for (const s of state.shards) {
    const x = s.x + s.rx;
    const y = s.y + s.ry;
    if (x >= rect.x1 || x + s.w <= rect.x0 || y >= rect.y1 || y + s.h <= rect.y0) continue;
    s.rx = x + s.w / 2 < middle ? rect.x0 - OPEN_GAP - s.w - s.x : rect.x1 + OPEN_GAP - s.x;
    if (instant) { s.ox = s.rx; s.oy = s.ry; s.vx = 0; s.vy = 0; }
  }
  return state;
}

export function pickShard(state, px, py) {
  for (let i = state.shards.length - 1; i >= 0; i -= 1) {
    const s = state.shards[i];
    if (px >= s.x + s.ox && px < s.x + s.ox + s.w && py >= s.y + s.oy && py < s.y + s.oy + s.h) return s.id;
  }
  return null;
}

export function startDrag(state, id, px, py) {
  const s = state.shards[id];
  if (!s) return;
  state.drag = { id, grabX: px - s.ox, grabY: py - s.oy };
}

export function endDrag(state) {
  state.drag = null;
}

// Un paso de simulación. `pointer` es la posición del puntero (o null si salió de la pantalla).
export function stepShards(state, dt, { pointer = null, aspect = 1 } = {}) {
  for (const s of state.shards) {
    if (state.drag?.id === s.id && pointer) {
      s.ox = pointer.x - state.drag.grabX;
      s.oy = pointer.y - state.drag.grabY;
      s.vx = 0;
      s.vy = 0;
    } else {
      let ax = -SPRING * (s.ox - s.rx) - DAMPING * s.vx;
      let ay = -SPRING * (s.oy - s.ry) - DAMPING * s.vy;
      if (pointer) {
        const dx = (s.x + s.w / 2 + s.ox - pointer.x) * aspect;
        const dy = s.y + s.h / 2 + s.oy - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < PUSH_RADIUS && d > 1e-6) {
          const push = ((PUSH_RADIUS - d) / PUSH_RADIUS) * PUSH_FORCE;
          ax += (dx / d / aspect) * push * 60;
          ay += (dy / d) * push * 60;
        }
      }
      s.vx += ax * dt;
      s.vy += ay * dt;
      s.ox += s.vx * dt;
      s.oy += s.vy * dt;
    }
    s.moved = Math.max(s.moved, Math.hypot(s.ox - s.rx, s.oy - s.ry));
  }
  return state;
}

// De 0 a 1. Cuenta lo que se movió alguna vez: aunque los fragmentos vuelvan, lo descubierto queda.
export function revealProgress(state) {
  const needed = Math.ceil(state.shards.length * REVEAL_SHARE);
  const moved = state.shards.filter((s) => s.moved >= MOVED).length;
  return Math.min(1, moved / needed);
}
