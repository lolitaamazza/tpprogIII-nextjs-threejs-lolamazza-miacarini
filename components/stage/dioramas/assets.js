import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { DIORAMA_ASSETS } from '../../../lib/dioramaAssets.js';

// Carga compartida de los modelos y del entorno de cada diorama, con caché. En Node (tests) o si algo falla
// devuelve null: el diorama se juega igual con su geometría propia y suma la decoración cuando llega.
// El Nature Kit viene en pastel (durazno y menta) y con metalness 1, que refleja el cielo como si fuera metal:
// se pasa a una paleta apagada de Panem (tierra, musgo, corteza, trigo) y a materiales mate.
const PALETTE = {
  dirt: '#857464', dirtDark: '#5c5047', grass: '#6c8a4b', woodInner: '#d6c099', wood: '#8a6244', woodDark: '#5e4232',
  colorYellow: '#d8b25c', leafsGreen: '#4d7a3c', colorRed: '#b4504a', leafsDark: '#2f5a3c', woodBark: '#6e4e36',
  woodBarkDark: '#4d3829', _defaultMat: '#cfc6b4',
};
const kits = new Map();
const files = new Map();
const environmentCaches = new WeakMap();

function loadGltf(path) {
  if (!files.has(path)) {
    files.set(path, new GLTFLoader().loadAsync(path).then((gltf) => {
      // Las geometrías, materiales y texturas del original se comparten entre visitas: no se liberan al salir.
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry.userData.shared = true;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          material.userData.shared = true;
          if (material.map) material.map.userData.shared = true;
          material.metalness = 0;
          material.roughness = Math.max(material.roughness ?? 1, 0.85);
          if (path.includes('/nature/') && PALETTE[material.name]) material.color.set(PALETTE[material.name]);
        }
      });
      return gltf;
    }).catch((error) => { files.delete(path); throw error; }));
  }
  return files.get(path);
}

export function loadKit(id) {
  const spec = DIORAMA_ASSETS[id];
  if (typeof window === 'undefined' || !spec) return Promise.resolve(null);
  if (!kits.has(id)) {
    kits.set(id, Promise.all(Object.entries(spec.models).map(async ([name, path]) => [name, await loadGltf(path)]))
      .then((entries) => ({
        models: Object.fromEntries(entries.map(([name, gltf]) => [name, gltf.scene])),
        animations: Object.fromEntries(entries.map(([name, gltf]) => [name, gltf.animations])),
      }))
      .catch((error) => { kits.delete(id); console.warn(`No se pudieron cargar los modelos del Distrito ${id}:`, error); return null; }));
  }
  return kits.get(id);
}

// Una copia lista para agregar a la escena (las figuras con esqueleto se clonan con sus huesos).
export function instanceOf(kit, name) {
  const source = kit?.models[name];
  if (!source) return null;
  let skinned = false;
  source.traverse((node) => { if (node.isSkinnedMesh) skinned = true; });
  const copy = skinned ? cloneSkinned(source) : source.clone(true);
  copy.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  return copy;
}

export function loadEnvironment(renderer, url) {
  if (typeof window === 'undefined' || !renderer || !url) return Promise.resolve(null);
  if (!environmentCaches.has(renderer)) environmentCaches.set(renderer,new Map());
  const environments=environmentCaches.get(renderer);
  if (!environments.has(url)) {
    environments.set(url, new HDRLoader().loadAsync(url).then((texture) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromEquirectangular(texture).texture;
      texture.dispose();
      pmrem.dispose();
      return environment;
    }).catch((error) => { environments.delete(url); console.warn('No se pudo cargar el entorno:', error); return null; }));
  }
  return environments.get(url);
}
