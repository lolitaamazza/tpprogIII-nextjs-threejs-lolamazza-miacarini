import * as THREE from 'three';
import { createBurst, createDioramaBase, disposeObject, growIn, mat } from './common.js';
import { FISHING, fishPosition, landingPoint, nearestFish, netCatch, reachAt } from './logic.js';
import { createMatch, helpLevel, resolve, retry as retryMatch } from '../../../lib/minigame.js';

// Distrito 4: mantener apretado sobre el agua carga el alcance de la red (va y viene), soltar la tira hacia donde
// se apunta. La corriente la corre un poco. Cinco redes para tres peces; el dorado vale por dos.
const THROW_SECONDS = 0.55;
const WATER_CENTER = { x: 0.15, z: 0.15 };
const WATER_RADIUS = 0.85;
const WATER_Y = 0.09;
const GOLDEN = FISHING.fish - 1;
const FOAM = 12;

export function buildDistrict4({ origin, completed, onProgress, onComplete, onMatch = () => {}, sfx }) {
  const { group } = createDioramaBase(origin, '#c8b88a');

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(WATER_RADIUS, 32),
    new THREE.MeshStandardMaterial({ color: '#2f6f8f', transparent: true, opacity: 0.88, roughness: 0.2, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(WATER_CENTER.x, 0.085, WATER_CENTER.z);
  group.add(water);

  // Muelle, el pescador en la punta y las redes que quedan, apiladas
  const plank = mat('#7a5a3a');
  for (let i = 0; i < 5; i++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.18), plank);
    board.position.set(-0.85 + i * 0.1, 0.12, 0);
    group.add(board);
  }
  const dockTip = new THREE.Vector3(-0.42, 0.14, 0);
  const from = { x: dockTip.x, z: dockTip.z };
  const fisher = new THREE.Group();
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 6), mat('#3d4a52'));
  coat.position.y = 0.06;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#d9b48f'));
  head.position.y = 0.14;
  fisher.add(coat, head);
  fisher.position.set(dockTip.x - 0.06, 0.13, 0.05);
  group.add(fisher);
  const netPile = Array.from({ length: FISHING.nets }, (_, i) => {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 4, 12), mat('#e8e2cc'));
    coil.rotation.x = -Math.PI / 2;
    coil.position.set(-0.78 + (i % 3) * 0.075, 0.137 + Math.floor(i / 3) * 0.012, -0.05 + Math.floor(i / 3) * 0.04);
    group.add(coil);
    return coil;
  });

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

  // Peces; el último es dorado, más grande y más rápido
  const fishMat = mat('#fff1b8', { emissive: '#6b5a22' });
  const goldMat = mat('#ffc83a', { emissive: '#b8740a', emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.4 });
  const fish = Array.from({ length: FISHING.fish }, (_, index) => ({ index, x: 0, z: 0, caught: false, golden: index === GOLDEN }));
  const fishMeshes = fish.map((f) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(f.golden ? 0.05 : 0.04, f.golden ? 0.18 : 0.15, 4), f.golden ? goldMat : fishMat);
    m.rotation.z = Math.PI / 2;
    group.add(m);
    return m;
  });

  // La corriente: espuma que se corre en la dirección en que el agua desvía la red
  const foamMat = new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0.35, depthWrite: false });
  const foamGeometry = new THREE.PlaneGeometry(0.07, 0.01);
  const driftAngle = Math.atan2(FISHING.drift.z, FISHING.drift.x);
  const foam = Array.from({ length: FOAM }, (_, i) => {
    const m = new THREE.Mesh(foamGeometry, foamMat);
    m.rotation.set(-Math.PI / 2, 0, -driftAngle);
    m.userData.seed = i;
    group.add(m);
    return m;
  });

  // Red en vuelo, mira (dónde caería), arco del tiro y salpicadura
  const net = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 4, 32), mat('#e8e2cc'));
  net.rotation.x = -Math.PI / 2;
  net.visible = false;
  const ringMaterial = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  const aim = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), ringMaterial('#ffffff', 0.55));
  aim.rotation.x = -Math.PI / 2;
  aim.visible = false;
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 32), ringMaterial('#cfefff', 0));
  splash.name = 'splash';
  splash.rotation.x = -Math.PI / 2;
  splash.visible = false;
  const ARC = 16;
  const arcPositions = new Float32Array(ARC * 3);
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
  const arc = new THREE.Line(arcGeometry, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
  arc.frustumCulled = false;
  arc.visible = false;
  const drops = createBurst(group, '#cfefff', 24);
  group.add(net, aim, splash, arc);

  let match = createMatch({ goal: FISHING.goal, lives: FISHING.nets, completed });
  if (completed) fish.slice(0, FISHING.goal).forEach((f) => { f.caught = true; });
  let charge = null; // { t, aim, target }: target es el pez que sigue la mira con el botón o la barra
  let throwing = null;
  let netTimer = 0;
  const local = new THREE.Vector3();
  const help = () => helpLevel(match);
  const netRadius = () => (help() ? FISHING.helpRadius : FISHING.netRadius);

  function syncVisuals() {
    fish.forEach((f, i) => { fishMeshes[i].visible = !f.caught; });
    const inPile = match.livesLeft - (throwing ? 1 : 0); // la red que está en el aire ya no está en la pila
    netPile.forEach((coil, i) => { coil.visible = i < inPile; });
    foam.forEach((m) => { m.visible = !help(); });
  }
  syncVisuals();
  if (!completed) onMatch(match);

  function waterPoint(raycaster) {
    const hit = raycaster.intersectObject(water, false)[0];
    if (!hit) return null;
    const p = group.worldToLocal(local.copy(hit.point));
    return { x: p.x, z: p.z };
  }

  const canThrow = () => match.phase === 'playing' && !throwing && !charge;

  function startCharge(aimPoint, target = null) {
    if (!canThrow()) return;
    charge = { t: 0, aim: aimPoint, target };
    sfx.play('tick');
  }

  function release() {
    if (!charge) return;
    const to = landingPoint(from, charge.aim, reachAt(charge.t, help()), help());
    charge = null;
    aim.visible = false;
    arc.visible = false;
    throwing = { from: dockTip.clone(), to: new THREE.Vector3(to.x, WATER_Y, to.z), t: 0 };
    net.visible = true;
    netTimer = 0;
    syncVisuals();
    sfx.play('throw');
  }

  function land(target) {
    sfx.play('splash');
    splash.position.set(target.x, WATER_Y + 0.005, target.z);
    splash.scale.setScalar(1);
    splash.material.opacity = 0.8;
    splash.visible = true;
    drops.burst(new THREE.Vector3(target.x, WATER_Y + 0.02, target.z));
    const { caught, points } = netCatch(fish, target, netRadius());
    caught.forEach((i) => { fish[i].caught = true; });
    netTimer = 0.6;
    match = resolve(match, { points, cost: 1 });
    if (points) { sfx.play('harvest'); onProgress(match.score / match.goal); } else sfx.play('miss');
    if (match.phase === 'won') { sfx.play('ignite'); onComplete(); }
    if (match.phase === 'lost') sfx.play('lose');
    syncVisuals();
    onMatch(match);
  }

  // Lo que se ve mientras se carga: la mira donde caería la red (sin la corriente) y el arco desde el muelle.
  function drawCharge() {
    const reach = reachAt(charge.t, help());
    const dx = charge.aim.x - from.x;
    const dz = charge.aim.z - from.z;
    const length = Math.hypot(dx, dz) || 1;
    const x = from.x + (dx / length) * reach;
    const z = from.z + (dz / length) * reach;
    aim.position.set(x, WATER_Y + 0.01, z);
    aim.scale.setScalar(netRadius());
    aim.visible = true;
    for (let i = 0; i < ARC; i++) {
      const t = i / (ARC - 1);
      arcPositions.set([from.x + (x - from.x) * t, WATER_Y + 0.05 + Math.sin(t * Math.PI) * (0.12 + reach * 0.25), from.z + (z - from.z) * t], i * 3);
    }
    arcGeometry.attributes.position.needsUpdate = true;
    arc.visible = true;
  }

  return {
    group,
    update(dt, elapsed) {
      growIn(group, dt);
      drops.update(dt);
      fish.forEach((f, i) => {
        if (f.caught) return;
        const p = fishPosition(i, elapsed, WATER_CENTER);
        const m = fishMeshes[i];
        m.rotation.y = -Math.atan2(p.z - f.z, p.x - f.x);
        f.x = p.x; f.z = p.z;
        m.position.set(p.x, 0.07, p.z);
      });
      boats.forEach((b, i) => { b.position.y = 0.1 + Math.sin(elapsed * 2 + i) * 0.01; });
      foam.forEach((m) => {
        // cada línea de espuma cruza el agua siguiendo la corriente y vuelve a empezar
        const s = m.userData.seed;
        const t = ((elapsed * 0.08 + s * 0.37) % 1);
        const side = ((s * 0.618) % 1) * 2 - 1;
        const len = Math.hypot(FISHING.drift.x, FISHING.drift.z);
        const ux = FISHING.drift.x / len;
        const uz = FISHING.drift.z / len;
        const along = (t * 2 - 1) * WATER_RADIUS * 0.8;
        m.position.set(WATER_CENTER.x + ux * along - uz * side * 0.55, WATER_Y + 0.002, WATER_CENTER.z + uz * along + ux * side * 0.55);
      });
      if (charge) {
        charge.t += dt;
        if (charge.target !== null) {
          const p = fishPosition(charge.target, elapsed + THROW_SECONDS, WATER_CENTER);
          const drift = help() ? 0 : 1; // con el botón la corriente ya viene compensada: solo cuenta cuándo se suelta
          charge.aim = { x: p.x - FISHING.drift.x * drift, z: p.z - FISHING.drift.z * drift };
        }
        drawCharge();
      }
      if (throwing) {
        throwing.t = Math.min(1, throwing.t + dt / THROW_SECONDS);
        const t = throwing.t;
        net.position.lerpVectors(throwing.from, throwing.to, t);
        net.position.y = WATER_Y + Math.sin(t * Math.PI) * 0.45;
        net.scale.setScalar(netRadius() * (0.4 + 0.6 * t));
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
      const p = waterPoint(raycaster);
      if (p) startCharge(p);
    },
    pointerMove(raycaster) {
      const p = waterPoint(raycaster);
      if (charge && charge.target === null && p) charge.aim = p;
      return match.phase === 'playing' && !!p;
    },
    pointerUp(raycaster) {
      if (!charge || charge.target !== null) return;
      const p = waterPoint(raycaster);
      if (p) charge.aim = p;
      release();
    },
    // Con el botón o la barra: una vez empieza a cargar apuntando al pez más cercano, otra vez tira.
    performAction() {
      if (charge) { release(); return; }
      if (!canThrow()) return;
      const target = nearestFish(fish, from);
      if (target !== null) startCharge({ x: fish[target].x, z: fish[target].z }, target);
    },
    retry() {
      if (match.phase !== 'lost') return;
      match = retryMatch(match);
      fish.forEach((f) => { f.caught = false; });
      syncVisuals();
      onProgress(0);
      onMatch(match);
    },
    getState() {
      return { match, charging: Boolean(charge), reach: charge ? reachAt(charge.t, help()) : FISHING.minReach, aim: charge?.aim ?? null, from };
    },
    dispose() { disposeObject(group); },
  };
}
