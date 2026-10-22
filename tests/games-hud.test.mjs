import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, selectTribute, prepareRun, advanceRun } from '../lib/games/simulation.js';
import { encounterFor } from '../lib/games/encounters.js';
import { TICKER_SECONDS, turnHeadlines, headlineAt, vitalsFor, statusLine } from '../lib/games/hud.js';

const ready = (seed) => prepareRun(selectTribute(createRun(seed, `run-${seed}`), 'tribute-1'), { 12: 'endurance', 11: 'plants', 4: 'nets' }, ['12', '11', '4']);
const decide = (run) => { const e = encounterFor(run); return advanceRun(run, e ? { encounterId: e.id, optionId: e.options[0].id } : 'shelter'); };

test('la apertura muestra su único evento, nunca nada vacío', () => {
  const run = ready(3);
  const list = turnHeadlines(run);
  assert.equal(list.length, 1);
  assert.equal(list[0].type, 'opening');
  assert.equal(headlineAt(list, 0), list[0]);
});

test('primero lo de tu tributo, después las caídas, después el resto', () => {
  let run = ready(5);
  for (let i = 0; i < 8 && run.phase === 'arena'; i++) {
    run = decide(run);
    const list = turnHeadlines(run);
    const mine = (e) => e.actors.includes(run.selectedId);
    const rank = (e) => (mine(e) ? 0 : e.type === 'elimination' ? 1 : 2);
    for (let k = 1; k < list.length; k++) assert.ok(rank(list[k - 1]) <= rank(list[k]), `turno ${run.turn}`);
    assert.equal(list.length, run.events.filter((e) => e.turn === run.turn).length);
  }
});

test('la línea de eventos rota cada tanto y sin eventos no muestra nada', () => {
  const list = [{ text: 'a' }, { text: 'b' }];
  assert.equal(headlineAt(list, 0).text, 'a');
  assert.equal(headlineAt(list, TICKER_SECONDS + 0.1).text, 'b');
  assert.equal(headlineAt(list, TICKER_SECONDS * 2 + 0.1).text, 'a');
  assert.equal(headlineAt([], 5), null);
});

test('salud y energía siempre; hambre y sed solo cuando apremian; caído, nada', () => {
  const base = { alive: true, health: 80, energy: 50, hunger: 30, thirst: 59 };
  assert.deepEqual(vitalsFor(base).map((v) => v.key), ['health', 'energy']);
  const hungry = vitalsFor({ ...base, hunger: 60, thirst: 75 });
  assert.deepEqual(hungry.map((v) => v.key), ['health', 'energy', 'hunger', 'thirst']);
  assert.equal(hungry[2].label, 'Hambre');
  assert.equal(hungry[2].warning, true);
  assert.deepEqual(vitalsFor({ ...base, alive: false }), []);
});

test('el estado dice la jornada y cuántos quedan', () => {
  const run = ready(9);
  assert.deepEqual(statusLine(run), { label: 'Apertura', alive: 24 });
  const day = decide(run);
  assert.equal(statusLine(day).label, 'Jornada 1 · día');
  assert.equal(statusLine(decide(day)).label, 'Jornada 1 · noche');
  assert.equal(statusLine(day).alive, day.tributes.filter((t) => t.alive).length);
});
