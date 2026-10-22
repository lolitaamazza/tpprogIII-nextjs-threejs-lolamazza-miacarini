'use client';
import {useEffect,useRef} from 'react';
import {BURN_AUDIO_SRC,BURN_TIMING} from '@/lib/burn';
import {createBurnAudio} from '@/lib/burnAudio';
import {usePanem} from './PanemProvider';

// Audio nativo: no iframe, video, marca, controles ni elementos visibles en la secuencia.
export default function BurnSong({leaving}){
 const {audioState}=usePanem(),controller=useRef(null),sound=useRef(audioState);
 useEffect(()=>{
  sound.current=audioState;
  controller.current?.setMuted(audioState!=='on');
  if(audioState==='on')controller.current?.play();
 },[audioState]);
 useEffect(()=>{
  const audio=new Audio(BURN_AUDIO_SRC);audio.preload='none';
  const player=createBurnAudio(audio,{fadeInMs:BURN_TIMING.songFadeInMs,fadeOutMs:BURN_TIMING.leaveMs});
  controller.current=player;player.setMuted(sound.current!=='on');
  const retry=()=>{if(sound.current==='on')player.play();};
  retry();window.addEventListener('pointerdown',retry);window.addEventListener('keydown',retry);
  return()=>{window.removeEventListener('pointerdown',retry);window.removeEventListener('keydown',retry);player.dispose();controller.current=null;};
 },[]);
 useEffect(()=>{if(leaving)controller.current?.leave();},[leaving]);
 return null;
}
