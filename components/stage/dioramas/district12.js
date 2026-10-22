import * as THREE from 'three';
import { createBurst, createDioramaBase, createMotes, disposeObject, growIn, makeTree, mat } from './common.js';
import { instanceOf, loadKit } from './assets.js';
import { createFigure, lookToward } from './figure.js';
import { COAL, coalRound, inCrack, sweep } from './logic.js';
import { createMatch, helpLevel, resolve, retry as retryMatch } from '../../../lib/minigame.js';

// Distrito 12: una luz recorre la veta y hay que picar cuando pasa por la grieta. Cada acierto rompe un bloque;
// cada error agita al canario de la jaula. Tres capas hasta la brasa; tres errores y el canario se calla.
const WALL = { x: 0.15, z: 0.3, length: 1, layerHeight: 0.1, depth: 0.2, base: 0.08 };
const GOAL = COAL.layers * COAL.hitsPerLayer;

export function buildDistrict12({ origin, completed, onProgress, onComplete, onMatch = () => {}, sfx, rig }) {
  const { group } = createDioramaBase(origin, '#4d4339');

  // Lo hecho con código mientras cargan los modelos de Kenney (y si no cargan): el cerro, el alambrado y los pinos.
  const fallback = new THREE.Group();
  group.add(fallback);

  // Cerro con boca de mina
  const hill = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.75, 6), mat('#66584a'));
  hill.position.set(-0.3, 0.45, -0.35);
  fallback.add(hill);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.06), mat('#0c0a09'));
  mouth.position.set(-0.3, 0.21, 0.02);
  group.add(mouth);
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
    fallback.add(post);
  }
  const wire = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.006, 0.006), metal);
  wire.position.set(0, 0.25, -0.83);
  fallback.add(wire);
  for (let i = 0; i < 7; i++) {
    const tree = makeTree();
    tree.position.set(-0.75 + i * 0.25, 0.08, -0.98 + (i % 2) * 0.06);
    tree.scale.setScalar(0.8 + (i % 3) * 0.15);
    fallback.add(tree);
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
  cage.position.set(-0.74, 0.08, 0.06);
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
  // Vida: polvo de carbón en el aire, humo que sale de la mina y alguna brasa que sube de la veta.
  const air = createMotes(group, { count: 40, center: [0, 0.1, 0], spread: [1.8, 0.7, 1.6], color: '#cbb9a6', size: 0.018, rise: 0.012, opacity: 0.45 });
  const smoke = createMotes(group, { count: 14, center: [-0.3, 0.38, 0.0], spread: [0.18, 0.55, 0.1], color: '#8f8a86', size: 0.16, rise: 0.06, sway: 0.05, opacity: 0.18, seed: 21 });
  const embers = createMotes(group, { count: 10, center: [WALL.x, WALL.base, WALL.z], spread: [WALL.length, 0.5, WALL.depth], color: '#ff9a4a', size: 0.025, rise: 0.05, opacity: 0.8, seed: 5 });

  // Con los modelos: cerro de roca, pinos detrás del alambrado, utilería y el minero con su pico.
  let figure = null;
  let disposed = false;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const coalRock = new THREE.MeshStandardMaterial({ color: '#1c1b1a', roughness: 0.32, metalness: 0.55, flatShading: true });
  const place = (kit, name, [x, y, z], scale, rotation = 0, parent = group) => {
    const object = instanceOf(kit, name);
    if (!object) return null;
    object.position.set(x, y, z);
    object.scale.setScalar(scale);
    object.rotation.y = rotation;
    parent.add(object);
    return object;
  };
  loadKit('12').then((kit) => {
    if (!kit || disposed) return;
    fallback.visible = false;
    const top = 0.08;
    // El cerro: rocas grandes apiladas alrededor de la boca de la mina.
    [['rockTallA', -0.62, -0.32, 0.42, 0.3], ['rockTallA', 0.0, -0.36, 0.4, -0.4], ['rockLargeD', -0.3, -0.58, 0.6, 0], ['rockTallB', -0.48, -0.62, 0.42, 1.2],
      ['rockTallC', -0.12, -0.66, 0.5, 2], ['rockLargeB', 0.24, -0.5, 0.5, 0.7], ['rockLargeC', -0.82, -0.48, 0.45, 2.4], ['rockLargeE', -0.3, -0.36, 0.42, 0.2]]
      .forEach(([name, x, z, s, r]) => place(kit, name, [x, top, z], s, r));
    place(kit, 'rockTallC', [-0.3, top + 0.26, -0.5], 0.42, 1);
    for (let i = 0; i < 8; i++) place(kit, 'fence', [-0.7 + i * 0.2, top, -0.86], 0.2);
    [['pineA', -0.78, 0.26], ['pineB', -0.52, 0.3], ['pineRound', -0.24, 0.24], ['pineA', 0.06, 0.32], ['pineB', 0.32, 0.27], ['pineA', 0.56, 0.3], ['pineRound', 0.78, 0.26]]
      .forEach(([name, x, s], i) => place(kit, name, [x, top, -0.97 + (i % 2) * 0.05], s, i));
    place(kit, 'barrel', [0.72, top, -0.12], 0.45, 0.3);
    place(kit, 'box', [0.78, top, 0.06], 0.45, 0.5);
    place(kit, 'boxLarge', [-0.8, top, -0.2], 0.4, 0.2);
    place(kit, 'bucket', [0.66, top, 0.1], 0.4);
    place(kit, 'logs', [0.62, top, -0.5], 0.35, 1.2);
    place(kit, 'stump', [0.86, top, -0.42], 0.3);
    [['rockA', -0.6, 0.62, 0.16], ['rockB', 0.74, 0.48, 0.14], ['rockC', 0.5, 0.64, 0.12]].forEach(([name, x, z, s], i) => place(kit, name, [x, top, z], s, i));
    // Los bloques de carbón pasan a ser rocas facetadas (la caja de cada bloque se queda para el juego).
    blocks.forEach((block, i) => {
      const rock = instanceOf(kit, ['rockA', 'rockB', 'rockC'][i % 3]);
      if (!rock) return;
      rock.traverse((node) => { if (node.isMesh) node.material = coalRock; });
      const { x, y, z } = block.geometry.parameters ? { x: block.geometry.parameters.width, y: block.geometry.parameters.height, z: block.geometry.parameters.depth } : { x: 0.5, y: 0.1, z: 0.2 };
      rock.scale.set(x / 0.56 * 1.05, y / 0.39 * 1.1, z / 0.62 * 1.05);
      rock.position.y = -y / 2;
      block.add(rock);
      block.material = hidden;
    });
    // El minero, frente a la veta, con el pico en la mano derecha.
    figure = createFigure(kit, 'miner', { scale: 0.3, position: [WALL.x - WALL.length / 2 - 0.08, top, WALL.z + 0.26], facing: lookToward(0.3, -0.26) });
    if (figure) {
      figure.attach('arm-right', instanceOf(kit, 'pickaxe'), { position: [0, -0.2, 0.02], rotation: [Math.PI / 2, 0, 0], scale: 1.6 }); // exagerado, de juguete
      group.add(figure.group);
      if (match.phase === 'won') figure.play('emote-yes', { loop: true });
    }
  });

  // Un bloque que se rompe salta, se agranda un poco y se encoge hasta desaparecer.
  const breaking = new Map();

  let match = createMatch({ goal: GOAL, lives: COAL.lives, completed });
  let round = coalRound(match.score, helpLevel(match));
  let phase = 0; // avance de la luz por la veta (se acumula para que cambiar la velocidad no la haga saltar)
  let marker = 0;
  let flutter = 0; // el canario se agita después de un error

  function syncVisuals() {
    blocks.forEach((block, i) => {
      const gone = i < match.score;
      if (gone && block.visible && !breaking.has(block)) breaking.set(block, 0);
      if (!gone) { breaking.delete(block); block.visible = true; block.scale.setScalar(1); }
    });
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
  breaking.forEach((_, block) => { block.visible = false; }); // ya encendido: sin animación de rotura al entrar
  breaking.clear();
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
      figure?.play('attack-melee-right', { then: match.phase === 'won' ? 'emote-yes' : 'idle' });
      if (match.phase === 'won') { sfx.play('ignite'); onComplete(); }
      else round = coalRound(match.score, helpLevel(match));
    } else {
      match = resolve(match, { cost: 1 });
      sfx.play('miss');
      sfx.play('canary');
      rig.shake(0.025);
      dust.burst(lightPoint());
      flutter = 0.6;
      figure?.play('attack-melee-right', { then: match.phase === 'lost' ? 'sit' : 'emote-no' });
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
      air.update(elapsed);
      smoke.update(elapsed);
      embers.update(elapsed);
      figure?.update(dt);
      breaking.forEach((t, block) => {
        const next = t + dt;
        const grow = next < 0.1 ? 1 + next * 2.5 : Math.max(0, 1.25 - (next - 0.1) * 4.2);
        block.scale.setScalar(grow);
        if (grow === 0) { block.visible = false; block.scale.setScalar(1); breaking.delete(block); } else breaking.set(block, next);
      });
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
      figure?.reset();
      syncVisuals();
      onProgress(0);
      onMatch(match);
    },
    getState() { return { match, marker, round }; },
    dispose() { disposed = true; figure?.dispose(); disposeObject(group); hidden.dispose(); coalRock.dispose(); },
  };
}
