// Dioramas armados de verdad (geometría, materiales y raycasting corren en Node, sin WebGL).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildDistrict12 } from '../components/stage/dioramas/district12.js';
import { buildDistrict11 } from '../components/stage/dioramas/district11.js';
import { buildDistrict4 } from '../components/stage/dioramas/district4.js';
import { inCrack, inLight, FISHING, HARVEST } from '../components/stage/dioramas/logic.js';

function harness(build, completed = false) {
  const calls = { progress: [], complete: 0, sfx: [], shake: [], match: [] };
  const diorama = build({
    origin: { x: 0, z: 0 }, completed,
    onProgress: (value) => calls.progress.push(value),
    onComplete: () => { calls.complete += 1; },
    onMatch: (match) => calls.match.push(match),
    sfx: { play: (name) => calls.sfx.push(name) },
    rig: { shake: (amount) => calls.shake.push(amount) },
  });
  diorama.group.scale.setScalar(1); // en pantalla crece de a poco (growIn); acá se fija para apuntar bien
  diorama.group.updateMatrixWorld(true);
  let clock = 0;
  const advance = (seconds) => { // el tiempo del diorama avanza de a cuadros de 16 ms
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.016) { clock += 0.016; diorama.update(0.016, clock); }
  };
  // Avanza hasta que se cumpla la condición (o se rinde a los `limit` segundos).
  const waitFor = (condition, limit = 10) => {
    for (let elapsed = 0; elapsed < limit; elapsed += 0.016) { if (condition()) return true; advance(0.016); }
    return false;
  };
  return { diorama, calls, advance, waitFor };
}

function rayDown(x, z) {
  const raycaster = new THREE.Raycaster();
  raycaster.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
  return raycaster;
}

// Distrito 12: la luz recorre la veta y hay que picar cuando pasa por la grieta.
const lightInCrack = (diorama) => { const { marker, round } = diorama.getState(); return inCrack(marker, round); };
const lightFarFromCrack = (diorama) => { const { marker, round } = diorama.getState(); return Math.abs(marker - round.center) > round.width; };

test('distrito 12: picar con la luz en la grieta rompe un bloque; fuera de la grieta se agita el canario', () => {
  const { diorama, calls, waitFor } = harness(buildDistrict12);
  assert.ok(waitFor(() => lightInCrack(diorama)));
  diorama.performAction();
  assert.deepEqual(calls.progress, [1 / 6]);
  assert.equal(calls.match.at(-1).score, 1);
  assert.ok(calls.sfx.includes('pick') && calls.shake.length === 1);
  assert.ok(waitFor(() => lightFarFromCrack(diorama)));
  diorama.performAction();
  assert.deepEqual(calls.progress, [1 / 6], 'errar no avanza');
  assert.equal(calls.match.at(-1).livesLeft, 2);
  assert.ok(calls.sfx.includes('miss') && calls.sfx.includes('canary'));
  diorama.dispose();
});

test('distrito 12: tres errores y el canario se calla; reintentar vuelve a empezar', () => {
  const { diorama, calls, waitFor } = harness(buildDistrict12);
  for (let i = 0; i < 3; i++) { assert.ok(waitFor(() => lightFarFromCrack(diorama))); diorama.performAction(); }
  assert.equal(calls.match.at(-1).phase, 'lost');
  assert.ok(calls.sfx.includes('lose'));
  const before = calls.match.length;
  assert.equal(diorama.getState().round && diorama.pointerMove(rayDown(-0.5, 0.5)), false, 'perdido, el diorama deja de ofrecer el golpe');
  diorama.performAction();
  assert.equal(calls.match.length, before, 'perdido no se juega');
  diorama.retry();
  assert.deepEqual([calls.match.at(-1).phase, calls.match.at(-1).score, calls.match.at(-1).livesLeft], ['playing', 0, 3]);
  diorama.dispose();
});

test('distrito 12: seis aciertos liberan la brasa, una sola vez', () => {
  const { diorama, calls, waitFor, advance } = harness(buildDistrict12);
  for (let i = 0; i < 6; i++) { assert.ok(waitFor(() => lightInCrack(diorama)), `golpe ${i + 1}`); diorama.performAction(); advance(0.05); }
  assert.equal(calls.complete, 1);
  assert.equal(calls.progress.at(-1), 1);
  assert.ok(calls.sfx.includes('ignite'));
  diorama.performAction();
  assert.equal(calls.complete, 1);
  diorama.dispose();
});

test('distrito 12: un clic en cualquier parte del diorama es un golpe de pico', () => {
  const { diorama, calls, advance } = harness(buildDistrict12);
  advance(0.1);
  assert.equal(diorama.pointerMove(rayDown(-0.5, 0.5)), true);
  assert.equal(calls.match.length, 1, 'arranca avisando la partida (vidas y objetivo para el panel)');
  diorama.pointerDown(rayDown(-0.5, 0.5));
  assert.equal(calls.match.length, 2, 'contó como golpe (acierto o error)');
  diorama.dispose();
});

test('distrito 12: si ya estaba encendido no se vuelve a jugar', () => {
  const { diorama, calls, advance } = harness(buildDistrict12, true);
  advance(0.5);
  diorama.performAction();
  diorama.pointerDown(rayDown(0.2, 0.3));
  assert.equal(calls.complete, 0);
  assert.deepEqual(calls.match, []);
  assert.equal(diorama.pointerMove(rayDown(0.2, 0.3)), false);
  diorama.dispose();
});

// Distrito 4: mantener apretado carga el alcance, soltar tira la red.
const EMPTY_WATER = [-0.65, 0.14]; // al lado del muelle, lejos de los peces

test('distrito 4: apretar sobre el agua carga el alcance y soltar tira la red; cada red se gasta', () => {
  const { diorama, calls, advance } = harness(buildDistrict4);
  advance(0.1);
  diorama.pointerUp(rayDown(...EMPTY_WATER));
  advance(0.8);
  assert.ok(!calls.sfx.includes('throw'), 'sin apretar antes no se tira');
  assert.equal(diorama.pointerMove(rayDown(0.15, 0.15)), true, 'el agua es interactiva');
  assert.equal(diorama.pointerMove(rayDown(-0.9, 0.95)), false, 'fuera del agua no');
  diorama.pointerDown(rayDown(...EMPTY_WATER));
  advance(0.3);
  assert.ok(diorama.getState().reach > FISHING.minReach, 'mientras está apretado, el alcance crece');
  diorama.pointerUp(rayDown(...EMPTY_WATER));
  advance(0.8);
  assert.ok(calls.sfx.includes('throw') && calls.sfx.includes('splash'));
  assert.equal(calls.match.at(-1).livesLeft, FISHING.nets - 1);
  diorama.dispose();
});

test('distrito 4: con el botón (o la barra), una vez carga hacia el pez más cercano y otra vez tira', () => {
  const { diorama, calls, advance, waitFor } = harness(buildDistrict4);
  advance(0.1);
  for (let i = 0; i < 3 && calls.complete === 0; i++) {
    diorama.performAction();
    const ready = () => { const { reach, aim, from } = diorama.getState(); return Math.abs(Math.hypot(aim.x - from.x, aim.z - from.z) - reach) < 0.03; };
    assert.ok(waitFor(ready, 3), 'el alcance llega al pez');
    const before = calls.progress.length;
    diorama.performAction();
    advance(0.8);
    assert.equal(calls.progress.length, before + 1, `la red ${i + 1} atrapó algo`);
  }
  assert.equal(calls.complete, 1);
  assert.equal(calls.progress.at(-1), 1);
  assert.ok(calls.sfx.includes('ignite'));
  diorama.dispose();
});

test('distrito 4: sin redes y sin peces se pierde; reintentar devuelve las redes', () => {
  const { diorama, calls, advance } = harness(buildDistrict4);
  advance(0.1);
  for (let i = 0; i < FISHING.nets; i++) {
    diorama.pointerDown(rayDown(...EMPTY_WATER));
    diorama.pointerUp(rayDown(...EMPTY_WATER));
    advance(0.8);
  }
  assert.equal(calls.match.at(-1).phase, 'lost');
  assert.ok(calls.sfx.includes('miss') && calls.sfx.includes('lose'));
  diorama.pointerDown(rayDown(...EMPTY_WATER));
  assert.equal(diorama.getState().charging, false, 'sin redes no se carga');
  diorama.retry();
  assert.deepEqual([calls.match.at(-1).phase, calls.match.at(-1).livesLeft], ['playing', FISHING.nets]);
  diorama.dispose();
});

test('distrito 4: si ya estaba encendido el agua no responde', () => {
  const { diorama, calls, advance } = harness(buildDistrict4, true);
  advance(0.1);
  diorama.performAction();
  diorama.pointerDown(rayDown(0.15, 0.15));
  diorama.pointerUp(rayDown(0.15, 0.15));
  advance(0.8);
  assert.equal(calls.complete, 0);
  assert.ok(!calls.sfx.includes('throw'));
  assert.equal(diorama.pointerMove(rayDown(0.15, 0.15)), false);
  diorama.dispose();
});

test('distrito 4: los anillos no escriben profundidad y la salpicadura se oculta al desvanecerse', () => {
  // Bug visto en el navegador: la salpicadura, ya invisible (opacidad 0), seguía escribiendo
  // profundidad y recortaba un anillo de arena permanente en el agua.
  const { diorama, advance } = harness(buildDistrict4);
  const rings = [];
  diorama.group.traverse((object) => { if (object.geometry?.type === 'RingGeometry') rings.push(object); });
  assert.ok(rings.length >= 2);
  for (const ring of rings) assert.equal(ring.material.depthWrite, false);
  advance(0.1);
  diorama.pointerDown(rayDown(...EMPTY_WATER));
  diorama.pointerUp(rayDown(...EMPTY_WATER));
  advance(2.5);
  const splash = rings.find((ring) => ring.name === 'splash');
  assert.ok(splash, 'se encontró la salpicadura');
  assert.equal(splash.material.opacity, 0);
  assert.equal(splash.visible, false);
  diorama.dispose();
});

// Distrito 11: cosechar sin que te vea el reflector, y después repetir el silbido de los sinsajos.
const freshStalks = (diorama) => diorama.getState().stalks.filter((stalk) => !stalk.harvested);
const outOfLight = (diorama) => { const { light, stalks } = diorama.getState(); return stalks.find((stalk) => !stalk.harvested && !inLight(stalk, { ...light, radius: light.radius + 0.12 })); };
const nextBatchClear = (diorama) => { const { light } = diorama.getState(); return freshStalks(diorama).slice(0, 3).every((stalk) => !inLight(stalk, light)); };

test('distrito 11: rozar una espiga lejos del reflector la cosecha; bajo el reflector te ven y se pierde la pasada', () => {
  const { diorama, calls, waitFor } = harness(buildDistrict11);
  const first = outOfLight(diorama);
  diorama.pointerMove(rayDown(first.x, first.z));
  assert.equal(calls.match.at(-1).score, 1);
  assert.ok(calls.sfx.includes('harvest'));
  let lit = null;
  assert.ok(waitFor(() => { const { light } = diorama.getState(); lit = freshStalks(diorama).find((stalk) => inLight(stalk, { ...light, radius: light.radius - 0.03 })); return lit; }));
  diorama.pointerMove(rayDown(lit.x, lit.z));
  assert.deepEqual([calls.match.at(-1).score, calls.match.at(-1).livesLeft], [0, HARVEST.lives - 1], 'la espiga de recién vuelve a crecer');
  assert.ok(calls.sfx.includes('glitch'));
  diorama.dispose();
});

test('distrito 11: con el botón se cosecha de a tres espigas, esperando que pase la luz', () => {
  const { diorama, calls, waitFor } = harness(buildDistrict11);
  assert.ok(waitFor(() => nextBatchClear(diorama)));
  diorama.performAction();
  assert.equal(calls.match.at(-1).score, 3);
  diorama.dispose();
});

test('distrito 11: tres veces visto y se pierde; reintentar vuelve a empezar', () => {
  const { diorama, calls, waitFor, advance } = harness(buildDistrict11);
  for (let i = 0; i < HARVEST.lives; i++) {
    assert.ok(waitFor(() => !nextBatchClear(diorama) && !diorama.getState().grace, 15), `vez ${i + 1}`);
    diorama.performAction();
    advance(0.05);
  }
  assert.equal(calls.match.at(-1).phase, 'lost');
  assert.ok(calls.sfx.includes('lose'));
  diorama.retry();
  assert.deepEqual([calls.match.at(-1).phase, calls.match.at(-1).livesLeft], ['playing', HARVEST.lives]);
  diorama.dispose();
});

test('distrito 11: con todo cosechado cantan los sinsajos; hay que repetir el silbido y equivocarse lo repite', () => {
  const { diorama, calls, waitFor, advance } = harness(buildDistrict11);
  while (freshStalks(diorama).length) { assert.ok(waitFor(() => nextBatchClear(diorama) && !diorama.getState().grace)); diorama.performAction(); advance(0.05); }
  assert.equal(diorama.getState().step, 'song');
  assert.equal(calls.match.at(-1).step, 'song');
  assert.ok(waitFor(() => diorama.getState().listening, 6), 'los pájaros terminan de cantar y escuchan');
  const { order } = diorama.getState();
  diorama.input((order[0] + 1) % 4);
  assert.ok(calls.sfx.includes('miss'));
  assert.equal(diorama.getState().listening, false, 'vuelven a cantarlo');
  assert.ok(waitFor(() => diorama.getState().listening, 6));
  for (const bird of order) diorama.input(bird);
  assert.equal(calls.complete, 1);
  assert.ok(calls.sfx.includes('whistle'));
  assert.equal(calls.match.at(-1).phase, 'won');
  diorama.dispose();
});

test('distrito 11: si ya estaba encendido muestra el campo cosechado y no cuenta más', () => {
  const { diorama, calls, advance } = harness(buildDistrict11, true);
  advance(0.5);
  diorama.performAction();
  diorama.pointerMove(rayDown(-0.55, -0.15));
  diorama.input(0);
  assert.equal(calls.complete, 0);
  assert.deepEqual(calls.match, []);
  diorama.dispose();
});
