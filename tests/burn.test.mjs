import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BURN_AUDIO_SRC, BURN_LIT_IDS, BURN_MESSAGE, BURN_TIMING, burnPlan, volumeAt,
} from '../lib/burn.js';

test('el mensaje es exactamente el pedido y se parte en palabras', () => {
  assert.equal(BURN_MESSAGE, 'If we burn, you burn with us');
  assert.deepEqual(burnPlan().words, ['If', 'we', 'burn,', 'you', 'burn', 'with', 'us']);
});

test('durante el incendio se encienden los distritos, pero no el Capitolio ni el 13', () => {
  assert.equal(BURN_LIT_IDS.length, 12);
  assert.ok(!BURN_LIT_IDS.includes('c'));
  assert.ok(!BURN_LIT_IDS.includes('13'));
  for (const id of ['1', '4', '11', '12']) assert.ok(BURN_LIT_IDS.includes(id));
});

test('las palabras entran una a una y los botones aparecen después del texto', () => {
  const plan = burnPlan();
  assert.equal(plan.animated, true);
  assert.equal(plan.delays[0], BURN_TIMING.messageAt);
  plan.delays.slice(1).forEach((delay, i) => assert.equal(delay - plan.delays[i], BURN_TIMING.wordStaggerMs));
  assert.ok(plan.subtitleAt > plan.delays.at(-1));
  assert.ok(plan.actionsAt > plan.subtitleAt);
});

test('con movimiento reducido no hay animación: el texto aparece de una vez y los botones enseguida', () => {
  const plan = burnPlan({ reducedMotion: true });
  assert.equal(plan.animated, false);
  assert.ok(plan.delays.every((delay) => delay === 0));
  assert.ok(plan.actionsAt <= 2000);
});

test('el fundido de volumen es lineal y queda dentro de los extremos', () => {
  assert.equal(volumeAt(0, 1000, 0, 0.8), 0);
  assert.equal(volumeAt(500, 1000, 0, 0.8), 0.4);
  assert.equal(volumeAt(1000, 1000, 0, 0.8), 0.8);
  assert.equal(volumeAt(5000, 1000, 0, 0.8), 0.8, 'no se pasa del destino');
  assert.equal(volumeAt(-50, 1000, 0.8, 0), 0.8, 'tiempo negativo se trata como inicio');
  assert.equal(volumeAt(300, 0, 1, 0), 0, 'sin duración, salta al destino');
});

test('la canción se reproduce desde un archivo de audio propio', () => {
  assert.equal(BURN_AUDIO_SRC, '/audio/the-hanging-tree.mp3');
});

test('el ritmo es moderado: acciones entre 5 y 7 segundos y salida menor a un segundo',()=>{assert.ok(burnPlan().actionsAt>=5000&&burnPlan().actionsAt<=7000);assert.ok(BURN_TIMING.leaveMs<1000);});
