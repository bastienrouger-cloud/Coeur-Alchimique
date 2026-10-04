# Cœur Alchimique — le site

Site vitrine de Cœur Alchimique : HTML, CSS et JavaScript, sans framework.
Les contenus sont dans des fichiers de données, modifiables depuis un CMS
dans le navigateur. Le manuel de conception (direction artistique,
typographie, composants) est dans [`docs/MANUEL-TECHNIQUE.md`](docs/MANUEL-TECHNIQUE.md).

> Dépôt public : rien de confidentiel ici, jamais. Les dossiers `Notes/`,
> `Claude/` et `Bastien/` restent sur le disque (`.gitignore`).

---

## Hébergement et domaine

| | |
|---|---|
| **Site** | https://coeur-alchimique.fr |
| **Hébergement** | GitHub Pages, gratuit, depuis ce dépôt (`bastienrouger-cloud/Coeur-Alchimique`) |
| **Mise en ligne** | automatique, par l'Action `.github/workflows/publier.yml` (réglage : Settings → Pages → Source : « GitHub Actions ») |
| **Nom de domaine** | `coeur-alchimique.fr`, chez **OVH**, sur le compte de la titulaire du site. DNS : 4 enregistrements A + un CNAME `www` vers GitHub. Le domaine est déclaré dans Settings → Pages (le fichier `CNAME` n'est plus lu avec l'Action). |
| **Mails** | redirection simple de l'adresse du domaine vers la boîte de la titulaire (OVH) |
| **Formulaires** | contact et livre d'or via Formspree |
| **CMS** | Sveltia CMS, dans `admin/`, à l'adresse https://coeur-alchimique.fr/admin/ |

---

## Comment une modification arrive en ligne

```
CMS (navigateur)  ou  GitHub Desktop
        │  enregistre un fichier sur la branche main
        ▼
Action « Publier le site »  (onglet Actions du dépôt, environ 30 s)
   1. génère les pages des articles   (outils/generer_articles.py)
   2. vérifie toutes les données      (outils/valider.py)
   3. enregistre les pages générées dans le dépôt
   4. met le site en ligne
```

Si l'étape 1 ou 2 échoue, **rien n'est mis en ligne** : le site reste tel
qu'il était, et GitHub envoie un mail au propriétaire du dépôt. Le détail est
dans l'onglet *Actions*.

---

## Les fichiers de données

Tout ce qui s'affiche à plusieurs endroits vit dans `data/*.json`. Les articles
vivent dans `contenus/articles/*.md`. `*` = facultatif.

| Fichier | Contenu | Champs de chaque entrée |
|---|---|---|
| `contenus/articles/<id>.md` | un article = un fichier | en-tête : `titre`, `resume`, `date` (AAAA-MM-JJ), `lecture`*, `audio`*, `aRenseigner`*, `brouillon`* — puis le texte en Markdown |
| `data/articles.json` | **généré**, ne pas modifier la liste à la main | `intro` (modifiable), `articles[]` : `id`, `titre`, `resume`, `date`, `lecture`, `lien`, `audio`*, `aRenseigner`* |
| `data/mediatheque.json` | contes, e-books gratuits, audios, vidéo | `intro`, `rayons[]` (`id`, `titre`, `chapo`), `items[]` : `id`, `rayon`, `acces`, `titre`, `sousTitre`*, `genre`, `support`, `detail`, `description`, `fichier`* ou `lien`*, `image`*, `aRenseigner`* |
| `data/livres.json` | livres et e-books payants | `intro`, `ouvrages[]` : `id`, `titre`, `sousTitre`*, `genre`, `support`, `format`, `editeur`*, `lien`, `prix`, `description`, `image`, `alt`, `isbn`*, `parution`*, `aRenseigner`* |
| `data/elearnings.json` | parcours vendus sur Payhip | `intro`, `programmes[]` : `id`, `nom`, `promesse`, `prix`, `duree`, `niveau`, `image`, `alt`, `contenu[]`, `description`, `lien`* ; encadrés `tutorat`, `achat` |
| `data/soins.json` | les deux formules, la FAQ | `titre` + accroches, `options[]` : `id`, `numero`, `nom`, `resume`, `duree`, `prix`, `canal`, `image`, `alt`, `description`, `etapes[]`, `description2`*, `fin`* ; `origine` (`jalons[]`), `faq[]` (`q`, `r`) |
| `data/livre-dor.json` | messages publiés | `messages[]` : `prenom`, `message`, `date`, `accueil`*, `extrait`* |
| `data/sophie.json` | page « Sophie » | `nom`, `role`*, `photo`, `alt`, `accroche`*, `presentation[]`, `frise[]` (`periode`, `embleme`, `titre`, `texte`), `filConducteur`*, `citation`* |
| `data/vocabulaire.json` | les définitions | `intro`, `termes[]` : `id`, `terme`, `definition`, `voirAussi[]`*, `famille` ; `familles[]` |
| `data/site.json` | réglages communs | `nom`, `baseline`, `email`, `cadre`, `nav[]`, `navSecondaire[]`, `reseaux[]` (`label`, `href` — `#` tant que le compte n'existe pas —, `icone`) |
| `data/etats-coeur.json`, `data/miroir.json` | blocs illustrés de l'accueil | voir `admin/config.yml` |

Conventions : identifiants en minuscules avec tirets (`mon-conte`) ; prix en
nombre (`12`, `13.5`) ; chemins d'images en `/assets/…` ; `aRenseigner` est
une note interne, visible seulement en mode chantier.

**Règle à ne pas oublier :** le CMS n'enregistre que les champs décrits dans
`admin/config.yml`. Un champ ajouté dans un JSON mais absent de la config est
**supprimé** au premier enregistrement depuis le CMS. Ajouter un champ, c'est
donc le décrire aussi dans `admin/config.yml` — `outils/valider.py` le signale
sinon.

---

## Ajouter ou modifier un contenu

### Avec le CMS (le cas normal)

1. Ouvrir https://coeur-alchimique.fr/admin/ (connexion par jeton, voir plus bas).
2. **Articles** → *Nouveau*, ou **Contenus du site** → la rubrique voulue.
3. Remplir le formulaire, **Enregistrer**. C'est en ligne une à deux minutes plus tard.

Les images envoyées par une case « Image » sont converties en WebP et rangées
dans le bon dossier. Un article coché « Brouillon » n'est pas publié. Une
image qui n'est plus utilisée doit être supprimée à la main (*Ressources*).

### Sans le CMS (GitHub Desktop)

1. **Fetch**, puis **Pull** : le CMS enregistre directement sur GitHub, le disque est donc souvent en retard.
2. Modifier le fichier :
   - une fiche : le JSON concerné dans `data/` ;
   - un article : un fichier `contenus/articles/<id>.md` (copier un article existant pour l'en-tête).
3. Vérifier en local :
   ```
   py -m pip install -r outils/requirements.txt   # une seule fois
   py outils/generer_articles.py                   # si un article a changé
   py outils/valider.py
   py -m http.server 8000                          # puis http://localhost:8000
   ```
   (`python3` au lieu de `py` sur macOS.)
4. **Commit**, puis **Push**. L'Action fait le reste.

Ne jamais modifier à la main `pages/articles/*.html` ni la liste `articles` de
`data/articles.json` : ils sont réécrits à chaque publication.

---

## Revenir à une version précédente

Tout est historisé : chaque enregistrement (CMS ou GitHub Desktop) est un
commit, et les commits du CMS commencent par « CMS : ».

**Annuler une modification** (la méthode sûre) — dans GitHub Desktop :
1. **Fetch**, puis **Pull**.
2. Onglet **History** → clic droit sur le commit fautif → **Revert changes in commit**.
3. **Push**. Le site revient à l'état d'avant une minute plus tard.

Le *Revert* ne réécrit pas l'historique : il ajoute un commit qui défait le
précédent, et il peut lui-même être annulé. Pour revenir plusieurs étapes en
arrière, annuler les commits un par un, du plus récent au plus ancien.

**À ne jamais faire :** « Force push », ou réinitialiser `main` en effaçant des
commits — c'est la seule action vraiment irréversible.

Pour consulter une ancienne version d'un fichier sans rien changer : sur
github.com, ouvrir le fichier → **History** → choisir une date.

---

## Accès au CMS (jeton)

Le CMS se connecte à GitHub avec un **jeton à portée limitée** (fine-grained
token) : ce dépôt seulement, permission *Contents : Read and write*, rien
d'autre. Le jeton est créé depuis le compte du propriétaire du dépôt
(Settings → Developer settings → Fine-grained tokens), collé une fois sur
l'écran de connexion du CMS, et reste dans ce navigateur.

- **Expiration** : un an. Le renouveler avant échéance (même procédure), puis
  le recoller dans le CMS.
- **Navigateur vidé ou nouvel ordinateur** : recoller le jeton.
- **Jeton perdu ou compromis** : le supprimer sur GitHub (même page) et en
  créer un nouveau. Il ne donne accès à rien d'autre que ce dépôt.

## Mettre à jour le CMS

Sveltia est copié dans `admin/sveltia/` (version dans `admin/sveltia/VERSION`)
pour qu'il ne puisse pas changer sans commit. Pour le mettre à jour :

1. Récupérer la nouvelle version : `npm pack @sveltia/cms` (ou télécharger le
   paquet sur npmjs.com), et vérifier son empreinte (`dist.integrity` affiché
   par `npm view @sveltia/cms@<version>`).
2. Remplacer `admin/sveltia/sveltia-cms.js` et `admin/sveltia/chunks/` par ceux
   du dossier `dist/`, mettre à jour `VERSION`.
3. Tester en local (`http://localhost:8000/admin/`), puis commit et push.

Lire les notes de version avant : le projet est encore en version 0.x.

---

## Mode chantier

Les notes de travail (pastilles « à renseigner », passages « à trancher ») sont
masquées pour le public. Pour les voir, ajouter `?chantier` à l'adresse, par
exemple https://coeur-alchimique.fr/?chantier. Détails dans le manuel.

## Avant d'ouvrir le site

Chaque page porte `<meta name="robots" content="noindex">` tant que le site est
incomplet. **Le jour de l'ouverture**, retirer cette balise partout (chercher
`noindex`, y compris dans `outils/gabarits/article.html`), sans toucher à
`robots.txt`, puis déclarer `sitemap.xml` dans Google Search Console.

La liste de ce qui reste à régler avant l'ouverture est suivie dans Notion
(page « Cœur Alchimique », base Tâches).
