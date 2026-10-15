# Plan: la sala de transmisión en 3D

Decidido con Mia el 2026-10-15: el texto dentro del mundo va en inglés (la interfaz sigue en español), estética años 50 como la sala de teles de los 10.º Juegos, público como siluetas de espaldas, la tele sigue diciendo "Capitol TV".

## Objetivo

La intro deja de ser una tele dibujada con CSS y pasa a ser una escena 3D dentro del mismo canvas del mapa: un salón curvo con ventanales, la tele central sobre un panel de rayos, dos paredes de teles chicas, lámparas naranjas, filas de sillas con público de espaldas y una figura parada en el pasillo. Al final la cámara entra en la pantalla, que ya muestra el mapa, y se corta al mapa real sin que se note.

## Arquitectura

- `lib/broadcastHall.js` (puro, con tests): medidas de la sala, butacas y público, ubicación y contenido de las teles chicas, orden de encendido en cascada, poses de cámara según la proporción de pantalla, textos en inglés de la pantalla.
- `components/stage/broadcastHall.js`: arma la sala con Three.js (geometría propia, `InstancedMesh` para sillas, público, gabinetes y monitores), el material de pantalla (shader con corrimiento, aberración, ruido, línea de encendido y “portal” al mapa) y los dibujos en canvas de cada vista. Se crea al entrar a `/` y se libera al salir.
- `components/stage/panemScene.js`: la pose `intro` apunta a la sala; expone `api.hall` (`setPower`, `setView`, `setGlitch`, `setSmallTvs`, `screenRect`, `enter`). Al salir de la intro sin pasar por la pantalla, la cámara corta al mapa en lugar de volar 60 unidades.
- `components/panem/TvIntro.js`: la lógica de fases queda igual y maneja la pantalla a través de un adaptador. Con WebGL usa la sala 3D y ubica el iframe del clip sobre la pantalla proyectada; sin WebGL se queda la tele CSS actual como alternativa.

## Etapas (cada una se puede entregar sola)

1. Módulo puro + tests; sala con tele central, pantalla con logo, anuncio y señal pirata; cámara fija.
2. Teles chicas (sellos de distritos, Capitolio, el 13 sin señal), sillas, público, escritorios con monitores, lámparas.
3. Corte de señal en el shader y en las teles chicas; clip alineado sobre la pantalla.
4. Entrada de la cámara a la pantalla con el mapa como portal y corte al mapa.
5. Pulido: celular, movimiento reducido, sin WebGL, rendimiento.
