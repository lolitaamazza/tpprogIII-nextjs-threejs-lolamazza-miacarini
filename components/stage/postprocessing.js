import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createTiltShift } from './tiltShift.js';

// Este módulo se descarga solo si una escena de escritorio necesita postproceso.
export function createPostprocessing(renderer,scene,camera,kind,width,height){
 const composer=new EffectComposer(renderer);
 try {
  composer.addPass(new RenderPass(scene,camera));
  const bloom=kind==='archive'?new UnrealBloomPass(new THREE.Vector2(width,height),.22,.35,.8):null;
  if(kind==='diorama')composer.addPass(createTiltShift(width,height));
  if(bloom)composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {composer,bloom};
 }catch(error){composer.passes.forEach(pass=>pass.dispose?.());composer.dispose();throw error;}
}
