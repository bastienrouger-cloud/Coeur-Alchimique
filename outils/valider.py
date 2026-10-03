#!/usr/bin/env python3
"""
Vérifie les données du site avant publication.

    Windows        py outils/valider.py
    macOS / Linux  python3 outils/valider.py

Contrôle :
  - que chaque fichier de data/ est un JSON valide (avec la ligne fautive) ;
  - que chaque entrée a ses champs obligatoires, du bon type ;
  - les formats : dates AAAA-MM-JJ, prix en nombre, liens ;
  - que les images, PDF, audios et pages cités existent bien sur le disque ;
  - les renvois entre fichiers (un audio cité par un article existe dans la
    médiathèque, un terme du vocabulaire renvoie à un terme qui existe…) ;
  - que les pages des articles sont à jour par rapport à contenus/articles/.

Les ERREURS cassent quelque chose sur le site : à corriger avant de publier
(code de sortie 1). Les AVERTISSEMENTS signalent un contenu incomplet
(lien Payhip manquant, note « à renseigner »…) : le site fonctionne.

Aucune dépendance : seulement Python 3.
"""

import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"
erreurs, avertissements = [], []


def err(ou, msg):
    erreurs.append(f"{ou} : {msg}")


def avert(ou, msg):
    avertissements.append(f"{ou} : {msg}")


# ---------------------------------------------------------------- types
def est_texte(v):
    return isinstance(v, str) and v.strip() != ""


def est_date(v):
    if not isinstance(v, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return False
    try:
        dt.date.fromisoformat(v)
        return True
    except ValueError:
        return False


def chemin_local(valeur, base="."):
    """Chemin d'un fichier du site : « /assets/x » part de la racine, « x » de `base`."""
    v = valeur.split("#")[0].split("?")[0]
    return (RACINE / v.lstrip("/")) if v.startswith("/") else (RACINE / base / v)


def verifier_lien(ou, v, base="."):
    if not isinstance(v, str) or not v.strip():
        err(ou, "lien vide")
    elif v == "#":
        pass  # signalé à part, selon le contexte
    elif re.match(r"^(https?://|mailto:)", v):
        if " " in v:
            err(ou, f"lien avec une espace : {v}")
    elif not chemin_local(v, base).exists():
        err(ou, f"page ou fichier introuvable : {v}")


def verifier_fichier(ou, v):
    if not est_texte(v):
        err(ou, "chemin de fichier vide")
    elif not chemin_local(v).is_file():
        err(ou, f"fichier introuvable : {v}")


# ---------------------------------------------------------------- règles
# Chaque champ : nom -> (type, obligatoire). Types : texte, nombre, date,
# liste, objet, bool, fichier (doit exister), lien, page (lien relatif à pages/).
def champs(ou, objet, regles, connus_en_plus=()):
    if not isinstance(objet, dict):
        err(ou, "devrait être un objet { … }")
        return
    for nom, (genre, oblig) in regles.items():
        v = objet.get(nom)
        if v is None or v == "" or v == []:
            if oblig:
                err(ou, f"champ obligatoire manquant : « {nom} »")
            continue
        f = f"{ou} › {nom}"
        if genre == "texte" and not est_texte(v):
            err(f, "devrait être un texte")
        elif genre == "nombre" and (not isinstance(v, (int, float)) or isinstance(v, bool)):
            err(f, f"devrait être un nombre (sans guillemets), trouvé : {v!r}")
        elif genre == "date" and not est_date(v):
            err(f, f"date au format AAAA-MM-JJ attendue, trouvé : {v!r}")
        elif genre == "liste" and not isinstance(v, list):
            err(f, "devrait être une liste [ … ]")
        elif genre == "objet" and not isinstance(v, dict):
            err(f, "devrait être un objet { … }")
        elif genre == "bool" and not isinstance(v, bool):
            err(f, "devrait valoir true ou false")
        elif genre == "fichier":
            verifier_fichier(f, v)
        elif genre == "lien":
            verifier_lien(f, v)
        elif genre == "page":
            verifier_lien(f, v, base="pages")
    inconnus = set(objet) - set(regles) - set(connus_en_plus)
    for nom in sorted(inconnus):
        avert(ou, f"champ inconnu « {nom} » (faute de frappe ?)")


def liste(ou, valeur, regles, cle="id", connus_en_plus=()):
    """Vérifie une liste d'entrées ; renvoie l'ensemble de leurs identifiants."""
    if not isinstance(valeur, list):
        err(ou, "devrait être une liste [ … ]")
        return set()
    vus = set()
    for n, e in enumerate(valeur, 1):
        nom = e.get(cle) if isinstance(e, dict) and cle else None
        ici = f"{ou}[{nom or n}]"
        champs(ici, e, regles, connus_en_plus)
        if nom:
            if nom in vus:
                err(ici, f"identifiant en double : {nom}")
            vus.add(nom)
            if cle == "id" and not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", str(nom)):
                err(ici, "l'identifiant doit être en minuscules, sans accent ni espace")
    return vus


T, O = True, False  # obligatoire / facultatif
INTRO = {"surtitre": ("texte", O), "titre": ("texte", T), "chapo": ("texte", O), "note": ("texte", O), "texte": ("texte", O)}


def regles(d):
    """Une fonction par fichier de data/."""
    ids = {}

    def articles(x):
        champs("articles.json", x, {"intro": ("objet", T), "articles": ("liste", T)})
        champs("articles.json › intro", x.get("intro", {}), INTRO)
        ids["articles"] = liste("articles.json › articles", x.get("articles"), {
            "id": ("texte", T), "titre": ("texte", T), "resume": ("texte", T), "date": ("date", T),
            "lecture": ("texte", T), "lien": ("page", T), "audio": ("texte", O), "aRenseigner": ("texte", O)})

    def elearnings(x):
        champs("elearnings.json", x, {"intro": ("objet", T), "programmes": ("liste", T), "tutorat": ("objet", O), "achat": ("objet", O)})
        ids["elearnings"] = liste("elearnings.json › programmes", x.get("programmes"), {
            "id": ("texte", T), "nom": ("texte", T), "promesse": ("texte", T), "prix": ("nombre", T),
            "duree": ("texte", T), "niveau": ("texte", T), "image": ("fichier", T), "alt": ("texte", T),
            "contenu": ("liste", T), "description": ("texte", T), "lien": ("lien", O)})
        for p in x.get("programmes", []):
            if isinstance(p, dict) and not p.get("lien"):
                avert(f"elearnings.json › programmes[{p.get('id')}]", "pas de lien Payhip : le bouton renvoie vers « Poser une question »")

    def etats_coeur(x):
        champs("etats-coeur.json", x, {"intro": ("objet", T), "etats": ("liste", T)})
        liste("etats-coeur.json › intro › etapes", x.get("intro", {}).get("etapes", []),
              {"numero": ("texte", T), "titre": ("texte", T), "texte": ("texte", T)}, cle="numero")
        liste("etats-coeur.json › etats", x.get("etats"), {
            "id": ("texte", T), "nom": ("texte", T), "accroche": ("texte", T), "sousTitre": ("texte", T),
            "resume": ("texte", T), "texte": ("texte", T), "signes": ("liste", T), "teinte": ("texte", T)})

    def livre_dor(x):
        champs("livre-dor.json", x, {"messages": ("liste", O)})
        liste("livre-dor.json › messages", x.get("messages", []), {
            "prenom": ("texte", T), "message": ("texte", T), "date": ("date", T),
            "accueil": ("bool", O), "extrait": ("texte", O)}, cle=None)

    def livres(x):
        champs("livres.json", x, {"intro": ("objet", T), "ouvrages": ("liste", T)})
        liste("livres.json › ouvrages", x.get("ouvrages"), {
            "id": ("texte", T), "titre": ("texte", T), "sousTitre": ("texte", O), "genre": ("texte", T),
            "support": ("texte", T), "format": ("texte", T), "editeur": ("texte", O), "lien": ("lien", T),
            "prix": ("nombre", T), "description": ("texte", T), "image": ("fichier", T), "alt": ("texte", T),
            "isbn": ("texte", O), "parution": ("nombre", O), "aRenseigner": ("texte", O)})
        for o in x.get("ouvrages", []):
            if isinstance(o, dict) and "paypal.com/donate" in str(o.get("lien", "")):
                avert(f"livres.json › ouvrages[{o.get('id')}]", "vendu par un bouton PayPal « Don » (à remplacer par Payhip)")

    def mediatheque(x):
        champs("mediatheque.json", x, {"intro": ("objet", T), "rayons": ("liste", T), "items": ("liste", T)})
        ids["rayons"] = liste("mediatheque.json › rayons", x.get("rayons"), {"id": ("texte", T), "titre": ("texte", T), "chapo": ("texte", T)})
        ids["mediatheque"] = liste("mediatheque.json › items", x.get("items"), {
            "id": ("texte", T), "rayon": ("texte", T), "acces": ("texte", T), "titre": ("texte", T),
            "sousTitre": ("texte", O), "genre": ("texte", T), "support": ("texte", T), "detail": ("texte", T),
            "description": ("texte", T), "fichier": ("fichier", O), "image": ("fichier", O), "lien": ("page", O),
            "aRenseigner": ("texte", O)})
        for i in x.get("items", []):
            if isinstance(i, dict):
                ou = f"mediatheque.json › items[{i.get('id')}]"
                if not i.get("fichier") and not i.get("lien"):
                    err(ou, "il faut un « fichier » ou un « lien »")
                if i.get("rayon") and i["rayon"] not in ids["rayons"]:
                    err(ou, f"rayon inconnu : {i['rayon']}")

    def miroir(x):
        champs("miroir.json", x, {"intro": ("objet", T), "figures": ("liste", T), "etats": ("liste", T)})
        figs = liste("miroir.json › figures", x.get("figures"), {"id": ("texte", T), "nom": ("texte", T)})
        liste("miroir.json › etats", x.get("etats"), {"id": ("texte", T), "titre": ("texte", T), "texte": ("texte", T), "figures": ("objet", T)})
        for e in x.get("etats", []):
            for f, v in (e.get("figures") or {}).items():
                ou = f"miroir.json › etats[{e.get('id')}] › figures › {f}"
                if f not in figs:
                    err(ou, "figure inconnue")
                champs(ou, v, {"rang": ("nombre", T), "detail": ("texte", T)})

    def site(x):
        champs("site.json", x, {
            "nom": ("texte", T), "baseline": ("texte", T), "praticienne": ("texte", O), "email": ("texte", T),
            "delaiReponse": ("texte", O), "mentionTechnique": ("texte", O), "cadre": ("objet", T),
            "nav": ("liste", T), "navSecondaire": ("liste", O), "reseaux": ("liste", O)})
        if x.get("email") and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", x["email"]):
            err("site.json › email", f"adresse invalide : {x['email']}")
        for cle in ("nav", "navSecondaire"):
            liste(f"site.json › {cle}", x.get(cle, []), {"label": ("texte", T), "href": ("lien", T), "aussi": ("liste", O)}, cle="label")
        liste("site.json › reseaux", x.get("reseaux", []), {"label": ("texte", T), "href": ("texte", T), "icone": ("texte", T)}, cle="label")
        for r in x.get("reseaux", []):
            if r.get("href") in (None, "", "#"):
                avert(f"site.json › reseaux[{r.get('label')}]", "adresse du compte à renseigner")

    def soins(x):
        champs("soins.json", x, {"titre": ("texte", T), "accroche": ("texte", O), "modalite": ("texte", O),
                                  "accrocheFormules": ("texte", O), "noteAutoSoin": ("texte", O),
                                  "options": ("liste", T), "origine": ("objet", O), "faq": ("liste", O)})
        liste("soins.json › options", x.get("options"), {
            "id": ("texte", T), "numero": ("texte", T), "nom": ("texte", T), "resume": ("texte", T), "duree": ("texte", T),
            "prix": ("nombre", T), "canal": ("texte", T), "image": ("fichier", T), "alt": ("texte", T),
            "description": ("texte", T), "description2": ("texte", O), "etapes": ("liste", T), "fin": ("texte", O)})
        liste("soins.json › faq", x.get("faq", []), {"q": ("texte", T), "r": ("texte", T)}, cle=None)

    def sophie(x):
        champs("sophie.json", x, {
            "nom": ("texte", T), "role": ("texte", O), "photo": ("fichier", T), "alt": ("texte", T),
            "accroche": ("texte", O), "marqueAccroche": ("liste", O), "motifAccroche": ("liste", O),
            "presentation": ("liste", T), "frise": ("liste", T), "filConducteur": ("objet", O), "citation": ("texte", O)})
        liste("sophie.json › frise", x.get("frise"), {"periode": ("texte", T), "embleme": ("texte", T), "titre": ("texte", T),
                                                      "texte": ("texte", T), "aRenseigner": ("texte", O)}, cle=None)

    def vocabulaire(x):
        champs("vocabulaire.json", x, {"intro": ("objet", T), "termes": ("liste", T), "familles": ("liste", T)})
        fams = liste("vocabulaire.json › familles", x.get("familles"), {"id": ("texte", T), "titre": ("texte", T)})
        termes = liste("vocabulaire.json › termes", x.get("termes"), {
            "id": ("texte", T), "terme": ("texte", T), "definition": ("texte", T), "voirAussi": ("liste", O), "famille": ("texte", T)})
        for t in x.get("termes", []):
            ou = f"vocabulaire.json › termes[{t.get('id')}]"
            if t.get("famille") and t["famille"] not in fams:
                err(ou, f"famille inconnue : {t['famille']}")
            for v in t.get("voirAussi") or []:
                if v not in termes:
                    err(ou, f"« voirAussi » renvoie à un terme qui n'existe pas : {v}")

    fonctions = {"articles": articles, "elearnings": elearnings, "etats-coeur": etats_coeur, "livre-dor": livre_dor,
                 "livres": livres, "mediatheque": mediatheque, "miroir": miroir, "site": site, "soins": soins,
                 "sophie": sophie, "vocabulaire": vocabulaire}
    # mediatheque avant articles : les articles renvoient à ses audios
    for nom in sorted(d, key=lambda n: (n != "mediatheque", n)):
        if nom in fonctions:
            try:
                fonctions[nom](d[nom])
            except (AttributeError, TypeError) as e:
                err(f"{nom}.json", f"structure inattendue ({e})")
        else:
            avert(f"{nom}.json", "aucune règle de vérification pour ce fichier")

    # renvois entre fichiers
    for a in (d.get("articles") or {}).get("articles", []):
        if isinstance(a, dict) and a.get("audio") and a["audio"] not in ids.get("mediatheque", set()):
            err(f"articles.json › articles[{a.get('id')}]", f"l'audio « {a['audio']} » n'existe pas dans mediatheque.json")
        if isinstance(a, dict) and a.get("aRenseigner"):
            avert(f"articles.json › articles[{a.get('id')}]", f"à renseigner : {a['aRenseigner']}")


# ---------------------------------------------------------------- CMS
def verifier_config_cms(donnees):
    """Le CMS supprime à l'enregistrement tout champ qu'il ne connaît pas :
    chaque clé présente dans un fichier qu'il édite doit être décrite dans
    admin/config.yml."""
    conf = RACINE / "admin" / "config.yml"
    if not conf.exists():
        return
    try:
        import yaml
    except ImportError:
        avert("admin/config.yml", "module PyYAML absent : configuration du CMS non vérifiée (py -m pip install -r outils/requirements.txt)")
        return
    try:
        c = yaml.safe_load(conf.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        err("admin/config.yml", f"fichier illisible : {e}")
        return

    def comparer(ou, valeur, champs_conf):
        connus = {f["name"]: f for f in champs_conf}
        if not isinstance(valeur, dict):
            return
        for cle, v in valeur.items():
            f = connus.get(cle)
            if f is None:
                err(ou, f"le champ « {cle} » n'est pas décrit dans admin/config.yml : le CMS le SUPPRIMERAIT au premier enregistrement")
                continue
            sous = f.get("fields")
            if sous and isinstance(v, dict):
                comparer(f"{ou} › {cle}", v, sous)
            elif sous and isinstance(v, list):
                for n, e in enumerate(v, 1):
                    comparer(f"{ou} › {cle}[{n}]", e, sous)

    for col in c.get("collections", []):
        for fichier in col.get("files", []) or []:
            nom = Path(fichier["file"]).stem
            if nom in donnees:
                comparer(f"admin/config.yml › {fichier['file']}", donnees[nom], fichier.get("fields", []))
            else:
                err("admin/config.yml", f"fichier inconnu : {fichier['file']}")
        if col.get("folder") == "contenus/articles":
            noms = {f["name"] for f in col.get("fields", [])}
            gen = RACINE / "outils" / "generer_articles.py"
            m = re.search(r"CHAMPS_CONNUS = \{([^}]*)\}", gen.read_text(encoding="utf-8")) if gen.exists() else None
            if m:
                attendus = set(re.findall(r'"(\w+)"', m.group(1)))
                for manque in sorted(attendus - noms):
                    err("admin/config.yml › articles", f"le champ « {manque} » des articles n'est pas dans le formulaire du CMS")
                for inconnu in sorted(noms - attendus - {"body"}):
                    err("admin/config.yml › articles", f"le champ « {inconnu} » du formulaire est inconnu du générateur")


def main():
    donnees = {}
    for f in sorted(DATA.glob("*.json")):
        try:
            donnees[f.stem] = json.loads(f.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError as e:
            err(f.name, f"JSON invalide, ligne {e.lineno}, colonne {e.colno} : {e.msg}")
    regles(donnees)
    verifier_config_cms(donnees)

    # Les pages des articles sont-elles à jour ?
    gen = RACINE / "outils" / "generer_articles.py"
    if gen.exists():
        r = subprocess.run([sys.executable, str(gen), "--verifier"], capture_output=True, text=True, encoding="utf-8")
        if r.returncode != 0:
            err("articles", (r.stdout + r.stderr).strip().replace("\n", "\n    "))

    for titre, lignes in (("AVERTISSEMENTS", avertissements), ("ERREURS", erreurs)):
        if lignes:
            print(f"\n{titre} ({len(lignes)})")
            for l in lignes:
                print("  - " + l)
    if erreurs:
        print(f"\n✗ {len(erreurs)} erreur(s) à corriger avant de publier.")
        sys.exit(1)
    print(f"\n✓ Données valides ({len(donnees)} fichiers), {len(avertissements)} avertissement(s).")


if __name__ == "__main__":
    main()
