// La red desde la punta del muelle (escena del Distrito 4), armada de verdad en Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createNetCast } from '../components/stage/locations/netCast.js';
import { FISHING, fishPosition } from '../components/stage/dioramas/logic.js';

const DEF = { type: 'net', spot: 'punta', from: [0, 0.35, -13], water: [4.6, -0.5, -17.6], scale: 8 };

function harness(mode = 'play') {
  const calls = { match: [], complete: 0, sfx: [] };
  const net = createNetCast(DEF, { mode, onMatch: (m) => calls.match.push(m), onComplete: () => { calls.complete += 1; }, sfx: { play: (n) => calls.sfx.push(n) } });
  let t = 0;
  const tick = (seconds) => { for (let s = 0; s < seconds; s += 0.02) { t += 0.02; net.update(0.02, t); } };
  // Tira justo donde va a estar el pez `i` cuando caiga la red.
  const castOn = (i) => { const p = fishPosition(i, t + net.throwSeconds, net.waterCenter); net.cast(p); tick(1.4); };
  const castAway = () => { net.cast({ x: net.waterCenter.x + 3, z: net.waterCenter.z + 3 }); tick(1.4); };
  // Un rayo que baja en vertical sobre un punto del mundo.
  const rayAt = (x, z) => new THREE.Raycaster(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
  return { net, calls, tick, castOn, castAway, rayAt, last: () => calls.match.at(-1) };
}

test('cada tiro gasta una red; un pez suma uno y el dorado dos', () => {
  const { castOn, last } = harness();
  castOn(0);
  assert.equal(last().livesLeft, FISHING.nets - 1);
  assert.equal(last().score, 1);
  castOn(FISHING.fish - 1);
  assert.equal(last().score, 3);
  assert.equal(last().phase, 'won');
});

test('ganar llama a terminar la jornada una sola vez', () => {
  const { castOn, calls } = harness();
  castOn(FISHING.fish - 1);
  castOn(0);
  castOn(1);
  assert.equal(calls.complete, 1);
});

test('mantener sobre el agua carga y soltar tira; soltar fuera del agua no gasta una red', () => {
  const { net, tick, rayAt, last } = harness();
  const [x, , z] = DEF.water;
  assert.equal(net.pointerDown(rayAt(x, z)), true);
  tick(0.3);
  assert.equal(net.getState().charging, true);
  net.pointerUp(rayAt(x + 200, z + 200));
  tick(1.4);
  assert.equal(net.getState().charging, false);
  assert.equal(last().livesLeft, FISHING.nets, 'no se gastó la red');
  net.pointerDown(rayAt(x, z));
  tick(0.3);
  net.pointerUp(rayAt(x, z));
  tick(1.4);
  assert.equal(last().livesLeft, FISHING.nets - 1);
});

test('con el botón: una vez apunta al pez más cercano, otra vez tira', () => {
  const { net, tick, last } = harness();
  net.performAction();
  assert.equal(net.getState().charging, true);
  tick(0.4);
  net.performAction();
  tick(1.4);
  assert.equal(last().livesLeft, FISHING.nets - 1);
});

test('cinco redes vacías pierden; reintentar vuelve a empezar con todos los peces', () => {
  const { net, castAway, last } = harness();
  for (let i = 0; i < FISHING.nets; i++) castAway();
  assert.equal(last().phase, 'lost');
  net.retry();
  assert.equal(last().phase, 'playing');
  assert.equal(last().livesLeft, FISHING.nets);
  assert.ok(net.getState().fish.every((f) => !f.caught));
});

test('otro día no hay jornada; tocar el agua mira alrededor', () => {
  const { net, rayAt } = harness('idle');
  assert.equal(net.getState().match, null);
  assert.equal(net.pointerDown(rayAt(DEF.water[0], DEF.water[2])), false);
});
