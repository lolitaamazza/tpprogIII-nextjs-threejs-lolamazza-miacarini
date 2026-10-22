import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapIntroCopy } from '../lib/mapCopy.js';

test('sin emblemas: Panem sigue a oscuras', () => {
  const copy = mapIntroCopy({ litCount: 0, completed: false });
  assert.equal(copy.title, 'Panem está a oscuras.');
  assert.match(copy.text, /cualquiera de los doce.*tres emblemas/);
});

test('con 1 o 2 emblemas: cuenta cuántos faltan, en singular y plural', () => {
  const one = mapIntroCopy({ litCount: 1, completed: false });
  assert.equal(one.title, 'La chispa avanza.');
  assert.match(one.text, /1 de 3 distritos encendidos\. Faltan 2/);
  assert.match(mapIntroCopy({ litCount: 2, completed: false }).text, /2 de 3 distritos encendidos\. Falta 1:/);
});

test('con los 3 emblemas: invita a entrar al Capitolio', () => {
  const copy = mapIntroCopy({ litCount: 3, completed: false });
  assert.equal(copy.title, 'La señal está lista.');
  assert.match(copy.text, /Capitolio/);
});

test('terminado el recorrido: ya no se habla de oscuridad', () => {
  const copy = mapIntroCopy({ litCount: 3, completed: true });
  assert.equal(copy.title, 'Panem ya no está a oscuras.');
  assert.doesNotMatch(copy.text, /oscuras|chispa/);
});

test('todas devuelven el mismo antetítulo del mapa', () => {
  for (const args of [{ litCount: 0, completed: false }, { litCount: 3, completed: true }]) {
    assert.equal(mapIntroCopy(args).eyebrow, 'MAPA DE PANEM · 13 DISTRITOS');
  }
});
