import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { getDistrict } from '../../data/districts.js';
import { labelPoint } from './labelPoint.js';

export const MAP_SCALE = 0.012;
export const DEPTH = 0.25;
export const LIFT_HOVER = 0.12;
export const LIFT_FOCUS = 0.35;
const SVG_W = 1000;
const SVG_H = 744;

// Convierte coordenadas SVG (y hacia abajo) al plano del mapa centrado.
// Invertir y cambia el sentido de giro; ExtrudeGeometry lo corrige solo.
function toMapShape(shape) {
  const convert = (points) => points.map((p) => new THREE.Vector2((p.x - SVG_W / 2) * MAP_SCALE, -(p.y - SVG_H / 2) * MAP_SCALE));
  const result = new THREE.Shape(convert(shape.getPoints(4)));
  result.holes = shape.holes.map((hole) => new THREE.Path(convert(hole.getPoints(4))));
  return result;
}

export async function loadPanemMap(url, { isCancelled = () => false } = {}) {
  const data = await new SVGLoader().loadAsync(url);
  // React puede desmontar la primera escena antes de que llegue el SVG (modo estricto).
  // Evitar extrusiones y búsqueda de anclas de un renderizador que ya se liberó.
  if(isCancelled())return null;
  const group = new THREE.Group();
  const meshes = [];
  const centers = {};
  const textureLoader = new THREE.TextureLoader();
  const disposables = [];

  for (const path of data.paths) {
    const match = /^district-(\w+)$/.exec(path.userData?.node?.id ?? '');
    const district = match && getDistrict(match[1]);
    if (!district) continue;
    const shapes = path.toShapes().map(toMapShape);
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2, curveSegments: 4,
    });
    geometry.rotateX(-Math.PI / 2); // el plano del SVG pasa a ser el piso (XZ) y la extrusión sube en Y
    // Ancla del sello, de la cámara y del diorama: el punto más interno de la pieza. El centro de la caja
    // cae afuera en las piezas cóncavas (Distrito 3). Al rotar, el eje y del plano 2D pasa a -z.
    const anchor = shapes.map((shape) => labelPoint(shape.getPoints(4))).sort((a, b) => b.distance - a.distance)[0];
    const center = { x: anchor.x, z: -anchor.y };
    const baseColor = new THREE.Color(district.color);
    const litColor = new THREE.Color(district.litColor);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor.clone(), roughness: 0.85, metalness: 0.05, emissive: litColor.clone(), emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { districtId: district.id, baseColor, litColor };
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 30),
      new THREE.LineBasicMaterial({ color: 0xd9d9d9, transparent: true, opacity: 0.5 }),
    );
    mesh.add(edges);
    const texture = textureLoader.load(`/assets/seals/${district.id}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    seal.scale.setScalar(0.42);
    seal.position.set(center.x, DEPTH + 0.25, center.z);
    mesh.userData.seal = seal;
    mesh.add(seal);
    disposables.push(texture);
    group.add(mesh);
    meshes.push(mesh);
    centers[district.id] = center;
  }

  const damp = THREE.MathUtils.damp;
  function update(dt, elapsed, { hoveredId, focusId, lit, finaleLit, hideSealId = null }) {
    const blend = 1 - Math.exp(-4 * dt);
    for (const mesh of meshes) {
      const id = mesh.userData.districtId;
      mesh.userData.seal.visible = id !== hideSealId; // el diorama ocupa el lugar del sello
      const isLit = lit.includes(id) || finaleLit.has(id);
      const lift = id === focusId ? LIFT_FOCUS : id === hoveredId ? LIFT_HOVER : 0;
      mesh.position.y = damp(mesh.position.y, lift, 8, dt);
      const m = mesh.material;
      m.color.lerp(isLit ? mesh.userData.litColor : mesh.userData.baseColor, blend);
      let glow = isLit ? 0.45 + 0.15 * Math.sin(elapsed * 2 + mesh.id) : id === hoveredId ? 0.08 : 0;
      if (id === '13' && !isLit) {
        // Estática: parpadeos y saltos breves
        glow = Math.random() < 0.06 ? 0.35 : 0;
        mesh.position.x = Math.random() < 0.04 ? (Math.random() - 0.5) * 0.06 : 0;
      }
      m.emissiveIntensity = damp(m.emissiveIntensity, glow, 10, dt);
    }
  }

  function dispose() {
    group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
    });
    disposables.forEach((t) => t.dispose());
    group.removeFromParent();
  }

  return { group, meshes, centers, update, dispose };
}
