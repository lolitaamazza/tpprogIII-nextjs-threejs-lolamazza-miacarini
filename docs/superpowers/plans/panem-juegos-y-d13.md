# Plan: arreglos, minijuegos de verdad, Distrito 13 y el archivo de los Juegos

Fecha: 2026-10-21. Se ejecuta **después del push de Lola** (no sabemos qué archivos está tocando).
Decidido con Mia: se puede perder y reintentar, pero los juegos no tienen que ser difíciles; el archivo de los Juegos pasa a ser un archivo que hackea la resistencia.

## 0. Antes de empezar

- `git pull` del trabajo de Lola, correr `npm test`, `npm run lint` y `npm run build`, y recorrer la app para ver en qué quedó.
- Ojo: en esta copia `package.json` y `package-lock.json` tienen un cambio local sin commitear (`gsap` pasó de `3.15.0` a `^3.15.0`). Resolverlo antes de instalar dependencias para no pisar el lockfile de Lola.
- Repartir: si Lola sigue con el archivo de los Juegos, nosotras tomamos los arreglos, los minijuegos y el Distrito 13.

## 1. Arreglos rápidos

1. **"Saltar la intro" discreto.** Queda para testear, no para invitar: texto chico (11 px), sin borde ni fondo, baja opacidad (~0,35, sube al pasar el mouse o con foco de teclado), en la esquina inferior derecha en vez de arriba. Esc sigue funcionando.
2. **Flechas de volver.** Instalar `react-icons` y usar una flecha fina (Phosphor `PiArrowLeft` o similar, a juego con Oswald) sin texto al lado. Como queda sin texto, cada flecha lleva `aria-label` ("Volver al mapa", etc.) y `title` para el tooltip. Lugares: panel del distrito, "Todavía no" del Capitolio y "Volver al mapa" del archivo de los Juegos (si sigue existiendo después del push).
3. **Tocar el mapa cierra el panel del distrito.** Hoy en `/distrito/[id]` el clic sobre el mapa no hace nada (`onPointerUp` corta si la escena no es `mapa`). Cambio: si el clic no cae en el diorama, sobre otro distrito va a ese distrito y sobre el resto del mapa vuelve a `/mapa`. Los dioramas pasan a avisar si "usaron" el clic (`pointerUp` devuelve `true`/`false`), así arrastrar la hoz o tirar la red no cierra el panel. Con los minijuegos nuevos el panel sigue existiendo (pasa a ser el HUD del juego), así que el comportamiento aplica igual.

## 2. Minijuegos que se sientan juego

Base común (`lib/minigame.js`, puro y con tests): estados `intro → jugando → ganado / perdido`, vidas o intentos, reintento sin perder lo aprendido, y "ayuda" automática si perdés dos veces (ventanas más generosas). El panel del distrito muestra el HUD (vidas, tiempo o intentos, objetivo) y los botones Empezar / Reintentar. La alternativa accesible deja de ser "apretar el botón N veces": cada juego se puede jugar con teclado (espacio / flechas) con las mismas reglas.

- **Distrito 12 · Carbón, timing.** Una marca de luz recorre la veta; hay que picar cuando pasa por la grieta. Acierto: salta un bloque, chispas y golpe de cámara. Error: polvo, temblor y el canario de la jaula se agita. Tres errores y el canario se calla: hay que salir y reintentar. Tres capas hasta la brasa; la grieta se achica un poco en cada capa.
- **Distrito 11 · Agricultura, sigilo + memoria.**
  1. Cosechar arrastrando la hoz por el trigo mientras el reflector de las torres barre el campo; si te alumbra, perdés lo cosechado de esa pasada.
  2. Final: los sinsajos cantan el motivo de cuatro notas de Rue (el mismo de la música) y hay que repetirlo tocando a los pájaros en orden. Si te equivocás, vuelven a cantarlo.
- **Distrito 4 · Pesca, tiro con carga.** Mantener apretado carga la fuerza (un anillo crece), soltar tira la red; la corriente la desvía un poco. 5 redes para 3 peces; los cardúmenes se mueven; un pez dorado vale por dos. Sin redes: reintento.

Cada uno: sonido propio en acierto y error, partículas, cámara que acompaña y una pantalla corta de "emblema obtenido". Reglas en módulos puros con tests (ventanas de timing, secuencia de notas, física simple de la red).

## 3. Distrito 13: la señal que se rompe

Recomendación: que se active **al hacer clic** en el 13 (no al pasar el mouse, que pasa por encima sin querer), y que sea un secreto opcional con recompensa, no un paso obligatorio.

- Al hacer clic, la imagen del mapa se congela y se parte en fragmentos (tiras y bloques) con separación de color, ruido y cajas de rastreo con etiquetas en inglés: `NO DATA`, `ACCESS DENIED`, coordenadas, códigos (referencias: "Corona Sunset", "3d Data Visualization" y "Scanning Animation" del tablero).
- **Interacción:** los fragmentos se apartan del cursor; se pueden agarrar y arrastrar; al soltarlos vuelven despacio a su lugar. Al moverlos aparecen debajo restos de otra señal: una silueta, ventanas de datos, una frase.
- **Recompensa:** si movés suficientes fragmentos, aparece un mensaje oculto ("DISTRICT 13 IS STILL TRANSMITTING", o lo que definamos) y queda guardado como descubierto. En el final, cuando el 13 se enciende, el texto cambia si lo habías descubierto.
- **Técnica:** captura del frame del mapa a una textura (render target), fragmentos como planos en una escena superpuesta con un shader de distorsión (separación RGB, desplazamiento por bloques, ruido), arrastre por raycasting. Lógica de fragmentos, resortes y "cuánto se descubrió" en un módulo puro con tests.
- **Cuidados:** respetar el límite de destellos (≤ 3 por segundo), versión quieta para movimiento reducido, salida con Esc o un botón, y versión sin WebGL (un overlay CSS con los mismos textos).

## 4. Archivo de los Juegos (después de ver qué cambió Lola)

- Reencuadrarlo como el archivo clasificado que la resistencia hackea: la crónica y la interfaz lo dicen desde el principio ("archivo interceptado", el sello tachado, la señal pirata) y el final de la arena vuelve a la transmisión.
- Revisar el ritmo de la arena (hoy son hasta 24 clics en "Avanzar turno"): avance automático por jornadas con pausa, o menos turnos.
- Que use la estética de la sala (años 50, inglés dentro del mundo) donde muestra material "del Capitolio".

## Orden sugerido

1. Arreglos rápidos (1).
2. Distrito 13 (3), porque es independiente del resto.
3. Minijuegos (2): Pesca y Carbón primero (cambian la mecánica existente), Agricultura después.
4. Archivo de los Juegos (4), coordinado con Lola.
