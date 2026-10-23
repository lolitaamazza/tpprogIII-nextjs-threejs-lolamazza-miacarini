import * as THREE from 'three';
import { createCoalSeam } from './coalSeam.js';
import { createHarvestField } from './harvestField.js';
import { createNetCast } from './netCast.js';

// La jornada del día dentro de una escena (`data.job`): un constructor por tipo, todos con la misma forma.
// (def, { mode, onMatch, onComplete, sfx }) -> { group, update(dt, t), performAction(), retry(), setMode(mode), getState(),
//   pointerDown(raycaster) -> bool (si lo tomó la jornada), pointerMove(raycaster) -> bool (si hay algo para tocar), pointerUp(raycaster), dispose() }
// `mode`: 'play' (hay jornada), 'idle' (otro día) o 'done' (ya jugada).

// El frente de carbón del 12: se pica tocándolo (o con el botón) cuando la luz pasa por la grieta.
function coal(def, options) {
  const seam = createCoalSeam({ ...def, ...options });
  const playing = () => seam.getState().match?.phase === 'playing';
  return {
    ...seam,
    pointerDown: (raycaster) => (playing() && seam.hits(raycaster) ? seam.performAction() : false),
    pointerMove: (raycaster) => playing() && seam.hits(raycaster),
    pointerUp() {},
  };
}

// `harvest`: el campo del 11 (cosechar esquivando el reflector y repetir el silbido de los sinsajos).
// `net`: la red del 4 desde la punta del muelle.
// La plaza de la Cosecha: un papel sube de la urna hasta el micrófono (con el botón o tocando la urna); al llegar,
// se sabe el nombre. `def`: { urn (de dónde sale), to (hasta dónde llega) }.
function draw(def, { mode = 'idle', onComplete = () => {}, sfx = { play() {} } } = {}) {
  const group = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0xf2ecdc, roughness: 0.9, side: THREE.DoubleSide }));
  paper.visible = false;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(...def.urn);
  group.add(paper, hit);
  const from = new THREE.Vector3(...def.urn), to = new THREE.Vector3(...def.to);
  let state = 'ready', t = 0;
  const start = () => {
    if (mode !== 'play' || state !== 'ready') return false;
    state = 'drawing'; t = 0; paper.visible = true; sfx.play('reaping');
    return true;
  };
  return {
    group,
    update(dt, clock) {
      if (state !== 'drawing') return;
      t = Math.min(1, t + dt / 1.6);
      // Primero sube de la urna; después va hasta el micrófono, girando un poco.
      const up = Math.min(1, t / 0.4), across = Math.max(0, (t - 0.4) / 0.6);
      paper.position.copy(from).add(new THREE.Vector3(0, up * 0.7, 0)).lerp(to, across * across * (3 - 2 * across));
      paper.rotation.set(-0.3, clock * 2, 0.2);
      if (t >= 1) { state = 'drawn'; onComplete(); }
    },
    performAction: start,
    retry() {},
    setMode(next) { mode = next; },
    getState: () => ({ state }),
    pointerDown: (r) => (r.intersectObject(hit, false).length ? start() : false),
    pointerMove: (r) => mode === 'play' && state === 'ready' && r.intersectObject(hit, false).length > 0,
    pointerUp() {},
    dispose() { group.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); }); group.removeFromParent(); },
  };
}

export const JOBS = { coal, harvest: createHarvestField, net: createNetCast, draw };
