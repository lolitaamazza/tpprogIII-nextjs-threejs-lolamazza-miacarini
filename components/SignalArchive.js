'use client';
import { useState } from 'react';
import ThreeSignal from '@/components/ThreeSignal';

export default function SignalArchive({ onExplore }) {
  const [message, setMessage] = useState('');

  function inspect() {
    setMessage('La señal responde. Hay una frecuencia oculta dentro de la interferencia.');
  }

  return <section className="signal-archive" id="signal-archive">
    <div className="signal-archive-copy">
      <p className="eyebrow">02 / CÁMARA DE RESONANCIA</p>
      <h2>La señal no desapareció.<br /><em>Fue enterrada.</em></h2>
      <p>Entre los restos de la arena encontraste un receptor que todavía conserva energía. Sus piezas no pertenecen al Capitolio: alguien lo construyó para enviar un mensaje fuera de los límites.</p>
      <p>Girá el objeto, seguí sus pulsos y escuchá qué queda de la transmisión perdida. Cada fragmento recuperado modifica la frecuencia.</p>
      <p className="signal-status" role="status">{message || 'ESTADO DEL RECEPTOR · EN ESPERA'}</p>
      <button className="primary" onClick={onExplore}>Investigar la torre <span>↗</span></button>
    </div>
    <div className="signal-archive-object">
      <p className="signal-object-label">ARTEFACTO 03 / RECEPTOR DE CAMPO</p>
      <ThreeSignal chapter="tower" onInspect={inspect} />
      <p className="signal-caption">Interactuá con el núcleo para revelar el siguiente rastro.</p>
    </div>
  </section>;
}
