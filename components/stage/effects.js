import * as THREE from 'three';

// Sistema de partículas propio: chispas que viajan en arco de un distrito a otro.
const MAX = 400;
const PER_EMIT = 60;
const HIDDEN_Y = -100;

export function createSparks(scene) {
  const positions = new Float32Array(MAX * 3);
  const particles = Array.from({ length: MAX }, () => ({ alive: false }));
  for (let i = 0; i < MAX; i++) positions[i * 3 + 1] = HIDDEN_Y;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#ffb347', size: 0.09, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;

  return {
    emit(from, to) {
      if (!from || !to) return;
      for (let k = 0; k < PER_EMIT; k++) {
        particles[cursor] = {
          alive: true, t: 0, delay: Math.random() * 0.5, speed: 0.6 + Math.random() * 0.4,
          sx: from.x, sz: from.z, ex: to.x, ez: to.z, h: 1.5 + Math.random() * 1.5,
          jx: (Math.random() - 0.5) * 0.5, jz: (Math.random() - 0.5) * 0.5,
        };
        cursor = (cursor + 1) % MAX;
      }
    },
    update(dt) {
      for (let i = 0; i < MAX; i++) {
        const p = particles[i];
        const o = i * 3;
        if (!p.alive) continue;
        if (p.delay > 0) { p.delay -= dt; positions[o + 1] = HIDDEN_Y; continue; }
        p.t += dt * p.speed;
        if (p.t >= 1) { p.alive = false; positions[o + 1] = HIDDEN_Y; continue; }
        const wobble = Math.sin(p.t * Math.PI);
        positions[o] = p.sx + (p.ex - p.sx) * p.t + p.jx * wobble;
        positions[o + 1] = 0.5 + p.h * 4 * p.t * (1 - p.t);
        positions[o + 2] = p.sz + (p.ez - p.sz) * p.t + p.jz * wobble;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
