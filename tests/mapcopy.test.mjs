import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapIntroCopy } from '../lib/mapCopy.js';

test('cada día cuenta cuánto falta para la Cosecha y a quién le toca', () => {
  const one = mapIntroCopy({ phase: 'day', day: { index: 0, district: '12' } });
  assert.equal(one.title, 'Faltan tres días para la Cosecha.');
  assert.equal(one.text, 'Día 1 · Ash trabaja en la mina del Distrito 12.');
  assert.equal(mapIntroCopy({ phase: 'day', day: { index: 1, district: '11' } }).title, 'Faltan dos días.');
  assert.match(mapIntroCopy({ phase: 'day', day: { index: 2, district: '4' } }).text, /Marin/);
  assert.equal(one.action, null);
});

test('con una decisión pendiente, lleva de vuelta al distrito', () => {
  const copy = mapIntroCopy({ phase: 'decision', pending: { district: '11', cost: 2 } });
  assert.match(copy.text, /Oliva/);
  assert.deepEqual(copy.action, { label: 'Volver al Distrito 11', href: '/distrito/11' });
});

test('hecho el tercer día: a la plaza; terminados los Juegos: al Capitolio; terminado todo, sin oscuridad', () => {
  assert.deepEqual(mapIntroCopy({ phase: 'cosecha' }).action, { label: 'Ir a la plaza', href: '/cosecha' });
  assert.equal(mapIntroCopy({ phase: 'cosecha' }).title, 'Hoy es la Cosecha.');
  assert.deepEqual(mapIntroCopy({ phase: 'games-ended' }).action, { label: 'Ir al Capitolio', href: '/capitolio' });
  const done = mapIntroCopy({ phase: 'games-ended', completed: true });
  assert.equal(done.title, 'Panem ya no está a oscuras.');
  assert.equal(done.action, null);
});

test('todas llevan el mismo antetítulo del mapa', () => {
  for (const args of [{ phase: 'day', day: { index: 0, district: '12' } }, { phase: 'cosecha' }, { phase: 'games-ended', completed: true }]) {
    assert.equal(mapIntroCopy(args).eyebrow, 'MAPA DE PANEM · 13 DISTRITOS');
  }
});

test('el botón del archivo dice el día y cuántos fragmentos hay', async () => {
  const { archiveLabel } = await import('../lib/mapCopy.js');
  assert.deepEqual(archiveLabel({ phase: 'day', day: { index: 1, district: '11' }, found: 4 }), { day: 'Día 2/3', fragments: '4/13' });
  assert.equal(archiveLabel({ phase: 'decision', pending: { district: '4', cost: 1 }, found: 0 }).day, 'Día 3/3');
  assert.equal(archiveLabel({ phase: 'cosecha', found: 13 }).day, 'Cosecha');
  assert.equal(archiveLabel({ phase: 'games-ended', found: 2 }).day, 'Cosecha');
});
