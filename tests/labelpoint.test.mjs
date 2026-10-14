import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelPoint } from '../components/stage/labelPoint.js';

const inside = (p, poly) => {
  let result = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
};
const pts = (list) => list.map(([x, y]) => ({ x, y }));

test('cuadrado: el punto queda en el centro', () => {
  const p = labelPoint(pts([[0, 0], [10, 0], [10, 10], [0, 10]]));
  assert.ok(Math.abs(p.x - 5) < 0.3 && Math.abs(p.y - 5) < 0.3, `${p.x},${p.y}`);
  assert.ok(p.distance > 4.7);
});

test('forma en L: el centro de la caja cae afuera, el punto queda adentro y en la parte gruesa', () => {
  const L = pts([[0, 0], [10, 0], [10, 3], [3, 3], [3, 10], [0, 10]]);
  assert.equal(inside({ x: 5, y: 5 }, L), false, 'el centro de la caja está en el hueco de la L');
  const p = labelPoint(L);
  assert.equal(inside(p, L), true);
  assert.ok(p.distance >= 1.4, `distancia al borde ${p.distance}`);
});

test('el resultado no depende del sentido de giro del polígono', () => {
  const L = pts([[0, 0], [10, 0], [10, 3], [3, 3], [3, 10], [0, 10]]);
  const a = labelPoint(L);
  const b = labelPoint([...L].reverse());
  assert.ok(Math.abs(a.x - b.x) < 0.3 && Math.abs(a.y - b.y) < 0.3);
});

test('polígono degenerado (menos de 3 puntos) no rompe', () => {
  assert.deepEqual(labelPoint([]), { x: 0, y: 0, distance: 0 });
  assert.deepEqual(labelPoint(pts([[2, 4]])), { x: 2, y: 4, distance: 0 });
});
