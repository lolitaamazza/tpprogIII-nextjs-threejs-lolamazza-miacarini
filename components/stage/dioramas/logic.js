// Reglas de los dioramas. Puro: se prueba con `node --test`.
export function createTally(total, completed = false) {
  return { count: completed ? total : 0, total, done: completed };
}

export function tally(state, k = 1) {
  if (state.done) return { state, justCompleted: false };
  const count = Math.min(state.total, state.count + k);
  const done = count >= state.total;
  return { state: { ...state, count, done }, justCompleted: done };
}

export function fishPosition(i, t, center = { x: 0, z: 0 }) {
  const radius = 0.22 + 0.12 * (i % 3);
  const direction = i % 2 ? 1 : -1;
  const angle = t * (0.5 + 0.12 * i) * direction + i * 1.3;
  return { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius * 0.8 };
}

export function fishInNet(fish, target, radius) {
  return fish.filter((f) => !f.caught && Math.hypot(f.x - target.x, f.z - target.z) <= radius).map((f) => f.index);
}

export function nearestFish(fish, from) {
  let best = null;
  let bestDistance = Infinity;
  for (const f of fish) {
    if (f.caught) continue;
    const d = Math.hypot(f.x - from.x, f.z - from.z);
    if (d < bestDistance) { best = f.index; bestDistance = d; }
  }
  return best;
}

// Va de 0 a 1 y vuelve a 0 cada 2 unidades de t (la luz que recorre la veta, la carga de la red).
export function sweep(t) {
  const p = ((t % 2) + 2) % 2;
  return p <= 1 ? p : 2 - p;
}

// Distrito 12: la luz recorre la veta y hay que picar cuando pasa por la grieta. Tres capas de dos golpes;
// la grieta se achica en cada capa y cambia de lugar después de cada golpe. Tres errores y el canario se calla.
export const COAL = { layers: 3, hitsPerLayer: 2, lives: 3, crack: [0.26, 0.21, 0.17], speed: [0.55, 0.65, 0.75] };
const CRACK_CENTERS = [0.5, 0.24, 0.74, 0.36, 0.82, 0.3, 0.62];

export function coalRound(hits, help = 0) {
  const layer = Math.min(COAL.layers - 1, Math.floor(hits / COAL.hitsPerLayer));
  const width = COAL.crack[layer] * (help ? 1.4 : 1);
  const speed = COAL.speed[layer] * (help ? 0.75 : 1);
  const half = width / 2;
  const center = Math.min(1 - half, Math.max(half, CRACK_CENTERS[hits % CRACK_CENTERS.length]));
  return { layer, width, speed, center };
}

export function inCrack(position, round) {
  return Math.abs(position - round.center) <= round.width / 2;
}

// Distrito 4: mantener apretado carga el alcance de la red (va y viene), soltar la tira. Cinco redes para tres
// peces; la corriente corre un poco la red y el pez dorado vale por dos. La ayuda carga más lento y calma el agua.
export const FISHING = { goal: 3, nets: 5, fish: 6, netRadius: 0.2, helpRadius: 0.27, minReach: 0.25, maxReach: 1.15, chargePeriod: 1.6, drift: { x: 0.04, z: 0.05 } };

export function reachAt(t, help = 0) {
  const period = FISHING.chargePeriod * (help ? 1.4 : 1);
  return FISHING.minReach + (FISHING.maxReach - FISHING.minReach) * sweep((2 * t) / period);
}

export function landingPoint(from, aim, reach, help = 0) {
  const dx = aim.x - from.x;
  const dz = aim.z - from.z;
  const length = Math.hypot(dx, dz) || 1;
  const drift = help ? { x: 0, z: 0 } : FISHING.drift;
  return { x: from.x + (dx / length) * reach + drift.x, z: from.z + (dz / length) * reach + drift.z };
}

export function netCatch(fish, point, radius) {
  const caught = fishInNet(fish, point, radius);
  return { caught, points: caught.reduce((sum, i) => sum + (fish.find((f) => f.index === i).golden ? 2 : 1), 0) };
}

// Distrito 11: se cosecha rozando las espigas mientras el reflector de las torres barre el campo. Si te alumbra,
// se pierde lo cosechado en esa pasada y una vida de sigilo. Después, los sinsajos cantan el silbido y hay que
// repetirlo tocándolos en orden. Coordenadas del diorama (el campo de espigas).
export const FIELD = { x0: -0.6, x1: 0.62, z0: -0.15, z1: 0.45 };
export const HARVEST = { stalks: 24, lives: 3, radius: 0.2, helpRadius: 0.15, speed: 0.32, helpSpeed: 0.22, passSeconds: 2.5, graceSeconds: 1.2 };

export function searchlight(t, help = 0) {
  const speed = help ? HARVEST.helpSpeed : HARVEST.speed;
  return {
    x: FIELD.x0 + (FIELD.x1 - FIELD.x0) * sweep(t * speed),
    z: FIELD.z0 + (FIELD.z1 - FIELD.z0) * sweep(t * speed * 0.6 + 0.5),
    radius: help ? HARVEST.helpRadius : HARVEST.radius,
  };
}

export function inLight(point, light) {
  return Math.hypot(point.x - light.x, point.z - light.z) < light.radius;
}

// Los pájaros quedan de izquierda a derecha de grave a agudo; devuelve qué pájaro canta cada nota del motivo.
export function songOrder(motif) {
  const low = [...motif].sort((a, b) => a - b);
  return motif.map((note) => low.indexOf(note));
}
