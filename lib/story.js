// La historia: tres días antes de la Cosecha. Ash (12), Oliva (11) y Marin (4) tienen su nombre en la urna;
// cada día se juega la jornada de uno y después se decide si pide comida al Capitolio (las "teselas" del libro):
// la familia come, pero su nombre entra más veces en la urna. En la interfaz no se dice "tesela".
// Puro: se prueba con `node --test`. Los días jugados son los distritos encendidos del progreso (`litDistricts`).
import { FRAGMENT_TOTAL, MONTAGE_MIN } from './fragments.js';
import { TOOLS, MARKS, HINTS, MARK_TOTAL, MARKS_FOR_VOICE } from './clues.js';

export const STORY_DAYS = ['12', '11', '4'];

// Quién es cada uno (ver docs/superpowers/specs/2026-11-04-historia-y-visor-design.md):
// `voice`: lo que dice al llegar a su distrito; `family`: quién depende de él o ella (íconos del visor);
// `waiting`: cómo se nombra a su familia en el final; `portions`: la comida que queda en su casa ese día;
// `quota`: cómo termina la jornada; `refused`: lo que pasa esa noche si no pide comida;
// `saved` / `reaped`: lo que siente en la plaza si se salva o si sale su nombre; `farewell`: su despedida.
export const PROTAGONISTS = Object.freeze({
  12: {
    name: 'Ash', age: 16, tributeId: 'tribute-24', portions: 2,
    voice: [
      'Me llamo Ash. Tengo dieciséis años y bajo a la mina desde los doce.',
      'Mamá ya no puede respirar bien. El polvo del carbón se le quedó adentro.',
      'Ahora hago su turno y el mío. Tomi tiene ocho años y cree que es por un tiempo.',
      'Faltan tres días para la Cosecha. Mi nombre ya está cinco veces en la urna.',
    ],
    family: [{ name: 'Nora', kind: 'sick' }, { name: 'Tomi', kind: 'child' }],
    waiting: 'Nora y Tomi siguen esperando',
    quota: 'Ash salió de la mina con las manos negras. En su casa quedan dos porciones para tres. Tomi preguntó si hoy hay cena.',
    refused: 'Esta noche Ash le da su parte a Tomi y le dice que ya comió.',
    saved: 'No soy yo. Respiro por primera vez en el día. Busco a Tomi entre la gente y no lo suelto.',
    reaped: 'Escucho mi nombre y miro a Tomi. Hasta hoy no sabía qué era la Cosecha. Ahora sí lo sabe.',
    farewell: 'Tomi me da el pájaro cosido. Mamá me dice que respire. Le prometo a Tomi que vuelvo para la cena.',
  },
  11: {
    name: 'Oliva', age: 15, tributeId: 'tribute-21', portions: 3,
    voice: [
      'Soy Oliva. Tengo quince años y trabajo en el huerto desde que tengo memoria.',
      'A papá lo mataron desde esa torre. Cruzó el alambrado de noche para traernos comida.',
      'Ahora mamá, Lila y Brisa dependen de lo que yo junte.',
      'Cosecho bajo la misma torre. Cada vez que gira la luz, me acuerdo.',
    ],
    family: [{ name: 'Mamá', kind: 'adult' }, { name: 'Lila', kind: 'child' }, { name: 'Brisa', kind: 'child' }],
    waiting: 'Su mamá, Lila y Brisa siguen esperando',
    quota: 'Oliva llenó todos los cajones y se los llevan al Capitolio. En su casa quedan tres porciones para cuatro.',
    refused: 'Esta noche Oliva reparte la comida entre su mamá y sus hermanas. Ella no cena.',
    saved: 'No soy yo. A mi lado llora la mamá de la chica que salió. Le agarro la mano.',
    reaped: 'Escucho mi nombre. Subo al escenario mirando la torre. No voy a bajar la vista.',
    farewell: 'Lila me pregunta quién va a contestar las notas. Le enseño a silbarlas. Brisa no me suelta.',
  },
  4: {
    name: 'Marin', age: 14, tributeId: 'tribute-7', portions: 1,
    voice: [
      'Soy Marin. Tengo catorce años y pesco desde el muelle donde pescaba mamá.',
      'Hace seis años la sacaron en la Cosecha. La vi irse en el tren y no volvió.',
      'Vivo con mi abuela Inés. Ya casi no ve, así que la red es mía.',
      'Mañana es la Cosecha. Este año mi nombre está más de una vez.',
    ],
    family: [{ name: 'Inés', kind: 'elder' }],
    waiting: 'Inés sigue esperando',
    quota: 'Marin volvió con la red llena y el depósito se queda con casi todo. A la abuela Inés le toca un pescado chico.',
    refused: 'Esta noche Marin le deja el pescado a su abuela. Le dice que ya comió en el muelle.',
    saved: 'No soy yo. La abuela me aprieta el brazo tan fuerte que me duele. Mamá también estuvo acá.',
    reaped: 'Escucho mi nombre, igual que el de mamá hace seis años. Subo por la misma escalera.',
    farewell: 'La abuela me toca la cara para verme. Me da el cuenco de mamá y me pide que traiga algo para llenarlo.',
  },
});

// Un papel por año desde los 12, como en el libro.
const startingPapers = () => Object.fromEntries(STORY_DAYS.map((d) => [d, PROTAGONISTS[d].age - 11]));

export function createStory() {
  return { version: 1, papers: startingPapers(), tesserae: {}, pending: null, fragments: [], tools: [], marks: [], hints: [], gamesEnded: false };
}

export function storyDay(story, lit = []) {
  const index = STORY_DAYS.findIndex((d) => !lit.includes(d));
  return index === -1 ? null : { index, district: STORY_DAYS[index] };
}

export function storyPhase(story, lit = []) {
  if (story.gamesEnded) return 'games-ended';
  if (story.pending) return 'decision';
  return storyDay(story, lit) ? 'day' : 'cosecha';
}

// Terminar la jornada del día deja pendiente la decisión: si salió sin perder vidas, pedir comida suma un papel; si no, dos.
// `lit` son los días ya jugados antes de esta jornada (los distritos encendidos).
export function completeDay(story, district, { perfect = false, lit = [] } = {}) {
  if (story.pending || storyDay(story, lit)?.district !== district) return story;
  return { ...story, pending: { district, cost: perfect ? 1 : 2 } };
}

export function decideTesserae(story, accept) {
  if (!story.pending) return story;
  const { district, cost } = story.pending;
  return {
    ...story,
    papers: { ...story.papers, [district]: story.papers[district] + (accept ? cost : 0) },
    tesserae: { ...story.tesserae, [district]: accept ? cost : 0 },
    pending: null,
  };
}

// Sorteo con pesos (los papeles de cada uno), determinista por semilla: recargar no cambia el resultado.
export function reapedDistrict(papers, seed) {
  const s = (Math.imul(seed >>> 0, 2654435761) + 1013904223) >>> 0;
  const total = STORY_DAYS.reduce((sum, d) => sum + papers[d], 0);
  let roll = (s / 4294967296) * total;
  for (const d of STORY_DAYS) {
    roll -= papers[d];
    if (roll < 0) return d;
  }
  return STORY_DAYS.at(-1);
}

const NUMBERS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince'];

// En la urna, debajo de su nombre: "Su nombre estaba cinco veces en la urna."
export function papersLine(district, papers) {
  const n = papers[district];
  return `Su nombre estaba ${n === 1 ? 'una vez' : `${NUMBERS[n] ?? n} veces`} en la urna.`;
}

// El cierre: quién fue a la arena (`reaped`, el distrito del protagonista), cuántos fragmentos salieron al aire
// y, con seis marcas del sinsajo o más, que la resistencia habló en la transmisión.
export function endingLines(story, reaped) {
  const lines = [];
  if (reaped && PROTAGONISTS[reaped]) {
    const [a, b] = STORY_DAYS.filter((d) => d !== reaped);
    const count = (d) => NUMBERS[story.papers[d]] ?? String(story.papers[d]);
    lines.push(`${PROTAGONISTS[reaped].name} fue a la arena. Su nombre estaba ${count(reaped)} veces en la urna, el de ${PROTAGONISTS[a].name} ${count(a)} y el de ${PROTAGONISTS[b].name} ${count(b)}.`);
    lines.push(`${PROTAGONISTS[reaped].waiting} en el Distrito ${reaped}.`);
  }
  const n = story.fragments.length;
  if (n >= MONTAGE_MIN) lines.push(`Salieron al aire ${n} de ${FRAGMENT_TOTAL} fragmentos.`);
  else lines.push(n ? 'Los fragmentos no alcanzaron para una transmisión. Quedan en el archivo.' : 'Ningún fragmento salió al aire.');
  const marks = story.marks?.length ?? 0;
  if (marks >= MARKS_FOR_VOICE) lines.push(`La resistencia habló en la transmisión. Se encontraron ${marks} de ${MARK_TOTAL} marcas del sinsajo.`);
  return lines;
}

export function findFragment(story, id) {
  return story.fragments.includes(id) ? story : { ...story, fragments: [...story.fragments, id] };
}

// Herramientas, marcas y pistas: cada una se guarda una sola vez y solo si existe en `clues.js`.
const CLUE_IDS = { tools: TOOLS, marks: MARKS, hints: HINTS };
const knownClues = (key, list) => (Array.isArray(list) ? [...new Set(list.filter((id) => CLUE_IDS[key].some((c) => c.id === id)))] : []);

function addClue(story, key, id) {
  const list = story[key] ?? [];
  if (list.includes(id) || !CLUE_IDS[key].some((c) => c.id === id)) return story;
  return { ...story, [key]: [...list, id] };
}

export const takeTool = (story, id) => addClue(story, 'tools', id);
export const findMark = (story, id) => addClue(story, 'marks', id);
export const findHint = (story, id) => addClue(story, 'hints', id);

export function markGamesEnded(story) {
  return story.gamesEnded ? story : { ...story, gamesEnded: true };
}

// Lo guardado en el navegador puede venir roto o de otra versión: lo que no cierra vuelve a empezar.
export function normalizeStory(value) {
  const fresh = createStory();
  if (!value || value.version !== 1 || typeof value !== 'object') return fresh;
  const papers = value.papers ?? {};
  if (!STORY_DAYS.every((d) => Number.isInteger(papers[d]) && papers[d] >= 1 && papers[d] <= 30)) return fresh;
  const tesserae = Object.fromEntries(STORY_DAYS.filter((d) => [0, 1, 2].includes(value.tesserae?.[d])).map((d) => [d, value.tesserae[d]]));
  const pending = value.pending && STORY_DAYS.includes(value.pending.district) && [1, 2].includes(value.pending.cost) ? { district: value.pending.district, cost: value.pending.cost } : null;
  const fragments = Array.isArray(value.fragments) ? [...new Set(value.fragments.filter((id) => typeof id === 'string' && id.length < 40))] : [];
  return {
    version: 1, papers: { ...papers }, tesserae, pending, fragments,
    tools: knownClues('tools', value.tools), marks: knownClues('marks', value.marks), hints: knownClues('hints', value.hints),
    gamesEnded: value.gamesEnded === true,
  };
}

// La tele del Capitolio entre días: su versión feliz del distrito que se acaba de jugar y la cuenta regresiva.
export const BULLETINS = Object.freeze({
  12: { headline: 'DISTRICT 12 EXCEEDS ITS QUOTA', body: 'Proud miners keep the Capitol warm.', ticker: 'THE REAPING · IN TWO DAYS' },
  11: { headline: 'RECORD HARVEST IN DISTRICT 11', body: 'Every basket is a gift to Panem.', ticker: 'THE REAPING · TOMORROW' },
  4: { headline: 'DISTRICT 4 FEEDS THE NATION', body: 'The sea has never been so generous.', ticker: 'TOMORROW · THE REAPING · MAY THE ODDS BE EVER IN YOUR FAVOR' },
});
