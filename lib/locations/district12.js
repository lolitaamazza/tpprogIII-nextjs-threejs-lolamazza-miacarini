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
  spots: [
    { id: 'vias', label: 'Las vías', position: at(1.5, 3), look: [0, 1.4, -20] },
    { id: 'galpon', label: 'El galpón', position: at(1.4, -3.8), look: [6.4, 1.1, -7.6] },
    { id: 'casa', label: 'La casa de Ash', position: at(-0.6, -9.2), look: [-6.6, 1.9, -13.4] },
    { id: 'entrada', label: 'La entrada de la mina', position: at(0, -24), look: [0, 2, -34] },
    { id: 'tunel', label: 'El túnel', position: at(0, -48.5), look: [0, 1.3, -57] },
  ],
  pieces: [
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
  // La viga con los nombres tallados de los mineros que no salieron: solo se toca estando en el túnel.
  fragment: { id: '12-viga', spot: 'tunel', position: [1.95, 1.6, -53.4], radius: 0.6 },
  // El frente de carbón del túnel: ahí se juega la jornada de Ash.
  seam: { spot: 'tunel', position: [-0.3, 1.25, -54.8], width: 2.6, height: 1.9 },
});
