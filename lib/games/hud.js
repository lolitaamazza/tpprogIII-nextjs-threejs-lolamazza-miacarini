// Lo que muestra el HUD de la arena: una línea de eventos que rota, los vitales que importan y el estado.
// Puro: se prueba con `node --test`.
export const TICKER_SECONDS = 2.5;

// Los eventos del turno: primero los de tu tributo, después las caídas, después el resto (cada grupo en su orden).
export function turnHeadlines(run) {
  const events = run?.events.filter((e) => e.turn === run.turn) ?? [];
  const rank = (e) => (e.actors.includes(run.selectedId) ? 0 : e.type === 'elimination' ? 1 : 2);
  return events.map((e, i) => [e, i]).sort(([a, i], [b, j]) => rank(a) - rank(b) || i - j).map(([e]) => e);
}

export function headlineAt(list, seconds) {
  if (!list.length) return null;
  return list[Math.floor(seconds / TICKER_SECONDS) % list.length];
}

// Salud y energía siempre; hambre y sed recién cuando apremian (60 o más). Caído, nada.
export function vitalsFor(tribute) {
  if (!tribute?.alive) return [];
  const vitals = [{ key: 'health', label: 'Salud', value: tribute.health }, { key: 'energy', label: 'Energía', value: tribute.energy }];
  if (tribute.hunger >= 60) vitals.push({ key: 'hunger', label: 'Hambre', value: tribute.hunger, warning: true });
  if (tribute.thirst >= 60) vitals.push({ key: 'thirst', label: 'Sed', value: tribute.thirst, warning: true });
  return vitals;
}

export function statusLine(run) {
  const label = run.turn === 0 ? 'Apertura' : `Jornada ${Math.ceil(run.turn / 2)} · ${run.turn % 2 ? 'día' : 'noche'}`;
  return { label, alive: run.tributes.filter((t) => t.alive).length };
}
