import {encounterFor} from './encounters.js';
export function visualCueFor(run){
 if(run?.phase!=='arena')return null;
 const pending=encounterFor(run);
 if(pending)return {kind:pending.kind,key:pending.id,pending:true};
 const decision=run.events.findLast(e=>e.turn===run.turn&&e.type==='decision');
 if(decision)return {kind:decision.situation,key:`${run.id}:${run.turn}:${decision.situation}`,pending:false};
 if(run.events.some(e=>e.turn===run.turn&&e.type==='hazard'))return {kind:'rain',key:`${run.id}:${run.turn}:rain`,pending:false};
 return null;
}
