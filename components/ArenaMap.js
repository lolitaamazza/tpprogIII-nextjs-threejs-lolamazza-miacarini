import { chapters, sectors } from '@/data/chapters';
export default function ArenaMap({ progress, onScene, onSector, onFinal, storageOK, syncState }) {
  return <section className="workspace" id="exploration">
    <div className="section-top"><div><p className="eyebrow">01 / CARTOGRAFÍA DE LO INVISIBLE</p><h2>Todo lugar guarda un secreto.</h2></div><p>Elige una zona. Examina sus huellas.<br />Reconstruye lo que ocurrió aquí.</p></div>
    <div className="arena-grid"><div className="radar-wrap"><div className="radar" id="radar">
      <div className="radar-water" /><span className="center-mark">⌁<small>CORNUCOPIA</small></span>
      {sectors.map(({ id, number, x, y }) => <button key={number} style={{ left: `${x}%`, top: `${y}%` }}
        className={`${id ? 'relevant' : ''} ${progress.clues.includes(id) ? 'found' : ''}`}
        onClick={() => id ? onScene(id) : onSector(number)}
        aria-label={`Sector ${number}${id ? `, ${chapters.find((ch) => ch.clueId === id).label}` : ', explorar terreno'}`}>
        {String(number).padStart(2,'0')}
      </button>)}
    </div><div className="map-caption"><span>ARENA / VISTA TÁCTICA</span><span>12 SECTORES · MAPA INTERPRETATIVO</span></div></div>
      <aside className="mission"><p className="eyebrow">TU MISIÓN</p><h3>Encuentra la<br />frecuencia oculta.</h3>
        <p>{progress.clues.length === 3 ? 'Ya tienes los tres fragmentos. La salida existe. Reconstruye la señal y decide qué merece llegar al otro lado.' : 'Alguien dejó un rastro antes de desaparecer. Empieza por el bosque: hay marcas que las cámaras no pueden ver.'}</p>
        <ol id="objectives">{chapters.map(({ clueId, label }, i) => <li key={clueId}><span>{progress.clues.includes(clueId) ? '✓' : String(i+1).padStart(2,'0')}</span>{label}</li>)}</ol>
        <button className="primary" onClick={onFinal} disabled={progress.clues.length !== 3}>{progress.ending ? 'Volver a escuchar el final' : 'Reconstruir la señal'} <span>↗</span></button>
        <p className="save-note">{!storageOK ? 'Guardado no disponible: el avance dura esta sesión.' : syncState === 'cloud' ? 'Progreso sincronizado con Firebase (NUBE).' : 'Tu avance se guarda en este navegador (LOCAL).'}</p>
      </aside>
    </div>
  </section>;
}
