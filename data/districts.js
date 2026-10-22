// Datos de las 14 piezas del mapa (13 distritos + Capitolio).
// Sin imports con alias: este módulo también se prueba con `node --test`.

export const PLAYABLE_IDS = ['12', '11', '4'];

export const DISTRICTS = [
  { id: '1', number: '1', name: 'Distrito 1', industry: 'Lujo', color: '#5b5e64', litColor: '#ecdca8',
    quote: 'Las joyas que brillan en el Capitolio se pulen acá, a mano, de noche.' },
  { id: '2', number: '2', name: 'Distrito 2', industry: 'Mampostería', color: '#6b3a2a', litColor: '#e8875f',
    quote: 'La piedra de estas montañas sostiene los muros del Capitolio. También los cuarteles de los Agentes de la Paz.' },
  { id: '3', number: '3', name: 'Distrito 3', industry: 'Tecnología', color: '#2f3e39', litColor: '#7fe0c4',
    quote: 'Cada cable que sale de acá sabe escuchar. Algunos aprendieron a interrumpir.' },
  { id: '4', number: '4', name: 'Distrito 4', industry: 'Pesca', color: '#5e6b78', litColor: '#6fc3ff',
    quote: 'El mar no le pertenece al Capitolio. Solo lo que sale de él en las redes.',
    playable: true, layer: 'pad', actionsToComplete: 3, actionLabel: 'Lanzar red',
    instruction: 'Mantené apretado sobre el agua y soltá sobre los peces.',
    hud: { score: 'Peces', lives: 'Redes' }, keyHint: 'Con el botón o la barra espaciadora: una vez carga la red, otra vez la tira.',
    lostMessage: 'Se terminaron las redes. Los peces siguen ahí.', helpNote: 'Ahora el agua está calma y la red es más grande.' },
  { id: '5', number: '5', name: 'Distrito 5', industry: 'Energía', color: '#6b6a45', litColor: '#e8e46c',
    quote: 'Las turbinas no descansan. Cuando se detienen, Panem entero se queda a oscuras.' },
  { id: '6', number: '6', name: 'Distrito 6', industry: 'Transporte', color: '#4b4b53', litColor: '#b9b9ff',
    quote: 'Los trenes llevan tributos al Capitolio. Los mecánicos conocen las vías que nadie vigila.' },
  { id: '7', number: '7', name: 'Distrito 7', industry: 'Madera', color: '#6c6c6c', litColor: '#8fd18a',
    quote: 'Entre los anillos de un tronco caben estaciones enteras de silencio.' },
  { id: '8', number: '8', name: 'Distrito 8', industry: 'Textiles', color: '#56595f', litColor: '#f29ad1',
    quote: 'Una costura puede esconder un mensaje. Un uniforme también puede ser una bandera.' },
  { id: '9', number: '9', name: 'Distrito 9', industry: 'Cereales', color: '#6e5233', litColor: '#f2c46b',
    quote: 'El pan del Capitolio empieza en estos silos.' },
  { id: '10', number: '10', name: 'Distrito 10', industry: 'Ganadería', color: '#4a2520', litColor: '#ff8a6b',
    quote: 'Los corrales están cercados. Los que los cuidan, también.' },
  { id: '11', number: '11', name: 'Distrito 11', industry: 'Agricultura', color: '#4b443a', litColor: '#ffd36b',
    quote: 'En los huertos, un silbido avisa que termina la jornada. Los sinsajos lo aprenden enseguida.',
    playable: true, layer: 'silbido', actionsToComplete: 4, actionLabel: 'Cosechar',
    instruction: 'Cosechá lejos del reflector.',
    songInstruction: 'Repetí el silbido tocando a los sinsajos.', songActionLabel: 'Escuchar de nuevo',
    hud: { score: 'Espigas', song: 'Silbido', lives: 'Sigilo' }, keyHint: 'Con el botón o la barra espaciadora se cosecha de a tres espigas: esperá que pase la luz.',
    songKeyHint: 'También con las teclas 1 a 4.',
    lostMessage: 'Te vieron tres veces: los Agentes de la Paz cerraron el campo por hoy.', helpNote: 'Ahora el reflector es más chico y más lento.' },
  { id: '12', number: '12', name: 'Distrito 12', industry: 'Carbón', color: '#5b5049', litColor: '#ff7a2f',
    quote: 'Bajo el polvo del carbón siempre queda una brasa.',
    playable: true, layer: 'percusion', actionsToComplete: 6, actionLabel: 'Picar',
    instruction: 'Picá cuando la luz pase por la grieta.',
    hud: { score: 'Bloques', lives: 'Canario' }, keyHint: 'También con el botón o la barra espaciadora.',
    lostMessage: 'El canario dejó de cantar: hay que salir a respirar.', helpNote: 'Ahora la grieta es más ancha y la luz va más lenta.' },
  { id: '13', number: '13', name: 'Distrito 13', industry: 'Clasificado', color: '#6d6d6d', litColor: '#ffffff',
    quote: 'Según el Capitolio, acá no queda nada. Entonces, ¿quién sigue transmitiendo?', classified: true },
  { id: 'c', number: 'C', name: 'El Capitolio', industry: 'Gobierno', color: '#6a6a6a', litColor: '#ff3b3b',
    quote: 'Desde acá se transmite todo lo que Panem tiene permitido ver.' },
].map((d) => ({ playable: false, classified: false, ...d }));

export const DISTRICT_ROUTE_IDS = Array.from({ length: 13 }, (_, i) => String(i + 1));
export const MAP_IDS = [...DISTRICT_ROUTE_IDS, 'c'];

export function getDistrict(id) {
  return DISTRICTS.find((d) => d.id === String(id)) ?? null;
}

export function isDistrictRouteId(id) {
  return id !== undefined && id !== null && DISTRICT_ROUTE_IDS.includes(String(id));
}
