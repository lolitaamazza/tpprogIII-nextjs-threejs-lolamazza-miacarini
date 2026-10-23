#!/usr/bin/env bash
# Optimiza los recursos del Distrito 12 (originales en assets-src/d12, que no se suben) a public/models/d12.
# Texturas a WebP (1K, o 2K en la boca de la mina, que se ve de cerca) y geometría cuantizada,
# que three.js lee sin decodificadores extra. Uso: bash scripts/optimize-d12.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/d12
OUT=public/models/d12
GT="npx -y @gltf-transform/cli@4.5.1"
mkdir -p "$OUT"

optimize() { # origen destino tamaño-de-textura
  $GT optimize "$1" "$OUT/$2" --compress quantize --texture-compress webp --texture-size "$3" > /dev/null
}

# Sketchfab (CC BY, créditos en public/models/CREDITS.md)
optimize "$SRC/abandoned_house (1).glb" casa-ash.glb 1024
optimize "$SRC/abandoned_house.glb" casa-vecina.glb 1024
optimize "$SRC/mine_cart__3december_2022.glb" boca-mina.glb 2048
optimize "$SRC/abandoned_mine.glb" tunel.glb 1024
optimize "$SRC/copper_and_glass_hand_lamp.glb" farol-minero.glb 1024

# Poly Haven (CC0)
for m in picke_dirty_01 sledgehammer_01 wooden_lantern_01 Lantern_01 wooden_crate_02 barrel_stove rock_moss_set_01; do
  optimize "$SRC/polyhaven/$m/${m}_1k.gltf" "$m.glb" 1024
done
# Los postes de luz se arman con geometría en la escena (el kit modular de Poly Haven venía en piezas sueltas).
cp "$SRC/polyhaven/hdri/satara_night_1k.hdr" "$OUT/"
cp "$SRC"/polyhaven/textures/{burned_ground_01,brown_mud_02,corrugated_iron}_*_1k.jpg "$OUT/"
du -sh "$OUT"
