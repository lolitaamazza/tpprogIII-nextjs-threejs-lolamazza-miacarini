import * as THREE from 'three';
import { createBurst, createDioramaBase, createMotes, disposeObject, growIn, mat } from './common.js';
import { instanceOf, loadKit } from './assets.js';
import { createFigure, lookToward } from './figure.js';
import { HARVEST, inLight, searchlight, songOrder } from './logic.js';
import { createMatch, helpLevel, resolve, retry as retryMatch } from '../../../lib/minigame.js';
import { MOTIF } from '../../../lib/audio/music.js';

// Distrito 11, en dos partes. Primero se cosecha rozando las espigas mientras el reflector de las torres barre
// el campo: si te alumbra, se pierde lo cosechado en esa pasada y una vida de sigilo. Después los sinsajos cantan
// el silbido (una nota cada uno) y hay que repetirlo tocándolos en orden; si te equivocás, lo vuelven a cantar.
const PER_ACTION = 3;
const NOTES = MOTIF.length;
const ORDER = songOrder(MOTIF);
const NOTE_SECONDS = 0.6;
const FIELD_Z = 0.15;
const TOWERS = [[-0.78, -0.55], [0.78, -0.55]];
const CABIN_Y = 0.56;

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

export function buildDistrict11({ origin, completed, onProgress, onComplete, onMatch = () => {}, sfx, rig }) {
  const { group } = createDioramaBase(origin, '#64543a');

  // Lo hecho con código mientras cargan los modelos de Kenney (y si no cargan): el huerto y las torres.
  const fallback = new THREE.Group();
  group.add(fallback);

  // Huerto al fondo y una rama donde se posan los sinsajos
  const leaf = mat('#3f6b3a');
  for (let i = 0; i < 6; i++) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), leaf);
    bush.position.set(-0.6 + i * 0.24, 0.14, -0.78);
    fallback.add(bush);
  }
  const branch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.015, 0.015), mat('#4a3626'));
  branch.position.set(0, 0.24, -0.6);
  group.add(branch);
  for (const x of [-0.56, 0.56]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.02), mat('#4a3626'));
    post.position.set(x, 0.16, -0.6);
    group.add(post);
  }
  TOWERS.forEach(([x, z]) => fallback.add(makeTower(x, z)));

  // Sinsajos: de izquierda a derecha, de grave a agudo. Cuerpo, cabeza, pico, cola y alas que aletean; cada uno
  // con una esfera invisible más grande para tocarlo fácil.
  const birdMats = [];
  const dark = mat('#26303f');
  const birds = Array.from({ length: NOTES }, (_, i) => {
    const material = mat('#a9bdf0', { emissive: '#2a3a66' });
    birdMats.push(material);
    const bird = new THREE.Group();
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.bird = i;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), material);
    body.scale.set(1.45, 1, 1);
    const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), material);
    headBall.position.set(0.045, 0.028, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.024, 4), dark);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.075, 0.026, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.03), dark);
    tail.position.set(-0.065, 0.012, 0);
    tail.rotation.z = 0.35;
    const wings = [-1, 1].map((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.005, 0.05), dark);
      wing.geometry.translate(0, 0, side * 0.025);
      wing.position.set(-0.005, 0.018, side * 0.02);
      wing.userData.side = side;
      return wing;
    });
    bird.add(hit, body, headBall, beak, tail, ...wings);
    bird.userData.wings = wings;
    bird.position.set(-0.42 + i * 0.28, 0.285, -0.6);
    bird.rotation.y = 0.5; // un poco de frente
    bird.userData.baseY = bird.position.y;
    group.add(bird);
    return bird;
  });
  const birdHits = birds.map((bird) => bird.children[0]);

  // Campo de trigo
  const field = new THREE.Group();
  field.position.set(0, 0.08, FIELD_Z);
  group.add(field);
  const stemMat = mat('#a88b3c');
  const headMat = mat('#e8c25a', { emissive: '#3a2a00' });
  const cutMat = mat('#6b5a2a');
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const stalks = Array.from({ length: HARVEST.stalks }, (_, i) => {
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
    return { stalk, stem, head, hit, harvested: false, at: 0, x: stalk.position.x, z: stalk.position.z + FIELD_Z };
  });
  const hitBoxes = stalks.map((s) => s.hit);
  const sparkles = createBurst(group, '#ffd36b');
  // Vida: polen que flota sobre el campo.
  const pollen = createMotes(group, { count: 28, center: [0, 0.1, 0.2], spread: [1.5, 0.45, 1.1], color: '#f3e2a0', size: 0.02, rise: 0.02, sway: 0.04, opacity: 0.7, seed: 3 });

  // Con los modelos: trigo y surcos, huerto, torres de vigilancia y la cosechadora.
  let figure = null;
  let disposed = false;
  const trees = [];
  const home = new THREE.Vector3(-0.72, 0.08, 0.62);
  let walkTo = null;
  let walking = false;
  let cabinY = CABIN_Y;
  const place = (kit, name, [x, y, z], scale, rotation = 0, parent = group) => {
    const object = instanceOf(kit, name);
    if (!object) return null;
    object.position.set(x, y, z);
    object.scale.setScalar(scale);
    object.rotation.y = rotation;
    parent.add(object);
    return object;
  };
  loadKit('11').then((kit) => {
    if (!kit || disposed) return;
    fallback.visible = false;
    TOWERS.forEach(([x, z], i) => place(kit, 'tower', [x, 0.08, z], 0.12, i ? -0.6 : 0.6));
    cabinY = 0.4; // el reflector sale de la cabina de la torre de Kenney, más baja que la de palitos
    // Trigo dorado y rastrojo (los materiales son de estos dos modelos solamente).
    const tint = (name, color) => kit.models[name]?.traverse((node) => { if (node.isMesh) node.material.color.set(color); });
    tint('wheat', '#d8ae4e');
    tint('wheatCut', '#9a7f4a');
    [['oak', -0.7, 0.3], ['tree', -0.38, 0.26], ['oak', 0.0, 0.32], ['tree', 0.36, 0.27], ['oak', 0.68, 0.3]]
      .forEach(([name, x, scale], i) => { const tree = place(kit, name, [x, 0.08, -0.84 + (i % 2) * 0.05], scale, i * 1.7); if (tree) trees.push(tree); });
    [[-0.54, -0.74, 'bush'], [-0.18, -0.76, 'bushSmall'], [0.18, -0.74, 'bush'], [0.52, -0.76, 'bushSmall']].forEach(([x, z, name], i) => place(kit, name, [x, 0.08, z], 0.3, i));
    for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) place(kit, 'dirtRow', [-0.45 + k * 0.33, 0.08, FIELD_Z - 0.3 + row * 0.2], 0.33);
    [[-0.86, 0.3], [0.9, 0.22], [-0.66, 0.8], [0.6, 0.8], [0.88, -0.2]].forEach(([x, z], i) => place(kit, i % 2 ? 'grassLarge' : 'grass', [x, 0.08, z], 0.3, i));
    [[-0.45, 0.84], [0.3, 0.86], [0.8, 0.5]].forEach(([x, z], i) => place(kit, 'flower', [x, 0.08, z], 0.35, i));
    place(kit, 'rock', [0.92, 0.08, 0.02], 0.3, 1);
    // El trigo de Kenney dentro de cada espiga del juego (la caja de toque se queda).
    stalks.forEach((s, i) => {
      const full = place(kit, 'wheat', [0, 0, 0], 0.3, i * 0.9, s.stalk);
      const cut = place(kit, 'wheatCut', [0, 0, 0], 0.3, i * 0.9, s.stalk);
      if (!full || !cut) return;
      s.dressed = { full, cut };
      setCut(s, s.harvested);
    });
    figure = createFigure(kit, 'harvester', { scale: 0.28, position: home.toArray(), facing: lookToward(0.5, -0.5) });
    if (figure) {
      group.add(figure.group);
      if (match.phase === 'won') figure.play('emote-yes', { loop: true });
    }
  });

  // El reflector: un círculo de luz sobre el campo y el haz desde la torre más cercana
  const spotMat = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.32, depthWrite: false });
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 32), spotMat);
  spot.rotation.x = -Math.PI / 2;
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), beamMat);
  group.add(spot, beam);
  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();

  const GOAL = HARVEST.stalks + NOTES;
  let match = createMatch({ goal: GOAL, lives: HARVEST.lives, completed });
  let step = completed ? 'done' : 'harvest';
  let clock = 0;
  let grace = 0; // después de que te ven, los guardias tardan en volver a mirar
  let light = searchlight(0);
  let song = { at: 0, playing: false, heard: 0, next: -1 }; // la demostración de los pájaros y lo que se repitió bien
  let bounce = new Array(NOTES).fill(0);

  function setCut(s, cut) {
    s.harvested = cut;
    s.stalk.rotation.z = 0;
    if (s.dressed) {
      s.dressed.full.visible = !cut;
      s.dressed.cut.visible = cut;
      s.stem.visible = false;
      s.head.visible = false;
      return;
    }
    s.head.visible = !cut;
    s.stem.material = cut ? cutMat : stemMat;
    s.stem.scale.y = cut ? 0.35 : 1;
    s.stem.position.y = cut ? 0.04 : 0.11;
  }
  if (completed) stalks.forEach((s) => setCut(s, true));

  const report = () => onMatch({ ...match, step, stepScore: step === 'song' ? song.heard : Math.min(match.score, HARVEST.stalks), stepGoal: step === 'song' ? NOTES : HARVEST.stalks });

  function syncVisuals() {
    const harvesting = step === 'harvest' && match.phase === 'playing';
    spot.visible = harvesting;
    beam.visible = harvesting;
    birds.forEach((bird) => { bird.visible = step !== 'harvest'; });
  }
  syncVisuals();
  if (!completed) report();

  function sing(i) {
    bounce[i] = 0.35;
    sfx.play(`bird${i}`);
  }

  function startSong(delay = 0.8) {
    song = { at: clock + delay, playing: true, heard: 0, next: 0 };
  }

  function caught() {
    const recent = stalks.filter((s) => s.harvested && clock - s.at <= HARVEST.passSeconds);
    recent.forEach((s) => setCut(s, false));
    match = resolve(match, { points: -recent.length, cost: 1 });
    grace = HARVEST.graceSeconds;
    sfx.play('glitch');
    rig?.shake(0.03);
    walkTo = null;
    figure?.play('emote-no', { then: match.phase === 'lost' ? 'sit' : 'idle' });
    if (match.phase === 'lost') sfx.play('lose');
    syncVisuals();
    report();
  }

  function harvest(list) {
    if (step !== 'harvest' || match.phase !== 'playing') return;
    const fresh = list.filter((s) => !s.harvested);
    if (!fresh.length) return;
    if (grace <= 0 && fresh.some((s) => inLight(s, light))) { caught(); return; }
    fresh.forEach((s) => {
      setCut(s, true);
      s.at = clock;
      sparkles.burst(new THREE.Vector3(s.x, 0.3, s.z));
    });
    // La cosechadora va hasta la última espiga y la levanta.
    const last = fresh.at(-1);
    walkTo = new THREE.Vector3(last.x - 0.07, 0.08, last.z + 0.1);
    if (!walking && figure && figure.group.position.distanceTo(walkTo) < 0.05) figure.play('pick-up');
    sfx.play('harvest');
    match = resolve(match, { points: fresh.length });
    onProgress(match.score / match.goal);
    if (stalks.every((s) => s.harvested)) {
      step = 'song';
      syncVisuals();
      startSong();
      walkTo = new THREE.Vector3(0.1, 0.08, -0.3); // se acerca a escuchar a los sinsajos
    }
    report();
  }

  function input(i) {
    if (step !== 'song' || song.playing || match.phase !== 'playing') return;
    sing(i);
    if (i !== ORDER[song.heard]) {
      sfx.play('miss');
      match = resolve(match, { points: -song.heard });
      startSong(1);
      report();
      return;
    }
    song.heard += 1;
    match = resolve(match, { points: 1 });
    onProgress(match.score / match.goal);
    if (match.phase === 'won') {
      step = 'done';
      sfx.play('whistle');
      figure?.play('emote-yes', { loop: true });
      onComplete();
    }
    report();
  }

  const stalkUnder = (raycaster) => raycaster.intersectObjects(hitBoxes, false)[0];
  const birdUnder = (raycaster) => raycaster.intersectObjects(birdHits, false)[0];

  return {
    group,
    update(dt, elapsed) {
      clock = elapsed;
      growIn(group, dt);
      sparkles.update(dt);
      stalks.forEach((s, i) => { if (!s.harvested) s.stalk.rotation.z = Math.sin(elapsed * 1.6 + i) * 0.06; });
      trees.forEach((tree, i) => { tree.rotation.z = Math.sin(elapsed * 1.1 + i) * 0.025; }); // viento
      pollen.update(elapsed);
      if (figure) {
        figure.update(dt);
        if (walkTo) {
          const pos = figure.group.position;
          const dx = walkTo.x - pos.x;
          const dz = walkTo.z - pos.z;
          const distance = Math.hypot(dx, dz);
          if (distance > 0.02) {
            if (!walking) { walking = true; figure.play('walk', { loop: true }); }
            const stepLength = Math.min(distance, dt * 0.7);
            pos.x += (dx / distance) * stepLength;
            pos.z += (dz / distance) * stepLength;
            figure.group.rotation.y = lookToward(dx, dz);
          } else {
            walkTo = null;
            if (walking) { walking = false; figure.play(step === 'harvest' ? 'pick-up' : 'idle', { loop: step !== 'harvest' }); }
          }
        }
      }
      if (step === 'harvest' && match.phase === 'playing') {
        light = searchlight(elapsed, helpLevel(match));
        grace = Math.max(0, grace - dt);
        spot.position.set(light.x, 0.095, light.z);
        spot.scale.setScalar(light.radius);
        spotMat.color.set(grace > 0 ? '#ff5a3a' : '#fff4c8');
        beamMat.color.copy(spotMat.color);
        const [tx, tz] = TOWERS[light.x < 0 ? 0 : 1];
        const top = tmp.set(tx, cabinY, tz);
        const dir = top.clone().sub(spot.position);
        const length = dir.length();
        beam.position.copy(spot.position).addScaledVector(dir, 0.5);
        beam.quaternion.setFromUnitVectors(up, dir.normalize());
        beam.scale.set(light.radius, length, light.radius);
      }
      if (song.playing && elapsed >= song.at) {
        sing(ORDER[song.next]);
        song.next += 1;
        song.at = elapsed + NOTE_SECONDS;
        if (song.next >= NOTES) song.playing = false;
      }
      birds.forEach((bird, i) => {
        bounce[i] = Math.max(0, bounce[i] - dt);
        const hop = bounce[i] > 0 ? Math.sin((bounce[i] / 0.35) * Math.PI) * 0.06 : 0;
        const idle = step === 'done' ? Math.abs(Math.sin(elapsed * 5 + i)) * 0.04 : 0;
        bird.position.y = bird.userData.baseY + hop + idle;
        birdMats[i].emissiveIntensity = bounce[i] > 0 ? 3 : 1;
        const flap = bounce[i] > 0 || step === 'done' ? Math.sin(elapsed * 30 + i) * 0.7 : Math.sin(elapsed * 2 + i) * 0.08;
        bird.userData.wings.forEach((wing) => { wing.rotation.x = wing.userData.side * flap; });
      });
    },
    pointerDown(raycaster) {
      if (step === 'song') { const hit = birdUnder(raycaster); if (hit) input(hit.object.userData.bird); return; }
      const hit = stalkUnder(raycaster);
      if (hit) harvest([stalks[hit.object.userData.index]]);
    },
    pointerMove(raycaster) {
      if (match.phase !== 'playing') return false;
      if (step === 'song') return !song.playing && Boolean(birdUnder(raycaster));
      const hit = stalkUnder(raycaster);
      if (!hit) return false;
      harvest([stalks[hit.object.userData.index]]);
      return true;
    },
    pointerUp() {},
    // Con el botón: cosecha de a tres espigas; durante el silbido, lo hace cantar otra vez.
    performAction() {
      if (match.phase !== 'playing') return;
      if (step === 'song') { if (!song.playing) { match = resolve(match, { points: -song.heard }); startSong(0.2); report(); } return; }
      harvest(stalks.filter((s) => !s.harvested).slice(0, PER_ACTION));
    },
    input,
    retry() {
      if (match.phase !== 'lost') return;
      match = retryMatch(match);
      step = 'harvest';
      grace = 0;
      stalks.forEach((s) => setCut(s, false));
      walkTo = home.clone();
      figure?.reset();
      syncVisuals();
      onProgress(0);
      report();
    },
    getState() {
      return {
        match, step, light, grace: grace > 0, listening: step === 'song' && !song.playing, order: ORDER,
        stalks: stalks.map(({ x, z, harvested }) => ({ x, z, harvested })),
      };
    },
    dispose() { disposed = true; figure?.dispose(); disposeObject(group); },
  };
}
