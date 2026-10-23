import { buildDistrict12 } from './district12.js';
import { buildDistrict11 } from './district11.js';
import { buildDistrict4 } from './district4.js';
import { buildWorkshop } from './workshop.js';
import { addFragment } from './fragment.js';
import { WORKSHOPS } from '../../../data/workshops.js';

const noop = () => {};

// Con `locked` (un día que todavía no llegó) la maqueta se ve y se anima, pero no acepta jugadas ni informa partida.
function lockable(build) {
  return (options) => {
    if (!options.locked) return build(options);
    const diorama = build({ ...options, onProgress: noop, onMatch: noop, onComplete: noop });
    return { ...diorama, pointerDown: noop, pointerUp: noop, pointerMove: () => false, performAction: () => false, input: noop, retry: noop };
  };
}

// Los fragmentos (`fragments`, `found`, `onFragment`) se tocan antes que cualquier jugada, con o sin juego.
function withFragments(build) {
  return (options) => {
    const diorama = build(options);
    const placed = (options.fragments ?? []).map((f) => ({ id: f.id, ...addFragment(diorama.group, f, { found: options.found?.includes(f.id) }) }));
    if (placed.length === 0) return diorama;
    const hits = placed.map((f) => f.hit);
    const touched = (raycaster) => raycaster.intersectObjects(hits, false)[0]?.object.userData.fragment ?? null;
    let pressed = null; // si se apretó sobre un fragmento, el soltar tampoco es una jugada
    return {
      ...diorama,
      update(dt, elapsed) { diorama.update(dt, elapsed); for (const f of placed) f.update(elapsed ?? 0); },
      pointerDown(raycaster) {
        pressed = touched(raycaster);
        if (!pressed) { diorama.pointerDown(raycaster); return; }
        placed.find((f) => f.id === pressed).setFound(true);
        options.onFragment?.(pressed);
      },
      pointerUp(raycaster) { if (pressed) { pressed = null; return; } diorama.pointerUp(raycaster); },
      pointerMove(raycaster) { return Boolean(touched(raycaster)) || diorama.pointerMove(raycaster); },
      setFragmentsFound(ids) { for (const f of placed) f.setFound(ids.includes(f.id)); },
    };
  };
}

const dioramaFor = (build) => withFragments(lockable(build));

// id del distrito → función build del diorama (ver contrato en el plan, Tarea 5).
export const DIORAMAS = {
  12: dioramaFor(buildDistrict12),
  11: dioramaFor(buildDistrict11),
  4: dioramaFor(buildDistrict4),
};
for (const id of Object.keys(WORKSHOPS)) DIORAMAS[id] = dioramaFor((options) => buildWorkshop(id, options));
