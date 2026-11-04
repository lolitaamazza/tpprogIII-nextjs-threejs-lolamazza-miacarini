# La historia con trasfondo y el visor · diseño

Fecha: 2026-11-04. Para la entrega final (mañana). Sigue a `2026-10-22-panem-tres-dias-design.md` y `2026-10-23-escenas-de-los-distritos-design.md`.

## Intención y por qué

En la corrección le dijeron a Mia que todo pasa muy rápido y no se llega a conocer a los personajes: no importa si
Ash, Oliva o Marin salen en la urna porque no los conocemos. Mia quiere una historia con más trasfondo (no cambiar lo
visual), papeles más claros y más trágicos para que el jugador empatice, y un HUD en las escenas que haga sentir que
vemos el mundo desde los ojos del personaje (la referencia es Avatar y los visores de Halo).
La UX (papeles, botones) se revisa después, pantalla por pantalla, con Mia.

## Lo que decidió Mia

- **Cómo los conocemos:** su voz al llegar a la escena, 3 o 4 líneas en primera persona.
- **Lo que está en juego:** alguien depende de cada uno y cada uno ya perdió a alguien.
- **Los papeles:** mezcla. En las casas hablan los personajes y su familia; en el distrito habla el Capitolio.
- **La plaza:** se ve la reacción de los tres y quien sale se despide de su familia.
- **Ash (16, Distrito 12):** su mamá tiene los pulmones enfermos por el polvo del carbón y ya no puede trabajar. Ash hace el turno de los dos y cuida a su hermanito de 8, que todavía no sabe qué es la Cosecha.
- **Oliva (15, Distrito 11):** a su papá lo mataron desde la torre por cruzar el alambrado de noche para buscar comida. Oliva trabaja bajo esa misma torre y mantiene a su mamá y a sus hermanas.
- **Marin (14, Distrito 4):** su mamá fue tributo hace seis años y no volvió. Vive con su abuela, que ya casi no ve y no puede pescar.
- **El HUD:** el visor completo (mockup aprobado). Líneas finas en un solo celeste, letra Rajdhani, casi sin texto, íconos en lugar de palabras.

## Mis decisiones (para que Mia y Lola las revisen)

Los nombres de la familia, las frases y los textos de abajo son míos. Ningún nombre es de los libros.

- Ash vive con su mamá **Nora** y su hermanito **Tomi**.
- Oliva vive con su mamá y sus hermanas **Lila** (10) y **Brisa** (6). Su papá se llamaba **Teo**.
- Marin vive con su abuela **Inés**. Su mamá se llamaba **Perla**.

## El visor (HUD de las escenas)

Lo que ve el personaje, sobre la escena 3D. Se ve en las escenas de los tres días (12, 11 y 4), adentro de las casas
también, y no en el tren ni en las plazas (ahí manda la pantalla de la plaza).

- **Marco:** el borde de casco arriba y abajo, las marcas a los costados y la mira chica al centro.
- **Arriba al centro, la comida:** un cuenco y 8 porciones. Cuántas quedan en la casa ese día (Ash 2, Oliva 3, Marin 1). Si el día anterior se pidió comida, el día siguiente arranca con más porciones (se ve que la decisión cambió algo).
- **Arriba a la izquierda:** el ícono de una persona, el nombre grande y debajo la edad y el distrito.
- **Arriba a la derecha:** la urna con los papeles (cambia al pedir comida) y el sol con los días que faltan.
- **Abajo al centro, la familia:** un ícono por cada persona que depende de él o ella (la mamá de Ash con una cruz, Tomi chiquito; la mamá y las dos hermanas de Oliva; la abuela de Marin con un bastón).
- **Abajo a la izquierda, el radar:** gira, marca los lugares del distrito y da un pulso suave cuando hay algo escondido cerca (no dice qué ni dónde exacto).
- **Abajo a la derecha, el pulso:** un corazón que late y un número. Sube en la jornada (el reflector, el carbón, la red), cuando se lee algo triste y en la plaza; baja despacio.
- **Movimiento reducido:** sin barrido del radar, sin latido animado, sin parpadeo.
- **Celular:** el marco se simplifica (solo esquinas), la familia y el radar se achican.

## Los textos

Reglas de siempre: claros, sin metáforas difíciles, sin dos puntos, sin "tesela". Las líneas cortas (las que van en la
tarjeta) tienen menos de 110 caracteres; el texto largo de las pistas de las casas (`detail`) puede ser más largo.

### Al llegar (su voz, una línea por vez sobre la escena)

**Ash**
1. Me llamo Ash. Tengo dieciséis años y bajo a la mina desde los doce.
2. Mamá ya no puede respirar bien. El polvo del carbón se le quedó adentro.
3. Ahora hago su turno y el mío. Tomi tiene ocho años y cree que es por un tiempo.
4. Faltan tres días para la Cosecha. Mi nombre ya está cinco veces en la urna.

**Oliva**
1. Soy Oliva. Tengo quince años y trabajo en el huerto desde que tengo memoria.
2. A papá lo mataron desde esa torre. Cruzó el alambrado de noche para traernos algo de comer.
3. Ahora mamá, Lila y Brisa dependen de lo que yo junte.
4. Cosecho bajo la misma torre. Cada vez que gira la luz, me acuerdo.

**Marin**
1. Soy Marin. Tengo catorce años y pesco desde el muelle donde pescaba mamá.
2. Hace seis años la sacaron en la Cosecha. La vi irse en el tren y no volvió.
3. Vivo con mi abuela Inés. Ya casi no ve, así que la red es mía.
4. Mañana es la Cosecha. Este año mi nombre está más de una vez.

### En el mapa (antes de cada día)

- Faltan tres días para la Cosecha. **Día 1.** Ash hace dos turnos en la mina del Distrito 12 porque su mamá ya no puede.
- Faltan dos días. **Día 2.** Oliva cosecha bajo la torre donde mataron a su papá, en el Distrito 11.
- Mañana es la Cosecha. **Día 3.** Marin sale a pescar sola en el Distrito 4. Su abuela la espera.

### La pregunta de la comida (al terminar la jornada)

Primero se lee lo que pasó y después la pregunta (la tarjeta nueva se diseña con Mia en la revisión de UX).

- **Ash, al terminar:** Ash salió de la mina con las manos negras. En su casa quedan dos porciones para tres. Tomi preguntó si hoy hay cena.
- **Ash, si no pide:** Esta noche Ash le da su parte a Tomi y le dice que ya comió.
- **Oliva, al terminar:** Oliva llenó todos los cajones. Se los llevan al Capitolio. En su casa quedan tres porciones para cuatro.
- **Oliva, si no pide:** Esta noche Oliva reparte la comida entre su mamá y sus hermanas. Ella no cena.
- **Marin, al terminar:** Marin volvió con la red llena. El depósito se queda con casi todo. A la abuela Inés le toca un pescado chico.
- **Marin, si no pide:** Esta noche Marin le deja el pescado a su abuela. Le dice que ya comió en el muelle.
- **Si pide (los tres):** Esta noche comen todos. El nombre de {nombre} está {n} veces en la urna.

### Fragmentos (lo que el Capitolio esconde)

Los de los tres días, más cerca de los personajes:

- **12 · La viga de la mina:** En la viga hay treinta nombres tallados. Son mineros que no salieron. El último tenía catorce años.
- **11 · Castigo en la plaza:** Aviso del Capitolio. Por cruzar el alambrado de noche, castigo en la torre. Era el papá de Oliva.
- **4 · El cuenco de Marin:** Perla talló este cuenco antes de la Cosecha. Marin lo sigue poniendo en la mesa. Casi siempre vacío.

Los demás, más claros:

- **1 · Lista de voluntarios:** En el Distrito 1 los chicos se ofrecen solos para los Juegos. Los entrenan para eso desde chicos.
- **2 · Placa de un cuartel:** Los del Distrito 2 cortan la piedra de los cuarteles. Después, esos cuarteles los vigilan a ellos.
- **3 · Grabación cortada:** En una Cosecha vieja, una madre grita el nombre de su hijo. El Capitolio subió el himno para taparla.
- **5 · Plan de apagones:** La noche de la Cosecha solo habrá luz en la plaza y en las pantallas. El resto del distrito, a oscuras.
- **6 · Pasaje del tren:** El pasaje del tren de los tributos. Dice Capitolio. No tiene vuelta.
- **7 · Tronco marcado:** Una marca en el tronco por cada chico del Distrito 7 que fue a los Juegos y no volvió. Son muchas.
- **8 · Uniforme sin terminar:** Alguien cosió un sinsajo adentro de un uniforme del Capitolio. Si lo encuentran, lo castigan.
- **9 · Afiche del Capitolio:** «El Capitolio alimenta a sus hijos.» Abajo alguien escribió «a cambio de sus nombres».
- **10 · Registro de carne:** Casi toda la carne de este mes va al Capitolio. Lo que sobra es para los Agentes de la Paz.
- **13 · La señal del 13:** El Distrito 13 no desapareció. Alguien sigue transmitiendo.

### Pistas de las casas (hablan ellos o su familia)

**Casa de Ash**
- **El papel del turno:** «Antes del amanecer. Te guardo tu parte.» — Nora le deja la cena guardada aunque ella no coma. Abajo, con la letra de Tomi, «yo también te espero».
- **El pájaro cosido:** Un pájaro bordado en un retazo de la ropa de mamá. «No lo uses en la plaza.» Si lo ven, la castigan a ella.
- **La libreta de Ash:** Cada raya es un día que en la casa no hubo comida. Al lado, en letra chiquita, «que Tomi nunca tenga que pedir».

**Casa de Oliva**
- **La cuenta de Oliva:** Dos columnas. «Lo que cosechamos» llena la hoja. «Lo que comemos» es una línea. Abajo, «papá cruzó por esto».
- **Cuatro notas:** Las cuatro notas que silbaba papá desde el campo. «Cuando la torre calle, contestá.» Oliva todavía contesta.
- **El registro del granero:** Destino Capitolio. Carga completa. La misma semana, en tres casas del distrito no hubo cena.
- **La reserva escondida:** Semillas envueltas en un papel con la letra de Teo. «Para cuando el huerto sea nuestro.»

**Casa de Marin**
- **La cuenta del muelle:** «Hoy, primero la cuota.» Abajo, con letra temblorosa, la abuela escribió «¿y vos cuándo comés?».
- **El mensaje de la marea:** Una nota de Perla, guardada seis años. «Si encontrás una botella entre las redes, no la tires.»
- **La botella en la red:** Adentro hay un papel. En el Distrito 3 alguien arregla radios a escondidas. Escuchan lo que el Capitolio calla.

En el distrito (voz del Capitolio): **El cartel de la mina** (Cuota diaria, cuarenta toneladas. Quien no la cumple pierde su ración.) y **El nicho del túnel** (Alguien rayó un sinsajo y el número 6. En el 6 guardan la llave del depósito.) quedan así, con ese ajuste.

### Las plazas de la Cosecha

En cada plaza, después de que sale el papel, primero la reacción del personaje (su voz) y, si es quien sale, la despedida.

**Si se salva**
- **Ash:** No soy yo. Respiro por primera vez en el día. Busco a Tomi entre la gente y no lo suelto.
- **Oliva:** No soy yo. Alguien a mi lado llora. Es la mamá de la chica que sí. Le agarro la mano.
- **Marin:** No soy yo. La abuela me aprieta el brazo tan fuerte que me duele. Mamá también estuvo acá.

**Si sale su nombre**
- **Ash:** Escucho mi nombre y miro a Tomi. Sigue sin saber qué es la Cosecha. Ahora sí lo sabe.
- **Oliva:** Escucho mi nombre. Subo al escenario mirando la torre. No voy a bajar la vista.
- **Marin:** Escucho mi nombre, igual que el de mamá hace seis años. Subo por la misma escalera.

**La despedida (solo de quien sale, antes de ir a los Juegos)**
- **Ash, con Nora y Tomi:** Tomi me da el pájaro cosido. Mamá me dice que respire. Le prometo a Tomi que vuelvo para la cena.
- **Oliva, con su mamá y sus hermanas:** Lila me pregunta quién va a contestar las notas. Le enseño a silbarlas. Brisa no me suelta.
- **Marin, con la abuela Inés:** La abuela me toca la cara para verme. Me da el cuenco de mamá. Me dice que traiga algo para llenarlo.

### Las líneas del final

- **El Capitolio (bulletins en inglés) queda igual.**
- **El cierre:** a las líneas de siempre se suma una que vuelve a la familia: «{nombre} fue a la arena. {familia} siguen esperando en el Distrito {n}.» (por ejemplo «Nora y Tomi siguen esperando en el Distrito 12.»).

## No objetivos (para mañana)

- Cambiar lo visual de las escenas o de los minijuegos.
- La revisión de UX (papeles, botones, la tarjeta de la comida): se hace después con Mia, pantalla por pantalla.
- El Distrito 6 y el 3.

## Anti-objetivos

- Un melodrama largo: cada texto es corto y se puede saltear.
- Que el HUD tape la escena o la jornada.
- Nombres o personajes de los libros.

## Lo que queda para el que lo construye

- Dónde se guarda la voz al llegar (por ejemplo `arrival` en cada `lib/locations/districtN.js`), cuánto dura cada línea y cómo se saltea.
- El cálculo de las porciones y del pulso en el visor, y los íconos en SVG.
- Dónde va la reacción y la despedida en `PlazaJourney`.
