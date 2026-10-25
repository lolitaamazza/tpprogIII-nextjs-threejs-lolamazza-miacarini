import * as THREE from 'three';

// Un solo dueño por escena; las copias comparten geometría, materiales y texturas.
export function disposeTree(root, { keepTextures = [] } = {}) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    for (const m of [node.material ?? []].flat()) {
      materials.add(m);
      for (const value of Object.values(m)) if (value?.isTexture && !keepTextures.includes(value)) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

export function placeModel(model, piece, low) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = piece.height ? piece.height / Math.max(size.y, 1e-6) : piece.scale ?? 1;
  model.scale.multiplyScalar(scale);
  if (piece.offset) model.position.add(new THREE.Vector3(...piece.offset));
  else if (piece.origin) model.position.set(...piece.origin.map((v) => -v * scale));
  else {
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    model.position.set(-center.x, -box.min.y * scale, -center.z);
  }
  const holder = new THREE.Group();
  holder.add(model);
  holder.position.set(...(piece.position ?? [0, 0, 0]));
  holder.rotation.set(piece.rotationX ?? 0, piece.rotationY ?? 0, piece.rotationZ ?? 0);
  holder.traverse((n) => {
    if (!n.isMesh) return;
    if (piece.only && !piece.only.some((name) => n.name.includes(name) || n.parent?.name.includes(name))) n.visible = false;
    if (piece.hide?.some((name) => n.name.includes(name) || n.parent?.name.includes(name))) n.visible = false;
    n.castShadow = !low; n.receiveShadow = true;
    for (const m of [n.material].flat()) {
      if (piece.cutout && m.transparent) Object.assign(m, { transparent: false, alphaTest: 0.5, depthWrite: true });
      if (piece.matte) { m.roughness = Math.max(m.roughness ?? 1, 0.8); m.metalness = 0; }
      if (piece.glass?.includes(m.name)) Object.assign(m, { transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false });
    }
  });
  return holder;
}
