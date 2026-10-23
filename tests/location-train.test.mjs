import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TRAIN } from '../lib/locations/train.js';

test('el tren: sentado junto a la ventana del vagón, sin las vías largas del modelo', () => {
  assert.equal(TRAIN.spots.length, 1);
  assert.equal(TRAIN.start, TRAIN.spots[0].id);
  const vagon = TRAIN.pieces.find((p) => p.id === 'vagon');
  assert.match(vagon.url, /^\/models\/tren\//);
  for (const rail of ['Object_114', 'Object_115', 'Object_116', 'Object_117']) assert.ok(vagon.hide.includes(rail), rail);
  assert.ok(TRAIN.structures.some((s) => s.type === 'passing'));
});

test('el paisaje pasa por la ventana; con movimiento reducido queda quieto', async () => {
  const { BUILDERS } = await import('../components/stage/locations/builders.js');
  const def = TRAIN.structures.find((s) => s.type === 'passing');
  const run = (reducedMotion) => {
    const scene = new THREE.Scene();
    const { object, update } = BUILDERS.passing(scene, def, { textures: () => new THREE.MeshStandardMaterial(), halo: null, budget: { low: false }, state: { reducedMotion } });
    const before = object.children.map((c) => c.position.z);
    update(0.1, 1);
    return object.children.some((c, i) => c.position.z !== before[i]);
  };
  assert.equal(run(false), true);
  assert.equal(run(true), false);
});
