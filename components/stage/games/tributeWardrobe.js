import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function addTributeWardrobe(rig,model,look,own){
 const cloth=own(new THREE.MeshStandardMaterial({color:new THREE.Color(look.primary).lerp(new THREE.Color('#55564b'),.25),roughness:.96,side:THREE.DoubleSide}));
 const dark=own(new THREE.MeshStandardMaterial({color:'#302d27',roughness:.95}));
 const bones=[];model.traverse(node=>{if(node.isBone)bones.push(node);});
 const chest=bones.find(node=>/Spine2(?:_\d+)?$/.test(node.name));
 function part(geometry,material,position,bone=chest){
  const mesh=new THREE.Mesh(own(geometry),material);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;rig.add(mesh);
  rig.updateWorldMatrix(true,true);if(bone)bone.attach(mesh);return mesh;
 }
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');
 if(ctx){ctx.fillStyle='#252823';ctx.fillRect(0,0,128,128);ctx.fillStyle='#dfcc92';ctx.font='bold 64px sans-serif';ctx.textAlign='center';ctx.fillText(String(look.district).padStart(2,'0'),64,86);
 const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
 part(new THREE.PlaneGeometry(.065,.065),own(new THREE.MeshStandardMaterial({map:texture,roughness:.9,side:THREE.DoubleSide})),[look.side*.1,1.25,.135]);}
 function strap(points){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  part(new THREE.TubeGeometry(curve,12,.006,5,false),dark,[0,0,0]);
 }
 if(look.equipment==='scarf'){
  const collar=part(new THREE.TorusGeometry(.078,.012,8,24),cloth,[0,1.46,0]);collar.rotateX(Math.PI/2);
  const sheet=new THREE.PlaneGeometry(.045,.20,5,12),pos=sheet.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*160)*.004+Math.sin(pos.getY(i)*18)*.004);
  sheet.computeVertexNormals();part(sheet,cloth,[.045,1.34,.13]);
 }else if(look.equipment==='pack'){
  part(new RoundedBoxGeometry(.25,.30,.12,2,.025),cloth,[0,1.16,-.19]);
  for(const x of [-.12,.12])strap([[x,1.36,-.12],[x,1.36,.09],[x,1.13,.145],[x,1.02,-.1]]);
 }else if(look.equipment==='harness'){
  for(const x of [-.12,.12])strap([[x,1.37,-.08],[x,1.34,.12],[x,1.13,.145],[x,1.02,.10]]);
 }else if(look.equipment==='satchel'){
  strap([[look.side*.14,1.40,-.04],[look.side*.12,1.38,.1],[-look.side*.08,1.12,.15],[-look.side*.19,.89,.08]]);
  part(new RoundedBoxGeometry(.11,.15,.065,2,.015),cloth,[-look.side*.19,.86,.04]);
 }else if(look.equipment==='belt'){
  part(new RoundedBoxGeometry(.30,.022,.17,2,.008),dark,[0,.89,0]);
 }
}
