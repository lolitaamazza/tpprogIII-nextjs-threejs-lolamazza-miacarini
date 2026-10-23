# Panem: tres días antes de la Cosecha — diseño

Fecha: 2026-10-22. Historia elegida por Mia (opción 2 con los fragmentos de la opción 1); propuesta para Lola en https://claude.ai/artifact/Bhs6ecrNPwA87jxfoW83PN. Las cuatro preguntas abiertas de esa página se resuelven acá con mis propuestas, para ajustar con lo que digan Mia y Lola.

## Intención y por qué

Mia: "hay muchos minijuegos (los últimos quedaron muy simples al lado de los que armamos)"; quiere "desarrollar más la historia, que el usuario vaya descubriendo partes en base a lo que va encontrando, un camino más armado, no minijuego ×12 y después el archivo de los Juegos". Pidió además una capa más oscura y psicológica: opresión, planos sociales distintos, "que no sea todo fun and games".

La experiencia pasa a ser una historia con principio, nudo y final, donde los minijuegos y el archivo de los Juegos son partes de un mismo relato: tres chicos cuyos nombres están en la urna, los tres días antes de la Cosecha, las teselas como trampa, y lo que el Capitolio corta de su transmisión.

## La historia (lo que va a vivir quien juega)

1. **La transmisión.** La tele de la intro (Capitol TV) anuncia: "Faltan tres días para la Cosecha". Tono oficial, alegre.
2. **Tres días, un distrito por día**, en orden fijo:
   - Día 1 · Distrito 12 · **Ash** (el minero): Carbón.
   - Día 2 · Distrito 11 · **Oliva** (la cosechadora): Agricultura.
   - Día 3 · Distrito 4 · **Marin** (la pescadora): Pesca.
   En el mapa se marca el distrito del día; se juega su jornada (los minijuegos que ya existen, sin cambios de reglas).
3. **Las teselas**, al terminar cada jornada: la ración no alcanza para toda la familia. Se elige entre pedir teselas (la familia come, el nombre entra más veces en la urna) o no pedirlas (la familia pasa hambre; se ve en una línea y en el diorama). Ninguna opción es la correcta.
4. **Entre días**, la tele del Capitolio muestra su versión feliz del distrito que se acaba de jugar (pocos segundos, se puede saltear). En el mapa se pueden buscar **fragmentos**: lo que esa versión corta.
5. **La Cosecha.** La urna de Lola, con los papeles de cada uno según las teselas que pidió. Sale uno de los tres.
6. **Los Juegos.** El archivo de Lola sigue a quien salió: preparación con lo aprendido en los tres días, la arena y el desenlace.
7. **El final.** Se toma la transmisión del Capitolio: se elige el mensaje (rebelión o memoria) y, si se encontraron fragmentos, salen al aire. Arde Panem ("If we burn") y responde el 13.

Siempre se puede avanzar: perder un minijuego se reintenta como hoy, y los fragmentos son opcionales (cambian el final, no lo bloquean).

## Objetivos

1. Un camino armado con días, en vez de doce minijuegos sueltos.
2. La decisión de las teselas después de cada jornada, con consecuencias visibles en la urna.
3. Fragmentos para encontrar en los tres dioramas y en los otros nueve distritos (unos 12 en total), guardados en un "archivo pirata" que se puede abrir en cualquier momento.
4. La tele del Capitolio entre días, con su versión feliz.
5. La Cosecha decide quién de los tres va a la arena; el archivo de los Juegos sigue a esa persona.
6. Un final que cambia según lo encontrado (los fragmentos salen al aire) y según quién fue a la arena.

## No objetivos

- No cambian las reglas de los tres minijuegos ni la simulación de la arena (salvo lo necesario para que el tributo propio sea el que salió).
- No se rehacen la intro, el mapa, la pantalla rota del 13 ni el fuego (la referencia de fuego de Mia queda para otro momento).
- No hay violencia explícita.

## Anti-objetivos (sería un fracaso aunque funcione)

- Volver a "mucho texto": cada fragmento es un objeto y una línea; la tele del Capitolio, dos o tres líneas.
- Que una decisión trabe la historia o la castigue: no hay final "malo" que obligue a empezar de nuevo.
- Que lo oscuro sea gratuito: el peso está en las cuentas (papeles en la urna) y en lo que falta (sillas vacías, nombres rayados, el cuenco), no en mostrar sufrimiento.

## Restricciones

- Mismo stack (Next 16, Three r186, GSAP), lógica nueva en módulos puros con `node --test`, textos en español rioplatense con lo del mundo en inglés (Capitol TV).
- El archivo de los Juegos, la urna y los talleres son de Lola: los cambios en su código se hablan con ella.
- No se commitea ni pushea sin pedírselo a Mia.

## Lo que decidió Mia

- La historia de la página que vio ("sí, así me gusta la historia"), con los tres protagonistas de la lista de tributos de Lola (Ash del 12, Oliva del 11, Marin del 4).
- Armar el diseño con mis propuestas para las cuatro preguntas abiertas y ajustarlo después.

## Mis propuestas para las preguntas abiertas (a revisar con Mia y Lola)

1. **Tres días, no una semana.** Uno por cada minijuego bueno; una semana obliga a inventar cuatro días más de contenido.
2. **Los nueve talleres pasan a ser lugares para explorar.** Cada uno queda como escena (su maqueta de Lola, sin el juego) con uno o dos fragmentos para encontrar. El código de los talleres se conserva por si alguno se rehace más adelante al nivel de los otros tres.
3. **La urna siempre saca a uno de los tres**, con probabilidad según sus papeles: cuantas más teselas pidió, más papeles tiene. Así las decisiones pesan y la historia sigue a alguien conocido.
4. **En la arena se sigue a quien salió**; se saltea el paso de "elegir tributo".

## Detalles que propongo (mis decisiones, a revisar)

- **Papeles de partida:** Ash 5 (tiene 16), Oliva 4 (15), Marin 3 (14), como en el libro: un papel por año desde los 12.
- **Teselas:** pedir agrega 2 papeles (una por cada hermano). Si la jornada salió sin perder ninguna vida, alcanza con 1. No pedirlas no suma papeles y muestra el costo en una línea ("Esta noche cenan los chicos; Ash no").
- **La Cosecha:** la ceremonia de Lola (sacar los 24 papeles) se mantiene. El papel del 12, 11 o 4 que sale primero entre los tres protagonistas se decide con la proporción de papeles (sorteo con semilla, reproducible al recargar). Los otros dos protagonistas no van a la arena: su lugar en la lista lo ocupa otro nombre del mismo distrito.
- **El tributo propio:** quien salió entra a la arena como el tributo que se acompaña; la preparación usa las especialidades de los tres días (Carbón, Agricultura, Pesca), como antes de los talleres.
- **Fragmentos:** unos 12 (3 en los dioramas de los días y 9 en los otros distritos, uno por distrito, más la señal del 13 que ya existe). Cada uno es un objeto 3D resaltado sutilmente; al tocarlo aparece una tarjeta chica con el objeto y una línea, con el estilo de un documento del Capitolio tachado. Ejemplos: la viga de la mina con nombres rayados, la libreta de teselas de Ash, el parte de un Agente de la Paz del 11, el cuenco vacío de Marin, un afiche sobre la "generosidad" de las teselas, una grabación cortada de una Cosecha anterior.
- **Archivo pirata:** reemplaza el botón "Emblemas" del encabezado por "Día 2/3 · Fragmentos 4/12"; al abrirlo muestra los días jugados, los papeles de cada uno y los fragmentos encontrados.
- **Capitol TV entre días:** una placa corta con el estilo de la tele de la intro ("District 12 exceeds its coal quota", trabajadores sonrientes), 4 segundos, salteable.
- **El final:** si se encontraron 4 fragmentos o más, la transmisión pirata los muestra en un montaje antes del mensaje; si no, sale solo el mensaje. El cierre dice quién fue a la arena y cuántos papeles tenía cada uno.
- **"If we burn"** deja de dispararse con el tercer emblema y pasa al final, después de la transmisión.
- **Los emblemas pasan a ser los días:** completar la jornada de un día enciende ese distrito en el mapa y suma su capa de música, como hoy. Los otros nueve distritos se encienden recién en el final (con el fuego).
- **Orden de los días:** el distrito del día late en el mapa. Los otros dos distritos de los días se pueden visitar antes de tiempo, pero muestran la maqueta sin la jornada ("Mañana") y sus fragmentos sí se pueden encontrar. Un día ya jugado se ve como hoy un distrito encendido.
- **Hacia la Cosecha:** después de las teselas del día 3, la tele anuncia "Mañana, la Cosecha" y el mapa ofrece ir a la plaza (`/cosecha`). El acceso a "Los Juegos" del encabezado aparece recién ahí.
- **El Capitolio** se abre al terminar los Juegos (desenlace), no con tres emblemas.
- **Partidas viejas:** quien ya tenía 12, 11 y 4 encendidos empieza con esos días jugados y sin teselas pedidas; no hace falta más migración.
- **Guardado:** el estado de la historia (día, papeles, decisiones, fragmentos) en `localStorage` como el Distrito 13 (`panem-cosecha-v1`); la sincronización con la nube queda para después.

## Lo que queda a criterio de quien lo construya

- El diseño visual de la tarjeta de fragmento, de la placa de Capitol TV y del archivo pirata (dentro del estilo mínimo ya acordado: poco texto, el 3D primero).
- Qué objeto exacto y en qué lugar de cada maqueta va cada fragmento.
- Los textos finales de los fragmentos y de la tele (una línea cada uno).

## Orden sugerido

1. El estado de la historia (días, teselas, papeles) y el mapa por días.
2. La decisión de las teselas y la tele del Capitolio entre días.
3. Fragmentos y archivo pirata (empezando por los tres dioramas, después los nueve distritos).
4. La Cosecha con los papeles y el archivo de los Juegos siguiendo a quien salió (con Lola).
5. El final con los fragmentos y "If we burn" al final.
