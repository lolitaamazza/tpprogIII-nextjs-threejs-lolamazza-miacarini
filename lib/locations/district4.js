// La escena del Distrito 4: la costa al amanecer con niebla, de la playa a la punta del muelle. Puro: se prueba con `node --test`.
// Metros. Como en el 12, el camino va por x = 0 hacia -z: la playa (z > -2) y el muelle sobre el agua (de z = -1,5 a -13,9).
// Ver district12.js para las claves de las piezas.
const EYE = 1.6;
const DECK = 0.35; // las tablas del muelle, apenas más altas que la arena
const WATER = -0.6;
const at = (x, z, floor = 0) => [x, floor + EYE, z];

export const DISTRICT4 = Object.freeze({
  id: '4',
  title: '4 · Pesca',
  eye: EYE,
  deck: DECK,
  sky: { url: '/models/d4/kiara_1_dawn_1k.hdr', intensity: 0.9, background: 0.7 },
  fog: { color: '#8e9ca6', density: 0.02 },
  // El sol que sale sobre el mar, bajo y cálido; luz de cielo fría.
  sun: { color: 0xffc9a0, intensity: 1.6, position: [40, 8, -60] },
  hemi: { sky: 0xbfd4e6, ground: 0x6b5d4a, intensity: 0.6 },
  exposure: 0.85,
  start: 'playa',
  dayHint: 'Hoy trabaja Marin. Su jornada es en la punta del muelle. Al terminar, decidís si pide comida.',
  spots: [
    { id: 'playa', label: 'La playa', position: at(0.5, 6), look: [0, 0.8, -12] },
    { id: 'casa', label: 'La casa de Marin', position: at(-2.4, 3.6), look: [-8.6, 1.4, 4.4] },
    { id: 'redes', label: 'Las redes del muelle', position: at(-0.3, -5, DECK), look: [1.7, 1, -7.2] },
    { id: 'punta', label: 'La punta del muelle', position: at(0, -12.4, DECK), look: [3.6, -0.3, -18] },
    { id: 'faro', label: 'El faro', position: at(3.5, 4.5), look: [15, 5, -6] },
  ],
  pieces: [
    // El muelle (sin las tablas y postes sueltos del kit): las tablas de arriba quedan a la altura `DECK`.
    { id: 'muelle', url: '/models/d4/muelle.glb', scale: 1, origin: [0, 2.67, 0.43], position: [0, DECK, -1.5], rotationY: 0, hide: ['poles', 'planks'] },
    { id: 'casa', url: '/models/d4/casa.glb', height: 3.6, position: [-9, 0, 4.4], rotationY: Math.PI / 2 },
    { id: 'barril', url: '/models/d4/barriles.glb', scale: 1, only: ['barrel01'], origin: [1.475, 0, -1.56], position: [-6.9, 0, 5.6], rotationY: 0,
      copies: [[-7, 6.5, 1], [0.9, -2.6, 0.4]] },
    { id: 'cuenco', url: '/models/d4/cuenco.glb', height: 0.12, position: [-6.9, 0.93, 5.6], rotationY: 0 },
    { id: 'redes', url: '/models/d4/red.glb', height: 1.3, position: [1.8, DECK, -7.4], rotationY: 0 },
    { id: 'aparejos', url: '/models/d4/aparejos.glb', height: 0.6, position: [0.75, DECK, -4], rotationY: -Math.PI / 2 },
    { id: 'balde', url: '/models/d4/wooden_bucket_01.glb', scale: 1, position: [0.8, DECK, -10.2], rotationY: 0.5 },
    { id: 'salvavidas', url: '/models/d4/lifebuoy.glb', scale: 1, position: [-0.9, DECK, -8.6], rotationY: 0.3 },
    // La casilla de la grúa (Skipskranen), en la arena: un galpón de la costa.
    { id: 'grua', url: '/models/d4/grua.glb', height: 5.5, position: [-16, 0, -0.5], rotationY: Math.PI / 2 },
    // El bote de Marin, atado al costado de la punta; el pesquero grande, más lejos.
    { id: 'bote-marin', url: '/models/d4/bote-marin.glb', height: 0.8, position: [-2.5, WATER - 0.25, -12.4], rotationY: 0.15 },
    { id: 'bote-grande', url: '/models/d4/bote-grande.glb', height: 3.9, position: [-10, WATER - 0.9, -17], rotationY: 0.5 },
    { id: 'boya', url: '/models/d4/ocean_buoy.glb', scale: 1, position: [7, WATER - 0.8, -11], rotationY: 0 },
    { id: 'rocas', url: '/models/d4/rocas.glb', scale: 0.35, position: [15, -0.5, -4], rotationY: 0.6 },
    { id: 'faro', url: '/models/d4/faro.glb', height: 14, position: [15, 0.2, -6], rotationY: 0 },
  ],
  textures: '/models/d4/',
  // La arena y la pendiente que baja hasta el agua.
  ground: { texture: 'coast_sand_rocks_02', size: [140, 60], repeat: [28, 12], position: [0, 0, 28] },
  street: { texture: 'coast_sand_rocks_02', size: [140, 7], repeat: [28, 1.4], position: [0, -0.6, -5.4], tilt: -0.2 },
  water: { y: WATER, size: [260, 220], position: [0, WATER, -100], color: '#2c4a55' },
  structures: [],
  lamps: [
    { position: [15, 12.6, -6], color: 0xffe6b0, intensity: 30, size: 0.9, flicker: 0.02 }, // la luz del faro
    { position: [-7.2, 2.3, 4.4], intensity: 3, size: 0.18 }, // el farol de la puerta de Marin
  ],
  // La bruma del amanecer sobre el agua.
  dust: { count: 220, lowCount: 100, min: [-12, 0, -22], max: [14, 3, 6], color: '#dfe8ee' },
  // La jornada de Marin: tirar la red desde la punta del muelle.
  job: { type: 'net', spot: 'punta', from: [0, DECK, -13.4], water: [4.6, WATER, -18], scale: 8 },
  interactables: [
    // El cuenco vacío en la puerta de Marin (el fragmento del 4): se mira, no se lleva.
    { id: 'cuenco', kind: 'look', spot: 'casa', position: [-6.9, 0.93, 5.6], size: [0.3, 0.15, 0.3], piece: 'cuenco', reveals: '4-cuenco' },
    // Una botella enredada en la red, sobre las tablas: hay que desenredarla.
    // Está atrás del salvavidas, del lado izquierdo: desde las redes hay que mirar hacia ese lado para verla.
    { id: 'botella', kind: 'hold', shape: 'bottle', subtle: true, spot: 'redes', position: [-0.6, DECK, -8.6], size: [0.45, 0.25, 0.25], rotationY: 1.2,
      prompt: 'Mantené presionado para desenredar la botella.', reveals: 'p-4-botella' },
  ],
});
