# Panem

> Panem está a oscuras: llevá la chispa de distrito en distrito hasta que el Capitolio no pueda apagarla.

Experiencia web transmedia (TP6 · Programación Multimedial III · UMAI) inspirada en *The Hunger Games*.
Next.js 16 + Three.js + GSAP + Firebase · JavaScript · App Router.

**Deploy:** _pendiente: completar con la URL pública (Vercel)_

## Sinopsis

En la sala de transmisión del Capitolio, una tele gigante rodeada de teles chicas y de un público de espaldas emite el anuncio oficial: Panem vive en paz. Al "encender la señal" la transmisión se corta (se ve el fragmento del video oficial en el que se rompe la señal) y la cámara entra en la pantalla hasta un mapa 3D de Panem, gris y apagado. La persona puede explorar los trece distritos; tres de ellos guardan una chispa:

- **Distrito 12 · Carbón:** una luz recorre la veta y hay que picar cuando pasa por la grieta. Tres capas hasta la brasa; cada error asusta al canario y, con tres, hay que salir a respirar.
- **Distrito 11 · Agricultura:** cosechar el trigo sin que te alumbre el reflector de las torres (si te ve, se pierde lo cosechado en esa pasada) y después repetir el silbido que cantan los sinsajos.
- **Distrito 4 · Pesca:** mantener apretado carga el alcance de la red y soltar la tira; la corriente la desvía un poco. Cinco redes para tres peces; el dorado vale por dos.

Los tres se pueden perder y reintentar, pero no son difíciles: después de perder dos veces el juego ayuda (grieta más ancha, reflector más chico, agua calma). El panel del distrito muestra el avance, las vidas y el botón de reintento; todo se juega también con el botón del panel o la barra espaciadora.

**Distrito 13 (secreto opcional):** al entrar, la imagen del mapa se rompe en fragmentos con señal corrupta y cajas de rastreo. Los pedazos se apartan del puntero y se pueden arrastrar; debajo transmite otra señal. Moviendo suficientes aparece el mensaje oculto, que queda guardado y cambia una frase del final.

Cada distrito encendido otorga su emblema, cambia de color en el mapa y suma una capa a la música. Con los tres emblemas se desbloquea el Capitolio: allí se elige el mensaje (*Encender la rebelión* o *Recordar a los caídos*), se hackea la transmisión y Panem entero se enciende, incluido el Distrito 13, que el Capitolio declaraba inexistente.

## Mapa de navegación

```text
/  (Transmisión oficial: la tele del Capitolio)
 └─ "Encender la señal" → anuncio → corte de señal → /mapa   ("Saltar la intro" o Esc → /mapa)
      ├─ /distrito/12  diorama jugable → emblema 1
      ├─ /distrito/11  diorama jugable → emblema 2
      ├─ /distrito/4   diorama jugable → emblema 3
      ├─ /distrito/13  la imagen se rompe: secreto opcional
      ├─ /distrito/1…10 (resto)  ficha del distrito
      │   (tocar el mapa fuera del diorama cierra el panel; tocar otro distrito va a ese)
      └─ C → /capitolio  (requiere 3/3; si no, aviso y vuelta al mapa)
              └─ decisión → transmisión → Panem encendido → fin
```

## Requisitos de la consigna y dónde se cumplen

| Requisito | Implementación |
| --- | --- |
| Premisa, inicio, progresión y cierre | Intro de la tele → mapa → 3 dioramas → Capitolio |
| ≥ 3 escenas | `/`, `/mapa`, `/distrito/[id]`, `/capitolio` + 3 dioramas |
| ≥ 3 coleccionables | Emblemas de los distritos 12, 11 y 4 |
| Desbloqueo | El Capitolio se abre con 3/3; cada distrito suma su capa musical |
| Feedback visual y sonoro | Elevación de las piezas, chispas, partículas, temblor, efectos y capas musicales |
| Ruta dinámica | `app/(panem)/distrito/[id]/page.js` (`generateStaticParams` + `dynamicParams = false`) |
| Server / Client Components | Las páginas (server) validan y generan metadata; el escenario, el audio y los overlays son client |
| Metadata, carga y error | `generateMetadata` por distrito, `loading.js`, `error.js`, `not-found.js` |
| Escena Three.js | `components/stage/panemScene.js`: escena, cámara, renderer, luces, RAF, raycasting, resize, pixel ratio ≤ 2, `dispose()` |
| Recurso propio | Mapa extruido desde un SVG vectorizado a partir de la imagen de referencia y sistema de partículas de la chispa (`effects.js`) |
| Alternativas accesibles | Dial de distritos con teclado; cada minijuego se juega con el botón del panel o la barra espaciadora (y las teclas 1 a 4 para los sinsajos) con las mismas reglas; `prefers-reduced-motion` (la intro no corta la señal ni usa el clip; el Distrito 13 no tiembla); Esc para salir de la intro y del Distrito 13; las flechas de volver tienen `aria-label` |
| Firebase | Auth anónima, Google y email; `progress/{uid}`; reglas por usuario; indicador NUBE/LOCAL |
| Responsive | Cámara más alejada, dial horizontal y panel en hoja inferior en celular; touch en todos los dioramas |

## Decisiones técnicas

- **Canvas persistente:** la escena y el audio viven en `app/(panem)/layout.js`. Los layouts no se re-renderizan al navegar, así que la cámara *vuela* entre rutas en lugar de recargar la escena. `usePathname()` traduce la URL a una pose de cámara (`lib/routes.js` + `components/stage/cameraPoses.js`).
- **Mapa desde SVG:** `scripts/extract_map.py` extrae las piezas de la imagen de referencia (flood fill + contornos con OpenCV) y genera `public/assets/panem.svg`, ajustable en Figma. En el navegador, `SVGLoader` y `ExtrudeGeometry` convierten cada `path#district-{id}` en una pieza 3D seleccionable por raycasting.
- **Audio procedural:** `lib/audio/` sintetiza todo con Web Audio: ambiente de viento y drone, un secuenciador a 80 BPM en re menor con tres capas (percusión, silbido y pad) sincronizadas por un único reloj, y los efectos. El ambiente y los efectos no requieren archivos de audio. La secuencia opcional «Panem arde» también puede intentar reproducir `/audio/the-hanging-tree.mp3`, que no se incluye: si falta, continúa sin esa grabación. El motivo de 4 notas es original.
- **Intro de la sala de transmisión:** una escena 3D en el mismo canvas que el mapa, apartada 60 unidades (`components/stage/broadcastHall.js`, medidas y poses en `lib/broadcastHall.js`). Referencia: la sala de teles de los 10.º Juegos; estética años 50 y, dentro del mundo, textos en inglés. Todo es geometría propia (`InstancedMesh` para sillas, público, gabinetes y monitores) y texturas pintadas en canvas; la pantalla usa un shader de tubo (curvatura, corrimiento, aberración, ruido, línea de encendido). Al final la pantalla muestra el mapa como un portal (render a textura muestreado en coordenadas de pantalla) y, cuando la llena, la cámara corta a esa misma vista. El clip de YouTube va en un iframe ubicado sobre la pantalla proyectada; sin WebGL queda la tele dibujada con CSS (`components/panem/TvIntro.js` + `tv-intro.css`). El guion, el clip y la regla de destellos del corte propio son lógica pura en `lib/introTimeline.js`; el reproductor, en `lib/youtubeClip.js`. YouTube muestra su interfaz unos segundos al empezar, así que el clip arranca 7 s antes del corte, oculto y con volumen 0, y se muestra al llegar al segundo 29. Si no carga, una señal pirata propia ocupa su lugar.
- **Dioramas desmontables:** cada distrito jugable se construye al entrar y se libera al salir (`components/stage/dioramas/`), con un contrato común (`build → { update, pointer*, performAction, retry, getState, dispose }`). La partida (objetivo, vidas, ganar, perder, reintentar y ayuda) es común a los tres: `lib/minigame.js`.
- **Distrito 13:** la vista del mapa se congela en un render target y se parte en fragmentos dibujados con un solo `InstancedBufferGeometry` y un shader de señal rota (separación RGB, pixelado, barrido). Los resortes, el arrastre y cuánto se descubrió están en `lib/glitchShards.js`; la escena, en `components/stage/classifiedGlitch.js`. Se guarda en `panem-d13-v1`.
- **Íconos:** las flechas de volver son de `react-icons` (Phosphor), sin texto al lado.
- **Lógica testeable:** datos, progreso, rutas, poses, partitura, reglas de los minijuegos y los fragmentos del Distrito 13 son módulos puros, probados con `node --test` (`npm test`).

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
  finalMessage: null | 'rebelion' | 'memoria', completedAt: null | number, updatedAt }
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
- Imagen de referencia del mapa y su extracción: `docs/reference/`.

## Créditos

- *The Hunger Games* (Los juegos del hambre) © Suzanne Collins / Scholastic. Películas © Lionsgate. Proyecto de fans **con fines exclusivamente académicos y sin fines comerciales**. Los textos de la experiencia son originales.
- Mapa e íconos de distritos: basados en una ilustración de fans del mapa de Panem (`docs/reference/panem-map.webp`), aportada por el equipo como referencia. _Pendiente: completar la autoría y la fuente original de la imagen._
- Intro: el fragmento (0:29 a 0:51) del video oficial *President Snow's Panem Address #2 – "Unity"* del canal de *The Hunger Games* (Lionsgate) se **incrusta desde YouTube** con su reproductor oficial; no se descarga, no se copia y no se modifica. La tele y la sala se inspiran en una captura de la sala de teles de los Juegos aportada por el equipo. _Pendiente: completar la fuente de la captura._
- Marca: el sello dorado de Panem y el rojo/dorado de la interfaz salen de una imagen de la bandera de Panem aportada por el equipo (`docs/reference/panem-flag.webp`). _Pendiente: completar autoría y fuente._
- Referencias visuales: Hunger Games: The Exhibition (Nueva York), "Antique map to 3D model" (awwwards) y el board "interactive web" del equipo.
- Tipografías: Oswald (Vernon Adams) e Inter (Rasmus Andersson), SIL Open Font License, vía Google Fonts.
- Música y efectos: sintetizados por código con Web Audio API.
- Desarrollo: Mia y Lola · Programación Multimedial III · UMAI · 2026.


## Archivo interactivo de los Juegos

Con los tres emblemas, el enlace **Los Juegos** y el Capitolio abren una edición alternativa:

```text
/cosecha → /capitolio/preparacion → /arena → /desenlace → /capitolio
```

- La Cosecha presenta 24 personajes originales, dos por cada distrito del 1 al 12. Cada ficha abre un expediente con retrato 3D, atributos y estado antes de elegir a quién acompañar como mentora.
- Cada emblema permite una elección de preparación (+8 a un atributo). El entrenamiento se aplica una sola vez y funciona igual con botones o interacción 3D.
- Cada turno presenta una situación con opciones propias: Cornucopia, niebla tóxica, incendio, señales, río, patrocinadores o necesidades del personaje. Los atributos y recursos modifican riesgos y consecuencias; los demás tributos actúan mediante reglas y azar reproducible.
- Salud, energía, hambre, sed, recursos, zonas y alianzas determinan los eventos. Si cae el tributo elegido se puede seguir como observadora.
- La partida termina con un sobreviviente, como máximo en 24 turnos (12 jornadas), y conserva la crónica completa. El epílogo de rebelión/memoria permanece disponible.
- Las rutas validan el capítulo de la partida: abrir una URL futura redirige al estado actual.

### Escenas y animación

La arena incluye un tablero fijo de salud, energía, hambre, sed, comida y agua, independiente del desplazamiento de las decisiones (anclado abajo en celular). Reúne la transmisión, las decisiones y una tira horizontal de tributos; los eventos incluyen actores y cambios de recursos. En pantallas pequeñas los paneles se apilan.

El mismo renderer carga y libera la plaza de la Cosecha y el tren del Capitolio. La arena es el modelo **The Hunger Games Arena de Flashness**, descargado oficialmente de Sketchfab y adaptado de 9.974.420 a 839.194 triángulos (GLB de aproximadamente 7,7 MB, Meshopt). Conserva el bosque, el lago, el río y la Cornucopia del original. Un mapa de alturas extraído de sus superficies coloca los pies y marcadores sobre el terreno. Los tributos usan dos modelos humanos texturizados y articulados: Valery de xander.dice y el escaneo de Mike Alger, con variaciones estables de ropa, cabello, proporciones y accesorios. Los brazos descansan y se animan en el esqueleto al desplazarse. Son 24 identidades visuales construidas a partir de dos bases humanas, no 24 rostros escaneados diferentes. Los modelos y las texturas se comparten, con esqueletos y materiales independientes. Se muestran avisos de carga y de reintento si falla la arena. Créditos accesibles dentro del juego y en `public/models/CREDITS.md`.

GSAP anima interfaz y cámara. Las timelines de cámara se avanzan desde el reloj del renderer, sin competir con otro controlador. Los turnos activan planos breves de los eventos; pausa y salto no alteran resultados. Los incidentes activan interferencias GSAP breves en la transmisión. Calidad alta incorpora sombras y bloom suave; el modo ligero reduce resolución, sombras y partículas, y el automático usa ese modo en pantallas angostas. Movimiento reducido elimina las entradas animadas de la interfaz, el desplazamiento de los personajes y el postprocesado. Los efectos de Cosecha y cañón se sintetizan con el motor de audio existente.

### Guardado de partidas

El progreso anterior (`panem-chispa-v1` y `progress/{uid}`) se conserva intacto: no necesita migración destructiva ni resultados inventados. Las partidas usan un esquema independiente `version: 1`.

- Guardado automático local en `panem-games-v1:<uid>` o `panem-games-v1:guest`.
- Copia JSON descargable e importable desde el panel. Una copia incompatible no reemplaza automáticamente la actual.
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

### Continuación de la rebelión

La secuencia «If we burn, you burn with us» usa fondo negro, texto claro animado con GSAP y fuego procedural WebGL con turbulencia, humo y brasas. Movimiento reducido omite el fuego y las entradas animadas. «Saltar» y Escape continúan hacia `/rebelion`; «Seguir explorando» vuelve a la vista anterior.

`/rebelion` presenta decisiones sobre la antena del Distrito 11 y el tren del Distrito 6, conserva las respuestas localmente en `panem-rebellion-v1` y conduce a la transmisión del Capitolio. Después de transmitir, permite seguir la respuesta del Distrito 13. Esta historia no requiere jugar la arena. Reiniciar los Juegos conserva los emblemas y la historia; reiniciar Panem también borra las respuestas narrativas.

Al terminar la arena, «Volver a jugar» muestra su confirmación junto al botón, fuera del panel plegable de guardado.

### Arena propuesta por el equipo

Modelo integrado: [The Hunger Games Arena, Flashness](https://sketchfab.com/3d-models/the-hunger-games-arena-8735e8c171254663bd7db82878915190), licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Es una creación de Minecraft/Mineways y conserva ese diseño; la optimización no lo convierte en un entorno fotorealista. La versión original descargada queda fuera de `public`; el juego sirve únicamente la versión optimizada.
