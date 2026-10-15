import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BURN_AUDIO_SRC, BURN_LIT_IDS, BURN_MESSAGE, BURN_TIMING, burnPlan, completesEmblems, volumeAt,
} from '../lib/burn.js';
import { EMPTY_PROGRESS } from '../lib/progress.js';

const progress = (litDistricts) => ({ ...EMPTY_PROGRESS, litDistricts });

test('el mensaje es exactamente el pedido y se parte en palabras', () => {
  assert.equal(BURN_MESSAGE, 'If we burn, you burn with us');
  assert.deepEqual(burnPlan().words, ['If', 'we', 'burn,', 'you', 'burn', 'with', 'us']);
});

test('el incendio solo se dispara con el emblema que completa el tercero', () => {
  assert.equal(completesEmblems(progress([]), '12'), false);
  assert.equal(completesEmblems(progress(['12']), '11'), false);
  assert.equal(completesEmblems(progress(['12', '11']), '4'), true);
  assert.equal(completesEmblems(progress(['11', '4']), '12'), true, 'el orden de los distritos no importa');
});

test('no se vuelve a disparar con los tres ya encendidos, ni con un distrito repetido o inválido', () => {
  assert.equal(completesEmblems(progress(['12', '11', '4']), '4'), false);
  assert.equal(completesEmblems(progress(['12', '11']), '11'), false);
  assert.equal(completesEmblems(progress(['12', '11']), '7'), false, 'el 7 no es jugable: no cuenta como emblema');
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

test('la canción se busca en public/audio (el archivo lo pone cada quien: tiene derechos de autor)', () => {
  assert.equal(BURN_AUDIO_SRC, '/audio/the-hanging-tree.mp3');
});
