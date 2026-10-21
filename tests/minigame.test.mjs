import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, resolve, retry, helpLevel } from '../lib/minigame.js';

test('se gana al llegar al objetivo, y ganada ya no se mueve', () => {
  let m = createMatch({ goal: 3, lives: 5 });
  assert.equal(m.phase, 'playing');
  m = resolve(m, { points: 2 });
  assert.equal(m.score, 2);
  m = resolve(m, { points: 2 });
  assert.deepEqual([m.phase, m.score], ['won', 3], 'no se pasa del objetivo');
  assert.equal(resolve(m, { cost: 1 }), m);
});

test('cada error gasta una vida; sin vidas se pierde', () => {
  let m = createMatch({ goal: 6, lives: 3 });
  m = resolve(m, { cost: 1 });
  m = resolve(m, { points: 1 });
  m = resolve(m, { cost: 1 });
  assert.deepEqual([m.phase, m.livesLeft, m.score], ['playing', 1, 1]);
  m = resolve(m, { cost: 1 });
  assert.deepEqual([m.phase, m.livesLeft, m.losses], ['lost', 0, 1]);
  assert.equal(resolve(m, { points: 5 }), m, 'perdida no suma');
});

test('si la última red trae lo que faltaba, se gana', () => {
  let m = createMatch({ goal: 3, lives: 2 });
  m = resolve(m, { points: 1, cost: 1 });
  m = resolve(m, { points: 2, cost: 1 });
  assert.deepEqual([m.phase, m.livesLeft], ['won', 0]);
});

test('reintentar empieza de cero y cuenta el intento; solo después de perder', () => {
  let m = createMatch({ goal: 2, lives: 1 });
  assert.equal(retry(m), m, 'jugando no se reinicia');
  m = resolve(resolve(m, { points: 1 }), { cost: 1 });
  m = retry(m);
  assert.deepEqual([m.phase, m.score, m.livesLeft, m.attempt, m.losses], ['playing', 0, 1, 2, 1]);
});

test('después de perder dos veces, ayuda: el juego se vuelve más generoso', () => {
  let m = createMatch({ goal: 2, lives: 1 });
  assert.equal(helpLevel(m), 0);
  m = retry(resolve(m, { cost: 1 }));
  assert.equal(helpLevel(m), 0);
  m = retry(resolve(m, { cost: 1 }));
  assert.equal(helpLevel(m), 1);
});

test('un distrito ya encendido arranca ganado', () => {
  const m = createMatch({ goal: 3, lives: 5, completed: true });
  assert.deepEqual([m.phase, m.score], ['won', 3]);
});

test('una jugada puede restar (lo cosechado que se pierde), sin bajar de cero', () => {
  let m = createMatch({ goal: 10, lives: 3 });
  m = resolve(m, { points: 4 });
  m = resolve(m, { points: -3, cost: 1 });
  assert.deepEqual([m.score, m.livesLeft], [1, 2]);
  m = resolve(m, { points: -5 });
  assert.equal(m.score, 0);
});
