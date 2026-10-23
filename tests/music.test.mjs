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

test('la música cambia con la escena: no es la misma intensidad en todo el recorrido', () => {
  const silent = { percusion: 0, silbido: 0, pad: 0 };
  assert.deepEqual(layerTargets({ scene: 'intro' }), silent);
  // El mapa es tranquilo: solo el colchón (y el silbido si ya se jugó el 11), nunca la percusión.
  assert.deepEqual(layerTargets({ scene: 'mapa', lit: [] }), { percusion: 0, silbido: 0, pad: 0.35 });
  assert.deepEqual(layerTargets({ scene: 'mapa', lit: ['12', '11'] }), { percusion: 0, silbido: 0.3, pad: 0.5 });
  // La jornada del día suena con su capa; un distrito que se recorre, casi nada; decidir las teselas, en silencio.
  assert.deepEqual(layerTargets({ scene: 'distrito', district: '12', today: '12' }), { percusion: 0.7, silbido: 0, pad: 0.3 });
  assert.deepEqual(layerTargets({ scene: 'distrito', district: '4', today: '4' }), { percusion: 0, silbido: 0, pad: 0.7 });
  assert.deepEqual(layerTargets({ scene: 'distrito', district: '7', today: '12' }), { percusion: 0, silbido: 0, pad: 0.25 });
  assert.deepEqual(layerTargets({ scene: 'distrito', district: '12', deciding: true }), silent);
  // Los Juegos: tambores en la Cosecha, tensión en la arena, calma en el desenlace.
  assert.deepEqual(layerTargets({ scene: 'games', chapter: 'reaping' }), { percusion: 0.45, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ scene: 'games', chapter: 'arena' }), { percusion: 0.8, silbido: 0, pad: 0.5 });
  assert.deepEqual(layerTargets({ scene: 'games', chapter: 'ended' }), { percusion: 0, silbido: 0.5, pad: 0.6 });
  // El final, como antes.
  assert.deepEqual(layerTargets({ scene: 'capitolio', finale: 'memoria' }), { percusion: 0, silbido: 1, pad: 1 });
  assert.deepEqual(layerTargets({ scene: 'capitolio', finale: 'rebelion' }), { percusion: 1, silbido: 1, pad: 1 });
});
