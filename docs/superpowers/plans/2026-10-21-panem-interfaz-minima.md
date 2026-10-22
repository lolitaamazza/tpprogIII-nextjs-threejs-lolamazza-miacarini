# Interfaz mínima (distritos, Distrito 13 y archivo de los Juegos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sacar los paneles grandes de los distritos, del Distrito 13 y del archivo de los Juegos, y dejar un HUD mínimo sobre el 3D, con la arena en dos vistas (siguiendo al tributo y la mesa de los Vigilantes).

**Architecture:** Lo que cada pantalla muestra se decide en módulos puros (`lib/districtHud.js`, `lib/games/hud.js`, `gamesViewPose` en `cameraPoses.js`) probados con `node --test`; los componentes solo dibujan ese resultado. La escena del archivo suma una vista "mesa" (holograma + luces) y la posibilidad de tocar tributos en 3D.

**Tech Stack:** Next.js 16 (App Router), React 19, Three.js r186, GSAP 3.15, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-21-panem-interfaz-minima-design.md` (objetivos 1 a 5; el objetivo 6, minijuegos con modelos, va en un plan aparte cuando Mia apruebe las descargas).

## Global Constraints

- Sin frameworks nuevos; Three.js r186 directo; GSAP ya instalado.
- Textos de una línea: "explicamos de más" es el anti-objetivo de Mia. En el mundo, inglés; la interfaz, en español rioplatense (voseo).
- Accesibilidad: todo se juega con teclado y botón; íconos con `aria-label`; movimiento reducido sin movimientos bruscos.
- Celular (375 px): el HUD no se superpone; en la arena se apila (estado arriba, decisiones abajo a todo el ancho).
- No cambian las reglas de los minijuegos ni la simulación de la arena.
- No commitear ni pushear: Mia lo pide cuando quiere (los pasos "Commit" quedan como "avisar a Mia").
- Verificación de cada tarea: `npm test`, `npx eslint .`, y para lo visual `npm run build` + `next start` en :3002 (nunca tocar el `next dev` de Mia).

## Review Focus

1. Entrar a un distrito jugable antes de que cargue el mapa (sin partida todavía): el HUD tiene que mostrar título y pista sin romperse (test en Task 1).
2. Tributo caído en la arena: el HUD de vitales desaparece y la línea de eventos sigue (test en Task 3).
3. Turno sin eventos (apertura con solo el evento `opening`): la línea muestra ese evento, nunca `undefined` (test en Task 3).
4. Cambiar a la mesa con la arena todavía cargando: las luces se ven igual sobre el piso (test en Task 4).
5. Tocar el 3D en la Cosecha con un diálogo abierto: no abre otro (verificación en Task 6).

---

### Task 1: HUD de los distritos (sin panel lateral) y Distrito 13 solo con etiqueta

**Files:**
- Create: `lib/districtHud.js`, `tests/district-hud.test.mjs`, `components/panem/DistrictHud.js`
- Delete: `components/panem/DistrictPanel.js` (lo reemplaza `DistrictHud`; su lógica de teclado y de `markVisited` se mueve tal cual)
- Modify: `app/(panem)/distrito/[id]/page.js` (usa `DistrictHud`), `data/districts.js` (pistas de una línea), `app/globals.css` (`.district-hud`, sacar `.district-panel`)
- Modify: `components/stage/cameraPoses.js` + `tests/camera.test.mjs` (los distritos ya no corren la vista; `openAreaFor` sin panel)

**Interfaces:**
- Produces: `districtHud({ district, match = null, lit = false, revealed = false, progress = 0, webgl = true })` → `{ kind: 'play'|'done'|'info'|'classified', title: string|null, hint: string|null, score: { label, value, total }|null, lives: { label, left, total }|null, lost: string|null, help: string|null, action: string|null, birds: boolean, tag: { text, live }|null, signal: number|null }`
- Produces: `openAreaFor(width, height)` → `{ x0: 0, y0: min(72/height, 0.3), x1: 1, y1: 1 }` (sin panel en ningún tamaño).

- [ ] **Step 1: Tests de `districtHud`** en `tests/district-hud.test.mjs` con `getDistrict` de `data/districts.js`:
  - `jugable recién entrado`: con `match = createMatch({ goal: 6, lives: 3 })` y el 12 → `kind 'play'`, `title '12 · Carbón'`, `hint` = `district.instruction`, `score { label: 'Bloques', value: 0, total: 6 }`, `lives { label: 'Canario', left: 3, total: 3 }`, `lost null`, `action 'Picar'`.
  - `sin partida todavía (mapa cargando)`: `match null` → `kind 'play'`, `hint` = instrucción, `score null`, `lives null`.
  - `la pista se va después de la primera jugada`: `resolve(match, { points: 1 })` → `hint null`; también con `cost: 1`.
  - `perdido`: `lost` = `district.lostMessage`, `action null`.
  - `ayuda`: con `losses: 2` → `help` = `district.helpNote`.
  - `silbido del 11`: `{ ...match, step: 'song', stepScore: 0, stepGoal: 4 }` → `score.label 'Silbido'`, `score { value: 0, total: 4 }`, `birds true`, `action` = `songActionLabel`, `hint` = `songInstruction`; con `stepScore: 1` → `hint null`.
  - `encendido`: `lit true` → `kind 'done'`, `hint 'Emblema obtenido.'`, `score null`.
  - `distrito sin juego`: el 7 → `kind 'info'`, `title '7 · Madera'`, `hint` = la cita.
  - `Distrito 13`: → `kind 'classified'`, `title null`, `tag { text: 'Acceso denegado', live: false }`, `signal 0.4` con `progress 0.4`; `revealed true` → `tag { text: 'Señal recuperada', live: true }`, `signal null`; `webgl false` → `signal null`.
- [ ] **Step 2:** `node --test tests/district-hud.test.mjs` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar `districtHud`** en `lib/districtHud.js` (puro, sin alias de imports). Pistas de una línea en `data/districts.js`: 12 `'Picá cuando la luz pase por la grieta.'`; 4 `'Mantené apretado sobre el agua y soltá sobre los peces.'`; 11 `'Cosechá lejos del reflector.'`, `songInstruction: 'Repetí el silbido tocando a los sinsajos.'`.
- [ ] **Step 4:** `node --test tests/district-hud.test.mjs` → PASS.
- [ ] **Step 5: Tests de cámara:** en `tests/camera.test.mjs`, los distritos (incluido el 13) devuelven `{ x: 0, y: 0 }` de `viewShiftFor` en escritorio y celular; el Capitolio y `finale` con `panel` siguen corriéndose como hoy; `openAreaFor(1440, 900)` → `x1 1`, `y1 1`; `openAreaFor(375, 812)` → `y1 1`. Correr → FAIL.
- [ ] **Step 6:** En `viewShiftFor`, sacar `scene === 'distrito'` de `hasPanel`; `openAreaFor` sin panel. Correr → PASS.
- [ ] **Step 7: `DistrictHud`**: renderiza `districtHud(...)`. Arriba a la izquierda (debajo del encabezado): `BackLink`, sello 28 px, `title` en Oswald, `hint` en una línea. Abajo al centro: `score` como pastillas (▮▯), `lives` como puntos (●○) con `aria-label` "Canario: 2 de 3", `help` chico dorado, botón secundario con `action` (y los botones 1 a 4 si `birds`), y si `lost`: el mensaje y el botón primario "Reintentar". Distrito 13: solo `tag` + barras de señal + `BackLink` en la esquina superior izquierda. Mantiene: barra espaciadora, teclas 1 a 4, Esc en el 13, espera de 800 ms antes de reintentar, `markVisited`. El `progressbar` accesible del avance se mantiene en el contenedor de `score`.
- [ ] **Step 8:** `npm test`, `npx eslint .`, `npm run build`; en :3002 revisar /distrito/12, /distrito/4, /distrito/11 (hasta el silbido), /distrito/7 y /distrito/13 en 1440×900 y 375×812: nada tapa el diorama, la pista desaparece al jugar.
- [ ] **Step 9:** Avisar a Mia (sin commit).

### Task 2: El diorama queda centrado en el Distrito 13 y en los minijuegos

**Files:**
- Modify: `components/stage/classifiedGlitch.js` (la ventana del mensaje se centra en `openAreaFor`, que ahora es toda la pantalla debajo del encabezado)

**Interfaces:**
- Consumes: `openAreaFor(width, height)` de Task 1.

- [ ] **Step 1:** Con `openAreaFor` nuevo, la ventana del mensaje usa el mismo cálculo actual (`narrow` cuando el área es más ancha que 0,9) sin cambios de código salvo comentarios que mencionen el panel. Correr `node --test tests/glitch-shards.test.mjs tests/camera.test.mjs` → PASS.
- [ ] **Step 2:** En :3002, /distrito/13 en 1440×900 y 375×812: el mensaje "WE ARE STILL TRANSMITTING" queda centrado y la etiqueta no lo tapa.
- [ ] **Step 3:** Avisar a Mia.

### Task 3: Lo que muestra el HUD de la arena (puro)

**Files:**
- Create: `lib/games/hud.js`, `tests/games-hud.test.mjs`

**Interfaces:**
- Produces: `TICKER_SECONDS = 2.5`
- Produces: `turnHeadlines(run)` → eventos de `run.turn`, ordenados: primero los que incluyen a `run.selectedId`, después `elimination`, después el resto (orden original dentro de cada grupo).
- Produces: `headlineAt(list, seconds)` → `list[Math.floor(seconds / TICKER_SECONDS) % list.length]` o `null` si está vacía.
- Produces: `vitalsFor(tribute)` → `[{ key: 'health', label: 'Salud', value }, { key: 'energy', label: 'Energía', value }]` más `{ key: 'hunger', label: 'Hambre', value, warning: true }` si `hunger >= 60` y `{ key: 'thirst', label: 'Sed', value, warning: true }` si `thirst >= 60`; `[]` si el tributo cayó.
- Produces: `statusLine(run)` → `{ label, alive }`: `label` `'Apertura'` en el turno 0, si no `` `Jornada ${Math.ceil(turn / 2)} · ${turn % 2 ? 'día' : 'noche'}` ``; `alive` = tributos en pie.

- [ ] **Step 1: Tests** en `tests/games-hud.test.mjs` con partidas de `createRun`/`selectTribute`/`prepareRun`/`advanceRun`: `turnHeadlines` pone primero el evento de decisión de tu tributo y después las caídas; en la apertura devuelve el evento `opening` (Review Focus 3); `headlineAt` rota y devuelve `null` con lista vacía; `vitalsFor` muestra hambre solo desde 60 y devuelve `[]` con el tributo caído (Review Focus 2); `statusLine` da `'Apertura'`, `'Jornada 1 · día'` (turno 1) y `'Jornada 1 · noche'` (turno 2).
- [ ] **Step 2:** `node --test tests/games-hud.test.mjs` → FAIL.
- [ ] **Step 3:** Implementar en `lib/games/hud.js`.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Avisar a Mia.

### Task 4: La mesa de los Vigilantes y tocar tributos en 3D

**Files:**
- Modify: `components/stage/games/archiveScene.js`, `components/stage/cameraPoses.js`, `components/stage/panemScene.js`, `components/panem/PanemStage.js`
- Test: `tests/archive-scene.test.mjs`, `tests/camera.test.mjs`

**Interfaces:**
- Produces (cameraPoses): `gamesViewPose(view, focus, aspect)` → `'table'`: `{ position: [0, 22 * far, 6 * far], target: [0, 0, 0] }` con `far = fitFar(aspect, 1, 1.1)`; `'follow'` con `focus {x,y,z}`: `{ position: [x + 3.2, y + 3.4, z + 4.4], target: [x, y + 0.6, z] }`; `'follow'` sin `focus`: la pose de arena de `poseFor`.
- Produces (archiveScene): `setView(view: 'follow'|'table')`; `pick(raycaster)` → id del tributo (`'tribute-N'`) o `null`; `getView()`.
- Produces (panemScene API): `setGamesView(view)`; callback `onPickTribute(id)`.
- Produces (PanemStage): `window.dispatchEvent(new CustomEvent('panem-pick-tribute', { detail: id }))`, igual que el `panem-arena-status` que ya usa el archivo.

- [ ] **Step 1: Tests:** `gamesViewPose('table')` está más alta que cualquier `'follow'` y mira al centro; `'follow'` mira a `focus.y + 0.6`. En `archive-scene.test.mjs`: con capítulo `arena` y `setView('table')`, las figuras quedan invisibles y hay 24 luces visibles (una dorada, la del tributo elegido) aunque la arena no haya cargado (Review Focus 4); un tributo caído muestra la cruz; `pick` con un rayo vertical sobre la luz de `tribute-3` devuelve `'tribute-3'` y sobre el vacío `null`; en `reaping`, `pick` sobre la figura 5 devuelve `'tribute-5'`.
- [ ] **Step 2:** Correr → FAIL.
- [ ] **Step 3: archiveScene:** luces = un `InstancedMesh` de esferas chicas (0,09) con colores por instancia (cian `#bfeff5`, dorada `#d4af37` para el elegido), cruces para caídos (`LineSegments`), mesa (cilindro oscuro bajo la arena, radio 7,5) y 8 siluetas de Vigilantes (cápsulas oscuras) en el borde; solo visibles en `table`. En `table`, los materiales del modelo de la arena pasan a un único `ShaderMaterial` de holograma (cian `#5fd3e0`, opacidad ~0,35, líneas de barrido, borde por fresnel, `blending: AdditiveBlending`, `depthWrite: false`); al volver a `follow` se restauran los originales. `pick` hace raycast contra las luces en `table` y contra las figuras en el resto.
- [ ] **Step 4: panemScene:** en la escena `games`, las poses de arena salen de `gamesViewPose(state.gamesView, focus del tributo elegido vivo, aspect)` (también donde hoy vuelve de la cinemática con `poseFor`); `setGamesView` mueve la cámara (1,2 s, 0 con movimiento reducido) y llama a `archive.setView`. En `onPointerUp` con escena `games` y clic (misma tolerancia que el mapa): `archive.pick(raycaster)` → `callbacks.onPickTribute(id)`. `viewShiftFor` ya no corre la vista en `games` (sacarlo de `hasPanel`; actualizar el test que lo cubra).
- [ ] **Step 5:** Correr los tests → PASS. `npm test` completo.
- [ ] **Step 6:** Avisar a Mia.

### Task 5: HUD de la arena y barra del archivo

**Files:**
- Create: `components/games/ArenaHud.js`, `components/games/ArchiveBar.js`
- Delete: `components/games/LiveBroadcast.js`, `components/games/TributeHud.js`
- Modify: `components/games/GamesExperience.js`, `components/games/games.css`

**Interfaces:**
- Consumes: `turnHeadlines`, `headlineAt`, `vitalsFor`, `statusLine` (Task 3); `setGamesView`, `panem-pick-tribute` (Task 4); `autoAdvance` (ya existe en `lib/games/view.js`).
- Produces: `<ArenaHud run encounter onDecide(optionId) onAdvance autoLeft paused />` y `<ArchiveBar chapter run view onView paused onPause onInspect games quality onQuality />`.

- [ ] **Step 1: ArenaHud** (mockup A/B): arriba a la izquierda `● En vivo · {statusLine.label}` (verde, mono 11 px) y `{alive} en pie`; abajo a la izquierda nombre + distrito + barras finas de `vitalsFor` (las de aviso en rojo); abajo al centro, si hay `encounter`: título en una línea y las opciones como subtítulos `1 · …` (clic o teclas 1–3, sin repetir con tecla mantenida); si no: la línea `headlineAt(turnHeadlines(run), segundos)` y, al lado, "Seguir" chico + "Sigue sola en N s" o "En pausa". En celular se apila según Global Constraints.
- [ ] **Step 2: ArchiveBar** (arriba a la derecha, íconos de `react-icons/pi` con `aria-label` y `title`): vista (`PiCubeFocus` seguir / `PiGlobeHemisphereWest` mesa; solo en arena), tributos (`PiUsers`), crónica (`PiScroll`, arena y desenlace), pausa (`PiPause`/`PiPlay`), menú (`PiList`). Abre un cajón por vez (lateral, 320 px, Esc lo cierra, foco al abrir): tributos = lista compacta (número, nombre, estado) que abre `TributeModal`; crónica = eventos de la partida; menú = calidad, partida y guardado (lo que hoy está en `details.games-save`), créditos de los modelos y `BackLink`.
- [ ] **Step 3: GamesExperience** usa `ArenaHud` y `ArchiveBar` en la arena; guarda `view` (`'follow'` por defecto) y llama `stageApiRef.current?.setGamesView(view)`; escucha `panem-pick-tribute` para abrir `TributeModal` (si no hay uno abierto: Review Focus 5). Se van: `games-heading` grande, la consola lateral, el registro fijo, `LiveBroadcast`, `TributeHud`. Se quedan: `ArchiveIntercept`, la etiqueta "Señal pirata" (chica, junto al estado), `TributeModal`, avance automático.
- [ ] **Step 4:** `npm test`, `npx eslint .`, `npm run build`; en :3002 jugar una partida entera con el script headless (`deck/archivo.mjs`): decisiones por subtítulo, avance solo, cambio de vista, tocar una luz abre la ficha; capturas en 1440×900 y 375×812.
- [ ] **Step 5:** Avisar a Mia.

### Task 6: Cosecha, Preparación y Desenlace mínimos

**Files:**
- Modify: `components/games/GamesExperience.js`, `components/games/games.css`

**Interfaces:**
- Consumes: `ArchiveBar` (Task 5), `panem-pick-tribute` (Task 4).

- [ ] **Step 1: Cosecha:** arriba a la izquierda "La Cosecha" (Oswald 28 px) y la pista `'Tocá un tributo en el escenario para conocerlo.'`; sin partida, tarjeta chica abajo al centro: "Entramos." + una línea + "Abrir una edición". Elegir: tocar la figura en 3D o desde el cajón de tributos → `TributeModal` con "Acompañar a …".
- [ ] **Step 2: Preparación:** tarjeta compacta abajo al centro: una fila por emblema con dos opciones (botones de selección, `role="radiogroup"`), y "Entrar a la arena".
- [ ] **Step 3: Desenlace:** abajo a la izquierda: "Sobreviviente · Distrito N", el nombre grande, una línea y dos acciones (`Transmitir el mensaje final` → `/capitolio`, `Volver a jugar` con su confirmación); la crónica en la barra.
- [ ] **Step 4:** Indicador de capítulo chico (`01 / 04 · La Cosecha`) junto al título; `README.md`: actualizar la sección del archivo (sin panel, dos vistas, barra de íconos) y la de los distritos.
- [ ] **Step 5:** `npm test`, `npx eslint .`, `npm run build`; recorrido completo en :3002 (Cosecha → Desenlace) en escritorio y celular con capturas.
- [ ] **Step 6:** Avisar a Mia con las capturas (sin commit).
