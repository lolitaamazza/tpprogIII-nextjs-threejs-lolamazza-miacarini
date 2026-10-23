import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT12 } from '../lib/locations/district12.js';
import { FRAGMENTS } from '../lib/fragments.js';

test('cinco lugares en orden, a la altura de los ojos', () => {
  assert.deepEqual(DISTRICT12.spots.map((s) => [s.id, s.label]), [
    ['vias', 'Las vías'], ['galpon', 'El galpón'], ['casa', 'La casa de Ash'], ['entrada', 'La entrada de la mina'], ['tunel', 'El túnel'],
  ]);
  for (const spot of DISTRICT12.spots) {
    assert.equal(spot.position[1], 1.6, spot.id);
    assert.equal(spot.look.length, 3, spot.id);
  }
  assert.ok(DISTRICT12.spots.some((s) => s.id === DISTRICT12.start));
  assert.equal(DISTRICT12.eye, 1.6);
});

test('la viga escondida es el fragmento del 12 y está en el túnel, igual que el frente de carbón', () => {
  assert.equal(DISTRICT12.fragment.id, '12-viga');
  assert.equal(FRAGMENTS.find((f) => f.id === '12-viga')?.district, '12');
  assert.equal(DISTRICT12.fragment.spot, 'tunel');
  assert.equal(DISTRICT12.job.type, 'coal');
  assert.equal(DISTRICT12.job.spot, 'tunel');
});

test('las piezas tienen id único, archivo y tamaño (alto si viene de Sketchfab, escala si ya está en metros)', () => {
  const ids = DISTRICT12.pieces.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const piece of DISTRICT12.pieces) {
    assert.match(piece.url, /^\/models\/d12\/.+\.glb$/, piece.id);
    assert.ok(piece.height > 0 || piece.scale > 0, piece.id);
  }
});

test('los textos son claros: sin dos puntos ni "tesela"', () => {
  const texts = [DISTRICT12.title, ...DISTRICT12.spots.map((s) => s.label), ...DISTRICT12.interactables.filter((i) => i.prompt).map((i) => i.prompt)];
  assert.ok(DISTRICT12.interactables.find((i) => i.kind === 'hold').prompt, 'lo que se mantiene avisa cómo, si el toque fue corto');
  for (const text of texts) {
    assert.ok(!text.includes(':'), text);
    assert.ok(!/tesela/i.test(text), text);
  }
});

test('lo que antes estaba fijo en la escena ahora son datos del 12', () => {
  const types = DISTRICT12.structures.map((s) => s.type);
  assert.deepEqual(DISTRICT12.structures.filter((s) => s.type === 'track').map((s) => s.along), ['x', 'z']);
  for (const type of ['shed', 'hill', 'poles']) assert.ok(types.includes(type), type);
  assert.ok(DISTRICT12.lamps.length >= 8, `${DISTRICT12.lamps.length}`);
  for (const lamp of DISTRICT12.lamps) assert.equal(lamp.position.length, 3);
  const tambor = DISTRICT12.pieces.find((p) => p.id === 'tambor');
  assert.deepEqual(DISTRICT12.fires.map((f) => f.position), [tambor.position]);
  assert.equal(DISTRICT12.textures, '/models/d12/');
  assert.equal(DISTRICT12.ground.texture, 'burned_ground_01');
  assert.equal(DISTRICT12.street.texture, 'brown_mud_02');
  assert.ok(DISTRICT12.dust.count > 0);
});

test('cada estructura del 12 tiene su constructor y arma algo en la escena', async () => {
  const THREE = await import('three');
  const { BUILDERS, buildLamp } = await import('../components/stage/locations/builders.js');
  const scene = new THREE.Scene();
  const ctx = { textures: () => new THREE.MeshStandardMaterial(), halo: null, budget: { low: false }, state: { reducedMotion: false } };
  for (const def of DISTRICT12.structures) {
    assert.equal(typeof BUILDERS[def.type], 'function', def.type);
    const before = scene.children.length;
    const { object } = BUILDERS[def.type](scene, def, ctx);
    assert.ok(object, def.type);
    assert.ok(scene.children.length > before, `${def.type} no agregó nada`);
  }
  const lamp = buildLamp(scene, DISTRICT12.lamps[0], ctx);
  lamp.update(0.016, 1);
  assert.ok(lamp.object.intensity > 0);
});

test('las pistas del 12: agarrar el farol, abrir la libreta, limpiar el cartel y alumbrar el nicho', async () => {
  const { clueById } = await import('../lib/clues.js');
  const items = DISTRICT12.interactables;
  assert.deepEqual(items.map((i) => [i.id, i.kind, i.spot, i.reveals]), [
    ['farol', 'take', 'galpon', 'farol'],
    ['libreta', 'open', 'casa', 'p-12-libreta'],
    ['cartel', 'hold', 'entrada', 'p-12-cartel'],
    ['nicho', 'light', 'tunel', 'p-12-nicho'],
  ]);
  for (const item of items) {
    assert.ok(clueById(item.reveals), item.id);
    assert.ok(DISTRICT12.spots.some((s) => s.id === item.spot), item.id);
    assert.equal(item.position.length, 3, item.id);
    assert.equal(item.size.length, 3, item.id);
  }
  assert.equal(items.find((i) => i.id === 'nicho').requires, 'farol');
  assert.ok(DISTRICT12.pieces.some((p) => p.id === items.find((i) => i.id === 'farol').piece), 'el farol de Sketchfab se va al agarrarlo');
});

test('cada tipo de jornada tiene su constructor en la escena', async () => {
  const { JOBS } = await import('../components/stage/locations/jobs.js');
  assert.equal(typeof JOBS[DISTRICT12.job.type], 'function');
});
