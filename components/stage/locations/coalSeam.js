import * as THREE from 'three';
import { COAL, coalRound, inCrack, sweep } from '../dioramas/logic.js';
import { createMatch, resolve, retry as retryMatch, helpLevel } from '../../../lib/minigame.js';

// El frente de carbón al fondo del túnel: la jornada de Ash con las mismas reglas que el diorama.
// La luz del casco recorre la veta y hay que picar cuando pasa por la grieta; seis bloques en tres capas.
// `mode`: 'play' (hay jornada), 'idle' (otro día: el frente entero, sin partida) o 'done' (ya picado).
const GOAL = COAL.layers * COAL.hitsPerLayer;

export function createCoalSeam({ position, width, height, mode = 'idle', onMatch = () => {}, onComplete = () => {}, sfx = { play() {} } }) {
  const group = new THREE.Group();
  group.position.set(...position);
  const rowHeight = height / COAL.layers;
  const layerY = (layer) => -height / 2 + rowHeight * (layer + 0.5);

  // Roca detrás y seis bloques de carbón brillante (dos por capa).
  // La pared de roca que cierra el túnel, con la veta de carbón: bloques de bordes irregulares.
  const backing = new THREE.Mesh(new THREE.BoxGeometry(width + 2.2, height + 1.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x3a3129, roughness: 1 }));
  backing.position.set(0, 0.3, -0.32);
  const coal = new THREE.MeshStandardMaterial({ color: 0x0f0f11, roughness: 0.32, metalness: 0.2, flatShading: true });
  const blockScale = new THREE.Vector3(width / 2 - 0.06, rowHeight - 0.06, 0.28);
  const blocks = Array.from({ length: GOAL }, (_, i) => {
    const geometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 1);
    const p = geometry.attributes.position;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.92 + ((k * 7 + i) % 5) * 0.03), p.getY(k) * (0.9 + ((k * 3 + i) % 4) * 0.04), p.getZ(k));
    geometry.computeVertexNormals();
    const block = new THREE.Mesh(geometry, coal);
    block.scale.copy(blockScale);
    block.position.set((i % 2 ? 1 : -1) * width / 4, layerY(Math.floor(i / 2)), 0);
    block.rotation.set(0, 0, ((i * 37) % 7 - 3) * 0.015);
    return block;
  });
  // La grieta (una franja que brilla apenas) y la luz del casco que recorre la capa.
  const crack = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0xffc77a }));
  crack.position.z = 0.2;
  const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
  headlamp.position.z = 0.24;
  const beam = new THREE.PointLight(0xffe2b0, 5, 3, 2);
  headlamp.add(beam);
  group.add(backing, ...blocks, crack, headlamp);

  let match = null;
  let round = coalRound(0);
  let phase = 0;
  let marker = 0;
  const breaking = new Map();

  function syncVisuals() {
    const broken = mode === 'done' ? GOAL : match ? match.score : 0;
    blocks.forEach((block, i) => {
      const gone = i < broken;
      if (gone && block.visible && !breaking.has(block)) breaking.set(block, 0);
      if (!gone) { breaking.delete(block); block.visible = true; block.scale.copy(blockScale); }
    });
    const playing = match?.phase === 'playing';
    crack.visible = headlamp.visible = playing;
    if (playing) {
      crack.position.set(-width / 2 + round.center * width, layerY(round.layer), 0.2);
      crack.scale.x = round.width * width;
      headlamp.position.y = layerY(round.layer);
    }
  }

  function setMode(next) {
    mode = next;
    match = next === 'play' ? createMatch({ goal: GOAL, lives: COAL.lives }) : null;
    round = coalRound(0);
    phase = 0;
    syncVisuals();
    breaking.forEach((_, block) => { block.visible = false; });
    breaking.clear();
    if (match) onMatch(match);
  }
  setMode(mode);

  function performAction() {
    if (match?.phase !== 'playing') return false;
    if (inCrack(marker, round)) {
      match = resolve(match, { points: 1 });
      sfx.play('pick');
      if (match.phase === 'won') { sfx.play('ignite'); onComplete(match); }
      else round = coalRound(match.score, helpLevel(match));
    } else {
      match = resolve(match, { cost: 1 });
      sfx.play('miss');
      sfx.play('canary');
      if (match.phase === 'lost') sfx.play('lose');
    }
    syncVisuals();
    onMatch(match);
    return true;
  }

  return {
    group,
    update(dt) {
      if (match?.phase === 'playing') {
        phase += dt * round.speed;
        marker = sweep(phase);
        headlamp.position.x = -width / 2 + marker * width;
      }
      // Un bloque que se rompe salta un poco y se encoge hasta desaparecer.
      breaking.forEach((t, block) => {
        const next = t + dt * 3;
        block.scale.multiplyScalar(next < 0.3 ? 1.01 : 0.88);
        if (next >= 1) { block.visible = false; breaking.delete(block); } else breaking.set(block, next);
      });
    },
    performAction,
    retry() {
      if (match?.phase !== 'lost') return;
      match = retryMatch(match);
      round = coalRound(0, helpLevel(match));
      syncVisuals();
      onMatch(match);
    },
    setMode,
    getState: () => ({ match, marker, round, mode }),
    hits: (raycaster) => raycaster.intersectObject(group, true).length > 0,
    dispose() {
      group.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
      group.removeFromParent();
    },
  };
}
