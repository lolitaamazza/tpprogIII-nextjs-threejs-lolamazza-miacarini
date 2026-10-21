import * as THREE from 'three';
import { createTributeFigure } from './tributeFigure.js';
import { loadArenaModel, instantiateArena, heightOnArena } from './arenaModel.js';

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
  let ground = null, disposed = false, assetStatus = null;
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
      group.add(instantiateArena(asset,ground,own));
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
  const markers = Array.from({ length: 24 }, (_, i) => {
    const figure=createTributeFigure(i,own);
    const actor=figure.group;actor.scale.setScalar(.55);
    const base = mesh(own(new THREE.TorusGeometry(.25,.012,8,32)), gold, [0,.025,0]);base.rotation.x=-Math.PI/2;
    group.add(actor);
    return { actor, figure, coat:figure.coat, base, target:new THREE.Vector3(), alive:true };
  });
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
  }
  setRun(null);
  return {
    group, setRun,
    getAssetStatus() { return assetStatus; },
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
      weather.visible=!reduced && !low && isArena;
    },
    dispose() { disposed=true;group.removeFromParent(); resources.forEach((resource) => resource.dispose()); },
  };
}
