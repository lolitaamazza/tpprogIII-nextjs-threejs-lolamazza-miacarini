import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

let template;
export function loadArenaModel() {
 if(!template){
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  template=Promise.all([loader.loadAsync('/models/hunger-games-arena.glb'),fetch('/models/arena-ground.json').then(r=>{if(!r.ok)throw new Error('No se pudo recuperar el terreno');return r.json();})]).catch(error=>{template=null;throw error;});
 }
 return template;
}
export function heightOnArena(ground,x,z){
 const n=ground.size;
 const gx=THREE.MathUtils.clamp((x/ground.diameter+.5)*(n-1),0,n-1);
 const gz=THREE.MathUtils.clamp((z/ground.diameter+.5)*(n-1),0,n-1);
 const ix=Math.floor(gx),iz=Math.floor(gz),jx=Math.min(ix+1,n-1),jz=Math.min(iz+1,n-1);
 const a=ground.heights[iz*n+ix],b=ground.heights[iz*n+jx],c=ground.heights[jz*n+ix],d=ground.heights[jz*n+jx];
 const fallback=[a,b,c,d].find(v=>v!==null)??0;
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a??fallback,b??fallback,gx-ix),THREE.MathUtils.lerp(c??fallback,d??fallback,gx-ix),gz-iz)+.025;
}
export function instantiateArena(asset,ground,own){
 const model=asset.scene.clone(true);model.name='the-hunger-games-arena-flashness';
 model.scale.setScalar(ground.scale);
 model.position.set(-ground.center[0]*ground.scale,-ground.base,-ground.center[1]*ground.scale);
 model.traverse(node=>{
  if(!node.isMesh)return;
  node.receiveShadow=true;
  // A single sun shadow pass over the forest is expensive and obscures the clearing.
  node.castShadow=false;
  const adapt=source=>{const mat=own(source.clone());mat.metalness=0;mat.roughness=.95;return mat;};
  node.material=Array.isArray(node.material)?node.material.map(adapt):adapt(node.material);
 });
 return model;
}
