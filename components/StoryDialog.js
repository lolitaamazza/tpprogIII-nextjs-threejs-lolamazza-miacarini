'use client';
import { useEffect, useRef, useState } from 'react';
import { chapters, names, people } from '@/data/chapters';
import ThreeSignal from '@/components/ThreeSignal';

const hint = {
  forest: 'Tres líneas descienden como un arroyo. La marca señala el agua.',
  lake: 'El recipiente está marcado: primero raíz, después corriente, al final descarga.',
  tower: 'Un grabado en el receptor dice: 7.5 MHz.',
};
const sectorHeadlines = ['La niebla baja', 'El claro vacío', 'Raíces y ceniza'];
const sectorCopies = [
  'La vegetación ha cubierto las plataformas. Un cable oxidado se pierde hacia la torre del sector 12.',
  'Un poste señala la línea de inundación. Las marcas del agua apuntan al lago, en el sector 4.',
  'Encuentras huellas antiguas junto a la valla. Una flecha tallada apunta al bosque del sector 7.',
];

export default function StoryDialog({ mode, sceneId, progress, sector, person, onClose, onScene, onCollect, onNext, onBegin, onEnding, onReset, onArena }) {
  const ref = useRef(null);
  const [step, setStep] = useState('inspect');
  const [feedback, setFeedback] = useState('');
  const [sequence, setSequence] = useState([]);
  const [frequency, setFrequency] = useState(4);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    function escape(event) { event.preventDefault(); onClose(); }
    dialog?.addEventListener('cancel', escape);
    return () => { dialog?.removeEventListener('cancel', escape); if (dialog?.open) dialog.close(); };
  }, [onClose]);
  const chapter = chapters.find((entry) => entry.clueId === sceneId);
  const count = progress.clues.length;
  const recovered = progress.clues.includes(sceneId);
  function symbol(value) {
    const next = [...sequence, value];
    const correct = ['arbol', 'agua', 'rayo'];
    if (next[next.length - 1] !== correct[next.length - 1]) {
      setSequence([]); setFeedback('El cierre vuelve al inicio. Raíz → corriente → descarga.'); return;
    }
    if (next.length === 3) onCollect('lake');
    else { setSequence(next); setFeedback(`${next.length} de 3 símbolos correctos.`); }
  }
  const forestGate = mode === 'scene' && sceneId === 'lake' && !progress.clues.includes('forest');
  const towerGate = mode === 'scene' && sceneId === 'tower' && !progress.clues.includes('lake');
  return <dialog ref={ref} id="dialog" className={['intro','scene','collected','final','ending'].includes(mode) ? 'story-dialog' : ''} onClick={(event) => {
    if (event.target === ref.current) onClose();
  }} aria-label="Archivo narrativo">
    <button id="close" aria-label="Cerrar ventana" onClick={onClose}>×</button>
    <div id="dialogBody" className="chapter-enter">
      {['scene','collected','final','ending'].includes(mode) && <div className="chapter-progress" aria-hidden="true">{chapters.map(({ clueId }) => <span key={clueId} className={progress.clues.includes(clueId) || clueId === sceneId ? 'lit' : ''} />)}</div>}
      {mode === 'intro' && <>
        <p className="eyebrow">PRÓLOGO / TRANSMISIÓN SIN AUTOR</p><h2>Si escuchas esto,<br />todavía hay tiempo.</h2>
        <p>Eres una persona encargada de recuperar archivos destruidos por el Capitolio. Una señal te lleva a una arena abandonada. No buscas una victoria: buscas a quienes desaparecieron de sus registros.</p>
        <div className="artifact">«Dejé tres fragmentos. Bosque. Agua. Cielo. Reúnelos y encontrarás lo que escondieron.»</div>
        <p>Explora los puntos del paisaje o los sectores del mapa. Examina objetos, resuelve las pistas y consulta Mi archivo. No hay límite de tiempo.</p>
        <button className="primary" onClick={onBegin}>{count ? 'Volver a explorar' : 'Seguir la primera señal'} ↗</button>
      </>}
      {mode === 'scene' && chapter && (forestGate || towerGate) && <>
        <p className="eyebrow">{chapter.eyebrow}</p><h2>{chapter.title}</h2>
        <p>{forestGate ? 'Hay un recipiente bajo el muelle, pero necesitas saber qué buscar. Una marca en la madera coincide con las incisiones del bosque.' : 'El receptor está encendido, pero la clave de la frecuencia está escrita en el archivo del lago.'}</p>
        <button className="primary" onClick={() => onScene(forestGate ? 'forest' : 'lake')}>Investigar {forestGate ? 'el bosque' : 'el lago'} ↗</button>
      </>}
      {mode === 'scene' && chapter && !forestGate && !towerGate && <>
        <p className="eyebrow">{chapter.eyebrow}</p><h2>{chapter.title}</h2><p>{chapter.copy}</p>
        <ThreeSignal chapter={sceneId} onInspect={() => setFeedback(hint[sceneId])} />
        {sceneId === 'forest' && step === 'inspect' && <>
          <div className="artifact">Objetos examinables</div>
          <div className="choices"><button onClick={() => setFeedback(hint.forest)}>⌁ Examinar la corteza</button><button onClick={() => { setStep('puzzle'); setFeedback(''); }}>◇ Abrir el cilindro</button></div>
        </>}
        {sceneId === 'forest' && step === 'puzzle' && <>
          <p className="eyebrow">DESAFÍO 01 / INTERPRETAR UNA PISTA</p><h3>¿Qué camino elegirás?</h3>
          <p>«No sigas el fuego. Sigue lo que puede apagarlo».</p>
          <div className="choices">
            <button onClick={() => setFeedback('La grabación habla de apagar el fuego. Escucha su sentido literal.')}>La columna de humo</button>
            <button onClick={() => onCollect('forest')}>El cauce del arroyo</button>
            <button onClick={() => setFeedback('La grabación habla de apagar el fuego. Escucha su sentido literal.')}>Las luces de la torre</button>
          </div>
          <button className="outline" onClick={() => setStep('inspect')}>Volver a examinar</button>
        </>}
        {sceneId === 'lake' && <>
          <div className="artifact">«Primero la raíz. Después la corriente. Al final, la descarga.»</div>
          <p>Activa los símbolos en ese orden.</p>
          <div className="choices"><button onClick={() => symbol('rayo')}>ϟ Rayo</button><button onClick={() => symbol('arbol')}>♧ Árbol</button><button onClick={() => symbol('agua')}>≈ Agua</button></div>
        </>}
        {sceneId === 'tower' && <>
          <p>El dial recoge interferencias. Ajusta la frecuencia de mantenimiento.</p>
          <label htmlFor="frequency">Frecuencia del receptor</label>
          <input id="frequency" type="range" min="1" max="10" step="0.1" value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} />
          <output htmlFor="frequency">{frequency.toFixed(1)} MHz</output>
          <button className="primary" onClick={() => Math.abs(frequency - 7.5) < .01 ? onCollect('tower') : setFeedback('Solo interferencias. Consulta el fragmento del lago o el objeto 3D.')}>Escuchar la señal ↗</button>
        </>}
        <p className="feedback" role="status">{feedback}</p>
      </>}
      {mode === 'collected' && chapter && <>
        <p className="eyebrow">ARCHIVO RECUPERADO / {count} DE 3</p><h2>{chapter.label}</h2>
        <div className="artifact">{chapter.artifact}</div><p>El fragmento ya está en Mi archivo. Puedes consultarlo cuando lo necesites.</p>
        <button className="primary" onClick={() => onNext(sceneId)}>{count === 3 ? 'Reconstruir la señal' : sceneId === 'forest' ? 'Seguir el arroyo hasta el lago' : 'Subir hacia la torre'} ↗</button>
        <button className="outline journey-button" onClick={onArena}>Volver al mapa ↗</button>
      </>}
      {mode === 'journal' && <>
        <p className="eyebrow">ARCHIVO PERSONAL / {count} DE 3</p><h2>Lo que has encontrado.</h2>
        {count ? progress.clues.map((id) => <button key={id} className="outline archive-entry" onClick={() => onScene(id)}>✓ {names[id]} ↗</button>) : <p>Todavía no hay fragmentos. Empieza por examinar el bosque.</p>}
        <p>{progress.ending ? 'Aventura completada. Puedes volver a escuchar el final desde el mapa.' : 'Objetivo: recuperar bosque → lago → torre.'}</p>
      </>}
      {mode === 'sector' && <>
        <p className="eyebrow">SECTOR {String(sector).padStart(2,'0')} / RECONOCIMIENTO</p>
        <h2>{sectorHeadlines[sector % 3]}</h2><p>{sectorCopies[sector % 3]}</p>
        <p>No hay fragmentos en este sector. Los círculos dorados del mapa marcan las tres señales.</p>
      </>}
      {mode === 'person' && people[person] && <>
        <p className="eyebrow">ROSTROS / LECTURA NARRATIVA</p><h2>{people[person].name}</h2>
        <p>{people[person].copy}</p><div className="artifact">{people[person].artifact}</div>
        <p>Esta historia de archivos perdidos es una ficción original de fans, no una escena canónica.</p>
      </>}
      {mode === 'final' && <>
        <p className="eyebrow">ÚLTIMA TRANSMISIÓN / LA DECISIÓN</p><h2>Nadie sale a solas.</h2>
        <p>Los fragmentos revelan una brecha en la barrera. Una operadora clandestina responde: «Puedo transmitir una sola vez antes de que nos encuentren. Tú eliges el mensaje».</p>
        <div className="choices"><button onClick={() => onEnding('truth')}>Transmitir los archivos: que Panem conozca la verdad.</button><button onClick={() => onEnding('route')}>Transmitir la ruta: que los atrapados encuentren la salida.</button></div>
        <p>No hay una respuesta correcta. Hay algo que decides proteger.</p>
      </>}
      {mode === 'ending' && <>
        <p className="eyebrow">EPÍLOGO / {progress.ending === 'truth' ? 'LA MEMORIA ES UNA REBELIÓN' : 'NINGUNA VIDA ES UN NÚMERO'}</p>
        <h2>{progress.ending === 'truth' ? 'El silencio se rompe.' : 'Una luz entre los árboles.'}</h2>
        <p>{progress.ending === 'truth' ? 'Las pantallas de los distritos parpadean. Durante unos segundos, Panem ve los planos, las órdenes, los nombres borrados. El Capitolio corta la transmisión. Demasiado tarde: alguien ya está copiándola.' : 'El mensaje viaja de receptor en receptor. Al caer el rayo, pequeñas siluetas abandonan sus escondites. Una a una cruzan la costura de la barrera. El mapa ya no señala una arena. Señala un camino de vuelta.'}</p>
        <div className="artifact">«No pudieron controlar lo que elegimos recordar.»</div>
        <p>Has completado Ecos de la arena. Tres fragmentos recuperados. Una historia que ahora también es tuya.</p>
        <button className="primary" onClick={onArena}>Volver a Panem ↗</button>
      </>}
      {mode === 'reset' && <>
        <p className="eyebrow">VOLVER AL PRINCIPIO</p><h2>¿Reiniciar la aventura?</h2>
        <p>Se borrarán los tres fragmentos y el final guardado en este navegador y, si corresponde, en Firebase.</p>
        <div className="choices"><button onClick={onReset}>Sí, comenzar de nuevo</button><button onClick={onClose}>Conservar mi avance</button></div>
      </>}
    </div>
  </dialog>;
}
