# Escena del Distrito 12 · diseño

Fecha: 2026-10-23. Primera escena realista de un distrito, como prueba del sistema que después se usa en los doce.
Recursos elegidos en https://claude.ai/artifact/PtKbQqQhed9vyjNFzZvoJC (pliego del Distrito 12).

## Intención y por qué

Mia quiere que la experiencia se sienta profesional y realista, como su referencia (el broche del sinsajo entre rocas,
fuego y ciudad de fondo, desenfoque, noche). Pidió "meterse en el mundo de cada distrito" con cámaras que se muevan
como en primera persona y se acerquen a lugares ocultos donde se puede encontrar algo escondido. Eligió la cámara
**guiada** (se toca un lugar y la cámara camina hasta ahí) sobre el movimiento libre, y quiere una escena completa en
cada distrito, empezando por el 12 para probar el look y la cámara antes de repetirlo.

## Lo que vive quien juega

1. Entra al Distrito 12 y la cámara está a la altura de los ojos, junto a las vías del tren, de noche. Se ve la calle
   de la Veta: casas de madera, un poste con un foco, el galpón de herramientas y, al fondo, la entrada de la mina.
2. Abajo hay una fila de lugares (los mismos que se pueden tocar en la escena). Tocar uno hace que la cámara camine
   hasta ahí (2–3 segundos, con un balanceo leve) y mire lo importante de ese lugar.
3. En cada lugar se puede mirar alrededor arrastrando (un poco, no girar entero).
4. En el túnel de la mina, la viga de madera tiene nombres tallados. Se ve un brillo muy sutil. Tocarla abre la
   tarjeta del fragmento (la misma de hoy). Desde lejos no se puede tocar: hay que ir.
5. El minijuego del día (el carbón) se juega en el frente del túnel, con las mismas reglas de hoy.
6. Esc o la flecha vuelven al mapa.

## Lugares (5)

| Lugar | Qué se ve | Qué hay |
| --- | --- | --- |
| Las vías | El poste con el foco, los rieles, la calle hacia la mina | Punto de llegada (después llega el tren acá) |
| La casa de Ash | La casa chica de madera, el farol en la ventana | Un lugar para mirar |
| El galpón | Chapa, pico, maza, cajones, un tambor con fuego | Un lugar para mirar |
| La entrada de la mina | La boca de la mina con el carrito y los rieles | Paso hacia el túnel |
| El túnel | Rieles, vigas, faroles, el frente de carbón | La viga con nombres (fragmento `12-viga`) y el minijuego |

## Objetivos

1. Un sistema de escena reusable: datos del lugar (posiciones, lugares, cielo, piezas) separados del motor (carga,
   cámara guiada, luz, efectos), para hacer después los otros once cambiando solo los datos y las piezas.
2. La cámara guiada en primera persona, con transiciones suaves y mirada limitada.
3. Un look nocturno realista: cielo HDRI `satara_night`, luz fría de luna, faroles cálidos, fuego del tambor,
   niebla de polvo de carbón, desenfoque leve del fondo, grano y viñeta suaves.
4. El fragmento escondido que solo se encuentra yendo al lugar.
5. El minijuego del carbón dentro del túnel (segunda etapa de la misma prueba).

## No objetivos

- Los otros once distritos, el tren entre distritos y la Cosecha por plazas.
- Cambiar las reglas del minijuego o de la historia (días, comida, fragmentos).
- Reemplazar todavía el diorama del 12 en el juego: la prueba vive en `/escena/12` hasta que Mia la apruebe.

## Anti-objetivos (fracaso aunque funcione)

- Glow fuerte o molesto (Mia lo marcó en los dioramas). Las luces se ven por halos chicos y su luz en las superficies.
- Mucho texto en pantalla: el nombre del lugar y nada más; el fragmento usa su tarjeta.
- Una carga larga sin aviso, o una escena que en celular se arrastra.
- Movimiento libre tipo videojuego (marearse, perderse, chocar paredes).

## Restricciones

- Mismo stack (Next 16, Three r186, GSAP). Lógica pura con `node --test`. Textos claros, sin metáforas y sin dos puntos.
- Recursos ya bajados y aprobados: Poly Haven (CC0) y cinco modelos de Sketchfab (CC BY, con crédito en
  `public/models/CREDITS.md` y en los créditos del final). No se baja nada más sin preguntar.
- Peso de la escena optimizada: 25 MB como máximo, cargada solo al entrar; se libera al salir.
- No commitear ni pushear sin que Mia lo pida.

## Decisiones mías (a revisar)

- **Dónde vive:** la escena se suma al escenario 3D que ya existe (como el archivo de los Juegos), en una ruta de
  prueba `/escena/12`. Así comparte el renderer y después se puede entrar volando desde el mapa.
- **Altura de los ojos:** 1,6 m. Caminata de 1,5 a 3 s según la distancia, con aceleración y frenado suaves.
- **Mirar alrededor:** arrastrando, hasta 35° a cada lado y 15° arriba o abajo desde la dirección del lugar.
- **Movimiento reducido:** la cámara no camina; un fundido corto lleva al lugar.
- **Teclado:** 1–5 van a los lugares, Esc vuelve al mapa; la fila de lugares de abajo es también la alternativa
  accesible a tocar en 3D.
- **Calidad:** el desenfoque de fondo y la niebla volumétrica solo en escritorio con buena GPU; en celular, niebla
  simple y sin desenfoque. Se usa la medición de calidad que ya tiene el proyecto (`renderBudget`).
- **Escalas:** los modelos vienen con escalas muy distintas (la casa de Ash mide 20 cm y la otra 17 m); se normalizan
  al cargar con un alto objetivo por pieza.
- **Las casas:** `abandoned_house (1)` (DMC_RELAX) es la casa de Ash; `abandoned_house` (Sengchor) queda como casa
  vecina medio derrumbada.
- **Después del minijuego:** igual que hoy. Si es el día de Ash, aparece la pregunta de pedir comida y después la tele
  del Capitolio; si ya se jugó, "Jugar de nuevo". La historia (días, papeles, fragmentos) no cambia.
- **Sonido:** el ambiente que ya tiene el juego para un distrito (calmo), más el crepitar del tambor con fuego cerca
  del galpón. Sin música nueva.

## Lo que queda a criterio de quien lo construye

- La posición exacta de cada pieza y de cada lugar en la calle.
- El brillo de la viga (sutil) y el marcador de los lugares en 3D.
- Los valores de luz, niebla y color, buscando la referencia de Mia sin glow fuerte.

## Orden

1. Datos del lugar y cámara guiada (puros, con tests).
2. La escena con las piezas, la luz y los efectos, en `/escena/12`.
3. Lugares, mirar alrededor, la viga y su tarjeta.
4. El minijuego en el túnel.
5. Verificar en escritorio y celular, con capturas, y mostrárselo a Mia.
