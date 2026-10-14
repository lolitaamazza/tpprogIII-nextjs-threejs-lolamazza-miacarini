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
