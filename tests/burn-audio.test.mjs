import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBurnAudio} from '../lib/burnAudio.js';
function harness(play=async()=>{}){
 const calls=[],audio={volume:1,muted:false,play(){calls.push('play');return play();},pause(){calls.push('pause');},removeAttribute(k){calls.push(`remove:${k}`);},load(){calls.push('load');}};
 let clock=0,id=0;const timers=new Map();
 const player=createBurnAudio(audio,{now:()=>clock,every:fn=>{timers.set(++id,fn);return id;},cancel:key=>timers.delete(key),fadeInMs:900,fadeOutMs:850});
 return {audio,calls,player,timers,advance(ms){clock+=ms;for(const fn of [...timers.values()])fn();}};
}
test('audio invisible: arranca con fundido y respeta el silencio',async()=>{
 const h=harness();await h.player.play();assert.equal(h.audio.volume,0);h.advance(450);assert.equal(h.audio.volume,.375);h.advance(450);assert.equal(h.audio.volume,.75);assert.equal(h.timers.size,0);h.player.setMuted(true);assert.equal(h.audio.muted,true);h.player.setMuted(false);assert.equal(h.audio.muted,false);h.player.dispose();
});
test('salir desvanece, pausa y no reinicia con un gesto tardío',async()=>{
 const h=harness();await h.player.play();h.advance(900);h.player.leave();h.advance(850);assert.equal(h.audio.volume,0);assert.ok(h.calls.includes('pause'));await h.player.play();assert.equal(h.calls.filter(c=>c==='play').length,1);h.player.dispose();assert.equal(h.timers.size,0);assert.ok(h.calls.includes('remove:src'));assert.ok(h.calls.includes('load'));
});
test('si el navegador bloquea el inicio puede reintentar con el siguiente gesto',async()=>{
 let attempts=0;const h=harness(async()=>{if(++attempts===1)throw new Error('autoplay');});await h.player.play();assert.equal(h.timers.size,0);await h.player.play();assert.equal(attempts,2);h.advance(900);assert.equal(h.audio.volume,.75);h.player.dispose();
});
test('una reproducción pendiente no se duplica y no revive tras desmontar',async()=>{
 let finish;const h=harness(()=>new Promise(resolve=>{finish=resolve;}));const pending=h.player.play();await h.player.play();assert.equal(h.calls.filter(c=>c==='play').length,1);h.player.dispose();finish();await pending;assert.equal(h.timers.size,0);assert.equal(h.audio.volume,0);
});
