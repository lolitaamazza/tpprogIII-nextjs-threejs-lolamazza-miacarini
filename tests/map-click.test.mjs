import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapClickAction } from '../lib/mapClick.js';

test('en el mapa, un clic sobre un distrito lo abre y sobre la nada no hace nada', () => {
  assert.deepEqual(mapClickAction({ scene: 'mapa', pickedId: '7' }), { type: 'select', id: '7' });
  assert.deepEqual(mapClickAction({ scene: 'mapa', pickedId: null }), { type: 'none' });
});

test('dentro de un distrito, tocar el resto del mapa cierra el panel y vuelve al mapa', () => {
  assert.deepEqual(mapClickAction({ scene: 'distrito', currentId: '12', hasDiorama: true, pickedId: null }), { type: 'map' });
});

test('dentro de un distrito, tocar otro distrito lleva a ese', () => {
  assert.deepEqual(mapClickAction({ scene: 'distrito', currentId: '12', hasDiorama: true, pickedId: '4' }), { type: 'select', id: '4' });
});

test('lo que empieza en el minijuego es del minijuego: no cierra nada', () => {
  assert.deepEqual(mapClickAction({ scene: 'distrito', currentId: '4', hasDiorama: true, onDiorama: true, pickedId: null }), { type: 'diorama' });
});

test('el borde del propio distrito no cierra un minijuego (seguramente se erró el tiro), pero sí una ficha sin juego', () => {
  assert.deepEqual(mapClickAction({ scene: 'distrito', currentId: '12', hasDiorama: true, pickedId: '12' }), { type: 'none' });
  assert.deepEqual(mapClickAction({ scene: 'distrito', currentId: '7', hasDiorama: false, pickedId: '7' }), { type: 'map' });
});

test('en el Capitolio y en el resto de las escenas el mapa no se toca: el panel tiene su propio flujo', () => {
  for (const scene of ['capitolio', 'finale', 'intro', 'games']) {
    assert.deepEqual(mapClickAction({ scene, pickedId: '3' }), { type: 'none' });
  }
});
