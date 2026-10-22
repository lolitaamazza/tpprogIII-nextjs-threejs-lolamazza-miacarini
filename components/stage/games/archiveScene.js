import * as THREE from 'three';
import { createTributeFigure } from './tributeFigure.js';
import { loadArenaModel, instantiateArena, heightOnArena } from './arenaModel.js';

const HOLO_VERTEX = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vHeight = world.y;
    vec4 view = viewMatrix * world;
    vView = -view.xyz;
    vNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * view;
  }
`;
const HOLO_FRAGMENT = /* glsl */`
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
    float scan = 0.65 + 0.35 * sin(vHeight * 70.0 - uTime * 2.0);
    // Poca opacidad: el bosque es denso y las capas se suman; el borde (rim) dibuja las formas.
    gl_FragColor = vec4(uColor * (0.45 + rim * 0.8) * scan, 0.05 + rim * 0.2);
  }
`;

// La arena usa el modelo de Flashness; la Cosecha conserva su escenografía propia.
export function createArchiveScene(chapter, onAssetStatus = () => {}) {
  const group = new THREE.Group();
  group.name = `archive-${chapter}`;
  const resources = new Set();
  const own = (resource) => { resources.add(resource); return resource; };
  const material = (color, options = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options }));
  const stone = material('#53606a');
  const dark = material('#172329');
  const gold = material('#cba85c', { metalness: 0.75, roughness: 0.25 });
  const light = material('#d8d3bd', { emissive: '#69562e', emissiveIntensity: 1.1 });
  const box = own(new THREE.BoxGeometry(1, 1, 1));
  let ground = null, disposed = false, assetStatus = null, arenaModel = null, view = 'follow';
  function terrainHeight(x,z) { return ground ? heightOnArena(ground,x,z) : .025; }
  function surfaceTexture(base, variation=25) {
    const size=128, data=new Uint8Array(size*size*4);let seed=17;
    for(let i=0;i<size*size;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=((seed/4294967296)-.5)*variation;for(let c=0;c<3;c++)data[i*4+c]=Math.max(0,Math.min(255,base[c]+n));data[i*4+3]=255;}
    const texture=own(new THREE.DataTexture(data,size,size));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(8,8);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
  }
  function mesh(geometry, mat, position, scale = [1, 1, 1], parent = group) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position); object.scale.set(...scale); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  }
  const floor = mesh(own(new THREE.CylinderGeometry(6.5, 6.8, 0.35, 64)), dark, [0, -0.2, 0]);

  const isArena=chapter === 'arena' || chapter === 'ended';
  const atmosphere=new THREE.HemisphereLight('#bacdda','#403d28',1.3);group.add(atmosphere);
  const weatherGeometry=own(new THREE.BufferGeometry());
  const weatherPositions=new Float32Array(180*3);
  for(let i=0;i<180;i++){weatherPositions[i*3]=Math.sin(i*71.3)*6;weatherPositions[i*3+1]=(i%30)/5;weatherPositions[i*3+2]=Math.cos(i*31.7)*6;}
  weatherGeometry.setAttribute('position',new THREE.BufferAttribute(weatherPositions,3));
  const weatherMaterial=own(new THREE.PointsMaterial({color:'#bcdded',size:.025,transparent:true,opacity:.35,depthWrite:false}));
  const weather=new THREE.Points(weatherGeometry,weatherMaterial);group.add(weather);
  let weatherKind='dust';
  if (isArena) {
    floor.visible=false;
    assetStatus='loading';onAssetStatus(assetStatus);
    if (typeof window !== 'undefined') loadArenaModel().then(([asset,terrain])=>{
      if(disposed)return;
      ground=terrain;
      arenaModel=instantiateArena(asset,ground,own);
      group.add(arenaModel);
      if(view==='table')hologram(true);
      assetStatus='ready';onAssetStatus(assetStatus);
      setRun(currentRun);
    }).catch(error=>{if(!disposed){assetStatus='error';onAssetStatus(assetStatus);console.warn('No se pudo cargar la arena:',error);}});
  } else {
    mesh(box, stone, [0, .12, -1.4], [6.5, .25, 2.5]);
    for (let i = 0; i < 7; i += 1) {
      mesh(own(new THREE.CylinderGeometry(.16,.21,4,24)), material('#c4c2b4',{map:surfaceTexture([210,207,193],22)}), [-3 + i, 2, -2.4]);
      mesh(box,stone,[-3+i,.2,-2.4],[.5,.4,.5]);
      mesh(box, gold, [-3 + i, 4, -2.4], [.38, .15, .5]);
    }
    mesh(box, dark, [0, 4.3, -2.5], [7.2, .4, .6]);
    mesh(box, gold, [0, 2.35, -2.2], [1.5, 2.7, .08]);
    if (chapter === 'reaping') {
      mesh(box, stone, [0, .7, -1], [.65, 1.2, .65]);
      mesh(own(new THREE.SphereGeometry(.38,32,24)),own(new THREE.MeshPhysicalMaterial({color:'#d1ebed',transparent:true,opacity:.38,metalness:0,roughness:.05,clearcoat:1,side:THREE.DoubleSide})),[0,1.45,-1]);
      for (let i = 0; i < 12; i += 1) mesh(box, light, [Math.sin(i * 2.4) * .2, 1.3 + (i % 3) * .07, -1 + Math.cos(i * 2.4) * .2], [.09, .015, .05]);
    } else {
      // Vagón de llegada y pasarela ceremonial.
      mesh(box, dark, [-2.5, .75, .2], [1.1, 1.2, 3.2]);
      for (let i = 0; i < 4; i += 1) mesh(box, light, [-1.93, .9, -.8 + i * .6], [.02, .35, .4]);
      mesh(box, material('#772e31'), [.6, .02, 1.2], [1.2, .04, 5]);
    }
  }
  // Caja invisible por persona: tocarla en 3D abre su ficha (también mientras el modelo todavía carga).
  const hitGeometry=own(new THREE.CylinderGeometry(.55,.55,2.6,8));hitGeometry.translate(0,1.3,0);
  const hitMaterial=own(new THREE.MeshBasicMaterial({visible:false}));
  const markers = Array.from({ length: 24 }, (_, i) => {
    const figure=createTributeFigure(i,own);
    const actor=figure.group;actor.scale.setScalar(.55);
    const hit=new THREE.Mesh(hitGeometry,hitMaterial);hit.userData.tribute=i;actor.add(hit);
    const base = mesh(own(new THREE.TorusGeometry(.25,.012,8,32)), gold, [0,.025,0]);base.rotation.x=-Math.PI/2;
    group.add(actor);
    return { actor, figure, coat:figure.coat, base, hit, target:new THREE.Vector3(), alive:true };
  });

  // La mesa de los Vigilantes: la arena como holograma, los tributos como luces (la tuya dorada) y los caídos
  // como cruces. Alrededor, la mesa y las siluetas de quienes miran.
  const table=new THREE.Group();table.name='gamemakers-table';table.visible=false;group.add(table);
  mesh(own(new THREE.CylinderGeometry(10,10.4,.3,72)),material('#0a1114',{roughness:.4,metalness:.3}),[0,-.5,0],[1,1,1],table);
  const rim=new THREE.Mesh(own(new THREE.TorusGeometry(10,.045,8,160)),own(new THREE.MeshBasicMaterial({color:'#5fd3e0',transparent:true,opacity:.7})));
  rim.rotation.x=-Math.PI/2;rim.position.y=-.34;table.add(rim);
  const watcher=material('#05080a',{roughness:1});const head=own(new THREE.SphereGeometry(.32,16,12));const body=own(new THREE.CapsuleGeometry(.45,1.1,4,12));
  for(let i=0;i<8;i+=1){const a=Math.PI*.15+i*Math.PI*.1;const x=Math.cos(a)*11.6,z=Math.sin(a)*11.6;mesh(body,watcher,[x,.4,z],[1,1,1],table);mesh(head,watcher,[x,1.45,z],[1,1,1],table);}
  const lights=new THREE.InstancedMesh(own(new THREE.SphereGeometry(.17,12,8)),own(new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false})),24);
  own(lights);lights.name='table-lights';lights.visible=false;lights.frustumCulled=false;group.add(lights);
  const halo=new THREE.Mesh(own(new THREE.TorusGeometry(.32,.025,8,32)),own(new THREE.MeshBasicMaterial({color:'#d4af37',toneMapped:false})));
  halo.rotation.x=-Math.PI/2;halo.visible=false;group.add(halo);
  const crossPositions=new Float32Array(24*4*3);
  const crossGeometry=own(new THREE.BufferGeometry());crossGeometry.setAttribute('position',new THREE.BufferAttribute(crossPositions,3));
  const crosses=new THREE.LineSegments(crossGeometry,own(new THREE.LineBasicMaterial({color:'#5fd3e0',transparent:true,opacity:.55})));
  crosses.name='table-crosses';crosses.visible=false;crosses.frustumCulled=false;group.add(crosses);
  const holo=own(new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color('#4fc4d4')},uTime:{value:0}},vertexShader:HOLO_VERTEX,fragmentShader:HOLO_FRAGMENT,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  function hologram(on){
    arenaModel?.traverse((node)=>{
      if(!node.isMesh)return;
      if(on){node.userData.material??=node.material;node.material=holo;}
      else if(node.userData.material){node.material=node.userData.material;}
    });
  }
  const tmpMatrix=new THREE.Matrix4(),tmpColor=new THREE.Color();
  function syncTable(){
    const onTable=view==='table';
    lights.visible=onTable;crosses.visible=onTable;table.visible=onTable;
    halo.visible=false;
    markers.forEach((marker,i)=>{
      const t=currentRun?.tributes[i];
      const {x,y,z}=marker.target;
      const s=marker.alive?1:0;
      tmpMatrix.makeScale(s,s,s).setPosition(x,y+.2,z);lights.setMatrixAt(i,tmpMatrix);
      const mine=t&&t.id===currentRun?.selectedId;
      lights.setColorAt(i,tmpColor.set(mine?'#d4af37':'#bfeff5'));
      if(mine&&marker.alive&&onTable){halo.visible=true;halo.position.set(x,y+.05,z);}
      const k=marker.alive?0:.16;
      crossPositions.set([x-k,y+.1,z-k,x+k,y+.1,z+k,x-k,y+.1,z+k,x+k,y+.1,z-k],i*12);
      marker.actor.visible=marker.alive&&!onTable&&(!isArena||!!ground);
      marker.base.visible=marker.base.visible&&!onTable;
    });
    lights.instanceMatrix.needsUpdate=true;
    if(lights.instanceColor)lights.instanceColor.needsUpdate=true;
    crossGeometry.attributes.position.needsUpdate=true;
  }
  let currentRun = null;
  let reduced = false;
  let low = false;
  function setRun(run) {
    currentRun = run;
    const lastDecision=run?.events.filter((e)=>e.turn===run.turn && e.type==='decision').at(-1);
    weatherKind=lastDecision?.situation==='fire'?'fire':lastDecision?.situation==='storm'?'rain':'dust';
    weatherMaterial.color.set(weatherKind==='fire'?'#f0a15d':'#bcdded');
    weatherMaterial.size=weatherKind==='fire'?.055:.025;
    const slots = [0, 0, 0, 0];
    markers.forEach((marker, i) => {
      const t = run?.tributes[i];
      const inArena = chapter === 'arena' || chapter === 'ended';
      if (inArena) {
        const zone = t?.zone ?? i % 4;
        const slot = slots[zone]++;
        const angle = zone * Math.PI / 2 + ((slot % 6) - 2.5) * .19;
        const radius = 2 + Math.floor(slot / 6) * .6 + (slot % 2) * .45;
        const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
        marker.target.set(x,terrainHeight(x,z),z);
      } else marker.target.set(-2.7 + (i % 8) * .77, 0, .6 + Math.floor(i / 8) * .9);
      marker.alive = t?.alive ?? true;
      marker.coat.transparent = !marker.alive;
      marker.coat.opacity = marker.alive ? 1 : .18;
      marker.base.visible = t?.id === run?.selectedId || t?.id === run?.winnerId;
      marker.actor.visible=marker.alive && (!isArena || !!ground);
      marker.base.position.set(marker.target.x,marker.target.y+.025,marker.target.z);
      marker.base.visible=marker.base.visible && marker.alive && (!isArena || !!ground);
      if (!marker.actor.userData.placed || reduced) { marker.actor.position.copy(marker.target); marker.actor.userData.placed = true; }
    });
    syncTable();
  }
  setRun(null);
  return {
    group, setRun,
    getAssetStatus() { return assetStatus; },
    getView() { return view; },
    // La mesa solo existe en la arena (y en el desenlace); en la Cosecha y la Preparación siempre se ve de cerca.
    setView(value) {
      const next=value==='table'&&isArena?'table':'follow';
      if(next===view)return;
      view=next;hologram(view==='table');setRun(currentRun); // setRun recalcula quién se ve y dónde
    },
    // Qué tributo hay bajo el rayo: en la mesa, las luces; en el resto, las personas (las cajas invisibles).
    pick(raycaster) {
      if(view==='table'){
        const hit=raycaster.intersectObject(lights,false)[0];
        return hit&&markers[hit.instanceId]?.alive?currentRun?.tributes[hit.instanceId]?.id??`tribute-${hit.instanceId+1}`:null;
      }
      const hit=raycaster.intersectObjects(markers.filter((m)=>m.actor.visible).map((m)=>m.hit),false)[0];
      if(!hit)return null;
      const i=hit.object.userData.tribute;
      return currentRun?.tributes[i]?.id??`tribute-${i+1}`;
    },
    focus(id) { const i = currentRun?.tributes.findIndex((t) => t.id === id); return i >= 0 ? markers[i].target.clone() : null; },
    setReducedMotion(value) { reduced = value; if (value) setRun(currentRun); },
    setQuality(value) { low = value === 'low'; weather.visible=!low; },
    update(dt, elapsed) {
      markers.forEach(({ actor, target, figure }) => {
        const moving=Math.min(1,actor.position.distanceTo(target)*4);
        if(moving>.05)actor.rotation.y=Math.atan2(target.x-actor.position.x,target.z-actor.position.z);
        actor.position.lerp(target,reduced?1:1-Math.exp(-3*dt));
        if(isArena && ground)actor.position.y=terrainHeight(actor.position.x,actor.position.z);
        figure.animate(elapsed,moving,reduced);
      });
      if(!reduced && !low){
        for(let i=0;i<180;i++){const speed=weatherKind==='rain'?-3:weatherKind==='fire'?1:.06;weatherPositions[i*3+1]=(weatherPositions[i*3+1]+dt*speed+6)%6;}
        weatherGeometry.attributes.position.needsUpdate=true;
      }
      weather.visible=!reduced && !low && isArena && view!=='table';
      holo.uniforms.uTime.value=elapsed;
    },
    dispose() { disposed=true;group.removeFromParent(); resources.forEach((resource) => resource.dispose()); },
  };
}
