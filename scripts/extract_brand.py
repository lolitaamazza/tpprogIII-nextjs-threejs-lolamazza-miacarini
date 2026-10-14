#!/usr/bin/env python3
"""Extrae el sello de Panem de la bandera de referencia (docs/reference/panem-flag.webp).

Genera:
  public/assets/brand/panem-seal.png   sello dorado sobre fondo transparente (512x512)
  app/icon.png                         ícono de la pestaña: sello dorado sobre rojo Panem (256x256)

Uso: .venv-tools/bin/python scripts/extract_brand.py
El alfa sale de proyectar cada píxel sobre el segmento fondo → oro, así que los bordes
suavizados de la bandera se conservan.
"""
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/reference/panem-flag.webp"
OUT_SEAL = ROOT / "public/assets/brand/panem-seal.png"
OUT_ICON = ROOT / "app/icon.png"

RED_BGR = np.array([1, 0, 123], np.float32)      # #7b0001, el rojo de la bandera
GOLD_BGR = np.array([55, 175, 212], np.float32)  # #d4af37, el oro del sello
PADDING = 12


def main():
    img = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"No se pudo leer {SRC}")
    axis = GOLD_BGR - RED_BGR
    t = ((img.astype(np.float32) - RED_BGR) @ axis) / float(axis @ axis)
    alpha = np.clip(t, 0, 1)
    alpha[alpha < 0.04] = 0  # ruido de compresión del fondo
    ys, xs = np.where(alpha > 0)
    x0, x1 = max(xs.min() - PADDING, 0), min(xs.max() + PADDING, img.shape[1] - 1)
    y0, y1 = max(ys.min() - PADDING, 0), min(ys.max() + PADDING, img.shape[0] - 1)
    crop = alpha[y0:y1 + 1, x0:x1 + 1]
    side = max(crop.shape)
    square = np.zeros((side, side), np.float32)
    oy, ox = (side - crop.shape[0]) // 2, (side - crop.shape[1]) // 2
    square[oy:oy + crop.shape[0], ox:ox + crop.shape[1]] = crop

    def seal(size):
        a = cv2.resize(square, (size, size), interpolation=cv2.INTER_AREA)
        rgba = np.zeros((size, size, 4), np.float32)
        rgba[..., :3] = GOLD_BGR
        rgba[..., 3] = a * 255
        return rgba

    OUT_SEAL.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT_SEAL), seal(512).astype(np.uint8))

    # Ícono de pestaña: cuadrado redondeado rojo con el sello al 80 %
    size = 256
    icon = np.zeros((size, size, 4), np.float32)
    mask = np.zeros((size, size), np.uint8)
    cv2.rectangle(mask, (0, 0), (size - 1, size - 1), 255, cv2.FILLED)
    radius = 44
    mask[:] = 0
    cv2.rectangle(mask, (radius, 0), (size - radius, size), 255, cv2.FILLED)
    cv2.rectangle(mask, (0, radius), (size, size - radius), 255, cv2.FILLED)
    for cx, cy in [(radius, radius), (size - radius, radius), (radius, size - radius), (size - radius, size - radius)]:
        cv2.circle(mask, (cx, cy), radius, 255, cv2.FILLED)
    icon[..., :3] = RED_BGR
    icon[..., 3] = mask
    inner = int(size * 0.8)
    s = seal(inner)
    o = (size - inner) // 2
    a = s[..., 3:4] / 255.0
    region = icon[o:o + inner, o:o + inner]
    region[..., :3] = s[..., :3] * a + region[..., :3] * (1 - a)
    cv2.imwrite(str(OUT_ICON), icon.astype(np.uint8))
    print(f"OK: {OUT_SEAL.relative_to(ROOT)} {OUT_SEAL.stat().st_size // 1024} KB, {OUT_ICON.relative_to(ROOT)} {OUT_ICON.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
