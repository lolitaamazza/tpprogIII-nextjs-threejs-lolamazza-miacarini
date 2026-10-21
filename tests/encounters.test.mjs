import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun,selectTribute,prepareRun,advanceRun,validateRun } from '../lib/games/simulation.js';
import { encounterFor,resolveEncounter } from '../lib/games/encounters.js';
const ready=(seed)=>prepareRun(selectTribute(createRun(seed,`run-${seed}`),'tribute-1'),{'12':'endurance','11':'plants','4':'nets'},['12','11','4']);
test('la pregunta es estable al recargar y cambia con el turno',()=>{
 const run=ready(42),first=encounterFor(run);
 assert.deepEqual(first,encounterFor(JSON.parse(JSON.stringify(run))));
 const next=advanceRun(run,{encounterId:first.id,optionId:first.options[0].id});
 assert.notEqual(encounterFor(next)?.id,first.id);
 assert.equal(advanceRun(next,{encounterId:first.id,optionId:first.options[0].id}),next);
 assert.equal(resolveEncounter(run,{encounterId:first.id,optionId:'invented'}),null);
});
test('las opciones tienen consecuencias reproducibles y consumen recursos una sola vez',()=>{
 let run=ready(42);run.turn=5; // Buscar una situación con opción que consume recursos.
 for(let i=1;i<9;i++){run.turn=i;if(encounterFor(run).options.some((o)=>o.cost))break;}
 const encounter=encounterFor(run),choice=encounter.options.find((o)=>o.cost);
 assert.ok(choice);
 const before=JSON.stringify(run);
 const decision={encounterId:encounter.id,optionId:choice.id};
 const next=advanceRun(run,decision);
 assert.deepEqual(next,advanceRun(JSON.parse(before),decision));
 assert.equal(JSON.stringify(run),before);
 assert.ok(next.events.some((e)=>e.type==='decision' && e.changes.length>0));
 run.tributes[0][choice.cost]=0;
 assert.ok(!encounterFor(run).options.some((o)=>o.id===choice.id));
 assert.equal(advanceRun(run,decision),run);
});
test('200 partidas con preguntas mantienen invariantes y llegan al final',()=>{
 for(let seed=0;seed<200;seed++){
   let run=ready(seed);const seen=new Set();
   for(let turn=0;turn<24 && run.phase==='arena';turn++){
     const encounter=encounterFor(run);if(encounter)seen.add(encounter.kind);
     run=advanceRun(run,encounter?{encounterId:encounter.id,optionId:encounter.options[(seed+turn)%encounter.options.length].id}:'shelter');
     assert.ok(validateRun(run),`seed ${seed}, turn ${turn}`);
   }
   assert.equal(run.phase,'ended');assert.equal(run.tributes.filter((t)=>t.alive).length,1);
   assert.ok(seen.size>=1);
 }
});
