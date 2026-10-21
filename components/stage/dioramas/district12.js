import * as THREE from 'three';
import { createBurst, createDioramaBase, disposeObject, growIn, makeTree, mat } from './common.js';
import { COAL, coalRound, inCrack, sweep } from './logic.js';
import { createMatch, helpLevel, resolve, retry as retryMatch } from '../../../lib/minigame.js';

// Distrito 12: una luz recorre la veta y hay que picar cuando pasa por la grieta. Cada acierto rompe un bloque;
// cada error agita al canario de la jaula. Tres capas hasta la brasa; tres errores y el canario se calla.
const WALL = { x: 0.15, z: 0.3, length: 1, layerHeight: 0.1, depth: 0.2, base: 0.08 };
const GOAL = COAL.layers * COAL.hitsPerLayer;

export function buildDistrict12({ origin, completed, onProgress, onComplete, onMatch = () => {}, sfx, rig }) {
  const { group } = createDioramaBase(origin, '#4d4339');

  // Cerro con boca de mina
  const hill = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.75, 6), mat('#66584a'));
  hill.position.set(-0.3, 0.45, -0.35);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.06), mat('#0c0a09'));
  mouth.position.set(-0.3, 0.21, 0.02);
  group.add(hill, mouth);
  const beam = mat('#6b4a2b');
  for (const x of [-0.17, 0.17]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), beam);
    post.position.set(-0.3 + x, 0.23, 0.06);
    group.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.05), beam);
  lintel.position.set(-0.3, 0.39, 0.06);
  group.add(lintel);

  // Alambrado y el bosque detrás (la Pradera)
  const metal = mat('#8a8a8a', { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 9; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), metal);
    post.position.set(-0.8 + i * 0.2, 0.19, -0.83);
    group.add(post);
  }
  const wire = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.006, 0.006), metal);
  wire.position.set(0, 0.25, -0.83);
  group.add(wire);
  for (let i = 0; i < 7; i++) {
    const tree = makeTree();
    tree.position.set(-0.75 + i * 0.25, 0.08, -0.98 + (i % 2) * 0.06);
    tree.scale.setScalar(0.8 + (i % 3) * 0.15);
    group.add(tree);
  }

  // La veta: capas de bloques de carbón (la de arriba se rompe primero) y la brasa debajo.
  const coal = ['#1d1b19', '#141414', '#0e0e0e'].map((color) => mat(color, { metalness: 0.45, roughness: 0.45 })); // una por capa
  const blockLength = WALL.length / COAL.hitsPerLayer;
  const layerY = (layer) => WALL.base + WALL.layerHeight * (COAL.layers - layer - 0.5);
  const blocks = [];
  for (let layer = 0; layer < COAL.layers; layer++) {
    for (let k = 0; k < COAL.hitsPerLayer; k++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(blockLength * 0.97, WALL.layerHeight * 0.94, WALL.depth * (0.92 + ((layer + k) % 2) * 0.08)), coal[layer]);
      block.position.set(WALL.x - WALL.length / 2 + blockLength * (k + 0.5), layerY(layer), WALL.z);
      block.rotation.y = ((layer * 3 + k) % 3 - 1) * 0.03;
      group.add(block);
      blocks.push(block);
    }
  }
  const ember = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.07, 1),
    new THREE.MeshStandardMaterial({ color: '#ff7a2f', emissive: '#ff4d00', emissiveIntensity: 2.2 }),
  );
  ember.position.set(WALL.x, WALL.base + 0.07, WALL.z);
  const emberLight = new THREE.PointLight('#ff6a1a', 0, 1.6);
  emberLight.position.set(WALL.x, 0.3, WALL.z);
  group.add(ember, emberLight);

  // La grieta (donde hay que picar) y la luz que recorre la capa.
  const front = WALL.z + WALL.depth / 2 + 0.006;
  const crackMat = new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, opacity: 0.5, depthWrite: false });
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(1, WALL.layerHeight * 0.95), crackMat);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
  const glow = new THREE.PointLight('#ffd9a0', 0.8, 0.7);
  light.add(glow);
  group.add(crack, light);

  // El canario en su jaula, al lado de la mina.
  const cage = new THREE.Group();
  cage.position.set(-0.72, 0.08, 0.32);
  const cageBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 12), metal);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b8b8b8', { wireframe: true }));
  dome.position.y = 0.1;
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10, 1, true), mat('#b8b8b8', { wireframe: true }));
  bars.position.y = 0.05;
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#ffd23a', { emissive: '#4a3a00' }));
  body.scale.set(1.2, 1, 1);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 4), mat('#e8862a'));
  beak.rotation.z = -Math.PI / 2;
  beak.position.x = 0.04;
  bird.add(body, beak);
  bird.position.y = 0.045;
  cage.add(cageBase, dome, bars, bird);
  group.add(cage);

  const dust = createBurst(group, '#8c8c8c');
  const sparks = createBurst(group, '#ffb066', 30);

  let match = createMatch({ goal: GOAL, lives: COAL.lives, completed });
  let round = coalRound(match.score, helpLevel(match));
  let phase = 0; // avance de la luz por la veta (se acumula para que cambiar la velocidad no la haga saltar)
  let marker = 0;
  let flutter = 0; // el canario se agita después de un error

  function syncVisuals() {
    blocks.forEach((block, i) => { block.visible = i >= match.score; });
    ember.visible = match.phase === 'won';
    const playing = match.phase === 'playing';
    crack.visible = playing;
    light.visible = playing;
    if (playing) {
      const y = layerY(round.layer);
      crack.position.set(WALL.x - WALL.length / 2 + round.center * WALL.length, y, front);
      crack.scale.x = round.width * WALL.length;
      light.position.y = y;
      light.position.z = front + 0.02;
    }
    const silent = match.phase === 'lost';
    bird.rotation.z = silent ? Math.PI / 2 : 0;
    bird.position.y = silent ? 0.03 : 0.045;
  }
  syncVisuals();
  if (!completed) onMatch(match);

  const lightPoint = () => new THREE.Vector3(light.position.x, light.position.y, light.position.z);

  function swing() {
    if (match.phase !== 'playing') return;
    if (inCrack(marker, round)) {
      match = resolve(match, { points: 1 });
      sfx.play('pick');
      rig.shake(0.06);
      sparks.burst(lightPoint());
      dust.burst(lightPoint());
      onProgress(match.score / match.goal);
      if (match.phase === 'won') { sfx.play('ignite'); onComplete(); }
      else round = coalRound(match.score, helpLevel(match));
    } else {
      match = resolve(match, { cost: 1 });
      sfx.play('miss');
      sfx.play('canary');
      rig.shake(0.025);
      dust.burst(lightPoint());
      flutter = 0.6;
      if (match.phase === 'lost') sfx.play('lose');
    }
    syncVisuals();
    onMatch(match);
  }

  const overDiorama = (raycaster) => raycaster.intersectObject(group, true).length > 0;

  return {
    group,
    update(dt, elapsed) {
      growIn(group, dt);
      dust.update(dt);
      sparks.update(dt);
      if (match.phase === 'playing') {
        phase += dt * round.speed;
        marker = sweep(phase);
        light.position.x = WALL.x - WALL.length / 2 + marker * WALL.length;
        const ready = inCrack(marker, round);
        crackMat.opacity = ready ? 0.95 : 0.45 + Math.sin(elapsed * 4) * 0.08;
        glow.intensity = ready ? 1.4 : 0.8;
      }
      if (flutter > 0) {
        flutter = Math.max(0, flutter - dt);
        bird.position.y = 0.045 + Math.abs(Math.sin(flutter * 30)) * 0.03;
        bird.rotation.y = Math.sin(flutter * 40) * 0.6;
        if (flutter === 0) syncVisuals();
      } else if (match.phase !== 'lost') {
        bird.rotation.y = Math.sin(elapsed * 1.3) * 0.4; // mira a un lado y al otro
      }
      emberLight.intensity = match.phase === 'won' ? 1.4 + Math.sin(elapsed * 6) * 0.4 : 0;
      ember.scale.setScalar(match.phase === 'won' ? 1 + Math.sin(elapsed * 6) * 0.08 : 1);
    },
    // Un clic en cualquier parte del diorama es un golpe de pico: lo que importa es cuándo, no dónde.
    pointerDown(raycaster) { if (overDiorama(raycaster)) swing(); },
    pointerMove(raycaster) { return match.phase === 'playing' && overDiorama(raycaster); },
    pointerUp() {},
    performAction: swing,
    retry() {
      if (match.phase !== 'lost') return;
      match = retryMatch(match);
      round = coalRound(0, helpLevel(match));
      phase = 0;
      syncVisuals();
      onProgress(0);
      onMatch(match);
    },
    getState() { return { match, marker, round }; },
    dispose() { disposeObject(group); },
  };
}
