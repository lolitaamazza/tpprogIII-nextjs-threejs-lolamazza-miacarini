import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTally, tally, fishPosition, fishInNet, nearestFish,
  sweep, coalRound, inCrack, COAL, reachAt, landingPoint, netCatch, FISHING,
  searchlight, inLight, songOrder, HARVEST, FIELD,
} from '../components/stage/dioramas/logic.js';

test('tally avanza y completa una sola vez', () => {
  let s = createTally(3, false);
  let r = tally(s, 1); s = r.state;
  assert.deepEqual(s, { count: 1, total: 3, done: false });
  assert.equal(r.justCompleted, false);
  r = tally(s, 5); s = r.state;
  assert.deepEqual(s, { count: 3, total: 3, done: true });
  assert.equal(r.justCompleted, true);
  r = tally(s, 1);
  assert.equal(r.justCompleted, false, 'ya completo no vuelve a disparar');
  assert.equal(r.state, s);
});

test('createTally completado arranca lleno', () => {
  assert.deepEqual(createTally(8, true), { count: 8, total: 8, done: true });
});

test('los peces se mueven dentro del agua', () => {
  for (let i = 0; i < 5; i++) {
    for (const t of [0, 1.3, 7.9]) {
      const p = fishPosition(i, t, { x: 0.15, z: 0.15 });
      assert.ok(Math.hypot(p.x - 0.15, p.z - 0.15) < 0.6, `pez ${i} en t=${t}`);
    }
  }
  assert.notDeepEqual(fishPosition(0, 0), fishPosition(0, 1));
});

test('red atrapa los peces dentro del radio y no los ya atrapados', () => {
  const fish = [
    { index: 0, x: 0, z: 0, caught: false },
    { index: 1, x: 0.2, z: 0, caught: false },
    { index: 2, x: 0.05, z: 0.05, caught: true },
    { index: 3, x: 1, z: 1, caught: false },
  ];
  assert.deepEqual(fishInNet(fish, { x: 0, z: 0 }, 0.3), [0, 1]);
  assert.equal(nearestFish(fish, { x: 0.9, z: 0.9 }), 3);
  assert.equal(nearestFish(fish.map((f) => ({ ...f, caught: true })), { x: 0, z: 0 }), null);
});

test('la luz recorre la veta de punta a punta y vuelve', () => {
  assert.equal(sweep(0), 0);
  assert.equal(sweep(1), 1);
  assert.equal(sweep(2), 0);
  assert.equal(sweep(0.25), 0.25);
  assert.equal(sweep(1.25), 0.75);
  for (let t = 0; t < 9; t += 0.37) assert.ok(sweep(t) >= 0 && sweep(t) <= 1);
});

test('carbón: la grieta se achica en cada capa, la ayuda la agranda y nunca se sale de la veta', () => {
  const widths = [0, COAL.hitsPerLayer, COAL.hitsPerLayer * 2].map((hits) => coalRound(hits).width);
  assert.ok(widths[0] > widths[1] && widths[1] > widths[2], `${widths}`);
  assert.equal(coalRound(0).layer, 0);
  assert.equal(coalRound(COAL.hitsPerLayer * COAL.layers - 1).layer, COAL.layers - 1);
  assert.ok(coalRound(0, 1).width > coalRound(0).width && coalRound(0, 1).speed < coalRound(0).speed);
  for (let hits = 0; hits < 12; hits += 1) {
    const round = coalRound(hits, hits % 2);
    assert.ok(round.center - round.width / 2 >= 0 && round.center + round.width / 2 <= 1, `golpe ${hits}`);
  }
  assert.notEqual(coalRound(0).center, coalRound(1).center, 'la grieta cambia de lugar después de cada golpe');
});

test('carbón: se acierta solo con la luz dentro de la grieta', () => {
  const round = { center: 0.5, width: 0.2 };
  assert.equal(inCrack(0.5, round), true);
  assert.equal(inCrack(0.59, round), true);
  assert.equal(inCrack(0.62, round), false);
  assert.equal(inCrack(0.3, round), false);
});

test('pesca: el alcance de la red va y viene entre lo más cerca y lo más lejos; con ayuda, más lento', () => {
  const { minReach, maxReach, chargePeriod } = FISHING;
  assert.equal(reachAt(0), minReach);
  assert.ok(Math.abs(reachAt(chargePeriod / 2) - maxReach) < 1e-9);
  assert.ok(Math.abs(reachAt(chargePeriod) - minReach) < 1e-9);
  assert.ok(reachAt(chargePeriod / 4, 1) < reachAt(chargePeriod / 4), 'con ayuda carga más despacio');
});

test('pesca: la red cae hacia donde se apunta, a la distancia cargada, y la corriente la corre un poco', () => {
  const from = { x: 0, z: 0 };
  const plain = landingPoint(from, { x: 2, z: 0 }, 0.5, 1);
  assert.deepEqual(plain, { x: 0.5, z: 0 }, 'con ayuda no hay corriente');
  const drifted = landingPoint(from, { x: 2, z: 0 }, 0.5);
  assert.deepEqual(drifted, { x: 0.5 + FISHING.drift.x, z: FISHING.drift.z });
  assert.ok(Math.hypot(FISHING.drift.x, FISHING.drift.z) < FISHING.netRadius / 2, 'la corriente desvía, no arruina un buen tiro');
});

test('pesca: el pez dorado vale por dos y los ya atrapados no cuentan', () => {
  const fish = [
    { index: 0, x: 0, z: 0, caught: false },
    { index: 1, x: 0.1, z: 0, caught: false, golden: true },
    { index: 2, x: 0.05, z: 0, caught: true },
    { index: 3, x: 1, z: 1, caught: false },
  ];
  assert.deepEqual(netCatch(fish, { x: 0, z: 0 }, 0.2), { caught: [0, 1], points: 3 });
  assert.deepEqual(netCatch(fish, { x: 0.6, z: 0.6 }, 0.2), { caught: [], points: 0 });
});

test('agricultura: el reflector barre todo el campo sin salirse', () => {
  let left = false;
  let right = false;
  for (let t = 0; t < 30; t += 0.05) {
    const light = searchlight(t);
    assert.ok(light.x >= FIELD.x0 && light.x <= FIELD.x1 && light.z >= FIELD.z0 && light.z <= FIELD.z1, `t=${t.toFixed(2)}`);
    left ||= light.x < FIELD.x0 + 0.1;
    right ||= light.x > FIELD.x1 - 0.1;
  }
  assert.ok(left && right, 'llega a las dos puntas');
  assert.equal(searchlight(0).radius, HARVEST.radius);
});

test('agricultura: con ayuda, el reflector es más chico y más lento', () => {
  assert.ok(searchlight(0, 1).radius < searchlight(0).radius);
  const step = (help) => Math.abs(searchlight(0.5, help).x - searchlight(0, help).x);
  assert.ok(step(1) < step(0));
});

test('agricultura: estar dentro del círculo del reflector es que te vean', () => {
  const light = { x: 0, z: 0, radius: 0.2 };
  assert.equal(inLight({ x: 0.1, z: 0.1 }, light), true);
  assert.equal(inLight({ x: 0.2, z: 0.1 }, light), false);
});

test('agricultura: cada sinsajo canta una nota; de izquierda a derecha van de grave a agudo', () => {
  assert.deepEqual(songOrder([74, 77, 72, 69]), [2, 3, 1, 0]);
});
