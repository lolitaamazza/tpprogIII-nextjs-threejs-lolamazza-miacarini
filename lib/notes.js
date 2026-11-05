// Lo que dice cada nota escrita a mano, como en el papel de verdad: renglones, rayas de a cinco, columnas, tachaduras
// y firmas, cada uno con la letra de quien lo escribió (las fuentes --hand-* de app/layout.js). Puro: se prueba con `node --test`.
// Bloques: { t: 'title' | 'text' | 'tally' | 'cols' | 'strike' | 'sign' | 'notes', s?, n?, left?, right?, hand? }.
export const NOTES = Object.freeze({
  'p-12-libreta': { hand: 'ash', blocks: [
    { t: 'title', s: 'Días sin comida' },
    { t: 'tally', n: 13 },
    { t: 'text', s: 'que Tomi nunca tenga que pedir' },
  ] },
  'p-12-turno': { hand: 'nora', blocks: [
    { t: 'text', s: 'Ash,' },
    { t: 'text', s: 'entrás antes del amanecer.' },
    { t: 'text', s: 'Te guardo tu parte en la lata.' },
    { t: 'sign', s: 'Mamá' },
    { t: 'text', s: 'yo también te espero', hand: 'tomi' },
  ] },
  'p-11-racion': { hand: 'oliva', blocks: [
    { t: 'cols', left: ['Lo que cosechamos', '40 cajones de peras', '25 de ciruelas', '12 de manzanas'], right: ['Lo que comemos', '3 peras golpeadas'] },
    { t: 'text', s: 'papá cruzó por esto' },
  ] },
  'p-11-silbido': { hand: 'teo', blocks: [
    { t: 'notes' },
    { t: 'text', s: 'Cuando la torre calle, contestá.' },
    { t: 'sign', s: 'papá' },
  ] },
  'p-11-reserva': { hand: 'teo', blocks: [
    { t: 'text', s: 'semillas de pera, 12' },
    { t: 'text', s: 'semillas de ciruela, 8' },
    { t: 'text', s: 'Para cuando el huerto sea nuestro.' },
    { t: 'sign', s: 'Teo' },
  ] },
  'p-4-cuota': { hand: 'marin', blocks: [
    { t: 'strike', s: 'lunes, 14 peces, depósito 12' },
    { t: 'strike', s: 'martes, 9 peces, depósito 8' },
    { t: 'text', s: 'Hoy, primero la cuota.' },
    { t: 'text', s: '¿y vos cuándo comés?', hand: 'ines' },
  ] },
  'p-4-marea': { hand: 'perla', blocks: [
    { t: 'text', s: 'Marin,' },
    { t: 'text', s: 'si encontrás una botella entre las redes, no la tires.' },
    { t: 'sign', s: 'mamá' },
  ] },
  'p-4-botella': { hand: 'teo', blocks: [
    { t: 'text', s: 'Si te llega esta botella' },
    { t: 'text', s: 'en el 3 arreglamos radios.' },
    { t: 'text', s: 'Escuchá a medianoche.' },
  ] },
});

// Las rayas de a cinco (cuatro palitos y uno que los cruza): 13 → [5, 5, 3].
export function tallyGroups(n) {
  return Array.from({ length: Math.ceil(n / 5) }, (_, i) => Math.min(5, n - i * 5));
}

// Los documentos del Capitolio, como el papel de verdad (a máquina): títulos, tablas, sellos, firmas tachadas y,
// encima, lo que alguien escribió a mano. Bloques: { t: 'head' | 'big' | 'line' | 'rows' | 'stamp' | 'strike' | 'scrawl', ... }.
export const DOCS = Object.freeze({
  'p-12-cartel': { blocks: [
    { t: 'big', s: 'Cuota diaria' },
    { t: 'big', s: '40 toneladas' },
    { t: 'line', s: 'Quien no la cumple pierde su ración.' },
    { t: 'head', s: 'Agentes de la Paz, Distrito 12' },
  ] },
  'p-11-envio': { blocks: [
    { t: 'head', s: 'Registro de envíos, Distrito 11' },
    { t: 'rows', rows: [['Envío', 'Carga', 'Destino', 'Estado'], ['112', '40 cajones de peras', 'Capitolio', 'completo'], ['113', '25 cajones de ciruelas', 'Capitolio', 'completo']] },
    { t: 'strike', s: 'Firma del supervisor' },
    { t: 'scrawl', s: 'y esa semana, tres casas sin cena', hand: 'oliva' },
  ] },
  '1-voluntarios': { blocks: [
    { t: 'head', s: 'Distrito 1, voluntarios para los Juegos' },
    { t: 'rows', rows: [['Nombre', 'Edad', ''], ['Lux', '17', 'voluntario'], ['Cassia', '16', 'voluntaria'], ['Aurum', '12', 'en entrenamiento']] },
    { t: 'line', s: 'La familia del ganador cobra de por vida.' },
  ] },
  '5-cortes': { blocks: [
    { t: 'head', s: 'Plan de luz para la noche de la Cosecha' },
    { t: 'rows', rows: [['Plaza', 'encendida'], ['Pantallas', 'encendidas'], ['Casas', 'apagadas'], ['Hospital', 'apagado']] },
    { t: 'stamp', s: 'Aprobado' },
  ] },
  '6-ruta': { blocks: [
    { t: 'big', s: 'Tren de tributos' },
    { t: 'rows', rows: [['Desde', 'Distrito 6'], ['Hasta', 'Capitolio'], ['Vuelta', 'no corresponde']] },
    { t: 'stamp', s: 'Solo ida' },
  ] },
  '9-afiche': { blocks: [
    { t: 'big', s: 'El Capitolio alimenta a sus hijos' },
    { t: 'scrawl', s: 'a cambio de sus nombres', hand: 'ash' },
  ] },
  '10-raciones': { blocks: [
    { t: 'head', s: 'Carne del mes, Distrito 10' },
    { t: 'rows', rows: [['Capitolio', '82 %'], ['Agentes de la Paz', '15 %'], ['Distrito 10', '3 %']] },
  ] },
  '11-parte': { blocks: [
    { t: 'big', s: 'Aviso' },
    { t: 'line', s: 'Castigo público en la torre.' },
    { t: 'line', s: 'Por cruzar el alambrado de noche.' },
    { t: 'head', s: 'Asistencia obligatoria' },
    { t: 'scrawl', s: 'papá', hand: 'oliva' },
  ] },
});
