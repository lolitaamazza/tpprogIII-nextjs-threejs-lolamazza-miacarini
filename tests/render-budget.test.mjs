import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderBudget,shouldRenderFrame} from '../lib/renderBudget.js';

test('en un teléfono con pantalla densa no se multiplican los píxeles ni los cuadros',()=>{
 assert.deepEqual(renderBudget(440,'auto',3),{low:true,pixelRatio:1,frameMs:1000/30});
 assert.deepEqual(renderBudget(1280,'low',2),{low:true,pixelRatio:1,frameMs:1000/30});
});
test('escritorio conserva calidad y la preferencia alta se respeta en móvil',()=>{
 assert.deepEqual(renderBudget(1280,'auto',2),{low:false,pixelRatio:1.5,frameMs:1000/60});
 assert.equal(renderBudget(440,'high',3).low,false);
 assert.equal(renderBudget(1280,'auto',1).pixelRatio,1);
});
test('una pantalla de 120 Hz no obliga a dibujar 120 veces por segundo',()=>{
 for(const [width,expected] of [[440,30],[1280,60]]){
  let previous=-Infinity,frames=0;
  for(let i=0;i<120;i++){const timestamp=i*1000/120;if(shouldRenderFrame(timestamp,previous,renderBudget(width).frameMs)){previous=timestamp;frames++;}}
  assert.equal(frames,expected);
 }
 assert.equal(shouldRenderFrame(10,0,1000/30),false);
 assert.equal(shouldRenderFrame(1000,0,1000/30),true);
});
