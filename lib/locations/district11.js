// La escena del Distrito 11: el huerto al atardecer, del alambrado a la casa de Oliva. Puro: se prueba con `node --test`.
// Metros. Como en el 12, el camino va por x = 0 hacia -z; el alambrado cruza en z = 0. Ver district12.js para las claves.
const EYE = 1.6;
const at = (x, z) => [x, EYE, z];

// Paneles del alambrado a los dos lados del portón (la entrada del camino), cada uno con su poste.
const PANEL = 1.95;
const fenceLine = Array.from({ length: 14 }, (_, k) => [1.6 + k * PANEL, -1.6 - PANEL - k * PANEL]).flat();
// Perales en filas, sin tapar el campo (x de -10,5 a -1, z de -12,5 a -7) ni la torre, el galpón o la casa.
const PEARS = [
  [-5, -3], [-10, -3], [-15, -3.5], [-15, -11], [-15, -18], [-11, -26], [-5.5, -26.5], [-10.5, -32], [-5, -32.5],
  [5, -4], [10.5, -4.5], [5, -9.5], [14, -10], [5, -21], [11.5, -21], [5, -34], [11, -34.5],
].map(([x, z], i) => [x, z, i * 1.37]);

export const DISTRICT11 = Object.freeze({
  id: '11',
  title: '11 · Agricultura',
  eye: EYE,
  sky: { url: '/models/d11/citrus_orchard_road_puresky_1k.hdr', intensity: 0.75, background: 0.55 },
  fog: { color: '#b98a62', density: 0.03 },
  // El sol bajo, desde atrás de los perales; luz de cielo cálida.
  sun: { color: 0xffb070, intensity: 2.2, position: [-30, 12, -40] },
  hemi: { sky: 0xffd2a0, ground: 0x3a2a1a, intensity: 0.55 },
  exposure: 0.9,
  start: 'alambrado',
  dayHint: 'Hoy trabaja Oliva. Su jornada es en el huerto. Al terminar, decidís si pide comida.',
  spots: [
    { id: 'alambrado', label: 'El alambrado', position: at(0.6, 4), look: [0, 1.8, -14] },
    { id: 'huerto', label: 'El huerto', position: at(0.4, -9.4), look: [-6, 0.5, -10.4] },
    { id: 'torre', label: 'La torre', position: at(4.6, -12), look: [9, 3.2, -15] },
    { id: 'galpon', label: 'El galpón de los cajones', position: at(-0.8, -19.8), look: [-6.5, 1, -20.6] },
    { id: 'casa', label: 'La casa de Oliva', position: at(-0.8, -26.6), look: [7, 1.6, -28] },
  ],
  pieces: [
    { id: 'granero', url: '/models/scene-props/old_wooden_barn_house_4.glb', matte: true, height: 4, position: [-8.1, 0, -21], rotationY: Math.PI / 2 },
    { id: 'regadera', url: '/models/scene-props/watering_can_metal_01.glb', height: 0.4, position: [4.5, 0, -26.5], rotationY: 1.2 },
    { id: 'helechos', url: '/models/scene-props/fern_02.glb', height: 0.6, position: [-3.4, 0, -22.6], cutout: true, copies: [[4.8, -28.8, 0.6], [5.2, -30, 2.1], [-12.2, -18, 1.2]] },
    { id: 'malezas', url: '/models/scene-props/nettle_plant.glb', height: 0.45, position: [2.7, 0, -0.7], cutout: true, copies: [[-3.4, -0.9, 0.8], [-4.1, -1.2, 2.2], [5.5, -1.1, 3]] },
    { id: 'torre', url: '/models/d11/torre.glb', height: 7.5, position: [9, 0, -15], rotationY: -Math.PI / 2 },
    { id: 'reflector', url: '/models/d11/security_light.glb', scale: 2, position: [8.2, 5.4, -15], rotationY: -Math.PI / 2 },
    { id: 'casa', url: '/models/scene-props/wooden_log_cabin.glb', glass: ['Glass'], height: 3.8, position: [7.5, 0, -28], rotationY: -Math.PI / 2 },
    { id: 'cajones', url: '/models/d11/cajon-peras.glb', height: 0.5, position: [-6, 0, -19.4], rotationY: 0.1,
      copies: [[-6.7, -20.2, 0.3], [-5.5, -20.6, -0.2], [-6.4, -21.4, 0], [-7.6, -19.6, 0.5]] },
    { id: 'cajones-arriba', url: '/models/d11/cajon-peras.glb', height: 0.5, position: [-6.3, 0.5, -19.8], rotationY: 0.2, copies: [[-6.6, -21, -0.1]] },
    { id: 'carretilla', url: '/models/d11/carretilla.glb', height: 0.75, position: [-3.4, 0, -18.4], rotationY: 0.6 },
    { id: 'escalera', url: '/models/d11/escalera.glb', height: 3.2, position: [-4.7, 1.55, -26], rotationY: 0.2, rotationZ: 0.22 },
    { id: 'espantapajaros', url: '/models/d11/espantapajaros.glb', height: 2.3, position: [-11.8, 0, -7.6], rotationY: 0.6 },
    { id: 'canastas', url: '/models/d11/wicker_basket_01.glb', scale: 1, position: [-1.6, 0, -12.9], rotationY: 0.4, copies: [[-4.2, -26.8, 1], [-2.6, -19, 2]] },
    { id: 'peras', url: '/models/d11/food_pears_asian_01.glb', scale: 1, position: [-1.3, 0, -13.3], rotationY: 0, copies: [[-1.1, -13.1, 1], [-4.6, -26.4, 2]] },
    { id: 'pasto', url: '/models/d11/grass_medium_02.glb', scale: 1.4, position: [-1, 0, -6], rotationY: 0,
      copies: [[1.2, -6.5, 1], [-11, -12.6, 2], [-2, -13.8, 3], [-12.4, -9, 4], [1.4, -15, 5], [-1.6, -23, 6], [2, -31, 0.5], [-3, -3.5, 1.5], [3.5, 1.5, 2.5], [-3.6, 1.2, 3.5], [8, -8, 4.5], [-13, -21, 5.5]] },
    { id: 'peral', url: '/models/d11/peral.glb', scale: 1.3, position: [PEARS[0][0], 0, PEARS[0][1]], rotationY: 0, cutout: true, copies: PEARS.slice(1) },
    { id: 'alambrado', url: '/models/d11/alambrado.glb', scale: 1, only: ['fence_doub'], cutout: true, origin: [-1.95, 0, 0], position: [fenceLine[0], 0, 0], rotationY: 0,
      copies: fenceLine.slice(1).map((x) => [x, 0, 0]) },
    { id: 'postes', url: '/models/d11/alambrado.glb', scale: 1, only: ['post_middl'], origin: [1, 0, -1], position: [1.6, 0, 0], rotationY: 0,
      copies: fenceLine.slice(1).map((x) => [x, 0, 0]).concat([[1.6 + 14 * PANEL, 0, 0], [-1.6, 0, 0]]) },
  ],
  textures: '/models/d11/',
  ground: { texture: 'brown_mud_leaves_01', size: [140, 140], repeat: [35, 35], position: [0, 0, -20] },
  structures: [
    // El galpón donde se apilan los cajones de peras, abierto hacia el camino.

    // El riel al fondo del campo donde se paran los sinsajos para el silbido.
    { type: 'rail', from: [-8.4, 1.45, -12.9], to: [-4.9, 1.45, -12.9] },
  ],
  lamps: [
    { position: [6.1, 2.3, -27.3], intensity: 6, size: 0.3 }, // el farol de la puerta de Oliva
  ],
  // Polen y polvo dorado sobre el campo.
  dust: { count: 280, lowCount: 120, min: [-13, 0.2, -16], max: [3, 2.6, -4], color: '#f3e2a0' },
  // La jornada de Oliva: cosechar el campo sin que la vea el reflector de la torre y repetir el silbido.
  job: { type: 'harvest', spot: 'huerto', center: [-5.75, 0, -11], scale: 8, tower: [8.4, 5.6, -15], birds: [-7.85, 1.58, -12.9] },
  interactables: [
    // El aviso del castigo, clavado en una pata de la torre (el fragmento del 11).
    { id: 'aviso', kind: 'take', spot: 'torre', position: [8.05, 1.55, -14.4], size: [0.36, 0.47, 0.01], rotationY: -Math.PI / 2, art: 'aviso', reveals: '11-parte' },
  ],
});
