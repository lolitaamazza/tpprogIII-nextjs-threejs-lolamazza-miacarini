# Declaración de uso de inteligencia artificial

**Proyecto:** Panem. Tres días antes de la Cosecha (TP6, Programación Multimedial III, UMAI)
**Integrantes:** Mia Carini y Lola Mazza
**Fecha:** 5 de noviembre de 2026

## Herramienta utilizada

Usamos **Claude** (Anthropic) a través de **Claude Code**, en la app de escritorio, como asistente de programación dentro del repositorio. Tenía acceso a los archivos del proyecto, a la terminal y a un navegador para probar la experiencia.

## Para qué la usamos

| Área | Qué hizo la IA | Qué decidimos y revisamos nosotras |
| --- | --- | --- |
| Diseño y planificación | Redactó los documentos de diseño y los planes de implementación de `docs/superpowers/` a partir de lo que le contábamos. Propuso alternativas cuando se lo pedimos. | La idea, el universo y el tono. El recorrido de tres días con Ash, Oliva y Marin, el sistema de pistas, el Distrito 13 secreto y el final. Elegimos entre las opciones y descartamos las que no nos servían. |
| Código | Escribió gran parte del código: las escenas Three.js de los distritos, la cámara guiada, el tren, las plazas, los minijuegos de 12, 11 y 4, el HUD tipo visor, la intro de la tele del Capitolio, la persistencia del progreso y los tests de `tests/`. | Los pedidos, las referencias visuales y cada cambio de rumbo. Probamos todo en el navegador y pedimos correcciones cuando algo no funcionaba o no nos gustaba. |
| Textos | Escribió borradores de los textos del juego (pistas, fragmentos, voces de los personajes y de sus familias) siguiendo la historia que definimos. | Los personajes, sus familias y lo que les pasa. Corregimos el tono y pedimos que los textos fueran cortos. |
| Recursos 3D | Buscó modelos y texturas con licencia libre (Kenney, Quaternius, Poly Haven, Sketchfab) y armó los scripts de optimización de `scripts/`. | Aprobamos cada descarga antes de que se hiciera. Los créditos están en `public/models/CREDITS.md`. |
| Pruebas y depuración | Corrió los tests, el lint y el build. Sacó capturas con un navegador automático para encontrar errores. | La prueba final jugando la experiencia completa. |
| Presentación | Sacó las capturas de `docs/presentacion/capturas/` y armó una versión alternativa de las diapositivas en Figma, al lado de las originales. | Qué diapositivas quedan y qué se muestra en clase. |

## Lo que no hizo la IA

- No eligió el tema ni la propuesta narrativa.
- No hizo commits ni pushes por su cuenta. Los subimos nosotras después de revisar los cambios.
- No generó imágenes, modelos 3D ni audio. Los recursos visuales son de terceros con licencia libre, con sus créditos, o están hechos a partir de material de referencia.

## Archivo de los Juegos (parte de Lola)

_Pendiente: Lola completa acá qué herramientas de IA usó para la urna, la arena, el desenlace y los talleres, y para qué._

## Cómo trabajamos con ella

Le explicábamos qué queríamos con palabras, capturas de pantalla y referencias (Pinterest, Figma, otros sitios). Ella proponía o implementaba, y nosotras probábamos el resultado y pedíamos cambios. Muchas decisiones de diseño salieron de esas idas y vueltas. La responsabilidad sobre el resultado final es nuestra: revisamos lo que se entrega y podemos explicar cómo funciona.
