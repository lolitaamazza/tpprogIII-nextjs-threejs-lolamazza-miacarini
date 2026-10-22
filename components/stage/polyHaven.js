import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const maps=new Map();
// Local CC0 assets. Colour is sRGB; normal/roughness maps stay in linear space.
export function applyPolyMaterial(material,kind,repeat=1){
 if(typeof window==='undefined')return material;
 for(const [slot,file] of [['map','color'],['normalMap','normal'],['roughnessMap','roughness']]){
  const key=`${kind}:${file}:${repeat}`;
  if(!maps.has(key)){
   const texture=new THREE.TextureLoader().load(`/materials/polyhaven/${kind}-${file}.jpg`);
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.setScalar(repeat);texture.colorSpace=file==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.userData.shared=true;maps.set(key,texture);
  }
  material[slot]=maps.get(key);
 }
 material.normalScale.setScalar(.55);material.needsUpdate=true;return material;
}
let boulder;
export function loadPolyBoulder(){
 if(typeof window==='undefined')return Promise.resolve(null);
 boulder??=new GLTFLoader().loadAsync('/models/polyhaven/boulder_01/boulder.gltf').then(g=>g.scene).catch(e=>{boulder=null;throw e;});return boulder;
}
