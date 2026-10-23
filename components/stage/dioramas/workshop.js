import * as THREE from 'three';
import { WORKSHOPS, workshopSequence, workshopTarget, workshopHit } from '../../../data/workshops.js';
import { createMatch, resolve, retry as retryMatch, helpLevel } from '../../../lib/minigame.js';
import { createDioramaBase, growIn, disposeObject, createBurst, mat } from './common.js';
import { applyPolyMaterial } from '../polyHaven.js';

// Una estación física por industria. Cuatro reglas: precisión, carga, memoria y clasificación.
// Con `explore` es solo la maqueta (sin pista ni estaciones): se recorre y se buscan fragmentos.
export function buildWorkshop(id,{origin,completed,explore=false,onProgress,onComplete,onMatch=()=>{},sfx,rig}){
 const w=WORKSHOPS[id],{group}=createDioramaBase(origin,w.color);
 const steel=mat('#87918e',{metalness:.75,roughness:.32,flatShading:false});
 const timber=applyPolyMaterial(mat('#c5a47a',{flatShading:false}),'wood',2);
 const stone=applyPolyMaterial(mat('#c6c3b5',{flatShading:false}),'stone',2);
 const accent=mat(w.color,{metalness:.3,roughness:.3,flatShading:false});
 const gold=mat('#edc85a',{emissive:'#a07513',emissiveIntensity:.5,metalness:.5,roughness:.3});
 function add(geo,material,x,y,z,parent=group){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
 add(new THREE.BoxGeometry(1.55,.09,.85),timber,0,.22,0);
 for(const x of [-.65,.65])for(const z of [-.3,.3])add(new THREE.BoxGeometry(.07,.2,.07),steel,x,.12,z);
 const piece=new THREE.Group();piece.position.set(0,.38,0);group.add(piece);
 if(w.shape==='gem'){
  add(new THREE.CylinderGeometry(.25,.28,.07,48),steel,0,0,0,piece);
  const gem=add(new THREE.OctahedronGeometry(.20,1),mat(w.color,{metalness:.45,roughness:.08,flatShading:false}),0,.23,0,piece);gem.rotation.z=.25;
 }else if(w.shape==='stone'){
  for(let i=0;i<6;i++)add(new THREE.BoxGeometry(.25,.12,.2),stone,(i%3-1)*.28,Math.floor(i/3)*.13,0,piece);
 }else if(w.shape==='wood'){
  const trunk=add(new THREE.CylinderGeometry(.14,.17,.85,32),timber,0,.06,0,piece);trunk.rotation.z=Math.PI/2;
  const saw=add(new THREE.BoxGeometry(.02,.32,.38),steel,0,.28,0,piece);saw.rotation.z=-.2;
 }else if(w.shape==='turbine'){
  const wheel=add(new THREE.TorusGeometry(.24,.035,10,40),steel,0,.30,0,piece);
  for(let i=0;i<8;i++){const blade=add(new THREE.BoxGeometry(.04,.38,.06),accent,0,0,0,wheel);blade.rotation.z=i*Math.PI/4;}
 }else if(w.shape==='train'){
  add(new THREE.BoxGeometry(.62,.18,.24),accent,0,.12,0,piece);add(new THREE.BoxGeometry(.18,.15,.24),steel,.18,.28,0,piece);
  for(const x of [-.2,.2])for(const z of [-.14,.14])add(new THREE.SphereGeometry(.065,12,8),steel,x,0,z,piece);
 }else if(w.shape==='loom'){
  for(const x of [-.4,.4])add(new THREE.BoxGeometry(.05,.55,.05),timber,x,.2,0,piece);
  for(let i=0;i<16;i++)add(new THREE.CylinderGeometry(.004,.004,.65,4),i%2?accent:gold,-.32+i*.043,.24,0,piece);
  add(new THREE.BoxGeometry(.88,.06,.08),timber,0,.5,0,piece);
 }else if(w.shape==='grain'){
  for(let i=0;i<4;i++){const silo=add(new THREE.CylinderGeometry(.10,.10,.35,24),steel,(i-1.5)*.26,.15,0,piece);add(new THREE.ConeGeometry(.12,.12,24),accent,0,.23,0,silo);}
 }else if(w.shape==='animal'){
  const body=add(new THREE.SphereGeometry(.19,24,16),mat('#d8c5a6',{flatShading:false}),0,.2,0,piece);body.scale.set(1.6,1,.8);
  add(new THREE.SphereGeometry(.11,20,14),accent,.3,.28,0,piece);
  for(const x of [-.17,.17])for(const z of [-.09,.09])add(new THREE.CylinderGeometry(.02,.025,.22,10),timber,x,.05,z,piece);
  for(const x of [-.5,.5])add(new THREE.BoxGeometry(.025,.3,.65),timber,x,.13,0,piece);
 }else{
  add(new THREE.BoxGeometry(.8,.045,.42),mat('#214f40'),0,.04,0,piece);
  for(let i=0;i<12;i++){const trace=add(new THREE.BoxGeometry(.035,.015,.25),gold,-.34+i*.06,.08,0,piece);trace.rotation.y=(i%2)*Math.PI/2;}
 }
 const laneY=.30,laneZ=.58;
 const lane=add(new THREE.BoxGeometry(1.5,.035,.10),steel,0,laneY,laneZ);
 const target=add(new THREE.BoxGeometry(.20,.05,.14),gold,0,laneY+.01,laneZ);
 const cursor=add(new THREE.OctahedronGeometry(.055,0),accent,0,laneY+.08,laneZ);
 const pads=Array.from({length:4},(_,i)=>{const m=add(new THREE.CylinderGeometry(.12,.13,.055,32),accent.clone(),(i-1.5)*.38,.13,-.65);m.userData.choice=i;return m;});
 // Numbered pads in geometry allow matching them to the keyboard without relying on color.
 pads.forEach((pad,i)=>{for(let j=0;j<=i;j++)add(new THREE.SphereGeometry(.015,8,6),gold,(j-i/2)*.04,.04,0,pad);});
 const burst=createBurst(group,w.color,22);
 let match=createMatch({goal:w.goal,lives:3,completed}),clock=0,position=0,holding=false,cooldown=0,feedback=0,inputIndex=0,roundAt=0;
 const isMemory=w.mode==='sequence',isChoice=w.mode==='choice';
 target.visible=cursor.visible=!(isMemory||isChoice);pads.forEach(p=>p.visible=isMemory||isChoice);
 const sequence=()=>workshopSequence(id,match.score);
 const beatDuration=()=>helpLevel(match)?1.15:.8;
 const memorizing=()=>isMemory&&clock-roundAt<sequence().length*beatDuration()+.6;
 const targetAt=()=>.45+Math.sin(Number(id)+match.score*2.7)*.24;
 function report(){onMatch({...match,prompt:isMemory?(memorizing()?'Mirá el patrón de luces…':`Repetí el patrón · ${inputIndex}/${sequence().length}`):isChoice?`Destino: ${w.inputs[workshopTarget(id,match.score)]} · tocá su estación (1–4)`:w.hint,inputs:(isMemory||isChoice)?w.inputs:null});}
 function result(success){
  if(match.phase!=='playing'||cooldown>0)return;
  match=resolve(match,{points:success?1:0,cost:success?0:1});cooldown=.4;feedback=success?1:-1;
  if(success){burst.burst(new THREE.Vector3(0,.6,0));sfx.play('harvest');rig?.shake(.015);onProgress(match.score/match.goal);}else sfx.play('miss');
  inputIndex=0;roundAt=clock+.5;
  if(match.phase==='won'){sfx.play('ignite');onComplete();}else if(match.phase==='lost')sfx.play('lose');
  report();
 }
 function input(i){if(match.phase!=='playing'||cooldown>0||!Number.isInteger(i)||i<0||i>3)return;
  if(isMemory){if(memorizing())return;const expected=sequence()[inputIndex];if(i!==expected){result(false);return;}sfx.play('tick');inputIndex++;if(inputIndex===sequence().length)result(true);else report();}
  else if(isChoice)result(i===workshopTarget(id,match.score));
 }
 function action(){if(match.phase!=='playing'||cooldown>0)return;
  if(isMemory){inputIndex=0;roundAt=clock;report();return;}
  if(isChoice){input(helpLevel(match)?workshopTarget(id,match.score):Math.min(3,Math.floor(position*4)));return;}
  if(w.mode==='hold'&&!holding){holding=true;roundAt=clock;position=0;sfx.play('tick');return;}
  holding=false;result(workshopHit(position,targetAt(),!!helpLevel(match)));
 }
 function hit(ray){return ray.intersectObjects(pads.filter(p=>p.visible),false)[0]?.object;}
 if(explore){lane.visible=target.visible=cursor.visible=false;pads.forEach(p=>p.visible=false);}
 else report();
 let wasMemory=memorizing();
 return {group,
  update(dt){clock+=dt;growIn(group,dt);burst.update(dt);cooldown=Math.max(0,cooldown-dt);feedback*=Math.exp(-dt*5);
   const speed=w.speed*(helpLevel(match)?.65:1);
   if(match.phase==='playing')position=w.mode==='hold'?(holding?(1-Math.cos((clock-roundAt)*speed))*0.5:position):(1+Math.sin(clock*speed*2))*.5;
   cursor.position.x=(position-.5)*1.4;target.position.x=(targetAt()-.5)*1.4;target.scale.x=helpLevel(match)?1.8:1;
   if(w.shape==='turbine')piece.rotation.z=clock*.5;
   if(w.shape==='gem')piece.rotation.y=clock*.25;
   if(w.shape==='train')piece.position.x=Math.sin(clock*.65)*.14;
   piece.position.y=.38+Math.abs(feedback)*.08;
   pads.forEach((pad,i)=>{const t=clock-roundAt,beat=Math.floor(t/beatDuration()),lit=isMemory&&t>=0&&beat<sequence().length&&t%beatDuration()<beatDuration()*.7&&sequence()[beat]===i;const scan=isChoice&&(helpLevel(match)?workshopTarget(id,match.score)===i:Math.floor(position*4)===i);pad.material.emissive.set(lit||scan?w.color:'#000000');pad.material.emissiveIntensity=lit?3:scan?.5:0;pad.scale.y=lit?2:1;});
   if(!explore&&isMemory&&wasMemory!==memorizing()){wasMemory=memorizing();report();}
  },
  performAction(){if(!explore)action();},input(i){if(!explore)input(i);},
  pointerDown(ray){if(explore)return;if(isMemory||isChoice){const p=hit(ray);if(p)input(p.userData.choice);}else action();},
  pointerUp(){if(!explore&&w.mode==='hold'&&holding)action();},
  pointerMove(ray){if(explore)return false;return isMemory||isChoice?!!hit(ray):match.phase==='playing';},
  retry(){if(match.phase!=='lost')return;match=retryMatch(match);inputIndex=0;holding=false;position=0;roundAt=clock;cooldown=0;onProgress(0);report();},
  getState(){return {match,cursor:position,target:targetAt(),sequence:sequence(),memorizing:memorizing(),inputIndex};},
  dispose(){disposeObject(group);},
 };
}
