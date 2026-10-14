import * as THREE from 'three';
import { DEPTH, LIFT_FOCUS } from '../mapMesh.js';

export const DIORAMA_Y = DEPTH + LIFT_FOCUS + 0.03;

export function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...extra });
}

export function createDioramaBase(origin, groundColor) {
  const group = new THREE.Group();
  group.position.set(origin.x, DIORAMA_Y, origin.z);
  group.scale.setScalar(0.001); // crece al aparecer (growIn)
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.08, 9), mat(groundColor));
  ground.position.y = 0.04;
  group.add(ground);
  return { group };
}

export function growIn(group, dt) {
  group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, 1, 6, dt));
}

export function makeTree(color = '#2f4a33') {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 5), mat('#4a3626'));
  trunk.position.y = 0.06;
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), mat(color));
  top.position.y = 0.25;
  tree.add(trunk, top);
  return tree;
}

export function createBurst(parent, color, count = 40) {
  const positions = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const life = new Float32Array(count);
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = -10;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 0.04, transparent: true, depthWrite: false }));
  points.frustumCulled = false;
  parent.add(points);
  return {
    burst(at) {
      for (let i = 0; i < count; i++) {
        positions.set([at.x, at.y, at.z], i * 3);
        velocity.set([(Math.random() - 0.5) * 1.2, Math.random() * 1.4, (Math.random() - 0.5) * 1.2], i * 3);
        life[i] = 0.6 + Math.random() * 0.4;
      }
    },
    update(dt) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        velocity[i * 3 + 1] -= 3 * dt;
        for (let k = 0; k < 3; k++) positions[i * 3 + k] += velocity[i * 3 + k] * dt;
        if (life[i] <= 0) positions[i * 3 + 1] = -10;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

export function disposeObject(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
  root.removeFromParent();
}
