// El campo del huerto (escena del Distrito 11), armado de verdad en Node como el frente de carbón.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHarvestField } from '../components/stage/locations/harvestField.js';
import { HARVEST, inLight } from '../components/stage/dioramas/logic.js';

const DEF = { type: 'harvest', spot: 'huerto', center: [-6, 0, -11], scale: 8, tower: [7, 6, -16], birds: [-6, 1.4, -15.5] };

function harness(mode = 'play') {
  const calls = { match: [], complete: 0, sfx: [] };
  const field = createHarvestField(DEF, { mode, onMatch: (m) => calls.match.push(m), onComplete: () => { calls.complete += 1; }, sfx: { play: (n) => calls.sfx.push(n) } });
  let t = 0;
  const tick = (seconds = 0.05) => { for (let s = 0; s < seconds; s += 0.05) { t += 0.05; field.update(0.05, t); } };
  // Espera a que las próximas `n` espigas sin cosechar estén fuera de la luz.
  const safe = (n = 3) => {
    for (let i = 0; i < 4000; i++) {
      const { light, stalks } = field.getState();
      if (stalks.filter((s) => !s.harvested).slice(0, n).every((s) => !inLight(s, light))) return;
      tick();
    }
    assert.fail('La luz no se fue');
  };
  return { field, calls, tick, safe, last: () => calls.match.at(-1) };
}

test('el botón cosecha de a tres espigas lejos de la luz', () => {
  const { field, safe, last } = harness();
  safe();
  field.performAction();
  assert.equal(field.getState().stalks.filter((s) => s.harvested).length, 3);
  assert.equal(last().stepScore, 3);
  assert.equal(last().stepGoal, HARVEST.stalks);
});

test('cosechar una espiga alumbrada cuesta una vida y lo de esa pasada', () => {
  const { field, safe, tick, last } = harness();
  safe();
  field.performAction();
  for (let i = 0; i < 4000; i++) {
    const { light, stalks } = field.getState();
    const lit = stalks.findIndex((s) => !s.harvested && inLight(s, light));
    if (lit >= 0) { field.touchStalk(lit); break; }
    tick();
  }
  assert.equal(last().livesLeft, HARVEST.lives - 1);
  assert.equal(field.getState().stalks.filter((s) => s.harvested).length, 0, 'se pierde lo de la pasada');
  assert.equal(field.getState().grace, true);
});

test('con todo cosechado cantan los sinsajos; repetirlo en orden gana una sola vez', () => {
  const { field, safe, tick, calls, last } = harness();
  while (field.getState().step === 'harvest') { safe(); field.performAction(); }
  assert.equal(field.getState().step, 'song');
  for (let i = 0; i < 200 && !field.getState().listening; i++) tick();
  const { order } = field.getState();
  field.input((order[0] + 1) % 5);
  assert.equal(last().stepScore, 0, 'equivocarse vuelve a empezar el silbido');
  for (let i = 0; i < 200 && !field.getState().listening; i++) tick();
  for (const bird of order) field.input(bird);
  assert.equal(last().phase, 'won');
  assert.equal(calls.complete, 1);
  field.input(order[0]);
  assert.equal(calls.complete, 1);
});

test('tres veces alumbrado pierde; reintentar vuelve a empezar', () => {
  const { field, tick, last } = harness();
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 4000; i++) {
      const { light, stalks, grace } = field.getState();
      const lit = stalks.findIndex((s) => !s.harvested && inLight(s, light));
      if (!grace && lit >= 0) { field.touchStalk(lit); break; }
      tick();
    }
  }
  assert.equal(last().phase, 'lost');
  field.retry();
  assert.equal(last().phase, 'playing');
  assert.equal(field.getState().step, 'harvest');
  assert.ok(field.getState().stalks.every((s) => !s.harvested));
});

test('otro día el campo está entero y sin reflector; ya jugado, cosechado', () => {
  const idle = harness('idle');
  assert.equal(idle.field.getState().match, null);
  assert.equal(idle.field.performAction(), false);
  const done = harness('done');
  assert.ok(done.field.getState().stalks.every((s) => s.harvested));
  done.field.setMode('play');
  assert.ok(done.field.getState().stalks.every((s) => !s.harvested), 'jugar de nuevo arranca entero');
});
