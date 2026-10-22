import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WORKSHOPS,workshopTarget} from '../data/workshops.js';
import {buildWorkshop} from '../components/stage/dioramas/workshop.js';
import {canEnterCapitol,normalizeProgress} from '../lib/progress.js';
import {createRun,selectTribute,prepareRun,trainingFor,validateRun,advanceRun} from '../lib/games/simulation.js';
import {drawPaper,finishReaping} from '../lib/games/reaping.js';

function harness(id){let completed=0;const d=buildWorkshop(id,{origin:{x:0,z:0},onProgress(){},onComplete(){completed++;},sfx:{play(){}}});return {d,done:()=>completed,wait(predicate){for(let i=0;i<5000;i++){d.update(.016);if(predicate(d.getState()))return;}assert.fail('No llegó el momento esperado');}};}
for(const [id,w] of Object.entries(WORKSHOPS))test(`D${id}: ${w.label}, victoria única y recursos liberados`,()=>{
 const h=harness(id),{d}=h;
 while(d.getState().match.phase==='playing'){
  h.wait(()=>true); // mueve el reloj sin depender del tiempo real
  if(w.mode==='sequence'){
   h.wait(s=>!s.memorizing);const seq=d.getState().sequence;for(const key of seq)d.input(key);
  }else if(w.mode==='choice'){
   d.input(workshopTarget(id,d.getState().match.score));
  }else{
   if(w.mode==='hold')d.performAction();
   h.wait(s=>Math.abs(s.cursor-s.target)<.04);d.performAction();
  }
  for(let i=0;i<35;i++)d.update(.016);
 }
 assert.equal(d.getState().match.phase,'won');assert.equal(h.done(),1);d.performAction();assert.equal(h.done(),1);d.dispose();
});
for(const id of ['1','3','5','6'])test(`D${id}: perder y reintentar no entrega emblemas`,()=>{
 const h=harness(id),{d}=h,w=WORKSHOPS[id];
 for(let n=0;n<3;n++){
  if(w.mode==='sequence'){h.wait(s=>!s.memorizing);d.input((d.getState().sequence[0]+1)%4);}
  else if(w.mode==='choice')d.input((workshopTarget(id,0)+1)%4);
  else {if(w.mode==='hold')d.performAction();h.wait(s=>Math.abs(s.cursor-s.target)>.3);d.performAction();}
  for(let i=0;i<35;i++)d.update(.016);
 }
 assert.equal(d.getState().match.phase,'lost');assert.equal(h.done(),0);d.retry();assert.equal(d.getState().match.phase,'playing');assert.equal(d.getState().match.score,0);d.dispose();
});
test('cualquier combinación de tres distritos desbloquea y entrena una partida válida',()=>{
 for(const ids of [['1','5','8'],['2','6','10'],['3','7','9'],['12','11','4']]){
  assert.ok(canEnterCapitol(normalizeProgress({litDistricts:ids})));
  assert.equal(canEnterCapitol({litDistricts:[ids[0],ids[0],ids[1],'13','c']}),false);
  const choices=Object.fromEntries(trainingFor(ids).map(t=>[t.district,t.options[0].id]));
  const run=prepareRun(selectTribute(createRun(51,'new-districts'),'tribute-1'),choices,ids);
  assert.equal(run.phase,'arena');assert.ok(validateRun(run));assert.ok(validateRun(advanceRun(run)));
 }
});
test('con más de tres emblemas solo se aplican tres mejoras; no hay ventajas acumuladas',()=>{
 const ids=Object.keys(WORKSHOPS),choices=Object.fromEntries(trainingFor(ids).map(t=>[t.district,t.options[0].id]));
 const run=prepareRun(selectTribute(createRun(9,'all'),'tribute-1'),choices,ids);
 assert.equal(Object.keys(run.training).length,3);assert.ok(validateRun(run));
});
test('saltear la Cosecha revela los 24 y abre el escenario sin alterar la simulación',()=>{
 const initial=createRun(17,'skip'),next=finishReaping(drawPaper(initial,true));
 assert.equal(next.drawnCount,24);assert.equal(next.reapingComplete,true);assert.equal(next.rng,initial.rng);assert.equal(next.revision,0);assert.ok(validateRun(next));assert.equal(finishReaping(drawPaper(next,true)),next);
});
