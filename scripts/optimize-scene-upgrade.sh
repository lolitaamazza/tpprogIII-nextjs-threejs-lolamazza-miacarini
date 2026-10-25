#!/usr/bin/env bash
# Originales: descargas oficiales aprobadas; créditos en public/models/CREDITS.md.
set -euo pipefail
cd "$(dirname "$0")/.."
GT=${GLTF_TRANSFORM:-npx -y @gltf-transform/cli@4.5.1}
SRC=assets-src/scene-upgrade
OUT=public/models/scene-props
mkdir -p "$OUT"
for name in painted_wooden_chair_01 vintage_day_bed metal_toolbox watering_can_metal_01 fern_02 nettle_plant tree_stump_01 fish_knife; do
  args=()
  if [[ "$name" == tree_stump_01 ]]; then args=(--simplify-ratio 0.25 --simplify-error 0.01); fi
  $GT optimize "$SRC/$name/${name}_1k.gltf" "$OUT/$name.glb" --compress quantize --texture-compress webp --texture-size 1024 ${args[@]+"${args[@]}"} > /dev/null
  echo "$name listo"
done
for name in log_cabin_interior wooden_log_cabin old_wooden_barn_house_4 rustic_wooden_table_antique_farmhouse_style; do
  if [[ -f "$SRC/sketchfab/$name.glb" ]]; then
    resolution=1024
    if [[ "$name" == wooden_log_cabin || "$name" == old_wooden_barn_house_4 ]]; then resolution=512; fi
    $GT optimize "$SRC/sketchfab/$name.glb" "$OUT/$name.glb" --compress quantize --texture-compress webp --texture-size "$resolution" --join false --flatten false > /dev/null
    echo "$name listo"
  fi
done
