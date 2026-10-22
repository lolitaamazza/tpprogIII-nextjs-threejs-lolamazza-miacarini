// Audio sin controles visuales. Separado de React para comprobar pausa, fundidos y liberación.
export function createBurnAudio(audio, {fadeInMs=900,fadeOutMs=850,volume=.75,now=()=>performance.now(),every=setInterval,cancel=clearInterval}={}){
 let disposed=false,leaving=false,timer=null,playing=false,pending=false;
 const stopFade=()=>{if(timer!==null)cancel(timer);timer=null;};
 function fade(to,duration){
  stopFade();const from=audio.volume,started=now();
  timer=every(()=>{
   if(disposed)return;
   const t=Math.min(1,Math.max(0,(now()-started)/duration));
   audio.volume=from+(to-from)*t;
   if(t===1){stopFade();if(to===0)audio.pause();}
  },40);
 }
 audio.volume=0;
 return {
  async play(){
   if(disposed||leaving||pending||playing)return;
   pending=true;
   try{
    await audio.play();
    if(disposed||leaving){audio.pause();return;}
    playing=true;fade(volume,fadeInMs);
   }catch{/* Un gesto posterior puede reintentar si el navegador bloqueó el inicio. */}
   finally{pending=false;}
  },
  setMuted(muted){audio.muted=muted;},
  leave(){if(disposed||leaving)return;leaving=true;fade(0,fadeOutMs);},
  dispose(){if(disposed)return;disposed=true;stopFade();audio.pause();audio.removeAttribute('src');audio.load();},
 };
}
