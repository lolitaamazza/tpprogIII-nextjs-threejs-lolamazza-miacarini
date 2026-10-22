import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { DIORAMA_ASSETS, assetFiles, assetBytes } from '../lib/dioramaAssets.js';
import { loadKit, loadEnvironment } from '../components/stage/dioramas/assets.js';

const local = (path) => `public${path}`;
const sizes = () => Object.fromEntries(Object.keys(DIORAMA_ASSETS).flatMap((id) => assetFiles(id)).map((path) => [path, statSync(local(path)).size]));

test('cada distrito jugable tiene su entorno y sus modelos, y todos los archivos están en public/', () => {
  for (const id of ['12', '11', '4']) {
    assert.ok(DIORAMA_ASSETS[id], id);
    for (const path of assetFiles(id)) assert.ok(existsSync(local(path)), path);
  }
  assert.equal(DIORAMA_ASSETS[12].env, '/models/districts/dawn.hdr');
  assert.equal(DIORAMA_ASSETS[4].env, '/models/districts/day.hdr');
  assert.ok(assetFiles(4).includes('/models/districts/pirate/Textures/colormap.png'), 'las texturas de cada pack cuentan');
});

test('ningún distrito pasa de 1,5 MB entre modelos, texturas y entorno', () => {
  const bytes = sizes();
  for (const id of ['12', '11', '4']) assert.ok(assetBytes(id, bytes) <= 1.5 * 1024 * 1024, `${id}: ${assetBytes(id, bytes)} bytes`);
});

test('sin navegador (o sin red) no hay modelos ni entorno, y no se rompe nada', async () => {
  assert.equal(await loadKit('12'), null);
  assert.equal(await loadEnvironment(null, DIORAMA_ASSETS[12].env), null);
  assert.equal(await loadKit('7'), null);
});

test('al salir de un distrito se libera lo propio, no los modelos compartidos que se reusan en la próxima visita', async () => {
  const THREE = await import('three');
  const { disposeObject } = await import('../components/stage/dioramas/common.js');
  const shared = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  shared.geometry.userData.shared = true;
  shared.material.userData.shared = true;
  const own = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const root = new THREE.Group();
  root.add(shared, own);
  const disposed = [];
  for (const thing of [shared.geometry, shared.material, own.geometry, own.material]) thing.addEventListener('dispose', () => disposed.push(thing));
  disposeObject(root);
  assert.deepEqual(disposed, [own.geometry, own.material]);
});
