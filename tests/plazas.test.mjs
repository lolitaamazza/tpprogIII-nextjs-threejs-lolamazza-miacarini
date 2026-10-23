import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAZA_ORDER, TRAIN_SECONDS, plazaDraws } from '../lib/plazas.js';

const papers = { 12: 7, 11: 4, 4: 3 };

test('el tren pasa por las plazas del 12, el 11 y el 4, en ese orden', () => {
  assert.deepEqual(PLAZA_ORDER, ['12', '11', '4']);
  assert.ok(TRAIN_SECONDS >= 4 && TRAIN_SECONDS <= 6);
});

test('solo en la plaza de quien salió en la urna sale su nombre; en las otras, otro chico o chica del distrito', () => {
  const draws = plazaDraws({ protagonist: 'tribute-21' }, papers);
  assert.deepEqual(draws.map((d) => [d.district, d.name, d.protagonist]), [['12', 'Cardo', false], ['11', 'Oliva', true], ['4', 'Coral', false]]);
  assert.equal(draws[1].line, 'Su nombre estaba cuatro veces en la urna.');
  assert.equal(draws[0].line, 'Ash se salvó este año. Su nombre estaba siete veces en la urna.');
});

test('sin edición todavía no hay papeles para sacar', () => {
  assert.deepEqual(plazaDraws(null, papers), []);
  assert.deepEqual(plazaDraws({ protagonist: 'tribute-3' }, papers), []);
});

test('los textos son claros', () => {
  for (const d of plazaDraws({ protagonist: 'tribute-24' }, papers)) assert.ok(!d.line.includes(':') && !/tesela/i.test(d.line), d.line);
});
