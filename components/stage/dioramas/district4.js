import * as THREE from 'three';
import { createBurst, createDioramaBase, createMotes, disposeObject, growIn, mat } from './common.js';
import { instanceOf, loadKit } from './assets.js';
import { createFigure, lookToward } from './figure.js';
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

// Agua de juguete: más clara en la orilla, espuma en el borde, ondas que se mueven y destellos.
const WATER_VERTEX = /* glsl */`
  uniform float uTime;
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    vec3 p = position;
    p.z += sin(p.x * 18.0 + uTime * 1.6) * 0.0025 + cos(p.y * 15.0 - uTime * 1.3) * 0.0025; // sin bajar de la arena
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const WATER_FRAGMENT = /* glsl */`
  uniform float uTime;
  uniform float uRadius;
  varying vec2 vPos;
  void main() {
    float r = length(vPos) / uRadius;
    vec3 deep = vec3(0.09, 0.30, 0.42);
    vec3 shallow = vec3(0.30, 0.62, 0.66);
    vec3 col = mix(deep, shallow, smoothstep(0.35, 0.95, r));
    float ripple = sin(vPos.x * 40.0 + uTime * 1.2) * sin(vPos.y * 37.0 - uTime * 0.9);
    col += smoothstep(0.82, 0.98, ripple) * 0.12;
    float foam = smoothstep(0.9, 0.97, r + sin(atan(vPos.y, vPos.x) * 9.0 + uTime * 1.5) * 0.015);
    col = mix(col, vec3(0.92, 0.96, 0.95), foam);
    gl_FragColor = vec4(col, 0.92);
    #include <colorspace_fragment>
  }
`;

export function buildDistrict4({ origin, completed, onProgress, onComplete, onMatch = () => {}, sfx, rig }) {
  const { group } = createDioramaBase(origin, '#c8b88a');

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRadius: { value: WATER_RADIUS } },
    vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT, transparent: true, depthWrite: false,
  });
  const water = new THREE.Mesh(new THREE.RingGeometry(0, WATER_RADIUS, 64, 10), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(WATER_CENTER.x, 0.088, WATER_CENTER.z);
  group.add(water);

  // Lo hecho con código mientras cargan los modelos de Kenney (y si no cargan): el muelle y el pescador.
  const fallback = new THREE.Group();
  group.add(fallback);

  // Muelle, el pescador en la punta y las redes que quedan, apiladas
  const plank = mat('#7a5a3a');
  for (let i = 0; i < 5; i++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.18), plank);
    board.position.set(-0.85 + i * 0.1, 0.12, 0);
    fallback.add(board);
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
  fallback.add(fisher);
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
  // Vida: destellos que flotan sobre el agua.
  const glints = createMotes(group, { count: 18, center: [WATER_CENTER.x, WATER_Y + 0.015, WATER_CENTER.z], spread: [1.3, 0.001, 1.3], color: '#ffffff', size: 0.02, rise: 0, sway: 0.04, opacity: 0.7, seed: 11 });

  // Con los modelos: muelle de madera, botes, cajas y barriles, rocas de orilla, peces de verdad y la pescadora.
  let figure = null;
  let disposed = false;
  let haul = null; // los peces que sube la red
  const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });
  const place = (kit, name, [x, y, z], scale, rotation = 0, parent = group) => {
    const object = instanceOf(kit, name);
    if (!object) return null;
    object.position.set(x, y, z);
    object.scale.setScalar(scale);
    object.rotation.y = rotation;
    parent.add(object);
    return object;
  };
  loadKit('4').then((kit) => {
    if (!kit || disposed) return;
    fallback.visible = false;
    const deck = 0.13;
    place(kit, 'dock', [-0.66, deck - 0.2, 0], 0.17, Math.PI / 2);
    place(kit, 'barrel', [-0.84, deck, -0.13], 0.07, 0.4);
    place(kit, 'crate', [-0.82, deck, 0.13], 0.075, 0.2);
    place(kit, 'bucket', [-0.6, deck, 0.13], 0.32);
    [[-0.55, -0.75, 'rocksA'], [0.85, -0.45, 'rocksB'], [0.62, 0.8, 'rocksA'], [-0.78, 0.62, 'rocksB']].forEach(([x, z, name], i) => place(kit, name, [x, 0.06, z], 0.045, i * 1.3));
    [[-0.9, -0.3], [-0.35, -0.88], [0.3, -0.9], [-0.95, 0.3]].forEach(([x, z], i) => place(kit, 'grassPlant', [x, 0.08, z], 0.07, i));
    [[0.62, 0.46], [0.7, 0.36], [-0.18, -0.42]].forEach(([x, z], i) => place(kit, 'lily', [x, WATER_Y + 0.002, z], 0.4, i * 2));
    boats.forEach((boat, i) => {
      boat.children.forEach((child) => { child.visible = false; });
      place(kit, i ? 'boatLarge' : 'boatSmall', [0, -0.03, 0], 0.11, 0, boat);
    });
    // Peces de verdad dentro de cada pez del juego (el cono queda invisible); el dorado, teñido y más grande.
    fishMeshes.forEach((m, i) => {
      m.material = hiddenMat;
      const golden = fish[i].golden;
      const model = place(kit, golden ? 'fishLarge' : 'fish', [0, 0, 0], golden ? 0.5 : 0.48, 0, m);
      if (!model) return;
      model.rotation.set(0, 0, -Math.PI / 2); // deshace el giro del cono
      if (golden) model.traverse((node) => {
        if (!node.isMesh) return;
        node.material = node.material.clone();
        node.material.userData.shared = false;
        node.material.color.set('#ffd25a');
        node.material.emissive = new THREE.Color('#8a5a00');
      });
    });
    figure = createFigure(kit, 'fisher', { scale: 0.28, position: [dockTip.x - 0.05, deck, 0.05], facing: lookToward(1, 0.15) });
    if (figure) {
      group.add(figure.group);
      if (match.phase === 'won') figure.play('emote-yes', { loop: true });
    }
  });

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
    figure?.play('interact-right');
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
    if (points) {
      sfx.play('harvest');
      onProgress(match.score / match.goal);
      rig?.shake(0.03);
      haul = caught;
      figure?.play('emote-yes', { loop: match.phase === 'won' });
    } else {
      sfx.play('miss');
      figure?.play('emote-no', { then: match.phase === 'lost' ? 'sit' : 'idle' });
    }
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
        // de vez en cuando alguno salta fuera del agua
        m.position.set(p.x, 0.07 + Math.max(0, Math.sin(elapsed * 0.8 + i * 2.3)) ** 14 * 0.09, p.z);
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
      waterMaterial.uniforms.uTime.value = elapsed;
      glints.update(elapsed);
      figure?.update(dt);
      if (netTimer > 0) {
        netTimer -= dt;
        // la red se hunde un poco y sube con lo que atrapó
        net.position.y = WATER_Y - 0.02 + Math.max(0, 0.6 - netTimer) / 0.6 * 0.14;
        haul?.forEach((i, k) => { fishMeshes[i].visible = true; fishMeshes[i].position.set(net.position.x + (k - 0.5) * 0.05, net.position.y - 0.02, net.position.z); });
        if (netTimer <= 0) { net.visible = false; haul?.forEach((i) => { fishMeshes[i].visible = false; }); haul = null; }
      }
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
      haul = null;
      figure?.reset();
      syncVisuals();
      onProgress(0);
      onMatch(match);
    },
    getState() {
      return { match, charging: Boolean(charge), reach: charge ? reachAt(charge.t, help()) : FISHING.minReach, aim: charge?.aim ?? null, from };
    },
    dispose() { disposed = true; figure?.dispose(); disposeObject(group); hiddenMat.dispose(); },
  };
}
