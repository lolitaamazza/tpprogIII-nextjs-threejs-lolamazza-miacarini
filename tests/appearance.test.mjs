import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tributeAppearance} from '../lib/games/appearance.js';
test('los 24 tributos mantienen identidades visuales distintas y reproducibles',()=>{
 const looks=Array.from({length:24},(_,i)=>tributeAppearance(i));
 assert.equal(new Set(looks.map(({primary,height,width,equipment})=>JSON.stringify([primary,height,width,equipment]))).size,24);
 looks.forEach((look,i)=>{assert.deepEqual(look,tributeAppearance(i));assert.equal(look.district,Math.floor(i/2)+1);assert.ok(look.height>=.9&&look.height<=1.1);});
});
