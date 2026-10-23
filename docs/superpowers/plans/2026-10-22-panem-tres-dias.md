# Tres días antes de la Cosecha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Panem en una historia con camino: tres días (12, 11, 4) con su jornada y la decisión de las teselas, fragmentos para encontrar, la Cosecha que sortea a uno de los tres según sus papeles, los Juegos que lo siguen y un final que cambia con lo encontrado.

**Architecture:** El estado de la historia (papeles, teselas, decisión pendiente, fragmentos, Juegos terminados) vive en un módulo puro (`lib/story.js`) y se guarda en `localStorage` (`panem-cosecha-v1`) desde `PanemProvider`, junto al progreso que ya existe (`litDistricts` = días jugados). Los fragmentos son datos (`lib/fragments.js`) que los dioramas dibujan como objetos tocables. Las puertas (archivo de los Juegos, Capitolio) pasan a depender de la historia.

**Tech Stack:** Next.js 16, React 19, Three.js r186, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-22-panem-tres-dias-design.md`

## Global Constraints

- Textos de una línea; la tele del Capitolio en inglés (en el mundo), el resto en español rioplatense (voseo).
- Sin violencia explícita.
- Siempre se puede avanzar: nada bloquea la historia por una decisión.
- No cambian las reglas de los tres minijuegos ni la simulación de la arena (salvo los nombres de la edición y el tributo propio).
- Los cambios en archivos de Lola (`lib/games/*`, `components/games/*`, `data/workshops.js`, `components/stage/dioramas/workshop.js`) son los mínimos que pide el spec.
- No commitear ni pushear.

## Review Focus

1. Recargar a mitad de la historia (con una decisión de teselas pendiente): la decisión sigue esperando, no se pierde ni se duplica (test en Task 1).
2. Partida vieja con 12, 11 y 4 encendidos: llega a la Cosecha sin trabarse (test en Task 1).
3. Tocar un fragmento ya encontrado: no suma dos veces (test en Task 1).
4. Reiniciar Panem desde el archivo pirata: se borran la historia y la edición de los Juegos (verificación en Task 5).
5. Sin WebGL: los días se juegan con el botón alternativo y la decisión de teselas aparece igual (verificación en Task 2).

---

### Task 1: El estado de la historia (puro)

**Files:** Create `lib/story.js`, `tests/story.test.mjs`.

**Interfaces (Produces):**
- `STORY_DAYS = ['12', '11', '4']`
- `PROTAGONISTS = { 12: { name: 'Ash', age: 16, tributeId: 'tribute-24' }, 11: { name: 'Oliva', age: 15, tributeId: 'tribute-21' }, 4: { name: 'Marin', age: 14, tributeId: 'tribute-7' } }`
- `createStory()` → `{ version: 1, papers: { 12: 5, 11: 4, 4: 3 }, tesserae: {}, pending: null, fragments: [], gamesEnded: false }`
- `storyDay(story, lit)` → `{ index, district }` del primer día no encendido en `lit`, o `null` si los tres están.
- `storyPhase(story, lit)` → `'day' | 'decision' | 'cosecha' | 'games-ended'` (`decision` si hay `pending`; `cosecha` con los tres días encendidos y sin pendiente; `games-ended` si `gamesEnded`).
- `completeDay(story, district, { perfect })` → `pending: { district, cost: perfect ? 1 : 2 }` (solo si `district` es el día actual y no hay otra pendiente).
- `decideTesserae(story, accept)` → suma `cost` a `papers[district]` si `accept`; `tesserae[district] = accept ? cost : 0`; `pending: null`.
- `reapedDistrict(papers, seed)` → `'12' | '11' | '4'`, sorteo con pesos = papeles, determinista por `seed`.
- `findFragment(story, id)` → agrega `id` una sola vez.
- `normalizeStory(value)` → historia válida o `createStory()`.

- [ ] **Step 1: Tests** (`tests/story.test.mjs`): estado inicial; `storyDay` recorre 12 → 11 → 4 y da `null` al final; `completeDay` con `perfect` deja `cost: 1`, sin `perfect` `cost: 2`, y no hace nada fuera de orden; `decideTesserae(true)` suma papeles y `false` no; `storyPhase` en cada caso, incluida una partida vieja con `lit = ['12','11','4']` y sin decisiones → `'cosecha'` (Review Focus 2); `normalizeStory` conserva `pending` (Review Focus 1) y rechaza basura; `findFragment` no duplica (Review Focus 3); `reapedDistrict` es determinista, siempre devuelve uno de los tres, y en 3000 semillas con papeles `{12: 9, 11: 1, 4: 1}` sale el 12 más del 70 % de las veces.
- [ ] **Step 2:** Correr → FAIL. Implementar. Correr → PASS.

### Task 2: Los días en el juego (provider, mapa, HUD, teselas)

**Files:** Modify `components/panem/PanemProvider.js`, `lib/mapCopy.js` (+ `tests/mapcopy.test.mjs`), `components/panem/MapIntro.js`, `components/panem/MapHud.js`, `lib/districtHud.js` (+ test), `components/panem/DistrictHud.js`, `data/districts.js`, `lib/progress.js` (+ test), `app/globals.css`.

**Interfaces:**
- Consumes: Task 1.
- Produces (provider): `story`, `decideTesserae(accept)`, `findFragment(id)`, `markGamesEnded()`; `handleComplete(districtId, { perfect })` llama a `completeDay`; el incendio ya no se dispara acá.
- Produces (`lib/progress.js`): `PLAYABLE_IDS = ['12', '11', '4']`; `canEnterCapitol(progress, story)` → `story?.gamesEnded === true`; `archiveGate({ ready, synced, progress, story })` → `'allowed'` con `storyPhase` en `'cosecha'` o `'games-ended'`.
- Produces (`mapIntroCopy({ day, phase })`): día 1 `'Faltan tres días para la Cosecha.'` / `'Día 1 · Distrito 12: Ash baja a la mina.'`; día 2 `'Faltan dos días.'` / `'Día 2 · Distrito 11: Oliva cosecha bajo las torres.'`; día 3 `'Mañana es la Cosecha.'` / `'Día 3 · Distrito 4: Marin sale a pescar.'`; cosecha `'Hoy es la Cosecha.'` / `'La plaza espera. Los papeles ya están en la urna.'` + acción `Ir a la plaza` (`/cosecha`).
- Produces (`districtHud`): `kind: 'decision'` con `{ who, line, cost, papers }` cuando el distrito tiene la decisión pendiente; `kind: 'tomorrow'` (`hint: 'Mañana.'`) para un día futuro; los nueve distritos sin juego `kind: 'explore'` (título y cita, sin contadores).

- [ ] **Step 1: Tests:** `mapIntroCopy` por día y fase; `districtHud` con decisión pendiente, día futuro y distrito de exploración; `canEnterCapitol` y `archiveGate` con la historia.
- [ ] **Step 2:** Correr → FAIL. Implementar los módulos puros. Correr → PASS.
- [ ] **Step 3:** Provider: guarda/lee `panem-cosecha-v1`; `resetAll` lo borra junto con la edición de los Juegos (`panem-games-v1:*`). `handleComplete` decide `perfect` con la partida del diorama (`livesLeft === lives`) o `true` en el modo sin WebGL. `selectDistrict('c')` usa `canEnterCapitol(progress, story)`.
- [ ] **Step 4:** `data/districts.js`: los nueve talleres vuelven a `playable: false` con `explore: true` (y su cita); `PLAYABLE_IDS` a los tres días.
- [ ] **Step 5:** `DistrictHud`: tarjeta de decisión abajo al centro: `"Ash cumplió la cuota. La ración no alcanza para los cinco."`, `"Papeles en la urna: 5 → 7"`, botones `Pedir teselas` y `No pedir` (el segundo muestra `"Esta noche cenan los chicos; Ash no."` un momento). Día futuro: `Mañana.` en la pista y sin jornada (el diorama se construye en modo `completed: false` pero sin aceptar jugadas — ver Task 3).
- [ ] **Step 6:** `npm test`, lint, build; recorrido headless: día 1 → ganar → decidir → mapa dice día 2.

### Task 3: Capitol TV entre días y días futuros quietos

**Files:** Create `components/panem/CapitolBulletin.js` (+ estilos en `tv-intro.css` o `globals.css`); Modify `lib/story.js` (`BULLETINS`), `components/stage/panemScene.js`, `components/stage/dioramas/*.js` (aceptar `locked`).

**Interfaces:**
- Produces: `BULLETINS = { 12: { headline: 'DISTRICT 12 EXCEEDS ITS QUOTA', body: 'Proud miners keep the Capitol warm.' }, 11: { headline: 'RECORD HARVEST IN DISTRICT 11', body: 'Every basket is a gift to Panem.' }, 4: { headline: 'DISTRICT 4 FEEDS THE NATION', body: 'The sea has never been so generous.' } }`.
- Produces: dioramas con `locked: true` ignoran jugadas (`pointerDown`, `performAction` no hacen nada; `pointerMove` devuelve false) y no emiten partida.

- [ ] **Step 1:** Test en `tests/dioramas-build.test.mjs`: con `locked: true`, `performAction` no emite partida ni progreso en los tres dioramas.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** `CapitolBulletin`: aparece después de decidir las teselas, 4 s, estilo de la tele de la intro (logo CAPITOL TV, titular, una línea, ticker), botón `saltar` discreto, Esc lo cierra; con movimiento reducido sin parpadeos. Después, vuelve al mapa.

### Task 4: Fragmentos

**Files:** Create `lib/fragments.js`, `tests/fragments.test.mjs`, `components/stage/dioramas/fragment.js`, `components/panem/FragmentCard.js`; Modify `components/stage/panemScene.js`, `components/stage/dioramas/{district12,district11,district4,workshop}.js`, `components/panem/PanemStage.js`, `components/panem/DistrictHud.js`.

**Interfaces:**
- Produces: `FRAGMENTS`: 12 entradas `{ id, district, kind: 'object'|'document'|'recording', title, line, position: [x, y, z] }` (una en cada uno de los 12 distritos productivos) + la señal del 13 cuenta como fragmento `'13-signal'` cuando se revela.
- Produces: `fragmentsFor(district)`; `FRAGMENT_TOTAL = 13`.
- Produces (`fragment.js`): `addFragment(group, fragment, { found })` → `{ object, hit, setFound(found), update(elapsed) }` (un objeto chico con brillo pulsante sutil que se apaga al encontrarlo).
- Produces (dioramas): opción `fragments` y callback `onFragment(id)`; `pointerDown` sobre el objeto del fragmento lo reporta antes que cualquier jugada.
- Produces (escena): los nueve distritos de exploración construyen `buildWorkshop(id, { explore: true })`: la maqueta sin la pista ni el juego.

- [ ] **Step 1: Tests:** `FRAGMENTS` tiene uno por distrito productivo, ids únicos, líneas de menos de 110 caracteres; `fragmentsFor` filtra; en `dioramas-build`: tocar el objeto del fragmento con un rayo llama a `onFragment` y no cuenta como jugada; el taller en modo `explore` no emite partida.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** `FragmentCard`: tarjeta chica abajo a la izquierda con estilo de documento del Capitolio (mono, tachones, sello `CLASSIFIED` cruzado), título y una línea, se cierra sola a los 6 s o con un clic. Revelar el 13 suma `'13-signal'`.

### Task 5: Archivo pirata (encabezado)

**Files:** Create `components/panem/PirateArchive.js`; Modify `components/panem/SiteHeader.js`, delete `components/panem/EmblemsDialog.js`.

- [ ] **Step 1:** El botón del encabezado pasa a `Día 2/3 · Fragmentos 4/13` (en la Cosecha y después, `Cosecha · Fragmentos n/13`). El diálogo muestra: los tres protagonistas con sus papeles y teselas pedidas, los fragmentos encontrados (título y línea) y los que faltan como `???`, reiniciar Panem (con confirmación) y, terminado todo, `Ver Panem arder otra vez`.
- [ ] **Step 2:** El acceso `Los Juegos` del encabezado aparece con `archiveGate === 'allowed'`.
- [ ] **Step 3:** Verificar reinicio (Review Focus 4).

### Task 6: La Cosecha con los papeles y los Juegos siguiendo a quien salió

**Files:** Modify `lib/games/simulation.js` (+ `tests/games.test.mjs`), `components/games/GamesProvider.js`, `components/games/GamesExperience.js`, `components/games/ReapingDraw.js` (solo textos).

**Interfaces:**
- Produces: `createRun(seed, id, { protagonist } = {})`: con `protagonist` (un `tributeId` de `PROTAGONISTS`), los otros dos protagonistas se reemplazan por `ALTERNATES = { 'tribute-24': 'Cardo', 'tribute-21': 'Lirio', 'tribute-7': 'Coral' }` y `run.protagonist = protagonist`; `validateRun` acepta esos nombres.
- Produces: `GamesProvider.start()` usa `reapedDistrict(story.papers, seed)` para elegir el protagonista; al terminar la ceremonia de la urna se selecciona solo (`select(run.protagonist)`), sin el paso de elegir tributo.
- Produces: al llegar al desenlace, `markGamesEnded()`.

- [ ] **Step 1: Tests:** `createRun` con protagonista: los otros dos nombres cambian, el elegido se mantiene, `validateRun` la acepta; sin protagonista queda como hoy.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** `ReapingDraw`: el texto de la urna pasa a `"Los papeles de Ash, Oliva y Marin ya están adentro."`; al salir el nombre del protagonista, una línea propia (`"Ash. Cinco papeles."`).
- [ ] **Step 4:** Recorrido headless: tres días → Cosecha → el tributo seguido es el que salió.

### Task 7: El final

**Files:** Modify `components/panem/CapitolFinale.js`, `components/panem/PanemProvider.js`, `components/panem/Burning.js` (o donde se dispare el fuego), `lib/mapCopy.js`.

- [ ] **Step 1:** En el Capitolio, la elección del mensaje como hoy; si hay 4 fragmentos o más, antes del mensaje la transmisión pirata los muestra uno por uno (2,5 s cada uno, título y línea, salteable).
- [ ] **Step 2:** Al terminar la transmisión se dispara "If we burn" (ya no con el tercer emblema). Después, Panem encendido y la línea final: quién fue a la arena, con cuántos papeles, y cuántos fragmentos salieron al aire.
- [ ] **Step 3:** README: la historia nueva y el mapa de navegación.
- [ ] **Step 4:** `npm test`, lint, build; recorrido completo headless de punta a punta con capturas.
