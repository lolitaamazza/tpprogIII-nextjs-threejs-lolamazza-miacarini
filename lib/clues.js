// Las pistas que se desbloquean (idea tomada del proyecto "Contención"): herramientas que se llevan de un distrito,
// marcas del sinsajo que solo aparecen con una herramienta y pistas que guían hacia otro lugar.
// Los fragmentos siguen en `fragments.js`. Puro: se prueba con `node --test`.
import { FRAGMENT_TOTAL, foundFragments } from './fragments.js';

// Cada herramienta abre tres lugares en otros distritos (ver `MARKS`).
export const TOOLS = Object.freeze([
  { id: 'farol', district: '12', title: 'El farol del minero', line: 'Un farol de minero que todavía tiene aceite. Sirve para ver en lugares oscuros.' },
  { id: 'llave', district: '6', title: 'La llave del depósito', line: 'Una llave vieja del depósito de trenes. Abre los candados.' },
  { id: 'radio', district: '3', title: 'La radio a pilas', line: 'Una radio a pilas arreglada a mano. Sintoniza lo que el Capitolio no emite.' },
]);

// Una marca por lugar que abre cada herramienta: quién organiza la resistencia en ese distrito.
export const MARKS = Object.freeze([
  { id: 'm-2-cueva', district: '2', tool: 'farol', title: 'Rayas en la cueva', line: 'En la cueva hay rayas en la roca, una por cada día de huelga en la cantera.' },
  { id: 'm-7-bosque', district: '7', tool: 'farol', title: 'El pino tallado', line: 'Un sinsajo tallado en un pino. Debajo, una flecha que apunta al norte.' },
  { id: 'm-3-sotano', district: '3', tool: 'farol', title: 'El transmisor del sótano', line: 'En el sótano hay un transmisor desarmado. Alguien lo está arreglando de a poco.' },
  { id: 'm-1-vitrina', district: '1', tool: 'llave', title: 'El broche de la vitrina', line: 'Entre las joyas hay un broche con un sinsajo. No figura en el inventario.' },
  { id: 'm-8-casillero', district: '8', tool: 'llave', title: 'Los parches del casillero', line: 'En el casillero hay cien parches con un sinsajo, listos para coser.' },
  { id: 'm-10-granero', district: '10', tool: 'llave', title: 'El granero cerrado', line: 'En el granero cerrado esconden comida para los que no piden al Capitolio.' },
  { id: 'm-5-turbinas', district: '5', tool: 'radio', title: 'La voz de las turbinas', line: 'Entre el ruido de las turbinas, una voz cuenta los minutos del próximo apagón.' },
  { id: 'm-11-torre', district: '11', tool: 'radio', title: 'El silbido de la torre', line: 'Desde la torre, una voz silba las cuatro notas del sinsajo.' },
  { id: 'm-13-senal', district: '13', tool: 'radio', title: 'La señal completa', line: 'La señal del 13 se escucha completa. Estamos listos cuando ustedes lo estén.' },
]);

// Las pistas que guían: no cuentan para el final, dicen a dónde ir o qué buscar.
export const HINTS = Object.freeze([
  { id: 'p-12-turno', district: '12', title: 'El papel del turno', line: 'Un horario de la mina y una promesa de guardar la cena.', detail: 'Ash dejó la hora de entrada junto a la ventana: antes del amanecer. Abajo, otra letra agregó: «Si no volvés para cenar, te guardo tu parte». La mina se lleva el día; en esta casa todavía le reservan un lugar.' },
  { id: 'p-12-costura', district: '12', title: 'El pájaro cosido', line: 'Un pájaro bordado que alguien pidió esconder en la plaza.', detail: 'Dentro de la caja hay un retazo con un pájaro bordado. Al dorso: «No lo uses en la plaza». No es un adorno: alguien eligió guardar un símbolo que no se puede mostrar.' },
  { id: 'p-11-racion', district: '11', title: 'La cuenta de Oliva', line: 'Oliva compara lo que cosechan con lo que llega a su mesa.', detail: 'Oliva dividió una hoja en dos: «lo que cosechamos» y «lo que comemos». La primera columna ocupa toda la página. La segunda termina en una línea. Hay fruta sobre la mesa, pero llevarse una del huerto puede costarle un castigo.' },
  { id: 'p-11-silbido', district: '11', title: 'Cuatro notas en el marco', line: 'Cuatro notas conectan la ventana de Oliva con el campo.', detail: 'Cuatro marcas y un pájaro, dibujados junto a la ventana. Una nota dice: «Cuando la torre calle, contestá desde el campo». Oliva no silba solamente para pasar las horas: también escucha si alguien responde.' },
  { id: 'p-11-envio', district: '11', title: 'El registro del granero', line: 'Los envíos al Capitolio están completos. Las despensas del distrito, no.', detail: 'Los cajones tienen destino: Capitolio. En el registro figura «carga completa», incluso junto a la fecha en que faltó comida en las casas. Una mano tachó la firma del supervisor. Alguien quiso dejar constancia de la diferencia.' },
  { id: 'p-11-reserva', district: '11', title: 'La reserva escondida', line: 'Alguien guarda semillas para la próxima siembra.', detail: 'Bajo la tapa hay semillas envueltas en papel. «No son para el envío. Guardá algunas para la próxima siembra». El mismo pájaro de la ventana aparece en una esquina. Hay quienes empiezan a guardar algo para los demás.' },
  { id: 'p-4-cuota', district: '4', title: 'La cuenta del muelle', line: 'La cuota del depósito se paga antes de llenar el cuenco.', detail: 'Marin anotó la pesca de ayer y lo que se llevaron al depósito. Al final escribió: «Hoy, primero la cuota». El cuenco de la casa sigue vacío. Saber sacar peces del agua no significa poder llevarlos a la mesa.' },
  { id: 'p-4-marea', district: '4', title: 'El mensaje de la marea', line: 'Un mensaje pide buscar noticias entre las redes del muelle.', detail: 'Un papel doblado junto a la ventana dice: «Si encontrás una botella entre las redes, no la tires. Hay noticias que no llegan por el tren». Debajo hay un pájaro dibujado con tres trazos. Afuera, las redes esperan.' },
  { id: 'p-12-libreta', district: '12', title: 'La libreta de Ash', line: 'Cada vez que Ash pidió comida hizo una raya. Su hermana menor ya tiene dos.' },
  { id: 'p-12-cartel', district: '12', title: 'El cartel de la mina', line: 'Debajo del hollín, el cartel pide cuarenta toneladas de carbón por día.' },
  { id: 'p-12-nicho', district: '12', title: 'El nicho del túnel', line: 'Alguien rayó un sinsajo y el número 6. En el 6 está la llave del depósito.' },
  { id: 'p-4-botella', district: '4', title: 'La botella en la red', line: 'Adentro de la botella hay un papel. Dice que en el Distrito 3 alguien arregla radios a escondidas.' },
]);

export const MARK_TOTAL = MARKS.length;
// Con estas marcas o más, el final suma la voz de la resistencia a la transmisión.
export const MARKS_FOR_VOICE = 6;

export function clueById(id) {
  if (typeof id !== 'string') return null;
  const lists = [['tool', TOOLS], ['mark', MARKS], ['hint', HINTS]];
  for (const [kind, list] of lists) {
    const clue = list.find((c) => c.id === id);
    if (clue) return { ...clue, kind };
  }
  const [fragment] = foundFragments([id]);
  return fragment ? { ...fragment, kind: 'fragment' } : null;
}

// La línea de arriba de la tarjeta: qué tipo de pista es, cuántas van (fragmentos y marcas) y de qué distrito.
export function clueMeta(clue, story) {
  const where = `Distrito ${clue.district}`;
  if (clue.kind === 'fragment') return `Fragmento ${story.fragments.length}/${FRAGMENT_TOTAL} · ${where}`;
  if (clue.kind === 'mark') return `Marca del sinsajo ${story.marks.length}/${MARK_TOTAL} · ${where}`;
  return `${clue.kind === 'tool' ? 'Herramienta' : 'Pista'} · ${where}`;
}
