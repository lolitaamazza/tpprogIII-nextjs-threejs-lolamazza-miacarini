import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,selectTribute,prepareRun,validateRun,advanceRun} from '../lib/games/simulation.js';
import {drawOrderFor,drawPaper,finishReaping,reapingState} from '../lib/games/reaping.js';
import {encounterFor} from '../lib/games/encounters.js';
import {visualCueFor} from '../lib/games/visualCue.js';
import {createArenaEffects} from '../components/stage/games/arenaEffects.js';
import * as THREE from 'three';
test('24 extracciones únicas, persistentes, sin alterar el azar de la arena',()=>{
 let run=createRun(123,'urn-test');const order=drawOrderFor(run),rng=run.rng;
 assert.equal(new Set(order).size,24);assert.equal(finishReaping(run),run);
 for(let i=0;i<24;i++){run=drawPaper(JSON.parse(JSON.stringify(run)));assert.equal(run.drawnCount,i+1);assert.ok(validateRun(run));assert.deepEqual(drawOrderFor(run),order);}
 assert.equal(run.rng,rng);assert.equal(run.revision,0);assert.equal(drawPaper(run),run);run=finishReaping(run);assert.ok(reapingState(run).complete);assert.ok(validateRun(run));
 run=prepareRun(selectTribute(run,'tribute-1'),{'12':'endurance','11':'plants','4':'fishing'},['12','11','4']);
 while(run.phase==='arena')run=advanceRun(run);assert.ok(validateRun(run));
});
test('extraer todos y partidas anteriores mantienen un formato válido',()=>{const old=createRun(2,'old');assert.ok(validateRun(old));const run=finishReaping(drawPaper(old,true));assert.equal(run.drawnCount,24);assert.ok(validateRun(run));assert.equal(validateRun({...run,drawnCount:25}),false);assert.equal(validateRun({...run,drawnCount:2}),false);});
test('el incendio se muestra con la pregunta pendiente y después de decidir',()=>{
 let run=prepareRun(selectTribute(createRun(7,'fire-test'),'tribute-1'),{'12':'endurance','11':'plants','4':'fishing'},['12','11','4']);
 for(let t=2;t<24;t+=2){const candidate={...run,turn:t};if(encounterFor(candidate)?.kind==='fire'){run=candidate;break;}}
 assert.equal(visualCueFor(run).kind,'fire');assert.equal(visualCueFor(run).pending,true);
 const e=encounterFor(run);run=advanceRun(run,{encounterId:e.id,optionId:e.options[0].id});assert.equal(visualCueFor(run).kind,'fire');assert.equal(visualCueFor(run).pending,false);
 assert.equal(visualCueFor({...run,phase:'ended'}),null);
});
test('efectos 3D visibles en mesa y seguimiento; pausa reducida y cambio de evento',()=>{
 const resources=new Set(),parent=new THREE.Group();const fx=createArenaEffects(parent,v=>{resources.add(v);return v;},()=>0);
 const base=createRun(7,'fx');let run={...base,phase:'arena',selectedId:'tribute-1',turn:2};
 for(let t=2;t<24;t+=2){run={...run,turn:t};if(encounterFor(run)?.kind==='fire')break;}
 fx.setRun(run,new THREE.Vector3(1,0,1));assert.equal(fx.group.userData.cue,'fire');assert.ok(fx.group.visible);fx.update(.016,2,false,false,true);fx.update(.016,3,true,true,false);fx.setRun({...run,phase:'ended'},null);assert.equal(fx.group.visible,false);resources.forEach(v=>v.dispose());
});
