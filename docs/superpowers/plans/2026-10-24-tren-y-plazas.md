# El tren y las plazas de la Cosecha · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ir a un distrito desde el mapa es un viaje corto en tren hasta su escena; la Cosecha es el tren pasando por las plazas del 12, el 11 y el 4, sacando un papel en cada una, y después siguen los Juegos.

**Architecture:** El tren y la plaza son escenas del mismo motor (`createLocationScene` con datos en `lib/locations/train.js` y `plaza.js`). Lo que sale en cada plaza es puro (`lib/plazas.js`, a partir de la edición de los Juegos de Lola: `run.protagonist`). Las páginas nuevas son `/tren/[id]` y `/plazas`; la urna de 24 papeles de Lola (`/cosecha`) queda en el código y en el botón de los Juegos.

**Spec:** `docs/superpowers/specs/2026-10-23-escenas-de-los-distritos-design.md` (El tren y la Cosecha)

## Global Constraints

- No commitear sin pedido de Mia; no matar su `next dev`; verificar con build, `next start -p 3002` y Chrome headless.
- No borrar código de Lola ni de los dioramas: `/cosecha`, `ReapingDraw` y los dioramas quedan.
- Textos claros, sin dos puntos ni "tesela". Sin glow fuerte. Cada escena ≤ 25 MB.
- El viaje dura de 4 a 6 s y se puede saltear; con movimiento reducido es un fundido.

## Review Focus

1. Recargar en medio de las plazas no cambia quién sale (la edición ya existe y tiene su `protagonist`).
2. Entrar a `/plazas` antes de terminar los tres días vuelve al mapa.
3. Saltear el tren lleva al mismo lugar que esperarlo.
4. Con movimiento reducido no hay movimiento de cámara ni paisaje que pasa.
5. Terminar las plazas lleva a la preparación de los Juegos siguiendo a quien salió.

---

### Task 1: Quién sale en cada plaza
`lib/plazas.js`: `PLAZA_ORDER = ['12', '11', '4']`, `plazaDraws(run, papers) -> [{ district, name, protagonist: bool, line }]` (el distrito de `run.protagonist` saca a su protagonista con `papersLine`; los otros, `ALTERNATES`), `TRAIN_SECONDS = 5`. Tests.

### Task 2: Rutas y entradas
`/tren/12|11|4` → `{ scene: 'tren' }`, `/plazas` → `{ scene: 'plazas' }`. El mapa manda a `/tren/<id>` los distritos con escena; "Ir a la plaza" va a `/plazas`. Tests de rutas y del texto del mapa.

### Task 3: El tren
Datos `lib/locations/train.js` (el vagón, sentado junto a la ventana), constructor `passing` (postes y lomas que pasan; quietos con movimiento reducido), `TrainRide` (componente) y la página `/tren/[id]`: al terminar o saltear, `router.replace('/escena/<id>')`.

### Task 4: La plaza
Datos `lib/locations/plaza.js` (Edificio de Justicia, escenario, columnas, micrófono, urna, carteles del Capitolio, gente en silueta, adoquines) y `PlazaJourney` en `/plazas`: tren → plaza del 12 → sacar el papel → nombre → tren → 11 → tren → 4 → "Ir a los Juegos" (`start` si no hay edición, `skipReaping`, `/cosecha`).

### Task 5: Verificación
`npm test`, lint, build, capturas del tren y de las tres plazas; recargar a mitad; créditos.
