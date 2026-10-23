# Motor de escenas por datos y pistas que se desbloquean · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una escena de distrito se arme solo con datos y que tenga las pistas nuevas (herramientas, marcas del sinsajo y pistas que guían) con cuatro interacciones (agarrar, abrir, mantener para descubrir, alumbrar), probadas en el Distrito 12.

**Architecture:** Las pistas son datos puros (`lib/clues.js`) y se guardan en la historia (`lib/story.js`, `panem-cosecha-v1`). Las estructuras que hoy están fijas en `locationScene.js` (vías, galpón, loma, postes, faroles, fuego, polvo, piso) pasan a constructores (`components/stage/locations/builders.js`) que la escena recorre desde los datos. Las interacciones viven en `components/stage/locations/interactables.js` (probadas en Node) y la interfaz las resuelve con el `PanemProvider`.

**Tech Stack:** Next 16, Three r186, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-23-escenas-de-los-distritos-design.md`

## Global Constraints

- No commitear ni pushear sin pedido de Mia. No matar su `next dev`; verificar con build y `next start -p 3002` y Chrome headless con GPU Metal (scratchpad `scene.mjs`).
- No borrar código de los juegos anteriores ni de Lola: se desconecta, no se borra.
- Textos claros, sin metáforas, sin dos puntos, sin "tesela"; cada línea de pista de menos de 110 caracteres.
- Sin glow fuerte; escena ≤ 25 MB; nada que trabe la historia (las herramientas siempre se pueden conseguir).
- La escena del 12 tiene que verse igual que hoy después de pasar a datos.

## Review Focus

1. Recargar después de agarrar el farol: la herramienta sigue en el archivo y el farol ya no está en el galpón.
2. Soltar antes de tiempo al mantener: el avance queda a medias y se puede seguir después; no se pierde nada.
3. Alumbrar sin tener el farol: no pasa nada y no hay pista de cómo seguir que trabe; el lugar oscuro se ve oscuro.
4. Una pista encontrada dos veces (recargar, volver) cuenta una sola vez.
5. Reiniciar todo borra herramientas, marcas y pistas junto con la historia.

---

### Task 1: Pistas en datos y en la historia

**Files:** Create `lib/clues.js`, `tests/clues.test.mjs`; Modify `lib/story.js`, `tests/story.test.mjs`.

**Interfaces:**
- Produces: `TOOLS` (3: `farol` del 12, `llave` del 6, `radio` del 3; `{ id, district, title, line }`), `MARKS` (9: `{ id, district, tool, title, line }`, tres por herramienta: farol → 2, 7, 3; llave → 1, 8, 10; radio → 5, 11, 13), `HINTS` (las del 12 ahora: `p-12-libreta`, `p-12-cartel`, `p-12-nicho`; `{ id, district, title, line }`), `MARK_TOTAL = 9`, `MARKS_FOR_VOICE = 6`, `clueById(id) -> { kind: 'fragment'|'tool'|'mark'|'hint', ...clue } | null` (incluye `FRAGMENTS` de `lib/fragments.js`).
- Produces (historia): `story.tools`, `story.marks`, `story.hints` (listas de ids); `takeTool(story, id)`, `findMark(story, id)`, `findHint(story, id)` (una sola vez); `normalizeStory` las valida contra los ids de `lib/clues.js` y descarta lo desconocido.

- [ ] **Step 1: Tests** — tres herramientas con esos ids y distritos; nueve marcas, tres por herramienta, cada `tool` existe; ids únicos entre todas las pistas; líneas < 110, sin dos puntos ni "tesela"; `clueById('farol').kind === 'tool'`, `clueById('12-viga').kind === 'fragment'`, `clueById('nada') === null`; en la historia, `takeTool` dos veces deja uno; `normalizeStory` con `tools: ['farol', 'inventada']` deja `['farol']`; una historia vieja sin esas listas queda con listas vacías.
- [ ] **Step 2:** `node --test tests/clues.test.mjs tests/story.test.mjs` → FAIL.
- [ ] **Step 3:** Implementar con los textos del spec (marcas) y estas pistas del 12: libreta de Ash ("Cada vez que Ash pidió comida hizo una raya. Su hermana menor ya tiene dos."), cartel ("Debajo del hollín, el cartel pide cuarenta toneladas de carbón por día."), nicho ("Alguien rayó un sinsajo y el número 6. En el 6 está la llave del depósito.").
- [ ] **Step 4:** Tests → PASS.

### Task 2: La escena se arma con datos

**Files:** Create `components/stage/locations/builders.js`; Modify `components/stage/locations/locationScene.js`, `lib/locations/district12.js`, `tests/location-d12.test.mjs`.

**Interfaces:**
- Produces (datos): `textures` (carpeta), `ground`, `street`, `structures` (`{ type: 'track'|'shed'|'hill'|'poles', ... }`), `lamps` (`{ position, color, intensity, size, flicker }`), `fires` (`{ position }`), `dust` (`{ count, box }`), además de lo que ya hay.
- Produces (`builders.js`): una función por `type` que recibe `(scene, def, ctx)` y devuelve `{ object, update?(dt, t) }`; `ctx` trae `textures` (cargador PBR), `halo`, `budget`, `state`.

- [ ] **Step 1: Test** — `DISTRICT12` declara `structures` con una vía `x` y una angosta `z`, el galpón, la loma y los postes; `lamps` con al menos 8 luces; `fires` con el tambor; `textures === '/models/d12/'`.
- [ ] **Step 2:** FAIL → mover el código fijo de `locationScene.js` a los constructores y a los datos del 12 → PASS.
- [ ] **Step 3:** Build y captura de los 5 lugares: tiene que verse igual que las capturas `v3-*` del scratchpad.

### Task 3: Interacciones (agarrar, abrir, mantener, alumbrar)

**Files:** Create `components/stage/locations/interactables.js`, `tests/interactables.test.mjs`.

**Interfaces:**
- Produces: `createInteractable(def, { onFound, onHoldProgress }) -> { id, kind, group, hit, spot, requires, update(dt, t, { lightFrom, lightDir }), tap(), holdStart(), holdEnd(), setDone(done), available(tools) }`.
  `def`: `{ id, kind: 'take'|'open'|'hold'|'light', spot, position, size, requires?, reveals: { tool | mark | hint | fragment } }`.
  - `take`: `tap()` llama `onFound(reveals)` una vez y el objeto se esconde.
  - `open`: `tap()` abre la tapa (animación) y al terminar llama `onFound` una vez.
  - `hold`: `holdStart()` + `update` acumula; a los 0,9 s llama `onFound`; `holdEnd()` antes deja el avance (no vuelve a cero); `onHoldProgress(0..1)`.
  - `light`: se ve (y se puede tocar) solo si el cono `lightFrom/lightDir` (30°, 6 m) lo alcanza; `tap()` sin luz no hace nada.
  - `available(tools)`: false si `requires` no está en `tools`.
- [ ] **Step 1: Tests** de cada tipo con esas reglas (Node, como `coal-seam`), incluidos Review Focus 2 y 3.
- [ ] **Step 2:** FAIL → implementar → PASS.

### Task 4: Las pistas en la escena y en la interfaz (Distrito 12)

**Files:** Modify `lib/locations/district12.js`, `components/stage/locations/locationScene.js`, `components/panem/LocationExperience.js`, `components/panem/PanemProvider.js`, `components/panem/FragmentCard.js`, `app/globals.css`.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (12): `interactables` — farol (`take`, galpón, la pieza `farol-minero` deja de estar), libreta (`open`, casa de Ash, una caja chica en los escalones), cartel (`hold`, entrada, cartel con hollín), nicho (`light`, túnel, requiere `farol`).
- Produces (provider): `takeTool(id)`, `findMark(id)`, `findHint(id)`; muestran la tarjeta (la misma de los fragmentos, con su tipo: "Herramienta", "Marca del sinsajo n/9", "Pista").
- Produces (escena): el farol, si se tiene, va con la cámara (luz cálida hacia donde se mira); `spot.requires` esconde un lugar hasta tener la herramienta.

- [ ] **Step 1:** Cablear: tocar → `tap`; mantener presionado → `holdStart/holdEnd` con una barra de avance en la interfaz; la luz del farol sigue la mirada.
- [ ] **Step 2:** Verificar en el navegador: agarrar el farol, recargar (Review Focus 1), abrir la libreta, limpiar el cartel soltando a mitad (2), el nicho sin farol y con farol (3), encontrar dos veces (4).

### Task 5: Archivo pirata y final

**Files:** Modify `components/panem/PirateArchive.js`, `lib/story.js` (`endingLines`), `tests/story.test.mjs`, `components/panem/PanemProvider.js` (reiniciar).

- [ ] **Step 1: Test** — `endingLines` con 6 marcas suma "La resistencia habló en la transmisión. Se encontraron 6 de 9 marcas del sinsajo."; con 5, no.
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** El archivo muestra las tres herramientas (o "???"), las marcas n/9 y las pistas encontradas. Reiniciar todo las borra (Review Focus 5).

### Task 6: Verificación y resumen

- [ ] `npm test`, lint, build; capturas del 12 con las cuatro interacciones; resumen para Mia con rulings y lo que falta.
