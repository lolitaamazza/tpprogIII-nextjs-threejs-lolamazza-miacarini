# Escena del Distrito 12 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una escena realista del Distrito 12, de noche, recorrida con cámara guiada en primera persona, con la viga escondida y el minijuego del carbón en el túnel, en la ruta de prueba `/escena/12`.

**Architecture:** Datos del lugar (`lib/locations/district12.js`) y cámara guiada (`lib/guidedCamera.js`) son módulos puros con tests. La escena tiene su propio renderer (`components/stage/locations/locationScene.js`), como la urna de la Cosecha: mientras está abierta, el escenario del mapa se tapa y deja de dibujar. La página `/escena/12` monta la escena y su interfaz (`components/panem/LocationExperience.js`) y usa el `PanemProvider` para fragmentos, partida, día y decisión de comida.

**Tech Stack:** Next 16 (App Router), Three r186 (GLTFLoader, HDRLoader, EffectComposer, BokehPass, ShaderPass), GSAP, `node --test`. Modelos optimizados con `npx @gltf-transform/cli@4.5.1`.

**Spec:** `docs/superpowers/specs/2026-10-23-escena-distrito-12-design.md`

## Global Constraints

- No commitear ni pushear (Mia commitea). No matar el `next dev` de Mia (:3000); verificar con `npm run build` (si frena por el aviso de seguridad de Next, correrlo otra vez) y `next start -p 3002` (preview "panem-prod").
- No descargar nada nuevo: solo `assets-src/d12/` (ya bajado) y `npx @gltf-transform/cli@4.5.1`.
- Textos claros, sin metáforas, sin dos puntos en la interfaz, sin la palabra "tesela".
- Sin glow fuerte: nada de UnrealBloom; las luces se ven por halos chicos y su luz en las superficies.
- Peso de la escena optimizada ≤ 25 MB (modelos + texturas + cielo de `public/models/d12/`).
- Altura de los ojos 1,6 m. Caminata entre 1,5 y 3 s. Mirar alrededor hasta 35° a los lados y 15° arriba o abajo.
- Desenfoque de fondo solo en escritorio (`renderBudget(...).low === false`) y sin movimiento reducido.
- El juego actual no cambia: el diorama del 12 sigue en `/distrito/12`.
- Créditos CC BY (autor + link) en `public/models/CREDITS.md` y en los créditos del final (`CapitolFinale`).

## Review Focus

1. Tocar otro lugar mientras la cámara camina: tiene que salir desde donde está (sin saltar) hacia el nuevo lugar.
2. Salir de `/escena/12` mientras carga o camina: nada queda dibujando, no hay errores, y el mapa vuelve a verse.
3. Cambiar el tamaño de la ventana o girar el celular: la imagen se ajusta (cámara, composer).
4. Sin WebGL o con un modelo que no carga: aviso claro y la flecha para volver; la página no queda en blanco.
5. Movimiento reducido: sin caminata ni balanceo; un fundido corto.

---

### Task 1: Datos del lugar y cámara guiada (puros)

**Files:**
- Create: `lib/locations/district12.js`, `lib/guidedCamera.js`
- Test: `tests/location-d12.test.mjs`, `tests/guided-camera.test.mjs`

**Interfaces:**
- Produces: `DISTRICT12 = { id: '12', title: '12 · Carbón', sky: { url, intensity, background }, fog: { color, density }, eye: 1.6, start: 'vias', spots: Spot[], pieces: Piece[], fragment: { id: '12-viga', spot: 'tunel', position: [x,y,z], radius }, seam: { spot: 'tunel', position: [x,y,z], width, height } }`.
  `Spot = { id, label, position: [x, 1.6, z], look: [x,y,z] }`. Ids y textos, en este orden:
  `vias` "Las vías", `galpon` "El galpón", `casa` "La casa de Ash", `entrada` "La entrada de la mina", `tunel` "El túnel".
  `Piece = { id, url, height, position: [x,y,z], rotationY }` (`height` en metros: se escala el modelo para que mida eso).
- Produces (`lib/guidedCamera.js`):
  `streetPoint(position) -> [0, y, z]` (la calle es el eje x = 0);
  `pathBetween(fromPosition, toSpot) -> number[][]` (desde donde está, a la calle, por la calle, al lugar; sin puntos repetidos);
  `walkDuration(path, { reducedMotion }) -> segundos` (0 con movimiento reducido; si no, `clamp(1.5 + largo/30, 1.5, 3)`);
  `poseAlong(path, fromTarget, toTarget, t) -> { position, target }` (avance con `easeInOutCubic` por largo de recorrido, balanceo vertical de 3,5 cm que se apaga al principio y al final, la mirada gira hacia el destino en el primer 60 %);
  `lookTarget(spot, yaw, pitch) -> [x,y,z]` y `clampLook(yaw, pitch) -> { yaw, pitch }` (±35° y ±15°, en radianes);
  `spotForKey(key, spots) -> id | null` ("1"–"5").

- [ ] **Step 1: Tests de datos** (`tests/location-d12.test.mjs`): cinco lugares con los ids y textos de arriba, en ese orden; todos a 1,6 m; `start` es un lugar; `fragment.id === '12-viga'` existe en `FRAGMENTS` (de `lib/fragments.js`) con `district '12'` y `fragment.spot === 'tunel'`; `seam.spot === 'tunel'`; ids de piezas únicos; ningún texto con dos puntos ni la palabra "tesela".
- [ ] **Step 2: Tests de cámara** (`tests/guided-camera.test.mjs`): `pathBetween` arranca en la posición actual y termina en el lugar, pasa por la calle (x = 0) y no repite puntos; desde un punto a mitad de camino también arranca ahí (Review Focus 1); `walkDuration` da 0 con movimiento reducido y siempre entre 1,5 y 3; `poseAlong(..., 0)` está en el inicio y `poseAlong(..., 1)` en el lugar con la mirada en `toTarget`; el balanceo a t = 0 y t = 1 es 0; `clampLook(1, 1)` devuelve 35° y 15° en radianes; `lookTarget(spot, 0, 0)` apunta a `spot.look`; `spotForKey('3')` es `'casa'`, `spotForKey('9')` es null.
- [ ] **Step 3:** Correr `node --test tests/location-d12.test.mjs tests/guided-camera.test.mjs`. Expected: FAIL (módulos inexistentes).
- [ ] **Step 4:** Implementar los dos módulos (posiciones aproximadas: vías z = 4, galpón al este z ≈ -6, casa de Ash al oeste z ≈ -12, entrada z ≈ -26 mirando a la boca en z ≈ -34, túnel z ≈ -48 mirando al frente de carbón; se ajustan a ojo en la Task 3).
- [ ] **Step 5:** Correr los tests. Expected: PASS. Sin commit (Mia commitea).

### Task 2: Modelos optimizados, peso y créditos

**Files:**
- Create: `public/models/d12/*` (optimizados), `scripts/optimize-d12.sh`
- Modify: `public/models/CREDITS.md`, `components/panem/CapitolFinale.js` (créditos)
- Test: `tests/location-assets.test.mjs`

**Interfaces:**
- Consumes: `DISTRICT12.pieces[].url`, `DISTRICT12.sky.url` (Task 1).
- Produces: archivos en `public/models/d12/`: `casa-ash.glb`, `casa-vecina.glb`, `boca-mina.glb`, `tunel.glb`, `farol-minero.glb` (de Sketchfab) y los ocho de Poly Haven ya optimizados, `satara_night_1k.hdr`, y las texturas del piso y la chapa (`burned_ground_01_*`, `brown_mud_02_*`, `corrugated_iron_*`, 1K jpg).

- [ ] **Step 1: Test** (`tests/location-assets.test.mjs`): cada `url` de las piezas y del cielo existe bajo `public/`; la suma de `public/models/d12/` es ≤ 25 MB.
- [ ] **Step 2:** Correr. Expected: FAIL (faltan los de Sketchfab).
- [ ] **Step 3:** `scripts/optimize-d12.sh`: `gltf-transform optimize <in> <out> --compress quantize --texture-compress webp --texture-size <N>` (2048 para `boca-mina`, 1024 para el resto); copia el HDRI 1K y las texturas 1K. Si los postes (6,3 MB) hacen pasar el límite, se reoptimizan con `--simplify` o se reemplazan por postes hechos con geometría (ruling en el ledger).
- [ ] **Step 4:** Correr el test. Expected: PASS.
- [ ] **Step 5:** Créditos de los cinco modelos CC BY (Miguel-Angel, watermelon256, Sengchor, DMC_RELAX, Portland Museum) con link en `CREDITS.md` y una línea en los créditos del final. Sin commit.

### Task 3: La escena en `/escena/12` (look, sin interacción todavía)

**Files:**
- Create: `components/stage/locations/locationScene.js`, `components/stage/locations/grade.js`, `components/panem/LocationExperience.js`, `app/(panem)/escena/[id]/page.js`
- Modify: `lib/routes.js` (+ `tests/routes.test.mjs`), `components/stage/panemScene.js` (tapar sin importar la escena)

**Interfaces:**
- Consumes: `DISTRICT12`, `loadEnvironment` (`components/stage/dioramas/assets.js`), `renderBudget` (`lib/renderBudget.js`).
- Produces: `routeFromPathname('/escena/12') -> { scene: 'escena', districtId: '12' }`.
- Produces: `createLocationScene(mount, data, { reducedMotion, onProgress(0..1), onReady(), onError(error) }) -> { setReducedMotion(v), resize(), dispose(), ...lo que agregan las Tasks 4 y 5 }`.

- [ ] **Step 1: Test de ruta:** `routeFromPathname('/escena/12')` da `{ scene: 'escena', districtId: '12' }`; `'/escena/99'` da el mapa. FAIL → implementar → PASS.
- [ ] **Step 2:** `panemScene`: `setGamesCovered(true)` deja de dibujar en cualquier escena (hoy solo en `games`).
- [ ] **Step 3:** `locationScene`: renderer propio (ACES, sRGB, exposición ≈ 0,9, sombras suaves en escritorio), cámara de 60° a 1,6 m en `start`, cielo `satara_night` como entorno (intensidad baja) y fondo oscurecido con desenfoque leve, niebla exponencial de polvo de carbón, luna fría con sombra, piso con `burned_ground_01` y calle con `brown_mud_02`, vías del tren con durmientes, galpón de chapa con pico, maza, cajón y farol, tambor con fuego (luz que titila + llamita + brasas), faroles con luz cálida y halo chico, postes, polvo en el aire, las cinco piezas de Sketchfab escaladas con `height`. Carga con progreso; `dispose` libera todo. Composer: `RenderPass` → `BokehPass` (solo escritorio) → `grade.js` (viñeta, grano, tono frío en sombras y cálido en luces) → `OutputPass`.
- [ ] **Step 4:** `LocationExperience` + página: tapa el escenario del mapa mientras está montada, muestra "Cargando el Distrito 12… n %", arriba la flecha para volver y "12 · Carbón"; sin WebGL o con error, un aviso y la flecha (Review Focus 4). `resize` al cambiar el tamaño (Review Focus 3).
- [ ] **Step 5:** `npm test`, `npm run lint`, build, `next start` en :3002 y captura headless de `/escena/12` en escritorio. Ajustar posiciones y luz a ojo (buscando la referencia de Mia, sin glow). Sin commit.

### Task 4: Lugares, caminar, mirar y la viga

**Files:**
- Modify: `components/stage/locations/locationScene.js`, `components/panem/LocationExperience.js`, `app/globals.css`, `lib/audio/AudioEngine.js` (sonido `crackle`)

**Interfaces:**
- Consumes: Task 1 (`pathBetween`, `walkDuration`, `poseAlong`, `lookTarget`, `clampLook`, `spotForKey`), `usePanem().handleFragment`, `story.fragments`.
- Produces (escena): `goTo(spotId)`, `setFound(ids)`, opciones `onSpot(spotId)` (al llegar) y `onFragment(id)`.

- [ ] **Step 1:** Caminar con `poseAlong`; tocar otro lugar a mitad de camino sale desde la pose actual (Review Focus 1). Con movimiento reducido, fundido de 0,4 s en la interfaz y salto de cámara (Review Focus 5).
- [ ] **Step 2:** Mirar alrededor arrastrando (mouse o dedo) con `clampLook`; un toque sin arrastrar en un lugar de la escena (zona invisible alrededor de su `look`) va hacia ahí; marcador sutil en los lugares que no son el actual.
- [ ] **Step 3:** La viga con nombres en `fragment.position` (madera con marcas talladas) y un brillo muy sutil; solo se puede tocar estando en `tunel`; llama a `handleFragment('12-viga')` y se apaga si ya está en `story.fragments`.
- [ ] **Step 4:** Interfaz: fila de lugares abajo (botones con el texto de cada lugar; el actual marcado), "Tocá un lugar para ir." solo al entrar, teclas 1–5, Esc al mapa. Crepitar del fuego (sfx `crackle`, ruido corto filtrado) de a ratos estando en `galpon`.
- [ ] **Step 5:** Verificar en el navegador: ir a cada lugar, cambiar de destino a mitad de camino, encontrar la viga solo desde el túnel. Sin commit.

### Task 5: El minijuego del carbón en el túnel

**Files:**
- Create: `components/stage/locations/coalSeam.js`
- Modify: `components/stage/locations/locationScene.js`, `components/panem/LocationExperience.js`, `components/panem/DistrictHud.js` (exportar `Score`, `Lives`, `DecisionCard`)

**Interfaces:**
- Consumes: `COAL`, `coalRound`, `inCrack`, `sweep` (`components/stage/dioramas/logic.js`), `createMatch`, `resolve`, `retry`, `helpLevel` (`lib/minigame.js`), `districtHud` (`lib/districtHud.js`), `usePanem()` (`handleMatch`, `handleComplete`, `decideTesserae`, `showBulletin`, `replayDay`, `story`, `day`, `practice`, `progress`).
- Produces: `createCoalSeam({ position, width, height, playable, onMatch, onComplete, sfx }) -> { group, update(dt), performAction(), retry(), getState(), setPlayable(v), dispose() }` (mismas reglas que el diorama: seis bloques en tres capas, la luz recorre la veta, picar en la grieta suma, fuera de la grieta gasta una vida del canario).

- [ ] **Step 1: Test** (`tests/coal-seam.test.mjs`, en Node como `dioramas-build`): con `playable: true`, acertar seis veces gana y llama `onComplete` una sola vez; tres errores pierden; `retry` vuelve a empezar; con `playable: false` no hay partida ni jugadas.
- [ ] **Step 2:** FAIL → implementar `coalSeam.js` (bloques de carbón en el frente del túnel, la luz que barre, la grieta) → PASS.
- [ ] **Step 3:** En el túnel, la interfaz muestra el avance, el canario y "Picar" (barra espaciadora o tocar el frente) cuando es el día de Ash o se eligió "Jugar de nuevo"; al ganar, `handleComplete('12', { perfect })` y la pregunta de pedir comida (`DecisionCard`), después la tele y el mapa, igual que en `/distrito/12`.
- [ ] **Step 4:** `npm test`, lint, build y verificación en el navegador del día 1 completo desde `/escena/12`. Sin commit.

### Task 6: Verificación y resumen para Mia

- [ ] **Step 1:** Capturas en escritorio y celular (claro/oscuro no aplica: la escena es de noche) de cada lugar, la viga y el minijuego; los cinco puntos de Review Focus.
- [ ] **Step 2:** `resumen-para-mia.md` en `.superpowers/sdd/2026-10-23-escena-distrito-12/`: qué se hizo, capturas, qué falta, decisiones (rulings). Sin commit.
