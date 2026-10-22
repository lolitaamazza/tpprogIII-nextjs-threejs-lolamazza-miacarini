// A separate seeded sequence: drawing names never changes the arena's RNG.
export function drawOrderFor(run){
 const ids=run.tributes.map(t=>t.id);let seed=run.seed>>>0;
 for(let i=ids.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 return ids;
}
export function reapingState(run){return {count:run?.drawnCount??0,complete:run?.phase!=='reaping'||run?.reapingComplete===true};}
export function drawPaper(run,all=false){
 if(!run||run.phase!=='reaping'||run.reapingComplete||reapingState(run).count>=24)return run;
 return {...run,drawnCount:all?24:reapingState(run).count+1};
}
export function finishReaping(run){
 if(!run||run.phase!=='reaping'||reapingState(run).count!==24||run.reapingComplete)return run;
 return {...run,reapingComplete:true};
}
