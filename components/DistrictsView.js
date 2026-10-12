'use client';
import { useState } from 'react';
import { industries, districtStories, districtCoordinates } from '@/data/chapters';
export default function DistrictsView({ onArena }) {
  const [chosen, setChosen] = useState(11);
  return <section id="panemView" className="secondary page-arrival">
    <p className="eyebrow">02 / UN PAÍS, DOCE SILENCIOS</p><h2>Más allá de la arena.</h2><p>Cada distrito sostiene a Panem. Cada distrito tiene algo que contar.</p>
    <div className="district-layout"><div className="district-map" id="districtMap">
      {districtCoordinates.map(([x, y], i) => <button key={i} className={chosen === i ? 'active' : ''} onClick={() => setChosen(i)} style={{ left: `${x}%`, top: `${y}%` }} aria-label={`Distrito ${i+1}: ${industries[i]}`} aria-pressed={chosen === i}>{i + 1}</button>)}
    </div><article id="districtDetail" key={chosen} className="page-arrival">
      <p className="eyebrow">ARCHIVO TERRITORIAL / DISTRITO</p><span className="district-number">{String(chosen+1).padStart(2, '0')}</span><h2>{industries[chosen]}</h2><p>{districtStories[chosen]}</p>
      <div className="artifact"><p>REGISTRO CLANDESTINO</p><p>{chosen === 11 ? '«Si el bosque guarda una señal, alguien quiso que la encontráramos.»' : '«Un distrito no es su industria. Es la gente que vive en él.»'}</p></div>
      <button className="outline" onClick={onArena}>Seguir la señal en la arena ↗</button>
    </article></div><p className="save-note">Cartografía narrativa interpretativa, inspirada en tus referencias.</p>
  </section>;
}
