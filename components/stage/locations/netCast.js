import * as THREE from 'three';
import { FISHING, fishPosition, landingPoint, nearestFish, netCatch, reachAt } from '../dioramas/logic.js';
import { createMatch, helpLevel, resolve, retry as retryMatch } from '../../../lib/minigame.js';

// La jornada de Marin en la escena del 4, con las mismas reglas que el diorama: mantener sobre el agua carga el
// alcance de la red (va y viene) y soltar la tira. Cinco redes para tres peces; la corriente corre un poco la red
// y el pez dorado vale por dos. Soltar fuera del agua no gasta la red.
// `def`: { from (la punta del muelle, en metros), water (el centro del agua donde nadan, a la altura del agua), scale (metros por unidad) }.
const THROW_SECONDS = 0.55;
const GOLDEN = FISHING.fish - 1;
const ARC = 20;

export function createNetCast(def, { mode = 'idle', onMatch = () => {}, onComplete = () => {}, sfx = { play() {} } } = {}) {
  const { from: fromWorld, water, scale: S } = def;
  const group = new THREE.Group();
  const waterY = water[1];
  // Coordenadas de las reglas: la punta del muelle es (0, 0) y una unidad son `scale` metros.
  const from = { x: 0, z: 0 };
  const waterCenter = { x: (water[0] - fromWorld[0]) / S, z: (water[2] - fromWorld[2]) / S };
  const toWorld = (p, y = waterY) => new THREE.Vector3(fromWorld[0] + p.x * S, y, fromWorld[2] + p.z * S);
  const tip = new THREE.Vector3(...fromWorld).add(new THREE.Vector3(0, 1.2, 0));

  // Donde se apunta: un plano invisible sobre el agua.
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ visible: false }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(water[0], waterY, water[2]);
  group.add(surface);
  surface.updateMatrixWorld(); // para apuntar desde el primer cuadro (y en las pruebas, sin render)

  // Los peces: sombras alargadas bajo la superficie que de vez en cuando saltan; el dorado brilla un poco.
  const fishMat = new THREE.MeshStandardMaterial({ color: 0x1f2a2e, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0b44a, roughness: 0.35, metalness: 0.3, emissive: 0x5a3a00 });
  const fish = Array.from({ length: FISHING.fish }, (_, index) => ({ index, x: 0, z: 0, caught: false, golden: index === GOLDEN }));
  const fishMeshes = fish.map((f) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), f.golden ? goldMat : fishMat);
    m.scale.set(f.golden ? 3.4 : 2.8, 0.45, 1);
    group.add(m);
    return m;
  });

  // La red en el aire, la mira donde caería, el arco desde el muelle y la salpicadura.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.9 });
  const net = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 4, 40), ropeMat);
  net.rotation.x = -Math.PI / 2;
  net.visible = false;
  const ring = (inner, color, opacity) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(inner, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    return m;
  };
  const aim = ring(0.93, 0xffffff, 0.6);
  const splash = ring(0.7, 0xdff2ff, 0);
  const arcPositions = new Float32Array(ARC * 3);
  const arcGeometry = new THREE.BufferGeometry();
  arcGeometry.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
  const arc = new THREE.Line(arcGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
  arc.frustumCulled = false;
  arc.visible = false;
  // Las redes que quedan, enrolladas en la punta del muelle.
  const pile = Array.from({ length: FISHING.nets }, (_, i) => {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 16), ropeMat);
    coil.rotation.x = -Math.PI / 2;
    coil.position.set(fromWorld[0] - 0.9 + (i % 3) * 0.42, fromWorld[1] + 0.05 + Math.floor(i / 3) * 0.09, fromWorld[2] + 0.9 + Math.floor(i / 3) * 0.2);
    group.add(coil);
    return coil;
  });
  group.add(net, aim, splash, arc);

  let match = null;
  let charge = null; // { t, aim, target }
  let throwing = null;
  let netTimer = 0;
  let haul = null;
  const help = () => (match ? helpLevel(match) : 0);
  const netRadius = () => (help() ? FISHING.helpRadius : FISHING.netRadius);

  function syncVisuals() {
    fish.forEach((f, i) => { fishMeshes[i].visible = !f.caught; });
    const inPile = match ? match.livesLeft - (throwing ? 1 : 0) : mode === 'done' ? 0 : FISHING.nets;
    pile.forEach((coil, i) => { coil.visible = i < inPile; });
  }

  function setMode(next) {
    mode = next;
    match = next === 'play' ? createMatch({ goal: FISHING.goal, lives: FISHING.nets }) : null;
    charge = null; throwing = null; haul = null; netTimer = 0;
    net.visible = aim.visible = arc.visible = false;
    fish.forEach((f, i) => { f.caught = next === 'done' && i < FISHING.goal; });
    syncVisuals();
    if (match) onMatch(match);
  }
  setMode(mode);

  const canThrow = () => match?.phase === 'playing' && !throwing && !charge;

  function waterPoint(raycaster) {
    const hit = raycaster.intersectObject(surface, false)[0];
    return hit ? { x: (hit.point.x - fromWorld[0]) / S, z: (hit.point.z - fromWorld[2]) / S } : null;
  }

  function startCharge(point, target = null) {
    if (!canThrow()) return false;
    charge = { t: 0, aim: point, target };
    sfx.play('tick');
    return true;
  }

  // Tira la red justo a `point` (coordenadas de las reglas).
  function cast(point) {
    if (match?.phase !== 'playing' || throwing) return;
    charge = null;
    aim.visible = arc.visible = false;
    throwing = { to: toWorld(point), point, t: 0 };
    net.visible = true;
    netTimer = 0;
    syncVisuals();
    sfx.play('throw');
  }

  function release() {
    if (!charge) return;
    cast(landingPoint(from, charge.aim, reachAt(charge.t, help()), help()));
  }

  function land(point) {
    sfx.play('splash');
    splash.position.copy(toWorld(point, waterY + 0.02));
    splash.scale.setScalar(0.4);
    splash.material.opacity = 0.8;
    splash.visible = true;
    const { caught, points } = netCatch(fish, point, netRadius());
    caught.forEach((i) => { fish[i].caught = true; });
    netTimer = 0.6;
    match = resolve(match, { points, cost: 1 });
    if (points) { sfx.play('harvest'); haul = caught; } else sfx.play('miss');
    if (match.phase === 'won') { sfx.play('ignite'); onComplete(match); }
    if (match.phase === 'lost') sfx.play('lose');
    syncVisuals();
    onMatch(match);
  }

  function drawCharge() {
    const reach = reachAt(charge.t, help());
    const dx = charge.aim.x - from.x, dz = charge.aim.z - from.z;
    const length = Math.hypot(dx, dz) || 1;
    const end = toWorld({ x: from.x + (dx / length) * reach, z: from.z + (dz / length) * reach }, waterY + 0.03);
    aim.position.copy(end);
    aim.scale.setScalar(netRadius() * S);
    aim.visible = true;
    for (let i = 0; i < ARC; i++) {
      const k = i / (ARC - 1);
      const p = tip.clone().lerp(end, k);
      p.y += Math.sin(k * Math.PI) * (0.8 + reach * S * 0.2);
      arcPositions.set([p.x, p.y, p.z], i * 3);
    }
    arcGeometry.attributes.position.needsUpdate = true;
    arc.visible = true;
  }

  return {
    group,
    waterCenter,
    throwSeconds: THROW_SECONDS,
    update(dt, t) {
      fish.forEach((f, i) => {
        if (f.caught) return;
        const p = fishPosition(i, t, waterCenter);
        const m = fishMeshes[i];
        m.rotation.y = -Math.atan2(p.z - f.z, p.x - f.x);
        f.x = p.x; f.z = p.z;
        const jump = Math.max(0, Math.sin(t * 0.8 + i * 2.3)) ** 14 * 0.7;
        m.position.copy(toWorld(p, waterY + 0.01 + jump)); // el lomo apenas afuera del agua
      });
      if (charge) {
        charge.t += dt;
        if (charge.target !== null) {
          const p = fishPosition(charge.target, t + THROW_SECONDS, waterCenter);
          const drift = help() ? 0 : 1; // con el botón la corriente ya viene compensada
          charge.aim = { x: p.x - FISHING.drift.x * drift, z: p.z - FISHING.drift.z * drift };
        }
        drawCharge();
      }
      if (throwing) {
        throwing.t = Math.min(1, throwing.t + dt / THROW_SECONDS);
        const k = throwing.t;
        net.position.lerpVectors(tip, throwing.to, k);
        net.position.y += Math.sin(k * Math.PI) * 1.6;
        net.scale.setScalar(netRadius() * S * (0.4 + 0.6 * k));
        if (k >= 1) { const { point } = throwing; throwing = null; land(point); }
      }
      if (netTimer > 0) {
        netTimer -= dt;
        net.position.y = waterY - 0.05 + (Math.max(0, 0.6 - netTimer) / 0.6) * 0.5;
        haul?.forEach((i, k) => { fishMeshes[i].visible = true; fishMeshes[i].position.set(net.position.x + (k - 0.5) * 0.3, net.position.y - 0.05, net.position.z); });
        if (netTimer <= 0) { net.visible = false; haul?.forEach((i) => { fishMeshes[i].visible = false; }); haul = null; }
      }
      if (splash.material.opacity > 0) {
        splash.scale.multiplyScalar(1 + dt * 2.5);
        splash.material.opacity = Math.max(0, splash.material.opacity - dt * 1.2);
        if (splash.material.opacity === 0) splash.visible = false;
      }
    },
    // Con el botón o la barra: una vez empieza a cargar apuntando al pez más cercano, otra vez tira.
    performAction() {
      if (charge) { release(); return true; }
      if (!canThrow()) return false;
      const target = nearestFish(fish, from);
      return target !== null && startCharge({ x: fish[target].x, z: fish[target].z }, target);
    },
    cast,
    retry() {
      if (match?.phase !== 'lost') return;
      match = retryMatch(match);
      fish.forEach((f) => { f.caught = false; });
      haul = null;
      syncVisuals();
      onMatch(match);
    },
    setMode,
    pointerDown(r) {
      const p = waterPoint(r);
      return Boolean(p) && startCharge(p);
    },
    pointerMove(r) {
      const p = waterPoint(r);
      if (charge && charge.target === null && p) charge.aim = p;
      return match?.phase === 'playing' && Boolean(p);
    },
    pointerUp(r) {
      if (!charge || charge.target !== null) return;
      const p = waterPoint(r);
      if (!p) { charge = null; aim.visible = arc.visible = false; return; } // soltar fuera del agua no tira
      charge.aim = p;
      release();
    },
    getState: () => ({ match, charging: Boolean(charge), throwing: Boolean(throwing), fish: fish.map(({ x, z, caught, golden }) => ({ x, z, caught, golden })) }),
    dispose() {
      group.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
      group.removeFromParent();
    },
  };
}
