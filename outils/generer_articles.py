#!/usr/bin/env python3
"""
Génère les pages des articles à partir de leurs fichiers Markdown.

    contenus/articles/<id>.md   →   pages/articles/<id>.html
                                →   data/articles.json  (les cartes de la Médiathèque)
                                →   sitemap.xml         (les adresses des articles)

On écrit les articles dans contenus/articles/ (à la main ou depuis le CMS),
puis on lance ce script. Il ne faut jamais modifier à la main les pages de
pages/articles/ ni la liste « articles » de data/articles.json : elles
sont réécrites à chaque passage.

Lancement, depuis la racine du dépôt :
    Windows        py outils/generer_articles.py
    macOS / Linux  python3 outils/generer_articles.py

Options :
    --verifier     contrôle seulement, n'écrit rien (code de sortie 1 si
                   une page générée n'est pas à jour)

Dépendances (une seule fois) : py -m pip install -r outils/requirements.txt

Format d'un article — un en-tête entre deux lignes « --- », puis le texte :

    ---
    titre: Le titre de l'article
    resume: Une ou deux phrases, reprises sous le titre et sur la carte.
    date: 2026-10-03
    lecture: 4 min            # facultatif : calculé si absent
    audio: pratique-xxx       # facultatif : identifiant dans mediatheque.json
    aRenseigner: ...          # facultatif : note « à renseigner » sur la carte
    brouillon: true           # facultatif : l'article n'est pas publié
    ---

    Le texte, en Markdown. Un bloc HTML qui commence en début de ligne par
    <section ou <div est placé hors du texte courant (ex. la pratique guidée).
"""

import argparse
import datetime as dt
import html
import json
import math
import re
import sys
from pathlib import Path

try:
    import markdown
    import yaml
except ImportError:
    sys.exit(
        "Il manque des modules Python. Installe-les une fois avec :\n"
        "    py -m pip install -r outils/requirements.txt   (Windows)\n"
        "    python3 -m pip install -r outils/requirements.txt   (macOS / Linux)"
    )

# ---------------------------------------------------------------- réglages
# Pour réutiliser ce script sur un autre site, c'est ici et dans le gabarit
# (outils/gabarits/article.html) qu'il faut regarder.
SITE = "https://coeur-alchimique.fr"
RACINE = Path(__file__).resolve().parent.parent
SOURCES = RACINE / "contenus" / "articles"
SORTIE = RACINE / "pages" / "articles"
INDEX = RACINE / "data" / "articles.json"
MEDIATHEQUE = RACINE / "data" / "mediatheque.json"
GABARIT = RACINE / "outils" / "gabarits" / "article.html"
SITEMAP = RACINE / "sitemap.xml"
MOTS_PAR_MINUTE = 200
# Lecteur audio ajouté après le texte quand l'article a un champ « audio »
# et que son texte ne place pas lui-même le lecteur.
LECTEUR_AUDIO = (
    '<div class="mt-l" data-rendu="article-audio" '
    'data-intitule="Pour aller plus loin : la pratique"></div>'
)
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
        "août", "septembre", "octobre", "novembre", "décembre"]
CHAMPS_CONNUS = {"titre", "resume", "date", "lecture", "audio", "aRenseigner", "brouillon"}
ID_VALIDE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class Erreur(Exception):
    pass


# ---------------------------------------------------------------- lecture
def lire_article(chemin):
    texte = chemin.read_text(encoding="utf-8").replace("\r\n", "\n").lstrip("﻿")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", texte, re.S)
    if not m:
        raise Erreur("l'en-tête (entre deux lignes « --- ») est absent ou mal fermé")
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise Erreur(f"en-tête illisible : {e}")
    if not isinstance(meta, dict):
        raise Erreur("l'en-tête doit être une liste de « champ: valeur »")

    a = {"id": chemin.stem, "corps": m.group(2).strip("\n")}
    if not ID_VALIDE.match(a["id"]):
        raise Erreur("le nom du fichier doit être en minuscules, sans accent ni espace (ex. mon-article.md)")
    inconnus = set(meta) - CHAMPS_CONNUS
    if inconnus:
        raise Erreur(f"champ(s) inconnu(s) : {', '.join(sorted(inconnus))}")

    for champ in ("titre", "resume"):
        v = meta.get(champ)
        if not isinstance(v, str) or not v.strip():
            raise Erreur(f"le champ « {champ} » est obligatoire")
        # Espaces et retours à la ligne ramenés à une espace ; les espaces
        # insécables (avant « ! », « ? », « : ») sont conservées.
        a[champ] = re.sub(r"[ \t\r\n]+", " ", v).strip()

    d = meta.get("date")
    if isinstance(d, dt.datetime):
        d = d.date()
    if isinstance(d, dt.date):
        a["date"] = d.isoformat()
    elif isinstance(d, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d.strip()):
        try:
            a["date"] = dt.date.fromisoformat(d.strip()).isoformat()
        except ValueError:
            raise Erreur(f"date impossible : {d}")
    elif d in (None, ""):
        raise Erreur("le champ « date » est obligatoire, au format AAAA-MM-JJ")
    else:
        raise Erreur(f"date au format AAAA-MM-JJ attendue, trouvé : {d}")

    lecture = meta.get("lecture")
    if lecture in (None, ""):
        mots = len(re.sub(r"<[^>]+>", " ", a["corps"]).split())
        lecture = f"{max(1, math.ceil(mots / MOTS_PAR_MINUTE))} min"
    elif isinstance(lecture, (int, float)):
        lecture = f"{int(lecture)} min"
    a["lecture"] = str(lecture).strip()

    for champ in ("audio", "aRenseigner"):
        v = meta.get(champ)
        if v not in (None, ""):
            if not isinstance(v, str):
                raise Erreur(f"le champ « {champ} » doit être un texte")
            a[champ] = v.strip()
    a["brouillon"] = meta.get("brouillon") is True
    if not a["corps"].strip():
        raise Erreur("le texte de l'article est vide")
    return a


# ---------------------------------------------------------------- rendu
def decouper(corps):
    """Sépare le texte courant (Markdown) des blocs HTML placés hors du texte.

    Un bloc hors texte commence en début de ligne par <section ou <div et
    court jusqu'à sa balise fermante. Tout le reste est du Markdown.
    """
    lignes = corps.split("\n")
    morceaux, md, i = [], [], 0
    while i < len(lignes):
        ligne = lignes[i]
        m = re.match(r"<(section|div)\b", ligne)
        if m:
            if md:
                morceaux.append(("md", "\n".join(md)))
                md = []
            bloc, balise, prof = [], m.group(1), 0
            while i < len(lignes):
                bloc.append(lignes[i])
                prof += len(re.findall(rf"<{balise}\b", lignes[i]))
                prof -= len(re.findall(rf"</{balise}>", lignes[i]))
                i += 1
                if prof <= 0:
                    break
            if prof > 0:
                raise Erreur(f"bloc <{balise}> jamais refermé")
            morceaux.append(("html", "\n".join(bloc)))
        else:
            md.append(ligne)
            i += 1
    if md:
        morceaux.append(("md", "\n".join(md)))
    return morceaux


def rendre_corps(a):
    sorties = []
    for nature, contenu in decouper(a["corps"]):
        if nature == "html":
            sorties.append(contenu)
        elif contenu.strip():
            rendu = markdown.markdown(contenu, output_format="html")
            sorties.append(f'<div class="prose">\n{rendu}\n</div>')
    corps = "\n\n".join(sorties)
    if a.get("audio") and 'data-rendu="article-audio"' not in corps:
        corps += "\n\n" + LECTEUR_AUDIO
    return corps


def date_lisible(iso):
    d = dt.date.fromisoformat(iso)
    return f"{d.day} {MOIS[d.month - 1]} {d.year}"


def page(a, gabarit):
    valeurs = {
        "avertissement": f"Page générée par outils/generer_articles.py depuis contenus/articles/{a['id']}.md — ne pas la modifier à la main.",
        "site": SITE,
        "titre": html.escape(a["titre"]),
        "resume": html.escape(a["resume"]),
        "url": f"{SITE}/pages/articles/{a['id']}.html",
        "date": a["date"],
        "date_lisible": date_lisible(a["date"]),
        "lecture": html.escape(a["lecture"]),
        "corps": rendre_corps(a),
    }
    return re.sub(r"\{\{(\w+)\}\}", lambda m: valeurs[m.group(1)], gabarit)


def carte(a):
    c = {k: a[k] for k in ("id", "titre", "resume", "date", "lecture")}
    c["lien"] = f"articles/{a['id']}.html"
    for k in ("audio", "aRenseigner"):
        if a.get(k):
            c[k] = a[k]
    return c


def sitemap(texte, articles):
    texte = re.sub(r"\n?[ \t]*<url>\s*<loc>[^<]*/pages/articles?[-/][^<]*</loc>.*?</url>", "", texte, flags=re.S)
    blocs = "".join(
        f"\n  <url>\n    <loc>{SITE}/pages/articles/{a['id']}.html</loc>\n"
        f"    <lastmod>{a['date']}</lastmod>\n    <priority>0.6</priority>\n  </url>"
        for a in articles
    )
    return texte.replace("\n</urlset>", blocs + "\n</urlset>")


# ---------------------------------------------------------------- programme
def main():
    p = argparse.ArgumentParser(description="Génère les pages des articles.")
    p.add_argument("--verifier", action="store_true", help="contrôle seulement, n'écrit rien")
    args = p.parse_args()

    erreurs, articles = [], []
    for chemin in sorted(SOURCES.glob("*.md")):
        try:
            articles.append(lire_article(chemin))
        except Erreur as e:
            erreurs.append(f"{chemin.relative_to(RACINE)} : {e}")

    media = json.loads(MEDIATHEQUE.read_text(encoding="utf-8"))
    ids_media = {i["id"] for i in media.get("items", [])}
    for a in articles:
        if a.get("audio") and a["audio"] not in ids_media:
            erreurs.append(f"contenus/articles/{a['id']}.md : l'audio « {a['audio']} » n'existe pas dans data/mediatheque.json")
    if erreurs:
        print("Rien n'a été écrit. À corriger d'abord :", file=sys.stderr)
        for e in erreurs:
            print("  - " + e, file=sys.stderr)
        sys.exit(1)

    publies = [a for a in articles if not a["brouillon"]]
    gabarit = GABARIT.read_text(encoding="utf-8")

    # Ordre des cartes : celui de data/articles.json pour les articles déjà
    # connus ; les nouveaux passent devant, du plus récent au plus ancien.
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    rang = {c["id"]: n for n, c in enumerate(index.get("articles", []))}
    nouveaux = sorted((a for a in publies if a["id"] not in rang), key=lambda a: a["date"], reverse=True)
    anciens = sorted((a for a in publies if a["id"] in rang), key=lambda a: rang[a["id"]])
    ordonnes = nouveaux + anciens

    fichiers = {SORTIE / f"{a['id']}.html": page(a, gabarit) for a in ordonnes}
    index["articles"] = [carte(a) for a in ordonnes]
    fichiers[INDEX] = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
    fichiers[SITEMAP] = sitemap(SITEMAP.read_text(encoding="utf-8"), ordonnes)
    perimes = [f for f in SORTIE.glob("*.html") if f not in fichiers]

    a_jour = lambda f, c: f.exists() and f.read_text(encoding="utf-8").replace("\r\n", "\n") == c
    changes = [f for f, c in fichiers.items() if not a_jour(f, c)]

    if args.verifier:
        if changes or perimes:
            print("Pas à jour — lance outils/generer_articles.py :")
            for f in changes + perimes:
                print("  - " + str(f.relative_to(RACINE)))
            sys.exit(1)
        print(f"À jour : {len(ordonnes)} article(s) publié(s).")
        return

    SORTIE.mkdir(parents=True, exist_ok=True)
    for f in changes:
        f.write_text(fichiers[f], encoding="utf-8", newline="\n")
    for f in perimes:
        f.unlink()
    print(f"{len(ordonnes)} article(s) publié(s), {len(articles) - len(publies)} brouillon(s).")
    for f in changes:
        print("  écrit    " + str(f.relative_to(RACINE)))
    for f in perimes:
        print("  supprimé " + str(f.relative_to(RACINE)))
    if not changes and not perimes:
        print("  rien n'a changé")


if __name__ == "__main__":
    main()
