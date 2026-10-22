# Panem: interfaz mínima y minijuegos "pro" — diseño

Fecha: 2026-10-21. Conversado con Mia (ver mockups A, B y C de la conversación).

## Intención y por qué

Mia, sobre el archivo de los Juegos: "hay un montón de pop ups e información que tapa la arena y queda medio raro, siento que no sé a dónde mirar porque hay tanto todo el tiempo". Quiere algo "más minimalista pero a la vez bastante pro en cuanto a 3D, jugabilidad e interacción". Sobre los distritos: el panel lateral "ocupa tanto de la pantalla", "en el Distrito 13 rompe con la experiencia de glitch" y "en el resto de los juegos queda raro también". Sobre los minijuegos: "siguen bastante simples en cuanto a lo visual"; marcó las cuatro causas: las formas, la luz y el color, que se siente quieto y cómo responde al jugar.

Referencias elegidas por Mia: la sala de control de los Vigilantes de las películas (la arena como holograma sobre una mesa) y Frostpunk para la arena; Bad North y el portfolio de Bruno Simon para los minijuegos.

## Objetivos

1. **Arena con dos vistas**, y un botón para pasar de una a otra:
   - **Siguiendo a tu tributo** (mockup A): cámara cercana que acompaña al tributo elegido, estilo Frostpunk.
   - **La mesa de los Vigilantes** (mockup B): la arena entera vista como holograma sobre una mesa, con siluetas de Vigilantes en el borde. Los tributos son luces; la tuya, dorada; los caídos se apagan con una cruz. Botón "Seguir a [nombre]" para volver a la vista cercana.
2. **HUD mínimo en la arena:** arriba a la izquierda "● En vivo · jornada N · día/noche" y cuántos quedan en pie; abajo a la izquierda nombre, distrito y barritas finas de salud y energía; lo que pasa, en una sola línea abajo; las decisiones, abajo al centro como subtítulos (estilo Firewatch), con 2 o 3 opciones cortas.
3. **Fuera de pantalla salvo que se pidan:** la crónica con flechas, la tira de eventos, el registro de tributos fijo, el panel lateral, la partida/guardado y los créditos. Quedan detrás de íconos arriba a la derecha.
4. **Distritos sin panel lateral** (mockup C): arriba a la izquierda la flecha de volver, número e industria, y una línea de pista; abajo, avance y vidas en una sola línea. El botón alternativo y la barra espaciadora siguen.
5. **Distrito 13 sin panel:** solo la etiqueta (ACCESO DENEGADO / ● SEÑAL RECUPERADA) en una esquina, para que la pantalla rota ocupe todo.
6. **Minijuegos más "pro"** en las cuatro causas:
   - Formas: modelos low-poly con detalle de packs gratuitos (Kenney, Quaternius) con créditos, como los modelos de la arena. Una figura por distrito que hace la acción (el minero pica, el pescador tira la red, la cosechadora se agacha).
   - Luz y color: un HDRI de Poly Haven por escena (resolución baja) más un sol bajo con sombras suaves; paleta y niebla por distrito; tilt-shift leve (bordes desenfocados, como maqueta); brillo solo en la brasa, el reflector y el pez dorado.
   - Vida: agua con olas y espuma en la orilla, trigo y árboles con viento, pájaros, humo de la mina, polvo.
   - Respuesta: objetos que reaccionan como juguetes (rebotan, se hunden y vuelven), la cámara se acerca un poco en cada acierto, partículas en los impactos y la figura reacciona al acierto y al error.

## No objetivos

- No cambian las reglas de los minijuegos (`lib/minigame.js`, `components/stage/dioramas/logic.js`) ni la simulación de la arena (`lib/games/simulation.js`, `encounters.js`), salvo lo que haga falta para la interfaz.
- No cambian la intro de la sala, el mapa ni la pantalla rota del Distrito 13.
- No se usan texturas ni modelos realistas de Poly Haven (rompen el estilo de juguete).

## Anti-objetivos (sería un fracaso aunque funcione)

- Volver a tapar el 3D con paneles, tarjetas o párrafos. Mia ya marcó que "explicamos de más": textos de una línea.
- Que el mapa o los distritos carguen más lento o que el celular no lo aguante.
- Perder las alternativas accesibles: todo se sigue pudiendo jugar con teclado y botón, con etiquetas para lector de pantalla.

## Restricciones

- Next.js 16, Three.js r186 directo, GSAP ya instalado. Sin frameworks nuevos.
- Modelos: Kenney y Quaternius (CC0), HDRI de Poly Haven (CC0); créditos en `public/models/CREDITS.md` y en la pantalla de créditos. Descargar cada archivo solo con el OK de Mia (nombre, origen y tamaño).
- Lógica nueva en módulos puros con tests (`node --test`).
- Movimiento reducido: sin temblores ni movimientos de cámara bruscos; mismas reglas.
- Celular (375 px): el HUD no se superpone con la hoja inferior ni con los controles.
- El archivo de los Juegos es de Lola; Mia aprobó estos cambios.
- No se commitea ni pushea sin pedírselo a Mia.

## Lo que decidió Mia

- Las dos vistas de la arena combinadas (cercana y mesa de los Vigilantes) con un botón.
- El HUD de los mockups A, B y C ("así iría más o menos bien").
- Usar packs gratuitos con créditos; el HDRI de Poly Haven.
- Sacar `/rebelion` (hecho).

## Decisiones mías (para que Mia las revise)

- Hambre y sed se muestran solo cuando están bajas.
- Desde la mesa, tocar una luz muestra a ese tributo (su ficha y su ubicación).
- Las decisiones se eligen también con las teclas 1, 2 y 3.
- La pista de los distritos se esconde después de la primera jugada.
- Cada distrito carga sus modelos al entrar (`.glb` comprimidos, presupuesto de ~1,5 MB por distrito con HDRI incluido); el mapa no carga nada nuevo.
- En la Cosecha, los tributos se eligen tocándolos en el escenario 3D; la lista queda detrás del ícono de tributos.
- El desenlace muestra solo al ganador y dos acciones (transmitir el mensaje final, volver a jugar); la crónica completa queda detrás de un ícono.
- La mesa de los Vigilantes reutiliza la arena de Lola: cámara cenital, material de holograma (cian, líneas de barrido, transparencia) y luces en lugar de las figuras.
- La línea de "lo que pasa" recorre los eventos del turno de a uno (unos 2,5 s cada uno), primero los de tu tributo y las caídas; la crónica completa del turno y de la partida queda detrás de un ícono.
- La Preparación es un momento de decisión como los encuentros: una tarjeta compacta centrada abajo con las tres especialidades (una fila por emblema, dos opciones cada una) y "Entrar a la arena".
- Pausa queda visible como ícono (la necesita el avance automático); la calidad visual pasa al menú. La secuencia de intercepción y la etiqueta "Señal pirata" se mantienen. Los capítulos (01 La Cosecha…) se reducen a un indicador chico.
- En celular, el HUD de la arena se apila: estado arriba, decisiones abajo a todo el ancho, nombre y barras sobre las decisiones.

## Lo que queda a criterio de quien lo construya

- Qué piezas exactas de cada pack, las paletas, los shaders del agua y del holograma, las animaciones y los tiempos.

## Orden sugerido

1. Distritos y Distrito 13 sin panel (solo código).
2. Arena y archivo con HUD mínimo y las dos vistas (solo código).
3. Minijuegos "pro" con los packs (necesita las descargas aprobadas).
