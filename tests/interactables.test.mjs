import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createInteractable, HOLD_SECONDS, LIGHT_RANGE } from '../components/stage/locations/interactables.js';

const recorder = () => {
  const found = [];
  const progress = [];
  return { found, progress, onFound: (id) => found.push(id), onHoldProgress: (p) => progress.push(p) };
};
const step = (item, seconds, light = {}, reducedMotion = false) => {
  for (let t = 0; t < seconds; t += 0.05) item.update(0.05, t, { reducedMotion, ...light });
};

test('agarrar: un toque lo encuentra una vez y el objeto desaparece', () => {
  const r = recorder();
  const item = createInteractable({ id: 'farol', kind: 'take', spot: 'galpon', position: [5.8, 0.82, -7.6], size: [0.5, 0.6, 0.5], reveals: 'farol' }, r);
  const piece = new THREE.Group();
  item.attach(piece);
  assert.ok(item.hit.isMesh);
  assert.deepEqual(item.hit.position.toArray(), [5.8, 0.82 + 0.3, -7.6], 'la zona para tocar envuelve al objeto apoyado');
  assert.equal(item.pickable(), true);
  item.tap();
  item.tap();
  assert.deepEqual(r.found, ['farol']);
  assert.equal(item.group.visible, false);
  assert.equal(piece.visible, false);
  assert.equal(item.pickable(), false);
});

test('abrir: la tapa se abre y al terminar se encuentra lo de adentro, una sola vez', () => {
  const r = recorder();
  const item = createInteractable({ id: 'libreta', kind: 'open', spot: 'casa', position: [0, 0, 0], size: [0.45, 0.3, 0.32], reveals: 'p-12-libreta' }, r);
  item.tap();
  assert.deepEqual(r.found, [], 'todavía se está abriendo');
  step(item, 1);
  assert.deepEqual(r.found, ['p-12-libreta']);
  assert.ok(item.lid.rotation.x < -1, `${item.lid.rotation.x}`);
  item.tap();
  step(item, 1);
  assert.deepEqual(r.found, ['p-12-libreta']);
});

test('abrir con movimiento reducido: se abre enseguida', () => {
  const r = recorder();
  const item = createInteractable({ id: 'libreta', kind: 'open', spot: 'casa', position: [0, 0, 0], size: [0.45, 0.3, 0.32], reveals: 'p-12-libreta' }, r);
  item.tap();
  item.update(0.016, 0, { reducedMotion: true });
  assert.deepEqual(r.found, ['p-12-libreta']);
});

test('mantener: soltar antes de tiempo deja el avance a medias y se puede seguir después', () => {
  const r = recorder();
  const item = createInteractable({ id: 'cartel', kind: 'hold', spot: 'entrada', position: [0, 1.5, 0], size: [1.2, 0.8, 0.05], reveals: 'p-12-cartel' }, r);
  assert.equal(HOLD_SECONDS, 0.9);
  item.holdStart();
  step(item, 0.5);
  item.holdEnd();
  const half = item.progress();
  assert.ok(half > 0.4 && half < 0.8, `${half}`);
  step(item, 2);
  assert.equal(item.progress(), half, 'sin mantener no avanza ni vuelve a cero');
  assert.deepEqual(r.found, []);
  item.holdStart();
  step(item, 0.5);
  assert.deepEqual(r.found, ['p-12-cartel']);
  assert.equal(r.progress.at(-1), 1);
  assert.ok(r.progress.every((p, i) => i === 0 || p >= r.progress[i - 1]), 'el avance nunca baja');
  item.holdStart();
  step(item, 1);
  assert.deepEqual(r.found, ['p-12-cartel']);
});

test('alumbrar: solo se ve y se toca con el farol apuntando, cerca', () => {
  const r = recorder();
  const item = createInteractable({ id: 'nicho', kind: 'light', spot: 'tunel', position: [0, 1.4, -4], size: [0.4, 0.4, 0.05], requires: 'farol', reveals: 'p-12-nicho' }, r);
  assert.equal(LIGHT_RANGE, 6);
  step(item, 0.2);
  assert.equal(item.lit(), false, 'sin farol queda oscuro');
  item.tap();
  assert.deepEqual(r.found, [], 'tocar sin luz no hace nada');
  assert.equal(item.pickable(), false);
  const from = [0, 1.6, 0];
  step(item, 0.2, { lightFrom: from, lightDir: [Math.sin(Math.PI / 4), 0, -Math.cos(Math.PI / 4)] });
  assert.equal(item.lit(), false, 'mirando para otro lado');
  step(item, 0.2, { lightFrom: [0, 1.6, 4], lightDir: [0, 0, -1] });
  assert.equal(item.lit(), false, 'a ocho metros no llega');
  step(item, 0.6, { lightFrom: from, lightDir: [0, -0.05, -1] });
  assert.equal(item.lit(), true);
  assert.ok(item.mark.material.opacity > 0.5, `${item.mark.material.opacity}`);
  item.tap();
  assert.deepEqual(r.found, ['p-12-nicho']);
});

test('lo que pide una herramienta no está disponible sin ella', () => {
  const nicho = createInteractable({ id: 'nicho', kind: 'light', spot: 'tunel', position: [0, 0, 0], size: [0.4, 0.4, 0.05], requires: 'farol', reveals: 'p-12-nicho' }, recorder());
  const farol = createInteractable({ id: 'farol', kind: 'take', spot: 'galpon', position: [0, 0, 0], size: [0.5, 0.6, 0.5], reveals: 'farol' }, recorder());
  assert.equal(nicho.available([]), false);
  assert.equal(nicho.available(['farol']), true);
  assert.equal(farol.available([]), true);
});

test('lo ya encontrado (al recargar) queda hecho y no se vuelve a encontrar', () => {
  const r = recorder();
  const take = createInteractable({ id: 'farol', kind: 'take', spot: 'galpon', position: [0, 0, 0], size: [0.5, 0.6, 0.5], reveals: 'farol' }, r);
  const open = createInteractable({ id: 'libreta', kind: 'open', spot: 'casa', position: [0, 0, 0], size: [0.45, 0.3, 0.32], reveals: 'p-12-libreta' }, r);
  const hold = createInteractable({ id: 'cartel', kind: 'hold', spot: 'entrada', position: [0, 0, 0], size: [1.2, 0.8, 0.05], reveals: 'p-12-cartel' }, r);
  for (const item of [take, open, hold]) item.setDone(true);
  take.tap(); open.tap(); hold.holdStart();
  step(open, 1); step(hold, 1);
  assert.deepEqual(r.found, []);
  assert.equal(take.group.visible, false);
  assert.ok(open.lid.rotation.x < -1, 'la caja queda abierta');
  assert.equal(hold.progress(), 1, 'el cartel queda limpio');
});

test('mirar: un toque lo encuentra una vez y el objeto se queda donde está', () => {
  const r = recorder();
  const item = createInteractable({ id: 'cuenco', kind: 'look', spot: 'casa', position: [0, 0.9, 0], size: [0.3, 0.2, 0.3], reveals: '4-cuenco' }, r);
  const piece = new THREE.Group();
  item.attach(piece);
  item.tap();
  item.tap();
  assert.deepEqual(r.found, ['4-cuenco']);
  assert.equal(item.group.visible, true);
  assert.equal(piece.visible, true);
  assert.equal(item.pickable(), false);
});

test('la botella enredada: la red se va mientras se mantiene presionado', () => {
  const r = recorder();
  const item = createInteractable({ id: 'botella', kind: 'hold', shape: 'bottle', spot: 'redes', position: [0, 0.4, 0], size: [0.5, 0.3, 0.3], reveals: 'p-4-botella' }, r);
  const before = item.cover.material.opacity;
  item.holdStart();
  step(item, 0.5);
  assert.ok(item.cover.material.opacity < before);
  step(item, 0.6);
  assert.deepEqual(r.found, ['p-4-botella']);
  assert.equal(item.cover.material.opacity, 0);
});

test('lo escondido de verdad (`subtle`) no tiene el brillo que avisa', () => {
  const plain = createInteractable({ id: 'a', kind: 'hold', shape: 'bottle', spot: 's', position: [0, 0, 0], size: [0.5, 0.3, 0.3], reveals: 'p-4-botella' }, recorder());
  const subtle = createInteractable({ id: 'b', kind: 'hold', shape: 'bottle', subtle: true, spot: 's', position: [0, 0, 0], size: [0.5, 0.3, 0.3], reveals: 'p-4-botella' }, recorder());
  const sprites = (item) => item.group.children.filter((c) => c.isSprite).length;
  assert.equal(sprites(plain), 1);
  assert.equal(sprites(subtle), 0);
});
