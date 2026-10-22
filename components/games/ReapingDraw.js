'use client';
import {useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {usePanem} from '@/components/panem/PanemProvider';
import {drawOrderFor} from '@/lib/games/reaping';
import {createReapingUrn} from '@/components/stage/games/reapingUrn';
import './reaping-draw.css';

export default function ReapingDraw({run,onDraw,onContinue,disabled}){
 const {reducedMotion,stageApiRef,sfx}=usePanem();
 const host=useRef(null),root=useRef(null),api=useRef(null),request=useRef(null),latest=useRef(null),exitTween=useRef(null);
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const count=run.drawnCount??0,order=drawOrderFor(run),last=count?run.tributes.find(t=>t.id===order[count-1]):null;
 useEffect(()=>{latest.current={run,onDraw,disabled,count,order,busy};});
 useEffect(()=>{request.current=()=>{
  const state=latest.current;if(!state||state.disabled||state.busy||state.count>=24)return;
  setBusy(true);state.busy=true;
  const t=state.run.tributes.find(t=>t.id===state.order[state.count]);
  const done=()=>{state.onDraw();sfx.play('reaping');setBusy(false);};
  api.current?.clearPaper();
  if(!api.current?.extract(t,done))done();
 };});
 useEffect(()=>{
  const stage=stageApiRef.current;stage?.setGamesCovered(true);
  try{api.current=createReapingUrn(host.current,{onRequest:()=>request.current?.(),reduced:reducedMotion});api.current.sync(latest.current?.count??0);}
  catch(e){console.warn('No se pudo mostrar la urna:',e);queueMicrotask(()=>setFailed(true));}
  return()=>{exitTween.current?.kill();api.current?.dispose();api.current=null;stage?.setGamesCovered(false);};
 },[reducedMotion,stageApiRef]);
 useEffect(()=>{api.current?.sync(count);},[count]);
 function finish(){setBusy(true);exitTween.current=gsap.to(root.current,{opacity:0,duration:reducedMotion?0:.6,onComplete:onContinue});}
 return <section className="reaping-draw" ref={root} aria-label="Extraer los nombres de la Cosecha">
  <div className="reaping-canvas" ref={host} aria-hidden="true"/>
  <header className="reaping-intro"><p className="eyebrow">EL CAPITOLIO EXIGE VEINTICUATRO NOMBRES</p><h1>La Cosecha<span>.</span></h1><p>Agarrá un papel de la urna y sacalo.<br/>Cada nombre pertenece a una historia.</p></header>
  <aside className="reaping-control"><p className="reaping-count">{String(count).padStart(2,'0')} <span>/ 24 nombres</span></p>
   <div className="drawn-name" key={count} aria-live="polite" aria-atomic="true">{last?<><small>DISTRITO {last.district}</small><strong>{last.name}</strong><span>Su nombre ya está en el registro.</span></>:<><small>LA URNA ESTÁ SELLADA CON DESTINOS</small><strong>Tu mano.<br/>Su nombre.</strong></>}</div>
   {count<24?<><button className="primary" disabled={busy||disabled} onClick={()=>request.current?.()}>{busy?'Abriendo el papel…':'Sacar un papel'}</button><button className="reaping-skip" disabled={busy||disabled} onClick={()=>{api.current?.clearPaper();onDraw(true);}}>Revelar los nombres restantes</button></>:<button className="primary" disabled={busy||disabled} onClick={finish}>Ir al escenario · elegir tributo</button>}
   <p className="reaping-help">{failed?'Podés extraer los nombres con el botón.':'Arrastrá un papel o tocá la urna. También podés usar el botón con el teclado.'}</p>
   {count>0&&<details className="reaping-register"><summary>Ver los {count} nombres extraídos</summary><ol>{order.slice(0,count).map(id=>{const t=run.tributes.find(t=>t.id===id);return <li key={id}><span>D{t.district}</span> {t.name}</li>;})}</ol></details>}
   <a className="reaping-credit" href="https://polyhaven.com" target="_blank" rel="noreferrer">Materiales e iluminación · Poly Haven</a>
  </aside>
 </section>;
}
