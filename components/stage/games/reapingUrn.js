import * as THREE from 'three';
import {gsap} from 'gsap';
import {applyPolyMaterial} from '../polyHaven.js';
import {loadEnvironment} from '../dioramas/assets.js';

export function createReapingUrn(host,{onRequest,reduced=false}){
 const resources=new Set(),own=v=>{resources.add(v);return v;};let disposed=false,frame,active=null,drag=null,busy=false,timeline,drawIndex=0;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#101312');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog('#101312',9,20);
 const camera=new THREE.PerspectiveCamera(36,1,.1,30);
 const material=(color,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness:.8,...extra}));
 const mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(own(geo),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;};
 const wood=applyPolyMaterial(material('#c2aa8d',{roughness:.65}),'wood',1.5);
 const concrete=applyPolyMaterial(material('#aaa99d'),'stone',4);
 mesh(new THREE.PlaneGeometry(30,30),concrete,0,-.02,0).rotation.x=-Math.PI/2;
 mesh(new THREE.CylinderGeometry(1.45,1.45,.10,96),wood,0,.63,0);
 mesh(new THREE.CylinderGeometry(.16,.22,.57,48),wood,0,.31,0);
 mesh(new THREE.CylinderGeometry(.6,.68,.06,64),wood,0,.03,0);
 const bronze=material('#76634a',{metalness:.8,roughness:.32});
 mesh(new THREE.CylinderGeometry(.34,.42,.08,64),bronze,0,.73,0);
 mesh(new THREE.CylinderGeometry(.18,.25,.17,48),bronze,0,.83,0);
 const profile=[[.24,.88],[.54,.95],[.83,1.12],[1,1.45],[1.02,1.72],[.92,2.02],[.75,2.2],[.73,2.24],[.70,2.24],[.72,2.19],[.89,2],[.985,1.72],[.965,1.45],[.80,1.14],[.52,.99],[.24,.92]].map(([x,y])=>new THREE.Vector2(x,y));
 const glass=own(new THREE.MeshPhysicalMaterial({color:'#f0f6f4',metalness:0,roughness:.035,transmission:1,thickness:.035,ior:1.46,clearcoat:1,side:THREE.DoubleSide}));
 const bowl=mesh(new THREE.LatheGeometry(profile,112),glass,0,0,0);bowl.castShadow=false;bowl.receiveShadow=false;
 const rim=mesh(new THREE.TorusGeometry(.72,.018,12,96),glass,0,2.24,0);rim.rotation.x=Math.PI/2;
 const paperGeo=own(new THREE.PlaneGeometry(.25,.15,4,2));
 const pp=paperGeo.attributes.position;for(let i=0;i<pp.count;i++)pp.setZ(i,Math.abs(pp.getX(i))*.14);paperGeo.computeVertexNormals();
 const paper=material('#e5ddcb',{side:THREE.DoubleSide,roughness:1});
 const papers=[];
 for(let i=0;i<112;i++){
  const a=i*2.39996,y=1.03+(i%9)*.087,r=(.40+(y-1.03)*.5)*Math.sqrt(((i*37)%113)/113);
  const slip=new THREE.Mesh(paperGeo,paper);slip.position.set(Math.cos(a)*r,y,Math.sin(a)*r);slip.rotation.set(-Math.PI/2+(i%5-2)*.18,a,(i%7)*.22);slip.castShadow=true;slip.receiveShadow=true;slip.userData.paper=i;scene.add(slip);papers.push(slip);
 }
 scene.add(new THREE.HemisphereLight('#dae4e7','#3d2b17',1.1));
 const sun=new THREE.DirectionalLight('#fff0d8',3.2);sun.position.set(-3,6,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.normalBias=.025;scene.add(sun);
 const edge=new THREE.DirectionalLight('#b7d4d3',2);edge.position.set(4,3,-3);scene.add(edge);
 loadEnvironment(renderer,'/models/districts/day.hdr').then(env=>{if(!disposed&&env){scene.environment=env;scene.environmentIntensity=.65;}});
 const resize=()=>{const w=host.clientWidth,h=Math.max(host.clientHeight,1);renderer.setSize(w,h);camera.aspect=w/h;const mobile=w<700;camera.position.set(mobile?2.9:3.2,mobile?3.4:2.8,mobile?5.2:4.5);camera.lookAt(0,mobile?1.48:1.45,0);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(),point=new THREE.Vector3();
 function hit(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(papers.filter(p=>p.visible&&!p.userData.revealed&&p!==active),false)[0]?.object;}
 function down(e){if(busy)return;const p=hit(e);if(!p)return;drag={paper:p,x:e.clientX,y:e.clientY};plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(),p.position);renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';}
 function move(e){if(drag){hit(e);if(ray.ray.intersectPlane(plane,point))drag.paper.position.copy(point);return;}renderer.domElement.style.cursor=!busy&&hit(e)?'grab':'default';}
 function up(){if(!drag)return;if(active?.userData.revealed)active.visible=false;active=drag.paper;drag=null;renderer.domElement.style.cursor='default';onRequest();}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.style.touchAction='none';
 const draw=()=>{frame=requestAnimationFrame(draw);renderer.render(scene,camera);};draw();
 function sync(count){const visible=Math.max(0,112-Math.round(count*112/24));for(let i=0;i<papers.length;i++)if(papers[i]!==active)papers[i].visible=i<visible;}
 return {
  sync,
  extract(tribute,onDone){
   if(busy)return false;busy=true;
   if(!active||!active.visible){active=papers.filter(p=>p.visible).at(-1);}
   if(!active){busy=false;return false;}
   const chosen=active;chosen.userData.revealed=true;
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#e8e0cd';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#b5a78c';ctx.lineWidth=3;ctx.strokeRect(28,28,968,456);ctx.fillStyle='#544839';ctx.textAlign='center';ctx.font='25px Georgia';ctx.fillText('LA COSECHA · DISTRITO '+tribute.district,512,130);ctx.font='84px Georgia';ctx.fillText(tribute.name,512,305);ctx.font='22px Georgia';ctx.fillText('PANEM · REGISTRO DE TRIBUTOS',512,410);
   const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
   chosen.material=own(new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));
   const side=[-.8,.8,-.45,.5,0][drawIndex%5],roll=[-.12,.10,.16,-.14,0][drawIndex%5];drawIndex++;
   const euler=new THREE.Euler().setFromQuaternion(camera.quaternion);euler.z+=roll;
   const paperScale=camera.aspect<.8?3:4.1;
   const safeOffset=Math.max(0,Math.min(.55,3*Math.tan(THREE.MathUtils.degToRad(18))*camera.aspect-paperScale*.125-.08));
   const destination=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3)).add(new THREE.Vector3(side*safeOffset,(drawIndex%3)*.10,0).applyQuaternion(camera.quaternion));
   const crest=new THREE.Vector3(0,2.75,0).add(new THREE.Vector3(side*.5,0,0).applyQuaternion(camera.quaternion));
   timeline=gsap.timeline({onComplete(){busy=false;onDone();}});
   timeline.to(chosen.position,{x:crest.x,y:crest.y,z:crest.z,duration:reduced?0:.45,ease:'power2.out'}).to(chosen.position,{x:destination.x,y:destination.y,z:destination.z,duration:reduced?0:.6,ease:'power2.inOut'}).to(chosen.rotation,{x:euler.x,y:euler.y,z:euler.z,duration:reduced?0:.7},0).to(chosen.scale,{x:paperScale,y:paperScale,z:paperScale,duration:reduced?0:.65},reduced?0:.3);
   return true;
  },
  clearPaper(){if(active?.userData.revealed){active.visible=false;active=null;}},
  dispose(){disposed=true;timeline?.kill();cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);resources.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();},
 };
}
