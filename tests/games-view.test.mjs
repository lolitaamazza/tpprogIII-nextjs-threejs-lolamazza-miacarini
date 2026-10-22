import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gamesView,autoAdvance,AUTO_ADVANCE} from '../lib/games/view.js';
test('una partida lista se muestra aunque la URL siga en Cosecha',()=>{
 for(const phase of ['preparation','arena','ended']){
 const view=gamesView({chapter:'reaping',run:{phase},ready:true,gate:'allowed'});
 assert.equal(view.canShow,true);assert.equal(view.chapter,phase);assert.ok(view.redirect);
 }
});
test('el reinicio muestra Cosecha de inmediato sin esperar la navegación de desenlace',()=>{
 const view=gamesView({chapter:'ended',run:{phase:'reaping'},ready:true,gate:'allowed'});
 assert.equal(view.canShow,true);assert.equal(view.chapter,'reaping');assert.equal(view.redirect,'/cosecha');
});
test('no muestra ni redirige partidas antes de hidratar o sin emblemas',()=>{
 for(const [ready,gate] of [[false,'allowed'],[true,'loading'],[true,'blocked']]){
 const view=gamesView({chapter:'reaping',run:{phase:'arena'},ready,gate});
 assert.equal(view.canShow,false);assert.equal(view.redirect,null);
 }
 assert.equal(gamesView({chapter:'reaping',run:null,ready:true,gate:'allowed'}).canShow,true);
});
test('sin pregunta, la arena sigue sola: con tu tributo en pie da tiempo a leer; caído, va más rápido',()=>{
 const run={phase:'arena',selectedId:'a',tributes:[{id:'a',alive:true}]};
 assert.equal(autoAdvance({run,encounter:null,paused:false}),AUTO_ADVANCE.watching);
 const fallen={...run,tributes:[{id:'a',alive:false}]};
 assert.equal(autoAdvance({run:fallen,encounter:null,paused:false}),AUTO_ADVANCE.fallen);
 assert.ok(AUTO_ADVANCE.fallen<AUTO_ADVANCE.watching);
});
test('no sigue sola con una pregunta pendiente, en pausa ni fuera de la arena',()=>{
 const run={phase:'arena',selectedId:'a',tributes:[{id:'a',alive:true}]};
 assert.equal(autoAdvance({run,encounter:{id:'x'},paused:false}),null);
 assert.equal(autoAdvance({run,encounter:null,paused:true}),null);
 assert.equal(autoAdvance({run:{...run,phase:'ended'},encounter:null,paused:false}),null);
 assert.equal(autoAdvance({run:null,encounter:null,paused:false}),null);
});
