import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HALL, HALL_ORIGIN, SCREEN_COPY, seatLayout, smallTvSlots, cascadeDelays, hallPoseFor, screenPoseFor, visibleSize, toWorld,
} from '../lib/broadcastHall.js';

const local = ([x, y, z]) => [x - HALL_ORIGIN[0], y - HALL_ORIGIN[1], z - HALL_ORIGIN[2]];
const insideHall = ([x, , z]) => Math.hypot(x, z - HALL.wallCenterZ) < HALL.radius - 0.5;

test('lo que dice la pantalla está en inglés, como en las películas, y la tele sigue siendo Capitol TV', () => {
  assert.equal(SCREEN_COPY.logo, 'CAPITOL TV');
  assert.equal(SCREEN_COPY.headline, 'CITIZENS OF PANEM');
  const all = Object.values(SCREEN_COPY).join(' ');
  for (const spanish of ['CIUDADANOS', 'SEÑAL', 'TRANSMISIÓN', 'Capitolio', 'distritos']) assert.ok(!all.includes(spanish), spanish);
});

test('las butacas dejan libre el pasillo central y no se pisan', () => {
  const seats = seatLayout();
  assert.ok(seats.length >= 32);
  for (const s of seats) assert.ok(Math.abs(s.x) > HALL.aisle / 2, 'nadie se sienta en el pasillo');
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      assert.ok(Math.hypot(seats[i].x - seats[j].x, seats[i].z - seats[j].z) > 0.9, 'butacas separadas');
    }
  }
  for (const s of seats) assert.ok(s.z > HALL.screen.z + 3 && insideHall([s.x, 0, s.z]), 'entre la pared de teles y la cámara');
});

test('el público ocupa parte de las butacas, siempre igual (sin azar al recargar)', () => {
  const a = seatLayout();
  const b = seatLayout();
  assert.deepEqual(a, b);
  const occupied = a.filter((s) => s.occupied).length;
  assert.ok(occupied > a.length * 0.4 && occupied < a.length * 0.9);
});

test('veinticuatro teles chicas, doce por lado, con los doce sellos de distrito y el 13 sin señal', () => {
  const slots = smallTvSlots();
  assert.equal(slots.length, 24);
  assert.equal(slots.filter((s) => s.side === 'left').length, 12);
  const contents = slots.map((s) => s.content);
  for (let d = 1; d <= 12; d++) assert.ok(contents.includes(String(d)), `sello del distrito ${d}`);
  assert.equal(contents.filter((c) => c === '13').length, 1);
  for (const s of slots) {
    assert.ok(Math.abs(s.x) > HALL.screen.width / 2 + 1.2, 'no tapan la tele central');
    assert.equal(Math.sign(s.x), s.side === 'left' ? -1 : 1);
  }
});

test('las teles chicas se encienden en cascada desde el centro hacia afuera', () => {
  const slots = smallTvSlots();
  const delays = cascadeDelays(slots);
  assert.equal(delays.length, slots.length);
  const inner = slots.map((s, i) => [Math.abs(s.x), delays[i]]).sort((p, q) => p[0] - q[0]);
  assert.ok(inner[0][1] < inner.at(-1)[1]);
  assert.ok(Math.max(...delays) <= 2000, 'termina antes de que aparezca el logo');
});

test('el plano general queda dentro de la sala y muestra la tele entera en cualquier pantalla', () => {
  for (const aspect of [0.46, 0.75, 1, 1.6, 2.2]) {
    const pose = hallPoseFor(aspect);
    const cam = local(pose.position);
    assert.ok(insideHall(cam), `cámara adentro (aspect ${aspect})`);
    const distance = cam[2] - HALL.screen.z;
    const view = visibleSize(distance, aspect);
    assert.ok(view.width >= HALL.screen.width + 1, `entra la tele (aspect ${aspect})`);
  }
  const wide = visibleSize(local(hallPoseFor(1.78).position)[2] - HALL.screen.z, 1.78);
  assert.ok(wide.width >= HALL.wallWidth, 'en escritorio se ven las dos paredes de teles');
});

test('al entrar, la pantalla llena toda la vista', () => {
  for (const aspect of [0.46, 1, 1.78, 2.2]) {
    const pose = screenPoseFor(aspect);
    const cam = local(pose.position);
    const view = visibleSize(cam[2] - HALL.screen.z, aspect);
    assert.ok(view.width < HALL.screen.width && view.height < HALL.screen.height, `aspect ${aspect}`);
    assert.deepEqual(local(pose.target).map((v) => Math.round(v * 100) / 100), [0, HALL.screen.y, HALL.screen.z]);
  }
});

test('toWorld traslada al lugar de la sala, lejos del mapa', () => {
  assert.deepEqual(toWorld([1, 2, 3]), [1 + HALL_ORIGIN[0], 2 + HALL_ORIGIN[1], 3 + HALL_ORIGIN[2]]);
  assert.ok(Math.hypot(...HALL_ORIGIN) > 40);
});
