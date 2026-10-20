import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceRun, createRun, MAX_TURNS, prepareRun, selectTribute, validateRun } from '../lib/games/simulation.js';
const choices = { '12': 'endurance', '11': 'plants', '4': 'nets' };
function ready(seed = 1234) { return prepareRun(selectTribute(createRun(seed, `edition-${seed}`), 'tribute-24'), choices, ['12', '11', '4']); }

test('24 tributos, dos por distrito; mismos datos para una misma semilla', () => {
  const run = createRun(10, 'test');
  assert.equal(run.tributes.length, 24);
  for (let i = 1; i <= 12; i++) assert.equal(run.tributes.filter((t) => t.district === String(i)).length, 2);
  assert.deepEqual(run, createRun(10, 'test'));
  assert.ok(validateRun(run));
});

test('las puertas impiden preparar sin emblemas, tributos inválidos o acumular bonos', () => {
  const run = createRun(1, 'test');
  assert.equal(advanceRun(run), run);
  assert.equal(selectTribute(run, 'missing'), run);
  const selected = selectTribute(run, 'tribute-1');
  assert.equal(prepareRun(selected, choices, ['12']), selected);
  assert.equal(prepareRun(selected, {}, ['12', '11', '4']), selected);
  const prepared = prepareRun(selected, choices, ['12', '11', '4']);
  assert.equal(prepared.tributes[0].strength, run.tributes[0].strength + 8);
  assert.equal(prepareRun(prepared, choices, ['12', '11', '4']), prepared);
});

test('reanudar JSON conserva exactamente el resultado y no muta el turno anterior', () => {
  let run = ready();
  for (let i = 0; i < 5; i++) run = advanceRun(run, 'forage');
  const before = JSON.stringify(run);
  const continued = advanceRun(run, 'explore');
  assert.deepEqual(continued, advanceRun(JSON.parse(before), 'explore'));
  assert.equal(JSON.stringify(run), before);
  assert.equal(advanceRun(run, 'invalid'), run);
});

test('300 ediciones terminan, conservan invariantes y nunca resucitan tributos', () => {
  for (let seed = 0; seed < 300; seed++) {
    let run = ready(seed);
    const eliminated = new Set();
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      run = advanceRun(run, ['shelter', 'forage', 'ally', 'explore'][turn % 4]);
      assert.ok(validateRun(run), `snapshot inválido: ${seed}, ${turn}`);
      for (const t of run.tributes) {
        assert.ok(!eliminated.has(t.id) || !t.alive, 'no resucitar');
        if (!t.alive) eliminated.add(t.id);
      }
      if (run.phase === 'ended') break;
    }
    assert.equal(run.phase, 'ended');
    assert.equal(run.tributes.filter((t) => t.alive).length, 1);
    assert.equal(run.events.filter((e) => e.type === 'elimination').length, 23);
    assert.equal(run.events.filter((e) => e.type === 'winner').length, 1);
    assert.equal(advanceRun(run), run);
  }
});

test('validación rechaza guardados rotos, versiones nuevas y datos fuera de rango', () => {
  const run = ready();
  for (const value of [null, {}, { ...run, version: 2 }, { ...run, rng: -1 }, { ...run, turn: 100 }, { ...run, tributes: [] }, { ...run, training: null }]) assert.equal(validateRun(value), false);
  const invalid = structuredClone(run); invalid.tributes[0].health = NaN;
  assert.equal(validateRun(invalid), false);
});
