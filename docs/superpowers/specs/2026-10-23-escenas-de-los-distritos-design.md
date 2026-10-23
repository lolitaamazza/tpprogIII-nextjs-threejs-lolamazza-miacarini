# Escenas de los distritos y pistas que se desbloquean · diseño

Fecha: 2026-10-23. Sigue a la prueba del Distrito 12 (`docs/superpowers/specs/2026-10-23-escena-distrito-12-design.md`).
Recursos por distrito: https://claude.ai/artifact/PtKbQqQhed9vyjNFzZvoJC. Referencia de mecánicas: el proyecto
"Contención" (JJK) de Giuliodori y Abecian, rama `contencion` de https://github.com/Shoacoo/Tree.js-Proyect-JJK-giuliodori-abecian.

## Intención y por qué

Mia quiere una escena realista y completa en cada distrito, recorrida con la cámara guiada como el 12, ir de un lugar
a otro en tren y que el recorrido sea un camino armado: "que el usuario vaya descubriendo partes de la historia en
base a lo que va encontrando". Pidió mirar el proyecto JJK "para lograr cosas similares en cuanto a desbloquear pistas".
Regla nueva: no se borra código de los juegos anteriores (minijuegos, dioramas, talleres) ni de Lola; se desconecta.

## Lo que se toma del proyecto JJK (y cómo se adapta)

| En JJK | En Panem |
| --- | --- |
| Cajas que se abren: se deslizan, se levanta la tapa y aparece el dedo | **Abrir**: cajones, vitrinas, valijas, casilleros. Un toque acerca la cámara y se abre |
| Mantener presionado 0,9 s para despegar un sello | **Mantener para descubrir**: limpiar el hollín de una placa, desenredar una botella de la red. Sin castigo: si se suelta, queda a medias |
| Luz rasante que delata la tinta fresca | **Alumbrar** con el farol del minero: en lugares oscuros, lo escondido aparece bajo la luz |
| La caja B3-11 que aparece cuando se archivan las otras tres | **Lugares que aparecen**: un lugar nuevo se suma a la fila cuando se tiene la herramienta o la pista que lo abre |
| Hoja de inventario con la caja tachada a mano | **Pistas en el ambiente**: listas, carteles, calendarios que nombran otro distrito |
| 9 detalles escondidos; con 6 o más cambia el final | **9 marcas del sinsajo**; con 6 o más, el final suma la voz de la resistencia |
| Terminal con interfaz propia clickeable | (más adelante) la radio del 3 como aparato propio para escuchar lo encontrado |

## Las pistas (tres capas)

1. **Fragmentos** (ya existen): uno por distrito y la señal del 13. Lo que el Capitolio esconde. Se ven en la escena.
2. **Herramientas** (nuevas): tres objetos que se llevan y abren lugares en otros distritos.
   - **El farol del minero** (12, en el galpón): alumbra lo oscuro. Abre la cueva de la cantera (2), el bosque de noche (7) y el sótano del taller (3).
   - **La llave del depósito** (6, en la boletería): abre lo que tiene candado. La vitrina del joyero (1), el casillero de la fábrica (8) y el granero cerrado (10).
   - **La radio a pilas** (3, en el taller): sintoniza lo que no se emite. La sala de turbinas (5), la torre de vigilancia (11) y la señal del 13.
3. **Marcas del sinsajo** (nuevas): nueve marcas escondidas que solo aparecen con una herramienta (una por cada lugar de arriba). Cada una es una línea sobre quién organiza la resistencia en ese distrito. Con 6 o más, el final suma la voz de la resistencia a la transmisión.

Nada se traba: las herramientas están en lugares que se pueden visitar siempre (el 12 es el primer día; el 6 y el 3 se exploran desde el principio). Los fragmentos se encuentran sin herramientas. El archivo pirata muestra lo encontrado, las herramientas que se tienen y las marcas (encontradas o "???").

## Las escenas

Todas como el 12: cielo de Poly Haven, niebla, luz de la escena, 4 o 5 lugares, la fila de abajo, teclas, arrastrar para mirar.

| Distrito | Escena | Lugares | Fragmento | Herramienta o marca |
| --- | --- | --- | --- | --- |
| 12 Carbón (día 1) | Hecha. Noche, faroles | vías, galpón, casa de Ash, entrada, túnel | La viga (túnel) | **Farol** en el galpón (agarrarlo) |
| 11 Agricultura (día 2) | Huerto al atardecer, torres, alambrado | alambrado, huerto, torre, galpón de cajones, casa de Oliva | El castigo en la plaza (aviso clavado en la torre) | Marca con la **radio** en la torre. Minijuego: cosechar en el huerto |
| 4 Pesca (día 3) | Muelle al amanecer con niebla | muelle, botes, redes, faro, casa de Marin | El cuenco (casa de Marin) | Mantener para desenredar la botella de la red. Minijuego: tirar la red desde el muelle |
| 1 Lujo | Taller del joyero, interior cálido | la mesa, la vitrina, el espejo, la puerta | Lista de voluntarios (cuaderno en la mesa) | Marca con la **llave** en la vitrina |
| 2 Albañilería | Cantera escaneada al atardecer | la cantera, la estatua, el cuartel, la cueva | Placa del cuartel | Marca con el **farol** en la cueva |
| 3 Tecnología | Taller de electrónica, antena afuera | la mesa de soldar, las computadoras, la antena, el sótano | Grabación cortada (radio vieja) | **Radio** en el taller; marca con el **farol** en el sótano |
| 5 Energía | Represa y central de noche | la represa, los transformadores, la sala de control, las turbinas | Plan de apagones (sala de control) | Marca con la **radio** en las turbinas |
| 6 Transporte | Estación y depósito de locomotoras | el andén, la locomotora, la boletería, el depósito | Pasaje del tren (boletería) | **Llave** en la boletería |
| 7 Madera | Bosque de pinos de noche, aserradero | el aserradero, la pila de troncos, el claro, el bosque | Tronco marcado | Marca con el **farol** en el bosque |
| 8 Textil | Fábrica de uniformes | las máquinas, los maniquíes, el telar, los casilleros | Uniforme con el sinsajo (maniquí) | Marca con la **llave** en el casillero |
| 9 Granos | Silos y molino a la hora dorada | los silos, las bolsas, el molino, el campo | Afiche del Capitolio (silo) | Mantener para revolver una bolsa: la carta escondida (marca) |
| 10 Ganadería | Granero, corral, fardos | el corral, el granero, los fardos, la tranquera | Registro de carne (granero) | Marca con la **llave** en el granero cerrado |

## El tren y la Cosecha

- **El tren:** al elegir un distrito en el mapa, un viaje corto (4 a 6 s, se puede saltear) dentro de un compartimento: la ventana muestra el paisaje que pasa y se llega a la estación del distrito. Con movimiento reducido, un fundido.
- **La Cosecha por plazas:** hechos los tres días, el tren pasa por las plazas del 12, el 11 y el 4. En cada una, frente al Edificio de Justicia, se saca **un** papel de la urna de vidrio. Solo en una sale el nombre de uno de los tres (la urna sigue usando los papeles de cada uno). En las otras dos sale el nombre de otra chica o chico del distrito (`ALTERNATES`). La urna de 24 papeles de Lola se conserva en el código.

## Objetivos

1. Un motor de escenas que se arma solo con datos: piezas, luces, fuego, niebla, cielo, lugares, fragmentos y lugares escondidos (lo que hoy está fijo para el 12 pasa a datos).
2. Las interacciones nuevas: abrir, mantener para descubrir, alumbrar con el farol, y lugares que aparecen.
3. Herramientas y marcas guardadas en la historia (`panem-cosecha-v1`), visibles en el archivo pirata.
4. Las doce escenas, el tren y las plazas de la Cosecha.
5. El final con la voz de la resistencia si hay 6 marcas o más.

## No objetivos

- Cambiar las reglas de los minijuegos o de los Juegos de Lola.
- Borrar los dioramas, los talleres o la urna de 24 papeles: quedan en el código.
- Personas realistas (siluetas o los modelos humanos que ya están).

## Anti-objetivos

- Que una pista quede imposible de encontrar o que una herramienta trabe la historia.
- Acertijos difíciles: todo se resuelve mirando, tocando, manteniendo o alumbrando.
- Mucho texto: cada pista es un objeto y una línea clara, sin metáforas ni dos puntos.
- Glow fuerte, cargas largas sin aviso o escenas pesadas (25 MB como máximo cada una, cargadas al entrar).

## Restricciones

- Mismo stack, lógica pura con tests, no commitear sin permiso de Mia, créditos CC BY en `CREDITS.md` y en el final.
- Descargas solo con la lista aprobada por Mia. Sketchfab pide cuenta: Mia inicia sesión en el panel del navegador y yo descargo desde ahí (no escribo contraseñas).

## Decisiones mías (a revisar con Mia y Lola)

- Tres herramientas y nueve marcas; 6 marcas para el final con la resistencia.
- Qué herramienta abre qué lugar (tabla de arriba) y en qué lugar de cada escena va cada cosa.
- El tren como viaje corto al elegir un distrito, no como pantalla aparte.
- Las plazas de la Cosecha con un papel por plaza.

## Orden sugerido

1. Motor por datos e interacciones nuevas (abrir, mantener, alumbrar, lugares que aparecen), herramientas y marcas en la historia. El 12 pasa a usarlo sin cambiar lo que se ve.
2. Los días que faltan: 11 y 4, con sus minijuegos adentro.
3. El tren y las plazas de la Cosecha.
4. Los distritos de las herramientas: 6 y 3. Después 1, 2, 5, 7, 8, 9 y 10, de a dos o tres.
5. El final con las marcas y el archivo pirata con herramientas y marcas.

## Descargas por tanda (Sketchfab, todas CC BY)

- **Tanda 1 (11, 4, plaza, tren), 19 modelos, unos 260 MB originales (menos si se bajan con texturas 2K):** Old Wooden Watchtower, Crate of Pears, Ladder Wooden,
  Wooden Wheelbarrow, Wooden Cabin, Scarecrow; Old Lighthouse, Fishing boat (Aurélien Duval), Fishing boat (Pabooklas),
  Fishing net, Fishing Supplies Set, Skipskranen; Utrecht Stadhuis, Neoclassical Building, Classical Pillar,
  RCA 44-BX Microphone, Vintage Microphone, Glass Bowl; Train's Compartments.
- **Tandas siguientes:** las de cada distrito en la página de recursos, cuando le toque a cada uno.
