#!/usr/bin/env python3
"""
Génère un placeholder unique par emplacement d'image du site.

Chaque fichier porte son nom définitif : le jour où la vraie image
existe, on écrase le fichier au même chemin et rien d'autre ne bouge.

Usage : python3 outils/generer-placeholders.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

RACINE = Path(__file__).resolve().parent.parent
IMAGES = RACINE / "assets" / "images"

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

BLEU_HAUT = (10, 21, 38)
BLEU_BAS = (22, 48, 90)
OR = (201, 162, 39)
OR_CLAIR = (227, 200, 121)
CREME = (246, 241, 230)


def police(chemin, taille):
    try:
        return ImageFont.truetype(chemin, taille)
    except OSError:
        return ImageFont.load_default()


def centrer(draw, texte, font, largeur, y, couleur):
    gauche, haut, droite, bas = draw.textbbox((0, 0), texte, font=font)
    draw.text(((largeur - (droite - gauche)) / 2 - gauche, y), texte, font=font, fill=couleur)
    return bas - haut


def couper(texte, font, draw, largeur_max):
    mots, lignes, courante = texte.split(), [], ""
    for mot in mots:
        essai = f"{courante} {mot}".strip()
        if draw.textlength(essai, font=font) <= largeur_max:
            courante = essai
        else:
            if courante:
                lignes.append(courante)
            courante = mot
    if courante:
        lignes.append(courante)
    return lignes


def fabriquer(chemin_relatif, libelle, largeur, hauteur):
    image = Image.new("RGB", (largeur, hauteur), BLEU_HAUT)
    draw = ImageDraw.Draw(image)

    # Dégradé vertical bleu profond -> bleu
    for y in range(hauteur):
        t = y / max(hauteur - 1, 1)
        draw.line(
            [(0, y), (largeur, y)],
            fill=tuple(round(BLEU_HAUT[i] + (BLEU_BAS[i] - BLEU_HAUT[i]) * t) for i in range(3)),
        )

    # Liseré doré
    marge = max(8, round(min(largeur, hauteur) * 0.035))
    draw.rectangle([marge, marge, largeur - marge, hauteur - marge], outline=OR, width=2)

    # Losange décoratif
    cx, cy = largeur / 2, hauteur * 0.24
    r = min(largeur, hauteur) * 0.055
    draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], outline=OR_CLAIR, width=2)

    f_titre = police(SERIF, max(15, round(largeur * 0.052)))
    f_petit = police(SANS, max(10, round(largeur * 0.026)))
    f_mono = police(MONO, max(9, round(largeur * 0.023)))

    y = hauteur * 0.40
    for ligne in couper(libelle, f_titre, draw, largeur - 2 * marge - 24):
        y += centrer(draw, ligne, f_titre, largeur, y, CREME) + round(largeur * 0.022)

    y += round(hauteur * 0.035)
    y += centrer(draw, "image à remplacer", f_petit, largeur, y, OR_CLAIR) + round(hauteur * 0.022)
    y += centrer(draw, chemin_relatif, f_mono, largeur, y, (157, 192, 232)) + round(hauteur * 0.012)
    centrer(draw, f"{largeur} × {hauteur}", f_mono, largeur, y, (120, 145, 180))

    sortie = IMAGES / chemin_relatif
    sortie.parent.mkdir(parents=True, exist_ok=True)
    image.save(sortie, "WEBP", quality=82, method=6)
    return sortie


def lire(nom):
    return json.loads((RACINE / "data" / f"{nom}.json").read_text(encoding="utf-8"))


def main():
    faits = []

    # Accueil
    # Le hero n'est plus un placeholder : c'est la vraie photo de bibliothèque,
    # déclinée en trois largeurs (hero-bibliotheque-1200/1800/2400.webp).
    faits.append(fabriquer("accueil/atmosphere-soin.webp", "Atmosphère — l'espace de soin", 1200, 800))

    # Sophie
    sophie = lire("sophie")
    faits.append(
        fabriquer(sophie["photo"].replace("/assets/images/", ""), "Portrait de Sophie Loret", 800, 1000)
    )

    # Soins
    for option in lire("soins")["options"]:
        faits.append(
            fabriquer(option["image"].replace("/assets/images/", ""), option["nom"], 960, 600)
        )

    # E-learnings
    for p in lire("elearnings")["programmes"]:
        faits.append(fabriquer(p["image"].replace("/assets/images/", ""), p["nom"], 960, 600))

    # Livres — format portrait, comme une couverture
    for o in lire("livres")["ouvrages"]:
        faits.append(fabriquer(o["image"].replace("/assets/images/", ""), o["titre"], 700, 1000))

    print(f"{len(faits)} placeholders générés :")
    for f in faits:
        print("  -", f.relative_to(RACINE))


if __name__ == "__main__":
    main()
