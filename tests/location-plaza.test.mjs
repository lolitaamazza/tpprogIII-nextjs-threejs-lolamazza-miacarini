import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { plazaFor } from '../lib/locations/plaza.js';

test('cada plaza: el Edificio de Justicia, el escenario con la urna y el micrófono, y la gente', () => {
  for (const district of ['12', '11', '4']) {
    const plaza = plazaFor(district);
    assert.equal(plaza.spots.length, 1);
    assert.equal(plaza.job.type, 'draw');
    assert.equal(plaza.job.spot, plaza.start);
    for (const piece of plaza.pieces) assert.match(piece.url, /^\/models\/(plaza|d11|d4)\//, piece.id);
    for (const id of ['edificio', 'urna', 'microfono']) assert.ok(plaza.pieces.some((p) => p.id === id), id);
    const types = plaza.structures.map((s) => s.type);
    for (const type of ['stage', 'crowd', 'paving', 'banner']) assert.ok(types.includes(type), type);
    assert.ok(plaza.structures.some((s) => s.type === 'banner' && s.text === `DISTRITO ${district}`), 'el cartel dice de qué distrito es la plaza');
    assert.ok(!plaza.title.includes(':'));
  }
});

test('sacar el papel: sube de la urna y termina una sola vez', async () => {
  const { JOBS } = await import('../components/stage/locations/jobs.js');
  let done = 0;
  const job = JOBS.draw(plazaFor('12').job, { mode: 'play', onComplete: () => { done += 1; }, onMatch() {}, sfx: { play() {} } });
  assert.equal(job.performAction(), true);
  for (let t = 0; t < 3; t += 0.05) job.update(0.05, t);
  assert.equal(done, 1);
  assert.equal(job.performAction(), false, 'ya se sacó');
  const idle = JOBS.draw(plazaFor('12').job, { mode: 'idle', onComplete: () => { done += 1; } });
  assert.equal(idle.performAction(), false);
  assert.equal(done, 1);
});

test('la gente de la plaza son siluetas (sin caras) y dejan un pasillo donde está la cámara', async () => {
  const { BUILDERS } = await import('../components/stage/locations/builders.js');
  const plaza = plazaFor('11');
  const def = plaza.structures.find((s) => s.type === 'crowd');
  const scene = new THREE.Scene();
  const { object } = BUILDERS.crowd(scene, def, { textures: () => new THREE.MeshStandardMaterial(), halo: null, budget: { low: false }, state: { reducedMotion: false } });
  assert.ok(object.count > 60);
  const [x, , z] = plaza.spots[0].position;
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < object.count; i++) {
    object.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    assert.ok(Math.hypot(p.x - x, p.z - z) > 0.6, 'nadie parado donde está la cámara');
  }
});
