# Panem · La chispa — Diseño

Fecha: 2026-10-13 · Equipo: Mia y Lola · Entrega: jueves 2026-10-22

## 1. Concepto

**Premisa:** Panem está a oscuras: llevá la chispa de distrito en distrito hasta que el Capitolio no pueda apagarla.

**Sinopsis:** La experiencia comienza con una transmisión de propaganda del Capitolio. La persona usuaria "enciende la señal" y desciende a un mapa 3D de Panem, apagado y gris. Puede explorar los trece distritos; tres de ellos (12, 11 y 4) permiten entrar a un diorama y realizar una acción propia de su industria. Cada distrito encendido otorga su emblema, cambia de color en el mapa y suma una capa a la música. Con los tres emblemas se desbloquea el Capitolio: allí se elige el mensaje final, se hackea la transmisión oficial y Panem entero se enciende, incluido el Distrito 13, que el Capitolio declaraba inexistente.

**Objetivo:** sumar a la experiencia de los libros y las películas mediante un recorrido audiovisual e interactivo. Debe ser divertido y cumplir la consigna del TP6 (README).

**Prioridad de alcance:** pocas partes, muy bien hechas. Si sobra tiempo se agregan más distritos jugables (candidatos: 3 y 7). No se agregan otras funciones.

Este diseño **reemplaza** la narrativa anterior "Ecos de la arena" (bosque/lago/torre).

## 2. Referencias

- Mapa de Panem de referencia (imagen aportada por el equipo, 1000×744, incluye el Distrito 13). Se guarda en `public/assets/reference/panem-map.webp`.
- Board de Pinterest "interactive web" (Mia): mesa interactiva "Explore the districts" de la exhibición oficial de The Hunger Games en Nueva York, el detalle de "District 12" de la misma exhibición, "Antique map to 3D model" (awwwards) y pantallas CRT y de terminal ("ERASE", "OR IS IT REAL?").

## 3. Recorrido y rutas

```
app/
  layout.js                  metadata global, fuentes
  (panem)/
    layout.js                monta <PanemStage/> (client): canvas + audio persistentes
    page.js                  "/"             Intro: transmisión del Capitolio
    mapa/page.js             "/mapa"         Mapa de Panem (hub)
    distrito/[id]/page.js    "/distrito/:id" Ruta dinámica, id ∈ {1..13}
    capitolio/page.js        "/capitolio"    Decisión y final
  not-found.js, error.js, loading.js
```

Los layouts de Next 16 no se re-renderizan al navegar (ver `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`). Por eso el canvas y el audio viven en `(panem)/layout.js` y persisten entre rutas. Las páginas solo cambian el overlay HTML.

**Flujo:**

1. **`/` Intro:** pantalla CRT de propaganda del Capitolio con el botón "Encender la señal". Ese clic es el gesto de usuario que desbloquea el audio. Después se navega a `/mapa` con un descenso de cámara.
2. **`/mapa`:** Panem gris, con la base ambiental sonando.
   - Hover sobre una pieza: la pieza se eleva y aparece su nombre.
   - Clic: navega a `/distrito/:id`.
   - Clic en "C": navega a `/capitolio` si están los 3 emblemas. Si no, muestra el aviso "Bloqueado · n/3".
   - Distrito 13: con estática y glitch. En hover muestra "SEÑAL NO ENCONTRADA".
3. **`/distrito/12`, `/11` y `/4` (jugables):** la cámara vuela al distrito, la pieza se eleva y aparece el diorama.
   - Se realiza la interacción.
   - Al completarla, el distrito queda encendido, se otorga el emblema, sale una chispa hacia el Capitolio y se suma su capa musical.
   - El botón "Volver al mapa" regresa a `/mapa`.
4. **`/distrito/:id` (los otros 9, y el 13):** la cámara se acerca y se abre una ficha de exhibición con número, sello, industria, una frase y el texto "Señal aún no alcanzada". La del 13 dice "Archivo clasificado", con glitch.
5. **`/capitolio`:** requiere los 3 emblemas. Si se entra sin ellos, redirige a `/mapa` con un aviso.
   - Se elige el mensaje: **"Encender la rebelión"** (`rebelion`) o **"Recordar a los caídos"** (`memoria`).
   - Luego viene el hackeo: glitch de la transmisión, el sinsajo toma la señal, se encienden todas las piezas (el 13 al final) y suena el tema completo con una variación según el mensaje.
   - La pantalla final tiene créditos y la opción de reiniciar.

**Server y Client Components:**

- Las páginas son Server Components. Validan el `id` (`notFound()` si no pertenece a {1..13}), generan `generateMetadata` por distrito y renderizan los textos.
- `PanemStage`, el overlay interactivo y el `AudioEngine` son Client Components. `PanemStage` usa `usePathname()` para elegir la pose de cámara y el diorama.

## 4. Escena 3D (Three.js directo)

```
components/stage/
  PanemStage.js      renderer, scene, cámara, loop RAF, ResizeObserver, dispose
  mapMesh.js         SVG → piezas extruidas (1–13 + C)
  cameraRig.js       poses por ruta + interpolación con easing (~1,5 s)
  dioramas/
    district12.js    build(scene, callbacks) → { update(dt), onPointer(ev), dispose() }
    district11.js
    district4.js
  effects.js         partículas de chispa, glitch del 13
```

- **Mapa:** contornos extraídos de la imagen de referencia, guardados en `public/assets/panem.svg` y ajustados en Figma. Se cargan con `SVGLoader` y se convierten con `ExtrudeGeometry`. Los bordes cortados (7, 6, 13 arriba y 10 abajo) se cierran con una costa inventada.
  - Cada malla lleva `userData.districtId`.
  - **Estados:** apagado (gris), hover (elevación en `position.y`), encendido (color propio, emisivo y pulso), bloqueado (C) y glitch (13).
  - Los sellos de los distritos van como sprites o planos con textura sobre cada pieza.
- **Cámara:** una pose por ruta (`intro`, `mapa`, `distrito-N` y `capitolio`). La transición interpola la posición y el `lookAt` con easing. En pantallas angostas se usan poses más alejadas.
- **Dioramas:** se construyen al entrar al distrito y se hace `dispose()` de todo al salir. Están hechos con primitivas low-poly procedurales y, como mucho, algún `.glb` CC0 (Poly Pizza) con crédito.
- **Recurso propio** (lo exige la consigna): la geometría extruida de Panem y el sistema de partículas de la chispa.
- **Rendimiento:** `setPixelRatio(min(dpr, 2))`, loop pausado con `visibilitychange` y limpieza completa al desmontar.
- **Sin WebGL:** se muestra un mensaje, y el menú HTML de distritos (sección 7) permite completar la experiencia.
- **Comunicación Three.js ↔ React:**
  - De React a la escena: `route` y `progress` (`litDistricts`).
  - De la escena a React: los callbacks `onHoverDistrict(id)`, `onSelectDistrict(id)` y `onInteractionProgress(id, 0..1)` / `onInteractionComplete(id)`, guardados en refs para no reconstruir la escena.

## 5. Interacciones de los dioramas

| Distrito | Diorama | Interacción | Feedback | Alternativa accesible |
|---|---|---|---|---|
| 12 · Carbón | Boca de mina, alambrado, borde del bosque | 8 clics sobre la veta. El último revela una brasa | SFX de golpe de pico, temblor de cámara, polvo y piedras | Botón "Picar" (8 veces) |
| 11 · Agricultura | Campos de trigo, huertos, torres de vigilancia | Pasar el puntero sobre las espigas las cosecha (hasta el 100%) | Crujido, partículas doradas. Al completar suena el silbido de 4 notas y los sinsajos lo repiten | Botón "Cosechar" (avanza por tramos) |
| 4 · Pesca | Costa, muelle, botes | Arrastrar y soltar desde el muelle para lanzar la red. Hay que atrapar 3 peces en movimiento | Salpicadura, ondas en el agua | Botón "Lanzar red" (atrapa 1 pez por pulsación) |

- Cada interacción dura entre 20 y 40 segundos y tiene una barra de progreso en el overlay.
- Todas funcionan con mouse y con touch.
- Al completarse: la cámara se aleja, aparece el emblema, se guarda el progreso y sale la chispa hacia el Capitolio.
- Si el distrito ya estaba encendido, se ve el diorama terminado y no se repite la interacción.

## 6. Audio

`lib/audio/AudioEngine.js` es una única instancia creada en el layout. Solo se inicia después del clic de la intro.

- **Ambiente:** loop CC0 (viento o atmósfera oscura) sonando siempre. Baja de volumen dentro de los dioramas.
- **Secuenciador:** reloj de Web Audio a 80 BPM en re menor, con programación anticipada (lookahead). Tiene 3 capas que corren siempre con su ganancia en 0:
  - `percusion` (12): kick senoidal grave más un golpe de ruido filtrado.
  - `silbido` (11): un motivo de 4 notas original (no se copia la melodía de las películas), con onda senoidal, vibrato y delay.
  - `pad` (4): acordes de diente de sierra desafinados con filtro pasabajos, en movimiento lento.
- **Encender un distrito:** la capa correspondiente sube con una rampa de ~4 s. Dentro de un diorama sin completar, esa capa se oye "de prueba" a un volumen bajo.
- **Final:** las 3 capas más una variación: `rebelion` (más percusión, tonalidad mayor en la cadencia) o `memoria` (sin percusión, silbido lento).
- **SFX:** archivos cortos de Freesound, cada uno con su crédito.
- **Control:** botón de sonido global en el header, que se recuerda en localStorage. Si Web Audio no está disponible, aparece un aviso y la experiencia continúa en silencio.

## 7. Interfaz y accesibilidad

- **Estética:**
  - Fondo casi negro con una grilla tenue. Piezas grises con bordes claros, como en la imagen de referencia.
  - Tipografía condensada en mayúsculas para títulos y números (Oswald o Bebas Neue) y una sans legible para el texto.
  - Acento "chispa" en naranja fuego, y un color propio por distrito encendido.
  - Intro y final con capa CRT (scanlines y glitch) en rojo y blanco del Capitolio.
- **Overlay:**
  - Header con marca, emblemas `n/3` (al abrirse se ven los emblemas y el mensaje final), botón de sonido, indicador NUBE/LOCAL y acceso a la cuenta.
  - Panel lateral para la ficha del distrito, que en celular pasa a ser una hoja que sube desde abajo.
  - Dial circular con el sello del Capitolio como menú de distritos.
- **Accesibilidad:**
  - El dial y el menú son botones HTML navegables con teclado, uno por distrito.
  - Cada interacción 3D tiene su botón alternativo.
  - Hay textos alternativos y `aria-live` para los avisos.
  - Se respeta `prefers-reduced-motion`: transiciones cortas y sin temblor de cámara.
- **Responsive:** poses de cámara alternativas, hoja inferior y touch en todos los dioramas.

## 8. Estado y Firebase

Se reutilizan `lib/firebase.js`, `components/AuthPanel.js` y la estructura de `hooks/useProgress.js`: autenticación anónima, con Google y con email, fallback a localStorage e indicador NUBE/LOCAL. Cambia el modelo de datos:

```js
// progress/{uid}
{
  userId: "uid",                       // == request.auth.uid
  litDistricts: ["12", "11"],          // subconjunto de ["12","11","4"]
  visited: ["7", "13", "12"],          // fichas vistas
  finalMessage: null | "rebelion" | "memoria",
  completedAt: null | timestamp,
  updatedAt: serverTimestamp()
}
```

- La clave de localStorage es `panem-chispa-v1`.
- `normalize()` descarta valores inválidos.
- `firestore.rules`: cada usuario solo lee y escribe `progress/{uid}` y `users/{uid}` cuando `uid == request.auth.uid`. Se agrega validación de tipos y valores de los campos nuevos.
- "Reiniciar" borra el progreso, apaga Panem y vuelve a `/`.

**Se elimina** (queda en el historial de git; acordado con Lola): `ArenaMap`, `DistrictsView`, `PeopleView`, `SignalArchive`, `ThreeSignal`, `Hero`, `StoryDialog`, `Experience`, `app/archivo/[chapter]`, `public/assets/arena.jpg` y `public/assets/panem-reference.jpg`. `data/chapters.js` se reemplaza por `data/districts.js`. `MotionLayer` se reutiliza solo si sirve para la capa CRT.

## 9. Datos

`data/districts.js` exporta un array de 14 entradas (1–13 y `c`) con: `id`, `number`, `name`, `industry`, `color`, `playable` (true para 12, 11 y 4), `quote`, `seal` (ruta del ícono: recortado de la imagen de referencia y vectorizado, o redibujado en Figma; con crédito), `cameraPose` y, para los jugables, `layer` (`percusion`, `silbido` o `pad`), `instruction` y `actionLabel`. Los textos son originales, inspirados en los libros, sin citas extensas.

## 10. Manejo de errores

- `id` inválido en `/distrito/:id`: `notFound()`.
- `/capitolio` sin los 3 emblemas: redirección a `/mapa` con un aviso.
- Sin WebGL: menú HTML y fichas. Los distritos jugables se completan con los botones alternativos.
- Sin Web Audio o con el audio bloqueado: aviso y la experiencia sigue en silencio.
- Firebase no configurado o caído: modo LOCAL, como en la implementación actual.
- Error de carga del SVG o de algún asset: `error.js` con un botón de reintento.

## 11. Verificación

No hay tests automatizados de la escena. En cada etapa:

- se ejecutan `npm run lint` y `npm run build` sin errores;
- se recorre esta checklist en el navegador:
  - recorrido completo de la intro al final;
  - recarga en cada ruta;
  - link directo a `/capitolio` sin emblemas;
  - `/distrito/99` da 404;
  - sonido apagado;
  - sin WebGL (simulado);
  - solo teclado;
  - viewport de celular con touch;
  - modos LOCAL y NUBE;
- tras navegar 10 veces entre rutas, `renderer.info.memory` y `renderer.info.programs` no deben crecer.

## 12. Documentación y créditos (README)

El README incluye la premisa, la sinopsis, el mapa de navegación (diagrama de las rutas de la sección 3), las decisiones técnicas (canvas persistente en el layout, SVG extruido, audio procedural) e instrucciones de instalación y variables de entorno.

Créditos:

- *The Hunger Games*, de Suzanne Collins / Lionsgate, con aclaración de uso académico sin fines comerciales.
- La imagen de referencia del mapa y su fuente.
- Las tipografías.
- Los SFX de Freesound y el ambiente CC0.
- Los modelos CC0, si se usan.

## 13. Fuera de alcance

Más distritos jugables (solo si sobra tiempo, después de terminar todo lo anterior), multijugador, contenido administrable desde Firestore, música compuesta en DAW, modelos hechos en Blender.
