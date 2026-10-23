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

test('la escena de prueba del Distrito 12 tiene su ruta; las demás escenas todavía no existen', () => {
  assert.deepEqual(routeFromPathname('/escena/12'), { scene: 'escena', districtId: '12' });
  for (const p of ['/escena/99', '/escena/4', '/escena']) assert.deepEqual(routeFromPathname(p), { scene: 'mapa', districtId: null }, p);
});
