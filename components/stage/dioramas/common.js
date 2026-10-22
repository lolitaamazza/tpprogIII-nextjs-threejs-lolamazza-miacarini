import * as THREE from 'three';
import { applyPolyMaterial } from '../polyHaven.js';
import { DEPTH, LIFT_FOCUS } from '../mapMesh.js';

export const DIORAMA_Y = DEPTH + LIFT_FOCUS + 0.03;

export function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...extra });
}

export function createDioramaBase(origin, groundColor) {
  const group = new THREE.Group();
  group.position.set(origin.x, DIORAMA_Y, origin.z);
  group.scale.setScalar(0.001); // crece al aparecer (growIn)
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.08, 64), applyPolyMaterial(mat('#b3a997', {flatShading:false}), 'soil', 2));
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

// Una mota redonda y difusa para las partículas (en Node no hay canvas: quedan cuadradas, da igual).
let softDot = null;
function dotTexture() {
  if (softDot || typeof document === 'undefined') return softDot;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  softDot = new THREE.CanvasTexture(canvas);
  softDot.userData.shared = true;
  return softDot;
}

// Motas que flotan y suben despacio (polvo, polen, brasas, humo): vuelven a empezar abajo al llegar arriba.
export function createMotes(parent, { count = 30, center = [0, 0.3, 0], spread = [1.6, 0.6, 1.6], color = '#ffffff', size = 0.03, rise = 0.04, sway = 0.02, opacity = 0.6, seed = 7 } = {}) {
  let s = seed;
  const random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const base = new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base.set([center[0] + (random() - 0.5) * spread[0], random() * spread[1], center[2] + (random() - 0.5) * spread[2]], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color, size, map: dotTexture(), transparent: true, opacity, depthWrite: false, sizeAttenuation: true,
  }));
  points.frustumCulled = false;
  parent.add(points);
  return {
    points,
    update(elapsed) {
      for (let i = 0; i < count; i++) {
        const height = (base[i * 3 + 1] + elapsed * rise) % spread[1];
        positions[i * 3] = base[i * 3] + Math.sin(elapsed * 0.7 + i) * sway;
        positions[i * 3 + 1] = center[1] + height;
        positions[i * 3 + 2] = base[i * 3 + 2] + Math.cos(elapsed * 0.5 + i * 1.7) * sway;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

// Libera lo que es del diorama; lo marcado como compartido (los modelos en caché, ver assets.js) queda para la
// próxima visita.
export function disposeObject(root) {
  root.traverse((o) => {
    if (!o.geometry?.userData.shared) o.geometry?.dispose();
    const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    materials.filter((m) => !m.userData.shared).forEach((m) => { if (!m.map?.userData.shared) m.map?.dispose(); m.dispose(); });
  });
  root.removeFromParent();
}
