import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArchiveScene } from '../components/stage/games/archiveScene.js';
import * as THREE from 'three';
import { createRun, selectTribute } from '../lib/games/simulation.js';
import { routeFromPathname } from '../lib/routes.js';
import { poseFor } from '../components/stage/cameraPoses.js';

test('cada capítulo construye y libera una escena sin necesitar WebGL', () => {
  for (const chapter of ['reaping', 'preparation', 'arena', 'ended']) {
    const scene = createArchiveScene(chapter);
    scene.setRun(createRun(1, 'test'));
    scene.setReducedMotion(true); scene.setQuality('low'); scene.update(.016, 1);
    assert.ok(scene.group.children.length > 24);
    let disposed = 0;
    const materials = new Set();
    scene.group.traverse((node) => { if (node.material) materials.add(node.material); });
    materials.forEach((mat) => mat.addEventListener('dispose', () => disposed++));
    scene.dispose();
    assert.equal(disposed, materials.size);
  }
});

test('rutas de archivo usan su escena y poses válidas en vertical y horizontal', () => {
  for (const path of ['/cosecha', '/capitolio/preparacion', '/arena', '/desenlace']) {
    const route = routeFromPathname(path);
    assert.equal(route.scene, 'games');
    for (const aspect of [.4, 1, 2]) assert.ok(poseFor(route, null, aspect).position.every(Number.isFinite));
  }
});

const down = (p) => { const r = new THREE.Raycaster(); r.set(new THREE.Vector3(p.x, 20, p.z), new THREE.Vector3(0, -1, 0)); return r; };
const scaleOf = (mesh, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return new THREE.Vector3().setFromMatrixScale(m).x; };

test('la mesa de los Vigilantes: luces en lugar de personas, la tuya dorada, aunque la arena no haya cargado', () => {
  const scene = createArchiveScene('arena');
  const run = selectTribute(createRun(4, 'mesa'), 'tribute-3');
  run.tributes[1].alive = false;
  scene.setRun(run);
  scene.setView('table');
  scene.update(.016, 1);
  assert.equal(scene.getView(), 'table');
  const lights = scene.group.getObjectByName('table-lights');
  assert.ok(lights?.visible && lights.count === 24);
  let people = 0;
  scene.group.traverse((node) => { if (/^tribute-\d+$/.test(node.name) && node.visible) people += 1; });
  assert.equal(people, 0, 'en la mesa no se ven las figuras');
  const color = new THREE.Color();
  lights.getColorAt(2, color);
  assert.equal(color.getHexString(), 'd4af37');
  assert.equal(scaleOf(lights, 1), 0, 'el caído no tiene luz');
  assert.ok(scaleOf(lights, 0) > 0);
  assert.ok(scene.group.getObjectByName('table-crosses').visible);
  scene.setView('follow');
  assert.equal(lights.visible, false);
  scene.dispose();
});

test('tocar una luz en la mesa, o una figura en la Cosecha, dice qué tributo es', () => {
  const arena = createArchiveScene('arena');
  arena.setRun(selectTribute(createRun(4, 'pick'), 'tribute-1'));
  arena.setView('table');
  arena.update(.016, 1);
  arena.group.updateMatrixWorld(true);
  assert.equal(arena.pick(down(arena.focus('tribute-3'))), 'tribute-3');
  assert.equal(arena.pick(down({ x: 0, z: 0 })), null);
  arena.dispose();
  const reaping = createArchiveScene('reaping');
  reaping.setRun(createRun(4, 'cosecha'));
  reaping.update(.016, 1);
  reaping.group.updateMatrixWorld(true);
  assert.equal(reaping.pick(down(reaping.focus('tribute-5'))), 'tribute-5');
  reaping.dispose();
});
