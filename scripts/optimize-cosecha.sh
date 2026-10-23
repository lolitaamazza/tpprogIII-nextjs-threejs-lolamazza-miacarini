#!/usr/bin/env bash
# Optimiza el tren y la plaza de la Cosecha (originales en assets-src/tren y assets-src/plaza, que no se suben)
# a public/models/tren y public/models/plaza. Uso: bash scripts/optimize-cosecha.sh
set -euo pipefail
cd "$(dirname "$0")/.."
GT="npx -y @gltf-transform/cli@4.5.1"
mkdir -p public/models/tren public/models/plaza

optimize() { # origen destino tamaño-de-textura [más opciones]
  local from=$1 to=$2 size=$3; shift 3
  $GT optimize "$from" "public/models/$to" --compress quantize --texture-compress webp --texture-size "$size" "$@" > /dev/null
}

# Sketchfab (CC BY, créditos en public/models/CREDITS.md). El vagón deja sus piezas separadas para esconder las vías.
optimize assets-src/tren/trains_compartments.glb tren/vagon.glb 512 --join false --flatten false --palette false # sin paleta: el vidrio conserva su material
optimize assets-src/plaza/utrecht_stadhuis.glb plaza/edificio.glb 1024
optimize assets-src/plaza/rca_44bx_microphone.glb plaza/microfono.glb 512
# El cuenco de vidrio (la urna) y la columna traen materiales viejos: se pasan a metal y rugosidad antes de comprimir.
TMP=$(mktemp -d)
$GT metalrough assets-src/plaza/glass_bowl.glb "$TMP/urna.glb" > /dev/null
optimize "$TMP/urna.glb" plaza/urna.glb 512
$GT metalrough assets-src/plaza/classical_pillar.glb "$TMP/columna.glb" > /dev/null # la columna también trae specular-glossiness
optimize "$TMP/columna.glb" plaza/columna.glb 1024
rm -r "$TMP"
du -sh public/models/tren public/models/plaza
