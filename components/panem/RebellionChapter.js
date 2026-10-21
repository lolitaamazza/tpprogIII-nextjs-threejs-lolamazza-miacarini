'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {gsap} from 'gsap';
import {usePanem} from './PanemProvider';
import {capitolGate} from '@/lib/progress';
import './rebellion.css';

const CHAPTERS=[
 {id:'signal',number:'01',title:'Alguien está escuchando.',body:'La frase desaparece. Durante unos segundos solo queda estática. Entonces, desde el Distrito 11, una voz atraviesa la frecuencia: «Vimos el fuego. Las patrullas vienen hacia la antena». La señal ya no es un símbolo. Hay gente al otro lado.',question:'Tenés unos segundos antes de que rastreen la transmisión. ¿Qué enviás?',options:[{id:'route',label:'Transmitir una ruta de evacuación',hint:'Guiar a las familias hacia los túneles de carga.',result:'Las luces de los depósitos se apagan una a una. Las familias siguen la ruta y la antena queda vacía cuando llega la patrulla.'},{id:'relay',label:'Dividir la señal entre los distritos',hint:'Mantener las comunicaciones sin una única antena.',result:'El Distrito 3 replica la frecuencia. Cuando el Capitolio corta una antena, otras dos continúan transmitiendo.'}]},
 {id:'crossing',number:'02',title:'El último tren de carga.',body:'Una conductora del Distrito 6 responde con dos golpes de radio. Su tren cruza el control al amanecer. Puede llevar un solo cargamento sin levantar sospechas.',question:'¿Qué necesita primero la red que acaba de nacer?',options:[{id:'medicine',label:'Enviar medicinas y agua',hint:'Sostener a quienes tuvieron que abandonar sus casas.',result:'Los vagones llegan a los refugios. La primera respuesta no es un discurso: es agua limpia y vendas para quienes esperaban.'},{id:'radios',label:'Enviar radios y baterías',hint:'Conectar a los refugios que todavía están aislados.',result:'Por primera vez, los refugios se escuchan entre sí. Nadie tiene que esperar una orden del Capitolio para pedir ayuda.'}]},
];
export default function RebellionChapter(){
 const {progress,reducedMotion,sfx,setBurning}=usePanem();
 const [answers,setAnswers]=useState([]);const [ready,setReady]=useState(false);const [storageIssue,setStorageIssue]=useState(false);const root=useRef(null);
 const gate=capitolGate({ready:progress.ready,synced:progress.synced,progress});
 useEffect(()=>{const timer=setTimeout(()=>{try{const saved=JSON.parse(localStorage.getItem('panem-rebellion-v1')||'[]');if(Array.isArray(saved)&&saved.length<=2&&saved.every((id,i)=>CHAPTERS[i].options.some(o=>o.id===id)))setAnswers(saved);}catch{/* Mantener una historia nueva si el archivo no es válido. */}setReady(true);},0);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{if(!ready)return;const ctx=gsap.context(()=>{if(!reducedMotion)gsap.from('.rebellion-copy',{opacity:0,y:20,duration:.7,ease:'power3.out'});},root);return()=>ctx.revert();},[answers.length,ready,reducedMotion]);
 function choose(id){const next=[...answers,id];setAnswers(next);try{localStorage.setItem('panem-rebellion-v1',JSON.stringify(next));}catch{setStorageIssue(true);}sfx.play('whoosh');}
 if(gate==='blocked')return <section className="panel"><h1>La señal todavía no llegó.</h1><p>Encendé los tres emblemas para continuar la historia.</p><Link href="/mapa" className="primary">Volver a los distritos</Link></section>;
 if(!ready||gate!=='allowed')return <section className="panel" aria-busy="true">Sintonizando la señal…</section>;
 const chapter=CHAPTERS[answers.length];const last=answers.length?CHAPTERS[answers.length-1].options.find(o=>o.id===answers.at(-1)):null;
 return <section ref={root} className="rebellion-chapter">
  <header><p className="eyebrow">LA REBELIÓN / DESPUÉS DE LA CHISPA</p><span>FRECUENCIA 13.00 · CONECTADA</span></header>
  <div className="rebellion-layout"><aside aria-label="Red de los distritos"><div className="rebellion-orbit" aria-hidden="true"><span>13</span></div><p>LA SEÑAL SIGUE VIVA</p><ol><li>Distrito 11 · recibido</li><li>Distrito 3 · retransmitiendo</li><li>Distrito 6 · en movimiento</li></ol><button onClick={()=>setBurning(true)}>Volver a ver la chispa</button></aside>
  <div className="rebellion-copy" key={`${answers.length}-${!!progress.finalMessage}`}>
   {last&&<p className="rebellion-result" role="status">{last.result}</p>}
   {chapter?<><p className="eyebrow">CAPÍTULO {chapter.number}</p><h1>{chapter.title}</h1><p>{chapter.body}</p><h2>{chapter.question}</h2><div className="rebellion-options">{chapter.options.map(option=><button key={option.id} onClick={()=>choose(option.id)}><strong>{option.label}</strong><span>{option.hint}</span><b aria-hidden="true">↗</b></button>)}</div></>:progress.finalMessage?<><p className="eyebrow">CAPÍTULO 04 / UNA RESPUESTA DESDE EL SUBSUELO</p><h1>El Trece no era una tumba.</h1><p>La transmisión del Capitolio termina, pero la frecuencia sigue abierta. «Recibimos sus mensajes. Mantengan los refugios conectados. No están solos».</p><p>Las rutas que abriste y los suministros que enviaste forman ahora una red. La rebelión dejó de ser una frase: los distritos pueden organizarse.</p><Link className="primary" href="/distrito/13">Seguir la señal del Distrito 13</Link><Link href="/mapa">Volver a la red de distritos</Link></>:<><p className="eyebrow">CAPÍTULO 03 / LA VOZ QUE FALTA</p><h1>Ahora, que escuche el Capitolio.</h1><p>Los refugios están conectados. Falta ocupar la frecuencia que todavía transmite la versión oficial. Los distritos te dejan una decisión: convocar a la rebelión o leer los nombres de quienes ya no pueden responder.</p><Link className="primary" href="/capitolio">Tomar la transmisión →</Link></>}
   {storageIssue&&<p role="status">El navegador no pudo guardar este capítulo. Podés continuar en esta sesión.</p>}
   <Link className="rebellion-back" href="/mapa">← Volver al mapa</Link>
  </div></div>
 </section>;
}
