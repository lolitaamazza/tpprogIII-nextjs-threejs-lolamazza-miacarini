// Fragmentos: lo que la tele del Capitolio corta. Uno por distrito productivo, apoyado en su maqueta
// (`position` en coordenadas de la maqueta: radio ~1, el suelo está en y = 0.08). Puro: se prueba con `node --test`.
// La señal del Distrito 13 cuenta como el fragmento número 13 ('13-signal') cuando se revela.
export const FRAGMENTS = Object.freeze([
  { id: '1-voluntarios', district: '1', kind: 'document', title: 'Lista de voluntarios', line: 'En el Distrito 1 los chicos se anotan solos para los Juegos. Si ganan, su familia cobra.', position: [-0.5, 0.08, 0.7] },
  { id: '2-placa', district: '2', kind: 'object', title: 'Placa de un cuartel', line: 'Esta piedra del Distrito 2 es para un cuartel de Agentes de la Paz. Los que la cortaron no pueden entrar.', position: [0.55, 0.08, 0.66] },
  { id: '3-grabacion', district: '3', kind: 'recording', title: 'Grabación cortada', line: 'Grabación de una Cosecha vieja. Una madre grita el nombre de su hijo y el himno la tapa.', position: [0.85, 0.08, 0.2] },
  { id: '4-cuenco', district: '4', kind: 'object', title: 'El cuenco de Marin', line: 'El cuenco de Marin está vacío desde anoche. Todo lo que pescó se lo lleva el Capitolio.', position: [-0.84, 0.08, -0.32] },
  { id: '5-cortes', district: '5', kind: 'document', title: 'Plan de apagones', line: 'La noche de la Cosecha solo hay luz en la plaza y en las pantallas. El resto del distrito queda a oscuras.', position: [-0.85, 0.08, -0.2] },
  { id: '6-ruta', district: '6', kind: 'document', title: 'Pasaje del tren', line: 'Pasaje del tren que lleva a los tributos al Capitolio. Es solo de ida.', position: [0.2, 0.08, 0.8] },
  { id: '7-tronco', district: '7', kind: 'object', title: 'Tronco marcado', line: 'Alguien hizo una marca en el tronco por cada tributo del Distrito 7 que no volvió.', position: [-0.62, 0.08, 0.62] },
  { id: '8-forro', district: '8', kind: 'object', title: 'Uniforme sin terminar', line: 'Alguien cosió un sinsajo a escondidas en el forro. Es la señal de la rebelión.', position: [-0.82, 0.08, 0.35] },
  { id: '9-afiche', district: '9', kind: 'document', title: 'Afiche del Capitolio', line: 'El afiche dice que el Capitolio alimenta a sus hijos. Alguien escribió abajo «a cambio de sus nombres».', position: [-0.3, 0.08, 0.8] },
  { id: '10-raciones', district: '10', kind: 'document', title: 'Registro de carne', line: 'Casi toda la carne de este mes va al Capitolio. Lo que sobra es para los Agentes de la Paz.', position: [0.62, 0.08, 0.62] },
  { id: '11-parte', district: '11', kind: 'document', title: 'Castigo en la plaza', line: 'Una chica fue castigada en la plaza por comer una ciruela del huerto. Todo el distrito tuvo que mirar.', position: [0.8, 0.08, -0.35] },
  { id: '12-viga', district: '12', kind: 'object', title: 'La viga de la mina', line: 'En la viga hay nombres tallados. Son los mineros que no salieron de la mina. El último es del año pasado.', position: [0.62, 0.08, 0.55] },
]);

export const SIGNAL_FRAGMENT = '13-signal';
export const FRAGMENT_TOTAL = FRAGMENTS.length + 1;
// Con estos fragmentos o más, la transmisión pirata del final los muestra antes del mensaje.
export const MONTAGE_MIN = 4;
const SIGNAL = { id: SIGNAL_FRAGMENT, district: '13', kind: 'recording', title: 'La señal del 13', line: 'Alguien sigue transmitiendo.' };

// Lo encontrado, en el orden de los distritos y con la señal del 13 al final (ids desconocidos se ignoran).
export function foundFragments(ids) {
  return [...FRAGMENTS, SIGNAL].filter((f) => ids.includes(f.id));
}

export function fragmentsFor(district) {
  return FRAGMENTS.filter((f) => f.district === String(district));
}
