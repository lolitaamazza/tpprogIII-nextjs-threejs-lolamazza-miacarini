import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import * as THREE from 'three';
import { LOCATIONS } from '../lib/locations/index.js';
import { ROOMS, interiorPath, roomItemDefinitions } from '../lib/locations/interiors.js';
import { clampLook, lookTarget } from '../lib/guidedCamera.js';
import { auraInSight, navigationAuras, opaqueMeshes } from '../components/stage/locations/navigationAuras.js';
import { disposeTree } from '../components/stage/locations/resources.js';

const bytes = (urls) => [...new Set(urls)].reduce((sum, url) => sum + statSync(`public${url}`).size, 0);

test('cada puerta vuelve a un lugar exterior y el interior carga sus propios archivos dentro del presupuesto', () => {
  for (const [id, rooms] of Object.entries(ROOMS)) for (const room of Object.values(rooms)) {
    assert.ok(LOCATIONS[id].spots.some((s) => s.id === room.returnSpot));
    assert.ok(room.spots.some((s) => s.id === room.start));
    assert.equal(room.spots.filter((s) => s.exit).length, 1);
    for (const spot of room.spots) assert.equal(spot.position[1], 1.6);
    const urls = [room.shell.url, ...room.pieces.map((p) => p.url)];
    for (const url of urls) assert.ok(existsSync(`public${url}`), url);
    assert.ok(bytes(urls) <= 25e6, `${id}/${room.id} supera 25 MB`);
    const outdoorURLs = LOCATIONS[id].pieces.map((p) => p.url);
    assert.ok(!outdoorURLs.includes(room.shell.url) || room.kind === 'barn', 'el cuarto se carga recién al entrar');
  }
});

test('las pistas conservan identidad y reglas, pero se alcanzan desde la mesa interior', () => {
  for (const id of ['12', '4']) {
    const room = ROOMS[id].casa;
    const item = roomItemDefinitions(LOCATIONS[id], room)[0];
    const original = LOCATIONS[id].interactables.find((i) => i.id === item.id);
    assert.equal(item.reveals, original.reveals);
    assert.equal(item.kind, original.kind);
    assert.equal(item.spot, 'casa-mesa');
    assert.ok(item.position[1] >= 0.78, 'sobre la mesa');
    assert.notDeepEqual(item.position, original.position, 'no queda afuera de la casa');
  }
});

test('el pasillo interior conserva el origen y evita usar el camino de la calle', () => {
  const from = [1.2, 1.6, 1.5], to = { position: [-0.6, 1.6, -0.8] };
  const path = interiorPath(from, to);
  assert.deepEqual(path[0], from);
  assert.deepEqual(path.at(-1), to.position);
  assert.ok(path.every((p) => Math.abs(p[2]) <= 1.5));
  assert.equal(path[1][0], 0);
});

test('se puede mirar hacia la puerta detrás de la cámara sin perder el límite vertical', () => {
  const spot = { position: [0, 1.6, 0], look: [0, 1.6, -3], panoramic: true };
  const look = clampLook(Math.PI, 2, { panoramic: true });
  assert.ok(lookTarget(spot, look.yaw, look.pitch)[2] > 0);
  assert.ok(look.pitch <= Math.PI / 12 + 1e-9);
});

test('un muro bloquea el aura y las zonas invisibles para tocarla no se toman como muros', () => {
  const scene = new THREE.Scene();
  const markers = navigationAuras(scene, [{ id: 'puerta', position: [0, 1.6, -5], look: [0, 1.6, -6], aura: [0, 1.2, -5] }], null);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 1.6, 0);
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  assert.equal(opaqueMeshes(scene).length, 0);
  assert.equal(auraInSight(markers[0], camera, [], ray), true);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), new THREE.MeshStandardMaterial());
  wall.position.set(0, 1.5, -2); scene.add(wall); scene.updateMatrixWorld(true);
  assert.equal(auraInSight(markers[0], camera, opaqueMeshes(scene), ray), false);
  wall.position.x = 5; scene.updateMatrixWorld(true);
  assert.equal(auraInSight(markers[0], camera, opaqueMeshes(scene), ray), true);
  disposeTree(scene);
});

test('al salir se liberan recursos compartidos una sola vez y se conserva el halo del exterior', () => {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(), map = new THREE.Texture(), halo = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map });
  group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  group.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: halo })));
  let geometries = 0, materials = 0, textures = 0, halos = 0;
  geometry.addEventListener('dispose', () => geometries++);
  material.addEventListener('dispose', () => materials++);
  map.addEventListener('dispose', () => textures++);
  halo.addEventListener('dispose', () => halos++);
  disposeTree(group, { keepTextures: [halo] });
  assert.deepEqual([geometries, materials, textures, halos], [1, 1, 1, 0]);
});

test('el presupuesto del exterior incluye los modelos compartidos nuevos, sin contar copias dos veces', () => {
  for (const [id, data] of Object.entries(LOCATIONS)) {
    const textures = readdirSync(`public/models/d${id}`).filter((p) => p.endsWith('.jpg')).map((p) => `/models/d${id}/${p}`);
    const size = bytes([data.sky.url, ...data.pieces.map((p) => p.url), ...textures]);
    assert.ok(size <= 25e6, `${id}: ${(size / 1e6).toFixed(2)} MB`);
  }
});

test('la cerca contiene una textura con alpha real y usa recorte, no un panel opaco', () => {
  const data = readFileSync('public/models/d11/alambrado.glb');
  const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
  const wire = json.materials.find((m) => m.name.endsWith('_wire'));
  assert.equal(wire.alphaMode, 'MASK');
  const texture = json.textures[wire.pbrMetallicRoughness.baseColorTexture.index];
  const image = json.images[texture.extensions?.EXT_texture_webp?.source ?? texture.source];
  assert.equal(image.mimeType, 'image/webp');
  const view = json.bufferViews[image.bufferView];
  const binOffset = 20 + data.readUInt32LE(12) + 8;
  const webp = data.subarray(binOffset + (view.byteOffset ?? 0), binOffset + (view.byteOffset ?? 0) + view.byteLength);
  assert.ok(webp.includes(Buffer.from('ALPH')) || webp.includes(Buffer.from('VP8L')), 'el WebP conserva transparencia');
});

// Las pistas interiores deben existir en la historia y conservarse al recargar.
test('cada interior cuenta algo mediante objetos alcanzables y pistas persistentes', async () => {
  const { clueById } = await import('../lib/clues.js');
  const { createStory, findHint } = await import('../lib/story.js');
  let story = createStory();
  for (const [id, rooms] of Object.entries(ROOMS)) for (const room of Object.values(rooms)) {
    const items = roomItemDefinitions(LOCATIONS[id], room);
    assert.ok(items.length >= 2);
    for (const item of items) {
      assert.ok(room.spots.some((spot) => spot.id === item.spot));
      const clue = clueById(item.reveals);
      assert.ok(clue, item.id);
      if (clue.detail) {
        assert.ok(clue.detail.length > 100 && clue.detail.length < 400);
        story = findHint(story, clue.id);
        assert.ok(story.hints.includes(clue.id));
      }
    }
  }
  assert.equal(story.hints.length, 8);
});
