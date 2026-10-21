'use client';
import { useEffect,useRef,useState } from 'react';
import * as THREE from 'three';
import { createTributeFigure } from '@/components/stage/games/tributeFigure';
export default function TributePortrait({tribute,reducedMotion}) {
 const mount=useRef(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
   const host=mount.current;let renderer;let frame;let observer;const resources=new Set();
   try {
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;host.appendChild(renderer.domElement);
    const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(30,1,.1,20);
    const actor=createTributeFigure(Number(tribute.id.split('-')[1])-1,(v)=>{resources.add(v);return v;});scene.add(actor.group);
    scene.add(new THREE.HemisphereLight('#d5e8f2','#433222',2));
    const key=new THREE.DirectionalLight('#fff0d6',3);key.position.set(2,4,4);scene.add(key);
    const rim=new THREE.DirectionalLight('#7fa3bb',3);rim.position.set(-2,2,-2);scene.add(rim);
    const resize=()=>{const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.position.set(.6,1.35,camera.aspect>1?3.3:3);camera.lookAt(0,1.15,0);camera.updateProjectionMatrix();};
    observer=new ResizeObserver(resize);observer.observe(host);resize();
    let t=0,last=0;const draw=(now)=>{frame=requestAnimationFrame(draw);const dt=last?Math.min((now-last)/1000,.05):0;last=now;t+=dt;actor.group.rotation.y=reducedMotion?-.13:Math.sin(t*.35)*.15-.13;actor.animate(t,0,reducedMotion);renderer.render(scene,camera);};frame=requestAnimationFrame(draw);
   }catch {queueMicrotask(()=>setFailed(true));}
   return ()=>{cancelAnimationFrame(frame);observer?.disconnect();resources.forEach((v)=>v.dispose());renderer?.dispose();renderer?.domElement.remove();};
 },[tribute.id,reducedMotion]);
 return <div className="tribute-portrait" ref={mount} aria-label={`Retrato tridimensional de ${tribute.name}`} role="img">{failed&&<span className="portrait-fallback">{tribute.name[0]}</span>}</div>;
}
