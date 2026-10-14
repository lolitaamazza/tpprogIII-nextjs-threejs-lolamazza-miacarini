import * as THREE from 'three';
import { createBurst, createDioramaBase, disposeObject, growIn, makeTree, mat } from './common.js';
import { createTally, tally } from './logic.js';

const HITS = 8;

export function buildDistrict12({ origin, completed, onProgress, onComplete, sfx, rig }) {
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

  // Veta de carbón (el objetivo)
  const seam = new THREE.Group();
  seam.position.set(0.38, 0.12, 0.28);
  group.add(seam);
  const coal = mat('#141414', { metalness: 0.45, roughness: 0.45 });
  const rocks = Array.from({ length: HITS - 1 }, (_, i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075 + (i % 3) * 0.02, 0), coal);
    const angle = (i / (HITS - 1)) * Math.PI * 2;
    rock.position.set(Math.cos(angle) * 0.1, 0.03 + (i % 2) * 0.07, Math.sin(angle) * 0.08);
    seam.add(rock);
    return rock;
  });
  const ember = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.06, 1),
    new THREE.MeshStandardMaterial({ color: '#ff7a2f', emissive: '#ff4d00', emissiveIntensity: 2.2 }),
  );
  ember.position.y = 0.06;
  seam.add(ember);
  const emberLight = new THREE.PointLight('#ff6a1a', 0, 1.6);
  emberLight.position.y = 0.2;
  seam.add(emberLight);
  const dust = createBurst(group, '#8c8c8c');

  let state = createTally(HITS, completed);
  function syncVisuals() {
    rocks.forEach((rock, i) => { rock.visible = i >= state.count; });
    ember.visible = state.done;
  }
  syncVisuals();

  function hit() {
    if (state.done) return;
    const result = tally(state, 1);
    state = result.state;
    sfx.play('pick');
    rig.shake(0.05);
    dust.burst(new THREE.Vector3(seam.position.x, 0.2, seam.position.z));
    syncVisuals();
    onProgress(state.count / state.total);
    if (result.justCompleted) { sfx.play('ignite'); onComplete(); }
  }
  const overSeam = (raycaster) => raycaster.intersectObject(seam, true).length > 0;

  return {
    group,
    update(dt, elapsed) {
      growIn(group, dt);
      dust.update(dt);
      emberLight.intensity = state.done ? 1.4 + Math.sin(elapsed * 6) * 0.4 : 0;
      ember.scale.setScalar(state.done ? 1 + Math.sin(elapsed * 6) * 0.08 : 1);
    },
    pointerDown(raycaster) { if (overSeam(raycaster)) hit(); },
    pointerMove(raycaster) { return !state.done && overSeam(raycaster); },
    pointerUp() {},
    performAction: hit,
    dispose() { disposeObject(group); },
  };
}
