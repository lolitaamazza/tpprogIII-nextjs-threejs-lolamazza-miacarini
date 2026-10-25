import * as THREE from 'three';

// El mapa de las lámparas es naranja; para guiar usamos una caída neutra, que conserva el color marfil.
function softAuraTexture(fallback) {
  if (typeof document === 'undefined') return fallback;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.12, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// Luz local, sin bloom de pantalla. La zona que se toca coincide con el aura, no con toda la casa.
export function navigationAuras(scene, spots, halo, anchors = {}) {
  const map = softAuraTexture(halo);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const geometry = new THREE.SphereGeometry(0.5, 10, 8);
  const markers = spots.map((spot) => {
    const position = spot.aura ?? anchors[spot.id] ?? [spot.look[0], 0.18, spot.look[2]];
    const material = new THREE.SpriteMaterial({ map, color: spot.exit ? 0xdce9df : 0xffe5a8,
      transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false });
    const pin = new THREE.Sprite(material);
    pin.position.set(...position);
    pin.scale.set(0.95, 1.35, 1);
    const hit = new THREE.Mesh(geometry, hitMaterial);
    hit.position.copy(pin.position);
    hit.scale.set(1, 1.4, 1);
    hit.userData.spot = spot.id;
    scene.add(pin, hit);
    return { spot, pin, hit, available: false };
  });
  return markers;
}

export const AURA_ANCHORS = {
  12: { vias: [0, 0.22, 1], galpon: [3, 0.65, -5.5], casa: [-3.2, 0.65, -10.5], entrada: [0, 0.7, -27], tunel: [0, 0.8, -44] },
  11: { alambrado: [0, 0.22, 1], huerto: [-2, 0.3, -9.5], torre: [7, 0.5, -13], galpon: [-3, 0.65, -18.5], casa: [3, 0.65, -26.6] },
  4: { playa: [0, 0.22, 3], casa: [-4, 0.65, 4.4], redes: [0.65, 0.7, -5.5], punta: [0, 0.6, -12], faro: [12.3, 0.5, -3.8] },
};

// Un muro opaco entre la cámara y el destino también bloquea el clic. Las hojas y mallas recortadas no son muros.
export function opaqueMeshes(root) {
  const meshes = [];
  root.traverseVisible((node) => {
    if (node.isMesh && !node.isSprite && node.material?.visible !== false) {
      const materials = [node.material].flat();
      if (materials.some((m) => !m.transparent && !m.alphaTest)) meshes.push(node);
    }
  });
  return meshes;
}
export function auraInSight(marker, camera, obstacles, raycaster, maxDistance = 38) {
  const direction = marker.pin.position.clone().sub(camera.position);
  const distance = direction.length();
  if (distance > maxDistance || distance < 0.15) return false;
  raycaster.set(camera.position, direction.normalize());
  raycaster.near = 0.08; raycaster.far = Math.max(0.08, distance - 0.55);
  const blocked = raycaster.intersectObjects(obstacles, false).length > 0;
  raycaster.near = 0; raycaster.far = Infinity;
  return !blocked;
}
