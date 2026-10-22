import { test } from 'node:test';
import assert from 'node:assert/strict';
import { districtHud } from '../lib/districtHud.js';
import { getDistrict } from '../data/districts.js';
import { createMatch, resolve } from '../lib/minigame.js';

const coal = getDistrict('12');
const start = () => createMatch({ goal: 6, lives: 3 });

test('jugable recién entrado: título, pista, avance, vidas y botón alternativo', () => {
  const hud = districtHud({ district: coal, match: start() });
  assert.equal(hud.kind, 'play');
  assert.equal(hud.title, '12 · Carbón');
  assert.equal(hud.hint, coal.instruction);
  assert.deepEqual(hud.score, { label: 'Bloques', value: 0, total: 6 });
  assert.deepEqual(hud.lives, { label: 'Canario', left: 3, total: 3 });
  assert.equal(hud.lost, null);
  assert.equal(hud.action, 'Picar');
});

test('sin partida todavía (el mapa está cargando): título y pista, sin contadores', () => {
  const hud = districtHud({ district: coal, match: null });
  assert.equal(hud.kind, 'play');
  assert.equal(hud.hint, coal.instruction);
  assert.equal(hud.score, null);
  assert.equal(hud.lives, null);
});

test('la pista se va después de la primera jugada, acierte o no', () => {
  assert.equal(districtHud({ district: coal, match: resolve(start(), { points: 1 }) }).hint, null);
  assert.equal(districtHud({ district: coal, match: resolve(start(), { cost: 1 }) }).hint, null);
});

test('perdido: el mensaje y sin botón de acción (se reintenta)', () => {
  let match = start();
  for (let i = 0; i < 3; i++) match = resolve(match, { cost: 1 });
  const hud = districtHud({ district: coal, match });
  assert.equal(hud.lost, coal.lostMessage);
  assert.equal(hud.action, null);
});

test('después de perder dos veces aparece la nota de ayuda', () => {
  const hud = districtHud({ district: coal, match: { ...start(), losses: 2 } });
  assert.equal(hud.help, coal.helpNote);
});

test('el silbido del 11 tiene su contador, sus pájaros y su pista', () => {
  const farm = getDistrict('11');
  const song = { ...createMatch({ goal: 28, lives: 3 }), score: 24, step: 'song', stepScore: 0, stepGoal: 4 };
  const hud = districtHud({ district: farm, match: song });
  assert.equal(hud.score.label, 'Silbido');
  assert.deepEqual([hud.score.value, hud.score.total], [0, 4]);
  assert.equal(hud.birds, true);
  assert.equal(hud.action, farm.songActionLabel);
  assert.equal(hud.hint, farm.songInstruction);
  assert.equal(districtHud({ district: farm, match: { ...song, stepScore: 1 } }).hint, null);
});

test('encendido: solo el emblema', () => {
  const hud = districtHud({ district: coal, match: null, lit: true });
  assert.equal(hud.kind, 'done');
  assert.equal(hud.hint, 'Emblema obtenido.');
  assert.equal(hud.score, null);
});

test('un distrito sin juego muestra su cita', () => {
  const wood = getDistrict('7');
  const hud = districtHud({ district: wood });
  assert.equal(hud.kind, 'info');
  assert.equal(hud.title, '7 · Madera');
  assert.equal(hud.hint, wood.quote);
});

test('el Distrito 13 es solo la etiqueta y la señal', () => {
  const d13 = getDistrict('13');
  const hidden = districtHud({ district: d13, progress: 0.4 });
  assert.equal(hidden.kind, 'classified');
  assert.equal(hidden.title, null);
  assert.deepEqual(hidden.tag, { text: 'Acceso denegado', live: false });
  assert.equal(hidden.signal, 0.4);
  const found = districtHud({ district: d13, revealed: true });
  assert.deepEqual(found.tag, { text: 'Señal recuperada', live: true });
  assert.equal(found.signal, null);
  assert.equal(districtHud({ district: d13, webgl: false }).signal, null);
});
