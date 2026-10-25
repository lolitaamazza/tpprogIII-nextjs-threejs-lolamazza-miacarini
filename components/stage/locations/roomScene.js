import * as THREE from 'three';
import { roomItemDefinitions } from '../../../lib/locations/interiors.js';
import { disposeTree, placeModel } from './resources.js';
import { opaqueMeshes } from './navigationAuras.js';
import { createInteractable } from './interactables.js';
import { clueArt } from './clueArt.js';

// Una escena por visita, usando el mismo renderer y cámara. El exterior deja de actualizarse adentro.
export async function createInterior(data, def, { loader, halo, budget, clues, environment, onClue, onHoldProgress, onHoldHint, isCancelled }) {
  const scene = new THREE.Scene();
  scene.background = environment ?? new THREE.Color(data.fog.color);
  scene.backgroundIntensity = 0.4;
  scene.backgroundBlurriness = 0.25;
  scene.environment = environment ?? null;
  scene.environmentIntensity = 0.12;
  const loaded = new Map();
  const definitions = [{ id: 'shell', ...def.shell }, ...def.pieces];
  const results = await Promise.allSettled(definitions.map(async (piece) => {
    const gltf = await loader.loadAsync(piece.url);
    if (isCancelled()) { disposeTree(gltf.scene); return; }
    const holder = placeModel(gltf.scene, piece, budget.low);
    if (piece.id === 'shell' && def.kind !== 'barn') {
      // Se conservan estructura, hogar, leña y cómoda. Se retiran sofá decorado, alfombras y mesa originales.
      holder.traverse((node) => {
        if (!node.isMesh) return;
        node.visible = /^(Floor|Katto|Seinaparr|Ovilauta|Cube|Takka|Klapi|Lipasto)/.test(node.name);
        if (/^(Floor|Seinaparr|Cube)/.test(node.name)) for (const m of [node.material].flat()) m.color.multiply(new THREE.Color(def.tint));
      });
    }
    scene.add(holder); loaded.set(piece.id, holder);
  }));
  if (isCancelled() || !loaded.has('shell') || (def.kind !== 'barn' && !loaded.has('rustic_wooden_table_antique_farmhouse_style'))) {
    disposeTree(scene, { keepTextures: [halo] });
    if (isCancelled()) return null;
    throw new Error('Falta la estructura o la mesa del interior');
  }
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length) console.warn('Algunos muebles no cargaron:', failures.map((r) => r.reason?.message));

  if (def.kind !== 'barn') {
    // El escaneo original está abierto del lado de la cámara: se completa con tablones texturados y una puerta.
    let floorMaterial;
    scene.traverse((n) => { if (n.isMesh && n.name.startsWith('Floor_')) floorMaterial = n.material; });
    const wood = floorMaterial?.clone() ?? new THREE.MeshStandardMaterial({ color: '#624d38', roughness: 0.9 });
    wood.color.set('#807569');
    const plankGeometry = new THREE.BoxGeometry(0.12, 0.2, 6);
    const wall = new THREE.InstancedMesh(plankGeometry, wood, 16);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) wall.setMatrixAt(i, matrix.makeTranslation(2.14, 0.1 + i * 0.2, 0));
    wall.receiveShadow = true; scene.add(wall);
    for (const x of [-1.35, 1.35]) {
      const front = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 0.12), wood);
      front.position.set(x, 1.6, 2.88); front.receiveShadow = true; scene.add(front);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 0.1), wood);
    door.position.set(0, 1.6, 2.91); scene.add(door);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0xa48a51, metalness: 0.75, roughness: 0.45 }));
    handle.position.set(0.4, 1.1, 2.82); scene.add(handle);

  }
  const windowLight = new THREE.PointLight(def.light, data.id === '12' ? 16 : 24, 9, 2);
  windowLight.position.set(-1.7, 2.3, 0.1);
  const ceiling = new THREE.PointLight(0xffc78b, 10, 7, 2);
  ceiling.position.set(0.3, 2.7, -0.2);
  scene.add(windowLight, ceiling, new THREE.HemisphereLight(def.light, 0x382d24, 0.65));
  // Luz de ventana difusa: da una salida visual sin rótulo ni un portal luminoso que tape los materiales.
  const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.75), new THREE.MeshBasicMaterial({ color: def.light, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  windowPane.position.set(-2.05, 1.7, 0.05); windowPane.rotation.y = Math.PI / 2;
  scene.add(windowPane);
  const items = roomItemDefinitions(data, def).map((itemDef) => {
    const item = createInteractable(itemDef, { halo, texture: clueArt(itemDef.art), onFound: onClue,
      onHoldProgress: (p) => onHoldProgress(itemDef.id, p), onHoldHint: () => onHoldHint(itemDef.id) });
    item.setDone(clues.includes(itemDef.reveals));
    if (loaded.has(itemDef.piece)) item.attach(loaded.get(itemDef.piece));
    scene.add(item.group, item.hit);
    return Object.assign(item, { def: itemDef });
  });
  const markers = [];
  scene.updateMatrixWorld(true);
  return { definition: def, scene, items, markers, obstacles: opaqueMeshes(scene),
    dispose() { disposeTree(scene, { keepTextures: [halo, environment] }); scene.clear(); },
  };
}
