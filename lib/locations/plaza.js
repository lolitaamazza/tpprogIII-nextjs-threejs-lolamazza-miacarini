// La plaza de la Cosecha de un distrito: el Edificio de Justicia, el escenario con la urna de vidrio y el micrófono,
// los carteles del Capitolio y la gente en silueta mirando. La misma plaza para el 12, el 11 y el 4, con el cartel
// y la luz de cada uno. Puro: se prueba con `node --test`. Metros; la cámara está entre la gente, mirando al escenario.
const LOOKS = {
  12: { fog: { color: '#8d9096', density: 0.02 }, sun: { color: 0xdfe4ee, intensity: 1.4, position: [-20, 30, 10] }, hemi: { sky: 0xb8c0cc, ground: 0x2c2a28, intensity: 0.55 } },
  11: { fog: { color: '#b9a07e', density: 0.018 }, sun: { color: 0xffc890, intensity: 1.9, position: [-30, 18, 5] }, hemi: { sky: 0xffdcb0, ground: 0x3a2e20, intensity: 0.55 } },
  4: { fog: { color: '#9fb0ba', density: 0.022 }, sun: { color: 0xffd8b4, intensity: 1.6, position: [30, 14, 10] }, hemi: { sky: 0xc4d6e6, ground: 0x4a4a44, intensity: 0.6 } },
};

export function plazaFor(district) {
  const look = LOOKS[district] ?? LOOKS[12];
  return {
    id: `plaza-${district}`,
    title: `La plaza del Distrito ${district}`,
    eye: 1.6,
    sky: { url: '/models/d11/citrus_orchard_road_puresky_1k.hdr', intensity: 0.7, background: 0.5 },
    ...look,
    exposure: 0.88,
    start: 'gente',
    spots: [{ id: 'gente', label: 'Entre la gente', position: [0.4, 1.75, 4], look: [0, 2.4, -13] }],
    pieces: [
      { id: 'edificio', url: '/models/plaza/edificio.glb', scale: 1, position: [0, 0, -26], rotationY: 0 },
      { id: 'columnas', url: '/models/plaza/columna.glb', height: 6, position: [-6.2, 0, -14.6], rotationY: 0, copies: [[6.2, -14.6, 0]] },
      // La urna: el cuenco de vidrio grande, sobre una columna baja, a un lado del micrófono.
      { id: 'pie-urna', url: '/models/plaza/columna.glb', height: 1, position: [-2, 1.2, -13], rotationY: 0 },
      { id: 'urna', url: '/models/plaza/urna.glb', height: 0.6, position: [-2, 2.2, -13], rotationY: 0 },
      { id: 'microfono', url: '/models/plaza/microfono.glb', height: 1.7, position: [0.6, 1.2, -12.4], rotationY: 0 },
    ],
    structures: [
      { type: 'paving', size: [140, 140], position: [0, 0, -20] },
      { type: 'stage', position: [0, 0, -13], size: [11, 1.2, 4.4] },
      // Los carteles del Capitolio en la fachada y, sobre el escenario, el del distrito.
      { type: 'banner', position: [-8.5, 7, -17.2], size: [2.4, 6] },
      { type: 'banner', position: [8.5, 7, -17.2], size: [2.4, 6] },
      { type: 'banner', position: [0, 4.2, -15.1], size: [5, 1.4], text: `DISTRITO ${district}` },
      // La gente en filas frente al escenario, con un pasillo donde está la cámara.
      { type: 'crowd', center: [0, -2.5], rows: 12, cols: 18, spacing: [0.9, 1], avoid: [0.4, 4, 1.1], aisle: [0.4, 0.75] },
    ],
    lamps: [],
    dust: { count: 120, lowCount: 60, min: [-12, 0.5, -16], max: [12, 6, 6], color: '#e8e4da' },
    // Sacar el papel: sube de la urna hasta el micrófono.
    job: { type: 'draw', spot: 'gente', urn: [-2, 2.5, -13], to: [0.2, 3, -12.2] },
  };
}
