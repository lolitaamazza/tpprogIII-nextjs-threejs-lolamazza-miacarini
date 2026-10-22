import * as THREE from 'three';
import {visualCueFor} from '../../../lib/games/visualCue.js';
import {applyPolyMaterial} from '../polyHaven.js';

const VERTEX=`varying vec2 vUv;void main(){vUv=uv;vec4 p=vec4(position,1.);#ifdef USE_INSTANCING\np=instanceMatrix*p;\n#endif\ngl_Position=projectionMatrix*modelViewMatrix*p;}`.replace(';#ifdef',';\n#ifdef');
const FLAME=`uniform float uTime;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+7.1;a*=.5;}return v;}
void main(){vec2 uv=vUv;float n=fbm(vec2(uv.x*5.,uv.y*4.-uTime*1.8));float bend=sin(uv.y*9.-uTime*2.)*.07*uv.y;float width=(1.-uv.y)*.42;float body=1.-smoothstep(width*.2,width+.08,abs(uv.x-.5+bend)+(n-.5)*.24);float tip=1.-smoothstep(.45+n*.4,.96,uv.y);float alpha=body*tip*smoothstep(0.,.08,uv.y);float heat=clamp((1.-uv.y)*body*(.45+n),0.,1.);vec3 color=mix(vec3(.95,.075,.008),vec3(1.1,.85,.22),smoothstep(.18,.85,heat));gl_FragColor=vec4(color,alpha*(.50+n*.35));}`;
function cloudTexture(own){if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,1,32,32,32);g.addColorStop(0,'#ffffff');g.addColorStop(.4,'#ffffff66');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return own(new THREE.CanvasTexture(c));}
export function createArenaEffects(parent,own,heightAt){
 const group=new THREE.Group();group.name='arena-event-effects';group.visible=false;parent.add(group);
 const flameMat=own(new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:VERTEX,fragmentShader:FLAME,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending}));
 const flameGeo=own(new THREE.PlaneGeometry(1,2));flameGeo.translate(0,1,0);
 const flames=new THREE.InstancedMesh(flameGeo,flameMat,36);own(flames);flames.frustumCulled=false;group.add(flames);
 const dummy=new THREE.Object3D();
 for(let i=0;i<36;i++){const cluster=Math.floor(i/3),a=2.3+cluster*.2,r=1.4+(cluster%4)*.48;dummy.position.set(Math.cos(a)*r,0,Math.sin(a)*r);dummy.rotation.set(0,(i%3)*Math.PI/3,0);dummy.scale.set(.7+(cluster%3)*.18,.6+(cluster%4)*.22,1);dummy.updateMatrix();flames.setMatrixAt(i,dummy.matrix);}
 const smokePos=new Float32Array(72*3),smokeGeo=own(new THREE.BufferGeometry());smokeGeo.setAttribute('position',new THREE.BufferAttribute(smokePos,3));
 const smokeMat=own(new THREE.PointsMaterial({map:cloudTexture(own),color:'#55554c',size:1.3,transparent:true,opacity:.25,depthWrite:false}));const smoke=new THREE.Points(smokeGeo,smokeMat);smoke.frustumCulled=false;group.add(smoke);
 const glow=new THREE.PointLight('#ff7025',0,9,2);glow.position.set(0,1.2,0);group.add(glow);
 const props=new THREE.Group();group.add(props);
 const metal=own(new THREE.MeshStandardMaterial({color:'#bfc8c6',metalness:.85,roughness:.28}));
 const wood=applyPolyMaterial(own(new THREE.MeshStandardMaterial({color:'#9c8770',roughness:.8})),'wood');
 const canopyMat=own(new THREE.MeshStandardMaterial({color:'#cec8b6',side:THREE.DoubleSide,roughness:.9}));
 const parachute=new THREE.Group();props.add(parachute);
 const dome=new THREE.Mesh(own(new THREE.SphereGeometry(.65,24,12,0,Math.PI*2,0,Math.PI/2)),canopyMat);parachute.add(dome);
 const gift=new THREE.Mesh(own(new THREE.CylinderGeometry(.15,.15,.2,20)),metal);gift.position.y=-.85;parachute.add(gift);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;const line=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(a)*.65,0,Math.sin(a)*.65),new THREE.Vector3(0,-.75,0)]);parachute.add(new THREE.Line(own(line),own(new THREE.LineBasicMaterial({color:'#a3aaa6'}))));}
 const crate=new THREE.Mesh(own(new THREE.BoxGeometry(.48,.3,.36)),wood);crate.position.set(.8,.25,.6);props.add(crate);
 const waterMat=own(new THREE.MeshPhysicalMaterial({color:'#629eac',transparent:true,opacity:.5,roughness:.2,metalness:.25,side:THREE.DoubleSide}));
 const ripple=new THREE.Mesh(own(new THREE.RingGeometry(.25,1.15,64)),waterMat);ripple.rotation.x=-Math.PI/2;ripple.position.set(.8,.035,.6);props.add(ripple);
 const beacon=new THREE.Group();props.add(beacon);const beaconMat=own(new THREE.MeshBasicMaterial({color:'#e9d894',toneMapped:false}));
 for(let i=0;i<3;i++){const dot=new THREE.Mesh(own(new THREE.SphereGeometry(.045,12,8)),beaconMat);dot.position.set(1.2+i*.15,.65,1.1);beacon.add(dot);}
 let cue=null,start=0,lastKey=null,clock=0;
 function setRun(run,point){const next=visualCueFor(run);cue=next?.kind??null;group.visible=!!cue;group.userData.cue=cue;
  if(next?.key!==lastKey){lastKey=next?.key;start=0;}
  if(point)group.position.copy(point);
  flames.visible=cue==='fire'||cue==='night';flames.scale.setScalar(cue==='night'?.2:1);
  smoke.visible=['fire','storm','rain'].includes(cue);smokeMat.color.set(cue==='storm'?'#8baf50':cue==='rain'?'#b5cddd':'#575a50');smokeMat.size=cue==='rain'?.07:cue==='storm'?2.2:1.3;smokeMat.opacity=cue==='storm'?.2:cue==='rain'?.7:.3;
  parachute.visible=cue==='sponsor';crate.visible=['river','opening'].includes(cue);ripple.visible=['river','thirst'].includes(cue);beacon.visible=['signal','footsteps','wound'].includes(cue);
  // Seat each flame cluster on the actual imported ground, rather than in a flat layer.
  for(let i=0;i<36;i++){flames.getMatrixAt(i,dummy.matrix);dummy.matrix.decompose(dummy.position,dummy.quaternion,dummy.scale);dummy.position.y=heightAt(group.position.x+dummy.position.x,group.position.z+dummy.position.z)-group.position.y;dummy.updateMatrix();flames.setMatrixAt(i,dummy.matrix);}flames.instanceMatrix.needsUpdate=true;
 }
 return {group,setRun,update(dt,elapsed,reduced,low,table){
  if(!group.visible)return;clock+=reduced?0:dt;elapsed=clock;start+=reduced?0:dt;flameMat.uniforms.uTime.value=reduced?1:elapsed;
  glow.intensity=flames.visible&&!table?(cue==='night'?.7:3+(reduced?0:Math.sin(elapsed*9)*.6)):0;
  smoke.visible=['fire','storm','rain'].includes(cue)&&!low;
  for(let i=0;i<72;i++){const a=i*2.39996,r=1+(i%9)*.23;smokePos[i*3]=Math.cos(a)*r+Math.sin(elapsed*.3+i)*.2;smokePos[i*3+1]=cue==='rain'?4-((elapsed*3+i*.17)%4):((elapsed*.35+i*.13)%3)+.3;smokePos[i*3+2]=Math.sin(a)*r;}smokeGeo.attributes.position.needsUpdate=true;
  parachute.position.set(.65+Math.sin(elapsed*.6)*.12,Math.max(1.1,3.5-start*.18),.2);parachute.rotation.z=reduced?0:Math.sin(elapsed*.7)*.09;
  if(!reduced){crate.position.y=.24+Math.sin(elapsed*1.3)*.045;crate.rotation.y=elapsed*.05;ripple.scale.setScalar(1+Math.sin(elapsed*2)*.1);beaconMat.color.setHSL(cue==='wound'?0:.12,.5,.5+Math.sin(elapsed*4)*.25);}
 }};
}
