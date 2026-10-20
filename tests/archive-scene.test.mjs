import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArchiveScene } from '../components/stage/games/archiveScene.js';
import { createRun } from '../lib/games/simulation.js';
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
