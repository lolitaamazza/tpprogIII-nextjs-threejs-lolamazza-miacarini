import * as THREE from 'three';
import { HARVEST, inLight, searchlight, songOrder } from '../dioramas/logic.js';
import { createMatch, helpLevel, resolve, retry as retryMatch } from '../../../lib/minigame.js';
import { MOTIF } from '../../../lib/audio/music.js';

// La jornada de Oliva en la escena del 11, con las mismas reglas que el diorama: se cosecha rozando las espigas
// mientras el reflector de la torre barre el campo (si te alumbra, se pierde lo de esa pasada y una vida); después
// los sinsajos cantan el silbido y hay que repetirlo tocándolos en orden.
// `def`: { center (el centro del campo en metros), scale (metros por unidad del diorama), tower (de dónde sale la luz), birds (el primer sinsajo) }.
const PER_ACTION = 3;
const NOTES = MOTIF.length;
const ORDER = songOrder(MOTIF);
const NOTE_SECONDS = 0.6;
const FIELD_Z = 0.15;
const BIRD_GAP = 0.8;
const BIRD_SIZE = 1.8; // un poco más grandes que de verdad, para verlos desde el camino

export function createHarvestField(def, { mode = 'idle', onMatch = () => {}, onComplete = () => {}, sfx = { play() {} }, halo = null } = {}) {
  const { center, scale: S, tower, birds: birdsAt } = def;
  const group = new THREE.Group();
  const toWorld = (x, z, y = center[1]) => new THREE.Vector3(center[0] + x * S, y, center[2] + z * S);

  // Las espigas: manojos de tallos finos con su espiga dorada (dos InstancedMesh para todo el campo);
  // cosechadas quedan como rastrojo corto. Cada manojo tiene una caja invisible grande para rozarlo fácil.
  const BLADES = 40;
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const stemGeo = new THREE.CylinderGeometry(0.005, 0.009, 1, 3).translate(0, 0.5, 0);
  const headGeo = new THREE.CapsuleGeometry(0.011, 0.12, 2, 5).translate(0, 0.07, 0);
  const stemsMesh = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), HARVEST.stalks * BLADES);
  const headsMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), HARVEST.stalks * BLADES);
  stemsMesh.castShadow = headsMesh.castShadow = true;
  group.add(stemsMesh, headsMesh);
  const STEM = new THREE.Color(0xb39a55), HEAD = new THREE.Color(0xe6c46a), STUBBLE = new THREE.Color(0x6b5a2a);
  const tint = new THREE.Color();
  const stalks = Array.from({ length: HARVEST.stalks }, (_, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    const x = -0.55 + col * 0.22 + (row % 2) * 0.06, z = -0.3 + row * 0.2 + FIELD_Z;
    const base = toWorld(x, z);
    const blades = Array.from({ length: BLADES }, (_, k) => {
      const a = k * 2.39996 + i * 0.7, r = 0.72 * Math.sqrt((k + 0.5) / BLADES);
      const shade = 0.88 + ((k * 13 + i * 7) % 10) * 0.025;
      stemsMesh.setColorAt(i * BLADES + k, tint.copy(STEM).multiplyScalar(shade));
      headsMesh.setColorAt(i * BLADES + k, tint.copy(HEAD).multiplyScalar(shade));
      return { shade, ox: Math.cos(a) * r, oz: Math.sin(a) * r, h: 0.7 + ((k * 7 + i) % 6) * 0.045, tx: Math.sin(a) * 0.14, tz: Math.cos(a) * 0.14, seed: k * 0.37 };
    });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), hitMat);
    hit.position.set(base.x, base.y + 0.6, base.z);
    hit.userData.index = i;
    group.add(hit);
    return { i, base, blades, hit, x, z, harvested: false, at: 0 };
  });
  const hitBoxes = stalks.map((s) => s.hit);
  const dummy = new THREE.Object3D();
  const tipOffset = new THREE.Vector3();

  // Ubica los tallos y espigas de un manojo (con el viento `sway`); cosechado, solo el rastrojo.
  function pose(s, sway = 0) {
    s.blades.forEach((b, k) => {
      const n = s.i * BLADES + k;
      const h = s.harvested ? 0.15 : b.h;
      dummy.position.set(s.base.x + b.ox, s.base.y, s.base.z + b.oz);
      dummy.rotation.set(b.tx, 0, b.tz + sway * (1 + b.seed));
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      stemsMesh.setMatrixAt(n, dummy.matrix);
      tipOffset.set(0, h, 0).applyEuler(dummy.rotation);
      dummy.position.add(tipOffset);
      dummy.scale.setScalar(s.harvested ? 0 : 1);
      dummy.updateMatrix();
      headsMesh.setMatrixAt(n, dummy.matrix);
    });
    stemsMesh.instanceMatrix.needsUpdate = headsMesh.instanceMatrix.needsUpdate = true;
  }

  function setCut(s, cut) {
    s.harvested = cut;
    s.blades.forEach((b, k) => stemsMesh.setColorAt(s.i * BLADES + k, tint.copy(cut ? STUBBLE : STEM).multiplyScalar(b.shade)));
    stemsMesh.instanceColor.needsUpdate = true;
    pose(s);
  }

  // El reflector de la torre: luz que barre el campo, un círculo tenue en el piso y el haz (rojo cuando te vio).
  const lamp = new THREE.SpotLight(0xfff1cf, 0, 0, 0.2, 0.35, 0);
  lamp.position.set(...tower);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending });
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 40), spotMat);
  spot.rotation.x = -Math.PI / 2;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.022, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), beamMat);
  const source = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xfff1cf, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  source.position.set(...tower);
  source.scale.setScalar(0.7);
  group.add(lamp, lamp.target, spot, beam, source);

  // Los sinsajos en el alambre, de grave a agudo: cuerpo, cabeza, pico, cola y alas; una esfera invisible para tocarlos.
  const dark = new THREE.MeshStandardMaterial({ color: 0x26303f, roughness: 0.7 });
  const birdMats = [];
  const birds = Array.from({ length: NOTES }, (_, i) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x4a5468, roughness: 0.6, emissive: 0x6c8ccc, emissiveIntensity: 0.15 });
    birdMats.push(material);
    const bird = new THREE.Group();
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), hitMat);
    hit.userData.bird = i;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), material);
    body.scale.set(1.5, 1, 1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), material);
    head.position.set(0.075, 0.045, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 4), dark);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.125, 0.043, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.05), dark);
    tail.position.set(-0.11, 0.02, 0);
    tail.rotation.z = 0.35;
    const wings = [-1, 1].map((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.08), dark);
      wing.geometry.translate(0, 0, side * 0.04);
      wing.position.set(-0.01, 0.03, side * 0.035);
      wing.userData.side = side;
      return wing;
    });
    bird.add(hit, body, head, beak, tail, ...wings);
    bird.userData.wings = wings;
    bird.position.set(birdsAt[0] + i * BIRD_GAP, birdsAt[1], birdsAt[2]);
    bird.scale.setScalar(BIRD_SIZE);
    bird.rotation.y = -Math.PI / 2 + 0.5;
    bird.userData.baseY = bird.position.y;
    group.add(bird);
    return bird;
  });
  const birdHits = birds.map((b) => b.children[0]);

  let match = null;
  let step = 'harvest';
  let clock = 0;
  let grace = 0;
  let light = searchlight(0);
  let song = { at: 0, playing: false, heard: 0, next: -1 };
  const bounce = new Array(NOTES).fill(0);

  const report = () => match && onMatch({ ...match, step, stepScore: step === 'song' ? song.heard : Math.min(match.score, HARVEST.stalks), stepGoal: step === 'song' ? NOTES : HARVEST.stalks });

  function syncVisuals() {
    const harvesting = step === 'harvest' && match?.phase === 'playing';
    spot.visible = beam.visible = source.visible = harvesting;
    lamp.intensity = harvesting ? 90 : 0;
    birds.forEach((b) => { b.visible = step === 'song' || step === 'done'; });
  }

  function setMode(next) {
    mode = next;
    match = next === 'play' ? createMatch({ goal: HARVEST.stalks + NOTES, lives: HARVEST.lives }) : null;
    step = next === 'done' ? 'done' : 'harvest';
    grace = 0;
    song = { at: 0, playing: false, heard: 0, next: -1 };
    stalks.forEach((s) => setCut(s, next === 'done'));
    syncVisuals();
    report();
  }
  setMode(mode);

  function sing(i) { bounce[i] = 0.35; sfx.play(`bird${i}`); }
  function startSong(delay = 0.8) { song = { at: clock + delay, playing: true, heard: 0, next: 0 }; }

  function caught() {
    const recent = stalks.filter((s) => s.harvested && clock - s.at <= HARVEST.passSeconds);
    recent.forEach((s) => setCut(s, false));
    match = resolve(match, { points: -recent.length, cost: 1 });
    grace = HARVEST.graceSeconds;
    sfx.play('glitch');
    if (match.phase === 'lost') sfx.play('lose');
    syncVisuals();
    report();
  }

  function harvest(list) {
    if (step !== 'harvest' || match?.phase !== 'playing') return false;
    const fresh = list.filter((s) => !s.harvested);
    if (!fresh.length) return false;
    if (grace <= 0 && fresh.some((s) => inLight(s, light))) { caught(); return true; }
    fresh.forEach((s) => { setCut(s, true); s.at = clock; });
    sfx.play('harvest');
    match = resolve(match, { points: fresh.length });
    if (stalks.every((s) => s.harvested)) { step = 'song'; syncVisuals(); startSong(); }
    report();
    return true;
  }

  function input(i) {
    if (step !== 'song' || song.playing || match?.phase !== 'playing') return;
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
    if (match.phase === 'won') { step = 'done'; sfx.play('whistle'); onComplete(match); }
    report();
  }

  const stalkUnder = (r) => r.intersectObjects(hitBoxes, false)[0];
  const birdUnder = (r) => r.intersectObjects(birdHits, false)[0];
  const up = new THREE.Vector3(0, 1, 0);
  const top = new THREE.Vector3(...tower);
  const dir = new THREE.Vector3();

  return {
    group,
    update(dt, t) {
      clock = t;
      stalks.forEach((s, i) => { if (!s.harvested) pose(s, Math.sin(t * 1.4 + i) * 0.04); }); // viento
      if (step === 'harvest' && match?.phase === 'playing') {
        light = searchlight(t, helpLevel(match));
        grace = Math.max(0, grace - dt);
        const p = toWorld(light.x, light.z, center[1] + 0.03);
        const radius = light.radius * S;
        spot.position.copy(p);
        spot.scale.setScalar(radius);
        spotMat.color.set(grace > 0 ? 0xff5a3a : 0xfff4c8);
        beamMat.color.copy(spotMat.color);
        lamp.color.copy(spotMat.color);
        lamp.target.position.copy(p);
        dir.copy(top).sub(p);
        const length = dir.length();
        lamp.angle = Math.atan(radius / length) * 1.2;
        beam.position.copy(p).addScaledVector(dir, 0.5);
        beam.quaternion.setFromUnitVectors(up, dir.normalize());
        beam.scale.set(radius, length, radius);
      }
      if (song.playing && t >= song.at) {
        sing(ORDER[song.next]);
        song.next += 1;
        song.at = t + NOTE_SECONDS;
        if (song.next >= NOTES) song.playing = false;
      }
      birds.forEach((bird, i) => {
        bounce[i] = Math.max(0, bounce[i] - dt);
        const hop = bounce[i] > 0 ? Math.sin((bounce[i] / 0.35) * Math.PI) * 0.2 : 0;
        bird.position.y = bird.userData.baseY + hop;
        birdMats[i].emissiveIntensity = bounce[i] > 0 ? 1.4 : 0.15; // se ilumina el que canta
        const flap = bounce[i] > 0 || step === 'done' ? Math.sin(t * 30 + i) * 0.7 : Math.sin(t * 2 + i) * 0.08;
        bird.userData.wings.forEach((w) => { w.rotation.x = w.userData.side * flap; });
      });
    },
    // Con el botón cosecha de a tres; durante el silbido, lo hace cantar otra vez.
    performAction() {
      if (match?.phase !== 'playing') return false;
      if (step === 'song') { if (!song.playing) { match = resolve(match, { points: -song.heard }); startSong(0.2); report(); } return true; }
      return harvest(stalks.filter((s) => !s.harvested).slice(0, PER_ACTION));
    },
    touchStalk: (i) => harvest([stalks[i]]),
    input,
    retry() {
      if (match?.phase !== 'lost') return;
      match = retryMatch(match);
      step = 'harvest';
      grace = 0;
      stalks.forEach((s) => setCut(s, false));
      syncVisuals();
      report();
    },
    setMode,
    pointerDown(r) {
      if (match?.phase !== 'playing') return false;
      if (step === 'song') { const hit = birdUnder(r); if (hit) input(hit.object.userData.bird); return Boolean(hit); }
      const hit = stalkUnder(r);
      if (hit) harvest([stalks[hit.object.userData.index]]);
      return Boolean(hit);
    },
    pointerMove(r) {
      if (match?.phase !== 'playing') return false;
      if (step === 'song') return !song.playing && Boolean(birdUnder(r));
      const hit = stalkUnder(r);
      if (hit) harvest([stalks[hit.object.userData.index]]);
      return Boolean(hit);
    },
    pointerUp() {},
    getState: () => ({
      match, step, light, grace: grace > 0, listening: step === 'song' && !song.playing, order: ORDER,
      stalks: stalks.map(({ x, z, harvested }) => ({ x, z, harvested })),
    }),
    dispose() {
      group.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
      group.removeFromParent();
    },
  };
}
