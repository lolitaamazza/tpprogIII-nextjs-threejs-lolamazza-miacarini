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
