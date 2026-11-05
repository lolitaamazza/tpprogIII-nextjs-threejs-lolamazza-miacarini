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
  { id: 'p-12-turno', district: '12', title: 'El papel del turno', line: 'Nora le guarda la cena a Ash aunque ella no coma.', detail: '«Antes del amanecer. Te guardo tu parte.» Nora le deja la cena guardada aunque ella no coma. Abajo, con la letra de Tomi, «yo también te espero».' },
  { id: 'p-12-costura', district: '12', title: 'El pájaro cosido', line: 'Un pájaro bordado que no se puede mostrar en la plaza.', detail: 'Un pájaro bordado en un retazo de la ropa de mamá. «No lo uses en la plaza.» Si lo ven, la castigan a ella.' },
  { id: 'p-11-racion', district: '11', title: 'La cuenta de Oliva', line: 'Lo que cosechan llena la hoja. Lo que comen, una línea.', detail: 'Dos columnas. «Lo que cosechamos» llena la hoja. «Lo que comemos» es una sola línea. Abajo, con letra apurada, «papá cruzó por esto».' },
  { id: 'p-11-silbido', district: '11', title: 'Cuatro notas en la pared', line: 'Las cuatro notas que silbaba papá desde el campo.', detail: 'Cuatro marcas y un pájaro dibujados en la pared. Son las notas que silbaba Teo desde el campo. «Cuando la torre calle, contestá.» Oliva todavía contesta.' },
  { id: 'p-11-envio', district: '11', title: 'El registro del granero', line: 'Los cajones al Capitolio, completos. Las cenas del distrito, no.', detail: 'Destino Capitolio. Carga completa. La misma semana, en tres casas del distrito no hubo cena. Alguien tachó la firma del supervisor.' },
  { id: 'p-11-reserva', district: '11', title: 'La reserva escondida', line: 'Semillas guardadas por papá para cuando el huerto sea de ellos.', detail: 'Semillas envueltas en un papel con la letra de Teo. «Para cuando el huerto sea nuestro.» Oliva nunca se animó a plantarlas.' },
  { id: 'p-4-cuota', district: '4', title: 'La cuenta del muelle', line: 'Primero la cuota. La abuela pregunta cuándo come Marin.', detail: 'Marin anotó la pesca de ayer y lo que se llevó el depósito. «Hoy, primero la cuota.» Abajo, con letra temblorosa, la abuela escribió «¿y vos cuándo comés?».' },
  { id: 'p-4-marea', district: '4', title: 'El mensaje de la marea', line: 'Una nota de su mamá, guardada seis años.', detail: 'Una nota de Perla, clavada en la pared hace seis años. «Si encontrás una botella entre las redes, no la tires.» Debajo hay un pájaro dibujado con tres trazos.' },
  { id: 'p-12-libreta', district: '12', title: 'La libreta de Ash', line: 'Cada raya es un día sin comida en la casa. Al lado, «que Tomi nunca tenga que pedir».' },
  { id: 'p-12-cartel', district: '12', title: 'El cartel de la mina', line: 'Cuota diaria, cuarenta toneladas. Quien no la cumple pierde su ración.' },
  { id: 'p-12-nicho', district: '12', title: 'El nicho del túnel', line: 'Alguien rayó un sinsajo y el número 6. En el 6 guardan la llave del depósito.' },
  { id: 'p-4-botella', district: '4', title: 'La botella en la red', line: 'Adentro hay un papel. En el Distrito 3 alguien arregla radios. Escuchan lo que el Capitolio calla.' },
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
  if (clue.kind === 'fragment') return `Fragmento ${story.fragments.length}/${FRAGMENT_TOTAL} / ${where}`;
  if (clue.kind === 'mark') return `Marca del sinsajo ${story.marks.length}/${MARK_TOTAL} / ${where}`;
  return `${clue.kind === 'tool' ? 'Herramienta' : 'Pista'} / ${where}`;
}
