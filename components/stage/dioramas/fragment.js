import * as THREE from 'three';
import { mat } from './common.js';

const PAPER = '#efe6cf', INK = '#7b0001', WOOD = '#6b4a2e', DARK = '#2b2b2e', TIN = '#9aa0a3', CLOTH = '#3c4f6b', STONE = '#b9b4a6';
const GOLD = new THREE.Color('#d4af37');

// El objeto de cada fragmento: chico, apoyado en el suelo de la maqueta.
function prop(fragment) {
  const g = new THREE.Group();
  const add = (geometry, color, [x, y, z], [rx, ry, rz] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, mat(color));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    g.add(mesh);
    return mesh;
  };
  if (fragment.id === '12-viga') {
    add(new THREE.BoxGeometry(0.26, 0.035, 0.05), WOOD, [0, 0.03, 0], [0, 0.5, 0.16]);
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.035, 0.003, 0.006), '#1c140d', [-0.07 + i * 0.045, 0.05 + i * 0.006, 0.01 - i * 0.022], [0, 0.5, 0.16]);
  } else if (fragment.id === '4-cuenco') {
    add(new THREE.CylinderGeometry(0.055, 0.032, 0.035, 18, 1, true), TIN, [0, 0.018, 0]).material.side = THREE.DoubleSide;
    add(new THREE.CircleGeometry(0.032, 18), TIN, [0, 0.002, 0], [-Math.PI / 2, 0, 0]);
  } else if (fragment.id === '2-placa') {
    add(new THREE.BoxGeometry(0.12, 0.06, 0.02), STONE, [0, 0.03, 0], [-0.25, 0.3, 0]);
  } else if (fragment.id === '7-tronco') {
    add(new THREE.CylinderGeometry(0.06, 0.065, 0.035, 16), WOOD, [0, 0.018, 0]);
    add(new THREE.RingGeometry(0.02, 0.026, 16), '#c9a874', [0, 0.037, 0], [-Math.PI / 2, 0, 0]);
    add(new THREE.RingGeometry(0.038, 0.044, 16), '#c9a874', [0, 0.037, 0], [-Math.PI / 2, 0, 0]);
  } else if (fragment.id === '8-forro') {
    add(new THREE.BoxGeometry(0.11, 0.022, 0.08), CLOTH, [0, 0.011, 0], [0, 0.4, 0]);
    add(new THREE.BoxGeometry(0.018, 0.004, 0.018), '#d4af37', [0.02, 0.024, 0.01], [0, 0.4, 0]);
  } else if (fragment.kind === 'recording') {
    add(new THREE.BoxGeometry(0.1, 0.022, 0.065), DARK, [0, 0.011, 0], [0, -0.3, 0]);
    for (const x of [-0.022, 0.022]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 12), PAPER, [x, 0.024, 0], [0, -0.3, 0]);
  } else {
    // Un papel del Capitolio con su franja roja.
    add(new THREE.BoxGeometry(0.11, 0.004, 0.08), PAPER, [0, 0.003, 0], [0, 0.35, 0]);
    add(new THREE.BoxGeometry(0.11, 0.002, 0.012), INK, [0, 0.006, -0.02], [0, 0.35, 0]);
  }
  return g;
}

// Un fragmento en la maqueta: el objeto, un anillo dorado que late apenas y una zona invisible
// más grande para tocarlo fácil. Encontrado, el anillo se apaga.
export function addFragment(group, fragment, { found = false } = {}) {
  const object = new THREE.Group();
  object.position.set(...fragment.position);
  object.userData.fragment = fragment.id;
  object.add(prop(fragment));
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.075, 0.092, 40),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.003;
  object.add(ring);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.04;
  hit.userData.fragment = fragment.id;
  object.add(hit);
  group.add(object);
  let isFound = found;
  const setFound = (value) => { isFound = value; ring.visible = !value; };
  setFound(found);
  return {
    object, hit, setFound,
    update(elapsed) {
      if (isFound) return;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2);
      ring.material.opacity = 0.18 + pulse * 0.32;
      ring.scale.setScalar(1 + pulse * 0.08);
    },
  };
}
