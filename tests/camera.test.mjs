import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easeInOutCubic, lerpPose, poseFor, viewShiftFor, fogRangeFor } from '../components/stage/cameraPoses.js';

const centers = { 12: { x: 2, z: 1 }, c: { x: -1, z: -0.5 } };

test('easing', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

test('lerpPose interpola posición y objetivo', () => {
  const a = { position: [0, 0, 0], target: [0, 0, 0] };
  const b = { position: [2, 4, 6], target: [1, 1, 1] };
  assert.deepEqual(lerpPose(a, b, 0.5), { position: [1, 2, 3], target: [0.5, 0.5, 0.5] });
});

test('poses por escena', () => {
  assert.deepEqual(poseFor({ scene: 'intro' }, centers, 1.6), { position: [0, 24, 3], target: [0, 0, 0] });
  const map = poseFor({ scene: 'mapa' }, centers, 1.6);
  assert.deepEqual(map.target, [0, 0, 0.6]);
  const d12 = poseFor({ scene: 'distrito', districtId: '12' }, centers, 1.6);
  assert.deepEqual(d12.target, [2, 0.3, 1]);
  assert.deepEqual(poseFor({ scene: 'capitolio', districtId: 'c' }, centers, 1.6).target, [-1, 0.3, -0.5]);
});

test('pantallas angostas alejan la cámara', () => {
  const wide = poseFor({ scene: 'mapa' }, centers, 1.6);
  const narrow = poseFor({ scene: 'mapa' }, centers, 0.5);
  assert.ok(narrow.position[1] > wide.position[1]);
});

test('sin centro conocido cae en la pose del mapa', () => {
  assert.deepEqual(poseFor({ scene: 'distrito', districtId: '7' }, {}, 1.6), poseFor({ scene: 'mapa' }, {}, 1.6));
});

test('el panel lateral desplaza la vista: en escritorio hacia la izquierda, en celular hacia arriba', () => {
  assert.deepEqual(viewShiftFor({ scene: 'distrito', districtId: '12' }, 1440, 800), { x: 212, y: 0 });
  assert.deepEqual(viewShiftFor({ scene: 'capitolio' }, 1024, 768), { x: 212, y: 0 });
  assert.deepEqual(viewShiftFor({ scene: 'distrito', districtId: '4' }, 390, 800), { x: 0, y: 176 });
  assert.deepEqual(viewShiftFor({ scene: 'distrito', districtId: '4' }, 720, 1000), { x: 0, y: 220 });
});

test('sin panel (intro, mapa, final) la vista queda centrada', () => {
  for (const scene of ['intro', 'mapa', 'finale']) assert.deepEqual(viewShiftFor({ scene }, 1440, 800), { x: 0, y: 0 });
  assert.deepEqual(viewShiftFor(undefined, 1440, 800), { x: 0, y: 0 });
});

test('en ventanas angostas el desplazamiento nunca supera la mitad del panel disponible', () => {
  assert.deepEqual(viewShiftFor({ scene: 'distrito', districtId: '12' }, 760, 600), { x: 190, y: 0 });
});

const near = (actual, expected, label) => {
  assert.equal(actual.length, expected.length, label);
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-9, `${label}: ${actual} vs ${expected}`));
};

test('el mapa entero cabe a lo ancho: la cámara se aleja a medida que la pantalla se angosta', () => {
  near(poseFor({ scene: 'mapa' }, {}, 1.6).position, [0, 10.5, 7], 'pantalla ancha: pose base');
  near(poseFor({ scene: 'mapa' }, {}, 1.0).position, [0, 10.5 * 1.36, 7 * 1.36], 'cuadrada');
  near(poseFor({ scene: 'mapa' }, {}, 0.5).position, [0, 10.5 * 2.72, 7 * 2.72], 'celular vertical');
  near(poseFor({ scene: 'mapa' }, {}, 0.1).position, [0, 10.5 * 3.2, 7 * 3.2], 'tope de alejamiento');
});

test('el final deja lugar al panel: se aleja más que el mapa', () => {
  near(poseFor({ scene: 'finale' }, {}, 1.6).position, [0, 12 * 1.25, 8.5 * 1.25], 'ancha');
  near(poseFor({ scene: 'finale' }, {}, 2.4).position, [0, 12 * 1.15, 8.5 * 1.15], 'ultra ancha: alejamiento mínimo');
  near(poseFor({ scene: 'finale' }, {}, 1.0).position, [0, 12 * 2, 8.5 * 2], 'cuadrada');
});

test('los distritos y el Capitolio conservan su alejamiento propio', () => {
  const c = { 12: { x: 2, z: 1 }, c: { x: -1, z: -0.5 } };
  near(poseFor({ scene: 'distrito', districtId: '12' }, c, 1.6).position, [2, 4.4, 1 + 3.9], 'distrito ancho');
  near(poseFor({ scene: 'distrito', districtId: '12' }, c, 0.5).position, [2, 4.4 * 1.7, 1 + 3.9 * 1.7], 'distrito angosto');
  near(poseFor({ scene: 'capitolio' }, c, 1.6).position, [-1, 5.5, -0.5 + 5], 'capitolio ancho');
});

test('el final con panel (route.panel) también corre la vista; sin panel no', () => {
  assert.deepEqual(viewShiftFor({ scene: 'finale', panel: true }, 1440, 800), { x: 212, y: 0 });
  assert.deepEqual(viewShiftFor({ scene: 'finale', panel: true }, 390, 800), { x: 0, y: 176 });
  assert.deepEqual(viewShiftFor({ scene: 'finale' }, 1440, 800), { x: 0, y: 0 });
});

test('la niebla acompaña a la cámara: en celular el mapa lejano no puede quedar tapado por completo', () => {
  // Bug visto en el navegador: con la cámara a ~37 unidades (pantalla vertical) y niebla fija hasta 34,
  // todo el mapa se confundía con el fondo.
  const close = fogRangeFor(5);
  assert.deepEqual(close, { near: 16, far: 34 }, 'cerca se conserva la niebla original');
  const far = fogRangeFor(37);
  assert.ok(far.near > 37, `near=${far.near}: el mapa tiene que estar adelante de la niebla`);
  assert.ok(far.far > far.near * 2, `far=${far.far}`);
  const map = poseFor({ scene: 'mapa' }, {}, 0.46);
  const distance = Math.hypot(...map.position);
  assert.ok(fogRangeFor(distance).near > distance, 'la pose del mapa en celular queda fuera de la niebla');
});
