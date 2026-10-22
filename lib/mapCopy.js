// Texto de presentación del mapa según cuánto avanzó la persona. Puro: se prueba con `node --test`.
const EYEBROW = 'MAPA DE PANEM · 13 DISTRITOS';
const TOTAL = 3;

export function mapIntroCopy({ litCount, completed }) {
  if (completed) {
    return { eyebrow: EYEBROW, title: 'Panem ya no está a oscuras.', text: 'Recorré los distritos encendidos o empezá de nuevo desde Emblemas.' };
  }
  if (litCount >= TOTAL) {
    return { eyebrow: EYEBROW, title: 'La señal está lista.', text: 'Los tres distritos están encendidos. El Capitolio (C) ya se puede abrir.' };
  }
  if (litCount > 0) {
    const missing = TOTAL - litCount;
    return {
      eyebrow: EYEBROW,
      title: 'La chispa avanza.',
      text: `${litCount} de ${TOTAL} distritos encendidos. Falta${missing === 1 ? '' : 'n'} ${missing}: con tres emblemas, el Capitolio se abre.`,
    };
  }
  return { eyebrow: EYEBROW, title: 'Panem está a oscuras.', text: 'Elegí un distrito. Jugá en cualquiera de los doce y conseguí tres emblemas para abrir el Capitolio.' };
}
