import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { tributeAppearance } from '../../../lib/games/appearance.js';
import { addTributeWardrobe } from './tributeWardrobe.js';

const templates = new Map();
function loadTemplate(kind) {
  if (!templates.has(kind)) templates.set(kind, new GLTFLoader().loadAsync(`/models/tribute-${kind}.glb`).catch(error => {
    templates.delete(kind); throw error;
  }));
  return templates.get(kind);
}

// Both source rigs use different bone axes. Work in the person's coordinate
// system and convert the desired limb direction back to each local bind pose.
export function createHumanMotion(root, model, index) {
  root.updateWorldMatrix(true, true);
  const bones = [];
  model.traverse(node => { if (node.isBone) bones.push(node); });
  const find = name => bones.find(bone => bone.name.replace(/^mixamorig_?/, '').replace(/_0?\d+$/, '') === name);
  const worldInverse = root.matrixWorld.clone().invert();
  const records = [];
  for (const side of ['Left', 'Right']) {
    for (const [joint, child, kind] of [['Arm','ForeArm','arm'],['ForeArm','Hand','forearm'],['UpLeg','Leg','thigh'],['Leg','Foot','shin']]) {
      const bone = find(side + joint), end = find(side + child);
      if (!bone || !end) continue;
      const start = bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(worldInverse);
      const direction = end.getWorldPosition(new THREE.Vector3()).applyMatrix4(worldInverse).sub(start).normalize();
      records.push({ bone, kind, side: side === 'Left' ? 1 : -1, direction, bindWorld: bone.getWorldQuaternion(new THREE.Quaternion()), rootWorld: root.getWorldQuaternion(new THREE.Quaternion()) });
    }
  }
  const head = find('Head'), spine = find('Spine2');
  const headRest = head?.quaternion.clone(), spineRest = spine?.quaternion.clone();
  const q = new THREE.Quaternion(), parentQ = new THREE.Quaternion(), rootQ = new THREE.Quaternion();
  const bindQ = new THREE.Quaternion(), direction = new THREE.Vector3(), desired = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0,1,0), zAxis = new THREE.Vector3(0,0,1);
  const headShapes = [[.96,1.03,1.02],[1.04,.98,.98],[.99,1.04,.96],[1.05,1,1.02],[.97,.98,1.04],[1.02,1.02,1]];
  if (head) head.scale.multiply(new THREE.Vector3(...headShapes[Math.floor(index/2)%6]));
  return (time, moving, reduced) => {
    const t = reduced ? index * .7 : time;
    const stride = reduced ? 0 : Math.min(1, moving);
    const phase = t * (5.3 + index % 4 * .18) + index * .71;
    root.updateWorldMatrix(true, true);
    root.getWorldQuaternion(rootQ);
    for (const record of records) {
      const { bone, kind, side } = record;
      const swing = Math.sin(phase + (side > 0 ? 0 : Math.PI)) * stride;
      if (kind === 'arm') desired.set(side*.13,-1,-swing*.34 + .035);
      else if (kind === 'forearm') desired.set(side*.06,-1,-swing*.19 + .12);
      else if (kind === 'thigh') desired.set(side*.025,-1,swing*.32);
      else desired.set(side*.02,-1,swing*.12 - Math.max(0,-swing)*.38);
      desired.normalize().applyQuaternion(rootQ);
      direction.copy(record.direction).applyQuaternion(rootQ);
      bindQ.copy(record.rootWorld).invert().premultiply(rootQ).multiply(record.bindWorld);
      q.setFromUnitVectors(direction,desired).multiply(bindQ);
      bone.parent.getWorldQuaternion(parentQ).invert();
      bone.quaternion.copy(parentQ.multiply(q));
      bone.updateWorldMatrix(false,true);
    }
    if (spine) spine.quaternion.copy(spineRest).multiply(q.setFromAxisAngle(zAxis, Math.sin(t*1.7+index)*.008));
    if (head) head.quaternion.copy(headRest).multiply(q.setFromAxisAngle(yAxis,Math.sin(t*.4+index)*.045));
    model.scale.y=1+(reduced?0:Math.sin(t*1.8+index)*.002);
  };
}

export function normalizeHumanModel(model) {
  // updateMatrixWorld also updates each SkinnedMesh's bindMatrixInverse. The
  // generic updateWorldMatrix misses that step on the centimetre-based male rig.
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true);
  const normalize=new THREE.Group();normalize.add(model);
  normalize.scale.setScalar(1.75/(bounds.max.y-bounds.min.y));
  model.position.add(new THREE.Vector3(-(bounds.max.x+bounds.min.x)/2,-bounds.min.y,-(bounds.max.z+bounds.min.z)/2));
  normalize.updateMatrixWorld(true);
  return normalize;
}

export function attachAnimatedTribute(group, index, own) {
  const look = tributeAppearance(index);
  let disposed = false, rig, motion;
  group.userData.modelStatus = 'loading';
  own({dispose(){disposed=true;rig?.removeFromParent();}});
  if (typeof window !== 'undefined') loadTemplate(look.body).then(asset => {
    if (disposed) return;
    const model = clone(asset.scene);
    const normalize=normalizeHumanModel(model);
    const skeletons = new Set();
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow=true;node.receiveShadow=true;
      node.frustumCulled=false;
      if(node.skeleton&&!skeletons.has(node.skeleton)){skeletons.add(node.skeleton);own(node.skeleton);}
      const adapt = source => {
        const mat=own(source.clone()), name=source.name;
        mat.metalness=0;mat.roughness=Math.max(.65,mat.roughness??.8);
        if (/avaturn_look|Material\.[235]$/.test(name)) mat.color.multiply(new THREE.Color(look.primary));
        if (/hair|Material\.4$/.test(name)) mat.color.multiply(new THREE.Color(look.hair));
        return mat;
      };
      node.material=Array.isArray(node.material)?node.material.map(adapt):adapt(node.material);
    });
    rig=new THREE.Group();rig.add(normalize);group.add(rig);
    motion=createHumanMotion(rig,model,index);
    motion(0,0,true);
    addTributeWardrobe(rig,model,look,own);
    rig.scale.set(look.width,look.height,1+(look.width-1)*.35);
    group.userData.modelStatus='ready';
  }).catch(error=>{group.userData.modelStatus='error';console.warn('No se pudo cargar el tributo humano:',error);});
  return {update(time,moving,reduced){motion?.(time*look.pace,moving,reduced);}};
}
