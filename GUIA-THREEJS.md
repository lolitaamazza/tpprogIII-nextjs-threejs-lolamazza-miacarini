# Guía de introducción a Three.js con Next.js

Esta guía explica la escena incluida en `components/ThreeArtifact.js`. No requiere conocimientos previos de Three.js. El objetivo es comprender qué función cumple cada parte, cómo se relacionan y cómo integrar una escena 3D con React y Next.js.

> **Nota del proyecto:** los ejemplos de código de esta guía provienen del boilerplate original (`ThreeArtifact.js`, `Experience.js`, `data/chapters.js`), que en *Panem · La chispa* fue reemplazado. La escena de este proyecto está en `components/stage/panemScene.js` y aplica los mismos conceptos (escena, cámara, renderer, luces, loop, raycasting, resize y limpieza). La tabla de la sección 23 lista los archivos actuales.

## 1. Qué es Three.js

El navegador puede dibujar gráficos acelerados por GPU mediante WebGL. WebGL es una API de bajo nivel: requiere administrar buffers, matrices, shaders y estados gráficos de forma explícita.

Three.js organiza esas operaciones mediante conceptos de nivel más alto:

- escenas;
- cámaras;
- geometrías;
- materiales;
- luces;
- objetos;
- texturas;
- animaciones;
- detección de intersecciones.

Three.js no reemplaza a React ni a Next.js. Cada tecnología cumple una responsabilidad diferente:

| Tecnología | Responsabilidad |
| --- | --- |
| Next.js | Rutas, renderizado, estructura de la aplicación y metadata |
| React | Componentes, estado, eventos y actualización de la interfaz |
| Three.js | Creación y renderizado de la escena tridimensional |
| Firebase | Autenticación y persistencia del progreso |

## 2. Por qué la escena es un Client Component

Los archivos de `app` son Server Components de forma predeterminada. Una escena WebGL necesita APIs que existen únicamente en el navegador:

- `window` y `document`;
- el elemento `<canvas>`;
- WebGL;
- `requestAnimationFrame`;
- eventos de puntero.

Por este motivo, `ThreeArtifact.js` comienza con:

```js
"use client";
```

La directiva establece un límite entre el código que puede ejecutarse en el servidor y el código que debe ejecutarse en el navegador.

## 3. El contenedor React

El componente devuelve un `div` vacío:

```jsx
<div ref={mountRef} className="three-stage" />
```

Three.js crea su propio elemento `<canvas>`. La referencia permite acceder al `div` real del navegador para insertar ese canvas.

```js
const mountRef = useRef(null);
```

`useRef` conserva una referencia entre renders sin provocar un nuevo render cuando cambia su valor.

## 4. El ciclo de vida mediante useEffect

La escena se crea dentro de un efecto:

```js
useEffect(() => {
  // creación de la escena

  return () => {
    // limpieza de recursos
  };
}, [chapter, discovered]);
```

El efecto se ejecuta cuando el componente ya existe en el navegador. También vuelve a ejecutarse si cambia el capítulo o el estado de la evidencia.

La función retornada es la limpieza del efecto. Se ejecuta antes de crear una nueva escena y cuando el componente se desmonta.

## 5. Elementos mínimos de una escena

Una escena básica requiere cuatro elementos:

```text
Scene + Camera + Renderer + Object
```

### Scene

```js
const scene = new THREE.Scene();
```

`Scene` es el contenedor principal. Los objetos, luces y sistemas de partículas se agregan mediante `scene.add(...)`.

La escena funciona como un árbol. Un objeto puede contener otros objetos. Las transformaciones de un elemento padre afectan a sus descendientes.

### Camera

```js
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 5.4);
```

La cámara define desde qué posición se observa la escena. Los parámetros de `PerspectiveCamera` son:

1. `45`: campo de visión vertical expresado en grados.
2. `1`: relación entre ancho y alto. Luego se actualiza al tamaño real.
3. `0.1`: distancia mínima visible.
4. `100`: distancia máxima visible.

Los objetos situados fuera del intervalo entre `near` y `far` no se dibujan.

### Renderer

```js
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
});
```

El renderer administra WebGL y dibuja la escena dentro de un canvas.

- `alpha: true` permite ver el fondo CSS detrás del canvas.
- `antialias: true` suaviza los bordes.

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

Las pantallas de alta densidad pueden tener un `devicePixelRatio` elevado. Limitarlo a `2` reduce la cantidad de píxeles procesados y controla el costo para la GPU.

```js
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);
```

La primera instrucción configura la interpretación de los colores. La segunda inserta el canvas generado por Three.js dentro del componente.

## 6. Sistema de coordenadas

Three.js utiliza tres ejes:

```text
       +Y
        │
        │
        └──── +X
       /
     +Z
```

- `x`: desplazamiento horizontal;
- `y`: desplazamiento vertical;
- `z`: profundidad.

La cámara del ejemplo se ubica en `z = 5.4` y observa hacia el origen `(0, 0, 0)`.

Las transformaciones principales de cualquier `Object3D` son:

```js
object.position.set(x, y, z);
object.rotation.set(x, y, z);
object.scale.set(x, y, z);
```

Las rotaciones se expresan en radianes. Una vuelta completa equivale a `Math.PI * 2`.

## 7. Group y jerarquía

```js
const group = new THREE.Group();
scene.add(group);
```

`Group` permite tratar varios objetos como una unidad. El artefacto y su halo pertenecen al mismo grupo. Al rotar el grupo se transforman ambos elementos sin modificar sus rotaciones individuales.

```text
Scene
├── Group
│   ├── Artifact
│   └── Halo
├── Particles
├── AmbientLight
└── PointLight
```

## 8. Geometry, Material y Mesh

Un objeto visible suele construirse con tres conceptos:

```text
Geometry + Material = Mesh
```

### Geometry

```js
const geometry = new THREE.IcosahedronGeometry(1.18, 3);
```

La geometría define la forma mediante vértices y caras.

- `1.18` es el radio.
- `3` es el nivel de detalle o subdivisión.

Un mayor nivel de detalle produce más polígonos. Esto permite formas más suaves, pero aumenta el costo de renderizado.

### Material

```js
const material = new THREE.MeshStandardMaterial({
  color: chapter.color,
  emissive: chapter.color,
  emissiveIntensity: discovered ? 1.1 : 0.45,
  metalness: 0.72,
  roughness: 0.22,
  wireframe: !discovered,
});
```

El material define cómo se ve la superficie.

- `color`: color base;
- `emissive`: color que parece emitir la superficie;
- `emissiveIntensity`: intensidad de esa emisión;
- `metalness`: grado de comportamiento metálico;
- `roughness`: dispersión de los reflejos;
- `wireframe`: representación de las aristas en lugar de las caras.

`MeshStandardMaterial` utiliza un modelo de iluminación físicamente basado. Necesita luces para resultar visible.

### Mesh

```js
const artifact = new THREE.Mesh(geometry, material);
group.add(artifact);
```

`Mesh` combina forma y apariencia. Luego se agrega al grupo para que forme parte del árbol de la escena.

## 9. Luces

La escena utiliza dos luces con funciones diferentes.

### Luz ambiente

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
```

Ilumina todas las superficies de manera uniforme. No produce dirección ni sombras. Se utiliza como iluminación base.

### Luz puntual

```js
const keyLight = new THREE.PointLight(chapter.accent, 18, 12);
keyLight.position.set(2.5, 2, 3);
scene.add(keyLight);
```

Una `PointLight` emite luz en todas las direcciones desde una posición. Sus argumentos principales son color, intensidad y distancia máxima de influencia.

## 10. El halo

```js
const haloGeometry = new THREE.TorusGeometry(1.72, 0.012, 12, 180);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: chapter.accent,
  transparent: true,
  opacity: 0.75,
});
```

`TorusGeometry` crea un anillo. `MeshBasicMaterial` no reacciona a las luces: mantiene su color visible de forma constante. Es adecuado para líneas, indicadores y elementos gráficos.

## 11. Sistema de partículas

Las partículas se construyen con posiciones almacenadas en un buffer:

```js
const pointsGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(360 * 3);
```

Cada partícula requiere tres valores: `x`, `y` y `z`. Por eso el array contiene `360 * 3` posiciones numéricas.

Después de calcularlas, el array se asigna a la geometría:

```js
pointsGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3),
);
```

El segundo argumento de `BufferAttribute` indica que cada vértice utiliza tres componentes.

```js
const particles = new THREE.Points(pointsGeometry, pointsMaterial);
scene.add(particles);
```

`Points` dibuja un punto por cada posición, en lugar de construir caras triangulares.

## 12. Loop de animación

Una escena no se actualiza automáticamente. Cada frame debe renderizarse de forma explícita:

```js
function animate(timestamp) {
  timer.update(timestamp);
  const elapsed = timer.getElapsed();

  group.rotation.y = elapsed * 0.24;
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
}
```

`requestAnimationFrame` solicita al navegador ejecutar la función antes del siguiente repintado.

`THREE.Timer` permite calcular el tiempo transcurrido sin depender de la cantidad de frames. De esta manera, la velocidad de la animación se mantiene aproximadamente constante en dispositivos con diferentes frecuencias de actualización.

```text
actualizar tiempo
       ↓
modificar objetos
       ↓
renderizar escena
       ↓
solicitar próximo frame
```

## 13. Coordenadas del puntero

Los eventos del navegador informan coordenadas en píxeles. `Raycaster` necesita coordenadas normalizadas entre `-1` y `1`.

```js
pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
```

La coordenada `y` se invierte porque el sistema de coordenadas del canvas y el utilizado para el raycasting tienen orientaciones verticales diferentes.

## 14. Raycaster e interacción

```js
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(pointer, camera);
const intersections = raycaster.intersectObject(artifact);
```

El raycaster proyecta un rayo desde la cámara a través de la posición del puntero. Si `intersections` contiene elementos, el rayo atravesó el objeto.

```js
if (intersections.length > 0) {
  onDiscoverRef.current();
}
```

Three.js detecta la selección. React decide qué significa esa selección dentro de la experiencia: registrar una evidencia, actualizar el progreso y habilitar otra ruta.

## 15. Comunicación entre Three.js y React

`ThreeArtifact` recibe una función mediante props:

```jsx
<ThreeArtifact onDiscover={handleDiscover} />
```

La escena ejecuta esa función cuando el raycaster detecta el artefacto. Esto mantiene separadas dos responsabilidades:

- Three.js determina qué objeto fue seleccionado.
- React modifica el estado narrativo.

La referencia `onDiscoverRef` conserva la versión actual de la función sin reconstruir toda la escena en cada render.

## 16. Adaptación al tamaño disponible

El canvas debe responder a cambios de tamaño:

```js
function resize() {
  const { clientWidth, clientHeight } = mount;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
}
```

Se actualizan el tamaño de renderizado y la relación de aspecto de la cámara. Después de modificar una cámara de perspectiva se debe ejecutar `updateProjectionMatrix()`.

```js
const observer = new ResizeObserver(resize);
observer.observe(mount);
```

`ResizeObserver` detecta cambios en el contenedor, no solo cambios en el tamaño general de la ventana.

## 17. Limpieza de recursos

Los recursos enviados a la GPU no se liberan automáticamente cuando React elimina un componente.

```js
return () => {
  cancelAnimationFrame(frameId);
  observer.disconnect();
  geometry.dispose();
  material.dispose();
  timer.dispose();
  renderer.dispose();
  renderer.domElement.remove();
};
```

La limpieza evita múltiples loops de animación, listeners duplicados, canvases acumulados y uso creciente de memoria. Todo recurso creado mediante `new` que exponga un método `dispose()` debe revisarse durante la limpieza.

## 18. Integración con las rutas de Next.js

Los capítulos están representados por rutas dinámicas:

```text
/archivo/carrier
/archivo/witness
/archivo/echo
```

El archivo `app/archivo/[chapter]/page.js` recibe el parámetro de la URL:

```js
export default async function ChapterPage({ params }) {
  const { chapter: chapterId } = await params;
  return <Experience initialChapterId={chapterId} />;
}
```

La página es un Server Component. Valida el identificador, genera metadata y entrega el capítulo inicial al Client Component interactivo.

Desde `Experience.js`, la navegación utiliza el router:

```js
router.push(`/archivo/${chapterId}`);
```

El cambio de capítulo actualiza la URL, el contenido React, la metadata correspondiente y la configuración visual de la escena Three.js.

## 19. Flujo completo de una interacción

```text
La persona selecciona el artefacto
                ↓
Raycaster detecta una intersección
                ↓
ThreeArtifact ejecuta onDiscover
                ↓
Experience actualiza el estado narrativo
                ↓
useProgress guarda la evidencia
                ↓
React habilita el capítulo siguiente
                ↓
router.push cambia la ruta
                ↓
Next.js entrega el nuevo capítulo
                ↓
ThreeArtifact reconstruye la escena
```

## 20. Orden recomendado para experimentar

Modificar una variable por vez y observar el resultado.

### Ejercicio 1: cámara

- Cambiar el campo de visión.
- Modificar `camera.position.z`.
- Registrar qué combinaciones deforman o recortan el objeto.

### Ejercicio 2: geometría

- Reemplazar `IcosahedronGeometry` por `BoxGeometry`.
- Probar `SphereGeometry` y `TorusKnotGeometry`.
- Comparar la cantidad de parámetros y segmentos.

### Ejercicio 3: materiales

- Modificar `metalness` y `roughness`.
- Comparar `MeshStandardMaterial` con `MeshBasicMaterial`.
- Desactivar las luces y analizar qué materiales siguen visibles.

### Ejercicio 4: luces

- Cambiar posición, color e intensidad.
- Reemplazar `PointLight` por `DirectionalLight`.
- Observar qué propiedades visuales cambian.

### Ejercicio 5: animación

- Alterar la velocidad de rotación.
- Animar posición o escala.
- Vincular una propiedad al puntero.

### Ejercicio 6: interacción

- Agregar un segundo objeto seleccionable.
- Asignar una acción diferente a cada objeto.
- Mostrar en React el nombre del objeto seleccionado.

### Ejercicio 7: contenido externo

- Cargar un modelo `.glb` con `GLTFLoader`.
- Incorporar una textura.
- Agregar una pantalla de carga para el recurso.

## 21. Problemas frecuentes

### El canvas está vacío

Verificar que la cámara no esté dentro del objeto, que el objeto se encuentre entre `near` y `far`, que el material tenga una luz compatible, que el renderer tenga un tamaño mayor que cero y que `renderer.render(scene, camera)` se ejecute.

### El objeto se ve deformado

Actualizar `camera.aspect` y ejecutar `camera.updateProjectionMatrix()` después de cada resize.

### El clic no coincide con el objeto

Calcular las coordenadas relativas al canvas mediante `getBoundingClientRect()`, no con el tamaño total de la ventana.

### La aplicación consume recursos después de navegar

Cancelar `requestAnimationFrame`, eliminar listeners y ejecutar `dispose()` durante la limpieza del efecto.

### La escena se crea dos veces durante desarrollo

React Strict Mode puede ejecutar un ciclo adicional de montaje y limpieza para detectar efectos incorrectos. Una limpieza completa evita escenas duplicadas.

## 22. Criterio para incorporar React Three Fiber

React Three Fiber permite expresar escenas Three.js mediante componentes JSX. Puede resultar útil cuando la escena necesita reutilización, composición declarativa o integración con bibliotecas del ecosistema React.

Antes de incorporarlo se recomienda poder identificar en la implementación directa:

- escena;
- cámara;
- renderer;
- geometría;
- material;
- luces;
- loop de animación;
- raycasting;
- resize;
- liberación de recursos.

React Three Fiber reorganiza estos fundamentos, pero no los elimina.

## 23. Archivos relacionados

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
| `app/globals.css` | Tamaño del contenedor y composición visual |
