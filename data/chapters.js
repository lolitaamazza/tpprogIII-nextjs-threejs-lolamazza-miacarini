export const chapters = [
  {
    id: 'bosque', clueId: 'forest', number: '01', label: 'El bosque', place: 'forest',
    eyebrow: 'SECTOR 07 / CAPÍTULO I', title: 'Lo que los árboles recuerdan.',
    copy: 'La niebla amortigua tus pasos. Una voz grabada susurra: «No sigas el fuego. Sigue lo que puede apagarlo».',
    artifact: '«Cuando caiga el rayo, sigue el agua. La salida no está en el centro: está en la costura del cielo.»',
    instruction: 'Examina la corteza y resuelve el acertijo del cilindro.',
    color: '#d1aa69', accent: '#99bca0',
  },
  {
    id: 'lago', clueId: 'lake', number: '02', label: 'El lago', place: 'lake',
    eyebrow: 'SECTOR 04 / CAPÍTULO II', title: 'La memoria del agua.',
    copy: 'Bajo el muelle espera un recipiente hermético. Su cierre responde a tres símbolos.',
    artifact: '«El cable no alimenta la barrera. La escucha. Frecuencia de mantenimiento: 7.5 MHz.»',
    instruction: 'Activa raíz → corriente → descarga para abrir el recipiente.',
    color: '#76b0aa', accent: '#d8d39a',
  },
  {
    id: 'torre', clueId: 'tower', number: '03', label: 'La torre', place: 'tower',
    eyebrow: 'SECTOR 12 / CAPÍTULO III', title: 'La voz de la torre.',
    copy: 'En lo alto sobrevive un receptor. La señal real se esconde dentro de las interferencias.',
    artifact: '«El sector 12 queda a oscuras durante el reinicio. Tienes una ruta. Ahora necesitas que alguien la recuerde.»',
    instruction: 'Sintoniza el receptor a 7.5 MHz para reconstruir la señal.',
    color: '#b9a3d6', accent: '#e7bf7c',
  },
];
export const sceneSlug = { forest: 'bosque', lake: 'lago', tower: 'torre' };
export const sceneBySlug = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter.clueId]));
export const names = Object.fromEntries(chapters.map(({ clueId, label }) => [clueId, label]));
export const sectors = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  return { number, id: { 4: 'lake', 7: 'forest', 12: 'tower' }[number] || null,
    x: 50 + 42 * Math.cos(((number * 30 - 105) * Math.PI) / 180),
    y: 50 + 42 * Math.sin(((number * 30 - 105) * Math.PI) / 180) };
});
export const industries = ['Lujo','Mampostería','Tecnología','Pesca','Energía','Transporte','Madera','Textiles','Cereales','Ganadería','Agricultura','Carbón'];
export const districtStories = [
  'Los escaparates brillan, pero las manos que tallan las joyas nunca salen en las pantallas.',
  'La piedra guarda calor después del atardecer. En sus juntas viajan mensajes que ningún altavoz registra.',
  'Un circuito pequeño puede desviar una señal enorme. Aquí, reparar también puede ser resistir.',
  'Las redes no solo atrapan peces. A veces devuelven botellas que alguien arrojó desde otra costa.',
  'La luz del Capitolio empieza aquí. Quienes mantienen las turbinas saben cómo suena un apagón.',
  'Cada vagón lleva un destino. Los mecánicos conocen las vías que los mapas oficiales omiten.',
  'Entre anillos de madera quedan estaciones enteras. Los leñadores reconocen una marca hecha a propósito.',
  'Las costuras esconden más que hilos: nombres, rutas, despedidas. Un abrigo puede ser un archivo.',
  'El viento atraviesa los silos. Un silbido corto se repite de campo en campo.',
  'Los caminos entre corrales sobreviven a los controles. Cuidar significa aprender a observar.',
  'Una canción acompaña la cosecha. Su última estrofa cambia cuando hay vigilantes cerca.',
  'Bajo el polvo del carbón persiste una brasa. En el límite del bosque comienza otra forma de mirar Panem.',
];
export const districtCoordinates = [[29,24],[33,40],[59,43],[7,36],[18,59],[65,23],[24,7],[62,58],[48,28],[35,81],[60,75],[81,49]];
export const people = [
  { symbol: '➶', name: 'Katniss Everdeen', label: 'DISTRITO 12 / EL SÍMBOLO', copy: 'Una cazadora cuya capacidad de observar el bosque recuerda que sobrevivir empieza por prestar atención.', artifact: 'En esta aventura, las marcas de los árboles evocan esa forma de leer el terreno.' },
  { symbol: '≈', name: 'Finnick Odair', label: 'DISTRITO 4 / LA CORRIENTE', copy: 'Detrás de la imagen del vencedor hay una vida que el espectáculo no puede resumir. El agua es territorio y memoria.', artifact: 'La pista del lago toma el agua como refugio y vía para preservar un mensaje.' },
  { symbol: 'ϟ', name: 'Beetee Latier', label: 'DISTRITO 3 / LA SEÑAL', copy: 'Comprender un sistema permite imaginar cómo interrumpirlo. Un cable puede convertirse en una posibilidad.', artifact: 'La torre convierte esa idea en un desafío: escuchar antes de actuar.' },
];
