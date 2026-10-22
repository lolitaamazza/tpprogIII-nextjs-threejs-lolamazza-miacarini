import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dioramaLook } from '../lib/dioramaLook.js';
import { DIORAMA_ASSETS } from '../lib/dioramaAssets.js';

test('cada minijuego tiene su luz; el mapa y los distritos sin juego vuelven a la luz del mapa (null)', () => {
  for (const id of ['12', '11', '4']) {
    const look = dioramaLook(id);
    assert.ok(look, id);
    assert.equal(look.env, DIORAMA_ASSETS[id].env, 'el entorno es el del manifiesto');
    for (const value of [look.envIntensity, look.sun.intensity, look.ambient, ...look.sun.position]) assert.ok(Number.isFinite(value), `${id}: ${value}`);
    assert.match(look.sun.color, /^#[0-9a-f]{6}$/i);
  }
  for (const id of ['13', 'c', null, undefined]) assert.equal(dioramaLook(id), null);
});

test('el carbón es de amanecer (sol cálido y bajo); la pesca y el campo, de día', () => {
  assert.equal(dioramaLook('12').env, '/models/districts/dawn.hdr');
  assert.ok(dioramaLook('12').sun.position[1] < dioramaLook('4').sun.position[1], 'el sol del amanecer está más bajo');
  assert.equal(dioramaLook('4').env, '/models/districts/day.hdr');
  assert.equal(dioramaLook('11').env, '/models/districts/day.hdr');
});

test('los nueve talleres nuevos usan el entorno HDRI diurno',()=>{for(const id of [1,2,3,5,6,7,8,9,10])assert.equal(dioramaLook(String(id)).env,'/models/districts/day.hdr');});
