// El tren entre distritos: sentado en el vagón, junto a la ventana, mientras pasa el paisaje. Puro: se prueba con `node --test`.
// El vagón corre a lo largo de z; el piso del modelo está en y = -0,95 (por eso el `origin`) y la ventana de la
// izquierda en x ≈ -1,6. El modelo trae vías de casi dos kilómetros: se esconden y el paisaje pasa con `passing`.
export const TRAIN = Object.freeze({
  id: 'tren',
  title: 'El tren',
  eye: 1.25,
  sky: { url: '/models/d11/citrus_orchard_road_puresky_1k.hdr', intensity: 0.8, background: 0.7 },
  fog: { color: '#a9b4b8', density: 0.0045 },
  sun: { color: 0xffe2c0, intensity: 1.8, position: [-30, 20, 10] },
  hemi: { sky: 0xdfe6ee, ground: 0x4a4436, intensity: 0.6 },
  exposure: 0.82,
  start: 'asiento',
  spots: [{ id: 'asiento', label: 'El vagón', position: [0.7, 1.25, 0], look: [-1.7, 1.15, 0.6] }],
  pieces: [
    { id: 'vagon', url: '/models/tren/vagon.glb', scale: 1, origin: [0, -0.95, 0], position: [0, 0, 0], rotationY: 0,
      hide: ['Object_114', 'Object_115', 'Object_116', 'Object_117'], glass: ['Material.060', 'Material.062'] },
  ],
  structures: [{ type: 'passing', speed: 24, side: -1, length: 260 }],
  lamps: [{ position: [0, 2.05, 0.4], intensity: 3, size: 0.18, flicker: 0.01 }],
});
