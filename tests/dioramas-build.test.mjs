// Dioramas armados de verdad (geometría, materiales y raycasting corren en Node, sin WebGL).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildDistrict12 } from '../components/stage/dioramas/district12.js';
import { buildDistrict11 } from '../components/stage/dioramas/district11.js';
import { buildDistrict4 } from '../components/stage/dioramas/district4.js';

function harness(build, completed = false) {
  const calls = { progress: [], complete: 0, sfx: [], shake: [] };
  const diorama = build({
    origin: { x: 0, z: 0 }, completed,
    onProgress: (value) => calls.progress.push(value),
    onComplete: () => { calls.complete += 1; },
    sfx: { play: (name) => calls.sfx.push(name) },
    rig: { shake: (amount) => calls.shake.push(amount) },
  });
  diorama.group.scale.setScalar(1); // en pantalla crece de a poco (growIn); acá se fija para apuntar bien
  diorama.group.updateMatrixWorld(true);
  let clock = 0;
  const advance = (seconds) => { // el tiempo del diorama avanza de a cuadros de 16 ms
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.016) { clock += 0.016; diorama.update(0.016, clock); }
  };
  return { diorama, calls, advance };
}

function rayDown(x, z) {
  const raycaster = new THREE.Raycaster();
  raycaster.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
  return raycaster;
}

test('distrito 12: 8 golpes liberan la brasa, una sola vez', () => {
  const { diorama, calls } = harness(buildDistrict12);
  for (let i = 0; i < 8; i++) diorama.performAction();
  assert.deepEqual(calls.progress, [1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8, 1]);
  assert.equal(calls.complete, 1);
  assert.equal(calls.shake.length, 8);
  assert.ok(calls.sfx.includes('pick') && calls.sfx.includes('ignite'));
  diorama.performAction();
  assert.equal(calls.complete, 1, 'ya completo no repite');
  diorama.dispose();
});

test('distrito 12: el clic sobre la veta cuenta como golpe y el resto del suelo no', () => {
  const { diorama, calls } = harness(buildDistrict12);
  diorama.update(0.016, 0);
  // La veta está en (0.38, ·, 0.28) respecto del centro del diorama
  assert.equal(diorama.pointerMove(rayDown(0.38, 0.28)), true);
  diorama.pointerDown(rayDown(0.38, 0.28));
  assert.deepEqual(calls.progress, [1 / 8]);
  diorama.pointerDown(rayDown(-0.7, 0.6));
  assert.deepEqual(calls.progress, [1 / 8], 'un clic lejos de la veta no cuenta');
  diorama.dispose();
});

test('distrito 12: si ya estaba encendido no se vuelve a jugar', () => {
  const { diorama, calls } = harness(buildDistrict12, true);
  diorama.performAction();
  diorama.pointerDown(rayDown(0.38, 0.28));
  assert.equal(calls.complete, 0);
  assert.deepEqual(calls.progress, []);
  assert.equal(diorama.pointerMove(rayDown(0.38, 0.28)), false);
  diorama.dispose();
});

test('distrito 11: 4 pulsaciones cosechan las 24 espigas y suena el silbido una vez', () => {
  const { diorama, calls } = harness(buildDistrict11);
  for (let i = 0; i < 4; i++) diorama.performAction();
  assert.deepEqual(calls.progress, [0.25, 0.5, 0.75, 1]);
  assert.equal(calls.complete, 1);
  assert.equal(calls.sfx.filter((name) => name === 'whistle').length, 1);
  diorama.performAction();
  assert.equal(calls.complete, 1);
  diorama.dispose();
});

test('distrito 11: rozar una espiga la cosecha una sola vez', () => {
  const { diorama, calls } = harness(buildDistrict11);
  // Primera espiga del campo: (-0.55, ·, -0.15) respecto del centro del diorama
  assert.equal(diorama.pointerMove(rayDown(-0.55, -0.15)), true);
  assert.deepEqual(calls.progress, [1 / 24]);
  diorama.pointerMove(rayDown(-0.55, -0.15));
  assert.deepEqual(calls.progress, [1 / 24], 'la misma espiga no se cosecha dos veces');
  assert.equal(diorama.pointerMove(rayDown(-0.7, 0.9)), false, 'afuera del campo no hay nada que cosechar');
  diorama.dispose();
});

test('distrito 11: si ya estaba encendido muestra el campo cosechado y no cuenta más', () => {
  const { diorama, calls } = harness(buildDistrict11, true);
  diorama.performAction();
  diorama.pointerMove(rayDown(-0.55, -0.15));
  assert.equal(calls.complete, 0);
  assert.deepEqual(calls.progress, []);
  diorama.dispose();
});

test('distrito 4: cada "Lanzar red" atrapa al menos un pez y completa el distrito una sola vez', () => {
  const { diorama, calls, advance } = harness(buildDistrict4);
  advance(0.1);
  for (let i = 0; i < 3 && calls.complete === 0; i++) {
    const before = calls.progress.length;
    diorama.performAction();
    advance(0.8);
    assert.equal(calls.progress.length, before + 1, `la red ${i + 1} atrapó algo`);
  }
  assert.equal(calls.complete, 1);
  assert.equal(calls.progress.at(-1), 1);
  assert.ok(calls.progress.every((value, i, list) => i === 0 || value > list[i - 1]), 'el avance solo sube');
  for (const name of ['throw', 'splash', 'ignite']) assert.ok(calls.sfx.includes(name), name);
  diorama.performAction();
  advance(0.8);
  assert.equal(calls.complete, 1, 'ya completo no repite');
  diorama.dispose();
});

test('distrito 4: apuntar sobre el agua y soltar lanza la red; soltar sin haber apuntado no hace nada', () => {
  const { diorama, calls, advance } = harness(buildDistrict4);
  advance(0.1);
  diorama.pointerUp(rayDown(0.15, 0.15));
  advance(0.8);
  assert.ok(!calls.sfx.includes('throw'), 'sin pointerDown previo no hay lanzamiento');
  assert.equal(diorama.pointerMove(rayDown(0.15, 0.15)), true, 'el agua es interactiva');
  assert.equal(diorama.pointerMove(rayDown(-0.9, 0.95)), false, 'fuera del agua no');
  diorama.pointerDown(rayDown(0.15, 0.15));
  diorama.pointerUp(rayDown(0.15, 0.15));
  advance(0.8);
  assert.ok(calls.sfx.includes('throw') && calls.sfx.includes('splash'));
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

test('distrito 4: los anillos de mira y de salpicadura no escriben profundidad y la salpicadura se oculta al desvanecerse', () => {
  // Bug visto en el navegador: la salpicadura, ya invisible (opacidad 0), seguía escribiendo
  // profundidad y recortaba un anillo de arena permanente en el agua.
  const { diorama, advance } = harness(buildDistrict4);
  const rings = [];
  diorama.group.traverse((object) => { if (object.geometry?.type === 'RingGeometry') rings.push(object); });
  assert.equal(rings.length, 2);
  for (const ring of rings) assert.equal(ring.material.depthWrite, false);
  advance(0.1);
  diorama.pointerDown(rayDown(0.15, 0.15));
  diorama.pointerUp(rayDown(0.15, 0.15));
  advance(2.5);
  const splash = rings.find((ring) => ring.material.color.getHexString() === 'cfefff');
  assert.ok(splash, 'se encontró la salpicadura');
  assert.equal(splash.material.opacity, 0);
  assert.equal(splash.visible, false);
  diorama.dispose();
});
