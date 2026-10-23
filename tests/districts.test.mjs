import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISTRICTS, PLAYABLE_IDS, DISTRICT_ROUTE_IDS, MAP_IDS, getDistrict, isDistrictRouteId,
} from '../data/districts.js';

test('hay 14 piezas con ids únicos (1–13 y c)', () => {
  assert.equal(DISTRICTS.length, 14);
  assert.deepEqual(DISTRICTS.map((d) => d.id).sort(), [...MAP_IDS].sort());
  assert.equal(new Set(DISTRICTS.map((d) => d.id)).size, 14);
});

test('los tres días tienen juego, capa y acción; los otros nueve distritos se exploran', () => {
  assert.deepEqual(PLAYABLE_IDS, ['12', '11', '4']);
  assert.deepEqual(DISTRICTS.filter((d) => d.playable).map((d) => d.id).sort(), ['11', '12', '4']);
  assert.deepEqual(DISTRICTS.filter((d) => d.explore).map((d) => Number(d.id)).sort((a, b) => a - b), [1, 2, 3, 5, 6, 7, 8, 9, 10]);

  for (const id of PLAYABLE_IDS) {
    const d = getDistrict(id);
    assert.ok(['percusion','silbido','pad'].includes(d.layer));
    assert.ok(d.instruction.length > 10);
    assert.ok(d.actionLabel.length > 2);
    assert.ok(Number.isInteger(d.actionsToComplete) && d.actionsToComplete > 0);
  }
});

test('colores en hex de 6 dígitos', () => {
  for (const d of DISTRICTS) {
    assert.match(d.color, /^#[0-9a-f]{6}$/i, d.id);
    assert.match(d.litColor, /^#[0-9a-f]{6}$/i, d.id);
  }
});

test('rutas de distrito: 1–13, nunca c', () => {
  assert.equal(DISTRICT_ROUTE_IDS.length, 13);
  assert.ok(isDistrictRouteId('12'));
  assert.ok(isDistrictRouteId(13));
  assert.ok(!isDistrictRouteId('c'));
  assert.ok(!isDistrictRouteId('99'));
  assert.ok(!isDistrictRouteId(undefined));
  assert.equal(getDistrict('nope'), null);
  assert.equal(getDistrict('13').classified, true);
});
