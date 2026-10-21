import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {normalizeHumanModel,createHumanMotion} from '../components/stage/games/animatedTribute.js';

for(const [kind,index] of [['woman',0],['man',1]])test(`${kind}: escala humana, brazos bajos y esqueleto estable al caminar`,async()=>{
 const bytes=await readFile(new URL(`../public/models/tribute-${kind}.glb`,import.meta.url));
 const loader=new GLTFLoader();
 // Geometry and the real bind matrices are tested; no DOM/image decoder needed.
 loader.register(()=>({name:'TEST_TEXTURES',loadTexture(){return Promise.resolve(new THREE.Texture());}}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const model=clone(asset.scene),rig=new THREE.Group();rig.add(normalizeHumanModel(model));
 const motion=createHumanMotion(rig,model,index);
 const bone=name=>{let result;model.traverse(n=>{if(n.isBone&&n.name.replace(/^mixamorig_?/,'').replace(/_0?\d+$/,'')===name)result=n;});return result;};
 for(const [time,moving] of [[0,0],[.3,1],[1,1],[2,0]]){
  motion(time,moving,false);rig.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(rig,true),size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.y>1.5&&size.y<2.1,`altura ${size.y}`);
  assert.ok(size.x<1.1,`brazos extendidos o escala incorrecta ${size.x}`);
  assert.ok(Math.abs(bounds.min.y)<.2,`pies fuera del suelo ${bounds.min.y}`);
  for(const side of ['Left','Right'])assert.ok(bone(side+'Hand').getWorldPosition(new THREE.Vector3()).y<bone(side+'Shoulder').getWorldPosition(new THREE.Vector3()).y-.2);
 }
});
