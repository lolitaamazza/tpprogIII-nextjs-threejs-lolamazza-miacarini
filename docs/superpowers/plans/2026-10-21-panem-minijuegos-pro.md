# Minijuegos "pro" (modelos, luz, vida y respuesta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los tres dioramas (Carbón, Pesca, Agricultura) se vean y respondan como un juego terminado, estilo Bad North / Bruno Simon, sin cambiar sus reglas.

**Architecture:** Los modelos de Kenney (CC0) se copian a `public/models/districts/` y los carga un módulo compartido con caché (`components/stage/dioramas/assets.js`), que en Node no hace nada para que los tests sigan corriendo sin red. Cada diorama mantiene su geometría de juego (cajas de toque, agua, veta) y suma la decoración y la figura animada cuando llegan los modelos. La luz de cada distrito (HDRI de Poly Haven, sol, niebla, paleta) sale de un módulo puro (`lib/dioramaLook.js`) y la escena la aplica mientras el diorama está activo; el tilt-shift es un pase de postproceso propio.

**Tech Stack:** Three.js r186 (`GLTFLoader`, `RGBELoader`, `PMREMGenerator`, `AnimationMixer`, `EffectComposer` ya usado en el archivo), `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-21-panem-interfaz-minima-design.md` (objetivo 6 y restricciones).

## Global Constraints

- No cambian las reglas (`lib/minigame.js`, `components/stage/dioramas/logic.js`) ni los tests de juego existentes (`tests/dioramas-build.test.mjs` sigue pasando sin modelos).
- Modelos solo de los packs aprobados: Kenney Nature Kit, Pirate Kit, Survival Kit, Mini Characters (CC0). HDRI: `kloofendal_48d_partly_cloudy_puresky` (día: 4 y 11) y `kiara_1_dawn` (amanecer: 12), reducidos a 512×256.
- Presupuesto por distrito ≤ 1,5 MB (modelos + texturas + HDRI); el mapa no carga nada nuevo.
- Créditos en `public/models/CREDITS.md` y en el README.
- Movimiento reducido: sin temblores ni golpes de cámara; las animaciones de la figura se mantienen suaves.
- Calidad baja (celular/`low`): sin tilt-shift ni sombras.
- No commitear ni pushear.

## Review Focus

1. Entrar a un distrito sin red o con un modelo que falla: el juego se juega igual con la geometría propia (test en Task 1).
2. Salir del distrito mientras cargan los modelos: no queda nada colgado en la escena ni se agrega tarde (test en Task 1).
3. Volver al mapa después de un diorama: la luz, la niebla y el entorno vuelven a los del mapa (test en Task 2).
4. Reintentar después de perder: la figura vuelve a su pose inicial y la decoración no se duplica (verificación en Tasks 3–5).
5. Celular: el diorama se ve entero con la figura y el HUD no la tapa (verificación en Task 6).

---

### Task 1: Modelos, entorno y cargador compartido

**Files:**
- Create: `public/models/districts/` (GLB + `Textures/colormap.png` de cada pack usado, HDRI `*.hdr` 512×256), `lib/dioramaAssets.js`, `components/stage/dioramas/assets.js`, `tests/diorama-assets.test.mjs`
- Modify: `public/models/CREDITS.md`

**Interfaces:**
- Produces: `DIORAMA_ASSETS` → `{ 12: { env: '/models/districts/dawn.hdr', models: { name: path } }, 4: {...}, 11: {...} }` y `assetBytes(id, sizes)` → total en bytes del distrito dado un mapa `path → bytes`.
- Produces: `loadKit(id)` → `Promise<{ models: Record<name, THREE.Object3D>, animations: Record<name, THREE.AnimationClip[]> } | null>` (null en Node o si falla); `instanceOf(kit, name)` → clon listo para agregar (con `SkeletonUtils.clone` si tiene huesos); `loadEnvironment(renderer, url)` → `Promise<THREE.Texture|null>` (PMREM, cacheado).

- [ ] **Step 1:** Copiar al proyecto solo las piezas elegidas (lista en `lib/dioramaAssets.js`), reducir los dos HDRI a 512×256 y comprobar con `RGBELoader` que se leen.
- [ ] **Step 2: Tests:** cada ruta de `DIORAMA_ASSETS` existe en `public/`; cada distrito suma ≤ 1,5 MB con `assetBytes`; `loadKit` devuelve `null` en Node sin tirar error (Review Focus 1).
- [ ] **Step 3:** Correr → FAIL. Implementar. Correr → PASS.
- [ ] **Step 4:** Créditos (Kenney, Poly Haven) en `public/models/CREDITS.md`.

### Task 2: La luz de cada distrito

**Files:**
- Create: `lib/dioramaLook.js`, `tests/diorama-look.test.mjs`, `components/stage/tiltShift.js`
- Modify: `components/stage/panemScene.js`

**Interfaces:**
- Produces: `dioramaLook(id)` → `{ env, envIntensity, sun: { color, intensity, position: [x,y,z] }, hemi: { sky, ground, intensity }, fog: string, exposure }` o `null` (mapa).
- Produces: `createTiltShift(width, height)` → pase de `EffectComposer` con `uniforms.focus` (franja nítida en el centro de la pantalla) y `setSize`.

- [ ] **Step 1: Tests:** los tres distritos jugables tienen look y el 13 o un distrito sin juego devuelven `null`; el 12 usa el HDRI de amanecer y los otros el de día; ningún valor es `NaN` (Review Focus 3: `null` = luz del mapa).
- [ ] **Step 2:** Correr → FAIL. Implementar. Correr → PASS.
- [ ] **Step 3:** En `panemScene`: al construir un diorama, cargar el entorno, aplicar `scene.environment`, color/posición del sol (con sombras solo en el área del diorama: cámara de sombra de ±1,6), hemisférica, niebla y exposición con un fundido de 0,8 s; al salir, volver a los valores guardados del mapa. Tilt-shift con el composer solo si la calidad no es baja y no hay movimiento reducido.
- [ ] **Step 4:** `npm test`, build, verificar en :3002 que el mapa recupera su luz al volver.

### Task 3: Distrito 12 · Carbón

**Files:** Modify `components/stage/dioramas/district12.js`

- [ ] **Step 1:** Decoración con el kit: cerro y boca de mina con piezas `cliff_*`, pinos `tree_pineTall*` detrás del alambrado (`fence_simple`), carretilla/barriles/cajas de Survival, linterna junto a la mina. La veta conserva su geometría de juego pero las capas pasan a rocas facetadas oscuras con brillo de carbón (`rock-*` teñidas).
- [ ] **Step 2:** Minero (`character-male-*`) al lado de la veta con `tool-pickaxe` en la mano derecha: `idle` en reposo, `attack-melee-right` en cada golpe, `emote-no` al errar, `emote-yes` al ganar.
- [ ] **Step 3:** Vida: humo de la mina (partículas lentas), polvo en el aire, luciérnagas/brasas. Respuesta: cada bloque que se rompe salta con un resorte y se encoge; la cámara hace un empujón corto en el acierto (no con movimiento reducido).
- [ ] **Step 4:** `node --test tests/dioramas-build.test.mjs` sigue en verde; verificar en :3002 (golpe, error, ganar, reintentar: la figura vuelve a `idle`).

### Task 4: Distrito 4 · Pesca

**Files:** Modify `components/stage/dioramas/district4.js`

- [ ] **Step 1:** Muelle `structure-platform-dock`, botes `boat-row-small/large` meciéndose, barriles y cajas, rocas de orilla `rocks-sand-*`, palmeras o arbustos en la arena.
- [ ] **Step 2:** Agua con shader propio: olas suaves en el vértice, color por profundidad, espuma en la orilla y alrededor de los botes, reflejo del entorno.
- [ ] **Step 3:** Pescador (`character-female-*`) en la punta del muelle: `idle`, `interact-right` al tirar, `emote-yes` al atrapar, `emote-no` al errar. Peces = `fish.glb` (el dorado teñido y más grande), con saltos ocasionales.
- [ ] **Step 4:** Respuesta: salpicadura con gotas y anillo, la red se hunde y sube con los peces; empujón de cámara al atrapar.
- [ ] **Step 5:** Tests de juego en verde; verificar en :3002.

### Task 5: Distrito 11 · Agricultura

**Files:** Modify `components/stage/dioramas/district11.js`

- [ ] **Step 1:** Trigo `crops_wheatStageB` sobre surcos `crops_dirtRow` (las cajas de toque se quedan), al cosechar pasa a `crops_wheatStageA`; huerto con `tree_oak`/`tree_default`; torres `tower-watch` en lugar de las torres de palitos, con el reflector saliendo de la cabina.
- [ ] **Step 2:** Viento: las espigas y las copas se mecen; polen flotando. Sinsajos: pájaros hechos con formas propias (cuerpo, alas que aletean, cola) en lugar de conos.
- [ ] **Step 3:** Cosechadora (`character-female-*`): `crouch`/`pick-up` al cosechar, `emote-no` cuando la ven, `emote-yes` al terminar el silbido; cuando la alumbran, la luz se pone roja y suena la alarma (como hoy).
- [ ] **Step 4:** Tests de juego en verde; verificar en :3002.

### Task 6: Cierre

- [ ] **Step 1:** README: sección de los minijuegos (modelos, luz y créditos).
- [ ] **Step 2:** `npm test`, `npx eslint .`, `npm run build`; capturas de los tres distritos en 1440×900 y 375×812 (Review Focus 5) y una partida de cada uno.
- [ ] **Step 3:** Avisar a Mia con las capturas (sin commit ni push).
