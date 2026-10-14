import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCameraRig } from '../components/stage/cameraRig.js';

const FROM = { position: [0, 24, 3], target: [0, 0, 0] };
const TO = { position: [0, 10, 10], target: [0, 0, 0] };

function setup(reducedMotion) {
  const camera = new THREE.PerspectiveCamera();
  const rig = createCameraRig(camera);
  rig.setReducedMotion(reducedMotion);
  rig.goTo(FROM, 0); // pose inicial sin transición
  rig.goTo(TO, 1.6);
  return { camera, rig };
}
const run = (rig, seconds) => { for (let t = 0; t < seconds - 1e-9; t += 0.05) rig.update(0.05); };

test('movimiento normal: a los 0,5 s la cámara todavía está viajando', () => {
  const { camera, rig } = setup(false);
  run(rig, 0.5);
  assert.ok(camera.position.y < 24 && camera.position.y > 10, `y=${camera.position.y}`);
});

test('movimiento normal: llega a destino a los 1,6 s', () => {
  const { camera, rig } = setup(false);
  run(rig, 1.7);
  assert.ok(Math.abs(camera.position.y - 10) < 1e-6 && Math.abs(camera.position.z - 10) < 1e-6);
});

test('movimiento reducido: la transición dura 0,4 s como máximo', () => {
  const { camera, rig } = setup(true);
  run(rig, 0.5);
  assert.ok(Math.abs(camera.position.y - 10) < 1e-6 && Math.abs(camera.position.z - 10) < 1e-6, `y=${camera.position.y}`);
});

test('movimiento reducido: el temblor de cámara no mueve nada', () => {
  const { camera, rig } = setup(true);
  run(rig, 0.5);
  rig.shake(1);
  rig.update(0.016);
  assert.equal(camera.position.x, 0);
  assert.ok(Math.abs(camera.position.y - 10) < 1e-9);
});

test('sin movimiento reducido, el temblor sí desplaza la cámara y se apaga solo', () => {
  const realRandom = Math.random;
  Math.random = () => 1; // el desplazamiento del temblor pasa a ser determinista (+amount/2)
  try {
    const { camera, rig } = setup(false);
    run(rig, 1.7);
    rig.shake(0.2);
    rig.update(0.016);
    assert.ok(camera.position.x > 0.05, `x=${camera.position.x}`);
    run(rig, 1);
    assert.equal(camera.position.x, 0, 'el temblor se apagó');
  } finally { Math.random = realRandom; }
});
