#!/usr/bin/env python3
"""Extrae las piezas del mapa de referencia de Panem.

Genera:
  public/assets/panem.svg           un <path id="district-{id}"> por pieza
  public/assets/seals/{id}.png      sello blanco sobre transparente (128x128)
  docs/reference/panem-map-debug.png  superposición para revisar el resultado

Uso: .venv-tools/bin/python scripts/extract_map.py
Cada región se obtiene con un flood fill desde un punto semilla dentro de la
pieza. Si una pieza sale mal, mover su semilla en SEEDS y volver a correr.
"""
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/reference/panem-map.webp"
OUT_SVG = ROOT / "public/assets/panem.svg"
OUT_SEALS = ROOT / "public/assets/seals"
OUT_DEBUG = ROOT / "docs/reference/panem-map-debug.png"

# Punto (x, y) dentro del relleno de cada pieza, lejos de íconos y etiquetas.
SEEDS = {
    "7": (350, 35), "1": (200, 175), "4": (95, 300), "c": (250, 262),
    "9": (470, 100), "3": (565, 175), "6": (615, 60), "13": (800, 185),
    "12": (760, 385), "8": (470, 352), "11": (650, 440), "2": (385, 405),
    "5": (205, 475), "10": (360, 650),
}
# Centro (x, y) del ícono circular de cada pieza.
ICONS = {
    "7": (225, 40), "1": (300, 148), "4": (50, 220), "c": (275, 240),
    "9": (430, 235), "3": (565, 262), "6": (650, 140), "13": (828, 75),
    "12": (718, 320), "8": (575, 357), "11": (512, 445), "2": (320, 350),
    "5": (165, 405), "10": (320, 535),
}
ICON_R = 30
TOLERANCE = 18
MIN_AREA, MAX_AREA = 1500, 140000


def region_mask(img, seed):
    h, w = img.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8)
    tol = (TOLERANCE,) * 3
    cv2.floodFill(img.copy(), mask, seed, (0, 0, 0), tol, tol, flags)
    region = mask[1:-1, 1:-1]
    # Cierra los agujeros que dejan íconos y etiquetas dentro de la pieza.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(region)
    cv2.drawContours(filled, contours, -1, 255, cv2.FILLED)
    return filled


def mask_to_path(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contour = max(contours, key=cv2.contourArea)
    poly = cv2.approxPolyDP(contour, 1.2, True).reshape(-1, 2)
    points = " L ".join(f"{x} {y}" for x, y in poly)
    return f"M {points} Z", contour


def extract_seal(img, center):
    x, y = center
    r = ICON_R
    crop = img[max(0, y - r):y + r, max(0, x - r):x + r]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    alpha = np.clip((gray.astype(np.int16) - 120) * 3, 0, 255).astype(np.uint8)
    circle = np.zeros_like(alpha)
    cv2.circle(circle, (crop.shape[1] // 2, crop.shape[0] // 2), r - 1, 255, cv2.FILLED)
    alpha = cv2.bitwise_and(alpha, circle)
    white = np.full(crop.shape[:2], 255, np.uint8)
    rgba = cv2.merge([white, white, white, alpha])
    return cv2.resize(rgba, (128, 128), interpolation=cv2.INTER_AREA)


def main():
    img = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"No se pudo leer {SRC}")
    h, w = img.shape[:2]
    debug = img.copy()
    paths, problems = [], []
    for district_id, seed in SEEDS.items():
        mask = region_mask(img, seed)
        area = int(cv2.countNonZero(mask))
        if not MIN_AREA <= area <= MAX_AREA:
            problems.append(f"district-{district_id}: área {area} fuera de rango, revisar semilla {seed}")
        d, contour = mask_to_path(mask)
        mean = cv2.mean(img, mask=mask)
        fill = "#{:02x}{:02x}{:02x}".format(int(mean[2]), int(mean[1]), int(mean[0]))
        paths.append(f'  <path id="district-{district_id}" fill="{fill}" d="{d}"/>')
        hue = (hash(district_id) % 180, 200, 255)
        color = cv2.cvtColor(np.uint8([[hue]]), cv2.COLOR_HSV2BGR)[0][0].tolist()
        cv2.drawContours(debug, [contour], -1, color, 2)
        cv2.circle(debug, seed, 5, (0, 0, 255), cv2.FILLED)
        cv2.putText(debug, district_id, (seed[0] + 6, seed[1] - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    for district_id, center in ICONS.items():
        cv2.circle(debug, center, ICON_R, (0, 255, 255), 1)
    OUT_SVG.parent.mkdir(parents=True, exist_ok=True)
    OUT_SVG.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
        + "\n".join(paths) + "\n</svg>\n",
        encoding="utf-8",
    )
    OUT_SEALS.mkdir(parents=True, exist_ok=True)
    for district_id, center in ICONS.items():
        cv2.imwrite(str(OUT_SEALS / f"{district_id}.png"), extract_seal(img, center))
    cv2.imwrite(str(OUT_DEBUG), debug)
    print(f"OK: {len(paths)} piezas → {OUT_SVG.relative_to(ROOT)}")
    for p in problems:
        print("AVISO:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
