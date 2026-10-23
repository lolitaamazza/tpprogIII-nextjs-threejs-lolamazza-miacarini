#!/usr/bin/env bash
# Optimiza los recursos del Distrito 4 (originales en assets-src/d4, que no se suben) a public/models/d4.
# Texturas a WebP de 1K y geometría cuantizada, que three.js lee sin decodificadores extra. Uso: bash scripts/optimize-d4.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/d4
OUT=public/models/d4
GT="npx -y @gltf-transform/cli@4.5.1"
mkdir -p "$OUT"

optimize() { # origen destino tamaño-de-textura [más opciones]
  local from=$1 to=$2 size=$3; shift 3
  $GT optimize "$from" "$OUT/$to" --compress quantize --texture-compress webp --texture-size "$size" "$@" > /dev/null
}

# Sketchfab (CC BY, créditos en public/models/CREDITS.md)
optimize "$SRC/old_lighthouse.glb" faro.glb 1024
# El pesquero y el cuenco traen materiales viejos (specular-glossiness) que three.js ya no lee: se pasan a metal y
# rugosidad antes de comprimir (después, la conversión deja texturas PNG pesadas).
TMP=$(mktemp -d)
$GT metalrough "$SRC/fishing_boat_duval.glb" "$TMP/bote.glb" > /dev/null
$GT metalrough assets-src/plaza/glass_bowl.glb "$TMP/cuenco.glb" > /dev/null
optimize "$TMP/bote.glb" bote-grande.glb 1024
optimize "$SRC/fishing_boat_pabooklas.glb" bote-marin.glb 1024
optimize "$SRC/fishing_net.glb" red.glb 1024
optimize "$SRC/fishing_supplies_set.glb" aparejos.glb 1024
optimize "$SRC/skipskranen.glb" grua.glb 1024
optimize "$TMP/cuenco.glb" cuenco.glb 512
optimize assets-src/d11/wooden_cabin.glb casa.glb 1024 # la misma cabaña de madera del 11

# Poly Haven (CC0). El muelle y los barriles son kits: se dejan las piezas separadas.
optimize "$SRC/polyhaven/modular_wooden_pier/modular_wooden_pier_1k.gltf" muelle.glb 1024 --join false --flatten false
optimize "$SRC/polyhaven/wooden_barrels_01/wooden_barrels_01_1k.gltf" barriles.glb 1024 --join false --flatten false
optimize "$SRC/polyhaven/coast_rocks_01/coast_rocks_01_1k.gltf" rocas.glb 1024 --simplify-ratio 0.25 --simplify-error 0.01
for m in ocean_buoy lifebuoy wooden_bucket_01; do
  optimize "$SRC/polyhaven/$m/${m}_1k.gltf" "$m.glb" 1024
done
rm -r "$TMP"
cp "$SRC/polyhaven/hdri/kiara_1_dawn_1k.hdr" "$OUT/"
cp "$SRC"/polyhaven/textures/coast_sand_rocks_02_*_1k.jpg "$OUT/"
du -sh "$OUT"
