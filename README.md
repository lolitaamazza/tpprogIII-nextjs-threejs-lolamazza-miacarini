# Panem · La chispa

> Panem está a oscuras: llevá la chispa de distrito en distrito hasta que el Capitolio no pueda apagarla.

Experiencia web transmedia (TP6 · Programación Multimedial III · UMAI) inspirada en *The Hunger Games*.
Next.js 16 + Three.js + Firebase · JavaScript · App Router.

**Deploy:** _pendiente: completar con la URL pública (Vercel)_

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
| Recurso propio | Mapa extruido desde un SVG vectorizado a partir de la imagen de referencia y sistema de partículas de la chispa (`effects.js`) |
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

## Documentación del proceso

- Consigna original del TP6: [`docs/consigna-tp6.md`](docs/consigna-tp6.md).
- Diseño (concepto, rutas, escena, audio, datos): [`docs/superpowers/specs/panem-design.md`](docs/superpowers/specs/panem-design.md).
- Plan de implementación por tareas: [`docs/superpowers/plans/panem-plan-implementacion.md`](docs/superpowers/plans/panem-plan-implementacion.md).
- Imagen de referencia del mapa y su extracción: `docs/reference/`.

## Créditos

- *The Hunger Games* (Los juegos del hambre) © Suzanne Collins / Scholastic. Películas © Lionsgate. Proyecto de fans **con fines exclusivamente académicos y sin fines comerciales**. Los textos de la experiencia son originales.
- Mapa e íconos de distritos: basados en una ilustración de fans del mapa de Panem (`docs/reference/panem-map.webp`), aportada por el equipo como referencia. _Pendiente: completar la autoría y la fuente original de la imagen._
- Referencias visuales: Hunger Games: The Exhibition (Nueva York), "Antique map to 3D model" (awwwards) y el board "interactive web" del equipo.
- Tipografías: Oswald (Vernon Adams) e Inter (Rasmus Andersson), SIL Open Font License, vía Google Fonts.
- Música y efectos: sintetizados por código con Web Audio API.
- Desarrollo: Mia y Lola · Programación Multimedial III · UMAI · 2026.
