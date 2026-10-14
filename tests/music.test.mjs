import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP_SECONDS, MOTIF, midiToHz, eventsForStep, layerTargets } from '../lib/audio/music.js';

test('tempo: 80 BPM en semicorcheas', () => {
  assert.equal(STEP_SECONDS, 60 / 80 / 4);
});

test('midiToHz', () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Math.abs(midiToHz(81) - 880) < 1e-9);
});

test('el motivo es original de 4 notas', () => {
  assert.deepEqual(MOTIF, [74, 77, 72, 69]);
});

test('eventos del compás', () => {
  const step0 = eventsForStep(0, null);
  assert.ok(step0.some((e) => e.layer === 'percusion' && e.type === 'kick'));
  assert.ok(step0.some((e) => e.layer === 'pad' && e.type === 'chord' && e.notes.length === 3));
  assert.ok(!step0.some((e) => e.layer === 'silbido'), 'el silbido suena en compases impares');
  const whistle = [0, 4, 8, 12].map((s) => eventsForStep(16 + s, null).find((e) => e.layer === 'silbido'));
  assert.deepEqual(whistle.map((e) => e.midi), MOTIF);
  assert.ok(eventsForStep(2, 'rebelion').some((e) => e.type === 'kick'), 'rebelión agrega golpes');
  assert.ok(!eventsForStep(2, null).some((e) => e.type === 'kick'));
  assert.equal(eventsForStep(16, 'memoria').find((e) => e.layer === 'silbido').length, 0.7);
});

test('volúmenes por capa', () => {
  assert.deepEqual(layerTargets({ lit: [] }), { percusion: 0, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ lit: ['12'] }), { percusion: 1, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ lit: ['12'], previewDistrict: '4' }), { percusion: 1, silbido: 0, pad: 0.25 });
  assert.deepEqual(layerTargets({ lit: ['12'], previewDistrict: '12' }), { percusion: 1, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ lit: ['12', '11', '4'], finale: 'memoria' }), { percusion: 0, silbido: 1, pad: 1 });
  assert.deepEqual(layerTargets({ lit: [], finale: 'rebelion' }), { percusion: 1, silbido: 1, pad: 1 });
});
