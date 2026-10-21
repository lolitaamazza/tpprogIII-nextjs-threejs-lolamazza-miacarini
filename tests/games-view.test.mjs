import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gamesView} from '../lib/games/view.js';
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
