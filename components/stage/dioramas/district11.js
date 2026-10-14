import * as THREE from 'three';
import { createBurst, createDioramaBase, disposeObject, growIn, mat } from './common.js';
import { createTally, tally } from './logic.js';

const STALKS = 24;
const PER_ACTION = 6;

function makeTower(x, z) {
  const tower = new THREE.Group();
  const wood = mat('#5a4a3a');
  for (const [dx, dz] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.45, 0.015), wood);
    leg.position.set(dx, 0.225, dz);
    tower.add(leg);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), wood);
  cabin.position.y = 0.48;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.08, 4), mat('#3a2f25'));
  roof.position.y = 0.56;
  roof.rotation.y = Math.PI / 4;
  tower.add(cabin, roof);
  tower.position.set(x, 0.08, z);
  return tower;
}

function makeBird() {
  const bird = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), mat('#a9bdf0', { emissive: '#2a3a66' }));
  bird.rotation.z = Math.PI / 2;
  bird.visible = false;
  return bird;
}

export function buildDistrict11({ origin, completed, onProgress, onComplete, sfx }) {
  const { group } = createDioramaBase(origin, '#64543a');

  // Huerto al fondo
  const leaf = mat('#3f6b3a');
  for (let i = 0; i < 6; i++) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), leaf);
    bush.position.set(-0.6 + i * 0.24, 0.14, -0.78);
    group.add(bush);
  }
  // Torres de vigilancia con sinsajos
  const towers = [makeTower(-0.78, -0.55), makeTower(0.78, -0.55)];
  const birds = towers.map((tower) => {
    const bird = makeBird();
    bird.position.set(tower.position.x, 0.68, tower.position.z);
    bird.userData.baseY = bird.position.y;
    group.add(tower, bird);
    return bird;
  });

  // Campo de trigo
  const field = new THREE.Group();
  field.position.set(0, 0.08, 0.15);
  group.add(field);
  const stemMat = mat('#a88b3c');
  const headMat = mat('#e8c25a', { emissive: '#3a2a00' });
  const cutMat = mat('#6b5a2a');
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const stalks = Array.from({ length: STALKS }, (_, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const stalk = new THREE.Group();
    stalk.position.set(-0.55 + col * 0.22 + (row % 2) * 0.06, 0, -0.3 + row * 0.2);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.22, 4), stemMat);
    stem.position.y = 0.11;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), headMat);
    head.position.y = 0.25;
    // Caja invisible más grande para que sea fácil rozarla con el puntero o el dedo
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.2), hitMat);
    hit.position.y = 0.15;
    hit.userData.index = i;
    stalk.add(stem, head, hit);
    field.add(stalk);
    return { stalk, stem, head, hit, harvested: false };
  });
  const hitBoxes = stalks.map((s) => s.hit);
  const sparkles = createBurst(group, '#ffd36b');

  function cut(s) {
    s.harvested = true;
    s.head.visible = false;
    s.stem.material = cutMat;
    s.stem.scale.y = 0.35;
    s.stem.position.y = 0.04;
    s.stalk.rotation.z = 0;
  }

  let state = createTally(STALKS, completed);
  let singing = completed;
  if (completed) stalks.forEach(cut);
  birds.forEach((b) => { b.visible = singing; });

  function harvest(list) {
    if (state.done) return;
    const fresh = list.filter((s) => !s.harvested);
    if (!fresh.length) return;
    fresh.forEach((s) => {
      cut(s);
      sparkles.burst(new THREE.Vector3(field.position.x + s.stalk.position.x, 0.3, field.position.z + s.stalk.position.z));
    });
    sfx.play('harvest');
    const result = tally(state, fresh.length);
    state = result.state;
    onProgress(state.count / state.total);
    if (result.justCompleted) {
      singing = true;
      birds.forEach((b) => { b.visible = true; });
      sfx.play('whistle');
      onComplete();
    }
  }

  function sweep(raycaster) {
    const hit = raycaster.intersectObjects(hitBoxes, false)[0];
    if (!hit) return false;
    harvest([stalks[hit.object.userData.index]]);
    return !state.done;
  }

  return {
    group,
    update(dt, elapsed) {
      growIn(group, dt);
      sparkles.update(dt);
      stalks.forEach((s, i) => { if (!s.harvested) s.stalk.rotation.z = Math.sin(elapsed * 1.6 + i) * 0.06; });
      if (singing) birds.forEach((b, i) => { b.position.y = b.userData.baseY + Math.abs(Math.sin(elapsed * 5 + i)) * 0.04; });
    },
    pointerDown: sweep,
    pointerMove: sweep,
    pointerUp() {},
    performAction() { harvest(stalks.filter((s) => !s.harvested).slice(0, PER_ACTION)); },
    dispose() { disposeObject(group); },
  };
}
