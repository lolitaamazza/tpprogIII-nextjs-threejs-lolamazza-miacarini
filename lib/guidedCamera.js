// Cámara guiada en primera persona: se elige un lugar y la cámara camina hasta ahí por la calle.
// Puro: se prueba con `node --test`. Posiciones y miradas son [x, y, z] en metros; ángulos en radianes.
const YAW_LIMIT = (35 * Math.PI) / 180;
const PITCH_LIMIT = (15 * Math.PI) / 180;
const BOB = 0.035; // balanceo de los pasos, en metros
const STEP = 1.4; // metros por ciclo de balanceo
const LOOK_TURN = 0.6; // la mirada termina de girar hacia el destino en el primer 60 % del camino

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const length = (path) => path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0);

// La calle es el eje x = 0: caminar por ahí evita atravesar casas y galpones.
export function streetPoint(position) {
  return [0, position[1], position[2]];
}

// Desde donde está la cámara (aunque sea a mitad de otro camino) hasta el lugar, pasando por la calle.
export function pathBetween(from, to) {
  const points = [from, streetPoint(from), streetPoint(to.position), to.position];
  return points.reduce((path, p) => (path.length && distance(path.at(-1), p) < 0.05 ? path : [...path, [...p]]), []);
}

export function walkDuration(path, { reducedMotion = false } = {}) {
  if (reducedMotion) return 0;
  return clamp(1.5 + length(path) / 30, 1.5, 3);
}

// Dónde está la cámara y hacia dónde mira en el momento `t` (0 a 1) de la caminata.
export function poseAlong(path, fromTarget, toTarget, t) {
  const k = clamp(t, 0, 1);
  const total = length(path);
  let left = easeInOutCubic(k) * total;
  let position = [...path.at(-1)];
  for (let i = 1; i < path.length; i++) {
    const segment = distance(path[i - 1], path[i]);
    if (left <= segment) { position = lerp(path[i - 1], path[i], segment ? left / segment : 1); break; }
    left -= segment;
  }
  const walked = easeInOutCubic(k) * total;
  position[1] += BOB * Math.sin((walked * 2 * Math.PI) / STEP) * Math.sin(Math.PI * k);
  const target = lerp(fromTarget, toTarget, smoothstep(clamp(k / LOOK_TURN, 0, 1)));
  return { position, target };
}

export function clampLook(yaw, pitch) {
  return { yaw: clamp(yaw, -YAW_LIMIT, YAW_LIMIT), pitch: clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT) };
}

// Mirar alrededor desde un lugar: gira la dirección hacia `spot.look` (yaw a los lados, pitch arriba o abajo).
export function lookTarget(spot, yaw, pitch) {
  const limited = clampLook(yaw, pitch);
  const [dx, dy, dz] = spot.look.map((v, i) => v - spot.position[i]);
  const reach = Math.hypot(dx, dy, dz);
  const flat = Math.hypot(dx, dz) || 1;
  const angle = Math.atan2(dy, flat) + limited.pitch;
  const c = Math.cos(limited.yaw), s = Math.sin(limited.yaw);
  const hx = (dx * c + dz * s) / flat, hz = (-dx * s + dz * c) / flat;
  const h = reach * Math.cos(angle);
  return [spot.position[0] + hx * h, spot.position[1] + reach * Math.sin(angle), spot.position[2] + hz * h];
}

// Teclas 1 a 9: el lugar con ese número, si existe.
export function spotForKey(key, spots) {
  if (!/^[1-9]$/.test(String(key))) return null;
  return spots[Number(key) - 1]?.id ?? null;
}

// Los lugares que se muestran: uno con `requires` aparece recién cuando se tiene esa herramienta.
export function visibleSpots(spots, tools = []) {
  return spots.filter((s) => !s.requires || tools.includes(s.requires));
}
