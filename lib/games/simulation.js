import { resolveEncounter } from './encounters.js';
// Estado serializable: ninguna decisión depende del reloj, del DOM ni de Math.random.
export const VERSION = 1;
export const MAX_TURNS = 24;
export const PHASE_PATH = { reaping: '/cosecha', preparation: '/capitolio/preparacion', arena: '/arena', ended: '/desenlace' };
export const ZONES = ['Bosque', 'Río', 'Ruinas', 'Cornucopia'];
export const STRATEGIES = {
  shelter: { label: 'Buscar refugio', description: 'Recuperá energía y reducí la exposición.' },
  forage: { label: 'Buscar provisiones', description: 'Conseguí comida y agua, con riesgo de encuentro.' },
  ally: { label: 'Buscar alianza', description: 'Compartí recursos y protección con otro tributo.' },
  explore: { label: 'Explorar', description: 'Cambiá de zona y buscá equipo.' },
};
export const TRAINING = [
  { district: '12', label: 'Carbón · resistencia', options: [{ id: 'endurance', label: 'Resistencia', stat: 'strength' }, { id: 'shelter', label: 'Refugio', stat: 'stealth' }] },
  { district: '11', label: 'Agricultura · conocimiento', options: [{ id: 'plants', label: 'Plantas comestibles', stat: 'survival' }, { id: 'signals', label: 'Señales y alianzas', stat: 'empathy' }] },
  { district: '4', label: 'Pesca · recursos', options: [{ id: 'fishing', label: 'Pesca', stat: 'survival' }, { id: 'nets', label: 'Redes y agilidad', stat: 'agility' }] },
];
const NAMES = ['Aurea', 'Flint', 'Petra', 'Caius', 'Ada', 'Volt', 'Marin', 'Nerio', 'Luma', 'Ion', 'Vera', 'Axel', 'Silva', 'Rowan', 'Tela', 'Lino', 'Avena', 'Silas', 'Alba', 'Bram', 'Oliva', 'Reed', 'Brasa', 'Ash'];
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
function randomSource(value) {
  let state = value >>> 0;
  return { next() { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }, state: () => state };
}
const live = (run) => run.tributes.filter((t) => t.alive);
export function createRun(seed, id) {
  const rng = randomSource(seed);
  const tributes = NAMES.map((name, i) => ({
    id: `tribute-${i + 1}`, name, district: String(Math.floor(i / 2) + 1),
    strength: 35 + Math.floor(rng.next() * 40), agility: 35 + Math.floor(rng.next() * 40),
    survival: 35 + Math.floor(rng.next() * 40), stealth: 35 + Math.floor(rng.next() * 40), empathy: 35 + Math.floor(rng.next() * 40),
    health: 100, energy: 100, hunger: 0, thirst: 0, food: 1, water: 1, equipment: 0,
    zone: i % 4, allyId: null, alive: true, eliminatedTurn: null,
  }));
  return { version: VERSION, id, seed: seed >>> 0, rng: rng.state(), revision: 0, phase: 'reaping', turn: 0,
    selectedId: null, training: null, tributes, events: [], winnerId: null };
}
export function selectTribute(run, id) {
  if (run.phase !== 'reaping' || !run.tributes.some((t) => t.id === id)) return run;
  return { ...run, selectedId: id, phase: 'preparation', revision: run.revision + 1 };
}
export function prepareRun(run, choices, emblems) {
  if (run.phase !== 'preparation' || !TRAINING.every((t) => emblems.includes(t.district) && t.options.some((o) => o.id === choices[t.district]))) return run;
  const next = structuredClone(run);
  const tribute = next.tributes.find((t) => t.id === next.selectedId);
  for (const t of TRAINING) tribute[t.options.find((o) => o.id === choices[t.district]).stat] += 8;
  next.training = { ...choices }; next.phase = 'arena'; next.revision += 1;
  next.events.push({ turn: 0, type: 'opening', actors: [], text: 'Las plataformas se elevan. Veinticuatro tributos. Una sola salida.' });
  return next;
}
export function advanceRun(run, strategy = 'shelter') {
  const decision = typeof strategy === 'object' ? resolveEncounter(run, strategy) : null;
  if (run.phase !== 'arena' || (!decision && !STRATEGIES[strategy])) return run;
  if (decision) strategy = decision.choice.strategy;
  const next = structuredClone(run);
  const rng = randomSource(next.rng);
  next.turn += 1; next.revision += 1;
  const emit = (type, actors, text) => next.events.push({ turn: next.turn, type, actors, text });
  const eliminate = (t, reason) => {
    if (!t.alive || live(next).length <= 1) return;
    t.alive = false; t.health = 0; t.eliminatedTurn = next.turn;
    if (t.allyId) { const ally = next.tributes.find((a) => a.id === t.allyId); if (ally) ally.allyId = null; t.allyId = null; }
    emit('elimination', [t.id], `${t.name}, del Distrito ${t.district}, queda fuera de los Juegos. ${reason}`);
  };
  if (decision) {
    const t = next.tributes.find((actor) => actor.id === next.selectedId);
    const { choice, encounter } = decision;
    if (choice.cost) t[choice.cost] -= 1;
    const success = rng.next() < Math.min(.92, .35 + t[choice.stat] / 160 + (choice.cost ? .12 : 0));
    for (const [key, value] of Object.entries(success ? choice.reward : choice.penalty)) {
      const limit = key === 'equipment' ? 3 : key === 'food' || key === 'water' ? 4 : 100;
      t[key] = Math.max(0, Math.min(limit, t[key] + value));
    }
    const changes = Object.entries(success ? choice.reward : choice.penalty).map(([stat, value]) => ({ stat, value }));
    next.events.push({ turn: next.turn, type: 'decision', actors: [t.id], text: `${t.name}: ${choice.label}. ${success ? 'La maniobra funciona.' : 'La maniobra se complica.'}`, situation: encounter.kind, success, changes });
    if (t.health === 0) eliminate(t, 'No logra superar el peligro.');
  }
  // Orden rotativo para que el primer tributo no tenga prioridad permanente.
  const alive = live(next);
  const offset = Math.floor(rng.next() * alive.length);
  const ordered = [...alive.slice(offset), ...alive.slice(0, offset)];
  const actions = Object.keys(STRATEGIES);
  for (const t of ordered) {
    if (!t.alive || live(next).length === 1) break;
    const action = t.id === next.selectedId ? strategy : actions[Math.floor(rng.next() * actions.length)];
    t.hunger = clamp(t.hunger + 10); t.thirst = clamp(t.thirst + 14); t.energy = clamp(t.energy - 8);
    if (t.food > 0 && t.hunger >= 25) { t.food -= 1; t.hunger = clamp(t.hunger - 30); }
    if (t.water > 0 && t.thirst >= 25) { t.water -= 1; t.thirst = clamp(t.thirst - 35); }
    if (action === 'shelter') {
      t.energy = clamp(t.energy + 22); t.health = clamp(t.health + 3);
      if (t.id === next.selectedId) emit('rest', [t.id], `${t.name} encuentra refugio y recupera energía.`);
    } else if (action === 'forage') {
      if (rng.next() < 0.5 + t.survival / 220) {
        t.food = Math.min(4, t.food + 1); t.water = Math.min(4, t.water + 1);
        emit('supply', [t.id], `${t.name} consigue comida y agua en ${ZONES[t.zone].toLowerCase()}.`);
      }
    } else if (action === 'explore') {
      t.zone = (t.zone + 1 + Math.floor(rng.next() * 3)) % 4;
      if (rng.next() < 0.45) t.equipment = Math.min(3, t.equipment + 1);
      if (t.id === next.selectedId) emit('move', [t.id], `${t.name} llega a ${ZONES[t.zone].toLowerCase()}.`);
    } else if (!t.allyId) {
      const partner = live(next).find((a) => a.id !== t.id && !a.allyId && a.zone === t.zone);
      if (partner && rng.next() < 0.4 + t.empathy / 200) {
        t.allyId = partner.id; partner.allyId = t.id;
        emit('alliance', [t.id, partner.id], `${t.name} y ${partner.name} forman una alianza.`);
      }
    }
    if (t.allyId) {
      const partner = next.tributes.find((a) => a.id === t.allyId);
      if (partner?.alive && partner.zone === t.zone) {
        if (t.water === 0 && partner.water > 1) { partner.water -= 1; t.water += 1; }
        t.energy = clamp(t.energy + 4);
      }
    }
    const pressure = 5 + Math.floor(next.turn / 3) * 2;
    const exposure = action === 'shelter' ? 0.2 : 0.42;
    if (rng.next() < exposure) {
      const damage = Math.max(2, pressure + Math.floor(rng.next() * 15) - Math.floor(t.stealth / 15));
      t.health = clamp(t.health - damage);
      emit('hazard', [t.id], `${t.name} atraviesa una tormenta en ${ZONES[t.zone].toLowerCase()} y pierde ${damage} de salud.`);
    }
    const deprivation = (t.thirst > 65 ? 15 : 0) + (t.hunger > 70 ? 10 : 0) + (t.energy === 0 ? 8 : 0);
    t.health = clamp(t.health - deprivation);
    if (t.health === 0) eliminate(t, 'El desgaste de la arena supera sus recursos.');
  }
  // Un encuentro por zona y turno, solo entre tributos vivos que no sean aliados.
  for (let zone = 0; zone < 4 && live(next).length > 1; zone += 1) {
    const residents = live(next).filter((t) => t.zone === zone);
    if (residents.length < 2 || rng.next() > 0.65) continue;
    const a = residents[Math.floor(rng.next() * residents.length)];
    const b = residents.find((t) => t.id !== a.id && t.id !== a.allyId);
    if (!b) continue;
    const power = (t) => t.strength + t.agility * 0.3 + t.equipment * 8 + t.energy * 0.1 + rng.next() * 45;
    const loser = power(a) > power(b) ? b : a;
    loser.health = clamp(loser.health - 28 - Math.floor(rng.next() * 23));
    emit('encounter', [a.id, b.id], `${a.name} y ${b.name} se enfrentan en ${ZONES[zone].toLowerCase()}. ${loser.name} se retira herido.`);
    if (loser.health === 0) eliminate(loser, 'No logra recuperarse del encuentro.');
  }
  // El cierre está acotado; la valoración usa estado y azar guardado, nunca el orden de los IDs.
  if (next.turn >= MAX_TURNS && live(next).length > 1) {
    const finalists = live(next).map((t) => ({ t, score: t.health + t.energy * 0.2 + t.survival * 0.3 + t.equipment * 5 + rng.next() * 45 })).sort((a, b) => b.score - a.score);
    emit('final', finalists.map(({ t }) => t.id), 'La arena se cierra. Los recursos conservados deciden el último desafío.');
    for (const { t } of finalists.slice(1)) eliminate(t, 'No supera el desafío final.');
  }
  const survivors = live(next);
  if (survivors.length === 1) {
    const winner = survivors[0]; winner.health = Math.max(1, winner.health);
    next.phase = 'ended'; next.winnerId = winner.id;
    emit('winner', [winner.id], `${winner.name}, del Distrito ${winner.district}, sobrevive a los Juegos.`);
  }
  next.rng = rng.state();
  return next;
}

// Rechazar versiones desconocidas o snapshots incompletos sin borrar el archivo original.
export function validateRun(run) {
  if (!run || run.version !== VERSION || typeof run.id !== 'string' || !/^[\w-]{1,80}$/.test(run.id)) return false;
  if (!Object.hasOwn(PHASE_PATH, run.phase) || !Number.isInteger(run.revision) || run.revision < 0 || run.revision > MAX_TURNS + 2) return false;
  if (!Number.isInteger(run.turn) || run.turn < 0 || run.turn > MAX_TURNS || !Number.isInteger(run.rng) || run.rng < 0 || run.rng > 4294967295 || !Number.isInteger(run.seed)) return false;
  if (!Array.isArray(run.tributes) || run.tributes.length !== 24 || !Array.isArray(run.events) || run.events.length > 1600) return false;
  if (run.drawnCount !== undefined && (!Number.isInteger(run.drawnCount) || run.drawnCount < 0 || run.drawnCount > 24)) return false;
  if (run.reapingComplete !== undefined && (typeof run.reapingComplete !== 'boolean' || (run.reapingComplete && run.drawnCount !== 24))) return false;
  const ids = new Set(run.tributes.map((t) => t?.id));
  if (ids.size !== 24) return false;
  for (let i = 0; i < 24; i += 1) {
    const t = run.tributes[i];
    if (!t || t.id !== `tribute-${i + 1}` || t.district !== String(Math.floor(i / 2) + 1) || t.name !== NAMES[i] || typeof t.alive !== 'boolean') return false;
    if (!['strength', 'agility', 'survival', 'stealth', 'empathy', 'health', 'energy', 'hunger', 'thirst'].every((k) => Number.isInteger(t[k]) && t[k] >= 0 && t[k] <= 100)) return false;
    if (!['food', 'water', 'equipment', 'zone'].every((k) => Number.isInteger(t[k]) && t[k] >= 0 && t[k] <= (k === 'food' || k === 'water' ? 4 : 3))) return false;
    if (t.alive !== (t.health > 0) || (!t.alive && (!Number.isInteger(t.eliminatedTurn) || t.eliminatedTurn < 1 || t.eliminatedTurn > run.turn))) return false;
    if (t.allyId !== null && (!ids.has(t.allyId) || t.allyId === t.id || !t.alive || !run.tributes.find((a) => a.id === t.allyId && a.alive && a.allyId === t.id))) return false;
  }
  if (run.phase !== 'reaping' && !ids.has(run.selectedId)) return false;
  if (run.events.some((e) => !e || typeof e.text !== 'string' || e.text.length > 500 || !Number.isInteger(e.turn) || e.turn > run.turn || e.turn < 0 || !Array.isArray(e.actors) || e.actors.some((id) => !ids.has(id)))) return false;
  if (run.events.some((e) => e.changes !== undefined && (!Array.isArray(e.changes) || e.changes.length > 5 || e.changes.some((c) => !c || !['health','energy','food','water','equipment'].includes(c.stat) || !Number.isFinite(c.value) || Math.abs(c.value)>100)))) return false;
  if (run.phase === 'arena' || run.phase === 'ended') {
    if (!TRAINING.every((t) => t.options.some((o) => o.id === run.training?.[t.district]))) return false;
  }
  const survivors = live(run);
  return run.phase === 'ended' ? survivors.length === 1 && survivors[0].id === run.winnerId : survivors.length > 1 && run.winnerId === null;
}

export function sameRun(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
