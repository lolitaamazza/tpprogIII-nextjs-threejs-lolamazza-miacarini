// El frente de carbón del túnel (escena del Distrito 12), armado de verdad en Node como los dioramas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoalSeam } from '../components/stage/locations/coalSeam.js';
import { inCrack } from '../components/stage/dioramas/logic.js';

function harness(mode = 'play') {
  const calls = { match: [], complete: 0, sfx: [] };
  const seam = createCoalSeam({
    position: [0, 1.2, -57], width: 2.4, height: 1.6, mode,
    onMatch: (m) => calls.match.push(m), onComplete: () => { calls.complete += 1; }, sfx: { play: (n) => calls.sfx.push(n) },
  });
  const waitFor = (condition) => {
    for (let i = 0; i < 4000; i++) { if (condition(seam.getState())) return; seam.update(0.016); }
    assert.fail('No llegó el momento esperado');
  };
  const hit = () => { waitFor((s) => inCrack(s.marker, s.round)); seam.performAction(); for (let i = 0; i < 30; i++) seam.update(0.016); };
  const miss = () => { waitFor((s) => !inCrack(s.marker, s.round)); seam.performAction(); for (let i = 0; i < 30; i++) seam.update(0.016); };
  return { seam, calls, hit, miss };
}

test('seis golpes en la grieta liberan el carbón, una sola vez', () => {
  const { seam, calls, hit } = harness();
  for (let i = 0; i < 6; i++) hit();
  assert.equal(seam.getState().match.phase, 'won');
  assert.equal(calls.complete, 1);
  seam.performAction();
  assert.equal(calls.complete, 1);
  assert.ok(calls.sfx.includes('pick'));
  seam.dispose();
});

test('tres golpes fuera de la grieta y el canario se calla; reintentar vuelve a empezar', () => {
  const { seam, calls, miss } = harness();
  for (let i = 0; i < 3; i++) miss();
  assert.equal(seam.getState().match.phase, 'lost');
  assert.ok(calls.sfx.includes('canary'));
  seam.retry();
  assert.equal(seam.getState().match.phase, 'playing');
  assert.equal(seam.getState().match.score, 0);
  seam.dispose();
});

test('sin jornada (otro día o ya jugado) no hay partida ni golpes', () => {
  for (const mode of ['idle', 'done']) {
    const { seam, calls } = harness(mode);
    seam.update(0.5);
    seam.performAction();
    assert.equal(seam.getState().match, null, mode);
    assert.deepEqual(calls.match, [], mode);
    assert.equal(calls.complete, 0, mode);
    seam.dispose();
  }
});

test('volver a jugar arranca una partida nueva', () => {
  const { seam, calls } = harness('done');
  seam.setMode('play');
  assert.equal(seam.getState().match.phase, 'playing');
  assert.equal(calls.match.length, 1);
  seam.dispose();
});
