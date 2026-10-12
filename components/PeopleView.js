import { people } from '@/data/chapters';
export default function PeopleView({ onPerson }) {
  return <section id="peopleView" className="secondary page-arrival">
    <p className="eyebrow">03 / NO ERAN SOLO TRIBUTOS</p><h2>Los rostros de la resistencia.</h2>
    <p>Los archivos del Capitolio cuentan victorias. Estos guardan lo que las hizo posibles.</p>
    <div className="people-grid" id="people">{people.map((person, index) => <article key={person.name} className="person"><div className="symbol" aria-hidden="true">{person.symbol}</div><p className="eyebrow">{person.label}</p><h3>{person.name}</h3><p>{person.copy}</p><button className="outline" onClick={() => onPerson(index)}>Abrir expediente ↗</button></article>)}</div>
  </section>;
}
