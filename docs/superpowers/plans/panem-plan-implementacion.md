# Panem · La chispa — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la experiencia "Ecos de la arena" por un mapa 3D interactivo de Panem donde la persona enciende los distritos 12, 11 y 4 mediante dioramas jugables, suma capas de música procedural y desbloquea un final en el Capitolio con una decisión persistida.

**Architecture:** Un canvas Three.js y un motor de audio Web Audio viven en `app/(panem)/layout.js` (los layouts de Next 16 no se re-renderizan al navegar), así que persisten entre rutas. Las páginas (`/`, `/mapa`, `/distrito/[id]`, `/capitolio`) son Server Components que validan, generan metadata y renderizan overlays HTML. Un `PanemProvider` (client) conecta la ruta, el progreso (Firebase/localStorage), el audio y la escena. La lógica pura (datos, progreso, rutas, poses de cámara, música, reglas de los dioramas) está separada en módulos sin dependencias del navegador y se prueba con `node --test`.

**Tech Stack:** Next.js 16.4 (App Router, JavaScript), React 19.2, Three.js 0.186 (directo, sin R3F), Firebase 12 (Auth + Firestore), Web Audio API, `node:test`, Python 3.9 + OpenCV (solo como herramienta para extraer el mapa).

**Spec:** `docs/superpowers/specs/2026-10-13-panem-la-chispa-design.md`

## Global Constraints

- Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de usar una API de Next que no aparezca en este plan (AGENTS.md: "This is NOT the Next.js you know").
- JavaScript (no TypeScript). Alias `@/*` → raíz del proyecto (`jsconfig.json`).
- Three.js directo. No instalar React Three Fiber, GSAP, Tone.js ni otras librerías de runtime.
- Módulos probados con `node --test` (`data/`, `lib/progress.js`, `lib/routes.js`, `lib/audio/music.js`, `components/stage/cameraPoses.js`, `components/stage/dioramas/logic.js`): **solo imports relativos con extensión `.js`**, nunca `@/`, y sin `three` ni APIs del navegador.
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))`.
- Todo recurso Three.js con `dispose()` se libera al desmontar o al salir de un diorama.
- Textos de interfaz en español rioplatense (vos). Sin citas extensas de los libros ni de las películas. El motivo de 4 notas es original: `[74, 77, 72, 69]` (MIDI).
- Distritos jugables: exactamente `['12', '11', '4']`. Capas: `12 → percusion`, `11 → silbido`, `4 → pad`.
- Mensajes finales: `'rebelion'` | `'memoria'`.
- Clave de localStorage del progreso: `panem-chispa-v1`. Preferencia de sonido: `panem-sound` (`'on'` | `'off'`).
- Documento Firestore: `progress/{uid}` con `{ userId, authProvider, litDistricts, visited, finalMessage, completedAt, updatedAt }`. `completedAt` es un número entero (ms) o `null`.
- Cada tarea termina con `npm run lint`, `npm test` (desde la Tarea 1) y, desde la Tarea 6, `npm run build`, todos sin errores.
- Entrega: jueves 2026-10-22.

## Review Focus

1. **Progreso viejo o adulterado** en localStorage/Firestore (formato `clues` de la versión anterior, `litDistricts: ['7']`, `finalMessage` sin los 3 emblemas): debe normalizarse a un estado válido sin romper. Lo prueba la Tarea 3 (`tests/progress.test.mjs`).
2. **Entrar directo a `/capitolio` o recargar `/distrito/12`** antes de que el progreso termine de cargar: no debe redirigir por error ni perder el diorama. Lo cubren la guarda `progress.ready` de la Tarea 11 y la checklist de la Tarea 12.
3. **React Strict Mode y la navegación rápida** duplican canvases, loops o dioramas. Debe haber un único `<canvas>` y el uso de memoria no debe crecer. Lo cubre la Tarea 12 con `window.__panemInfo()`.
4. **Touch:** en celular la cosecha (11) y la red (4) tienen que funcionar con el dedo, sin que la página haga scroll. Lo cubren `touch-action: none` en la Tarea 6 y la checklist de la Tarea 12.
5. **Rutas inválidas** (`/distrito/99`, `/distrito/c`, `/distrito/abc`): deben dar 404. Lo prueba la Tarea 6 (`tests/routes.test.mjs` + build).

---

## Mapa de archivos

```
app/
  layout.js                         MODIFICAR  fuentes, metadata global
  globals.css                       REEMPLAZAR estilos nuevos
  error.js, not-found.js, loading.js MODIFICAR textos
  page.js                           BORRAR (lo reemplaza (panem)/page.js)
  archivo/                          BORRAR
  (panem)/
    layout.js                       CREAR  Provider + Stage + Header
    page.js                         CREAR  "/" intro
    mapa/page.js                    CREAR  "/mapa"
    distrito/[id]/page.js           CREAR  "/distrito/:id"
    capitolio/page.js               CREAR  "/capitolio"
components/
  AuthPanel.js                      CONSERVAR
  panem/
    PanemProvider.js                CREAR  contexto: ruta, progreso, audio, escena
    PanemStage.js                   CREAR  wrapper React del canvas
    SiteHeader.js                   CREAR
    EmblemsDialog.js                CREAR
    IntroScreen.js                  CREAR
    MapHud.js                       CREAR
    DistrictDial.js                 CREAR
    DistrictPanel.js                CREAR
    CapitolFinale.js                CREAR
  stage/
    panemScene.js                   CREAR  renderer, loop, puntero, API imperativa
    mapMesh.js                      CREAR  SVG → piezas extruidas
    cameraPoses.js                  CREAR  (puro) poses + easing
    cameraRig.js                    CREAR  transiciones de cámara
    effects.js                      CREAR  partículas de chispa
    dioramas/
      index.js                      CREAR
      common.js                     CREAR
      logic.js                      CREAR  (puro)
      district12.js, district11.js, district4.js  CREAR
  (resto de componentes viejos)     BORRAR
data/
  districts.js                      CREAR
  chapters.js                       BORRAR
hooks/useProgress.js                REESCRIBIR
lib/
  firebase.js                       CONSERVAR
  progress.js                       CREAR (puro)
  routes.js                         CREAR (puro)
  audio/music.js                    CREAR (puro)
  audio/AudioEngine.js              CREAR
scripts/extract_map.py              CREAR  herramienta de extracción
public/assets/panem.svg             GENERAR
public/assets/seals/{id}.png        GENERAR (14)
docs/reference/panem-map.webp       YA EXISTE (imagen de referencia 1000×744)
tests/*.test.mjs                    CREAR
firestore.rules                     MODIFICAR
README.md                           REESCRIBIR
```

---

### Task 1: Base de tests y datos de los distritos

**Files:**
- Modify: `package.json` (script `test`)
- Create: `data/districts.js`
- Test: `tests/districts.test.mjs`

**Interfaces:**
- Produces: `DISTRICTS` (array de 14 objetos), `PLAYABLE_IDS = ['12','11','4']`, `DISTRICT_ROUTE_IDS = ['1'..'13']`, `MAP_IDS = [...DISTRICT_ROUTE_IDS, 'c']`, `getDistrict(id) → district | null`, `isDistrictRouteId(id) → boolean`.
- Forma de cada distrito: `{ id, number, name, industry, color, litColor, quote, playable, classified, layer?, instruction?, actionLabel?, actionsToComplete? }`.

- [ ] **Step 1: Agregar el script de tests**

En `package.json`, dentro de `"scripts"`, agregar `"test": "node --test tests/"`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --test tests/"
  },
```

- [ ] **Step 2: Escribir el test que falla**

`tests/districts.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISTRICTS, PLAYABLE_IDS, DISTRICT_ROUTE_IDS, MAP_IDS, getDistrict, isDistrictRouteId,
} from '../data/districts.js';

test('hay 14 piezas con ids únicos (1–13 y c)', () => {
  assert.equal(DISTRICTS.length, 14);
  assert.deepEqual(DISTRICTS.map((d) => d.id).sort(), [...MAP_IDS].sort());
  assert.equal(new Set(DISTRICTS.map((d) => d.id)).size, 14);
});

test('los jugables son exactamente 12, 11 y 4, con capa y acción', () => {
  assert.deepEqual(PLAYABLE_IDS, ['12', '11', '4']);
  assert.deepEqual(DISTRICTS.filter((d) => d.playable).map((d) => d.id).sort(), ['11', '12', '4']);
  const layers = { 12: 'percusion', 11: 'silbido', 4: 'pad' };
  for (const id of PLAYABLE_IDS) {
    const d = getDistrict(id);
    assert.equal(d.layer, layers[id]);
    assert.ok(d.instruction.length > 10);
    assert.ok(d.actionLabel.length > 2);
    assert.ok(Number.isInteger(d.actionsToComplete) && d.actionsToComplete > 0);
  }
});

test('colores en hex de 6 dígitos', () => {
  for (const d of DISTRICTS) {
    assert.match(d.color, /^#[0-9a-f]{6}$/i, d.id);
    assert.match(d.litColor, /^#[0-9a-f]{6}$/i, d.id);
  }
});

test('rutas de distrito: 1–13, nunca c', () => {
  assert.equal(DISTRICT_ROUTE_IDS.length, 13);
  assert.ok(isDistrictRouteId('12'));
  assert.ok(isDistrictRouteId(13));
  assert.ok(!isDistrictRouteId('c'));
  assert.ok(!isDistrictRouteId('99'));
  assert.ok(!isDistrictRouteId(undefined));
  assert.equal(getDistrict('nope'), null);
  assert.equal(getDistrict('13').classified, true);
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../data/districts.js'`.

- [ ] **Step 4: Implementar `data/districts.js`**

```js
// Datos de las 14 piezas del mapa (13 distritos + Capitolio).
// Sin imports con alias: este módulo también se prueba con `node --test`.

export const PLAYABLE_IDS = ['12', '11', '4'];

export const DISTRICTS = [
  { id: '1', number: '1', name: 'Distrito 1', industry: 'Lujo', color: '#5b5e64', litColor: '#ecdca8',
    quote: 'Las joyas que brillan en el Capitolio se pulen acá, a mano, de noche.' },
  { id: '2', number: '2', name: 'Distrito 2', industry: 'Mampostería', color: '#6b3a2a', litColor: '#e8875f',
    quote: 'La piedra de estas montañas sostiene los muros del Capitolio. También los cuarteles de los Agentes de la Paz.' },
  { id: '3', number: '3', name: 'Distrito 3', industry: 'Tecnología', color: '#2f3e39', litColor: '#7fe0c4',
    quote: 'Cada cable que sale de acá sabe escuchar. Algunos aprendieron a interrumpir.' },
  { id: '4', number: '4', name: 'Distrito 4', industry: 'Pesca', color: '#5e6b78', litColor: '#6fc3ff',
    quote: 'El mar no le pertenece al Capitolio. Solo lo que sale de él en las redes.',
    playable: true, layer: 'pad', actionsToComplete: 3, actionLabel: 'Lanzar red',
    instruction: 'Mantené presionado sobre el agua, apuntá y soltá para lanzar la red. Atrapá tres peces.' },
  { id: '5', number: '5', name: 'Distrito 5', industry: 'Energía', color: '#6b6a45', litColor: '#e8e46c',
    quote: 'Las turbinas no descansan. Cuando se detienen, Panem entero se queda a oscuras.' },
  { id: '6', number: '6', name: 'Distrito 6', industry: 'Transporte', color: '#4b4b53', litColor: '#b9b9ff',
    quote: 'Los trenes llevan tributos al Capitolio. Los mecánicos conocen las vías que nadie vigila.' },
  { id: '7', number: '7', name: 'Distrito 7', industry: 'Madera', color: '#6c6c6c', litColor: '#8fd18a',
    quote: 'Entre los anillos de un tronco caben estaciones enteras de silencio.' },
  { id: '8', number: '8', name: 'Distrito 8', industry: 'Textiles', color: '#56595f', litColor: '#f29ad1',
    quote: 'Una costura puede esconder un mensaje. Un uniforme también puede ser una bandera.' },
  { id: '9', number: '9', name: 'Distrito 9', industry: 'Cereales', color: '#6e5233', litColor: '#f2c46b',
    quote: 'El pan del Capitolio empieza en estos silos.' },
  { id: '10', number: '10', name: 'Distrito 10', industry: 'Ganadería', color: '#4a2520', litColor: '#ff8a6b',
    quote: 'Los corrales están cercados. Los que los cuidan, también.' },
  { id: '11', number: '11', name: 'Distrito 11', industry: 'Agricultura', color: '#4b443a', litColor: '#ffd36b',
    quote: 'En los huertos, un silbido avisa que termina la jornada. Los sinsajos lo aprenden enseguida.',
    playable: true, layer: 'silbido', actionsToComplete: 4, actionLabel: 'Cosechar',
    instruction: 'Pasá el puntero (o el dedo) sobre las espigas para cosecharlas.' },
  { id: '12', number: '12', name: 'Distrito 12', industry: 'Carbón', color: '#5b5049', litColor: '#ff7a2f',
    quote: 'Bajo el polvo del carbón siempre queda una brasa.',
    playable: true, layer: 'percusion', actionsToComplete: 8, actionLabel: 'Picar',
    instruction: 'Hacé clic sobre la veta de carbón hasta liberar la brasa.' },
  { id: '13', number: '13', name: 'Distrito 13', industry: 'Clasificado', color: '#6d6d6d', litColor: '#ffffff',
    quote: 'Según el Capitolio, acá no queda nada. Entonces, ¿quién sigue transmitiendo?', classified: true },
  { id: 'c', number: 'C', name: 'El Capitolio', industry: 'Gobierno', color: '#6a6a6a', litColor: '#ff3b3b',
    quote: 'Desde acá se transmite todo lo que Panem tiene permitido ver.' },
].map((d) => ({ playable: false, classified: false, ...d }));

export const DISTRICT_ROUTE_IDS = Array.from({ length: 13 }, (_, i) => String(i + 1));
export const MAP_IDS = [...DISTRICT_ROUTE_IDS, 'c'];

export function getDistrict(id) {
  return DISTRICTS.find((d) => d.id === String(id)) ?? null;
}

export function isDistrictRouteId(id) {
  return id !== undefined && id !== null && DISTRICT_ROUTE_IDS.includes(String(id));
}
```

Nota: `actionsToComplete` es la cantidad de pulsaciones del botón alternativo para completar el distrito (12: 8 golpes; 11: 24 espigas / 6 por pulsación = 4; 4: 3 peces).

- [ ] **Step 5: Correr y ver que pasa**

Run: `npm test`
Expected: PASS, 4 tests. Si Node avisa `MODULE_TYPELESS_PACKAGE_JSON`, es solo un aviso de rendimiento: no se agrega `"type": "module"` porque cambiaría cómo Next interpreta otros archivos.

- [ ] **Step 6: Commit**

```bash
git add package.json data/districts.js tests/districts.test.mjs
git commit -m "feat: datos de los distritos de Panem y base de tests"
```

---

### Task 2: Mapa vectorial y sellos extraídos de la referencia

**Files:**
- Create: `scripts/extract_map.py`
- Create (generados): `public/assets/panem.svg`, `public/assets/seals/{1..13,c}.png`, `docs/reference/panem-map-debug.png`
- Modify: `.gitignore`
- Test: `tests/map-assets.test.mjs`

**Interfaces:**
- Consumes: `MAP_IDS` (Task 1).
- Produces: `public/assets/panem.svg` con `viewBox="0 0 1000 744"` y un `<path id="district-{id}">` por pieza (ids `1`..`13`, `c`). **El id del path es el contrato** (Figma conserva ids de capa al exportar; no conserva atributos `data-*`). Sellos: PNG RGBA blancos sobre transparente, 128×128, en `public/assets/seals/{id}.png`.

- [ ] **Step 1: Escribir el test que falla**

`tests/map-assets.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { MAP_IDS } from '../data/districts.js';

const svg = existsSync('public/assets/panem.svg') ? readFileSync('public/assets/panem.svg', 'utf8') : '';

test('panem.svg tiene viewBox 1000x744', () => {
  assert.match(svg, /viewBox="0 0 1000 744"/);
});

test('panem.svg tiene un path por pieza con id district-{id}', () => {
  for (const id of MAP_IDS) {
    const re = new RegExp(`<path[^>]*id="district-${id}"[^>]*\\sd="M[^"]{20,}"`);
    assert.match(svg, re, `falta district-${id}`);
  }
});

test('hay un sello PNG por pieza', () => {
  for (const id of MAP_IDS) assert.ok(existsSync(`public/assets/seals/${id}.png`), `falta sello ${id}`);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL en los 3 tests de `map-assets`.

- [ ] **Step 3: Preparar el entorno de la herramienta**

En `.gitignore`, agregar al final:

```
# herramientas locales
/.venv-tools/
```

Run:

```bash
python3 -m venv .venv-tools && .venv-tools/bin/pip install --quiet "numpy==1.26.4" "opencv-python-headless==4.10.0.84"
```

Expected: termina sin errores. `.venv-tools/bin/python -c "import cv2; print(cv2.__version__)"` imprime `4.10.0`.

- [ ] **Step 4: Escribir `scripts/extract_map.py`**

```python
#!/usr/bin/env python3
"""Extrae las piezas del mapa de referencia de Panem.

Genera:
  public/assets/panem.svg           un <path id="district-{id}"> por pieza
  public/assets/seals/{id}.png      sello blanco sobre transparente (128x128)
  docs/reference/panem-map-debug.png  superposición para revisar el resultado

Uso: .venv-tools/bin/python scripts/extract_map.py
Cada región se obtiene con un flood fill desde un punto semilla dentro de la
pieza. Si una pieza sale mal, mover su semilla en SEEDS y volver a correr.
"""
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/reference/panem-map.webp"
OUT_SVG = ROOT / "public/assets/panem.svg"
OUT_SEALS = ROOT / "public/assets/seals"
OUT_DEBUG = ROOT / "docs/reference/panem-map-debug.png"

# Punto (x, y) dentro del relleno de cada pieza, lejos de íconos y etiquetas.
SEEDS = {
    "7": (330, 80), "1": (200, 175), "4": (95, 300), "c": (250, 262),
    "9": (470, 100), "3": (565, 175), "6": (615, 60), "13": (800, 185),
    "12": (760, 385), "8": (470, 352), "11": (650, 440), "2": (385, 405),
    "5": (205, 475), "10": (360, 650),
}
# Centro (x, y) del ícono circular de cada pieza.
ICONS = {
    "7": (225, 40), "1": (300, 148), "4": (50, 220), "c": (275, 240),
    "9": (430, 235), "3": (565, 262), "6": (650, 140), "13": (828, 75),
    "12": (718, 320), "8": (575, 357), "11": (512, 445), "2": (320, 350),
    "5": (165, 405), "10": (320, 535),
}
ICON_R = 30
TOLERANCE = 18
MIN_AREA, MAX_AREA = 1500, 140000


def region_mask(img, seed):
    h, w = img.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8)
    tol = (TOLERANCE,) * 3
    cv2.floodFill(img.copy(), mask, seed, (0, 0, 0), tol, tol, flags)
    region = mask[1:-1, 1:-1]
    # Cierra los agujeros que dejan íconos y etiquetas dentro de la pieza.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(region)
    cv2.drawContours(filled, contours, -1, 255, cv2.FILLED)
    return filled


def mask_to_path(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contour = max(contours, key=cv2.contourArea)
    poly = cv2.approxPolyDP(contour, 1.2, True).reshape(-1, 2)
    points = " L ".join(f"{x} {y}" for x, y in poly)
    return f"M {points} Z", contour


def extract_seal(img, center):
    x, y = center
    r = ICON_R
    crop = img[max(0, y - r):y + r, max(0, x - r):x + r]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    alpha = np.clip((gray.astype(np.int16) - 120) * 3, 0, 255).astype(np.uint8)
    circle = np.zeros_like(alpha)
    cv2.circle(circle, (crop.shape[1] // 2, crop.shape[0] // 2), r - 1, 255, cv2.FILLED)
    alpha = cv2.bitwise_and(alpha, circle)
    white = np.full(crop.shape[:2], 255, np.uint8)
    rgba = cv2.merge([white, white, white, alpha])
    return cv2.resize(rgba, (128, 128), interpolation=cv2.INTER_AREA)


def main():
    img = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"No se pudo leer {SRC}")
    h, w = img.shape[:2]
    debug = img.copy()
    paths, problems = [], []
    for district_id, seed in SEEDS.items():
        mask = region_mask(img, seed)
        area = int(cv2.countNonZero(mask))
        if not MIN_AREA <= area <= MAX_AREA:
            problems.append(f"district-{district_id}: área {area} fuera de rango, revisar semilla {seed}")
        d, contour = mask_to_path(mask)
        mean = cv2.mean(img, mask=mask)
        fill = "#{:02x}{:02x}{:02x}".format(int(mean[2]), int(mean[1]), int(mean[0]))
        paths.append(f'  <path id="district-{district_id}" fill="{fill}" d="{d}"/>')
        hue = (hash(district_id) % 180, 200, 255)
        color = cv2.cvtColor(np.uint8([[hue]]), cv2.COLOR_HSV2BGR)[0][0].tolist()
        cv2.drawContours(debug, [contour], -1, color, 2)
        cv2.circle(debug, seed, 5, (0, 0, 255), cv2.FILLED)
        cv2.putText(debug, district_id, (seed[0] + 6, seed[1] - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    for district_id, center in ICONS.items():
        cv2.circle(debug, center, ICON_R, (0, 255, 255), 1)
    OUT_SVG.parent.mkdir(parents=True, exist_ok=True)
    OUT_SVG.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
        + "\n".join(paths) + "\n</svg>\n",
        encoding="utf-8",
    )
    OUT_SEALS.mkdir(parents=True, exist_ok=True)
    for district_id, center in ICONS.items():
        cv2.imwrite(str(OUT_SEALS / f"{district_id}.png"), extract_seal(img, center))
    cv2.imwrite(str(OUT_DEBUG), debug)
    print(f"OK: {len(paths)} piezas → {OUT_SVG.relative_to(ROOT)}")
    for p in problems:
        print("AVISO:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 5: Correr la extracción**

Run: `.venv-tools/bin/python scripts/extract_map.py`
Expected: `OK: 14 piezas → public/assets/panem.svg` y ningún `AVISO`.

- [ ] **Step 6: Revisar visualmente y corregir semillas**

Abrir `docs/reference/panem-map-debug.png` (con la herramienta Read). Verificar que:
- cada contorno de color abarca toda su pieza y nada más;
- los círculos amarillos rodean los íconos.

Si una pieza se derrama hacia el fondo, queda chica o un círculo no está centrado en su ícono, ajustar `SEEDS`/`ICONS` y volver al Step 5. Abrir también 2 o 3 sellos (`public/assets/seals/12.png`, `c.png`, `4.png`) para confirmar que se ve el ícono blanco.

- [ ] **Step 7: Correr los tests**

Run: `npm test`
Expected: PASS (7 tests en total).

- [ ] **Step 8: Commit**

```bash
git add .gitignore scripts/extract_map.py public/assets/panem.svg public/assets/seals docs/reference/panem-map-debug.png tests/map-assets.test.mjs
git commit -m "feat: extraer el mapa de Panem a SVG y los sellos de los distritos"
```

- [ ] **Step 9: Avisar al equipo para el ajuste en Figma (no bloquea las tareas siguientes)**

Escribirle al equipo:

> `public/assets/panem.svg` está listo. Para ajustarlo en Figma:
> 1. Arrastrar el archivo a un frame de Figma.
> 2. Editar los nodos si hace falta. Los bordes cortados del 7, 6, 13 y 10 se pueden redondear como costa.
> 3. **No renombrar las capas** `district-*`.
> 4. Exportar el frame como SVG con la opción **"Include 'id' attribute"** activada.
> 5. Reemplazar `public/assets/panem.svg` y correr `npm test`.

---

### Task 3: Progreso, persistencia y reglas de Firestore

**Files:**
- Create: `lib/progress.js`
- Rewrite: `hooks/useProgress.js`
- Modify: `firestore.rules`
- Test: `tests/progress.test.mjs`

**Interfaces:**
- Consumes: `PLAYABLE_IDS`, `DISTRICT_ROUTE_IDS` (Task 1).
- Produces (`lib/progress.js`): `FINAL_MESSAGES`, `EMPTY_PROGRESS`, `normalizeProgress(value)`, `mergeProgress(a, b)`, `canEnterCapitol(progress)`, `withLitDistrict(p, id)`, `withVisited(p, id)`, `withFinalMessage(p, message, now)`, `sameProgress(a, b)`.
- Produces (`useProgress()`): `{ litDistricts, visited, finalMessage, completedAt, ready, storageOK, syncState: 'local'|'connecting'|'cloud', authUser, authError, authLoading, firebaseConfigured, lightDistrict(id), markVisited(id), chooseFinalMessage(message), reset(), signInWithGoogle(), submitEmail({email,password,mode}), continueAsGuest() }`.

- [ ] **Step 1: Escribir el test que falla**

`tests/progress.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_PROGRESS, normalizeProgress, mergeProgress, canEnterCapitol,
  withLitDistrict, withVisited, withFinalMessage, sameProgress,
} from '../lib/progress.js';

const full = { litDistricts: ['12', '11', '4'], visited: [], finalMessage: null, completedAt: null };

test('valores vacíos o inválidos → progreso vacío', () => {
  for (const v of [null, undefined, 'x', 42, []]) assert.deepEqual(normalizeProgress(v), EMPTY_PROGRESS);
});

test('el formato viejo (clues/ending) no rompe y queda vacío', () => {
  assert.deepEqual(normalizeProgress({ clues: ['forest', 'lake'], ending: 'truth', started: true }), EMPTY_PROGRESS);
});

test('filtra ids no jugables, duplicados y ordena', () => {
  const p = normalizeProgress({ litDistricts: ['4', '7', '12', '12', 4], visited: ['13', 'c', '99', '13', '2'] });
  assert.deepEqual(p.litDistricts, ['12', '4']);
  assert.deepEqual(p.visited, ['13', '2']);
});

test('no acepta mensaje final sin los 3 emblemas', () => {
  const p = normalizeProgress({ litDistricts: ['12'], finalMessage: 'rebelion', completedAt: 5 });
  assert.equal(p.finalMessage, null);
  assert.equal(p.completedAt, null);
});

test('mensaje final válido con los 3 emblemas', () => {
  const p = normalizeProgress({ ...full, finalMessage: 'memoria', completedAt: 1729000000000.7 });
  assert.equal(p.finalMessage, 'memoria');
  assert.equal(p.completedAt, 1729000000000);
  assert.equal(normalizeProgress({ ...full, finalMessage: 'hackear' }).finalMessage, null);
  assert.equal(normalizeProgress({ ...full, finalMessage: 'rebelion' }).completedAt, 0);
});

test('canEnterCapitol', () => {
  assert.equal(canEnterCapitol(EMPTY_PROGRESS), false);
  assert.equal(canEnterCapitol({ litDistricts: ['12', '11'] }), false);
  assert.equal(canEnterCapitol(full), true);
});

test('merge une local y remoto', () => {
  const merged = mergeProgress(
    { litDistricts: ['12'], visited: ['7'], finalMessage: null, completedAt: null },
    { litDistricts: ['11', '4'], visited: ['13'], finalMessage: 'rebelion', completedAt: 10 },
  );
  assert.deepEqual(merged, { litDistricts: ['12', '11', '4'], visited: ['7', '13'], finalMessage: 'rebelion', completedAt: 10 });
});

test('transiciones', () => {
  const a = withLitDistrict(EMPTY_PROGRESS, '12');
  assert.deepEqual(a.litDistricts, ['12']);
  assert.equal(withLitDistrict(a, '12'), a, 'sin cambios devuelve el mismo objeto');
  assert.deepEqual(withVisited(a, '7').visited, ['7']);
  assert.equal(withFinalMessage(a, 'rebelion', 1), a, 'sin emblemas no hay final');
  const done = withFinalMessage(full, 'rebelion', 99);
  assert.equal(done.finalMessage, 'rebelion');
  assert.equal(done.completedAt, 99);
  assert.equal(withFinalMessage(done, 'memoria', 100), done, 'la elección es definitiva');
  assert.ok(sameProgress(done, { ...done }));
  assert.ok(!sameProgress(done, full));
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../lib/progress.js'`.

- [ ] **Step 3: Implementar `lib/progress.js`**

```js
// Reglas puras del progreso. Sin imports con alias: se prueba con `node --test`.
import { PLAYABLE_IDS, DISTRICT_ROUTE_IDS } from '../data/districts.js';

export const FINAL_MESSAGES = ['rebelion', 'memoria'];
export const EMPTY_PROGRESS = Object.freeze({ litDistricts: [], visited: [], finalMessage: null, completedAt: null });

function cleanIds(list, allowed) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(String).filter((id) => allowed.includes(id)))];
}

export function canEnterCapitol(progress) {
  return PLAYABLE_IDS.every((id) => progress?.litDistricts?.includes(id));
}

export function normalizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_PROGRESS, litDistricts: [], visited: [] };
  const lit = cleanIds(value.litDistricts, PLAYABLE_IDS);
  const litDistricts = PLAYABLE_IDS.filter((id) => lit.includes(id));
  const visited = cleanIds(value.visited, DISTRICT_ROUTE_IDS);
  const finalMessage = canEnterCapitol({ litDistricts }) && FINAL_MESSAGES.includes(value.finalMessage)
    ? value.finalMessage : null;
  let completedAt = null;
  if (finalMessage) completedAt = Number.isFinite(value.completedAt) ? Math.trunc(value.completedAt) : 0;
  return { litDistricts, visited, finalMessage, completedAt };
}

export function mergeProgress(a, b) {
  return normalizeProgress({
    litDistricts: [...(a?.litDistricts ?? []), ...(b?.litDistricts ?? [])],
    visited: [...(a?.visited ?? []), ...(b?.visited ?? [])],
    finalMessage: a?.finalMessage || b?.finalMessage || null,
    completedAt: a?.completedAt ?? b?.completedAt ?? null,
  });
}

export function sameProgress(a, b) {
  return JSON.stringify(normalizeProgress(a)) === JSON.stringify(normalizeProgress(b));
}

function changed(previous, next) {
  return sameProgress(previous, next) ? previous : next;
}

export function withLitDistrict(progress, id) {
  return changed(progress, normalizeProgress({ ...progress, litDistricts: [...progress.litDistricts, String(id)] }));
}

export function withVisited(progress, id) {
  return changed(progress, normalizeProgress({ ...progress, visited: [...progress.visited, String(id)] }));
}

export function withFinalMessage(progress, message, now) {
  if (progress.finalMessage || !canEnterCapitol(progress) || !FINAL_MESSAGES.includes(message)) return progress;
  return normalizeProgress({ ...progress, finalMessage: message, completedAt: now });
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Reescribir `hooks/useProgress.js`**

Conserva la estructura de Lola (auth anónima/Google/email, fallback local, indicador de sincronización) y cambia el modelo:

```js
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices, hasFirebaseConfig } from '@/lib/firebase';
import {
  EMPTY_PROGRESS, mergeProgress, normalizeProgress, withFinalMessage, withLitDistrict, withVisited,
} from '@/lib/progress';

const KEY = 'panem-chispa-v1';

function readLocal() {
  try { return normalizeProgress(JSON.parse(window.localStorage.getItem(KEY) || 'null')); }
  catch { return normalizeProgress(null); }
}
function saveLocal(progress) {
  try { window.localStorage.setItem(KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}
function getProvider(user) { return user.isAnonymous ? 'anonymous' : user.providerData[0]?.providerId || 'password'; }
async function saveProfile(user, db) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const profile = {
    userId: user.uid, email: user.email || null, displayName: user.displayName || null,
    photoURL: user.photoURL || null, isAnonymous: user.isAnonymous,
    authProvider: getProvider(user), lastLoginAt: serverTimestamp(),
  };
  if (!snapshot.exists()) profile.createdAt = serverTimestamp();
  await setDoc(userRef, profile, { merge: true });
}
function remotePayload(user, progress) {
  return { userId: user.uid, authProvider: getProvider(user), ...progress, updatedAt: serverTimestamp() };
}

export function useProgress() {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const progressRef = useRef(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  const [storageOK, setStorageOK] = useState(true);
  const [syncState, setSyncState] = useState('local');
  const [authUser, setAuthUser] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const remoteUserRef = useRef(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const update = useCallback((recipe) => {
    const next = recipe(progressRef.current);
    if (next === progressRef.current) return;
    progressRef.current = next;
    setProgress(next);
    setStorageOK(saveLocal(next));
  }, []);

  useEffect(() => {
    const local = readLocal();
    progressRef.current = local;
    // La lectura local se hace en un efecto para evitar diferencias entre SSR e hidratación.
    const timeout = window.setTimeout(() => { setProgress(local); setReady(true); }, 0);
    if (!hasFirebaseConfig) return () => clearTimeout(timeout);
    const { auth, db } = getFirebaseServices();
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        remoteUserRef.current = null;
        setRemoteUser(null);
        setAuthUser(null);
        setSyncState('connecting');
        try { await signInAnonymously(auth); }
        catch (error) { if (active) { setAuthError(error.code || 'auth/anonymous-sign-in-failed'); setSyncState('local'); } }
        return;
      }
      try {
        setSyncState('connecting');
        await saveProfile(user, db);
        const snapshot = await getDoc(doc(db, 'progress', user.uid));
        if (!active) return;
        const merged = mergeProgress(progressRef.current, snapshot.exists() ? snapshot.data() : null);
        progressRef.current = merged;
        setProgress(merged);
        setStorageOK(saveLocal(merged));
        remoteUserRef.current = user;
        setRemoteUser(user);
        setAuthUser(user);
        setAuthError('');
        setSyncState('cloud');
      } catch (error) {
        console.warn('No se pudo sincronizar el avance:', error);
        if (active) { setAuthUser(user); setSyncState('local'); setAuthError(error.code || 'firestore/sync-failed'); }
      }
    });
    return () => { active = false; clearTimeout(timeout); unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!ready || !remoteUser) return;
    const { db } = getFirebaseServices();
    setDoc(doc(db, 'progress', remoteUser.uid), remotePayload(remoteUser, progress), { merge: true })
      .catch((error) => { console.warn('Firestore no disponible:', error); setSyncState('local'); });
  }, [progress, ready, remoteUser]);

  const lightDistrict = useCallback((id) => update((p) => withLitDistrict(p, id)), [update]);
  const markVisited = useCallback((id) => update((p) => withVisited(p, id)), [update]);
  const chooseFinalMessage = useCallback((message) => update((p) => withFinalMessage(p, message, Date.now())), [update]);
  const reset = useCallback(async () => {
    update(() => normalizeProgress(null));
    const user = remoteUserRef.current;
    if (user && hasFirebaseConfig) {
      const { db } = getFirebaseServices();
      await setDoc(doc(db, 'progress', user.uid), remotePayload(user, normalizeProgress(null)), { merge: true });
    }
  }, [update]);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true); setAuthError('');
    try { await signInWithPopup(getFirebaseServices().auth, new GoogleAuthProvider()); }
    catch (error) { setAuthError(error.code || 'auth/google-sign-in-failed'); throw error; }
    finally { setAuthLoading(false); }
  }, []);
  const submitEmail = useCallback(async ({ email, password, mode }) => {
    setAuthLoading(true); setAuthError('');
    try {
      const fn = mode === 'signup' ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      await fn(getFirebaseServices().auth, email, password);
    } catch (error) { setAuthError(error.code || 'auth/email-sign-in-failed'); throw error; }
    finally { setAuthLoading(false); }
  }, []);
  const continueAsGuest = useCallback(async () => {
    setAuthLoading(true); setAuthError('');
    try { await signOut(getFirebaseServices().auth); }
    catch (error) { setAuthError(error.code || 'auth/sign-out-failed'); throw error; }
    finally { setAuthLoading(false); }
  }, []);

  return {
    ...progress, ready, storageOK, syncState, authUser, authError, authLoading,
    firebaseConfigured: hasFirebaseConfig, lightDistrict, markVisited, chooseFinalMessage, reset,
    signInWithGoogle, submitEmail, continueAsGuest,
  };
}
```

- [ ] **Step 6: Actualizar `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function validProgress(d) {
      return d.userId == request.auth.uid
        && d.litDistricts is list && d.litDistricts.size() <= 3
        && d.litDistricts.hasOnly(['12', '11', '4'])
        && d.visited is list && d.visited.size() <= 13
        && (d.finalMessage == null || d.finalMessage in ['rebelion', 'memoria'])
        && (d.completedAt == null || d.completedAt is int);
    }

    match /progress/{userId} {
      allow read, delete: if request.auth != null
        && request.auth.uid == userId;

      allow create, update: if request.auth != null
        && request.auth.uid == userId
        && validProgress(request.resource.data);
    }

    match /users/{userId} {
      allow read: if request.auth != null
        && request.auth.uid == userId;

      allow create, update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

- [ ] **Step 7: Lint y tests**

Run: `npm run lint && npm test`
Expected: lint sin errores en `hooks/useProgress.js` y `lib/progress.js`. Los componentes viejos todavía importan `discover`/`clues`; esos archivos se borran en la Tarea 6 y no se tocan ahora. Si `lint` falla solo por esos archivos viejos, registrarlo y seguir. Los tests pasan.

- [ ] **Step 8: Commit**

```bash
git add lib/progress.js hooks/useProgress.js firestore.rules tests/progress.test.mjs
git commit -m "feat: modelo de progreso de La chispa con persistencia local y Firestore"
```

---

### Task 4: Motor de audio procedural

**Files:**
- Create: `lib/audio/music.js` (puro)
- Create: `lib/audio/AudioEngine.js`
- Test: `tests/music.test.mjs`

**Interfaces:**
- Produces (`music.js`): `BPM = 80`, `STEPS_PER_BAR = 16`, `BARS = 4`, `STEP_SECONDS`, `CHORDS`, `MOTIF = [74, 77, 72, 69]`, `LAYER_BY_DISTRICT = { '12': 'percusion', '11': 'silbido', '4': 'pad' }`, `midiToHz(midi)`, `eventsForStep(step, finale) → Array<{layer, type, ...}>`, `layerTargets({ lit, previewDistrict, finale }) → { percusion, silbido, pad }`.
- Produces (`AudioEngine`): `new AudioEngine()`, `await start()` (lanza `Error('web-audio-unsupported')` si no hay soporte), `setMuted(bool)`, `setDucked(bool)`, `setLayerState({ lit, previewDistrict, finale })`, `playSfx(name)` con `name ∈ 'click'|'tick'|'glitch'|'pick'|'ignite'|'harvest'|'whistle'|'throw'|'splash'`, `dispose()`.

- [ ] **Step 1: Escribir el test que falla**

`tests/music.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP_SECONDS, MOTIF, midiToHz, eventsForStep, layerTargets } from '../lib/audio/music.js';

test('tempo: 80 BPM en semicorcheas', () => {
  assert.equal(STEP_SECONDS, 60 / 80 / 4);
});

test('midiToHz', () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Math.abs(midiToHz(81) - 880) < 1e-9);
});

test('el motivo es original de 4 notas', () => {
  assert.deepEqual(MOTIF, [74, 77, 72, 69]);
});

test('eventos del compás', () => {
  const step0 = eventsForStep(0, null);
  assert.ok(step0.some((e) => e.layer === 'percusion' && e.type === 'kick'));
  assert.ok(step0.some((e) => e.layer === 'pad' && e.type === 'chord' && e.notes.length === 3));
  assert.ok(!step0.some((e) => e.layer === 'silbido'), 'el silbido suena en compases impares');
  const whistle = [0, 4, 8, 12].map((s) => eventsForStep(16 + s, null).find((e) => e.layer === 'silbido'));
  assert.deepEqual(whistle.map((e) => e.midi), MOTIF);
  assert.ok(eventsForStep(2, 'rebelion').some((e) => e.type === 'kick'), 'rebelión agrega golpes');
  assert.ok(!eventsForStep(2, null).some((e) => e.type === 'kick'));
  assert.equal(eventsForStep(16, 'memoria').find((e) => e.layer === 'silbido').length, 0.7);
});

test('volúmenes por capa', () => {
  assert.deepEqual(layerTargets({ lit: [] }), { percusion: 0, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ lit: ['12'] }), { percusion: 1, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ lit: ['12'], previewDistrict: '4' }), { percusion: 1, silbido: 0, pad: 0.25 });
  assert.deepEqual(layerTargets({ lit: ['12'], previewDistrict: '12' }), { percusion: 1, silbido: 0, pad: 0 });
  assert.deepEqual(layerTargets({ lit: ['12', '11', '4'], finale: 'memoria' }), { percusion: 0, silbido: 1, pad: 1 });
  assert.deepEqual(layerTargets({ lit: [], finale: 'rebelion' }), { percusion: 1, silbido: 1, pad: 1 });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../lib/audio/music.js'`.

- [ ] **Step 3: Implementar `lib/audio/music.js`**

```js
// Partitura procedural de La chispa. Puro: se prueba con `node --test`.
export const BPM = 80;
export const STEPS_PER_BAR = 16;
export const BARS = 4;
export const STEP_SECONDS = 60 / BPM / 4;
// Re menor: Dm – Bb – F – C (MIDI)
export const CHORDS = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];
// Motivo original de 4 notas (no es la melodía de las películas).
export const MOTIF = [74, 77, 72, 69];
export const LAYER_BY_DISTRICT = { 12: 'percusion', 11: 'silbido', 4: 'pad' };

export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function eventsForStep(step, finale = null) {
  const bar = Math.floor(step / STEPS_PER_BAR) % BARS;
  const s = step % STEPS_PER_BAR;
  const events = [];
  const kicks = finale === 'rebelion' ? [0, 2, 6, 8, 10, 14] : [0, 6, 8, 14];
  if (kicks.includes(s)) events.push({ layer: 'percusion', type: 'kick' });
  if (s === 4 || s === 12) events.push({ layer: 'percusion', type: 'hit' });
  if (s === 0) {
    const notes = finale === 'rebelion' && bar === BARS - 1 ? [50, 54, 57] : CHORDS[bar];
    events.push({ layer: 'pad', type: 'chord', notes, seconds: STEP_SECONDS * STEPS_PER_BAR });
  }
  if (bar % 2 === 1 && s % 4 === 0) {
    events.push({ layer: 'silbido', type: 'note', midi: MOTIF[s / 4], length: finale === 'memoria' ? 0.7 : 0.35 });
  }
  return events;
}

export function layerTargets({ lit = [], previewDistrict = null, finale = null } = {}) {
  const targets = { percusion: 0, silbido: 0, pad: 0 };
  if (finale) return { percusion: finale === 'memoria' ? 0 : 1, silbido: 1, pad: 1 };
  for (const id of lit) if (LAYER_BY_DISTRICT[id]) targets[LAYER_BY_DISTRICT[id]] = 1;
  const preview = LAYER_BY_DISTRICT[previewDistrict];
  if (preview && !lit.includes(previewDistrict)) targets[preview] = 0.25;
  return targets;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implementar `lib/audio/AudioEngine.js`**

```js
// Motor de audio: ambiente generado + 3 capas sincronizadas por un único reloj
// + efectos sintetizados. Se crea solo después de un gesto de la persona usuaria.
import { MOTIF, STEP_SECONDS, eventsForStep, layerTargets, midiToHz } from './music.js';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const MASTER_LEVEL = 0.8;

export class AudioEngine {
  ctx = null;
  timer = null;
  step = 0;
  nextTime = 0;
  finale = null;

  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) throw new Error('web-audio-unsupported');
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_LEVEL;
    this.master.connect(ctx.destination);
    this.noise = this.createNoiseBuffer(2);
    this.layers = {};
    for (const name of ['percusion', 'silbido', 'pad']) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.master);
      this.layers[name] = gain;
    }
    // Eco del silbido
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = STEP_SECONDS * 2;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(this.layers.silbido);
    this.ambient = this.createAmbient();
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
    await ctx.resume();
  }

  createNoiseBuffer(seconds, brown = false) {
    const { ctx } = this;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; }
      else data[i] = white;
    }
    return buffer;
  }

  createAmbient() {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.master);
    // Viento: ruido marrón filtrado con un LFO lento
    const wind = ctx.createBufferSource();
    wind.buffer = this.createNoiseBuffer(4, true);
    wind.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 260;
    lfo.connect(lfoDepth).connect(filter.frequency);
    const windLevel = ctx.createGain();
    windLevel.gain.value = 0.22;
    wind.connect(filter).connect(windLevel).connect(gain);
    // Drone grave
    const drone = ctx.createOscillator();
    drone.frequency.value = 73.42;
    const droneLevel = ctx.createGain();
    droneLevel.gain.value = 0.035;
    drone.connect(droneLevel).connect(gain);
    wind.start(); lfo.start(); drone.start();
    return { gain, sources: [wind, lfo, drone] };
  }

  schedule() {
    const { ctx } = this;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      for (const event of eventsForStep(this.step, this.finale)) this.play(event, this.nextTime);
      this.nextTime += STEP_SECONDS;
      this.step += 1;
    }
  }

  envelope(param, at, peak, attack, release) {
    param.setValueAtTime(0.0001, at);
    param.exponentialRampToValueAtTime(peak, at + attack);
    param.exponentialRampToValueAtTime(0.0001, at + attack + release);
  }

  kick(at, out, peak = 0.9) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(110, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.25);
    this.envelope(gain.gain, at, peak, 0.005, 0.3);
    osc.connect(gain).connect(out);
    osc.start(at); osc.stop(at + 0.4);
  }

  noiseHit(at, out, { type = 'bandpass', freq = 1800, peak = 0.3, length = 0.12, sweepTo = null } = {}) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, at);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + length);
    const gain = ctx.createGain();
    this.envelope(gain.gain, at, peak, 0.005, length);
    src.connect(filter).connect(gain).connect(out);
    src.start(at); src.stop(at + length + 0.05);
  }

  whistleNote(at, midi, length, out, peak = 0.32) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.frequency.value = midiToHz(midi);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = 6;
    vibrato.connect(depth).connect(osc.frequency);
    const gain = ctx.createGain();
    this.envelope(gain.gain, at, peak, 0.04, length);
    osc.connect(gain);
    gain.connect(out);
    gain.connect(this.echo);
    osc.start(at); vibrato.start(at);
    osc.stop(at + length + 0.1); vibrato.stop(at + length + 0.1);
  }

  chord(at, notes, seconds, out) {
    const { ctx } = this;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.8);
    gain.gain.setValueAtTime(0.12, at + seconds - 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    filter.connect(gain).connect(out);
    for (const midi of notes) {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiToHz(midi);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(at); osc.stop(at + seconds + 0.05);
      }
    }
  }

  play(event, at) {
    const out = this.layers[event.layer];
    if (event.type === 'kick') this.kick(at, out);
    else if (event.type === 'hit') this.noiseHit(at, out, { freq: 1800, peak: 0.25, length: 0.12 });
    else if (event.type === 'note') this.whistleNote(at, event.midi, event.length, out);
    else if (event.type === 'chord') this.chord(at, event.notes, event.seconds, out);
  }

  setLayerState({ lit = [], previewDistrict = null, finale = null }) {
    if (!this.ctx) return;
    this.finale = finale;
    const targets = layerTargets({ lit, previewDistrict, finale });
    const now = this.ctx.currentTime;
    for (const [name, value] of Object.entries(targets)) this.layers[name].gain.setTargetAtTime(value, now, 1.2);
  }

  setDucked(ducked) {
    if (!this.ctx) return;
    this.ambient.gain.gain.setTargetAtTime(ducked ? 0.45 : 1, this.ctx.currentTime, 0.6);
  }

  setMuted(muted) {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.1);
  }

  playSfx(name) {
    if (!this.ctx) return;
    const at = this.ctx.currentTime + 0.01;
    const out = this.master;
    const ctx = this.ctx;
    switch (name) {
      case 'click': this.whistleNote(at, 93, 0.05, out, 0.12); break;
      case 'tick': this.noiseHit(at, out, { type: 'highpass', freq: 5000, peak: 0.05, length: 0.03 }); break;
      case 'pick':
        this.noiseHit(at, out, { type: 'highpass', freq: 1200, peak: 0.35, length: 0.1 });
        this.kick(at, out, 0.5);
        break;
      case 'harvest': this.noiseHit(at, out, { freq: 4200, peak: 0.12, length: 0.08 }); break;
      case 'throw': this.noiseHit(at, out, { freq: 600, peak: 0.12, length: 0.4, sweepTo: 2400 }); break;
      case 'splash': this.noiseHit(at, out, { type: 'lowpass', freq: 2200, peak: 0.4, length: 0.5, sweepTo: 300 }); break;
      case 'ignite': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(220, at);
        osc.frequency.exponentialRampToValueAtTime(880, at + 0.6);
        this.envelope(gain.gain, at, 0.2, 0.05, 0.6);
        osc.connect(gain).connect(out);
        osc.start(at); osc.stop(at + 0.7);
        this.noiseHit(at, out, { freq: 3000, peak: 0.1, length: 0.5 });
        break;
      }
      case 'glitch':
        for (let i = 0; i < 8; i++) {
          const t = at + i * 0.035;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 80 + Math.random() * 1600;
          this.envelope(gain.gain, t, 0.06, 0.002, 0.03);
          osc.connect(gain).connect(out);
          osc.start(t); osc.stop(t + 0.04);
        }
        break;
      case 'whistle':
        // El motivo, y los sinsajos que lo repiten una octava arriba.
        [0, 1.7, 3.1].forEach((offset, round) => {
          MOTIF.forEach((midi, i) => {
            this.whistleNote(at + offset + i * 0.3, midi + (round ? 12 : 0), 0.28, out, round ? 0.12 : 0.3);
          });
        });
        break;
      default: break;
    }
  }

  dispose() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
```

- [ ] **Step 6: Lint y tests**

Run: `npm run lint -- lib/audio && npm test`
Expected: sin errores; tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/audio tests/music.test.mjs
git commit -m "feat: motor de audio procedural con capas por distrito"
```

---

### Task 5: Núcleo de la escena 3D (mapa, cámara, chispas)

**Files:**
- Create: `components/stage/cameraPoses.js` (puro), `components/stage/cameraRig.js`, `components/stage/mapMesh.js`, `components/stage/effects.js`, `components/stage/dioramas/index.js`, `components/stage/panemScene.js`
- Test: `tests/camera.test.mjs`

**Interfaces:**
- Consumes: `getDistrict`, `MAP_IDS` (Task 1); `public/assets/panem.svg` y `public/assets/seals/*.png` (Task 2).
- Produces (`cameraPoses.js`): `easeInOutCubic(t)`, `lerpPose(a, b, t)`, `poseFor(route, centers, aspect) → { position: [x,y,z], target: [x,y,z] }`. `route = { scene: 'intro'|'mapa'|'distrito'|'capitolio'|'finale', districtId }`.
- Produces (`mapMesh.js`): constantes `MAP_SCALE = 0.012`, `DEPTH = 0.25`, `LIFT_HOVER = 0.12`, `LIFT_FOCUS = 0.35`; `loadPanemMap(url) → Promise<{ group, meshes, centers: Record<id,{x,z}>, update(dt, elapsed, { hoveredId, focusId, lit: string[], finaleLit: Set }), dispose() }>`.
- Produces (`cameraRig.js`): `createCameraRig(camera) → { goTo(pose, seconds), shake(amount), setReducedMotion(bool), update(dt) }`.
- Produces (`effects.js`): `createSparks(scene) → { emit(from:{x,z}, to:{x,z}), update(dt), dispose() }`.
- Produces (`dioramas/index.js`): `DIORAMAS: Record<id, build>`, vacío en esta tarea. Contrato de cada `build` (lo implementan las Tareas 8–10): `build({ origin: {x,z}, completed: boolean, onProgress(value0to1), onComplete(), sfx: { play(name) }, rig }) → { group, update(dt, elapsed), pointerDown(raycaster), pointerMove(raycaster) → boolean, pointerUp(raycaster), performAction(), dispose() }`.
- Produces (`panemScene.js`): `createPanemScene(mount, { onHover(id|null), onSelect(id), onProgress(id, value), onComplete(id), sfx, onError(error) }) → { setRoute(route), setLit(ids), setHovered(id|null), setReducedMotion(bool), performAction(), playFinale(onDone), cancelFinale(), getInfo(), dispose() }`. Lanza una excepción si no hay WebGL.

- [ ] **Step 1: Escribir el test que falla**

`tests/camera.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easeInOutCubic, lerpPose, poseFor } from '../components/stage/cameraPoses.js';

const centers = { 12: { x: 2, z: 1 }, c: { x: -1, z: -0.5 } };

test('easing', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

test('lerpPose interpola posición y objetivo', () => {
  const a = { position: [0, 0, 0], target: [0, 0, 0] };
  const b = { position: [2, 4, 6], target: [1, 1, 1] };
  assert.deepEqual(lerpPose(a, b, 0.5), { position: [1, 2, 3], target: [0.5, 0.5, 0.5] });
});

test('poses por escena', () => {
  assert.deepEqual(poseFor({ scene: 'intro' }, centers, 1.6), { position: [0, 24, 3], target: [0, 0, 0] });
  const map = poseFor({ scene: 'mapa' }, centers, 1.6);
  assert.deepEqual(map.target, [0, 0, 0.6]);
  const d12 = poseFor({ scene: 'distrito', districtId: '12' }, centers, 1.6);
  assert.deepEqual(d12.target, [2, 0.3, 1]);
  assert.deepEqual(poseFor({ scene: 'capitolio', districtId: 'c' }, centers, 1.6).target, [-1, 0.3, -0.5]);
});

test('pantallas angostas alejan la cámara', () => {
  const wide = poseFor({ scene: 'mapa' }, centers, 1.6);
  const narrow = poseFor({ scene: 'mapa' }, centers, 0.5);
  assert.ok(narrow.position[1] > wide.position[1]);
});

test('sin centro conocido cae en la pose del mapa', () => {
  assert.deepEqual(poseFor({ scene: 'distrito', districtId: '7' }, {}, 1.6), poseFor({ scene: 'mapa' }, {}, 1.6));
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../components/stage/cameraPoses.js'`.

- [ ] **Step 3: Implementar `components/stage/cameraPoses.js`**

```js
// Poses de cámara por escena. Puro: se prueba con `node --test`.
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function lerpPose(a, b, t) {
  const mix = (from, to) => from.map((v, i) => v + (to[i] - v) * t);
  return { position: mix(a.position, b.position), target: mix(a.target, b.target) };
}

export function poseFor(route, centers, aspect) {
  const far = aspect < 0.8 ? 1.7 : 1;
  const scene = route?.scene;
  if (scene === 'intro') return { position: [0, 24, 3], target: [0, 0, 0] };
  if (scene === 'finale') return { position: [0, 12 * far, 8.5 * far], target: [0, 0, 0.3] };
  const id = scene === 'capitolio' ? 'c' : scene === 'distrito' ? route.districtId : null;
  const c = id ? centers?.[id] : null;
  if (c && scene === 'distrito') return { position: [c.x, 3.4 * far, c.z + 3 * far], target: [c.x, 0.3, c.z] };
  if (c && scene === 'capitolio') return { position: [c.x, 5.5 * far, c.z + 5 * far], target: [c.x, 0.3, c.z] };
  return { position: [0, 10.5 * far, 7 * far], target: [0, 0, 0.6] };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implementar `components/stage/cameraRig.js`**

```js
import * as THREE from 'three';
import { easeInOutCubic, lerpPose } from './cameraPoses.js';

export function createCameraRig(camera) {
  const lookAt = new THREE.Vector3();
  let current = { position: [0, 24, 3], target: [0, 0, 0] };
  let from = current;
  let to = null;
  let t = 1;
  let duration = 1;
  let shakeAmount = 0;
  let reducedMotion = false;

  function apply() {
    camera.position.set(...current.position);
    if (shakeAmount > 0) {
      camera.position.x += (Math.random() - 0.5) * shakeAmount;
      camera.position.y += (Math.random() - 0.5) * shakeAmount;
    }
    lookAt.set(...current.target);
    camera.lookAt(lookAt);
  }

  return {
    goTo(pose, seconds = 1.6) {
      if (seconds <= 0) { current = pose; to = null; apply(); return; }
      from = current; to = pose; t = 0; duration = reducedMotion ? Math.min(seconds, 0.4) : seconds;
    },
    shake(amount) { if (!reducedMotion) shakeAmount = Math.max(shakeAmount, amount); },
    setReducedMotion(value) { reducedMotion = value; if (value) shakeAmount = 0; },
    update(dt) {
      if (to) {
        t = Math.min(1, t + dt / duration);
        current = lerpPose(from, to, easeInOutCubic(t));
        if (t >= 1) to = null;
      }
      shakeAmount = Math.max(0, shakeAmount - dt * 0.6);
      apply();
    },
  };
}
```

- [ ] **Step 6: Implementar `components/stage/mapMesh.js`**

```js
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { getDistrict } from '../../data/districts.js';

export const MAP_SCALE = 0.012;
export const DEPTH = 0.25;
export const LIFT_HOVER = 0.12;
export const LIFT_FOCUS = 0.35;
const SVG_W = 1000;
const SVG_H = 744;

// Convierte coordenadas SVG (y hacia abajo) al plano del mapa centrado.
// Invertir y cambia el sentido de giro; ExtrudeGeometry lo corrige solo.
function toMapShape(shape) {
  const convert = (points) => points.map((p) => new THREE.Vector2((p.x - SVG_W / 2) * MAP_SCALE, -(p.y - SVG_H / 2) * MAP_SCALE));
  const result = new THREE.Shape(convert(shape.getPoints(4)));
  result.holes = shape.holes.map((hole) => new THREE.Path(convert(hole.getPoints(4))));
  return result;
}

export async function loadPanemMap(url) {
  const data = await new SVGLoader().loadAsync(url);
  const group = new THREE.Group();
  const meshes = [];
  const centers = {};
  const textureLoader = new THREE.TextureLoader();
  const disposables = [];

  for (const path of data.paths) {
    const match = /^district-(\w+)$/.exec(path.userData?.node?.id ?? '');
    const district = match && getDistrict(match[1]);
    if (!district) continue;
    const geometry = new THREE.ExtrudeGeometry(SVGLoader.createShapes(path).map(toMapShape), {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2, curveSegments: 4,
    });
    geometry.rotateX(-Math.PI / 2); // el plano del SVG pasa a ser el piso (XZ) y la extrusión sube en Y
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = { x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2 };
    const baseColor = new THREE.Color(district.color);
    const litColor = new THREE.Color(district.litColor);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor.clone(), roughness: 0.85, metalness: 0.05, emissive: litColor.clone(), emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { districtId: district.id, baseColor, litColor };
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 30),
      new THREE.LineBasicMaterial({ color: 0xd9d9d9, transparent: true, opacity: 0.5 }),
    );
    mesh.add(edges);
    const texture = textureLoader.load(`/assets/seals/${district.id}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    seal.scale.setScalar(0.42);
    seal.position.set(center.x, DEPTH + 0.25, center.z);
    mesh.add(seal);
    disposables.push(texture);
    group.add(mesh);
    meshes.push(mesh);
    centers[district.id] = center;
  }

  const damp = THREE.MathUtils.damp;
  function update(dt, elapsed, { hoveredId, focusId, lit, finaleLit }) {
    const blend = 1 - Math.exp(-4 * dt);
    for (const mesh of meshes) {
      const id = mesh.userData.districtId;
      const isLit = lit.includes(id) || finaleLit.has(id);
      const lift = id === focusId ? LIFT_FOCUS : id === hoveredId ? LIFT_HOVER : 0;
      mesh.position.y = damp(mesh.position.y, lift, 8, dt);
      const m = mesh.material;
      m.color.lerp(isLit ? mesh.userData.litColor : mesh.userData.baseColor, blend);
      let glow = isLit ? 0.45 + 0.15 * Math.sin(elapsed * 2 + mesh.id) : id === hoveredId ? 0.08 : 0;
      if (id === '13' && !isLit) {
        // Estática: parpadeos y saltos breves
        glow = Math.random() < 0.06 ? 0.35 : 0;
        mesh.position.x = Math.random() < 0.04 ? (Math.random() - 0.5) * 0.06 : 0;
      }
      m.emissiveIntensity = damp(m.emissiveIntensity, glow, 10, dt);
    }
  }

  function dispose() {
    group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
    });
    disposables.forEach((t) => t.dispose());
    group.removeFromParent();
  }

  return { group, meshes, centers, update, dispose };
}
```

- [ ] **Step 7: Implementar `components/stage/effects.js`**

```js
import * as THREE from 'three';

// Sistema de partículas propio: chispas que viajan en arco de un distrito a otro.
const MAX = 400;
const PER_EMIT = 60;
const HIDDEN_Y = -100;

export function createSparks(scene) {
  const positions = new Float32Array(MAX * 3);
  const particles = Array.from({ length: MAX }, () => ({ alive: false }));
  for (let i = 0; i < MAX; i++) positions[i * 3 + 1] = HIDDEN_Y;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#ffb347', size: 0.09, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;

  return {
    emit(from, to) {
      if (!from || !to) return;
      for (let k = 0; k < PER_EMIT; k++) {
        particles[cursor] = {
          alive: true, t: 0, delay: Math.random() * 0.5, speed: 0.6 + Math.random() * 0.4,
          sx: from.x, sz: from.z, ex: to.x, ez: to.z, h: 1.5 + Math.random() * 1.5,
          jx: (Math.random() - 0.5) * 0.5, jz: (Math.random() - 0.5) * 0.5,
        };
        cursor = (cursor + 1) % MAX;
      }
    },
    update(dt) {
      for (let i = 0; i < MAX; i++) {
        const p = particles[i];
        const o = i * 3;
        if (!p.alive) continue;
        if (p.delay > 0) { p.delay -= dt; positions[o + 1] = HIDDEN_Y; continue; }
        p.t += dt * p.speed;
        if (p.t >= 1) { p.alive = false; positions[o + 1] = HIDDEN_Y; continue; }
        const wobble = Math.sin(p.t * Math.PI);
        positions[o] = p.sx + (p.ex - p.sx) * p.t + p.jx * wobble;
        positions[o + 1] = 0.5 + p.h * 4 * p.t * (1 - p.t);
        positions[o + 2] = p.sz + (p.ez - p.sz) * p.t + p.jz * wobble;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
```

- [ ] **Step 8: Crear `components/stage/dioramas/index.js`**

```js
// id del distrito → función build del diorama (ver contrato en el plan, Tarea 5).
export const DIORAMAS = {};
```

- [ ] **Step 9: Implementar `components/stage/panemScene.js`**

```js
import * as THREE from 'three';
import { loadPanemMap } from './mapMesh.js';
import { createCameraRig } from './cameraRig.js';
import { poseFor } from './cameraPoses.js';
import { createSparks } from './effects.js';
import { DIORAMAS } from './dioramas/index.js';
import { MAP_IDS } from '../../data/districts.js';

const CLICK_TOLERANCE_PX = 6;

function focusFor(route) {
  if (route.scene === 'distrito') return route.districtId;
  if (route.scene === 'capitolio') return 'c';
  return null;
}

export function createPanemScene(mount, callbacks) {
  // WebGLRenderer lanza una excepción si el navegador no tiene WebGL: la atrapa PanemStage.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0c, 16, 34);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.8);
  sun.position.set(4, 10, 6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8899ff, 0.4);
  rim.position.set(-6, 4, -8);
  scene.add(rim);

  const rig = createCameraRig(camera);
  const sparks = createSparks(scene);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const timer = new THREE.Timer();
  const state = {
    route: { scene: 'intro', districtId: null }, lit: [], hovered: null, externalHover: null,
    map: null, diorama: null, dioramaId: null, finaleLit: new Set(), finaleTimers: [],
    aspect: 1, disposed: false, frame: 0, down: null, running: false,
  };

  function resize() {
    const width = mount.clientWidth;
    const height = Math.max(mount.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const crossed = (state.aspect < 0.8) !== (camera.aspect < 0.8);
    state.aspect = camera.aspect;
    if (crossed) rig.goTo(poseFor(state.route, state.map?.centers, state.aspect), 0.5);
  }

  function disposeDiorama() {
    if (!state.diorama) return;
    state.diorama.dispose();
    state.diorama = null;
    state.dioramaId = null;
  }

  function buildDiorama(id) {
    const completed = state.lit.includes(id);
    const centers = state.map.centers;
    state.diorama = DIORAMAS[id]({
      origin: centers[id], completed, sfx: callbacks.sfx, rig,
      onProgress: (value) => callbacks.onProgress(id, value),
      onComplete: () => { callbacks.onComplete(id); sparks.emit(centers[id], centers.c); },
    });
    state.dioramaId = id;
    scene.add(state.diorama.group);
    callbacks.onProgress(id, completed ? 1 : 0);
  }

  function applyRoute() {
    const { route, map } = state;
    rig.goTo(poseFor(route, map?.centers, state.aspect), 1.6);
    const wanted = route.scene === 'distrito' && map && DIORAMAS[route.districtId] ? route.districtId : null;
    if (wanted !== state.dioramaId) {
      disposeDiorama();
      if (wanted) buildDiorama(wanted);
    }
    if (route.scene !== 'mapa' && state.hovered) { state.hovered = null; callbacks.onHover(null); }
  }

  function setPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function pickDistrict() {
    if (!state.map) return null;
    const hit = raycaster.intersectObjects(state.map.meshes, false)[0];
    return hit?.object.userData.districtId ?? null;
  }

  function onPointerMove(event) {
    setPointer(event);
    let cursor = 'default';
    if (state.diorama) {
      if (state.diorama.pointerMove(raycaster)) cursor = 'pointer';
    } else if (state.route.scene === 'mapa') {
      const id = pickDistrict();
      if (id !== state.hovered) {
        state.hovered = id;
        callbacks.onHover(id);
        if (id) callbacks.sfx.play('tick');
      }
      if (id) cursor = 'pointer';
    }
    renderer.domElement.style.cursor = cursor;
  }

  function onPointerDown(event) {
    setPointer(event);
    state.down = { x: event.clientX, y: event.clientY };
    if (state.diorama) {
      renderer.domElement.setPointerCapture?.(event.pointerId);
      state.diorama.pointerDown(raycaster);
    }
  }

  function onPointerUp(event) {
    setPointer(event);
    const down = state.down;
    state.down = null;
    if (state.diorama) { state.diorama.pointerUp(raycaster); return; }
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_TOLERANCE_PX) return;
    if (state.route.scene !== 'mapa') return;
    const id = pickDistrict();
    if (id) callbacks.onSelect(id);
  }

  function onPointerLeave() {
    if (state.hovered) { state.hovered = null; callbacks.onHover(null); }
  }

  function animate(timestamp) {
    state.frame = requestAnimationFrame(animate);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();
    rig.update(dt);
    state.map?.update(dt, elapsed, {
      hoveredId: state.hovered ?? state.externalHover, focusId: focusFor(state.route),
      lit: state.lit, finaleLit: state.finaleLit,
    });
    state.diorama?.update(dt, elapsed);
    sparks.update(dt);
    renderer.render(scene, camera);
  }

  function start() {
    if (state.running || state.disposed) return;
    state.running = true;
    timer.reset();
    state.frame = requestAnimationFrame(animate);
  }

  function stop() {
    state.running = false;
    cancelAnimationFrame(state.frame);
  }

  function onVisibility() {
    if (document.hidden) stop(); else start();
  }

  function clearFinale() {
    state.finaleTimers.forEach(clearTimeout);
    state.finaleTimers = [];
    state.finaleLit.clear();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  resize();
  rig.goTo(poseFor(state.route, null, state.aspect), 0);
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  start();

  loadPanemMap('/assets/panem.svg')
    .then((map) => {
      if (state.disposed) { map.dispose(); return; }
      state.map = map;
      scene.add(map.group);
      applyRoute();
    })
    .catch((error) => callbacks.onError?.(error));

  return {
    setRoute(route) { state.route = route; applyRoute(); },
    setLit(ids) { state.lit = ids; },
    setHovered(id) { state.externalHover = id; },
    setReducedMotion(value) { rig.setReducedMotion(value); },
    performAction() { state.diorama?.performAction(); },
    playFinale(onDone) {
      clearFinale();
      const map = state.map;
      if (!map) { onDone?.(); return; }
      rig.goTo(poseFor({ scene: 'finale' }, map.centers, state.aspect), 2);
      const c = map.centers.c;
      const distance = (id) => Math.hypot(map.centers[id].x - c.x, map.centers[id].z - c.z);
      const order = MAP_IDS.filter((id) => id !== 'c' && id !== '13' && map.centers[id]).sort((a, b) => distance(a) - distance(b));
      const at = (seconds, fn) => state.finaleTimers.push(setTimeout(fn, seconds * 1000));
      at(0, () => { state.finaleLit.add('c'); callbacks.sfx.play('ignite'); });
      order.forEach((id, i) => at(0.4 + i * 0.22, () => { state.finaleLit.add(id); sparks.emit(c, map.centers[id]); }));
      const last = 0.4 + order.length * 0.22 + 1.2;
      at(last, () => { state.finaleLit.add('13'); sparks.emit(c, map.centers['13']); callbacks.sfx.play('ignite'); });
      at(last + 1.5, () => onDone?.());
    },
    cancelFinale: clearFinale,
    getInfo() {
      return {
        canvases: mount.querySelectorAll('canvas').length,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      };
    },
    dispose() {
      state.disposed = true;
      stop();
      clearFinale();
      observer.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      disposeDiorama();
      state.map?.dispose();
      sparks.dispose();
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
```

- [ ] **Step 10: Lint y tests**

Run: `npm run lint -- components/stage && npm test`
Expected: sin errores; tests PASS. La escena se prueba en el navegador en la Tarea 6, que es la primera que la monta.

- [ ] **Step 11: Commit**

```bash
git add components/stage tests/camera.test.mjs
git commit -m "feat: escena 3D de Panem con mapa extruido, cámara y chispas"
```

---

### Task 6: Rutas, provider, páginas y estilos (primer recorrido navegable)

**Files:**
- Create: `lib/routes.js`, `tests/routes.test.mjs`
- Create: `components/panem/PanemProvider.js`, `components/panem/PanemStage.js`, `components/panem/IntroScreen.js`, `components/panem/MapHud.js`, `components/panem/DistrictDial.js`, `components/panem/DistrictPanel.js`
- Create: `app/(panem)/layout.js`, `app/(panem)/page.js`, `app/(panem)/mapa/page.js`, `app/(panem)/distrito/[id]/page.js`
- Modify: `app/layout.js`, `app/error.js`, `app/not-found.js`, `app/loading.js`
- Replace: `app/globals.css`
- Delete: `app/page.js`, `app/archivo/`, `components/{ArenaMap,DistrictsView,PeopleView,SignalArchive,ThreeSignal,Hero,StoryDialog,Experience,MotionLayer}.js`, `data/chapters.js`, `public/assets/arena.jpg`, `public/assets/panem-reference.jpg`

**Interfaces:**
- Consumes: Tareas 1–5 (`getDistrict`, `DISTRICTS`, `DISTRICT_ROUTE_IDS`, `MAP_IDS`, `canEnterCapitol`, `useProgress`, `AudioEngine`, `createPanemScene`).
- Produces (`lib/routes.js`): `routeFromPathname(pathname) → { scene, districtId }`.
- Produces (`usePanem()`): `{ route, progress, audioState: 'off'|'on'|'muted'|'unsupported', startAudio(), toggleSound(), sfx, hovered, setHovered, interaction: { districtId, value }, performAction(), selectDistrict(id), handleProgress(id, v), handleComplete(id), stageApiRef, webglFailed, setWebglFailed, finalePlaying, setFinalePlaying, visibleLit, reducedMotion, notify(msg), resetAll() }`.

- [ ] **Step 1: Escribir el test que falla**

`tests/routes.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeFromPathname } from '../lib/routes.js';

test('rutas conocidas', () => {
  assert.deepEqual(routeFromPathname('/'), { scene: 'intro', districtId: null });
  assert.deepEqual(routeFromPathname('/mapa'), { scene: 'mapa', districtId: null });
  assert.deepEqual(routeFromPathname('/distrito/12'), { scene: 'distrito', districtId: '12' });
  assert.deepEqual(routeFromPathname('/distrito/13/'), { scene: 'distrito', districtId: '13' });
  assert.deepEqual(routeFromPathname('/capitolio'), { scene: 'capitolio', districtId: 'c' });
});

test('rutas inválidas caen en el mapa', () => {
  for (const p of ['/distrito/99', '/distrito/c', '/distrito/abc', '/distrito', '/otra', null, undefined]) {
    assert.deepEqual(routeFromPathname(p), { scene: 'mapa', districtId: null }, String(p));
  }
});
```

Nota: `null`/`undefined` caen en `mapa` y no en `intro` a propósito, porque solo `/` es la intro.

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../lib/routes.js'`.

- [ ] **Step 3: Implementar `lib/routes.js`**

```js
// Traduce la URL a la escena 3D. Puro: se prueba con `node --test`.
import { isDistrictRouteId } from '../data/districts.js';

export function routeFromPathname(pathname) {
  if (pathname === '/') return { scene: 'intro', districtId: null };
  const parts = String(pathname ?? '').split('/').filter(Boolean);
  if (parts[0] === 'capitolio') return { scene: 'capitolio', districtId: 'c' };
  if (parts[0] === 'distrito' && isDistrictRouteId(parts[1])) return { scene: 'distrito', districtId: parts[1] };
  return { scene: 'mapa', districtId: null };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Borrar la experiencia anterior**

```bash
git rm -r app/page.js app/archivo components/ArenaMap.js components/DistrictsView.js components/PeopleView.js components/SignalArchive.js components/ThreeSignal.js components/Hero.js components/StoryDialog.js components/Experience.js components/MotionLayer.js data/chapters.js public/assets/arena.jpg public/assets/panem-reference.jpg
```

- [ ] **Step 6: Crear `components/panem/PanemProvider.js`**

```js
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProgress } from '@/hooks/useProgress';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { routeFromPathname } from '@/lib/routes';
import { canEnterCapitol } from '@/lib/progress';
import { MAP_IDS, getDistrict } from '@/data/districts';

const PanemContext = createContext(null);
const SOUND_KEY = 'panem-sound';

export function usePanem() {
  const value = useContext(PanemContext);
  if (!value) throw new Error('usePanem debe usarse dentro de PanemProvider');
  return value;
}

export default function PanemProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => routeFromPathname(pathname), [pathname]);
  const progress = useProgress();
  const audioRef = useRef(null);
  const stageApiRef = useRef(null);
  const [audioState, setAudioState] = useState('off');
  const [hovered, setHovered] = useState(null);
  const [interaction, setInteraction] = useState({ districtId: null, value: 0 });
  const [fallbackCounts, setFallbackCounts] = useState({});
  const [webglFailed, setWebglFailed] = useState(false);
  const [finalePlaying, setFinalePlaying] = useState(false);
  const [toast, setToast] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);

  const notify = useCallback((message) => setToast(message), []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const sfx = useMemo(() => ({ play: (name) => audioRef.current?.playSfx(name) }), []);

  const startAudio = useCallback(async () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioEngine();
      await audioRef.current.start();
      let preference = 'on';
      try { preference = window.localStorage.getItem(SOUND_KEY) || 'on'; } catch { /* sin storage */ }
      audioRef.current.setMuted(preference === 'off');
      setAudioState(preference === 'off' ? 'muted' : 'on');
    } catch {
      setAudioState('unsupported');
      notify('El sonido no está disponible en este navegador. La experiencia sigue en silencio.');
    }
  }, [notify]);

  const toggleSound = useCallback(async () => {
    if (audioState === 'off') { await startAudio(); return; }
    if (audioState === 'unsupported') return;
    const muted = audioState === 'on';
    audioRef.current.setMuted(muted);
    setAudioState(muted ? 'muted' : 'on');
    try { window.localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on'); } catch { /* sin storage */ }
  }, [audioState, startAudio]);

  useEffect(() => () => { audioRef.current?.dispose(); audioRef.current = null; }, []);

  const completed = progress.completedAt !== null;
  const visibleLit = completed && !finalePlaying ? MAP_IDS : progress.litDistricts;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioState === 'off' || audioState === 'unsupported') return;
    audio.setLayerState({
      lit: progress.litDistricts,
      previewDistrict: route.scene === 'distrito' ? route.districtId : null,
      finale: completed || finalePlaying ? progress.finalMessage : null,
    });
    audio.setDucked(route.scene === 'distrito');
  }, [audioState, progress.litDistricts, progress.finalMessage, completed, finalePlaying, route]);

  const selectDistrict = useCallback((id) => {
    if (id === 'c') {
      if (!canEnterCapitol(progress)) {
        notify(`El Capitolio está blindado · ${progress.litDistricts.length}/3 emblemas`);
        sfx.play('glitch');
        return;
      }
      sfx.play('click');
      router.push('/capitolio');
      return;
    }
    if (!getDistrict(id)) return;
    sfx.play('click');
    router.push(`/distrito/${id}`);
  }, [progress, notify, sfx, router]);

  const handleProgress = useCallback((districtId, value) => setInteraction({ districtId, value }), []);

  const handleComplete = useCallback((districtId) => {
    if (progress.litDistricts.includes(districtId)) return;
    progress.lightDistrict(districtId);
    setInteraction({ districtId, value: 1 });
    notify(`Emblema del Distrito ${districtId} · ${Math.min(progress.litDistricts.length + 1, 3)}/3`);
  }, [progress, notify]);

  const performAction = useCallback(() => {
    if (route.scene !== 'distrito') return;
    const district = getDistrict(route.districtId);
    if (!district?.playable || progress.litDistricts.includes(district.id)) return;
    if (stageApiRef.current) { stageApiRef.current.performAction(); return; }
    // Sin WebGL: el avance se cuenta acá con la misma cantidad de acciones.
    const next = (fallbackCounts[district.id] || 0) + 1;
    setFallbackCounts((counts) => ({ ...counts, [district.id]: next }));
    sfx.play('click');
    handleProgress(district.id, Math.min(1, next / district.actionsToComplete));
    if (next >= district.actionsToComplete) handleComplete(district.id);
  }, [route, progress.litDistricts, fallbackCounts, sfx, handleProgress, handleComplete]);

  const resetAll = useCallback(async () => {
    try { await progress.reset(); notify('Panem volvió a apagarse.'); }
    catch { notify('No se pudo reiniciar en la nube; revisá tu conexión.'); }
    setFallbackCounts({});
    setInteraction({ districtId: null, value: 0 });
    router.push('/');
  }, [progress, notify, router]);

  const value = {
    route, progress, audioState, startAudio, toggleSound, sfx, hovered, setHovered,
    interaction, performAction, selectDistrict, handleProgress, handleComplete,
    stageApiRef, webglFailed, setWebglFailed, finalePlaying, setFinalePlaying,
    visibleLit, reducedMotion, notify, resetAll,
  };

  return (
    <PanemContext.Provider value={value}>
      {children}
      <div className="toast" role="status" aria-live="polite" data-show={toast ? 'true' : 'false'}>{toast}</div>
    </PanemContext.Provider>
  );
}
```

- [ ] **Step 7: Crear `components/panem/PanemStage.js`**

```js
'use client';
import { useEffect, useRef } from 'react';
import { usePanem } from './PanemProvider';
import { createPanemScene } from '@/components/stage/panemScene';

export default function PanemStage() {
  const mountRef = useRef(null);
  const panem = usePanem();
  const { route, visibleLit, hovered, reducedMotion, stageApiRef, setWebglFailed, notify } = panem;
  const callbacksRef = useRef(null);

  useEffect(() => {
    callbacksRef.current = {
      onHover: panem.setHovered, onSelect: panem.selectDistrict,
      onProgress: panem.handleProgress, onComplete: panem.handleComplete, sfx: panem.sfx,
    };
  });

  useEffect(() => {
    let api;
    try {
      api = createPanemScene(mountRef.current, {
        onHover: (id) => callbacksRef.current?.onHover(id),
        onSelect: (id) => callbacksRef.current?.onSelect(id),
        onProgress: (id, value) => callbacksRef.current?.onProgress(id, value),
        onComplete: (id) => callbacksRef.current?.onComplete(id),
        sfx: { play: (name) => callbacksRef.current?.sfx.play(name) },
        onError: (error) => {
          console.error('No se pudo cargar el mapa 3D:', error);
          notify('No se pudo cargar el mapa 3D. Usá el menú de distritos.');
        },
      });
    } catch (error) {
      console.warn('WebGL no disponible:', error);
      setWebglFailed(true);
      return undefined;
    }
    stageApiRef.current = api;
    if (process.env.NODE_ENV !== 'production') window.__panemInfo = api.getInfo;
    return () => {
      api.dispose();
      stageApiRef.current = null;
      if (process.env.NODE_ENV !== 'production') delete window.__panemInfo;
    };
  }, [stageApiRef, setWebglFailed, notify]);

  useEffect(() => { stageApiRef.current?.setRoute(route); }, [route, stageApiRef]);
  useEffect(() => { stageApiRef.current?.setLit(visibleLit); }, [visibleLit, stageApiRef]);
  useEffect(() => { stageApiRef.current?.setHovered(hovered); }, [hovered, stageApiRef]);
  useEffect(() => { stageApiRef.current?.setReducedMotion(reducedMotion); }, [reducedMotion, stageApiRef]);

  return <div ref={mountRef} className="stage" aria-hidden="true" />;
}
```

- [ ] **Step 8: Crear `components/panem/IntroScreen.js`**

```js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePanem } from './PanemProvider';

export default function IntroScreen() {
  const router = useRouter();
  const { startAudio, sfx, progress } = usePanem();
  const [leaving, setLeaving] = useState(false);

  async function ignite() {
    setLeaving(true);
    await startAudio(); // este clic es el gesto que el navegador exige para habilitar el audio
    sfx.play('glitch');
    window.setTimeout(() => router.push('/mapa'), 700);
  }

  return (
    <section className={`intro crt${leaving ? ' leaving' : ''}`}>
      <div className="crt-inner">
        <p className="eyebrow">TRANSMISIÓN OFICIAL DEL CAPITOLIO · CANAL OBLIGATORIO</p>
        <h1>Panem vive en paz.</h1>
        <p>Los distritos trabajan. El Capitolio cuida. Toda señal no autorizada será eliminada.</p>
        <button type="button" className="primary ignite" onClick={ignite} disabled={leaving}>
          {progress.litDistricts.length ? 'Retomar la señal' : 'Encender la señal'}
        </button>
        <p className="fineprint">
          Experiencia de fans con fines académicos, inspirada en <cite>The Hunger Games</cite> de Suzanne Collins. Con sonido.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Crear `components/panem/MapHud.js`**

```js
'use client';
import { getDistrict } from '@/data/districts';
import { canEnterCapitol } from '@/lib/progress';
import { usePanem } from './PanemProvider';

function statusOf(district, { visibleLit, progress }) {
  if (district.id === 'c') return canEnterCapitol(progress) ? 'Abierto · la señal está lista' : `Blindado · ${progress.litDistricts.length}/3 emblemas`;
  if (visibleLit.includes(district.id)) return 'Encendido';
  if (district.classified) return 'SEÑAL NO ENCONTRADA';
  if (district.playable) return 'Todavía guarda una chispa';
  return 'Apagado';
}

export default function MapHud() {
  const panem = usePanem();
  const district = panem.hovered ? getDistrict(panem.hovered) : null;
  return (
    <>
      <div className={`hover-card${district ? ' visible' : ''}${district?.classified ? ' classified' : ''}`} aria-live="polite">
        {district && <>
          <p className="eyebrow">{district.id === 'c' ? 'CAPITOLIO' : `DISTRITO ${district.number}`}</p>
          <strong>{district.industry}</strong>
          <span>{statusOf(district, panem)}</span>
        </>}
      </div>
      {panem.webglFailed && (
        <p className="notice" role="status">Tu navegador no puede mostrar el mapa 3D. Podés recorrer Panem con el menú de distritos.</p>
      )}
    </>
  );
}
```

- [ ] **Step 10: Crear `components/panem/DistrictDial.js`**

```js
'use client';
import { DISTRICTS } from '@/data/districts';
import { canEnterCapitol } from '@/lib/progress';
import { usePanem } from './PanemProvider';

export default function DistrictDial() {
  const { progress, visibleLit, hovered, setHovered, selectDistrict } = usePanem();
  const capitolOpen = canEnterCapitol(progress);
  return (
    <nav className="dial" aria-label="Distritos de Panem">
      <ol>
        {DISTRICTS.map((d, i) => {
          const lit = visibleLit.includes(d.id);
          const status = d.id === 'c' ? (capitolOpen ? 'abierto' : 'blindado')
            : lit ? 'encendido' : d.classified ? 'clasificado' : d.playable ? 'guarda una chispa' : 'apagado';
          const classes = [lit && 'lit', d.playable && 'playable', d.classified && 'classified', hovered === d.id && 'hover'].filter(Boolean).join(' ');
          return (
            <li key={d.id} style={{ '--i': i, '--n': DISTRICTS.length }}>
              <button
                type="button" className={classes} onClick={() => selectDistrict(d.id)}
                onMouseEnter={() => setHovered(d.id)} onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(d.id)} onBlur={() => setHovered(null)}
                aria-label={`${d.name}, ${d.industry}: ${status}`}
              >
                {d.number}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="dial-core" aria-hidden="true">EXPLORAR<br />DISTRITOS</div>
    </nav>
  );
}
```

- [ ] **Step 11: Crear `components/panem/DistrictPanel.js`**

```js
'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePanem } from './PanemProvider';

export default function DistrictPanel({ district }) {
  const { progress, interaction, performAction } = usePanem();
  const { id } = district;
  const { ready, markVisited } = progress;
  useEffect(() => { if (ready) markVisited(id); }, [ready, markVisited, id]);

  const lit = progress.litDistricts.includes(id);
  const value = lit ? 1 : interaction.districtId === id ? interaction.value : 0;

  return (
    <aside className={`panel district-panel${district.classified ? ' classified' : ''}`} aria-labelledby="district-title">
      <Link href="/mapa" className="back">← Volver al mapa</Link>
      <div className="district-heading">
        <Image src={`/assets/seals/${id}.png`} alt="" width={64} height={64} />
        <span className="district-number">{district.number}</span>
      </div>
      <p className="eyebrow">{district.classified ? 'ARCHIVO CLASIFICADO' : `DISTRITO ${district.number} · ${district.industry.toUpperCase()}`}</p>
      <h1 id="district-title">{district.name}</h1>
      <p className="quote">{district.quote}</p>
      {district.playable ? (
        lit ? (
          <p className="done" role="status"><strong>Emblema obtenido.</strong> El {district.name} está encendido.</p>
        ) : (
          <>
            <p className="instruction">{district.instruction}</p>
            <div className="meter" role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
              <span style={{ width: `${value * 100}%` }} />
            </div>
            <button type="button" className="primary" onClick={performAction}>{district.actionLabel}</button>
            <p className="hint">Podés usar este botón en lugar del mouse o la pantalla táctil.</p>
          </>
        )
      ) : (
        <p className="status">{district.classified ? 'SEÑAL NO ENCONTRADA · Según el Capitolio, este distrito no existe.' : 'Señal aún no alcanzada.'}</p>
      )}
    </aside>
  );
}
```

- [ ] **Step 12: Crear el layout y las páginas del grupo `(panem)`**

`app/(panem)/layout.js`:

```js
import PanemProvider from '@/components/panem/PanemProvider';
import PanemStage from '@/components/panem/PanemStage';

// Este layout no se re-renderiza al navegar: el canvas y el audio sobreviven entre rutas.
export default function PanemLayout({ children }) {
  return (
    <PanemProvider>
      <PanemStage />
      <main id="main" className="overlay">{children}</main>
    </PanemProvider>
  );
}
```

`app/(panem)/page.js`:

```js
import IntroScreen from '@/components/panem/IntroScreen';

export const metadata = { title: 'Transmisión oficial' };

export default function IntroPage() {
  return <IntroScreen />;
}
```

`app/(panem)/mapa/page.js`:

```js
import MapHud from '@/components/panem/MapHud';
import DistrictDial from '@/components/panem/DistrictDial';

export const metadata = {
  title: 'Mapa de Panem',
  description: 'Panem está a oscuras. Elegí un distrito y encendé la chispa.',
};

export default function MapPage() {
  return (
    <>
      <section className="map-intro">
        <p className="eyebrow">MAPA DE PANEM · 13 DISTRITOS</p>
        <h1>Panem está a oscuras.</h1>
        <p>Elegí un distrito. Tres de ellos todavía guardan una chispa.</p>
      </section>
      <MapHud />
      <DistrictDial />
    </>
  );
}
```

`app/(panem)/distrito/[id]/page.js`:

```js
import { notFound } from 'next/navigation';
import { DISTRICT_ROUTE_IDS, getDistrict } from '@/data/districts';
import DistrictPanel from '@/components/panem/DistrictPanel';

export const dynamicParams = false;

export function generateStaticParams() {
  return DISTRICT_ROUTE_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const district = getDistrict(id);
  if (!district || district.id === 'c') return {};
  return { title: `${district.name} · ${district.industry}`, description: district.quote };
}

export default async function DistrictPage({ params }) {
  const { id } = await params;
  const district = getDistrict(id);
  if (!district || district.id === 'c') notFound();
  return <DistrictPanel district={district} />;
}
```

- [ ] **Step 13: Actualizar el layout raíz y los estados globales**

`app/layout.js`:

```js
import { Inter, Oswald } from 'next/font/google';
import './globals.css';

const display = Oswald({ subsets: ['latin'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: { default: 'Panem · La chispa', template: '%s · Panem' },
  description: 'Panem está a oscuras: llevá la chispa de distrito en distrito hasta que el Capitolio no pueda apagarla. Experiencia interactiva de fans con fines académicos.',
  applicationName: 'Panem · La chispa',
  keywords: ['Panem', 'The Hunger Games', 'Los juegos del hambre', 'experiencia interactiva', 'Three.js'],
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: '#0b0b0c' };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

`app/error.js`:

```js
'use client';
export default function Error({ reset }) {
  return (
    <main className="route-message">
      <p className="eyebrow">ERROR DE TRANSMISIÓN</p>
      <h1>La señal se interrumpió.</h1>
      <button type="button" className="primary" onClick={reset}>Reintentar</button>
    </main>
  );
}
```

`app/not-found.js`:

```js
import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="route-message">
      <p className="eyebrow">404 · SIN REGISTRO</p>
      <h1>Ese lugar no figura en el mapa de Panem.</h1>
      <Link href="/mapa" className="primary">Volver al mapa</Link>
    </main>
  );
}
```

`app/loading.js`:

```js
export default function Loading() {
  return <main className="route-message"><p className="eyebrow">SINTONIZANDO PANEM…</p></main>;
}
```

- [ ] **Step 14: Reemplazar `app/globals.css`**

```css
:root {
  --bg: #0b0b0c;
  --grid: #ffffff0d;
  --ink: #ece8df;
  --muted: #a9a49a;
  --line: #ffffff26;
  --spark: #ff7a2f;
  --capitol: #e23b3b;
  --panel: #141416e6;
  --font-display: 'Oswald', sans-serif;
  --font-body: 'Inter', sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  background-color: var(--bg);
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 48px 48px;
  color: var(--ink);
  font: 16px/1.55 var(--font-body);
  overflow: hidden;
}
h1, h2, .eyebrow, .brand, .district-number, button, .chip { font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.04em; }
h1 { font-size: clamp(28px, 4vw, 48px); line-height: 1.05; margin: 0.2em 0 0.4em; }
.eyebrow { font-size: 12px; letter-spacing: 0.2em; color: var(--muted); margin: 0; }
a { color: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
:focus-visible { outline: 2px solid var(--spark); outline-offset: 3px; }

button, .primary { cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--ink); padding: 10px 18px; font-size: 15px; text-decoration: none; display: inline-block; }
.primary { background: var(--spark); border-color: var(--spark); color: #160a02; font-weight: 600; }
.primary:hover:not(:disabled) { filter: brightness(1.1); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Escena */
.stage { position: fixed; inset: 0; z-index: 0; }
.stage canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.overlay { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
.overlay > * { pointer-events: auto; }

/* Header */
.site-header { position: fixed; top: 0; left: 0; right: 0; z-index: 3; display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: linear-gradient(#0b0b0cee, transparent); }
.brand { text-decoration: none; font-size: 22px; letter-spacing: 0.3em; }
.brand small { font-size: 11px; color: var(--spark); margin-left: 8px; letter-spacing: 0.25em; }
.header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.chip { font-size: 12px; padding: 6px 12px; border: 1px solid var(--line); background: #0b0b0c99; }
.chip-accent b { color: var(--spark); }
.sync { font-family: var(--font-display); font-size: 11px; letter-spacing: 0.15em; color: var(--muted); }

/* Intro CRT */
.crt { position: fixed; inset: 0; display: grid; place-items: center; background: radial-gradient(ellipse at center, #3a0d0dee, #0b0b0cfa 70%); overflow: hidden; }
.crt::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, #00000055 0 2px, transparent 2px 4px); animation: scan 8s linear infinite; }
.crt::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 160px #000; }
.crt-inner { position: relative; max-width: 640px; padding: 24px; text-align: center; }
.crt h1 { color: #fff; text-shadow: 2px 0 var(--capitol), -2px 0 #3bd6ff88; }
.crt .ignite { margin-top: 18px; font-size: 18px; padding: 14px 28px; }
.fineprint { font-size: 12px; color: var(--muted); margin-top: 22px; }
.intro.leaving { animation: glitch-out 0.7s steps(6) forwards; }
@keyframes scan { to { background-position: 0 100vh; } }
@keyframes glitch-out { 0% { opacity: 1; } 40% { transform: translateX(-8px) skewX(4deg); clip-path: inset(20% 0 30% 0); } 70% { transform: translateX(6px); clip-path: inset(50% 0 10% 0); } 100% { opacity: 0; } }

/* Mapa */
.map-intro { position: absolute; top: 72px; left: 24px; max-width: 360px; }
.map-intro h1 { font-size: clamp(26px, 3vw, 40px); }
.map-intro p:last-child { color: var(--muted); }
.hover-card { position: absolute; top: 72px; right: 24px; min-width: 220px; padding: 14px 18px; background: var(--panel); border-left: 3px solid var(--spark); opacity: 0; transform: translateY(-6px); transition: opacity .2s, transform .2s; pointer-events: none; display: grid; gap: 2px; }
.hover-card.visible { opacity: 1; transform: none; }
.hover-card strong { font-family: var(--font-display); font-size: 24px; text-transform: uppercase; }
.hover-card.classified { border-color: #fff; animation: flicker 0.4s steps(2) infinite; }
.notice { position: absolute; top: 200px; left: 24px; max-width: 360px; background: var(--panel); padding: 12px 16px; border: 1px solid var(--line); }
@keyframes flicker { 50% { opacity: 0.6; } }

/* Dial de distritos */
.dial { position: absolute; left: 24px; bottom: 24px; width: 230px; height: 230px; }
.dial ol { list-style: none; margin: 0; padding: 0; }
.dial li { position: absolute; left: 50%; top: 50%; transform: rotate(calc(360deg / var(--n) * var(--i))) translate(0, -96px) rotate(calc(-360deg / var(--n) * var(--i))); margin: -17px 0 0 -17px; }
.dial button { width: 34px; height: 34px; padding: 0; border-radius: 50%; font-size: 13px; background: #1b1b1e; border: 1px solid var(--line); }
.dial button.playable { border-color: var(--spark); }
.dial button.lit { background: var(--spark); color: #160a02; box-shadow: 0 0 14px var(--spark); }
.dial button.classified { border-style: dashed; }
.dial button.hover, .dial button:hover { transform: scale(1.15); }
.dial-core { position: absolute; inset: 62px; border-radius: 50%; border: 1px solid var(--line); display: grid; place-items: center; text-align: center; font: 11px/1.3 var(--font-display); letter-spacing: 0.2em; color: var(--muted); pointer-events: none; }

/* Panel de distrito */
.panel { position: absolute; top: 72px; right: 24px; bottom: 24px; width: min(400px, calc(100vw - 48px)); overflow: auto; padding: 22px 24px; background: var(--panel); border-top: 2px solid var(--spark); backdrop-filter: blur(10px); }
.back { font-size: 13px; color: var(--muted); text-decoration: none; }
.district-heading { display: flex; align-items: center; gap: 14px; margin: 16px 0 10px; }
.district-number { font-size: 64px; line-height: 1; }
.quote { font-size: 17px; color: #d7d2c7; }
.instruction { color: var(--muted); }
.meter { height: 6px; background: #ffffff1a; margin: 14px 0; }
.meter span { display: block; height: 100%; background: var(--spark); transition: width .3s; box-shadow: 0 0 10px var(--spark); }
.hint { font-size: 12px; color: var(--muted); }
.done { border-left: 3px solid var(--spark); padding-left: 12px; }
.status { font-family: var(--font-display); letter-spacing: 0.12em; color: var(--muted); }
.district-panel.classified { border-top-color: #fff; }
.district-panel.classified h1, .district-panel.classified .district-number { animation: flicker 0.6s steps(2) infinite; }

/* Mensajes */
.toast { position: fixed; left: 50%; bottom: 24px; z-index: 5; transform: translate(-50%, 20px); background: #000; border: 1px solid var(--spark); padding: 10px 18px; font-family: var(--font-display); letter-spacing: 0.1em; opacity: 0; transition: opacity .25s, transform .25s; pointer-events: none; }
.toast[data-show='true'] { opacity: 1; transform: translate(-50%, 0); }
.route-message { min-height: 100vh; display: grid; place-content: center; text-align: center; gap: 12px; padding: 24px; }

/* Celular */
@media (max-width: 720px) {
  .site-header { padding: 10px 16px; }
  .brand small { display: none; }
  .map-intro { top: 64px; left: 16px; right: 16px; }
  .hover-card { top: auto; bottom: 120px; right: 16px; left: 16px; }
  .dial { left: 0; right: 0; bottom: 0; width: auto; height: auto; padding: 12px 16px; background: linear-gradient(transparent, #0b0b0cee 30%); overflow-x: auto; }
  .dial ol { display: flex; gap: 8px; width: max-content; }
  .dial li { position: static; transform: none; margin: 0; }
  .dial button { width: 44px; height: 44px; }
  .dial-core { display: none; }
  .panel { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-height: 55vh; padding: 18px 16px; }
  .district-number { font-size: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 15: Lint, tests y build**

Run: `npm run lint && npm test && npm run build`
Expected: todo sin errores. En el build, `/distrito/[id]` aparece con 13 rutas prerenderizadas (`/distrito/1` … `/distrito/13`). Si el lint marca `react-hooks/set-state-in-effect` en `PanemStage` (`setWebglFailed`) o en `PanemProvider` (la sincronización de `matchMedia`), envolver esa llamada en `window.setTimeout(() => ..., 0)`, como hace `useProgress`.

- [ ] **Step 16: Probar en el navegador**

Run: `npm run dev` (en segundo plano) y abrir `http://localhost:3000`. Verificar:
1. `/` muestra la transmisión CRT. "Encender la señal" lleva a `/mapa` con un descenso de cámara y se escucha viento con un drone grave.
2. El mapa muestra 14 piezas grises con sus sellos. Con hover, la pieza sube, aparece la tarjeta y suena un tic. El 13 parpadea.
3. Al hacer clic en el 7 se navega a `/distrito/7`, la cámara se acerca y se abre la ficha "Señal aún no alcanzada". "Volver al mapa" vuelve.
4. Clic en "C": aparece el aviso "El Capitolio está blindado · 0/3 emblemas" y no navega.
5. El dial lleva a los mismos lugares con Tab y Enter.
6. `/distrito/99` y `/distrito/c` dan el 404 nuevo.
7. Recargar en `/distrito/12` muestra la cámara en el 12 (el diorama llega en la Tarea 8).

- [ ] **Step 17: Commit**

```bash
git add -A app components lib tests data public
git commit -m "feat: recorrido navegable de Panem con canvas persistente y rutas por distrito"
```

---

### Task 7: Header, emblemas y cuenta

**Files:**
- Create: `components/panem/SiteHeader.js`, `components/panem/EmblemsDialog.js`
- Modify: `app/(panem)/layout.js`, `app/globals.css` (agregar estilos del diálogo al final)

**Interfaces:**
- Consumes: `usePanem()` (Task 6), `components/AuthPanel.js` (existente: props `user, authError, authLoading, onClose, onGoogle, onSubmitEmail, onContinueAsGuest`).
- Produces: `<SiteHeader />` (no se muestra en la intro) y `<EmblemsDialog onClose />`.

- [ ] **Step 1: Crear `components/panem/EmblemsDialog.js`**

```js
'use client';
import { useState } from 'react';
import Image from 'next/image';
import { PLAYABLE_IDS, getDistrict } from '@/data/districts';
import { usePanem } from './PanemProvider';

const MESSAGE_LABELS = { rebelion: 'Encender la rebelión', memoria: 'Recordar a los caídos' };

export default function EmblemsDialog({ onClose }) {
  const { progress, resetAll } = usePanem();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="emblems-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal-panel">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <p className="eyebrow">TU RECORRIDO</p>
        <h2 id="emblems-title">Emblemas {progress.litDistricts.length}/3</h2>
        <ul className="emblems">
          {PLAYABLE_IDS.map((id) => {
            const d = getDistrict(id);
            const lit = progress.litDistricts.includes(id);
            return (
              <li key={id} className={lit ? 'lit' : ''}>
                <Image src={`/assets/seals/${id}.png`} alt="" width={56} height={56} />
                <span>{d.name} · {d.industry}</span>
                <small>{lit ? 'Encendido' : 'Pendiente'}</small>
              </li>
            );
          })}
        </ul>
        {progress.finalMessage && <p>Mensaje transmitido: <strong>{MESSAGE_LABELS[progress.finalMessage]}</strong></p>}
        <p className="hint">Distritos explorados: {progress.visited.length}/13</p>
        {confirming ? (
          <div className="confirm">
            <p>¿Apagar Panem y empezar de nuevo? Se borra tu progreso.</p>
            <button type="button" className="primary" onClick={() => { onClose(); resetAll(); }}>Sí, reiniciar</button>
            <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}>Reiniciar recorrido</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `components/panem/SiteHeader.js`**

```js
'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthPanel from '@/components/AuthPanel';
import EmblemsDialog from './EmblemsDialog';
import { usePanem } from './PanemProvider';

const SYNC_LABEL = { cloud: '● NUBE', connecting: '◌ CONECTANDO', local: '○ LOCAL' };

export default function SiteHeader() {
  const { route, progress, audioState, toggleSound } = usePanem();
  const [authOpen, setAuthOpen] = useState(false);
  const [emblemsOpen, setEmblemsOpen] = useState(false);
  if (route.scene === 'intro') return null;
  const soundOn = audioState === 'on';
  const user = progress.authUser;
  return (
    <header className="site-header">
      <Link href="/mapa" className="brand">PANEM<small>LA CHISPA</small></Link>
      <div className="header-actions">
        <span className="sync" title={progress.syncState === 'cloud' ? 'Progreso guardado en Firestore' : 'Progreso guardado en este navegador'}>
          {SYNC_LABEL[progress.syncState] ?? SYNC_LABEL.local}
        </span>
        <button type="button" className="chip" onClick={toggleSound} aria-pressed={soundOn} disabled={audioState === 'unsupported'}>
          {soundOn ? '♪ Sonido' : '♪ Silencio'}<span className="sr-only">{soundOn ? ': activado' : ': desactivado'}</span>
        </button>
        {progress.firebaseConfigured && (
          <button type="button" className="chip" onClick={() => setAuthOpen(true)}>
            {user && !user.isAnonymous ? (user.displayName || user.email) : 'Invitado'}
          </button>
        )}
        <button type="button" className="chip chip-accent" onClick={() => setEmblemsOpen(true)}>
          Emblemas <b>{progress.litDistricts.length}/3</b>
        </button>
      </div>
      {authOpen && (
        <AuthPanel
          user={user} authError={progress.authError} authLoading={progress.authLoading}
          onClose={() => setAuthOpen(false)} onGoogle={progress.signInWithGoogle}
          onSubmitEmail={progress.submitEmail} onContinueAsGuest={progress.continueAsGuest}
        />
      )}
      {emblemsOpen && <EmblemsDialog onClose={() => setEmblemsOpen(false)} />}
    </header>
  );
}
```

- [ ] **Step 3: Montar el header en `app/(panem)/layout.js`**

```js
import PanemProvider from '@/components/panem/PanemProvider';
import PanemStage from '@/components/panem/PanemStage';
import SiteHeader from '@/components/panem/SiteHeader';

// Este layout no se re-renderiza al navegar: el canvas y el audio sobreviven entre rutas.
export default function PanemLayout({ children }) {
  return (
    <PanemProvider>
      <PanemStage />
      <SiteHeader />
      <main id="main" className="overlay">{children}</main>
    </PanemProvider>
  );
}
```

- [ ] **Step 4: Agregar estilos al final de `app/globals.css`**

```css
/* Diálogos (emblemas y cuenta) */
.modal, .auth-overlay { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; background: #000a; padding: 16px; }
.modal-panel, .auth-panel { position: relative; width: min(440px, 100%); max-height: 90vh; overflow: auto; background: #141416; border-top: 2px solid var(--spark); padding: 24px; }
.modal-close, .auth-close { position: absolute; top: 8px; right: 8px; border: 0; font-size: 24px; padding: 4px 10px; }
.emblems { list-style: none; padding: 0; display: grid; gap: 10px; }
.emblems li { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 12px; opacity: 0.45; filter: grayscale(1); }
.emblems li.lit { opacity: 1; filter: drop-shadow(0 0 8px var(--spark)); }
.emblems small { font-family: var(--font-display); letter-spacing: 0.1em; color: var(--muted); }
.confirm { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.confirm p { width: 100%; }
.auth-tabs { display: flex; gap: 6px; margin: 12px 0; }
.auth-tabs .active { border-color: var(--spark); }
.auth-form { display: grid; gap: 10px; }
.auth-form label { display: grid; gap: 4px; font-size: 13px; color: var(--muted); }
.auth-form input { background: #0b0b0c; border: 1px solid var(--line); color: var(--ink); padding: 10px; font: inherit; }
.auth-google { margin-top: 10px; width: 100%; }
.auth-error { color: #ff8a8a; }
.save-note { font-size: 12px; color: var(--muted); }
.outline { border: 1px solid var(--line); }
```

- [ ] **Step 5: Lint, tests, build y prueba manual**

Run: `npm run lint && npm test && npm run build`
Expected: sin errores.

En `npm run dev`, verificar:
- el header no aparece en `/` y sí en `/mapa`;
- "♪" alterna sonido y silencio, y la preferencia sobrevive a una recarga después de volver a tocar "♪";
- "Emblemas 0/3" abre el diálogo;
- "Reiniciar recorrido" pide confirmación y vuelve a `/`;
- sin `.env.local`, el indicador dice `○ LOCAL` y no aparece el botón de cuenta.

- [ ] **Step 6: Commit**

```bash
git add components/panem/SiteHeader.js components/panem/EmblemsDialog.js "app/(panem)/layout.js" app/globals.css
git commit -m "feat: header con sonido, emblemas, sincronización y cuenta"
```

---

### Task 8: Lógica de los dioramas y Distrito 12 (carbón)

**Files:**
- Create: `components/stage/dioramas/logic.js` (puro), `components/stage/dioramas/common.js`, `components/stage/dioramas/district12.js`
- Modify: `components/stage/dioramas/index.js`
- Test: `tests/dioramas.test.mjs`

**Interfaces:**
- Consumes: `DEPTH`, `LIFT_FOCUS` (Task 5, `mapMesh.js`); contrato `build(...)` (Task 5).
- Produces (`logic.js`): `createTally(total, completed) → { count, total, done }`, `tally(state, k) → { state, justCompleted }`, `fishPosition(i, t, center) → {x,z}`, `fishInNet(fish, target, radius) → number[]`, `nearestFish(fish, from) → number | null`. Cada pez es `{ index, x, z, caught }`.
- Produces (`common.js`): `DIORAMA_Y`, `mat(color, extra)`, `createDioramaBase(origin, groundColor) → { group }`, `growIn(group, dt)`, `makeTree(color)`, `createBurst(parent, color, count) → { burst(Vector3), update(dt) }`, `disposeObject(root)`.

- [ ] **Step 1: Escribir el test que falla**

`tests/dioramas.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTally, tally, fishPosition, fishInNet, nearestFish } from '../components/stage/dioramas/logic.js';

test('tally avanza y completa una sola vez', () => {
  let s = createTally(3, false);
  let r = tally(s, 1); s = r.state;
  assert.deepEqual(s, { count: 1, total: 3, done: false });
  assert.equal(r.justCompleted, false);
  r = tally(s, 5); s = r.state;
  assert.deepEqual(s, { count: 3, total: 3, done: true });
  assert.equal(r.justCompleted, true);
  r = tally(s, 1);
  assert.equal(r.justCompleted, false, 'ya completo no vuelve a disparar');
  assert.equal(r.state, s);
});

test('createTally completado arranca lleno', () => {
  assert.deepEqual(createTally(8, true), { count: 8, total: 8, done: true });
});

test('los peces se mueven dentro del agua', () => {
  for (let i = 0; i < 5; i++) {
    for (const t of [0, 1.3, 7.9]) {
      const p = fishPosition(i, t, { x: 0.15, z: 0.15 });
      assert.ok(Math.hypot(p.x - 0.15, p.z - 0.15) < 0.6, `pez ${i} en t=${t}`);
    }
  }
  assert.notDeepEqual(fishPosition(0, 0), fishPosition(0, 1));
});

test('red atrapa los peces dentro del radio y no los ya atrapados', () => {
  const fish = [
    { index: 0, x: 0, z: 0, caught: false },
    { index: 1, x: 0.2, z: 0, caught: false },
    { index: 2, x: 0.05, z: 0.05, caught: true },
    { index: 3, x: 1, z: 1, caught: false },
  ];
  assert.deepEqual(fishInNet(fish, { x: 0, z: 0 }, 0.3), [0, 1]);
  assert.equal(nearestFish(fish, { x: 0.9, z: 0.9 }), 3);
  assert.equal(nearestFish(fish.map((f) => ({ ...f, caught: true })), { x: 0, z: 0 }), null);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../components/stage/dioramas/logic.js'`.

- [ ] **Step 3: Implementar `components/stage/dioramas/logic.js`**

```js
// Reglas de los dioramas. Puro: se prueba con `node --test`.
export function createTally(total, completed = false) {
  return { count: completed ? total : 0, total, done: completed };
}

export function tally(state, k = 1) {
  if (state.done) return { state, justCompleted: false };
  const count = Math.min(state.total, state.count + k);
  const done = count >= state.total;
  return { state: { ...state, count, done }, justCompleted: done };
}

export function fishPosition(i, t, center = { x: 0, z: 0 }) {
  const radius = 0.22 + 0.12 * (i % 3);
  const direction = i % 2 ? 1 : -1;
  const angle = t * (0.5 + 0.12 * i) * direction + i * 1.3;
  return { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius * 0.8 };
}

export function fishInNet(fish, target, radius) {
  return fish.filter((f) => !f.caught && Math.hypot(f.x - target.x, f.z - target.z) <= radius).map((f) => f.index);
}

export function nearestFish(fish, from) {
  let best = null;
  let bestDistance = Infinity;
  for (const f of fish) {
    if (f.caught) continue;
    const d = Math.hypot(f.x - from.x, f.z - from.z);
    if (d < bestDistance) { best = f.index; bestDistance = d; }
  }
  return best;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implementar `components/stage/dioramas/common.js`**

```js
import * as THREE from 'three';
import { DEPTH, LIFT_FOCUS } from '../mapMesh.js';

export const DIORAMA_Y = DEPTH + LIFT_FOCUS + 0.03;

export function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...extra });
}

export function createDioramaBase(origin, groundColor) {
  const group = new THREE.Group();
  group.position.set(origin.x, DIORAMA_Y, origin.z);
  group.scale.setScalar(0.001); // crece al aparecer (growIn)
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.08, 9), mat(groundColor));
  ground.position.y = 0.04;
  group.add(ground);
  return { group };
}

export function growIn(group, dt) {
  group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, 1, 6, dt));
}

export function makeTree(color = '#2f4a33') {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 5), mat('#4a3626'));
  trunk.position.y = 0.06;
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), mat(color));
  top.position.y = 0.25;
  tree.add(trunk, top);
  return tree;
}

export function createBurst(parent, color, count = 40) {
  const positions = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const life = new Float32Array(count);
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = -10;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 0.04, transparent: true, depthWrite: false }));
  points.frustumCulled = false;
  parent.add(points);
  return {
    burst(at) {
      for (let i = 0; i < count; i++) {
        positions.set([at.x, at.y, at.z], i * 3);
        velocity.set([(Math.random() - 0.5) * 1.2, Math.random() * 1.4, (Math.random() - 0.5) * 1.2], i * 3);
        life[i] = 0.6 + Math.random() * 0.4;
      }
    },
    update(dt) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        velocity[i * 3 + 1] -= 3 * dt;
        for (let k = 0; k < 3; k++) positions[i * 3 + k] += velocity[i * 3 + k] * dt;
        if (life[i] <= 0) positions[i * 3 + 1] = -10;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

export function disposeObject(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
  root.removeFromParent();
}
```

- [ ] **Step 6: Implementar `components/stage/dioramas/district12.js`**

```js
import * as THREE from 'three';
import { createBurst, createDioramaBase, disposeObject, growIn, makeTree, mat } from './common.js';
import { createTally, tally } from './logic.js';

const HITS = 8;

export function buildDistrict12({ origin, completed, onProgress, onComplete, sfx, rig }) {
  const { group } = createDioramaBase(origin, '#2b2622');

  // Cerro con boca de mina
  const hill = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.75, 6), mat('#3b342e'));
  hill.position.set(-0.3, 0.45, -0.35);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.06), mat('#0c0a09'));
  mouth.position.set(-0.3, 0.21, 0.02);
  group.add(hill, mouth);
  const beam = mat('#6b4a2b');
  for (const x of [-0.17, 0.17]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), beam);
    post.position.set(-0.3 + x, 0.23, 0.06);
    group.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.05), beam);
  lintel.position.set(-0.3, 0.39, 0.06);
  group.add(lintel);

  // Alambrado y el bosque detrás (la Pradera)
  const metal = mat('#8a8a8a', { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 9; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), metal);
    post.position.set(-0.8 + i * 0.2, 0.19, -0.83);
    group.add(post);
  }
  const wire = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.006, 0.006), metal);
  wire.position.set(0, 0.25, -0.83);
  group.add(wire);
  for (let i = 0; i < 7; i++) {
    const tree = makeTree();
    tree.position.set(-0.75 + i * 0.25, 0.08, -0.98 + (i % 2) * 0.06);
    tree.scale.setScalar(0.8 + (i % 3) * 0.15);
    group.add(tree);
  }

  // Veta de carbón (el objetivo)
  const seam = new THREE.Group();
  seam.position.set(0.38, 0.12, 0.28);
  group.add(seam);
  const coal = mat('#141414', { metalness: 0.45, roughness: 0.45 });
  const rocks = Array.from({ length: HITS - 1 }, (_, i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075 + (i % 3) * 0.02, 0), coal);
    const angle = (i / (HITS - 1)) * Math.PI * 2;
    rock.position.set(Math.cos(angle) * 0.1, 0.03 + (i % 2) * 0.07, Math.sin(angle) * 0.08);
    seam.add(rock);
    return rock;
  });
  const ember = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.06, 1),
    new THREE.MeshStandardMaterial({ color: '#ff7a2f', emissive: '#ff4d00', emissiveIntensity: 2.2 }),
  );
  ember.position.y = 0.06;
  seam.add(ember);
  const emberLight = new THREE.PointLight('#ff6a1a', 0, 1.6);
  emberLight.position.y = 0.2;
  seam.add(emberLight);
  const dust = createBurst(group, '#8c8c8c');

  let state = createTally(HITS, completed);
  function syncVisuals() {
    rocks.forEach((rock, i) => { rock.visible = i >= state.count; });
    ember.visible = state.done;
  }
  syncVisuals();

  function hit() {
    if (state.done) return;
    const result = tally(state, 1);
    state = result.state;
    sfx.play('pick');
    rig.shake(0.05);
    dust.burst(new THREE.Vector3(seam.position.x, 0.2, seam.position.z));
    syncVisuals();
    onProgress(state.count / state.total);
    if (result.justCompleted) { sfx.play('ignite'); onComplete(); }
  }
  const overSeam = (raycaster) => raycaster.intersectObject(seam, true).length > 0;

  return {
    group,
    update(dt, elapsed) {
      growIn(group, dt);
      dust.update(dt);
      emberLight.intensity = state.done ? 1.4 + Math.sin(elapsed * 6) * 0.4 : 0;
      ember.scale.setScalar(state.done ? 1 + Math.sin(elapsed * 6) * 0.08 : 1);
    },
    pointerDown(raycaster) { if (overSeam(raycaster)) hit(); },
    pointerMove(raycaster) { return !state.done && overSeam(raycaster); },
    pointerUp() {},
    performAction: hit,
    dispose() { disposeObject(group); },
  };
}
```

- [ ] **Step 7: Registrar el diorama en `components/stage/dioramas/index.js`**

```js
import { buildDistrict12 } from './district12.js';

// id del distrito → función build del diorama (ver contrato en el plan, Tarea 5).
export const DIORAMAS = {
  12: buildDistrict12,
};
```

- [ ] **Step 8: Lint, tests, build y prueba manual**

Run: `npm run lint && npm test && npm run build`
Expected: sin errores.

En `npm run dev`:
1. Entrar al 12 desde el mapa: el diorama crece sobre la pieza elevada (cerro, mina, alambrado, árboles, veta).
2. El cursor cambia a mano sobre la veta. Cada clic suena a golpe, tiembla la cámara, sale polvo, desaparece una piedra y avanza la barra.
3. Con 8 golpes aparece la brasa que late, sale la chispa hacia el Capitolio, aparece el aviso "Emblema del Distrito 12 · 1/3", la percusión entra a la música y el panel dice "Emblema obtenido".
4. Volver al mapa: el 12 está naranja y brilla. Volver a entrar: el diorama está completo y no se repite.
5. Reiniciar y repetir usando solo el botón "Picar" con el teclado (8 veces).

- [ ] **Step 9: Commit**

```bash
git add components/stage/dioramas tests/dioramas.test.mjs
git commit -m "feat: diorama del Distrito 12 con la veta de carbón y la brasa"
```

---

### Task 9: Distrito 11 (cosecha y silbido)

**Files:**
- Create: `components/stage/dioramas/district11.js`
- Modify: `components/stage/dioramas/index.js`

**Interfaces:**
- Consumes: `common.js`, `logic.js` (Task 8); `sfx.play('harvest' | 'whistle')` (Task 4).
- Produces: `buildDistrict11(...)` con el contrato de la Tarea 5. 24 espigas; `performAction()` cosecha 6.

- [ ] **Step 1: Implementar `components/stage/dioramas/district11.js`**

```js
import * as THREE from 'three';
import { createBurst, createDioramaBase, disposeObject, growIn, mat } from './common.js';
import { createTally, tally } from './logic.js';

const STALKS = 24;
const PER_ACTION = 6;

function makeTower(x, z) {
  const tower = new THREE.Group();
  const wood = mat('#5a4a3a');
  for (const [dx, dz] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.45, 0.015), wood);
    leg.position.set(dx, 0.225, dz);
    tower.add(leg);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), wood);
  cabin.position.y = 0.48;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.08, 4), mat('#3a2f25'));
  roof.position.y = 0.56;
  roof.rotation.y = Math.PI / 4;
  tower.add(cabin, roof);
  tower.position.set(x, 0.08, z);
  return tower;
}

function makeBird() {
  const bird = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), mat('#1d2b3a'));
  bird.rotation.z = Math.PI / 2;
  bird.visible = false;
  return bird;
}

export function buildDistrict11({ origin, completed, onProgress, onComplete, sfx }) {
  const { group } = createDioramaBase(origin, '#3d3526');

  // Huerto al fondo
  const leaf = mat('#3f6b3a');
  for (let i = 0; i < 6; i++) {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), leaf);
    bush.position.set(-0.6 + i * 0.24, 0.14, -0.78);
    group.add(bush);
  }
  // Torres de vigilancia con sinsajos
  const towers = [makeTower(-0.78, -0.55), makeTower(0.78, -0.55)];
  const birds = towers.map((tower) => {
    const bird = makeBird();
    bird.position.set(tower.position.x, 0.68, tower.position.z);
    bird.userData.baseY = bird.position.y;
    group.add(tower, bird);
    return bird;
  });

  // Campo de trigo
  const field = new THREE.Group();
  field.position.set(0, 0.08, 0.15);
  group.add(field);
  const stemMat = mat('#a88b3c');
  const headMat = mat('#e8c25a', { emissive: '#3a2a00' });
  const cutMat = mat('#6b5a2a');
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const stalks = Array.from({ length: STALKS }, (_, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const stalk = new THREE.Group();
    stalk.position.set(-0.55 + col * 0.22 + (row % 2) * 0.06, 0, -0.3 + row * 0.2);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.22, 4), stemMat);
    stem.position.y = 0.11;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), headMat);
    head.position.y = 0.25;
    // Caja invisible más grande para que sea fácil rozarla con el puntero o el dedo
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.2), hitMat);
    hit.position.y = 0.15;
    hit.userData.index = i;
    stalk.add(stem, head, hit);
    field.add(stalk);
    return { stalk, stem, head, hit, harvested: false };
  });
  const hitBoxes = stalks.map((s) => s.hit);
  const sparkles = createBurst(group, '#ffd36b');

  function cut(s) {
    s.harvested = true;
    s.head.visible = false;
    s.stem.material = cutMat;
    s.stem.scale.y = 0.35;
    s.stem.position.y = 0.04;
    s.stalk.rotation.z = 0;
  }

  let state = createTally(STALKS, completed);
  let singing = completed;
  if (completed) stalks.forEach(cut);
  birds.forEach((b) => { b.visible = singing; });

  function harvest(list) {
    if (state.done) return;
    const fresh = list.filter((s) => !s.harvested);
    if (!fresh.length) return;
    fresh.forEach((s) => {
      cut(s);
      sparkles.burst(new THREE.Vector3(field.position.x + s.stalk.position.x, 0.3, field.position.z + s.stalk.position.z));
    });
    sfx.play('harvest');
    const result = tally(state, fresh.length);
    state = result.state;
    onProgress(state.count / state.total);
    if (result.justCompleted) {
      singing = true;
      birds.forEach((b) => { b.visible = true; });
      sfx.play('whistle');
      onComplete();
    }
  }

  function sweep(raycaster) {
    const hit = raycaster.intersectObjects(hitBoxes, false)[0];
    if (!hit) return false;
    harvest([stalks[hit.object.userData.index]]);
    return !state.done;
  }

  return {
    group,
    update(dt, elapsed) {
      growIn(group, dt);
      sparkles.update(dt);
      stalks.forEach((s, i) => { if (!s.harvested) s.stalk.rotation.z = Math.sin(elapsed * 1.6 + i) * 0.06; });
      if (singing) birds.forEach((b, i) => { b.position.y = b.userData.baseY + Math.abs(Math.sin(elapsed * 5 + i)) * 0.04; });
    },
    pointerDown: sweep,
    pointerMove: sweep,
    pointerUp() {},
    performAction() { harvest(stalks.filter((s) => !s.harvested).slice(0, PER_ACTION)); },
    dispose() { disposeObject(group); },
  };
}
```

- [ ] **Step 2: Registrar en `components/stage/dioramas/index.js`**

```js
import { buildDistrict12 } from './district12.js';
import { buildDistrict11 } from './district11.js';

// id del distrito → función build del diorama (ver contrato en el plan, Tarea 5).
export const DIORAMAS = {
  12: buildDistrict12,
  11: buildDistrict11,
};
```

- [ ] **Step 3: Lint, tests, build y prueba manual**

Run: `npm run lint && npm test && npm run build`
Expected: sin errores.

En `npm run dev`:
1. Entrar al 11: hay campo de trigo que se mece, huerto y dos torres.
2. Pasar el mouse sobre las espigas las cosecha (crujido y partículas doradas) y avanza la barra.
3. Al 100% suena el motivo de 4 notas y lo repiten los sinsajos arriba de las torres, que se mueven. Entra la capa "silbido" a la música.
4. Con el emulador de celular (`resize_window` mobile), arrastrar el dedo cosecha sin que la página haga scroll.
5. El botón "Cosechar" completa el distrito en 4 pulsaciones.

- [ ] **Step 4: Commit**

```bash
git add components/stage/dioramas/district11.js components/stage/dioramas/index.js
git commit -m "feat: diorama del Distrito 11 con cosecha y silbido de los sinsajos"
```

---

### Task 10: Distrito 4 (la red)

**Files:**
- Create: `components/stage/dioramas/district4.js`
- Modify: `components/stage/dioramas/index.js`

**Interfaces:**
- Consumes: `common.js`, `logic.js` (`fishPosition`, `fishInNet`, `nearestFish`, `createTally`, `tally`) (Task 8).
- Produces: `buildDistrict4(...)` con el contrato de la Tarea 5. Hay que atrapar 3 de 5 peces. `performAction()` lanza la red hacia donde va a estar el pez más cercano cuando la red caiga (atrapa siempre).

- [ ] **Step 1: Implementar `components/stage/dioramas/district4.js`**

```js
import * as THREE from 'three';
import { createDioramaBase, disposeObject, growIn, mat } from './common.js';
import { createTally, fishInNet, fishPosition, nearestFish, tally } from './logic.js';

const TO_CATCH = 3;
const FISH = 5;
const NET_RADIUS = 0.3;
const THROW_SECONDS = 0.55;
const WATER_CENTER = { x: 0.15, z: 0.15 };
const WATER_Y = 0.09;

export function buildDistrict4({ origin, completed, onProgress, onComplete, sfx }) {
  const { group } = createDioramaBase(origin, '#c8b88a');

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 32),
    new THREE.MeshStandardMaterial({ color: '#2f6f8f', transparent: true, opacity: 0.88, roughness: 0.2, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(WATER_CENTER.x, 0.085, WATER_CENTER.z);
  group.add(water);

  // Muelle
  const plank = mat('#7a5a3a');
  for (let i = 0; i < 5; i++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.18), plank);
    board.position.set(-0.85 + i * 0.1, 0.12, 0);
    group.add(board);
  }
  const dockTip = new THREE.Vector3(-0.42, 0.14, 0);

  // Botes
  const boats = [[0.55, -0.35], [-0.1, 0.62]].map(([x, z], i) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08), mat('#8b4a2b'));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4), plank);
    mast.position.y = 0.12;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 3), mat('#e8e2cc'));
    sail.position.set(0.03, 0.12, 0);
    boat.add(hull, mast, sail);
    boat.position.set(x, 0.1, z);
    boat.rotation.y = i * 1.2;
    group.add(boat);
    return boat;
  });

  // Peces
  const fishMat = mat('#d9e6ef', { metalness: 0.3 });
  const fish = Array.from({ length: FISH }, (_, index) => ({ index, x: 0, z: 0, caught: false }));
  const fishMeshes = fish.map(() => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 4), fishMat);
    m.rotation.z = Math.PI / 2;
    group.add(m);
    return m;
  });

  // Red, mira y salpicadura
  const net = new THREE.Mesh(new THREE.TorusGeometry(NET_RADIUS, 0.012, 4, 32), mat('#e8e2cc'));
  net.rotation.x = -Math.PI / 2;
  net.visible = false;
  const aim = new THREE.Mesh(
    new THREE.RingGeometry(NET_RADIUS * 0.9, NET_RADIUS, 32),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  );
  aim.rotation.x = -Math.PI / 2;
  aim.visible = false;
  const splash = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.08, 32),
    new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  splash.rotation.x = -Math.PI / 2;
  group.add(net, aim, splash);

  let state = createTally(TO_CATCH, completed);
  if (completed) fish.slice(0, TO_CATCH).forEach((f, i) => { f.caught = true; fishMeshes[i].visible = false; });
  let aiming = false;
  let throwing = null;
  let netTimer = 0;
  let clock = 0;
  const local = new THREE.Vector3();

  function waterPoint(raycaster) {
    const hit = raycaster.intersectObject(water, false)[0];
    if (!hit) return null;
    return group.worldToLocal(local.copy(hit.point)).clone();
  }

  function throwNet(target) {
    if (state.done || throwing) return;
    throwing = { from: dockTip.clone(), to: new THREE.Vector3(target.x, WATER_Y, target.z), t: 0 };
    net.visible = true;
    netTimer = 0;
    sfx.play('throw');
  }

  function land(target) {
    sfx.play('splash');
    splash.position.set(target.x, WATER_Y + 0.005, target.z);
    splash.scale.setScalar(1);
    splash.material.opacity = 0.8;
    const caught = fishInNet(fish, target, NET_RADIUS);
    caught.forEach((i) => { fish[i].caught = true; fishMeshes[i].visible = false; });
    netTimer = 0.6;
    if (!caught.length) return;
    const result = tally(state, caught.length);
    state = result.state;
    onProgress(state.count / state.total);
    if (result.justCompleted) { sfx.play('ignite'); onComplete(); }
  }

  return {
    group,
    update(dt, elapsed) {
      clock = elapsed;
      growIn(group, dt);
      fish.forEach((f, i) => {
        if (f.caught) return;
        const p = fishPosition(i, elapsed, WATER_CENTER);
        const m = fishMeshes[i];
        m.rotation.y = -Math.atan2(p.z - f.z, p.x - f.x);
        f.x = p.x; f.z = p.z;
        m.position.set(p.x, 0.07, p.z);
      });
      boats.forEach((b, i) => { b.position.y = 0.1 + Math.sin(elapsed * 2 + i) * 0.01; });
      if (throwing) {
        throwing.t = Math.min(1, throwing.t + dt / THROW_SECONDS);
        const t = throwing.t;
        net.position.lerpVectors(throwing.from, throwing.to, t);
        net.position.y = WATER_Y + Math.sin(t * Math.PI) * 0.45;
        net.scale.setScalar(0.4 + 0.6 * t);
        if (t >= 1) { const target = throwing.to; throwing = null; land(target); }
      }
      if (netTimer > 0) { netTimer -= dt; if (netTimer <= 0) net.visible = false; }
      if (splash.material.opacity > 0) {
        splash.scale.multiplyScalar(1 + dt * 2.5);
        splash.material.opacity = Math.max(0, splash.material.opacity - dt * 1.2);
      }
    },
    pointerDown(raycaster) {
      if (state.done) return;
      const p = waterPoint(raycaster);
      if (!p) return;
      aiming = true;
      aim.visible = true;
      aim.position.set(p.x, WATER_Y + 0.01, p.z);
    },
    pointerMove(raycaster) {
      const p = waterPoint(raycaster);
      if (aiming && p) aim.position.set(p.x, WATER_Y + 0.01, p.z);
      return !state.done && !!p;
    },
    pointerUp(raycaster) {
      if (!aiming) return;
      aiming = false;
      aim.visible = false;
      const p = waterPoint(raycaster);
      if (p) throwNet(p);
    },
    performAction() {
      if (state.done || throwing) return;
      const i = nearestFish(fish, dockTip);
      if (i === null) return;
      throwNet(fishPosition(i, clock + THROW_SECONDS, WATER_CENTER));
    },
    dispose() { disposeObject(group); },
  };
}
```

- [ ] **Step 2: Registrar en `components/stage/dioramas/index.js`**

```js
import { buildDistrict12 } from './district12.js';
import { buildDistrict11 } from './district11.js';
import { buildDistrict4 } from './district4.js';

// id del distrito → función build del diorama (ver contrato en el plan, Tarea 5).
export const DIORAMAS = {
  12: buildDistrict12,
  11: buildDistrict11,
  4: buildDistrict4,
};
```

- [ ] **Step 3: Lint, tests, build y prueba manual**

Run: `npm run lint && npm test && npm run build`
Expected: sin errores.

En `npm run dev`:
1. Entrar al 4: hay costa, agua, muelle, dos botes que se mecen y cinco peces nadando.
2. Mantener presionado sobre el agua muestra el anillo de mira, que sigue al puntero. Al soltar, la red vuela en arco desde el muelle, salpica y atrapa los peces que quedan dentro (desaparecen y avanza la barra).
3. Con 3 peces: sale la chispa, aparece el emblema y entra el pad a la música.
4. Con el botón "Lanzar red" se atrapa 1 pez por pulsación (3 pulsaciones).
5. En el emulador de celular, apuntar y soltar con el dedo funciona.

- [ ] **Step 4: Commit**

```bash
git add components/stage/dioramas/district4.js components/stage/dioramas/index.js
git commit -m "feat: diorama del Distrito 4 con la red y los peces"
```

---

### Task 11: El Capitolio (decisión y final)

**Files:**
- Create: `components/panem/CapitolFinale.js`, `app/(panem)/capitolio/page.js`
- Modify: `app/globals.css` (estilos al final)

**Interfaces:**
- Consumes: `usePanem()` (`progress.chooseFinalMessage`, `stageApiRef.current.playFinale(onDone)`, `cancelFinale()`, `setFinalePlaying`, `sfx`, `notify`, `resetAll`) y `canEnterCapitol`.
- Produces: la ruta `/capitolio` con las fases `choose → broadcast → lighting → end`.

- [ ] **Step 1: Crear `components/panem/CapitolFinale.js`**

```js
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { canEnterCapitol } from '@/lib/progress';
import { usePanem } from './PanemProvider';

const MESSAGES = {
  rebelion: {
    label: 'Encender la rebelión',
    title: 'Panem ya no está a oscuras.',
    body: 'La señal recorrió los distritos uno por uno. Ningún Agente de la Paz puede apagar trece fuegos al mismo tiempo.',
  },
  memoria: {
    label: 'Recordar a los caídos',
    title: 'Panem recuerda.',
    body: 'La transmisión no habla de victorias: nombra a cada tributo que el Capitolio quiso borrar. Mientras alguien recuerde, la chispa sigue encendida.',
  },
};
const BROADCAST_MS = 2600;

export default function CapitolFinale() {
  const router = useRouter();
  const { progress, stageApiRef, setFinalePlaying, sfx, notify, resetAll } = usePanem();
  const [phase, setPhase] = useState('choose');
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);
  const allowed = canEnterCapitol(progress);

  useEffect(() => {
    if (progress.ready && !allowed) {
      notify(`El Capitolio está blindado · ${progress.litDistricts.length}/3 emblemas`);
      router.replace('/mapa');
    }
  }, [progress.ready, allowed, progress.litDistricts.length, notify, router]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    stageApiRef.current?.cancelFinale();
    setFinalePlaying(false);
  }, [stageApiRef, setFinalePlaying]);

  if (!progress.ready || !allowed) {
    return <section className="panel capitol-panel" aria-busy="true"><p className="eyebrow">VERIFICANDO CREDENCIALES…</p></section>;
  }

  const shownPhase = progress.finalMessage && phase === 'choose' ? 'end' : phase;

  function choose(message) {
    progress.chooseFinalMessage(message);
    setFinalePlaying(true);
    setPhase('broadcast');
    sfx.play('glitch');
    timerRef.current = window.setTimeout(() => {
      setPhase('lighting');
      const finish = () => { setFinalePlaying(false); setPhase('end'); };
      const api = stageApiRef.current;
      if (api) api.playFinale(finish); else finish();
    }, BROADCAST_MS);
  }

  if (shownPhase === 'choose') {
    return (
      <section className="panel capitol-panel crt-lite" aria-labelledby="capitol-title">
        <p className="eyebrow">CAPITOLIO · SALA DE TRANSMISIÓN</p>
        <h1 id="capitol-title">La señal está lista.</h1>
        <p>Tres distritos encendidos alcanzan para tomar la transmisión oficial. ¿Qué mensaje va a escuchar Panem?</p>
        <div className="choices">
          {Object.entries(MESSAGES).map(([key, m]) => (
            <button key={key} type="button" className="primary" onClick={() => choose(key)}>{m.label}</button>
          ))}
        </div>
        <Link href="/mapa" className="back">← Todavía no</Link>
      </section>
    );
  }

  if (shownPhase === 'broadcast') {
    return (
      <section className="crt broadcast" role="status" aria-live="assertive">
        <div className="crt-inner">
          <p className="eyebrow">INTERRUPCIÓN DE LA SEÑAL OFICIAL</p>
          <h1 className="glitch-text">EL SINSAJO TOMA LA TRANSMISIÓN</h1>
        </div>
      </section>
    );
  }

  if (shownPhase === 'lighting') {
    return <p className="lighting-caption" role="status">Panem se enciende…</p>;
  }

  const message = MESSAGES[progress.finalMessage];
  return (
    <section className="panel capitol-panel end" aria-labelledby="end-title">
      <p className="eyebrow">FIN DE LA TRANSMISIÓN · {message.label.toUpperCase()}</p>
      <h1 id="end-title">{message.title}</h1>
      <p>{message.body}</p>
      <p>Y en el noreste, donde el mapa oficial decía que no quedaba nada, una luz respondió: el Distrito 13.</p>
      <div className="choices">
        <Link href="/mapa" className="primary">Ver Panem encendido</Link>
        {confirming ? (
          <>
            <button type="button" onClick={() => resetAll()}>Sí, apagar todo y empezar de nuevo</button>
            <button type="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}>Volver a empezar</button>
        )}
      </div>
      <details className="credits">
        <summary>Créditos</summary>
        <p>
          Experiencia de fans sin fines comerciales, realizada para Programación Multimedial III (UMAI). <cite>The Hunger Games</cite> © Suzanne Collins / Scholastic; películas © Lionsgate.
          Mapa basado en una ilustración de referencia de fans (ver README). Música y sonidos generados por código.
          Tipografías Oswald e Inter (SIL Open Font License).
        </p>
      </details>
    </section>
  );
}
```

- [ ] **Step 2: Crear `app/(panem)/capitolio/page.js`**

```js
import CapitolFinale from '@/components/panem/CapitolFinale';

export const metadata = {
  title: 'Capitolio',
  description: 'Tomá la transmisión oficial y decidí qué mensaje escucha Panem.',
};

export default function CapitolPage() {
  return <CapitolFinale />;
}
```

- [ ] **Step 3: Agregar estilos al final de `app/globals.css`**

```css
/* Capitolio */
.capitol-panel { border-top-color: var(--capitol); }
.crt-lite { background: linear-gradient(#2a0b0bf0, #141416f0); }
.choices { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0; }
.broadcast { z-index: 4; animation: broadcast-flash 2.6s steps(12) forwards; }
.glitch-text { animation: glitch 0.25s steps(2) infinite; }
.lighting-caption { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); font-family: var(--font-display); letter-spacing: 0.3em; color: var(--spark); }
.credits { margin-top: 18px; font-size: 13px; color: var(--muted); }
.credits summary { cursor: pointer; font-family: var(--font-display); letter-spacing: 0.15em; }
@keyframes glitch { 0% { transform: translate(2px, 0); text-shadow: -3px 0 var(--capitol), 3px 0 #3bd6ff; } 100% { transform: translate(-2px, 1px); text-shadow: 3px 0 var(--capitol), -3px 0 #3bd6ff; } }
@keyframes broadcast-flash { 0% { opacity: 0; } 10% { opacity: 1; } 85% { opacity: 1; filter: none; } 100% { opacity: 0; filter: brightness(3); } }
```

- [ ] **Step 4: Lint, tests, build y prueba manual**

Run: `npm run lint && npm test && npm run build`
Expected: sin errores. El build lista `/capitolio`.

En `npm run dev`:
1. Con 0/3, abrir `/capitolio` a mano: aparece "VERIFICANDO…", después el aviso "blindado · 0/3" y redirige a `/mapa`.
2. Completar los 3 distritos (con los botones alternativos es más rápido). En el mapa, "C" lleva a `/capitolio` y se ven las dos opciones.
3. Elegir "Encender la rebelión":
   - aparece la pantalla CRT con glitch durante unos 2,5 s;
   - la cámara se abre a todo Panem;
   - las piezas se encienden desde el Capitolio hacia afuera con chispas;
   - el 13 se enciende al final, después de una pausa;
   - suena el tema completo con más percusión;
   - aparece el texto final.
4. Recargar `/capitolio`: aparece directamente el texto final, con el mapa entero encendido.
5. "Volver a empezar" pide confirmación, apaga Panem y vuelve a `/`.
6. Repetir eligiendo "Recordar a los caídos": la música queda sin percusión y el silbido es más lento.

- [ ] **Step 5: Commit**

```bash
git add components/panem/CapitolFinale.js "app/(panem)/capitolio/page.js" app/globals.css
git commit -m "feat: final en el Capitolio con decisión persistida y Panem encendido"
```

---

### Task 12: Robustez, accesibilidad y verificación integral

**Files:**
- Modify: solo lo que la verificación encuentre roto (registrar cada arreglo en el commit).

**Interfaces:**
- Consumes: todo lo anterior. `window.__panemInfo()` (solo en desarrollo) devuelve `{ canvases, geometries, textures, programs }`.

- [ ] **Step 1: Prueba de recursos (Strict Mode y navegación)**

En `npm run dev`, con la consola del navegador (o `mcp__Claude_Browser__javascript_tool`):
1. En `/mapa`, ejecutar `window.__panemInfo()` y anotar los valores.
2. Navegar 10 veces entre `/mapa` → `/distrito/12` → `/mapa` → `/distrito/11` → `/mapa` → `/distrito/4` (con clics, no recargas).
3. Volver a `/mapa` y ejecutar `window.__panemInfo()`.

Expected:
- `canvases === 1` siempre;
- `geometries` y `textures` vuelven al mismo valor que en el paso 1, con una diferencia de ±2 como máximo;
- `programs` no crece después de la primera visita a cada diorama.

Si crece, buscar en el diorama correspondiente qué geometría o material no pasa por `disposeObject`.

- [ ] **Step 2: Sin WebGL**

En una pestaña nueva, abrir `/mapa` con WebGL deshabilitado. Por ejemplo, ejecutar antes de cargar, vía `javascript_tool`:

```js
HTMLCanvasElement.prototype.getContext = () => null;
```

y navegar con el router. Otra opción es Chrome con `--disable-webgl`.

Expected:
- aparece el aviso "Tu navegador no puede mostrar el mapa 3D";
- el dial funciona;
- en `/distrito/12`, el botón "Picar" ×8 completa el distrito;
- con los 3 completos se puede llegar al final, que muestra los textos sin animación 3D.

- [ ] **Step 3: Teclado y lector de pantalla**

Recorrer intro → mapa → 12 → 11 → 4 → Capitolio → final **solo con Tab, Enter y Espacio**.

Expected:
- todo foco es visible (contorno naranja);
- el dial anuncia "Distrito 12, Carbón: guarda una chispa";
- la barra tiene `role="progressbar"` con su valor;
- los avisos se leen gracias a `aria-live`.

- [ ] **Step 4: Movimiento reducido**

Emular `prefers-reduced-motion: reduce` (DevTools > Rendering).

Expected:
- las transiciones de cámara duran alrededor de 0,4 s;
- el 12 no hace temblar la cámara;
- las animaciones CSS quedan casi instantáneas.

- [ ] **Step 5: Celular**

Con `mcp__Claude_Browser__resize_window` en preset `mobile` y recargando:
- el mapa entra completo (cámara más alejada);
- el dial es una fila desplazable abajo;
- el panel del distrito es una hoja inferior;
- 11 y 4 funcionan con touch sin hacer scroll de la página;
- el header no se superpone con el contenido.

Volver a `preset: desktop` al terminar.

- [ ] **Step 6: Recargas y rutas**

Recargar en cada ruta (`/`, `/mapa`, `/distrito/1`…`/distrito/13`, `/capitolio`). Expected:
- sin errores en consola;
- la cámara queda en la pose correcta;
- `/distrito/99`, `/distrito/c` y `/distrito/abc` dan el 404 propio.

- [ ] **Step 7: Persistencia LOCAL y NUBE**

- **Sin `.env.local`:** completar el 12, recargar y comprobar que sigue encendido (`○ LOCAL`).
- **Con `.env.local` del proyecto Firebase del equipo** (pedirlo; no inventar claves) y las reglas publicadas:
  - el indicador pasa a `● NUBE`;
  - en Firestore, `progress/{uid}` tiene `litDistricts`, `visited`, `finalMessage` y `completedAt`;
  - en el Rules Playground, escribir `litDistricts: ['7']` es rechazado.

- [ ] **Step 8: Lint, tests y build final**

Run: `npm run lint && npm test && npm run build`
Expected: todo sin errores.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "fix: ajustes de robustez, accesibilidad y responsive tras la verificación integral"
```

Si no hubo cambios, saltear el commit e informar "verificación sin hallazgos".

---

### Task 13: README, créditos y entrega

**Files:**
- Rewrite: `README.md`
- Modify: `GUIA-THREEJS.md` (solo la tabla final de "Archivos relacionados" y las menciones a `ThreeArtifact.js`)

**Interfaces:**
- Consumes: el proyecto terminado. No produce interfaces.

- [ ] **Step 1: Reescribir `README.md`**

```markdown
# Panem · La chispa

> Panem está a oscuras: llevá la chispa de distrito en distrito hasta que el Capitolio no pueda apagarla.

Experiencia web transmedia (TP6 · Programación Multimedial III · UMAI) inspirada en *The Hunger Games*.
Next.js 16 + Three.js + Firebase · JavaScript · App Router.

**Deploy:** <URL del deploy en Vercel>

## Sinopsis

Una transmisión oficial del Capitolio anuncia que Panem vive en paz. Al "encender la señal", la persona baja a un mapa 3D de Panem, gris y apagado. Puede explorar los trece distritos; tres de ellos guardan una chispa:

- **Distrito 12 · Carbón:** picar la veta hasta liberar una brasa.
- **Distrito 11 · Agricultura:** cosechar el trigo hasta que los sinsajos repiten un silbido.
- **Distrito 4 · Pesca:** lanzar la red y atrapar tres peces.

Cada distrito encendido otorga su emblema, cambia de color en el mapa y suma una capa a la música. Con los tres emblemas se desbloquea el Capitolio: allí se elige el mensaje (*Encender la rebelión* o *Recordar a los caídos*), se hackea la transmisión y Panem entero se enciende, incluido el Distrito 13, que el Capitolio declaraba inexistente.

## Mapa de navegación

```text
/  (Transmisión oficial)
 └─ "Encender la señal" → /mapa
      ├─ /distrito/12  diorama jugable → emblema 1
      ├─ /distrito/11  diorama jugable → emblema 2
      ├─ /distrito/4   diorama jugable → emblema 3
      ├─ /distrito/1…13 (resto)  ficha del distrito (el 13: archivo clasificado)
      └─ C → /capitolio  (requiere 3/3; si no, aviso y vuelta al mapa)
              └─ decisión → transmisión → Panem encendido → fin
```

## Requisitos de la consigna y dónde se cumplen

| Requisito | Implementación |
| --- | --- |
| Premisa, inicio, progresión y cierre | Intro CRT → mapa → 3 dioramas → Capitolio |
| ≥ 3 escenas | `/`, `/mapa`, `/distrito/[id]`, `/capitolio` + 3 dioramas |
| ≥ 3 coleccionables | Emblemas de los distritos 12, 11 y 4 |
| Desbloqueo | El Capitolio se abre con 3/3; cada distrito suma su capa musical |
| Feedback visual y sonoro | Elevación de las piezas, chispas, partículas, temblor, efectos y capas musicales |
| Ruta dinámica | `app/(panem)/distrito/[id]/page.js` (`generateStaticParams` + `dynamicParams = false`) |
| Server / Client Components | Las páginas (server) validan y generan metadata; el escenario, el audio y los overlays son client |
| Metadata, carga y error | `generateMetadata` por distrito, `loading.js`, `error.js`, `not-found.js` |
| Escena Three.js | `components/stage/panemScene.js`: escena, cámara, renderer, luces, RAF, raycasting, resize, pixel ratio ≤ 2, `dispose()` |
| Recurso propio | Mapa extruido desde un SVG trazado para el proyecto y sistema de partículas de la chispa (`effects.js`) |
| Alternativas accesibles | Dial de distritos con teclado; botón alternativo para cada interacción 3D; `prefers-reduced-motion` |
| Firebase | Auth anónima, Google y email; `progress/{uid}`; reglas por usuario; indicador NUBE/LOCAL |
| Responsive | Cámara más alejada, dial horizontal y panel en hoja inferior en celular; touch en todos los dioramas |

## Decisiones técnicas

- **Canvas persistente:** la escena y el audio viven en `app/(panem)/layout.js`. Los layouts no se re-renderizan al navegar, así que la cámara *vuela* entre rutas en lugar de recargar la escena. `usePathname()` traduce la URL a una pose de cámara (`lib/routes.js` + `components/stage/cameraPoses.js`).
- **Mapa desde SVG:** `scripts/extract_map.py` extrae las piezas de la imagen de referencia (flood fill + contornos con OpenCV) y genera `public/assets/panem.svg`, ajustable en Figma. En el navegador, `SVGLoader` y `ExtrudeGeometry` convierten cada `path#district-{id}` en una pieza 3D seleccionable por raycasting.
- **Audio procedural:** `lib/audio/` sintetiza todo con Web Audio: ambiente de viento y drone, un secuenciador a 80 BPM en re menor con tres capas (percusión, silbido y pad) sincronizadas por un único reloj, y los efectos. No hace falta ningún archivo de audio y no hay problemas de derechos. El motivo de 4 notas es original.
- **Dioramas desmontables:** cada distrito jugable se construye al entrar y se libera al salir (`components/stage/dioramas/`), con un contrato común (`build → { update, pointer*, performAction, dispose }`).
- **Lógica testeable:** datos, progreso, rutas, poses, partitura y reglas de los dioramas son módulos puros, probados con `node --test` (`npm test`).

## Puesta en marcha

Requiere Node.js 20 o posterior.

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

## Regenerar el mapa

```bash
python3 -m venv .venv-tools
.venv-tools/bin/pip install "numpy==1.26.4" "opencv-python-headless==4.10.0.84"
.venv-tools/bin/python scripts/extract_map.py
```

Para ajustarlo en Figma: importar `public/assets/panem.svg`, no renombrar las capas `district-*` y exportar como SVG con "Include 'id' attribute".

## Scripts

```bash
npm run dev     # desarrollo
npm test        # tests de lógica (node --test)
npm run lint    # ESLint
npm run build   # build de producción
```

## Créditos

- *The Hunger Games* (Los juegos del hambre) © Suzanne Collins / Scholastic. Películas © Lionsgate. Proyecto de fans **con fines exclusivamente académicos y sin fines comerciales**. Los textos de la experiencia son originales.
- Mapa e íconos de distritos: basados en una ilustración de fans del mapa de Panem (`docs/reference/panem-map.webp`), aportada por el equipo como referencia. <Completar autoría/fuente original de la imagen.>
- Referencias visuales: Hunger Games: The Exhibition (Nueva York), "Antique map to 3D model" (awwwards) y el board "interactive web" del equipo.
- Tipografías: Oswald (Vernon Adams) e Inter (Rasmus Andersson), SIL Open Font License, vía Google Fonts.
- Música y efectos: sintetizados por código con Web Audio API.
- Desarrollo: Mia y Lola · Programación Multimedial III · UMAI · 2026.
```

- [ ] **Step 2: Actualizar `GUIA-THREEJS.md`**

- Reemplazar cada mención de `components/ThreeArtifact.js` por `components/stage/panemScene.js`.
- Reemplazar la tabla de la sección "23. Archivos relacionados" por:

```markdown
| Archivo | Función |
| --- | --- |
| `components/stage/panemScene.js` | Renderer, escena, cámara, loop, puntero, ciclo de vida |
| `components/stage/mapMesh.js` | SVG → piezas extruidas del mapa |
| `components/stage/cameraRig.js` / `cameraPoses.js` | Transiciones y poses de cámara |
| `components/stage/effects.js` | Partículas de la chispa |
| `components/stage/dioramas/` | Escenas jugables de los distritos 12, 11 y 4 |
| `components/panem/PanemStage.js` | Integración de la escena con React |
| `components/panem/PanemProvider.js` | Estado narrativo, audio y progreso |
| `app/(panem)/distrito/[id]/page.js` | Ruta dinámica de cada distrito |
| `hooks/useProgress.js` | Persistencia del progreso |
```

- [ ] **Step 3: Verificación final**

Run: `npm run lint && npm test && npm run build`
Expected: todo sin errores.

- [ ] **Step 4: Commit**

```bash
git add README.md GUIA-THREEJS.md
git commit -m "docs: README de Panem · La chispa con mapa de navegación y créditos"
```

- [ ] **Step 5: Avisar al equipo lo que queda pendiente de su lado**

> - Completar la URL del deploy en el README. El deploy se hace en Vercel con las variables de `.env.local`.
> - Completar la autoría de la imagen de referencia del mapa en "Créditos".
> - Publicar `firestore.rules` en la consola de Firebase.
```
