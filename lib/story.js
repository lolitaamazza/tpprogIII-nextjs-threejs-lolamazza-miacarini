// La historia: tres días antes de la Cosecha. Ash (12), Oliva (11) y Marin (4) tienen su nombre en la urna;
// cada día se juega la jornada de uno y después se decide si pide comida al Capitolio (las "teselas" del libro):
// la familia come, pero su nombre entra más veces en la urna. En la interfaz no se dice "tesela".
// Puro: se prueba con `node --test`. Los días jugados son los distritos encendidos del progreso (`litDistricts`).
import { FRAGMENT_TOTAL, MONTAGE_MIN } from './fragments.js';

export const STORY_DAYS = ['12', '11', '4'];

// `quota`: cómo termina la jornada; `refused`: lo que pasa esa noche si no pide comida.
export const PROTAGONISTS = Object.freeze({
  12: { name: 'Ash', age: 16, tributeId: 'tribute-24', quota: 'Ash terminó su turno en la mina. En su casa no alcanza la comida para los cinco.', refused: 'Esta noche Ash no cena para que coman sus hermanos.' },
  11: { name: 'Oliva', age: 15, tributeId: 'tribute-21', quota: 'Oliva terminó la cosecha. El Capitolio se lleva casi todo y en su casa no alcanza la comida.', refused: 'Esta noche Oliva no cena para que coman sus hermanas.' },
  4: { name: 'Marin', age: 14, tributeId: 'tribute-7', quota: 'Marin volvió con la red llena, pero el Capitolio se queda con casi todo. En su casa no alcanza la comida.', refused: 'Esta noche Marin y su abuela no cenan.' },
});

// Un papel por año desde los 12, como en el libro.
const startingPapers = () => Object.fromEntries(STORY_DAYS.map((d) => [d, PROTAGONISTS[d].age - 11]));

export function createStory() {
  return { version: 1, papers: startingPapers(), tesserae: {}, pending: null, fragments: [], gamesEnded: false };
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

// El cierre: quién fue a la arena (`reaped`, el distrito del protagonista) y cuántos fragmentos salieron al aire.
export function endingLines(story, reaped) {
  const lines = [];
  if (reaped && PROTAGONISTS[reaped]) {
    const [a, b] = STORY_DAYS.filter((d) => d !== reaped);
    const count = (d) => NUMBERS[story.papers[d]] ?? String(story.papers[d]);
    lines.push(`${PROTAGONISTS[reaped].name} fue a la arena. Su nombre estaba ${count(reaped)} veces en la urna, el de ${PROTAGONISTS[a].name} ${count(a)} y el de ${PROTAGONISTS[b].name} ${count(b)}.`);
  }
  const n = story.fragments.length;
  if (n >= MONTAGE_MIN) lines.push(`Salieron al aire ${n} de ${FRAGMENT_TOTAL} fragmentos.`);
  else lines.push(n ? 'Los fragmentos no alcanzaron para una transmisión. Quedan en el archivo.' : 'Ningún fragmento salió al aire.');
  return lines;
}

export function findFragment(story, id) {
  return story.fragments.includes(id) ? story : { ...story, fragments: [...story.fragments, id] };
}

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
  return { version: 1, papers: { ...papers }, tesserae, pending, fragments, gamesEnded: value.gamesEnded === true };
}

// La tele del Capitolio entre días: su versión feliz del distrito que se acaba de jugar y la cuenta regresiva.
export const BULLETINS = Object.freeze({
  12: { headline: 'DISTRICT 12 EXCEEDS ITS QUOTA', body: 'Proud miners keep the Capitol warm.', ticker: 'THE REAPING · IN TWO DAYS' },
  11: { headline: 'RECORD HARVEST IN DISTRICT 11', body: 'Every basket is a gift to Panem.', ticker: 'THE REAPING · TOMORROW' },
  4: { headline: 'DISTRICT 4 FEEDS THE NATION', body: 'The sea has never been so generous.', ticker: 'TOMORROW · THE REAPING · MAY THE ODDS BE EVER IN YOUR FAVOR' },
});
