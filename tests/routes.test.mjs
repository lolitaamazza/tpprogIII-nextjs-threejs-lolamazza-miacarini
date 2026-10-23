import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeFromPathname } from '../lib/routes.js';

test('rutas conocidas', () => {
  assert.deepEqual(routeFromPathname('/'), { scene: 'intro', districtId: null });
  assert.deepEqual(routeFromPathname('/mapa'), { scene: 'mapa', districtId: null });
  assert.deepEqual(routeFromPathname('/distrito/12'), { scene: 'distrito', districtId: '12' });
  assert.deepEqual(routeFromPathname('/distrito/13/'), { scene: 'distrito', districtId: '13' });
  assert.deepEqual(routeFromPathname('/capitolio'), { scene: 'capitolio', districtId: 'c' });
});

test('rutas inválidas caen en el mapa', () => {
  for (const p of ['/distrito/99', '/distrito/c', '/distrito/abc', '/distrito', '/otra', null, undefined]) {
    assert.deepEqual(routeFromPathname(p), { scene: 'mapa', districtId: null }, String(p));
  }
});

test('las escenas de los tres días tienen su ruta; las demás todavía no existen', () => {
  for (const id of ['12', '11', '4']) assert.deepEqual(routeFromPathname(`/escena/${id}`), { scene: 'escena', districtId: id });
  for (const p of ['/escena/99', '/escena/7', '/escena']) assert.deepEqual(routeFromPathname(p), { scene: 'mapa', districtId: null }, p);
});

test('el tren a un distrito con escena y la Cosecha por plazas tienen su ruta', async () => {
  const { districtPath } = await import('../lib/routes.js');
  for (const id of ['12', '11', '4']) assert.deepEqual(routeFromPathname(`/tren/${id}`), { scene: 'tren', districtId: id });
  assert.deepEqual(routeFromPathname('/tren/7'), { scene: 'mapa', districtId: null });
  assert.deepEqual(routeFromPathname('/plazas'), { scene: 'plazas', districtId: null });
  assert.equal(districtPath('12'), '/tren/12', 'los distritos con escena se viajan en tren');
  assert.equal(districtPath('7'), '/distrito/7', 'los demás siguen yendo a su maqueta');
});
