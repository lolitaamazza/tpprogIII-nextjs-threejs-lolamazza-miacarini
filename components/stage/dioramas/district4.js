import * as THREE from 'three';
import { createDioramaBase, disposeObject, growIn, mat } from './common.js';
import { createTally, fishInNet, fishPosition, nearestFish, tally } from './logic.js';

const TO_CATCH = 3;
const FISH = 5;
const NET_RADIUS = 0.3;
const THROW_SECONDS = 0.55;
const WATER_CENTER = { x: 0.15, z: 0.15 };
const WATER_Y = 0.09;

export function buildDistrict4({ origin, completed, onProgress, onComplete, sfx }) {
  const { group } = createDioramaBase(origin, '#c8b88a');

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 32),
    new THREE.MeshStandardMaterial({ color: '#2f6f8f', transparent: true, opacity: 0.88, roughness: 0.2, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(WATER_CENTER.x, 0.085, WATER_CENTER.z);
  group.add(water);

  // Muelle
  const plank = mat('#7a5a3a');
  for (let i = 0; i < 5; i++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.18), plank);
    board.position.set(-0.85 + i * 0.1, 0.12, 0);
    group.add(board);
  }
  const dockTip = new THREE.Vector3(-0.42, 0.14, 0);

  // Botes
  const boats = [[0.55, -0.35], [-0.1, 0.62]].map(([x, z], i) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08), mat('#8b4a2b'));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4), plank);
    mast.position.y = 0.12;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 3), mat('#e8e2cc'));
    sail.position.set(0.03, 0.12, 0);
    boat.add(hull, mast, sail);
    boat.position.set(x, 0.1, z);
    boat.rotation.y = i * 1.2;
    group.add(boat);
    return boat;
  });

  // Peces
  const fishMat = mat('#fff1b8', { emissive: '#6b5a22' });
  const fish = Array.from({ length: FISH }, (_, index) => ({ index, x: 0, z: 0, caught: false }));
  const fishMeshes = fish.map(() => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), fishMat);
    m.rotation.z = Math.PI / 2;
    group.add(m);
    return m;
  });

  // Red, mira y salpicadura
  const net = new THREE.Mesh(new THREE.TorusGeometry(NET_RADIUS, 0.012, 4, 32), mat('#e8e2cc'));
  net.rotation.x = -Math.PI / 2;
  net.visible = false;
  const aim = new THREE.Mesh(
    new THREE.RingGeometry(NET_RADIUS * 0.9, NET_RADIUS, 32),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
  );
  aim.rotation.x = -Math.PI / 2;
  aim.visible = false;
  const splash = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.08, 32),
    new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  splash.rotation.x = -Math.PI / 2;
  splash.visible = false;
  group.add(net, aim, splash);

  let state = createTally(TO_CATCH, completed);
  if (completed) fish.slice(0, TO_CATCH).forEach((f, i) => { f.caught = true; fishMeshes[i].visible = false; });
  let aiming = false;
  let throwing = null;
  let netTimer = 0;
  let clock = 0;
  const local = new THREE.Vector3();

  function waterPoint(raycaster) {
    const hit = raycaster.intersectObject(water, false)[0];
    if (!hit) return null;
    return group.worldToLocal(local.copy(hit.point)).clone();
  }

  function throwNet(target) {
    if (state.done || throwing) return;
    throwing = { from: dockTip.clone(), to: new THREE.Vector3(target.x, WATER_Y, target.z), t: 0 };
    net.visible = true;
    netTimer = 0;
    sfx.play('throw');
  }

  function land(target) {
    sfx.play('splash');
    splash.position.set(target.x, WATER_Y + 0.005, target.z);
    splash.scale.setScalar(1);
    splash.material.opacity = 0.8;
    splash.visible = true;
    const caught = fishInNet(fish, target, NET_RADIUS);
    caught.forEach((i) => { fish[i].caught = true; fishMeshes[i].visible = false; });
    netTimer = 0.6;
    if (!caught.length) return;
    const result = tally(state, caught.length);
    state = result.state;
    onProgress(state.count / state.total);
    if (result.justCompleted) { sfx.play('ignite'); onComplete(); }
  }

  return {
    group,
    update(dt, elapsed) {
      clock = elapsed;
      growIn(group, dt);
      fish.forEach((f, i) => {
        if (f.caught) return;
        const p = fishPosition(i, elapsed, WATER_CENTER);
        const m = fishMeshes[i];
        m.rotation.y = -Math.atan2(p.z - f.z, p.x - f.x);
        f.x = p.x; f.z = p.z;
        m.position.set(p.x, 0.07, p.z);
      });
      boats.forEach((b, i) => { b.position.y = 0.1 + Math.sin(elapsed * 2 + i) * 0.01; });
      if (throwing) {
        throwing.t = Math.min(1, throwing.t + dt / THROW_SECONDS);
        const t = throwing.t;
        net.position.lerpVectors(throwing.from, throwing.to, t);
        net.position.y = WATER_Y + Math.sin(t * Math.PI) * 0.45;
        net.scale.setScalar(0.4 + 0.6 * t);
        if (t >= 1) { const target = throwing.to; throwing = null; land(target); }
      }
      if (netTimer > 0) { netTimer -= dt; if (netTimer <= 0) net.visible = false; }
      if (splash.material.opacity > 0) {
        splash.scale.multiplyScalar(1 + dt * 2.5);
        splash.material.opacity = Math.max(0, splash.material.opacity - dt * 1.2);
        if (splash.material.opacity === 0) splash.visible = false;
      }
    },
    pointerDown(raycaster) {
      if (state.done) return;
      const p = waterPoint(raycaster);
      if (!p) return;
      aiming = true;
      aim.visible = true;
      aim.position.set(p.x, WATER_Y + 0.01, p.z);
    },
    pointerMove(raycaster) {
      const p = waterPoint(raycaster);
      if (aiming && p) aim.position.set(p.x, WATER_Y + 0.01, p.z);
      return !state.done && !!p;
    },
    pointerUp(raycaster) {
      if (!aiming) return;
      aiming = false;
      aim.visible = false;
      const p = waterPoint(raycaster);
      if (p) throwNet(p);
    },
    performAction() {
      if (state.done || throwing) return;
      const i = nearestFish(fish, dockTip);
      if (i === null) return;
      throwNet(fishPosition(i, clock + THROW_SECONDS, WATER_CENTER));
    },
    dispose() { disposeObject(group); },
  };
}
