// Habitaciones independientes: se cargan al cruzar una puerta, nunca al abrir el distrito.
// Coordenadas locales del interior de ollimoisio, ampliado 1,4 veces y apoyado en su piso.
const prop = (id, position, height, rotationY = 0) => ({ id, url: `/models/scene-props/${id}.glb`, position, height, rotationY });
const note = (id, spot, position, title, lines, symbol = false) => ({ id, kind: 'look', spot, position, size: [0.32, 0.28, 0.015], reveals: id, label: title, rotationY: spot === 'casa-ventana' ? Math.PI / 2 : 0, art: { title, lines, symbol } });
const keepsake = (id, spot, position, title, lines) => ({ ...note(id, spot, position, title, lines, true), kind: 'open', size: [0.32, 0.13, 0.24] });
const base = {
  id: 'casa', start: 'casa-entrada', returnSpot: 'casa',
  shell: { url: '/models/scene-props/log_cabin_interior.glb', scale: 1.4, offset: [-0.894, 0.238, 0.399] },
  spots: [
    { id: 'casa-entrada', label: 'La entrada', position: [0, 1.6, 2.1], look: [0.8, 0.9, -0.7], aura: [0, 0.12, 1.8] },
    { id: 'casa-mesa', label: 'La mesa', position: [0, 1.6, 0.65], look: [0.8, 0.85, -0.7], aura: [0.8, 1.18, -0.7] },
    { id: 'casa-ventana', label: 'La ventana', position: [0, 1.6, -0.4], look: [-2, 1.6, 0.05], aura: [-1.7, 1.55, 0.05] },
    { id: 'casa-salida', label: 'Salir de la casa', exit: true, position: [0, 1.6, 2.35], look: [0, 1.4, 3.1], aura: [0, 1.05, 2.78] },
  ],
};
const furniture = [
  prop('rustic_wooden_table_antique_farmhouse_style', [0.8, 0, -0.7], 0.78),
  prop('painted_wooden_chair_01', [1.55, 0, 0.1], 0.92, -Math.PI / 2),
];
export const INTERIORS = Object.freeze({
  12: { ...base, title: 'La casa de Ash', tint: '#958477', light: '#ffcb8b',
    pieces: [...furniture, prop('vintage_day_bed', [1.1, 0, -2.1], 0.8), prop('metal_toolbox', [-1.1, 0, 1.6], 0.24)],
    items: [{ id: 'libreta', spot: 'casa-mesa', position: [0.65, 0.8, -0.65], size: [0.35, 0.12, 0.25], rotationY: 0.15 },
      keepsake('p-12-costura', 'casa-mesa', [1.02, 0.8, -0.8], 'El pájaro cosido', ['No lo uses', 'en la plaza.']),
      note('p-12-turno', 'casa-ventana', [-1.8, 1.1, 0.1], 'El papel del turno', ['Antes del amanecer.', 'Te guardo tu parte.']),
    ],
  },
  11: { ...base, title: 'La casa de Oliva', tint: '#bbb097', light: '#ffe0ac',
    pieces: [...furniture, prop('watering_can_metal_01', [-1.2, 0, 1.8], 0.42),
      { id: 'canasta', url: '/models/d11/wicker_basket_01.glb', height: 0.3, position: [1.4, 0, -2.1] },
      { id: 'peras', url: '/models/d11/food_pears_asian_01.glb', height: 0.1, position: [0.8, 0.8, -0.7] }],
    items: [
      note('p-11-racion', 'casa-mesa', [0.5, 0.81, -0.6], 'La cuenta de Oliva', ['Lo que cosechamos', 'Lo que comemos']),
      note('p-11-silbido', 'casa-ventana', [-1.8, 1.1, 0.1], 'Cuatro notas', ['Cuando la torre calle,', 'contestá desde el campo.'], true),
    ],
  },
  4: { ...base, title: 'La casa de Marin', tint: '#a4b4ad', light: '#d7e5dc',
    pieces: [...furniture, prop('vintage_day_bed', [1.1, 0, -2.1], 0.8), prop('fish_knife', [1.1, 0.8, -0.8], 0.04),
      { id: 'cuenco', url: '/models/d4/cuenco.glb', height: 0.12, position: [0.5, 0.8, -0.6] },
      { id: 'red', url: '/models/d4/red.glb', height: 0.75, position: [-1.25, 0, 1.5] }],
    items: [{ id: 'cuenco', spot: 'casa-mesa', position: [0.5, 0.8, -0.6], size: [0.35, 0.25, 0.35] },
      note('p-4-cuota', 'casa-mesa', [0.9, 0.81, -0.7], 'La cuenta del muelle', ['Hoy, primero la cuota.', '¿Y nuestra cena?']),
      note('p-4-marea', 'casa-ventana', [-1.8, 1.1, 0.1], 'El mensaje de la marea', ['Buscá entre las redes.', 'No tires la botella.'], true),
    ],
  },
});

// Un interior usa su pasillo central, no el eje de la calle del distrito.
export function interiorPath(from, to) {
  return [from, [0, from[1], from[2]], [0, to.position[1], to.position[2]], to.position]
    .filter((p, i, a) => !i || Math.hypot(...p.map((v, k) => v - a[i - 1][k])) > 0.01);
}
export function roomItemDefinitions(data, room) {
  return room.items.map((override) => ({ ...data.interactables.find((item) => item.id === override.id), ...override }));
}

// El granero sí incluye vigas, piso y altillo en el archivo gratuito descargado.
export const BARN11 = Object.freeze({
  id: 'galpon', kind: 'barn', title: 'El granero de Oliva', start: 'granero-entrada', returnSpot: 'galpon',
  shell: { url: '/models/scene-props/old_wooden_barn_house_4.glb', matte: true, height: 4, rotationY: Math.PI },
  tint: '#b3a28a', light: '#ffe3ad',
  spots: [
    { id: 'granero-entrada', label: 'La entrada del granero', position: [0, 1.6, 3.1], look: [0, 1.1, -1], aura: [0, 0.2, 2.7] },
    { id: 'granero-cajones', label: 'Los cajones', position: [0.45, 1.6, 0.3], look: [-0.85, 0.7, -1.4], aura: [-0.6, 0.7, -1.4] },
    { id: 'granero-salida', label: 'Salir del granero', exit: true, position: [0, 1.6, 3.3], look: [0, 1.5, 4.5], aura: [0, 1.1, 3.7] },
  ],
  pieces: [
    { id: 'cajones', url: '/models/d11/cajon-peras.glb', height: 0.5, position: [-0.8, 0.07, -1.5] },
    { id: 'canasta', url: '/models/d11/wicker_basket_01.glb', height: 0.3, position: [0.7, 0.07, 1.4] },
    prop('watering_can_metal_01', [-0.9, 0.07, 2.4], 0.4),
  ], items: [
    note('p-11-envio', 'granero-cajones', [-0.85, 0.6, -1.25], 'El registro del granero', ['DESTINO: CAPITOLIO', 'Carga completa.']),
    keepsake('p-11-reserva', 'granero-cajones', [-0.4, 0.08, -1.25], 'La reserva escondida', ['Para la próxima', 'siembra.']),
  ],
});
export const ROOMS = Object.freeze({
  12: { casa: INTERIORS[12] },
  11: { casa: INTERIORS[11], galpon: BARN11 },
  4: { casa: INTERIORS[4] },
});
