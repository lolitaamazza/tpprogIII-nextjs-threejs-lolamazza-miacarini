// La escena del Distrito 12: la calle de la Veta de noche, de las vías a la mina. Puro: se prueba con `node --test`.
// Metros. La calle va por el eje x = 0 hacia -z (la mina al fondo); las vías del tren cruzan en z = 0.
// Las piezas de Sketchfab se escalan a `height`; las de Poly Haven ya vienen en metros (`scale`).
// `origin` (opcional, en metros del modelo): el punto del modelo que va en `position` (si no, se centra y se apoya en el piso).
// `hide`: mallas del modelo que no se muestran; `matte`: sin brillo de mojado; `copies`: más casas iguales [x, z, giro].
const EYE = 1.6;
const at = (x, z) => [x, EYE, z];

export const DISTRICT12 = Object.freeze({
  id: '12',
  title: '12 · Carbón',
  eye: EYE,
  sky: { url: '/models/d12/satara_night_1k.hdr', intensity: 0.35, background: 0.1 },
  fog: { color: '#0b0e14', density: 0.045 },
  start: 'vias',
  dayHint: 'Hoy trabaja Ash. Su jornada es en el túnel. Al terminar, decidís si pide comida.',
  spots: [
    { id: 'vias', label: 'Las vías', position: at(1.5, 3), look: [0, 1.4, -20] },
    { id: 'galpon', label: 'El galpón', position: at(1.4, -3.8), look: [6.4, 1.1, -7.6] },
    { id: 'casa', label: 'La casa de Ash', position: at(-0.6, -9.2), look: [-6.6, 1.9, -13.4] },
    { id: 'entrada', label: 'La entrada de la mina', position: at(0, -24), look: [0, 2, -34] },
    { id: 'tunel', label: 'El túnel', position: at(0, -48.5), look: [0, 1.3, -57] },
  ],
  pieces: [
    { id: 'herramientas', url: '/models/scene-props/metal_toolbox.glb', height: 0.24, position: [5.2, 0.5, -8.1], rotationY: 0.3 },
    { id: 'malezas', url: '/models/scene-props/nettle_plant.glb', height: 0.5, position: [-4.6, 0, -15.5], cutout: true, copies: [[-5.8, -20, 1.3], [4.2, -18, 2], [-6, -2.8, 0.5]] },
    { id: 'tocon', url: '/models/scene-props/tree_stump_01.glb', height: 0.42, position: [-4.6, 0, -6.5], rotationY: 0.8 },
    { id: 'casa-ash', url: '/models/d12/casa-ash.glb', height: 4.6, position: [-8.5, 0, -13.5], rotationY: Math.PI / 2,
      copies: [[-9, -4, Math.PI / 2 + 0.06], [-8.8, -22.5, Math.PI / 2 - 0.05], [-14.5, -9, Math.PI / 2], [12.5, -1.5, -Math.PI / 2]] },
    { id: 'casa-vecina', url: '/models/d12/casa-vecina.glb', height: 5.5, position: [9.5, 0, -18], rotationY: -Math.PI / 2,
      copies: [[10, -28, -Math.PI / 2 + 0.1], [-16, -26, Math.PI / 2]] },
    // La boca de la mina sin su carrito (la cámara entra caminando por ahí); se hunde un poco para que su piso no flote.
    { id: 'boca-mina', url: '/models/d12/boca-mina.glb', height: 5.8, position: [0, -0.4, -36], rotationY: Math.PI, hide: ['cart'] },
    // El túnel corre a lo largo de z; su piso está en y = -1,2 y la boca en z = 10,2 (medido con gltf-transform).
    { id: 'tunel', url: '/models/d12/tunel.glb', scale: 1, origin: [-0.3, -1.2, 10.2], position: [0, 0, -40], rotationY: 0, matte: true, hide: ['Object_33', 'Object_35'] },
    { id: 'farol-minero', url: '/models/d12/farol-minero.glb', height: 0.32, position: [5.8, 0.82, -7.6], rotationY: 0.4 },
    { id: 'pico', url: '/models/d12/picke_dirty_01.glb', scale: 1, position: [6.9, 0, -8.6], rotationY: 0.3 },
    { id: 'maza', url: '/models/d12/sledgehammer_01.glb', scale: 1, position: [7.2, 0, -8.3], rotationY: -0.5 },
    { id: 'farol-casa', url: '/models/d12/wooden_lantern_01.glb', scale: 1, position: [-5.9, 0, -12.2], rotationY: 0 },
    { id: 'farol-galpon', url: '/models/d12/Lantern_01.glb', scale: 1, position: [6.2, 2.1, -7], rotationY: 0 },
    { id: 'cajon', url: '/models/d12/wooden_crate_02.glb', scale: 1, position: [5.8, 0, -7.6], rotationY: 0.2 },
    { id: 'tambor', url: '/models/d12/barrel_stove.glb', scale: 1, position: [4.3, 0, -10.2], rotationY: 0 },
    { id: 'rocas', url: '/models/d12/rock_moss_set_01.glb', scale: 1.4, position: [-7.5, 0, -31], rotationY: 0.8 },
  ],
  // Lo que arma la escena con sus constructores (components/stage/locations/builders.js).
  textures: '/models/d12/',
  ground: { texture: 'burned_ground_01', size: [140, 140], repeat: [28, 28], position: [0, 0, -25] },
  street: { texture: 'brown_mud_02', size: [6, 44], repeat: [1.5, 11], position: [0, 0.01, -16] },
  structures: [
    // Las vías del tren cruzan la calle; la vía angosta entra a la mina.
    { type: 'track', length: 80, gauge: 1.435, along: 'x', center: [0, 0, 0] },
    { type: 'track', length: 24, gauge: 0.9, along: 'z', center: [0, 0, -32] },
    { type: 'shed', position: [6.5, 0, -7.6], rotationY: -Math.PI / 2, tint: '#7a6656' }, // chapa vieja, oxidada
    // La loma de la mina: un cerro oscuro detrás de la boca, para que el túnel quede "adentro".
    { type: 'hill', position: [0, -1, -54], scale: [34, 16, 14], color: '#15130f' },
    { type: 'poles', tops: [[3.6, 6.6, 1.8], [-12, 6.6, 1.8], [-27, 6.6, 1.8], [18, 6.6, 1.8]] },
  ],
  // Faroles de la casa y del galpón, el foco del poste, la boca de la mina y las lámparas del túnel.
  lamps: [
    { position: [-5.9, 0.42, -12.2], intensity: 8, size: 0.3 },
    { position: [6.2, 2.2, -7], intensity: 12 },
    { position: [3.6, 6.1, 2.2], color: 0xffd9a0, intensity: 45, size: 0.6, flicker: 0.02 },
    { position: [2.2, 3.4, -33], intensity: 40 },
    { position: [-2.2, 3.4, -33], intensity: 30 },
    ...[[1.9, -44.6], [-2.4, -42.9], [-2.4, -48], [1.9, -51.9], [0, -56.5]].map(([x, z]) => ({ position: [x, 2.7, z], intensity: 9, size: 0.3, flicker: 0.12 })),
  ],
  // El fuego del tambor del galpón (la misma posición que la pieza `tambor`).
  fires: [{ position: [4.3, 0, -10.2] }],
  crackle: 'galpon', // se oye el fuego estando ahí
  // Polvo de carbón en el aire, de las vías al fondo del túnel.
  dust: { count: 420, lowCount: 160, min: [-9, 0, -58], max: [9, 4, 4], color: '#8f8a80' },
  // Lo que se encuentra en el 12 (components/stage/locations/interactables.js): el farol del minero se agarra en el galpón;
  // la libreta de Ash está en una caja junto a la escalera; el cartel de la cuota está tapado de hollín y hay que limpiarlo;
  // el nicho del túnel solo se ve con el farol. `art`: el dibujo de la cara (clueArt.js); `post`: va sobre un poste.
  interactables: [
    { id: 'farol', kind: 'take', spot: 'galpon', position: [5.8, 0.82, -7.6], size: [0.3, 0.36, 0.3], piece: 'farol-minero', reveals: 'farol' },
    { id: 'libreta', kind: 'open', spot: 'casa', position: [-5.75, 0, -13.25], size: [0.46, 0.28, 0.32], rotationY: 0.9, art: 'libreta', reveals: 'p-12-libreta' },
    { id: 'cartel', kind: 'hold', spot: 'entrada', position: [2.7, 1.05, -31.4], size: [1.1, 0.68, 0.04], rotationY: -0.35, art: 'cartel', post: true, prompt: 'Mantené presionado para limpiar el hollín.', reveals: 'p-12-cartel' },
    { id: 'nicho', kind: 'light', spot: 'tunel', position: [-1.95, 0.95, -52.8], size: [0.5, 0.5, 0.02], rotationY: Math.PI / 2, requires: 'farol', art: 'nicho', reveals: 'p-12-nicho' },
  ],
  // La viga con los nombres tallados de los mineros que no salieron: solo se toca estando en el túnel.
  fragment: { id: '12-viga', spot: 'tunel', position: [1.95, 1.6, -53.4], radius: 0.6 },
  // La jornada de Ash: el frente de carbón al fondo del túnel (components/stage/locations/jobs.js).
  job: { type: 'coal', spot: 'tunel', position: [-0.3, 1.25, -54.8], width: 2.6, height: 1.9 },
});
