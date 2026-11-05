// Texto de presentación del mapa según el día de la historia. Puro: se prueba con `node --test`.
import { PROTAGONISTS, STORY_DAYS } from './story.js';
import { FRAGMENT_TOTAL } from './fragments.js';

const EYEBROW = 'MAPA DE PANEM / 13 DISTRITOS';
const DAYS = [
  { title: 'Faltan tres días para la Cosecha.', text: 'Día 1. Ash hace dos turnos en la mina del Distrito 12 porque su mamá ya no puede.' },
  { title: 'Faltan dos días.', text: 'Día 2. Oliva cosecha bajo la torre donde mataron a su papá, en el Distrito 11.' },
  { title: 'Mañana es la Cosecha.', text: 'Día 3. Marin sale a pescar sola en el Distrito 4. Su abuela la espera.' },
];

const copy = (title, text, action = null) => ({ eyebrow: EYEBROW, title, text, action });

// `phase` sale de `storyPhase`; `day` de `storyDay`; `pending` es la decisión de teselas sin tomar.
export function mapIntroCopy({ phase, day = null, pending = null, completed = false }) {
  if (completed) return copy('Panem ya no está a oscuras.', 'Podés recorrer los distritos o empezar de nuevo desde el archivo.');
  if (phase === 'games-ended') {
    return copy('Los Juegos terminaron.', 'Ahora podés cortar la transmisión del Capitolio y mostrar lo que encontraste.', { label: 'Ir al Capitolio', href: '/capitolio' });
  }
  if (phase === 'cosecha') return copy('Hoy es la Cosecha.', 'Hoy se sortea quién va a los Juegos.', { label: 'Ir a la plaza', href: '/plazas' });
  if (phase === 'decision' && pending) {
    return copy('Falta una decisión.', `${PROTAGONISTS[pending.district].name} tiene que decidir si pide comida.`, { label: `Volver al Distrito ${pending.district}`, href: `/escena/${pending.district}` }); // la decisión se toma en la escena del distrito
  }
  const { title, text } = DAYS[day?.index ?? 0];
  return copy(title, text);
}

// El botón del archivo pirata en el encabezado: el día de la historia y los fragmentos encontrados.
export function archiveLabel({ phase, day = null, pending = null, found = 0 }) {
  const index = pending ? STORY_DAYS.indexOf(pending.district) : day?.index;
  const label = phase === 'day' || phase === 'decision' ? `Día ${index + 1}/${STORY_DAYS.length}` : 'Cosecha';
  return { day: label, fragments: `${found}/${FRAGMENT_TOTAL}` };
}
