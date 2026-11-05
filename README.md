# Panem. Tres días antes de la Cosecha

> **Declaración de uso de IA:** en este proyecto usamos Claude (Anthropic), a través de Claude Code, como asistente de programación. Qué hizo, qué decidimos nosotras y cómo trabajamos con esa herramienta está en [`docs/declaracion-ia.md`](docs/declaracion-ia.md).

> Faltan tres días para la Cosecha. Tres chicos tienen su nombre en la urna, y lo que encontrás en sus distritos es lo que el Capitolio no quiere que se vea.

Experiencia web transmedia (TP6, Programación Multimedial III, UMAI) inspirada en *The Hunger Games*.
Next.js 16 + Three.js + GSAP + Firebase. JavaScript, App Router.

**Deploy:** _pendiente: completar con la URL pública (Vercel)_

## Sinopsis

En la sala de transmisión del Capitolio, una tele gigante emite el anuncio oficial: Panem vive en paz. Al encender la señal, la transmisión se corta y la cámara entra en la pantalla hasta un mapa 3D de Panem, gris y apagado. Faltan tres días para la Cosecha y la historia sigue a tres chicos cuyos nombres están en la urna. Cada día se juega la jornada de uno de ellos:

- **Ash** (16, Distrito 12, carbón). Su mamá Nora está enferma y su hermano Tomi tiene 8 años. Baja a la mina y pica la veta cuando la luz pasa por la grieta.
- **Oliva** (15, Distrito 11, agricultura). A su papá Teo lo mataron desde la torre. Cosecha sin que la vea el reflector y contesta el silbido de los sinsajos.
- **Marin** (14, Distrito 4, pesca). Su mamá Perla fue tributo y no volvió, y vive con su abuela Inés, que casi no ve. Carga la red y la tira contra la corriente.

**Escenas:** cada distrito de los tres días es una escena 3D realista con cámara guiada en primera persona. Se toca un lugar (o su botón, o su número) y la cámara camina hasta ahí. Se llega en tren desde el mapa, se escucha la voz del personaje al llegar y se puede entrar a las casas (y al granero del 11). El HUD es un visor celeste con el distrito, el día, la familia y lo encontrado. Los minijuegos se pueden perder y reintentar y, después de perder dos veces, el juego ayuda. Fuera de su día se pueden practicar sin cambiar la historia.

**Pedir comida:** al terminar cada jornada, en la casa no alcanza la comida. Si el personaje la pide, la familia come, pero su nombre entra más veces en la urna (dos papeles más, o uno si la jornada salió sin perder vidas). Si no la pide, esa noche no cenan. Ninguna opción es la correcta. Después, la tele del Capitolio muestra su versión feliz del distrito y el mapa pasa al día siguiente.

**Lo que se encuentra:** el archivo pirata del encabezado guarda todo en cuatro pestañas.
- *Fragmentos:* 13, uno por distrito productivo más la señal del 13. Son notas escritas a mano por los personajes y documentos del Capitolio.
- *Herramientas:* el farol, la llave y la radio. Cada una abre lugares en otros distritos.
- *Marcas del sinsajo:* 9.
- *Pistas:* llevan a otro lugar o cuentan algo de las familias.

Los otros nueve distritos se recorren como maquetas, con los talleres de Lola (`lib/story.js`, `lib/fragments.js`, `lib/clues.js`, `lib/notes.js`).

**Distrito 13 (secreto opcional):** al entrar, la imagen del mapa se rompe en fragmentos con señal corrupta. Los pedazos se pueden arrastrar y debajo transmite otra señal. Moviendo suficientes aparece el mensaje oculto, que cuenta como el fragmento 13.

**La Cosecha:** hechos los tres días, el tren pasa por las plazas del 12, el 11 y el 4 (`/plazas`). En cada una se saca un papel y cada familia reacciona. La urna elige a uno de los tres según sus papeles: cuantas más veces pidió comida, más probable. El archivo de los Juegos de Lola sigue a quien salió.

**El final:** terminados los Juegos se abre el Capitolio. Se toma la transmisión y, con cuatro fragmentos o más, salen al aire uno por uno. Se enciende todo Panem, incluido el Distrito 13. El cierre trae la voz de la familia de quien fue a la arena. Con seis marcas o más, también suma la voz de la resistencia.

## Mapa de navegación

```text
/  (la tele del Capitolio: "Encender la señal" → corte → mapa; "Saltar" o Esc)
 └─ /mapa
      ├─ /tren/12 → /escena/12   día 1, Ash (mina, casa) → pedir comida → Capitol TV → mapa
      ├─ /tren/11 → /escena/11   día 2, Oliva (huerto, casa, granero) → pedir comida → Capitol TV → mapa
      ├─ /tren/4  → /escena/4    día 3, Marin (muelle, casa) → pedir comida → Capitol TV → mapa
      ├─ /distrito/1…10          maqueta para explorar con su fragmento
      ├─ /distrito/13            la imagen se rompe: secreto opcional (fragmento 13)
      ├─ /plazas                 (hechos los tres días) tren por las tres plazas, un papel en cada una
      │    └─ /capitolio/preparacion → /arena → /desenlace   (archivo de los Juegos, de Lola)
      │       (/cosecha: la urna de 24 papeles de Lola, desde "Los Juegos")
      └─ /capitolio              (terminados los Juegos) transmisión → fragmentos al aire → Panem encendido → cierre
```

## Requisitos de la consigna y dónde se cumplen

| Requisito | Implementación |
| --- | --- |
| Premisa, inicio, progresión y cierre | Intro de la tele → tres días (jornada y pedir comida) → Cosecha por plazas → Juegos → Capitolio |
| ≥ 3 escenas | `/`, `/mapa`, `/escena/[id]` (12, 11 y 4 con sus interiores), `/distrito/[id]`, `/plazas`, `/arena`, `/capitolio` |
| ≥ 3 coleccionables | 13 fragmentos, 3 herramientas, 9 marcas y las pistas, guardados en el archivo pirata |
| Desbloqueo | Cada día abre el siguiente; los tres abren la Cosecha; los Juegos abren el Capitolio; los fragmentos y las marcas cambian el final |
| Feedback visual y sonoro | Visor, partículas, temblor, voces de los personajes, efectos y capas musicales |
| Ruta dinámica | `app/(panem)/escena/[id]`, `tren/[id]` y `distrito/[id]` (`generateStaticParams` + `dynamicParams = false`) |
| Server / Client Components | Las páginas (server) validan y generan metadata; el escenario, el audio y los overlays son client |
| Metadata, carga y error | `generateMetadata` por distrito, `loading.js`, `error.js`, `not-found.js` |
| Escena Three.js | `components/stage/panemScene.js`: escena, cámara, renderer, luces, RAF, raycasting, resize, pixel ratio limitado, `dispose()`; escenas en `components/stage/locations/` |
| Recurso propio | Mapa extruido desde un SVG vectorizado a partir de la imagen de referencia; sala de transmisión con geometría propia y shader de tubo |
| Alternativas accesibles | Botones y teclas numéricas para todos los lugares de las escenas; cada minijuego se juega con el botón del HUD o la barra espaciadora; dial de distritos con teclado; `prefers-reduced-motion`; Esc sale de tarjetas, interiores, intro y Distrito 13; botón de sonido en la intro y el encabezado |
| Firebase | Auth anónima, Google y email; `progress/{uid}` y `users/{uid}/runs/active`; reglas por usuario; indicador NUBE/LOCAL |
| Responsive | Cámara y HUD adaptados a celular; touch en las escenas, los dioramas y la arena |

## Decisiones técnicas

- **Canvas persistente:** la escena y el audio viven en `app/(panem)/layout.js`. Los layouts no se re-renderizan al navegar, así que la cámara *vuela* entre rutas en lugar de recargar la escena. `usePathname()` traduce la URL a una pose de cámara (`lib/routes.js` + `components/stage/cameraPoses.js`).
- **Escenas desde datos:** cada distrito de los tres días se describe en `lib/locations/` (lugares, objetos, interacciones e interiores) y se construye al entrar con el mismo renderer (`components/stage/locations/`). La cámara guiada está en `lib/guidedCamera.js`. Cada exterior e interior tiene un presupuesto de 25 MB y libera sus recursos al salir.
- **Mapa desde SVG:** `scripts/extract_map.py` extrae las piezas de la imagen de referencia (flood fill + contornos con OpenCV) y genera `public/assets/panem.svg`. En el navegador, `SVGLoader` y `ExtrudeGeometry` convierten cada `path#district-{id}` en una pieza 3D seleccionable por raycasting.
- **Audio procedural:** `lib/audio/` sintetiza el ambiente, la música en capas y los efectos con Web Audio. Respeta el silencio global (guardado en `localStorage`), reintenta con el siguiente gesto si el navegador bloquea el inicio y libera el sonido al salir.
- **Intro de la sala de transmisión:** una escena 3D en el mismo canvas que el mapa (`components/stage/broadcastHall.js`), con geometría propia, `InstancedMesh` y un shader de tubo. El clip oficial de YouTube va en un iframe sobre la pantalla proyectada. Si no carga, una señal pirata propia ocupa su lugar. Sin WebGL queda una tele dibujada con CSS (`components/panem/TvIntro.js`). El guion es lógica pura en `lib/introTimeline.js`.
- **Distrito 13:** la vista del mapa se congela en un render target y se parte en fragmentos con un solo `InstancedBufferGeometry` y un shader de señal rota (`lib/glitchShards.js`, `components/stage/classifiedGlitch.js`).
- **Lógica testeable:** datos, progreso, rutas, poses, historia, pistas, plazas, reglas de los minijuegos y de los Juegos son módulos puros, probados con `node --test` (`npm test`).

## Puesta en marcha

Requiere Node.js 22 o posterior (Next.js 16 pide 20.9+, y `npm test` usa el glob de `node --test`, que llegó con Node 21).

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Sin variables de entorno, el progreso se guarda en `localStorage` (indicador `LOCAL`).

## Firebase

1. Crear un proyecto y una Web App en Firebase Console.
2. Habilitar en Authentication los proveedores **Anonymous**, **Google** y **Email/Password**.
3. Crear una base **Cloud Firestore** y publicar `firestore.rules`.
4. Copiar `.env.example` como `.env.local` y completar:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key de la Web App |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<proyecto>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | id del proyecto |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | sender id |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | app id |

Modelo de datos:

```js
// progress/{uid}
{ userId, authProvider, litDistricts: ['12','11','4'], visited: ['7','13'],
  finalMessage: null | 'memoria', completedAt: null | number, updatedAt }
// users/{uid}/runs/active  (partida de los Juegos)
{ userId, snapshot, updatedAt }
```

## Regenerar el mapa y el sello

```bash
python3 -m venv .venv-tools
.venv-tools/bin/pip install "numpy==1.26.4" "opencv-python-headless==4.10.0.84"
.venv-tools/bin/python scripts/extract_map.py     # public/assets/panem.svg y los sellos de los distritos
.venv-tools/bin/python scripts/extract_brand.py   # sello de Panem (public/assets/brand) y el ícono de la pestaña
```

Para ajustarlo en Figma: importar `public/assets/panem.svg`, no renombrar las capas `district-*` y exportar como SVG con "Include 'id' attribute".

## Scripts

```bash
npm run dev     # desarrollo
npm test        # tests de lógica (node --test)
npm run lint    # ESLint
npm run build   # build de producción
```

## Documentación del proceso

- Consigna original del TP6: [`docs/consigna-tp6.md`](docs/consigna-tp6.md).
- Diseño (concepto, rutas, escena, audio, datos): [`docs/superpowers/specs/panem-design.md`](docs/superpowers/specs/panem-design.md).
- Plan de implementación por tareas: [`docs/superpowers/plans/panem-plan-implementacion.md`](docs/superpowers/plans/panem-plan-implementacion.md).
- La historia de los tres días, las escenas, las pistas y el visor: [`docs/superpowers/specs/`](docs/superpowers/specs/) y [`docs/superpowers/plans/`](docs/superpowers/plans/).
- Capturas para la presentación: `docs/presentacion/capturas/`.
- Declaración de uso de IA: [`docs/declaracion-ia.md`](docs/declaracion-ia.md).
- Imagen de referencia del mapa y su extracción: `docs/reference/`.

## Créditos

- *The Hunger Games* (Los juegos del hambre) © Suzanne Collins / Scholastic. Películas © Lionsgate. Proyecto de fans **con fines exclusivamente académicos y sin fines comerciales**. Los textos de la experiencia son originales.
- Mapa e íconos de distritos: basados en una ilustración de fans del mapa de Panem (`docs/reference/panem-map.webp`), aportada por el equipo como referencia. _Pendiente: completar la autoría y la fuente original de la imagen._
- Intro: el fragmento (0:29 a 0:51) del video oficial *President Snow's Panem Address #2 – "Unity"* del canal de *The Hunger Games* (Lionsgate) se **incrusta desde YouTube** con su reproductor oficial; no se descarga, no se copia y no se modifica. La tele y la sala se inspiran en una captura de la sala de teles de los Juegos aportada por el equipo. _Pendiente: completar la fuente de la captura._
- Marca: el sello dorado de Panem y el rojo/dorado de la interfaz salen de una imagen de la bandera de Panem aportada por el equipo (`docs/reference/panem-flag.webp`). _Pendiente: completar autoría y fuente._
- Referencias visuales: Hunger Games: The Exhibition (Nueva York), "Antique map to 3D model" (awwwards) y el board "interactive web" del equipo.
- Tipografías: Oswald, Inter y Rajdhani (visor); Special Elite (documentos del Capitolio); Caveat, Kalam, Patrick Hand, Homemade Apple, La Belle Aurore, Nothing You Could Do, Reenie Beanie y Shadows Into Light (notas escritas a mano). Todas con SIL Open Font License o Apache 2.0, vía Google Fonts.
- Modelos, texturas y entornos: Kenney, Quaternius, Poly Haven y Sketchfab, con autores y licencias en `public/models/CREDITS.md`.
- Música y efectos: sintetizados por código con Web Audio API.
- Desarrollo: Mia y Lola, Programación Multimedial III, UMAI, 2026. Con asistencia de Claude (ver [`docs/declaracion-ia.md`](docs/declaracion-ia.md)).


## Archivo interactivo de los Juegos

Hechos los tres días (y decidido si Marin pide comida), el enlace **Los Juegos** y la plaza del mapa abren una edición alternativa, que sigue a quien salió de la urna. Es el archivo de los Juegos del Capitolio, interceptado por la resistencia a través de la frecuencia del Distrito 13: al entrar, una secuencia corta niega el acceso, lo fuerza y tacha el sello del Capitolio (una vez por sesión; se saltea con un clic o una tecla, y con movimiento reducido se muestra quieta). En pantalla queda la etiqueta «Señal pirata · FREQ 13» y los expedientes llevan el sello «Property of the Capitol» tachado. La secuencia está en `lib/games/intercept.js` y `components/games/ArchiveIntercept.js`.

```text
/cosecha → /capitolio/preparacion → /arena → /desenlace → /capitolio
```

- La Cosecha presenta 24 personajes originales, dos por cada distrito del 1 al 12. Se los toca en el escenario 3D (o desde la lista de tributos) y cada uno abre un expediente con retrato 3D, atributos y estado antes de elegir a quién acompañar como mentora.
- Cada uno de los tres días (Carbón, Agricultura, Pesca) permite una elección de preparación (+8 a un atributo). El entrenamiento se aplica una sola vez y funciona igual con botones o interacción 3D.
- Una pregunta cada dos turnos (la apertura incluida): en los turnos del medio la transmisión sigue sola a los 6 s, o a los 3,5 s si el tributo ya cayó. «Pausar escena» o abrir una ficha frena el avance y «Seguir la transmisión» lo adelanta. Cada pregunta presenta una situación con opciones propias: Cornucopia, niebla tóxica, incendio, señales, río, patrocinadores o necesidades del personaje. Los atributos y recursos modifican riesgos y consecuencias; los demás tributos actúan mediante reglas y azar reproducible.
- Salud, energía, hambre, sed, recursos, zonas y alianzas determinan los eventos. Si cae el tributo elegido se puede seguir como observadora.
- La partida termina con un sobreviviente, como máximo en 24 turnos (12 jornadas), y conserva la crónica completa. Después sigue el final en el Capitolio.
- Las rutas validan el capítulo de la partida: abrir una URL futura redirige al estado actual.

### Escenas y animación

La interfaz deja el 3D a la vista (`components/games/ArenaHud.js` y `ArchiveBar.js`; lo que muestra sale de `lib/games/hud.js`). Arriba a la izquierda, «● En vivo · jornada» y cuántos quedan en pie; arriba a la derecha, íconos para cambiar de vista, los tributos, la crónica, la pausa y el menú (calidad, guardado, créditos), que se abren en un cajón de a uno. Abajo a la izquierda, tu tributo con salud y energía (hambre y sed aparecen cuando apremian); abajo al centro, la pregunta como subtítulos (clic o teclas 1 a 3) o una sola línea que rota con los eventos del turno, primero los de tu tributo y las caídas.

La arena tiene dos vistas: **siguiendo a tu tributo** (cámara cercana) y **la mesa de los Vigilantes** (la arena entera como holograma sobre una mesa, con siluetas en el borde; los tributos son luces, la tuya dorada, y los caídos, cruces). En la mesa se puede tocar una luz para abrir la ficha de ese tributo.

El mismo renderer carga y libera la plaza de la Cosecha y el tren del Capitolio. La arena es el modelo **The Hunger Games Arena de Flashness**, descargado oficialmente de Sketchfab y adaptado de 9.974.420 a 839.194 triángulos (GLB de aproximadamente 7,7 MB, Meshopt). Conserva el bosque, el lago, el río y la Cornucopia del original. Un mapa de alturas extraído de sus superficies coloca los pies y marcadores sobre el terreno. Los tributos usan dos modelos humanos texturizados y articulados: Valery de xander.dice y el escaneo de Mike Alger, con variaciones estables de ropa, cabello, proporciones y accesorios. Los brazos descansan y se animan en el esqueleto al desplazarse. Son 24 identidades visuales construidas a partir de dos bases humanas, no 24 rostros escaneados diferentes. Los modelos y las texturas se comparten, con esqueletos y materiales independientes. Se muestran avisos de carga y de reintento si falla la arena. Créditos accesibles dentro del juego y en `public/models/CREDITS.md`.

GSAP anima interfaz y cámara. Las timelines de cámara se avanzan desde el reloj del renderer, sin competir con otro controlador. Los turnos activan planos breves de los eventos; pausa y salto no alteran resultados. Los incidentes activan interferencias GSAP breves en la transmisión. Calidad alta incorpora sombras y bloom suave; el modo ligero reduce resolución, sombras y partículas, y el automático usa ese modo en pantallas angostas. Movimiento reducido elimina las entradas animadas de la interfaz, el desplazamiento de los personajes y el postprocesado. Los efectos de Cosecha y cañón se sintetizan con el motor de audio existente.

### Guardado de partidas

El progreso anterior (`panem-chispa-v1` y `progress/{uid}`) se conserva intacto: no necesita migración destructiva ni resultados inventados. Las partidas usan un esquema independiente `version: 1`.

- Guardado automático local en `panem-games-v1:<uid>` o `panem-games-v1:guest`.
- Copia JSON descargable e importable desde el menú del archivo. Una copia incompatible no reemplaza automáticamente la actual.
- Botón **Guardar en nube** para una cuenta autenticada: `users/{uid}/runs/active`, con `userId`, `snapshot` y `updatedAt`.
- Una transacción compara la copia remota conocida antes de escribir. Si la nube, otra pestaña o un archivo importado tiene una partida distinta, se elige una versión completa; nunca se mezclan eventos.
- La edición nueva reemplaza el espacio activo local después de una confirmación; se puede descargar la anterior. Las cuentas tienen espacios separados. Para trasladar una partida de invitada a una cuenta, descargarla e importarla en esa cuenta.
- Las nuevas reglas están en `firestore.rules`. No se publican automáticamente: el guardado remoto requiere desplegarlas en el proyecto Firebase correspondiente. El botón informa errores y mantiene el archivo local.

Esta es una simulación personal en cliente, no un ranking competitivo ni un servidor que certifique resultados. Firestore controla acceso por cuenta y la forma básica del documento; el cliente valida los snapshots importados.

### Verificación y desarrollo

`npm` es el único gestor de dependencias del proyecto; `package-lock.json` es la fuente reproducible. GSAP es dependencia de producción; TypeScript se instala como dependencia de las herramientas ESLint, sin convertir los archivos JavaScript.

Las pruebas incluyen 200 ediciones con decisiones contextuales, rechazo de opciones desactualizadas y 300 ediciones completas con verificación de superviviente único, no resurrección, límites, determinismo al reanudar, puertas de entrenamiento y liberación de escenas. Ejecutar `npm test`, `npm run lint` y `npm run build`.

Si Turbopack falla con `unable to start FSEvent stream` en macOS, usar `npm run dev:webpack`. Para revisar el build sin observador de archivos: `npm run build` y `npm start`.

La primera verificación local incluyó completar los tres minijuegos, crear una edición, elegir a Brasa, preparar atributos, pausar/reanudar, recargar y continuar, avanzar en vista de 390 px hasta un ganador y volver al epílogo. La conexión real a Firebase y sus reglas desplegadas requieren validación en el entorno configurado.

El análisis de dependencias reporta cinco alertas altas en la cadena de desarrollo `eslint-config-next → fast-glob → micromatch → braces`. La corrección sugerida por npm retrocede a Next ESLint 14; no se aplica ese cambio incompatible automáticamente. No hay alertas de producción en ese reporte.

### «If we burn, you burn with us»

> Ya no forma parte del recorrido: el 5 de noviembre se sacó el fuego del final y quedó la transmisión con los fragmentos y Panem encendido. El código se conserva en `components/panem/BurnSequence.js` y `components/stage/fire.js`.

Al final de la transmisión del Capitolio (después de los fragmentos), la cámara se aleja al mapa entero, con los doce distritos encendidos, y desde abajo sube un fuego procedural WebGL (turbulencia, humo y brasas; transparente donde no hay llamas, para que se vea el mapa). Encima, la frase animada con GSAP, una línea («Doce distritos encendidos. Falta uno.») y «Seguir →»; «saltar» (chico, abajo a la derecha, como en la intro) y Escape también siguen. Después se enciende todo Panem y responde el 13. Se puede volver a ver desde el archivo pirata. Movimiento reducido omite el fuego y las entradas animadas.

Al terminar la arena, «Volver a jugar» muestra su confirmación junto al botón.

### Arena propuesta por el equipo

Modelo integrado: [The Hunger Games Arena, Flashness](https://sketchfab.com/3d-models/the-hunger-games-arena-8735e8c171254663bd7db82878915190), licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Es una creación de Minecraft/Mineways y conserva ese diseño; la optimización no lo convierte en un entorno fotorealista. La versión original descargada queda fuera de `public`; el juego sirve únicamente la versión optimizada.

### La extracción y los eventos visibles

Antes del escenario de selección, la Cosecha abre una urna de vidrio con papeles interactivos. Se puede hacer clic, arrastrar un papel o usar el botón con teclado. Cada papel revela uno de los 24 nombres sin repetir; «Saltear la Cosecha» revela los nombres restantes y pasa directamente al escenario. Al terminar se pasa al escenario existente para elegir al tributo. `drawnCount` y `reapingComplete` viajan dentro de la partida local/exportada/nube; no alteran la semilla, los turnos ni la revisión del motor de la arena. Los snapshots anteriores siguen siendo válidos.

`visualCueFor` conecta la pregunta pendiente con `arenaEffects`: fuego volumétrico simulado en planos cruzados con ruido, humo y luz cálida; niebla tóxica; lluvia; regalos en paracaídas; cajas y ondas de agua; brasas nocturnas y señales. El efecto comienza antes de responder y se conserva durante el turno de resolución. La mesa de los Vigilantes también muestra los peligros; el modo ligero reduce el humo y el movimiento reducido congela la animación.

Poly Haven aporta materiales PBR 1K de madera, concreto y suelo, además de una roca fotogramétrica. Se sirven localmente y se reutilizan entre escenas. La urna tiene vidrio físico e iluminación HDRI. La arena de Sketchfab conserva su diseño original de Minecraft/Mineways; aplicar nuevos materiales y objetos no convierte todo ese escenario en fotogrametría. Fuentes y licencias en `public/models/CREDITS.md`.

### Talleres y Cosecha (22 de octubre)

Nuevos talleres: 1 pulido de gemas; 2 mampostería; 3 memoria de circuitos; 5 regulación de generadores; 6 clasificación de vías; 7 corte de madera; 8 memoria de tejidos; 9 clasificación de cereales; 10 cuidado de animales. Usan ratón, pantalla táctil y teclado (Espacio y 1–4). Perder dos veces amplía las ventanas de precisión y reduce la velocidad. Con la historia de los tres días, los talleres quedan como maquetas para explorar (sin pista ni estaciones; el código del juego se conserva por si alguno se rehace) y la preparación usa los tres días; las partidas antiguas siguen siendo válidas. El 13 sigue siendo la revelación secreta.

La urna permite saltear toda la extracción en una sola actualización, sin modificar el azar de la arena. Los papeles alternan trayectorias y giros dentro del encuadre. El contador inicial muestra únicamente 0/24, con los controles debajo.

«Panem arde» espacia las palabras 0,42 s y muestra las acciones a los 6,12 s; Escape y saltar siguen disponibles. El fuego integra doce capas de densidad, absorción, turbulencia, humo y brasas sobre un fondo sin degradado.

**Firebase:** `firestore.rules` ahora admite los doce IDs de emblemas (hasta doce). Este cambio está preparado localmente y requiere desplegar esas reglas en el proyecto Firebase configurado para sincronizar los nuevos emblemas; el guardado local funciona sin despliegue. No se modificaron reglas remotas.

### Carga y renderizado

El mapa carga sin la arena, la sala de transmisión, los minijuegos, el reproductor de la rebelión ni los pases de postproceso: sus módulos se solicitan cuando se entra a la escena correspondiente. La iluminación HDRI también se prepara al entrar a una escena que la necesita. En las rutas de los Juegos no se descarga el mapa SVG con sus catorce sellos hasta volver al mapa. La escena oculta deja de actualizarse.

El modo automático usa un máximo de un píxel por píxel CSS y 30 cuadros por segundo en pantallas menores de 721 px; escritorio conserva hasta 1,5 y 60 cuadros. Se evitan cuadros adicionales en pantallas de 120 Hz. La pausa al ocultar la pestaña se conserva. El indicador «Rendering…» pertenece al servidor de desarrollo de Next; para revisar la experiencia sin compilaciones, se puede ejecutar `npm run build` y luego `npm run start -- --hostname 127.0.0.1 --port 3001`.

El reproductor de la intro espera la carga del iframe en su origen de YouTube antes de conectar la API, y cancela una carga pendiente si se abandona la secuencia. La animación de la rebelión no usa YouTube ni iframes.


### Recorridos con botones e interiores

En `/escena/12`, `/escena/11` y `/escena/4`, los destinos vuelven a tener botones permanentes y atajos numéricos. Cada interior tiene un botón visible «Salir al distrito» y una salida en la barra inferior. Las luces de navegación se retiraron; los objetos conservan un brillo sutil. Arrastrar permite mirar alrededor.

Los juegos de carbón en el túnel, cosecha/silbido en el huerto y pesca en el muelle conservan sus reglas. Los botones de destino nombran el juego y, fuera de la jornada correspondiente, se ofrece practicar sin cambiar los papeles ni adelantar la historia.

Las casas de Ash, Oliva y Marin y el granero contienen ocho nuevas pistas, además de la libreta y el cuenco existentes. Papeles, cajas y símbolos conectan las cuotas de trabajo, la comida y los mensajes de resistencia. «Examinar» aparece en el lugar del objeto; lo encontrado se guarda y puede volver a leerse. Los relatos nuevos permanecen abiertos hasta cerrarlos. Escape sale primero de la tarjeta, luego del interior y finalmente al mapa.

Los cuartos usan el mismo renderer y cámara, se cargan al cruzar la puerta y liberan sus recursos al salir. El exterior queda sin actualizar mientras se está adentro. Los exteriores y cada interior tienen presupuesto independiente de 25 MB, verificado incluyendo modelos compartidos (sin sumar copias). Con movimiento reducido no se balancea la cámara durante los recorridos.

Modelos nuevos, fuentes, licencias y adaptaciones en `public/models/CREDITS.md`; optimización en `scripts/optimize-scene-upgrade.sh`. Pruebas de navegación, paredes, liberación de recursos, transparencia y presupuesto en `tests/location-interiors.test.mjs`.
