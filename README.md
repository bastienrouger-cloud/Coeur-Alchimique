# Cœur Alchimique — le site

Site vitrine statique, HTML / CSS / JS sans dépendance externe.
Le plan éditorial est dans `Notes/PLAN-SITE.md`, les textes récupérés de l'ancien site dans
`Notes/TEXTES-SITE-ACTUEL.md`, le mémo git dans `Notes/WORKFLOW.md`.

**`Notes/` n'est pas versionné, et c'est volontaire.** Ces documents contiennent l'analyse
du positionnement juridique de la pratique, les questions ouvertes sur Sophie et la critique
de son site actuel. GitHub Pages sert tout ce qui est à la racine, `.md` compris : laissés
là, ils étaient publics et indexables. Ce README est le seul document de travail qui reste
versionné — c'est un manuel technique, il ne dit rien sur elle.

---

## Lancer le site en local

**Obligatoire :** le double-clic sur `index.html` ne marche pas. Le header et le pied de page
sont chargés en JavaScript (`fetch`), que le navigateur bloque sur `file://` — il faut un serveur.

```bash
python3 -m http.server 8000     # Linux / macOS
py -m http.server 8000          # Windows
```

Puis ouvrir http://localhost:8000. `Ctrl+C` pour arrêter.

---

## Mise en ligne — GitHub Pages

**Le site ne présume pas de sa racine.** Il fonctionne aussi bien à :

- `http://localhost:8000/` (serveur local)
- `https://<compte>.github.io/<depot>/` (GitHub Pages, dépôt de projet)
- `https://coeuralchimique.fr/` (domaine perso, plus tard)

Comment : `js/socle.js` déduit la racine du site depuis sa propre URL
(`new URL("../", script.src)`), et toutes les URL construites en JS passent par `CA.url()`.
Dans le HTML, les chemins sont relatifs (`css/style.css` à la racine, `../css/style.css`
depuis `pages/`).

**Règle à respecter :** ne jamais écrire de chemin commençant par `/` dans le HTML ni dans le JS.
Un `/css/style.css` marche en local et casse tout sur GitHub Pages — c'est exactement l'erreur
qui a été corrigée. Dans les JSON, les chemins gardent la forme `/assets/...` : c'est `CA.url()`
qui les résout, ils sont donc sans danger.

Le fichier `.nojekyll` à la racine évite que GitHub applique son moteur Jekyll au site.

### Passer au domaine perso plus tard
Ajouter un fichier `CNAME` à la racine contenant `coeuralchimique.fr`, puis pointer le DNS.
Aucun autre changement : les chemins relatifs continuent de fonctionner.

---

## Arborescence

```
index.html                 Accueil
pages/                     Les autres pages
partials/                  header.html et footer.html, chargés en JS
css/style.css              Feuille de style unique
js/socle.js                Partials, données globales, menu
js/rendu.js                Rendu de tout le contenu depuis /data
data/*.json                La source unique de vérité du contenu
assets/images/             Placeholders, à remplacer un par un
assets/fonts/              Cormorant Garamond, hébergée en local
assets/icons/favicon.svg
outils/                    Scripts de maintenance
```

---

## Le contenu vit dans `/data`

C'est le principe central : **aucun texte de contenu n'est écrit en dur dans les pages.**
Un prix, un titre ou une description modifié dans un JSON se répercute partout où il apparaît.

| Fichier | Ce qu'il pilote | Où ça s'affiche |
|---|---|---|
| `site.json` | Nom, mail, navigation, réseaux, cadre légal | En-tête, pied de page, et tous les encadrés « cadre » |
| `etats-coeur.json` | La bibliothèque intérieure, les trois états du cœur | Accueil — section pédagogique et composant interactif |
| `soins.json` | Les deux formules, bénéfices, FAQ, ateliers | Accueil et page Accompagnement |
| `elearnings.json` | Les 7 parcours, le tutorat, les modalités d'achat | Accueil (les 3 moins chers) et page E-learnings |
| `livres.json` | Les 7 ouvrages et carnets | Page Livres |
| `sophie.json` | Présentation, frise, citation | Accueil (aperçu) et page Sophie |

**Exemple :** changer le prix de l'option 1 dans `soins.json` met à jour la carte de l'accueil
et la fiche détaillée de la page Accompagnement, sans toucher au HTML.

### Ajouter un e-learning

Ajouter un objet dans `elearnings.json` → `programmes`, avec un `id` en minuscules sans accent.
Générer son placeholder (voir plus bas) ou déposer la vraie image à
`assets/images/elearnings/<id>.webp`. Rien d'autre à faire : la carte et la fiche apparaissent seules.

### Marquer une information manquante

Mettre `null` sur un champ et lister ce qui manque dans `aRenseigner`. Le site affiche alors
une pastille « À renseigner » visible en clair sur la page, plutôt qu'un trou silencieux.

---

## Les images

Chaque emplacement a **son fichier, à son nom définitif**. Le placeholder affiche son propre
chemin : le jour où la vraie photo existe, on écrase le fichier au même endroit, au même nom,
et rien d'autre ne bouge.

Pour régénérer tous les placeholders après une modification des données :

```bash
python3 outils/generer-placeholders.py
```

Les vraies images gagnent à être converties en WebP et redimensionnées à la taille d'affichage
(la largeur indiquée sur le placeholder).

---

## Les largeurs

Trois jetons, et il ne faut pas les confondre :

| Jeton | Valeur | Ce que c'est |
|---|---|---|
| `--largeur-max` | `112.5rem` (1800 px) | Le cadre de la page |
| `--largeur-lecture` | `50rem` (800 px) | Un bloc de texte suivi |
| `--largeur-texte` | `38rem` (608 px) | Chapôs et en-têtes de section |

**Élargir la page n'élargit jamais un paragraphe.** Au-delà de 75 caractères par ligne,
l'œil perd la ligne suivante en revenant à la marge : c'est la raison d'être des colonnes
dans un journal. Une page à 1800 px sert à faire respirer une grille de cartes, pas à
étaler du texte sur toute la largeur de l'écran.

**Piège rencontré :** `.carte` est un conteneur flex en colonne, donc ses enfants s'étirent
sur toute la largeur par défaut. Les pastilles (`.etiquette`, `.a-renseigner`) s'étiraient
avec — invisible à 350 px de carte, criant à 560. Elles portent maintenant
`align-self: flex-start`.

---

## Le sommaire de page

Une barre d'ancres qui se colle sous l'en-tête et suit la lecture. Posée pour l'instant sur
la page Accompagnement, qui est longue et a des sections qu'on veut atteindre directement
(la FAQ, les formules).

**Elle se construit depuis le DOM.** Toute `<section>` qui porte un `id` et un
`data-sommaire="Libellé court"` y apparaît. Il n'y a pas de liste à tenir à jour ailleurs,
donc rien qui puisse se désynchroniser. Pour la poser sur une autre page : ajouter
`<nav class="sommaire" data-sommaire-hote></nav>` juste après l'en-tête, et nommer les
sections. En dessous de deux sections nommées, rien ne s'affiche.

Le surlignage utilise un `IntersectionObserver` plutôt qu'un écouteur de défilement : le
navigateur prévient quand une section entre ou sort, au lieu qu'on recalcule des positions
à chaque pixel. Le `rootMargin` découpe une bande de lecture dans le tiers supérieur de
l'écran — la section « courante » est celle qu'on lit, pas celle qui pointe le nez en bas.

**Deux bugs de position collante corrigés en même temps**, tous deux réels et tous deux
invisibles tant qu'on ne défilait pas loin :

1. **L'hôte du fragment cassait l'en-tête collant.** Les fragments sont injectés *dans*
   `<div data-partial="entete">`, qui reste dans le DOM et fait exactement la hauteur de
   l'en-tête. Or un élément `sticky` ne peut coller qu'à l'intérieur de la boîte de son
   parent : l'en-tête avait 0 px de course et repartait au défilement. Corrigé par
   `display: contents` sur les hôtes de l'en-tête et du pied — **pas** sur tous les
   `[data-partial]`, celui du sceau a besoin de sa boîte.
2. **`overflow-x: hidden` sur `<body>` aussi.** Il force `overflow-y` à `auto`, ce qui fait
   de `<body>` une boîte de défilement, et un enfant collant colle alors à cette boîte-là
   plutôt qu'à la fenêtre. Remplacé par `overflow-x: clip`, qui masque pareil sans créer de
   boîte de défilement.

`--h-entete` est publiée en JS depuis la hauteur réelle de l'en-tête (un `ResizeObserver`),
parce qu'elle change avec la largeur de l'écran. Une valeur en dur laisserait un trou ou un
recouvrement selon la fenêtre.

---

## Les rangées de cartes sur mobile

`.grille--defilante` : une grille sur grand écran, une bande qui défile au doigt avec
accroche (`scroll-snap`) en dessous de 760 px. Trois cartes empilées font trois écrans de
défilement pour une seule idée.

La carte suivante dépasse volontairement de 15 % : c'est ce débord qui dit qu'il y a autre
chose à droite. Sans lui, une bande horizontale passe inaperçue.

**À ne pas faire :** sortir la bande jusqu'aux bords de l'écran avec un `margin-inline`
négatif en `vw`. Ça rouvre une barre de défilement horizontale sur toute la page.

---

## Boutons et cartes cliquables

Le site utilise le moins de boutons possible. Deux remplaçants :

**`.carte--lien`** — toute la carte est cliquable. Le lien reste porté par le titre, donc
correctement annoncé par un lecteur d'écran et atteignable au clavier, mais son `::after`
s'étire sur la carte entière, qui devient la zone de clic. Une seule cible de tabulation
par carte, pas de bouton en pied qui ferait doublon. L'anneau de focus est déplacé sur la
carte via `:focus-within`.

**`.carte-action`** — une carte large, à la place d'un bouton centré seul en fin de
section. Elle peut porter une phrase d'explication, ce qu'un bouton ne peut pas faire.

**Piège :** ne jamais mettre une `.carte-action` dans un `<p>`. Elle contient un `<div>` et
un `<h3>` ; le parseur HTML ferme le paragraphe au premier bloc et le lien ressort vide.
C'est arrivé une fois, sur la FAQ.

**Restent de vrais boutons**, et c'est volontaire : l'envoi du formulaire de contact, et
les deux appels du hero — là où l'action est le sujet, pas une destination parmi d'autres.

---

## La navigation

**Six entrées dans le header, sans article.** Accompagnement · E-learnings · Livres ·
Ressources · Sophie · Contact. Pas d'article, parce que « tout avec article » est
impossible : *Sophie* et *Contact* n'en prennent pas.

**Ressources est dans la nav principale, pas dans le pied.** C'est le contenu gratuit,
donc la porte d'entrée : quelqu'un tombe sur une méditation, revient, et finit par prendre
rendez-vous. L'enterrer dans le pied revenait à gâcher le seul levier qui travaille seul.

**Le pied ne répète pas la nav principale.** Le header est `position: sticky` : la
navigation est à un coup d'œil à n'importe quelle hauteur de page. Une colonne « Le site »
au pied n'aurait été utile qu'avec un header qui défile. Le pied porte donc la marque, le
contact, les réseaux, et les deux pages qui ne sont pas dans le header : le livre d'or et
les mentions légales.

*Le livre d'or est en pied tant qu'il est vide. Quand il sera rempli, la bonne place pour
un témoignage est sans doute la page Accompagnement — là où quelqu'un hésite — plutôt
qu'une page dédiée que personne n'ouvre.*

**Piège corrigé :** le panneau du menu mobile ne doit **pas** porter de `backdrop-filter`.
Il est enfant de `.entete`, qui en porte déjà un ; Chromium compose alors les deux et la
page transparaît à travers le menu, malgré un fond déclaré à 98 % d'opacité — on lisait le
titre du hero derrière les entrées. Fond opaque, pas de filtre.

---

## Le pied de page

**Il ne prend pas les 1800 px de la page.** Deux blocs collés aux deux bords d'un écran
large ne font pas une composition, ils font deux îlots séparés par un désert — c'était le
défaut de la version précédente, et il ne se voyait qu'une fois la page élargie. Le pied se
cale sur 78rem, centrés, indépendamment de `--largeur-max`.

Trois colonnes, dans cet ordre de lecture :

1. **L'identité** — le sceau, le nom, la baseline, l'adresse, les réseaux. Le sceau sert
   d'ancre visuelle : sans lui, le pied n'avait aucun point d'accroche, juste des mots.
2. **Le cadre** — la phrase qui dit que c'est un accompagnement en complément d'un suivi
   médical, jamais à sa place. Ce n'est pas une mention en petits caractères : c'est le
   positionnement de toute la pratique, et c'est ce qui la protège juridiquement. Elle a
   donc une colonne et un filet doré, pas une ligne grise perdue en bas à droite.
3. **Informations** — livre d'or, mentions légales.

**Le cadre court vient de `site.json`** (`cadre.court`), la version longue aussi
(`cadre.texte`). Même source, donc impossible que les deux se contredisent le jour où
Sophie fera relire la formulation.

**L'année du copyright se calcule en JS.** Une année en dur devient fausse le 1er janvier
et personne ne s'en aperçoit avant des mois.

**« Aucun cookie, aucun traceur »** est dans `site.json` → `mentionTechnique`. C'est vrai
aujourd'hui. **À rerelire le jour où on branche le formulaire de contact ou le livre d'or
sur un service extérieur** — si ce service pose un cookie, cette phrase devient un
mensonge, et le site devient redevable d'un bandeau de consentement.

Une lueur bleue très basse (`.pied::before`) évite que le pied soit le seul aplat noir d'un
site qui module sa profondeur partout ailleurs.

---

## La typographie

**Titres — Cormorant Garamond, hébergée dans `assets/fonts/`.** Jamais chez Google : une
police distante envoie l'adresse IP du visiteur à un tiers, ce que la CNIL sanctionne et ce
qui obligerait à poser un bandeau de consentement. Servie depuis le domaine, la question ne
se pose pas. Licence SIL Open Font, le fichier de licence est à côté des polices.

Version **variable** : une graisse continue de 300 à 700 dans un seul fichier. Le site
utilise 400 et 600, en romain et en italique — donc deux fichiers (`-latin.woff2` et
`-latin-italic.woff2`), 77 Ko au total, préchargés dans le `<head>` de chaque page.
`font-display: swap` : le texte s'affiche immédiatement en Georgia, puis bascule.

**Le sous-ensemble latin-ext a été essayé et retiré.** Chromium le téléchargeait alors
qu'aucun caractère de la page ne le justifie — les deux plages `unicode-range` se
chevauchent sur trois signes combinants. 68 Ko à chaque visite pour rien. Conséquence
acceptée : un nom polonais ou roumain dans un témoignage s'affichera en Georgia pour ces
lettres-là. Une lettre au mauvais dessin, pas un carré vide.

Pour régénérer les fichiers :

```bash
npm install @fontsource-variable/cormorant-garamond
cp node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2 \
   assets/fonts/cormorant-garamond-latin.woff2
cp node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2 \
   assets/fonts/cormorant-garamond-latin-italic.woff2
```

**Texte courant — `system-ui`, aucune police chargée.** Décidé le 16/09. Le visiteur voit
San Francisco sur Mac, Segoe UI sur Windows, Roboto sur Android : trois sans-serif
humanistes aux métriques proches, dont la différence ne se voit pas sans les mettre côte à
côte. Zéro octet, zéro décalage au chargement. L'identité du site est dans les titres et
dans l'or, pas dans le sans du corps de texte. À reconsidérer seulement si un rendu
identique sur toutes les plateformes devient un besoin réel — ce serait alors une seule
famille en 400 et 600, chaleureuse, qui tienne avec du Garamond.

---

## La direction artistique

**Le fond est bleu, du début à la fin. L'or n'est qu'un accent.**

C'est la décision structurante du projet, prise après avoir essayé trois fois de faire
basculer le fond du bleu vers l'or. Deux raisons de fond :

1. **L'or ne brille que s'il est rare.** S'il devient une ambiance, il n'accentue plus rien,
   et il faudrait lui trouver une couleur de remplacement pour les boutons et les titres.
2. **Sur fond doré, il n'y a pas de bonne couleur de texte.** Le noir est sec, le brun fait
   parchemin, et le bleu encre — le seul choix qui tienne — réintroduit le bleu là où il ne
   produit plus d'effet. Sur bleu profond, c'est crème, et la question ne se pose pas.

Accessoirement c'est aussi la couleur de la sérénité, et celle des images d'inspiration du
projet : bibliothèque bleu nuit, quelques touches dorées.

### L'échelle

| Jeton | Valeur | Usage |
|---|---|---|
| `--g0` | `#070d18` | Le plus profond — haut de page |
| `--g1` | `#0c1a2c` | |
| `--g2` | `#0f2036` | |
| `--g3` | `#142943` | |
| `--g4` | `#1a3558` | |
| `--g5` | `#21426b` | Le plus ouvert — les moments qui respirent |
| `--g-footer` | `#050a12` | Le pied, un cran sous la fin de page |

**Toutes ces valeurs portent du texte crème.** Il n'existe plus aucune zone claire dans le
site, donc plus aucun risque de texte illisible — la classe d'erreur la plus fréquente sur
les versions précédentes a disparu par construction.

### Le rythme

Une page ne descend pas bêtement du sombre vers le clair : **elle respire**. On s'ouvre vers
`--g5` au milieu, là où se joue le contenu principal, puis on se referme vers le profond en
bas.

Des **halos** modulent la profondeur sur les sections longues, pour éviter l'aplat. On pose
une classe sur la section : `.halo-haut-droite`, `.halo-haut-gauche`, `.halo-bas-gauche`,
`.halo-or`, `.halo-hero`. Chacune définit un `--halo` que `.fondu` dessine par-dessus le
dégradé.

**Deux pièges déjà rencontrés, à ne pas refaire :**

1. **Ne pas faire un halo avec un `<span>` flouté.** Un élément en `filter: blur()` déborde
   de sa section, ce qui crée une barre de défilement horizontale ; et le rogner avec
   `overflow: hidden` coupe le flou au couteau — on voyait une arête nette en bord de
   section. Un dégradé radial en fond n'a aucun de ces deux défauts.
2. **Exprimer les rayons en pourcentage de la section, et éteindre le halo avant les bords**
   (`transparent 70%` environ). Sinon le halo vaut encore quelque chose au bord et on voit
   une ligne horizontale à la jointure entre deux sections, puisque la section voisine, elle,
   part de zéro.

Les dégradés sont interpolés en OKLAB, avec une déclaration sRGB en repli. Entre bleus
proches, ça donne des fondus plus réguliers qu'en sRGB.

### Où l'or apparaît

Surtitres, boutons, filets, étiquettes, prix, bordures au survol, filet du pied. Et surtout
deux endroits qui portent le sens :

- **La phrase pivot** (`.section-transmutation`) : « De l'Enfant Intérieur Blessé » en bleu
  pâle, une ligne verticale en dégradé, puis « à l'Enfant Intérieur Créateur. » en or. Le
  fond ne change pas — c'est le texte qui bascule.
- **La bibliothèque interactive** : les livres virent du bleu à l'or quand on choisit l'état
  « cœur créateur ». C'est le seul moment où l'or envahit un bloc, et c'est ce qui lui donne
  sa force.

### Le hero de l'accueil

Photographie de bibliothèque en fond plein, un **sceau doré** par-dessus qui tourne lentement
et diffuse une lumière sur l'image : la création qui se répercute sur les idées.

C'est la seule image du site qui existe en **trois largeurs** —
`hero-bibliotheque-1200 / -1800 / -2400.webp`, déclarées en `srcset` avec `sizes="100vw"`.
Un fond plein couvre toute la largeur de l'écran : servir 136 Ko à un téléphone serait
absurde, et servir 67 Ko à un 27 pouces Retina donnerait du flou. Le navigateur choisit.
Pour régénérer les trois à partir d'un original (ratio 3:2) :

```bash
python3 -c "
from PIL import Image
src = Image.open('original.jpg')
for w, q in [(1200, 78), (1800, 76), (2400, 74)]:
    h = round(src.height * w / src.width)
    src.resize((w, h), Image.LANCZOS).save(
        f'assets/images/accueil/hero-bibliotheque-{w}.webp', 'WEBP', quality=q, method=6)
"
```

Le sceau est un fragment SVG (`partials/sceau.svg`), injecté comme le header et le pied —
d'où la carte `PARTIALS` générique dans `socle.js`. Il porte du sens : quatre arcs pour
**Révéler, Libérer, Transformer, Créer**, un cercle de graduations autour, le cœur du logo
au centre. Chaque groupe tourne à sa propre vitesse (150 s, 100 s à l'envers, 200 s).

Trois contraintes tenues, à ne pas relâcher :

1. **N'animer que `transform` et `opacity`.** Ce sont les deux seules propriétés que le
   navigateur compose sans refaire la mise en page. Animer un `box-shadow` ou un `filter`
   ferait chauffer la machine pour rien.
2. **Rotations très lentes.** En dessous de 90 s, ça devient une roue de chargement : ça
   agite au lieu d'apaiser.
3. **`prefers-reduced-motion` arrête tout**, halo compris.

En SVG, il faut dire explicitement autour de quel point on tourne :
`transform-box: view-box; transform-origin: 200px 200px;` (le centre du viewBox 400×400).
Sans ça, la rotation se fait autour de la boîte englobante de chaque groupe, et le sceau
part en vrille.

**La composition est centrée** (`.hero--centre` + `.hero__pile`) : surtitre, titre et
baseline au-dessus du sceau, paragraphe et boutons en dessous. Le voile est donc purement
vertical — dense en haut et en bas où vit le texte, ouvert au milieu où l'image respire —
et finit sur `var(--vers)` pour se raccorder à la section suivante sans couture.

Le padding haut est volontairement court (2,5 rem au lieu des 8,5 rem habituels d'un hero)
et le sceau plafonné à 19 rem : à eux deux, c'est ce qui fait tenir le bloc entier dans une
hauteur d'écran, boutons compris. Si on rallonge le texte du hero, c'est la première chose
qui casse.

**Deux compositions écartées le 16/09, pour ne pas y revenir :**

1. **Sceau à gauche, texte à droite.** Belle, mais le sceau prenait toute la place et
   l'image redevenait un fond. Or ce qui fait l'image, c'est le livre ouvert et les sphères
   d'idées, tous deux dans la moitié gauche — exactement là où se posait le sceau.
2. **Image retournée en miroir**, mise en page inchangée. Une ligne de CSS, et les sphères
   remontaient bien autour du sceau ; mais le livre ouvert basculait dans le coin bas-droit,
   le plus sombre et le plus rogné. On gagnait les sphères, on perdait le livre.

**Défaut connu, assumé :** l'échelle de la bibliothèque traverse le sceau. En fond plein,
l'image occupe exactement la largeur de l'écran — il n'y a aucun jeu horizontal pour la
décaler. La contourner demanderait de zoomer dans l'image, donc de perdre la fenêtre à
gauche et une partie du livre. Le rendu passe pour de la profondeur : le sceau flotte
devant la pièce.

### Réservé pour plus tard

Les classes `.bande-transition--or` et `.bande-vers-pied`, et les jetons `--or-bascule-*`,
ne sont plus utilisés. Ils sont conservés pour la future section « explication de la
méthode », où la transmutation sera montrée localement — pas sur le fond général.

**Historique des essais, pour ne pas y revenir :**

1. Fond bleu → or via un bronze intermédiaire → zone marron sale au milieu.
2. Bascule par un point presque blanc → propre, mais délavé.
3. Bleu → bleu clair → or clair → or foncé en OKLAB → correct, mais l'or en fond tue l'or
   en accent.
4. **Fond bleu uniquement, or en accent** → retenu.

---

## Être trouvé, être partagé

**Chaque page a son `<h1>` écrit en dur dans le HTML.** Sur trois pages (Sophie, Livres,
E-learnings) le titre était rendu en JavaScript depuis les JSON — deux d'entre elles
n'avaient même aucun `h1`, seulement un `h2`. C'est le seul endroit où on double une
donnée entre le JSON et le HTML, et c'est volontaire : un titre de page doit exister sans
script.

**`robots.txt` et `sitemap.xml`** à la racine. Le sitemap liste les neuf URL avec leur
priorité. **Il règle la découverte, pas le maillage :** un robot saura que les pages
existent, mais il ne verra toujours aucun lien entre elles tant que la navigation est
injectée en JS. Google exécute le JS, donc en pratique il suit ; les autres non.

**Open Graph et canonical** sur les neuf pages : titre, description, URL, image, locale
`fr_FR`, `twitter:card`. Sans ça, un lien partagé sur Facebook ou WhatsApp s'affiche en
texte nu. L'image (`assets/images/og-coeur-alchimique.jpg`, 1200×630) est générée par
script depuis la photo du hero et le sceau, dans la police du site — donc reproductible.

> **À changer le jour du domaine perso.** Les URL `og:url`, `canonical` et celles du
> sitemap pointent en dur sur `bastienrouger-cloud.github.io/Coeur-Alchimique/`. Elles
> doivent devenir `coeuralchimique.fr` au basculement, sinon Google continue d'indexer
> l'ancienne adresse. C'est le seul endroit du site qui n'est pas indépendant de sa racine.

**Un `<noscript>`** en tête de chaque page : sans JavaScript il n'y a ni en-tête ni menu,
donc au minimum une barre qui liste les pages en liens directs.

**Ce qui reste ouvert : le contenu dépend du JavaScript.** Neuf zones `data-rendu` ou
`data-partial` sur l'accueil, six sur Accompagnement, sept sur Sophie. C'est le prix de
l'architecture « tout le contenu dans `/data` », et elle a de vrais avantages. Deux façons
de le régler le jour où ça compte :

1. **Écrire l'en-tête et le pied en dur dans chaque page.** Simple, mais on perd le point
   de modification unique — et les chemins relatifs diffèrent entre la racine et `/pages/`.
2. **Une étape de génération** : un script Python qui injecte les fragments et le contenu
   des JSON dans les pages avant le commit. On garde l'édition à un seul endroit, et ce qui
   est publié est du HTML complet. C'est la bonne réponse, c'est un peu de travail.

---

## Ce qui ne doit pas être publié

`Claude/`, `Bastien/` et `Claude outputs/` sont dans le `.gitignore`. Ce n'est pas du
rangement : **un dépôt GitHub public est lisible par tout le monde, et GitHub Pages sert
tout ce qui est à la racine.** Ces dossiers contiennent des notes de travail, dont
l'analyse du vocabulaire juridique de la pratique et la question du titre de
psychothérapeute. Ce sont exactement les documents qu'on ne veut pas voir indexés à côté
du nom de Sophie.

`emailActuel` a été retiré de `site.json` : l'adresse Gmail personnelle y était servie en
clair sur un dépôt public, et aucune page ne l'utilisait.

**Attention : le `.gitignore` n'efface pas le passé.** Il empêche les futurs commits, mais
tout ce qui a déjà été poussé reste dans l'historique du dépôt et reste consultable.
Retirer un fichier du suivi ne le retire pas des commits précédents.

---

## Accessibilité

- Lien d'évitement en début de page
- Menu mobile avec `aria-expanded`, fermeture au clavier par Échap
- Onglets des trois états navigables aux flèches, avec `role="tablist"`
- `prefers-reduced-motion` respecté
- Contrastes vérifiés sur fond sombre et sur fond clair

## Vie privée

Aucun script tiers, aucune police distante, aucun cookie, aucun traceur.
Tout est servi depuis le domaine. C'est aussi ce qui permet de se passer de bandeau de consentement.

---

## Ce qui reste à faire avant une mise en ligne

- [ ] Brancher le formulaire de contact sur un service d'envoi
- [ ] Compléter les mentions légales — les champs entre pastilles sont obligatoires
- [ ] Rédiger les CGV (vente de contenus numériques)
- [ ] Remplacer les 19 placeholders par les vraies images
- [ ] Renseigner les URL des réseaux sociaux dans `site.json`
- [ ] Trancher la solution de livre d'or
- [ ] Vérifier le site avec PageSpeed Insights

---

## Recette avant de pousser

Deux scripts de contrôle existent côté atelier (ils ne sont pas dans le dépôt) :
ils vérifient qu'aucune page n'a d'erreur console, pas de débordement horizontal,
pas de section au texte illisible, et que tout fonctionne à l'identique à la racine
et dans un sous-dossier.

À défaut, le contrôle manuel minimal avant chaque push :

1. Servir le site dans un sous-dossier pour simuler GitHub Pages :
   ```bash
   mkdir -p /tmp/test/depot && cp -r . /tmp/test/depot/
   cd /tmp/test && python3 -m http.server 8001
   ```
   puis ouvrir http://localhost:8001/depot/
2. Ouvrir la console du navigateur (F12) : elle doit être vide.
3. Cliquer sur chaque entrée du menu et vérifier que le header revient bien à chaque page.
