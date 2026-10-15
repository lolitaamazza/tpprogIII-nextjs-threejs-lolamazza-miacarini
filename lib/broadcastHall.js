// La sala de transmisión de la intro (referencia: la sala de teles de los 10.º Juegos): medidas, butacas,
// teles chicas y poses de cámara. Puro: se prueba con `node --test`. Coordenadas locales de la sala, en
// "metros": la pared de teles mira hacia +z y el público se sienta entre ella y la cámara.

// La sala está lejos del mapa (que vive alrededor del origen) para que no se vean entre sí.
export const HALL_ORIGIN = Object.freeze([0, 0, -60]);
export const toWorld = ([x, y, z]) => [x + HALL_ORIGIN[0], y + HALL_ORIGIN[1], z + HALL_ORIGIN[2]];

export const HALL = Object.freeze({
  radius: 20, // pared curva: un cilindro con centro en (0, wallCenterZ)
  wallCenterZ: 16,
  height: 13,
  aisle: 2.4,
  wallWidth: 22, // ancho de las dos paredes de teles con las lámparas
  screen: Object.freeze({ width: 6.4, height: 4.8, y: 4.4, z: 0.75 }),
});

const FOV = 40;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);

export function visibleSize(distance, aspect, fovDeg = FOV) {
  const height = 2 * distance * Math.tan((fovDeg / 2) * Math.PI / 180);
  return { width: height * aspect, height };
}

// Lo que dice la tele: dentro del mundo todo está en inglés, como en las películas.
export const SCREEN_COPY = Object.freeze({
  logo: 'CAPITOL TV',
  eyebrow: 'CAPITOL TV · OFFICIAL BROADCAST',
  headline: 'CITIZENS OF PANEM',
  body: 'Never have we been so united. The districts work, the Capitol provides, and Panem lives in peace.',
  ticker: 'ALL UNAUTHORIZED SIGNALS WILL BE TERMINATED  ·  PANEM TODAY  ·  PANEM TOMORROW  ·  PANEM FOREVER  ·  UNITY  ·  ORDER  ·  LABOR  ·  ',
  pirate: 'UNAUTHORIZED SIGNAL',
  noSignal: 'NO SIGNAL',
  standBy: 'PLEASE STAND BY',
});

// Generador fijo: el público queda igual en cada visita.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function seatLayout({ rows = 4, perSide = 5, seed = 10 } = {}) {
  const random = lcg(seed);
  const seats = [];
  for (let row = 0; row < rows; row++) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < perSide; i++) {
        seats.push({
          x: side * (HALL.aisle / 2 + 0.7 + i * 1.3),
          z: 5.5 + row * 2,
          row,
          occupied: random() < 0.68,
          turn: (random() - 0.5) * 0.3,
          scale: 0.94 + random() * 0.12,
        });
      }
    }
  }
  return seats;
}

// 12 sellos de distrito, el Capitolio, el logo del canal, barras de prueba y el 13, que "no existe".
const SMALL_TV_CONTENT = ['c', '1', 'logo', '2', '3', 'bars', '4', 'c', '5', '6', 'logo', '13',
  '7', 'c', '8', 'bars', '9', 'logo', '10', 'c', '11', 'logo', '12', 'bars'];

export function smallTvSlots() {
  const slots = [];
  let k = 0;
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        slots.push({
          side, col, row,
          x: sign * (4.6 + col * 1.95),
          y: 1.5 + row * 1.55,
          z: 0.4 + col * 0.35,
          rotY: -sign * (0.12 + col * 0.06),
          content: SMALL_TV_CONTENT[k++],
        });
      }
    }
  }
  return slots;
}

// Encendido en cascada: primero las más cercanas a la tele central.
export function cascadeDelays(slots, { stepMs = 65 } = {}) {
  const order = slots.map((s, i) => i).sort((a, b) => (Math.abs(slots[a].x) - Math.abs(slots[b].x)) || (slots[a].row - slots[b].row));
  const delays = new Array(slots.length);
  order.forEach((index, rank) => { delays[index] = rank * stepMs; });
  return delays;
}

// Plano general como el de la referencia: bajo, centrado, con el público en primer plano. En pantallas
// anchas entran las dos paredes de teles; en angostas, al menos la tele central entera.
export function hallPoseFor(aspect) {
  const wanted = aspect >= 1.2 ? HALL.wallWidth : HALL.screen.width + 1.5;
  const distance = Math.min(23, Math.max(15, wanted / (2 * TAN * aspect) + 1.5));
  return {
    position: toWorld([0, 3.1, HALL.screen.z + distance]),
    target: toWorld([0, 4.3, HALL.screen.z]),
  };
}

// Frente a la pantalla, tan cerca que la llena: desde acá se corta al mapa.
export function screenPoseFor(aspect) {
  const byHeight = (HALL.screen.height * 0.8) / (2 * TAN);
  const byWidth = (HALL.screen.width * 0.85) / (2 * TAN * aspect);
  const distance = Math.min(byHeight, byWidth);
  return {
    position: toWorld([0, HALL.screen.y, HALL.screen.z + distance]),
    target: toWorld([0, HALL.screen.y, HALL.screen.z]),
  };
}
