'use client';
export default function TributeHud({tribute}) {
 return <section className="tribute-hud" aria-label={`Estado actual de ${tribute.name}`}>
  <div className="hud-identity"><strong>{tribute.name} <small>D{tribute.district}</small></strong><span>{tribute.alive?'TU TRIBUTO':'CAÍDO'} · Equipo {tribute.equipment}</span></div>
  <div className="hud-meters">{[['Salud','health',false],['Energía','energy',false],['Hambre','hunger',true],['Sed','thirst',true]].map(([label,key,inverse])=><div className={`hud-stat ${((inverse?100-tribute[key]:tribute[key])<30)?'critical':''}`} key={key}><span>{label}<b>{tribute[key]}<small>/100</small></b></span><meter aria-label={label} min="0" max="100" value={tribute[key]} low={30} high={70} optimum={inverse?0:100}/></div>)}</div>
  <div className="hud-supplies"><span>Comida <b>{tribute.food}</b></span><span>Agua <b>{tribute.water}</b></span></div>
 </section>;
}
