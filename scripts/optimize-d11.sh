#!/usr/bin/env bash
# Optimiza los recursos del Distrito 11 (originales en assets-src/d11, que no se suben) a public/models/d11.
# Texturas a WebP de 1K y geometría cuantizada, que three.js lee sin decodificadores extra. Uso: bash scripts/optimize-d11.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/d11
OUT=public/models/d11
GT="npx -y @gltf-transform/cli@4.5.1"
mkdir -p "$OUT"

optimize() { # origen destino tamaño-de-textura [más opciones]
  local from=$1 to=$2 size=$3; shift 3
  $GT optimize "$from" "$OUT/$to" --compress quantize --texture-compress webp --texture-size "$size" "$@" > /dev/null
}

# Sketchfab (CC BY, créditos en public/models/CREDITS.md)
optimize "$SRC/old_wooden_watchtower.glb" torre.glb 1024
optimize "$SRC/wooden_cabin.glb" cabana.glb 1024
optimize "$SRC/crate_of_pears.glb" cajon-peras.glb 1024
optimize "$SRC/ladder_wooden.glb" escalera.glb 512
optimize "$SRC/wooden_wheelbarrow.glb" carretilla.glb 1024
optimize "$SRC/scarecrow.glb" espantapajaros.glb 1024

# Poly Haven (CC0). El peral se simplifica: se repite en filas.
optimize "$SRC/polyhaven/island_tree_02/island_tree_02_1k.gltf" peral.glb 1024 --simplify-ratio 0.05 --simplify-error 0.05
# El alambrado es un kit: se dejan las piezas separadas para usar solo el panel y el poste.
optimize "$SRC/polyhaven/modular_chainlink_fence/modular_chainlink_fence_1k.gltf" alambrado.glb 1024 --join false --flatten false
for m in food_pears_asian_01 wicker_basket_01 security_light grass_medium_02; do
  optimize "$SRC/polyhaven/$m/${m}_1k.gltf" "$m.glb" 1024
done
cp "$SRC/polyhaven/hdri/citrus_orchard_road_puresky_1k.hdr" "$OUT/"
cp "$SRC"/polyhaven/textures/brown_mud_leaves_01_*_1k.jpg "$OUT/"
cp assets-src/d12/polyhaven/textures/corrugated_iron_*_1k.jpg "$OUT/" # la chapa del galpón
du -sh "$OUT"
