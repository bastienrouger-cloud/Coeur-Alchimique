/* =========================================================
   Rendu — tout le contenu vient des fichiers /data/*.json.
   Un même jeu de données alimente plusieurs pages : une
   modification dans le JSON se répercute partout.
   ========================================================= */

const { el, prix, donnees, url } = CA;

/* ---------- Outils ---------- */

/** Suite pseudo-aléatoire déterministe : l'étagère est identique à chaque visite. */
function graine(n) {
  let x = Math.sin(n * 9973) * 10000;
  return x - Math.floor(x);
}

const PALETTES = {
  blesse: ["#0f2340", "#16305a", "#1d3a63", "#122a4d", "#1a3556", "#0d1f3a"],
  alchimique: ["#16305a", "#1d3a63", "#4a4a52", "#6b5327", "#2a4470", "#8a6f34"],
  createur: ["#9c7c3a", "#c9a227", "#e3c879", "#b08d33", "#d9b95e", "#2a4470"],
};

const HALOS = {
  blesse: "rgba(47,107,181,.55)",
  alchimique: "rgba(150,140,110,.75)",
  createur: "rgba(227,200,121,.85)",
};

/* ---------- 1. La bibliothèque intérieure ---------- */

async function rendreBibliotheque() {
  const hoteEtapes = document.querySelector('[data-rendu="biblio-etapes"]');
  const hoteEtagere = document.querySelector('[data-rendu="etagere"]');
  if (!hoteEtapes && !hoteEtagere) return;

  const d = await donnees("etats-coeur");

  if (hoteEtapes) {
    hoteEtapes.replaceChildren(
      ...d.intro.etapes.map((e) =>
        el("div", { class: "etape" }, [
          el("span", { class: "etape__num", texte: e.numero, "aria-hidden": "true" }),
          el("div", {}, [el("h3", { texte: e.titre }), el("p", { class: "attenue", texte: e.texte })]),
        ])
      )
    );
  }

  if (hoteEtagere) construireEtagere(hoteEtagere);
}

function construireEtagere(hote) {
  const RAYONS = 4;
  const PAR_RAYON = 18;
  const fragments = [];

  for (let r = 0; r < RAYONS; r++) {
    const rayon = el("div", { class: "etagere__rayon" });
    for (let i = 0; i < PAR_RAYON; i++) {
      const id = r * PAR_RAYON + i;
      const hauteur = 42 + Math.round(graine(id) * 30);
      const livre = el("span", { class: "livre", "data-livre": String(id), "aria-hidden": "true" });
      livre.style.height = `${hauteur}%`;
      livre.style.flexGrow = String(0.7 + graine(id + 500) * 0.8);
      rayon.append(livre);
    }
    fragments.push(rayon);
  }

  /* Le cœur au centre de l'étagère est EXACTEMENT celui des cartes —
     le même symbole de la planche, pas un second dessin. Depuis que les
     deux sections n'en font qu'une, ils se regardent à trois cents
     pixels l'un de l'autre : deux tracés différents pour le même objet
     ne passaient plus. */
  const coeur = el("div", { class: "coeur-support" });
  coeur.innerHTML =
    `<svg class="coeur-svg" viewBox="0 0 48 48" role="img"
          aria-label="Le cœur, au centre de la bibliothèque intérieure">
       <use href="#coeur-blesse"/>
     </svg>`;

  hote.replaceChildren(...fragments, coeur);
  peindreEtagere(hote, "blesse");
}

function peindreEtagere(hote, etat) {
  const palette = PALETTES[etat] || PALETTES.blesse;
  hote.querySelectorAll(".livre").forEach((livre, i) => {
    livre.style.setProperty("--teinte-livre", palette[Math.floor(graine(i + 77) * palette.length)]);
    livre.style.opacity = etat === "blesse" ? 0.72 : etat === "alchimique" ? 0.88 : 1;
  });

  const coeur = hote.querySelector(".coeur-svg");
  if (coeur) {
    coeur.style.setProperty("--halo-coeur", HALOS[etat]);
    const usage = coeur.querySelector("use");
    if (usage) usage.setAttribute("href", `#coeur-${etat}`);
  }
}

/* ---------- 2. Les trois états du cœur ----------

   Les cartes sont le sélecteur. Avant, une rangée de boutons au-dessus
   répétait les trois mêmes noms que les cartes du bas : deux fois le
   même contenu, et l'accroche des cartes était écrite en dur dans le
   HTML au lieu de vivre dans /data. Les deux problèmes disparaissent
   ensemble.

   L'ordre du DOM est carte, panneau, carte, panneau, carte, panneau.
   C'est celui de la lecture sur mobile — chaque détail suit sa carte.
   Au-dessus de 48rem, le CSS place les trois cartes sur une rangée et
   envoie le panneau ouvert en dessous, sur toute la largeur. Rien ne
   bouge dans le DOM au redimensionnement : pas d'écouteur de resize,
   pas de nœud déplacé, pas de focus perdu.

   Un état est toujours ouvert — l'étagère de la section précédente en
   a besoin pour se teindre. Donc aria-expanded, pas un accordéon qui
   se referme. Cliquer la carte déjà ouverte ne fait rien.
   ---------- */

async function rendreEtats() {
  const hote = document.querySelector('[data-rendu="etats"]');
  if (!hote) return;

  const d = await donnees("etats-coeur");
  const etagere = document.querySelector('[data-rendu="etagere"]');


  const cartes = [];
  const panneaux = [];
  const enfants = [];

  d.etats.forEach((etat, i) => {
    /* Le titre ne peut pas être un <h3> : un bouton n'accepte que du
       contenu de phrasé. Le nom de l'état est porté par le libellé du
       bouton, ce qu'un lecteur d'écran annonce de toute façon. */
    const carte = el("button", {
      class: `carte-etat carte-etat--${etat.id}`,
      type: "button",
      id: `etat-${etat.id}`,
      "aria-controls": `panneau-${etat.id}`,
      "aria-expanded": String(i === 0),
    }, [
      el("span", {
        class: "carte-etat__coeur", "aria-hidden": "true",
        html: `<svg viewBox="0 0 48 48"><use href="#coeur-${etat.id}"/></svg>`,
      }),
      el("span", { class: "carte-etat__titre", texte: etat.nom }),
      el("span", { class: "carte-etat__accroche", texte: etat.accroche }),
    ]);

    const panneau = el("div", {
      class: "etat-panneau",
      id: `panneau-${etat.id}`,
      role: "region",
      "aria-labelledby": `etat-${etat.id}`,
      hidden: i === 0 ? null : "",
    }, [
      el("div", {}, [
        el("span", { class: "surtitre", texte: etat.sousTitre }),
        el("p", { class: "etat__resume", texte: etat.resume }),
        el("p", { class: "attenue", texte: etat.texte }),
      ]),
      el("ul", { class: "liste-puces" }, etat.signes.map((x) => el("li", { texte: x }))),
    ]);

    cartes.push(carte);
    panneaux.push(panneau);
    enfants.push(carte, panneau);
  });

  hote.append(...enfants);

  function choisir(index) {
    cartes.forEach((c, i) => c.setAttribute("aria-expanded", String(i === index)));
    panneaux.forEach((p, i) =>
      i === index ? p.removeAttribute("hidden") : p.setAttribute("hidden", ""));
    if (etagere) peindreEtagere(etagere, d.etats[index].id);
  }

  cartes.forEach((carte, i) => carte.addEventListener("click", () => choisir(i)));
}

/* ---------- 2 bis. Les chiffres des deux chemins ----------

   Les cartes « Les soins » et « Les e-learnings » de l'accueil sont du
   texte éditorial, écrit dans index.html comme les autres blocs de la
   page. Mais elles annoncent des montants, et ceux-là vivent dans
   soins.json et elearnings.json.

   Écrire « à partir de 100 € » en dur, c'était accepter qu'un jour la
   page d'accueil annonce un prix que les pages détaillées ont changé.
   On calcule donc à l'affichage. Le HTML garde une valeur de repli
   visible, pour que la carte reste juste même si le JavaScript ne
   tourne pas — elle sera simplement figée à la date du dernier commit.
   ---------- */

async function rendreChiffres() {
  const cibles = document.querySelectorAll("[data-chiffre]");
  if (!cibles.length) return;

  const [soins, elearnings] = await Promise.all([donnees("soins"), donnees("elearnings")]);

  const prixSoins = soins.options.map((o) => o.prix).filter((n) => typeof n === "number");
  const prixParcours = elearnings.programmes.map((p) => p.prix).filter((n) => typeof n === "number");
  const nombres = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
                   "huit", "neuf", "dix"];
  const n = elearnings.programmes.length;

  const valeurs = {
    "soins-prix": prixSoins.length ? `à partir de ${prix(Math.min(...prixSoins))}` : null,
    /* Un prix plancher, et non une fourchette. Face à « à partir de
       100 € » sur la carte voisine, « de 77 € à 330 € » ne dit pas la
       même chose : l'une annonce un point d'entrée, l'autre un plafond.
       Le visiteur compare deux chemins, pas deux grilles tarifaires. */
    "elearnings-prix": prixParcours.length
      ? `à partir de ${prix(Math.min(...prixParcours))}`
      : null,
    "elearnings-nombre": nombres[n] ? nombres[n][0].toUpperCase() + nombres[n].slice(1) : String(n),
    "elearnings-nombre-chiffre": String(n),
  };

  /* Une même valeur ne tombe pas toujours au même endroit d'une phrase.
     « Sept parcours » ouvre une carte sur l'accueil, mais arrive en
     milieu de phrase sur la page d'accompagnement ; « à partir de 77 € »
     fait l'inverse. Plutôt que de multiplier les clés, on laisse le
     HTML demander la casse dont il a besoin. */
  const casse = (v, quelle) => {
    if (quelle === "bas") return v[0].toLowerCase() + v.slice(1);
    if (quelle === "haut") return v[0].toUpperCase() + v.slice(1);
    return v;
  };

  cibles.forEach((cible) => {
    const v = valeurs[cible.dataset.chiffre];
    if (v) cible.textContent = casse(v, cible.dataset.casse);
  });
}

/* ---------- 3. Les soins ---------- */

function carteSoin(option) {
  return el("article", { class: "carte" }, [
    el("div", { class: "carte__media" }, [
      el("img", { src: url(option.image), alt: option.alt, loading: "lazy", width: "640", height: "400" }),
    ]),
    el("span", { class: "etiquette", texte: `Option ${option.numero}` }),
    el("h3", { texte: option.nom }),
    el("p", { class: "attenue", texte: option.resume }),
    el("ul", { class: "liste-puces" }, [
      el("li", { texte: option.canal }),
      el("li", { texte: `Durée : ${option.duree}` }),
    ]),
    el("div", { class: "carte__pied" }, [
      el("p", { class: "prix", texte: prix(option.prix) }),
      el("p", {}, [
        el("a", { class: "bouton bouton--contour", href: url("pages/contact.html?motif=soin"), "data-ancre-rdv": "", texte: "Prendre rendez-vous" }),
      ]),
    ]),
  ]);
}

/* ---------- Passages en attente d'arbitrage ----------

   Meme mecanique que sur les pages d'article, mais ici le texte vient
   d'un JSON : `el({texte})` pose un noeud de texte, on ne peut donc pas
   y glisser un <mark>. L'extrait a surligner est declare a part, dans
   le champ `marque`, et on recompose ici trois noeuds — avant, la
   marque, apres.

   Si l'extrait est introuvable, on n'avale pas l'erreur en silence : le
   texte s'affiche entier et la console le dit. Une marque qui disparait
   sans prevenir, c'est le genre de panne qu'on ne decouvre qu'une fois
   le texte parti chez quelqu'un d'autre. */
function texteMarque(texte, marque) {
  // `marque` : un extrait, ou une liste d'extraits (dans n'importe quel ordre).
  const marques = [].concat(marque || []);
  const plages = [];
  for (const m of marques) {
    const i = texte.indexOf(m);
    if (i < 0) console.warn("[a-trancher] extrait introuvable :", m);
    else plages.push([i, i + m.length]);
  }
  plages.sort((a, b) => a[0] - b[0]);
  const noeuds = [];
  let curseur = 0;
  for (const [debut, fin] of plages) {
    if (debut < curseur) continue; // extraits qui se chevauchent : on garde le premier
    noeuds.push(document.createTextNode(texte.slice(curseur, debut)));
    noeuds.push(el("mark", { class: "a-trancher", texte: texte.slice(debut, fin) }));
    curseur = fin;
  }
  noeuds.push(document.createTextNode(texte.slice(curseur)));
  return noeuds;
}

const motifATrancher = (motif) =>
  el("p", { class: "a-trancher__motif" }, [
    el("strong", { texte: "À trancher avec Moz" }),
    document.createTextNode(" — " + motif),
  ]);

async function rendreSoins() {
  const cibles = {
    cartes: document.querySelector('[data-rendu="soins-cartes"]'),
    detail: document.querySelector('[data-rendu="soins-detail"]'),
    faq: document.querySelector('[data-rendu="soins-faq"]'),
    note: document.querySelector('[data-rendu="soins-note"]'),
    origine: document.querySelector('[data-rendu="soins-origine"]'),
  };
  if (!Object.values(cibles).some(Boolean)) return;

  const d = await donnees("soins");

  if (cibles.cartes) cibles.cartes.replaceChildren(...d.options.map(carteSoin));

  /* La note d'auto-soin coiffe les deux cartes : elle dit qui fait le
     soin, et les deux protocoles se lisent a travers elle. Une seule
     fois, au-dessus — pas repetee dans chaque carte. */
  if (cibles.note && d.noteAutoSoin) {
    cibles.note.replaceChildren(
      el("aside", { class: "note-lecture" }, [
        el("span", { class: "note-lecture__titre", texte: "Qui fait le soin" }),
        el("p", { texte: d.noteAutoSoin }),
      ])
    );
  }

  if (cibles.detail) {
    cibles.detail.replaceChildren(
      ...d.options.map((option) =>
        el("article", { class: "carte carte--protocole", id: option.id }, [
          el("span", { class: "etiquette", texte: `Option ${option.numero} — ${option.canal}` }),
          el("h3", { texte: option.nom }),
          el("p", { class: "attenue" }, texteMarque(option.description, option.marqueDescription)),
          option.motifDescription ? motifATrancher(option.motifDescription) : null,
          option.description2 ? el("p", { class: "attenue", texte: option.description2 }) : null,
          option.motifIntro ? motifATrancher(option.motifIntro) : null,
          el("h4", { texte: "Comment ça se déroule" }),
          el(
            "ol",
            { class: "protocole" },
            option.etapes.map((e) =>
              el("li", {}, [
                el("p", {}, texteMarque(e.texte, e.marque)),
                e.motif ? motifATrancher(e.motif) : null,
              ])
            )
          ),
          option.fin ? el("p", { class: "protocole__fin attenue", texte: option.fin }) : null,
          el("div", { class: "carte__pied carte__pied--tarif" }, [
            el("div", { class: "carte__tarif" }, [
              el("p", { class: "prix", texte: prix(option.prix) }),
              el("p", { class: "attenue carte__duree", texte: `pour ${option.duree}` }),
            ]),
            el("a", { class: "bouton bouton--or", href: url("pages/contact.html?motif=soin"), "data-ancre-rdv": "", texte: "Prendre rendez-vous" }),
          ]),
        ])
      )
    );
  }

  if (cibles.faq) {
    cibles.faq.replaceChildren(
      ...d.faq.map((item) =>
        el("details", {}, [el("summary", { texte: item.q }), el("p", { class: "attenue", texte: item.r })])
      )
    );
  }

  /* ---- L'origine de la pratique ----
     Des dates, pas des adjectifs : c'est ce qui rend une genealogie
     verifiable. Elles recoupent la frise de la page Sophie. */
  if (cibles.origine && d.origine) {
    cibles.origine.replaceChildren(
      el("h3", { texte: d.origine.titre }),
      el("p", { class: "attenue", texte: d.origine.texte }),
      el(
        "ol",
        { class: "jalons" },
        d.origine.jalons.map((j) =>
          el("li", { class: "jalons__item" }, [
            el("span", { class: "jalons__annee", texte: j.annee }),
            el("div", { class: "jalons__corps" }, [
              el("p", {}, texteMarque(j.texte, j.marque)),
              j.motif ? motifATrancher(j.motif) : null,
            ]),
          ])
        )
      )
    );
  }

}

/* ---------- 4. Les e-learnings ---------- */

function carteElearning(p) {
  /* Carte entièrement cliquable : le lien est porté par le titre — donc
     correctement annoncé et atteignable au clavier — mais son ::after
     s'étire sur toute la carte. Pas de bouton en pied de carte : il
     ferait une deuxième cible pour la même destination. */
  return el("article", { class: "carte carte--lien" }, [
    el("div", { class: "carte__media" }, [
      el("img", { src: url(p.image), alt: p.alt, loading: "lazy", width: "640", height: "400" }),
    ]),
    el("span", { class: "etiquette", texte: p.niveau }),
    el("h3", {}, [
      el("a", { href: url(`pages/e-learnings.html#${p.id}`), texte: p.nom }),
    ]),
    el("p", { class: "attenue", texte: p.promesse }),
    el("div", { class: "carte__pied" }, [
      el("p", { class: "prix", texte: prix(p.prix) }),
      el("p", { class: "attenue", texte: p.duree }),
    ]),
    el("span", { class: "carte__suite", texte: "Découvrir" }),
  ]);
}

async function rendreElearnings() {
  const cibles = {
    cartes: document.querySelector('[data-rendu="elearnings-cartes"]'),
    detail: document.querySelector('[data-rendu="elearnings-detail"]'),
    tutorat: document.querySelector('[data-rendu="elearnings-tutorat"]'),
    achat: document.querySelector('[data-rendu="elearnings-achat"]'),
    intro: document.querySelector('[data-rendu="elearnings-intro"]'),
  };
  if (!Object.values(cibles).some(Boolean)) return;

  const d = await donnees("elearnings");
  const tries = [...d.programmes].sort((a, b) => a.prix - b.prix);

  if (cibles.cartes) {
    const limite = parseInt(cibles.cartes.dataset.limite || "0", 10);
    const liste = limite > 0 ? tries.slice(0, limite) : tries;
    cibles.cartes.replaceChildren(...liste.map(carteElearning));
  }

  if (cibles.intro) {
    // Pas de surtitre ni de titre ici : la page les porte en dur.
    cibles.intro.replaceChildren(
      el("p", { class: "chapo attenue", texte: d.intro.chapo }),
      el("p", { class: "attenue", texte: d.intro.texte })
    );
  }

  if (cibles.detail) {
    cibles.detail.replaceChildren(
      ...tries.map((p) =>
        el("article", { class: "carte", id: p.id }, [
          el("div", { class: "carte__media" }, [
            el("img", { src: url(p.image), alt: p.alt, loading: "lazy", width: "640", height: "400" }),
          ]),
          el("span", { class: "etiquette", texte: p.niveau }),
          el("h3", { texte: p.nom }),
          el("p", { class: "etat__resume", texte: p.promesse }),
          el("p", { class: "attenue", texte: p.description }),
          el("h4", { texte: "Ce que contient le parcours" }),
          el("ul", { class: "liste-puces" }, p.contenu.map((c) => el("li", { texte: c }))),
          el("div", { class: "carte__pied" }, [
            el("p", { class: "prix", texte: prix(p.prix) }),
            el("p", { class: "attenue", texte: p.duree }),
            p.lien
              ? el("a", { class: "bouton bouton--or", href: p.lien, target: "_blank", rel: "noopener", texte: "Acheter sur Payhip" })
              : null,
            el("a", { class: p.lien ? "bouton bouton--contour" : "bouton bouton--or", href: url(`pages/contact.html?motif=parcours&ouvrage=${encodeURIComponent(p.id)}`), texte: "Poser une question" }),
          ]),
        ])
      )
    );
  }

  if (cibles.tutorat) {
    cibles.tutorat.replaceChildren(
      el("span", { class: "surtitre", texte: d.tutorat.titre }),
      el("h2", { texte: d.tutorat.chapo }),
      el("p", { class: "chapo attenue", texte: d.tutorat.texte }),
      el("ul", { class: "liste-puces mt-m" }, d.tutorat.benefices.map((b) => el("li", { texte: b })))
    );
  }

  if (cibles.achat) {
    cibles.achat.replaceChildren(
      el("h3", { texte: d.achat.titre }),
      el("ol", { class: "liste-puces" }, d.achat.etapes.map((e) => el("li", { texte: e }))),
      el("p", { class: "attenue mt-m", texte: d.achat.note })
    );
  }
}

/* ---------- 5. Les livres ---------- */

async function rendreLivres() {
  const hote = document.querySelector('[data-rendu="livres"]');
  const hoteIntro = document.querySelector('[data-rendu="livres-intro"]');
  if (!hote && !hoteIntro) return;

  const d = await donnees("livres");

  if (hoteIntro) {
    // Pas de titre ici : le h1 est écrit en dur dans la page.
    hoteIntro.replaceChildren(
      el("p", { class: "chapo attenue", texte: d.intro.chapo }),
      el("p", { class: "attenue", texte: d.intro.note })
    );
  }

  if (!hote) return;

  hote.replaceChildren(
    ...d.ouvrages.map((o) =>
      /* carte--livre : une couverture est un objet en portrait. La carte
         standard rogne son média en 16/10, ce qui d'une couverture ne
         garderait qu'une tranche horizontale — sans le titre. */
      el("article", { class: "carte carte--livre", id: o.id }, [
        el("div", { class: "carte__media carte__media--portrait" }, [
          el("img", { src: url(o.image), alt: o.alt, loading: "lazy", width: "700", height: "1000" }),
        ]),
        el("span", { class: "etiquette", texte: o.genre }),
        el("h3", { texte: o.titre }),
        o.sousTitre ? el("p", { class: "attenue", texte: o.sousTitre }) : null,
        el("p", { class: "attenue", texte: o.description }),
        el("div", { class: "carte__pied" }, [
          el("p", { class: "livre__ligne" }, [
            o.prix ? el("span", { class: "prix", texte: prix(o.prix) }) : null,
            o.format ? el("span", { class: "livre__format", texte: o.format }) : null,
          ]),
          o.lien
            ? el("a", {
                class: "bouton bouton--contour",
                href: o.lien,
                target: "_blank",
                rel: "noopener",
                /* Sans éditeur, « Voir chez ${o.editeur} » affichait
                   « Voir chez null ». Le libellé dit maintenant ce qui
                   se passe : on quitte le site pour payer ailleurs. */
                texte: o.editeur ? `Voir chez ${o.editeur}` : "Commander cet e-book",
              })
            : null,
          o.aRenseigner
            ? el("span", { class: "a-renseigner", texte: `À renseigner : ${o.aRenseigner}` })
            : null,
        ]),
      ])
    )
  );
}

/* ---------- 6. Sophie ---------- */

/* Les quatre emblèmes du fil conducteur.

   Ils viennent de sa page « Mon parcours » de l'ancien site, où la même
   chaîne — Émotions, Transmutation, Création, Créativité — était déjà
   illustrée par quatre petits dessins au trait, dans un cuivre clair.
   On les redessine ici plutôt que de les découper en images : quatre
   tracés de quelques lignes, nets à toutes les tailles, qui prennent
   l'or du site au lieu du cuivre de l'ancien.

   Même grille que les autres emblèmes du site — viewBox de 48, trait
   de 1,6 — pour qu'ils se lisent comme une famille et non comme un
   jeu d'icônes rapporté. */
const EMBLEMES_FIL = {
  "Émotions":
    '<path d="M24 37 C15.5 30.4 11 26.4 11 22 C11 18.3 14.1 15.8 17.4 15.8' +
    ' C19.9 15.8 22.4 17.2 24 19.5 C25.6 17.2 28.1 15.8 30.6 15.8' +
    ' C33.9 15.8 37 18.3 37 22 C37 26.4 32.5 30.4 24 37 Z"/>',
  "Transmutation":
    '<circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="7.5"/>' +
    '<circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none"/>',
  "Création":
    '<path d="M24 9 L24 39 M9 24 L39 24 M13.4 13.4 L34.6 34.6 M34.6 13.4 L13.4 34.6"/>',
  "Créativité":
    '<path d="M24 36 C24 27 27.5 20 32 15 C34.5 23 32 32 24 36 Z"/>' +
    '<path d="M24 36 C24 27 20.5 20 16 15 C13.5 23 16 32 24 36 Z"/>' +
    '<path d="M24 36 C20 31 20 23 24 17 C28 23 28 31 24 36 Z"/>',
};

const emblemeFil = (nom) =>
  EMBLEMES_FIL[nom]
    ? el("span", {
        class: "chaine__embleme",
        "aria-hidden": "true",
        html:
          '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor"' +
          ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          EMBLEMES_FIL[nom] + "</svg>",
      })
    : null;


/* Les medaillons de la frise.

   Repris des ronds dessines de son ancienne page « Mon parcours » :
   un cercle fin qui porte un symbole au trait. Le cercle est trace en
   CSS (.frise__embleme), le SVG ne porte que le symbole — comme ca un
   changement de taille ou de couleur se fait a un seul endroit.

   Quatre d'entre eux sont les siens, redessines a la regle : le
   triangle alchimique, l'oeil, la feuille, le coeur rayonnant. Les
   cinq autres n'existaient pas et sont composes dans le meme esprit,
   chacun disant quelque chose de l'etape plutot que de la decorer :
   deux cercles pour l'accompagnement, trois cercles empiles pour les
   trois etats du moi de l'Analyse Transactionnelle, un croissant pour
   la traversee, une rosace a quatre petales pour Reveler-Liberer-
   Transformer-Creer, une etoile et ses satellites pour ce qui est
   encore en cours.

   Meme grille que les autres emblemes : viewBox de 48, symbole
   centre dans 28 unites. */
const EMBLEMES_FRISE = {
  /* Alchimie Spirituelle — le triangle et le cercle pointe, le sien. */
  alchimie:
    '<path d="M24 11 L36 33 L12 33 Z"/><circle cx="24" cy="27" r="6"/>' +
    '<circle cx="24" cy="27" r="1.5" fill="currentColor" stroke="none"/>',
  /* Coach & Team — deux cercles qui se rejoignent : accompagner, c'est
     etre deux. */
  accompagnement:
    '<circle cx="19" cy="24" r="8.5"/><circle cx="29" cy="24" r="8.5"/>',
  /* Dessin evolutif — l'oeil, le sien : mettre en lumiere ce qui est
     dans l'ombre. */
  oeil:
    '<path d="M11 24 Q24 13.5 37 24 Q24 34.5 11 24 Z"/>' +
    '<circle cx="24" cy="24" r="4.6"/>' +
    '<circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none"/>',
  /* Analyse Transactionnelle — les trois etats du moi, empiles comme
     dans le schema d'origine. */
  "trois-etats":
    '<circle cx="24" cy="12.6" r="6"/><circle cx="24" cy="24" r="6"/>' +
    '<circle cx="24" cy="35.4" r="6"/>',
  /* Communication Non Violente — la feuille, la sienne. */
  feuille:
    '<path d="M13 35 C13 22.5 21 14 33 12 C34.5 24 26.5 33 13 35 Z"/>' +
    '<path d="M13 35 L33 12"/><path d="M18.5 27.5 L24.5 29"/>' +
    '<path d="M23 21 L28.5 22.5"/>',
  /* Le tournant — un croissant : une nuit traversee. C'est aussi la
     forme du sceau du site. */
  croissant:
    '<path d="M29 11 A14 14 0 1 0 29 37 A15 15 0 0 1 29 11 Z"/>',
  /* L'Alchimie du Coeur — le coeur rayonnant, le sien. */
  "coeur-rayonnant":
    '<path d="M24 35 C16.5 29.2 12.5 25.6 12.5 21.7 C12.5 18.4 15.2 16.2 18.1 16.2' +
    ' C20.3 16.2 22.6 17.5 24 19.5 C25.4 17.5 27.7 16.2 29.9 16.2' +
    ' C32.8 16.2 35.5 18.4 35.5 21.7 C35.5 25.6 31.5 29.2 24 35 Z"/>' +
    '<path d="M24 11.5 V8 M14.5 13.5 L12.6 10.6 M33.5 13.5 L35.4 10.6' +
    ' M8.6 19 L5.4 17.8 M39.4 19 L42.6 17.8"/>',
  /* Sandra Walter — quatre petales : Reveler, Liberer, Transformer,
     Creer. */
  rosace:
    '<g><path d="M24 24 C19 19.5 19 13.5 24 9 C29 13.5 29 19.5 24 24 Z"/>' +
    '<path d="M24 24 C19 19.5 19 13.5 24 9 C29 13.5 29 19.5 24 24 Z" transform="rotate(90 24 24)"/>' +
    '<path d="M24 24 C19 19.5 19 13.5 24 9 C29 13.5 29 19.5 24 24 Z" transform="rotate(180 24 24)"/>' +
    '<path d="M24 24 C19 19.5 19 13.5 24 9 C29 13.5 29 19.5 24 24 Z" transform="rotate(270 24 24)"/></g>',
  /* En cours — l'etoile du sceau et deux satellites : quelque chose
     qui se compose encore. */
  etoiles:
    '<path d="M24 11 C25.4 19 28 21.6 36 23 C28 24.4 25.4 27 24 35' +
    ' C22.6 27 20 24.4 12 23 C20 21.6 22.6 19 24 11 Z"/>' +
    '<circle cx="35.5" cy="34" r="1.6" fill="currentColor" stroke="none"/>' +
    '<circle cx="13.5" cy="13" r="1.2" fill="currentColor" stroke="none"/>',
};

const emblemeFrise = (nom) =>
  EMBLEMES_FRISE[nom]
    ? el("span", {
        class: "frise__embleme",
        "aria-hidden": "true",
        html:
          '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor"' +
          ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          EMBLEMES_FRISE[nom] + "</svg>",
      })
    : null;


async function rendreSophie() {
  const cibles = {
    presentation: document.querySelector('[data-rendu="sophie-presentation"]'),
    frise: document.querySelector('[data-rendu="sophie-frise"]'),
    citation: document.querySelector('[data-rendu="sophie-citation"]'),
    fil: document.querySelector('[data-rendu="sophie-fil"]'),
    apercu: document.querySelector('[data-rendu="sophie-apercu"]'),
  };
  if (!Object.values(cibles).some(Boolean)) return;

  const d = await donnees("sophie");

  if (cibles.presentation) {
    // Pas de surtitre ni de h1 ici : la page les porte en dur.
    cibles.presentation.replaceChildren(
      el("p", { class: "etat__resume" }, texteMarque(d.accroche, d.marqueAccroche)),
      ...[].concat(d.motifAccroche || []).map(motifATrancher),
      ...d.presentation.map((p) => el("p", { class: "attenue", texte: p }))
    );
  }

  if (cibles.apercu) {
    // data-priorite="haute" quand l'image est au-dessus de la ligne de flottaison.
    const prioritaire = cibles.apercu.dataset.priorite === "haute";
    cibles.apercu.replaceChildren(
      el("img", {
        src: url(d.photo),
        alt: d.alt,
        loading: prioritaire ? "eager" : "lazy",
        fetchpriority: prioritaire ? "high" : null,
        width: "640",
        height: "800",
        style: "border-radius:14px",
      })
    );
  }

  if (cibles.frise) {
    cibles.frise.replaceChildren(
      ...d.frise.map((etape) =>
        el("li", { class: "frise__item" }, [
          emblemeFrise(etape.embleme),
          el("span", { class: "frise__periode", texte: etape.periode }),
          el("h3", { texte: etape.titre }),
          el("p", { class: "attenue", texte: etape.texte }),
          etape.aRenseigner ? el("span", { class: "a-renseigner", texte: etape.aRenseigner }) : null,
        ])
      )
    );
  }

  if (cibles.fil) {
    cibles.fil.replaceChildren(
      el("h3", { texte: d.filConducteur.titre }),
      el("p", { class: "attenue", texte: d.filConducteur.texte }),
      el(
        "div",
        { class: "chaine" },
        d.filConducteur.chaine.flatMap((maillon, i) => [
          i > 0 ? el("span", { class: "chaine__lien", texte: "→", "aria-hidden": "true" }) : null,
          el("span", { class: "chaine__maillon" }, [
            emblemeFil(maillon),
            el("span", { texte: maillon }),
          ]),
        ])
      )
    );
  }

  if (cibles.citation) {
    cibles.citation.replaceChildren(
      el("blockquote", { class: "citation" }, [
        document.createTextNode(d.citation),
        el("cite", { texte: d.nom }),
      ])
    );
  }
}

/* ---------- Démarrage ---------- */

document.addEventListener("ca:socle-pret", async () => {
  /* La planche des cœurs AVANT tout le reste : l'étagère et les cartes
     s'en servent toutes les deux, et un <use> dont la cible n'est pas
     encore dans le document reste vide. Les deux rendus partant en
     parallèle, injecter depuis l'un d'eux était une course. */
  if (typeof injecterPartial === "function") await injecterPartial("coeurs");

  Promise.all([
    rendreBibliotheque(),
    rendreEtats(),
    rendreSoins(),
    rendreElearnings(),
    rendreLivres(),
    rendreSophie(),
    rendreMediatheque(),
    rendreVocabulaire(),
    rendreArticles(),
    rendreMiroir(),
    rendreChiffres(),
  ])
    .then(() => {
      // Les rayons de la médiathèque n'existaient pas au premier passage.
      if (typeof activerSommaire === "function") activerSommaire();
      return lierVocabulaire();
    })
    .catch((e) => console.error("Erreur de rendu :", e));
});

/* =========================================================
   La Médiathèque

   Trois rayons — Lire, Écouter, Pratiquer — rangés par geste et non
   par format ni par prix. Ranger par prix serait commercial ; ranger
   par geste dit ce qu'on vient y chercher.

   Il y a eu un bouton « n'afficher que l'accès libre ». Il partait
   d'une bonne intention — mettre le gratuit en avant — et proposait en
   fait de masquer tout ce qui se vend, sur la seule page où les livres
   et les parcours sont visibles depuis que la navigation tient en
   quatre entrées. Les pastilles d'accès disent déjà ce qui est libre.
   ========================================================= */

async function rendreMediatheque() {
  const hotes = {
    intro: document.querySelector('[data-rendu="mediatheque-intro"]'),
    rayons: document.querySelector('[data-rendu="mediatheque-rayons"]'),
  };
  if (!hotes.rayons) return;

  const [d, livres, elearnings, articles] = await Promise.all([
    donnees("mediatheque"),
    donnees("livres"),
    donnees("elearnings"),
    donnees("articles"),
  ]);
  // audio → article qui le contient (noté côté articles.json, champ `audio`)
  const articleDeLAudio = new Map(articles.articles.filter((a) => a.audio).map((a) => [a.audio, a]));

  if (hotes.intro) {
    hotes.intro.replaceChildren(
      el("p", { class: "chapo attenue", texte: d.intro.chapo }),
      el("p", { class: "attenue", texte: d.intro.note })
    );
  }

  const f = fiche();

  /* ---- Les œuvres : livres et parcours ----

     Elles ne sont pas recopiées dans mediatheque.json. Elles sont lues
     dans livres.json et elearnings.json, les mêmes fichiers que les
     pages dédiées : un prix corrigé à un endroit est corrigé partout,
     et deux pages ne peuvent pas annoncer deux montants différents.

     Une œuvre s'ouvre dans la fiche plutôt que d'emmener ailleurs.
     C'est ce qui permet de les ranger avec les documents gratuits sans
     casser la lecture : on consulte une couverture et on revient au
     rayon, exactement comme on repose un livre sur une étagère. */

  /* La pastille dorée porte le GENRE, jamais le support.

     Elle mélangeait les deux : « Livre » (un support) côtoyait
     « Carnet » et « Manuel » (des genres), au même rang et dans la même
     couleur. Un Carnet d'Apprentis-Sages est un e-book : les deux mots
     ne répondent pas à la même question, et les mettre sur le même
     bouton dorait l'un au hasard de l'autre.

     Le support n'est pas perdu pour autant — il est écrit en toutes
     lettres dans la ligne du pied (« Livre broché · 198 pages »,
     « E-book · 46 pages », « PDF · 6 pages »), et stocké à part dans le
     champ `support` des JSON, prêt pour le jour où une recherche voudra
     filtrer dessus. */
  const oeuvreLivre = (l) => ({
    id: `livre-${l.id}`,
    rayon: "lire",
    acces: "payant",
    etiquette: l.genre,
    titre: l.titre,
    sousTitre: l.sousTitre || null,
    detail: l.format,
    image: l.image,
    alt: l.alt,
    portrait: true,
    description: l.description,
    prix: l.prix,
    faits: [l.editeur, l.format, l.parution ? `Paru en ${l.parution}` : null].filter(Boolean),
    action: l.lien
      ? { href: l.lien, texte: l.editeur ? "Commander chez l'éditeur" : "L'obtenir", externe: true }
      : null,
  });

  const oeuvreParcours = (p) => ({
    id: `parcours-${p.id}`,
    rayon: "pratiquer",
    acces: "payant",
    etiquette: "Parcours",
    titre: p.nom,
    sousTitre: p.promesse,
    detail: ["En ligne", p.duree, p.niveau].filter(Boolean).join(" · "),
    image: p.image,
    alt: p.alt,
    portrait: false,
    description: p.description,
    prix: p.prix,
    faits: p.contenu || [],
    /* Le parcours se vend sur Payhip : la fiche envoie là-bas. Sans lien
       (parcours pas encore chargé), elle renvoie vers le contact. */
    action: p.lien
      ? { href: p.lien, texte: "Acheter sur Payhip", externe: true }
      : { href: url(`pages/contact.html?motif=parcours&ouvrage=${encodeURIComponent(p.id)}`), texte: "Poser une question" },
  });

  const oeuvres = [
    ...livres.ouvrages.map(oeuvreLivre),
    ...elearnings.programmes.map(oeuvreParcours),
  ];

  const ouvrirOeuvre = (o, declencheur) => {
    if (!f) return;
    f.ouvrir(
      [
        /* La couverture est un objet posé à côté du texte, comme sur la
           carte : même langage, et la fiche ne s'ouvre plus sur une
           bande d'image qui repousse le titre hors de l'écran. */
        el("div", { class: "fiche__colonnes" }, [
          o.image
            ? el("div", { class: "fiche__media" }, [
                el("img", { src: url(o.image), alt: o.alt || "", loading: "lazy" }),
              ])
            : null,
          el("div", { class: "fiche__texte" }, [
            el("span", { class: "etiquette", texte: o.etiquette }),
            el("h3", { id: "fiche-titre", tabindex: "-1", texte: o.titre }),
            o.sousTitre ? el("p", { class: "fiche__sous-titre", texte: o.sousTitre }) : null,
            el("p", { texte: o.description }),
            o.faits.length
              ? el("ul", { class: "liste-puces fiche__faits" }, o.faits.map((x) => el("li", { texte: x })))
              : null,
          ]),
        ]),
        el("div", { class: "fiche__actions" }, [
          o.prix !== undefined && o.prix !== null
            ? el("span", { class: "prix", texte: prix(o.prix) })
            : null,
          o.action
            ? el("a", {
                class: "bouton bouton--or",
                href: o.action.href,
                rel: o.action.externe ? "noopener" : null,
                target: o.action.externe ? "_blank" : null,
                texte: o.action.texte,
              })
            : null,
        ]),
      ],
      { declencheur, hash: o.id, large: true }
    );
  };

  /* Une carte de la médiathèque. Quatre cas :
     - une œuvre                 → bouton, ouvre la fiche
     - un fichier à télécharger  → lien direct, avec download
     - un lien interne           → carte cliquable
     - rien encore               → pastille « à renseigner » */
  const carteOeuvre = (o) =>
    el("button", { type: "button", class: "carte carte--ouvrante", id: o.id,
                   "data-acces": o.acces, onclick: (e) => ouvrirOeuvre(o, e.currentTarget) }, [
      /* Couverture (portrait) : elle partage une rangée avec l'étiquette.
         Sans cadre, la place à droite de la couverture était vide, et
         l'étiquette plus bas repoussait le titre d'une ligne pour rien.

         Visuel en paysage (les parcours) : il prend toute la largeur de
         la carte, en haut, et l'étiquette est posée dessus, dans le coin
         (carte__visuel--large). Le chevauchement est voulu : l'étiquette
         a un fond sombre qui la garde lisible sur n'importe quelle image. */
      el("span", { class: `carte__visuel${o.image && !o.portrait ? " carte__visuel--large" : ""}` }, [
        o.image
          ? el("span", { class: `carte__media${o.portrait ? " carte__media--portrait" : ""}` }, [
              el("img", { src: url(o.image), alt: "", loading: "lazy" }),
            ])
          : null,
        el("span", { class: "etiquette", texte: o.etiquette }),
      ]),
      el("span", { class: "carte__titre", texte: o.titre }),
      o.sousTitre ? el("span", { class: "media__sous-titre", texte: o.sousTitre }) : null,
      el("span", { class: "carte__pied" }, [
        /* Même ligne que sur les documents libres : accès, support,
           puis prix. C'est ici — et nulle part ailleurs sur la carte —
           qu'on lit « Livre broché » ou « E-book », puisque la pastille
           dorée ne porte plus que le genre. */
        el("span", { class: "media__ligne" }, [
          el("span", { class: "pastille-acces pastille-acces--payant", texte: "Payant" }),
          o.detail ? el("span", { class: "media__detail", texte: o.detail }) : null,
          o.prix !== undefined && o.prix !== null
            ? el("span", { class: "media__detail media__prix", texte: prix(o.prix) })
            : null,
        ]),
        el("span", { class: "carte__suite", texte: "En savoir plus" }),
      ]),
    ]);

  /* Une carte de document. Trois formes, selon ce qu'il y a au bout :

     - un audio        → le lecteur est DANS la carte. Une méditation de
                         quinze minutes, on la lance et on part ailleurs :
                         l'enfermer dans une fiche modale obligerait à
                         garder la fiche ouverte, ou à couper le son en la
                         fermant. Et une carte cliquable en entier avalerait
                         les clics sur le lecteur — donc pas de
                         `carte--lien` ici.
     - un lien externe → nouvel onglet, `rel=noopener`.
     - un fichier ou   → la carte entière est cliquable, comme avant.
       une page
  */
  const carteDocument = (i) => {
    const audio = i.support === "Audio" && i.fichier;
    const externe = i.lien && /^https?:/.test(i.lien);
    const cible = i.fichier ? url(i.fichier) : i.lien ? (externe ? i.lien : url(`pages/${i.lien}`)) : null;
    const cliquable = cible && !audio;

    /* Un e-book s'ouvre, il ne se telecharge pas d'un clic.

       On a essaye de l'afficher dans la fiche : une visionneuse PDF
       apporte sa propre barre d'outils, ses vignettes et son zoom, et
       la loger dans une modale qui a deja une croix et des boutons fait
       deux interfaces qui se disputent l'ecran — dont une qu'on ne
       controle pas et qu'on ne peut pas mettre au format du site. Un
       PDF veut la page entiere : on l'ouvre dans un onglet, la
       mediatheque reste derriere, et le telechargement redevient un
       geste a part, sur la mention de pied. */
    const lisible = !!i.fichier && !audio && /\.pdf$/i.test(i.fichier);

    const titre = cliquable
      ? el("h3", {}, [
          el("a", {
            href: cible,
            download: i.fichier && !lisible ? "" : null,
            rel: externe || lisible ? "noopener" : null,
            target: externe || lisible ? "_blank" : null,
            texte: i.titre,
          }),
        ])
      : el("h3", { texte: i.titre });

    const suite = !cible
      ? null
      : audio
        ? null
        : el(i.fichier ? "a" : "span", {
            /* Quand il y a un fichier, cette mention n'est plus un
               simple libelle : c'est LE geste de telechargement, separe
               du clic sur la carte qui, lui, ouvre l'apercu. Il lui faut
               donc son propre plan — le ::after du titre recouvre la
               carte entiere et l'avalerait. */
            class: `carte__suite${i.fichier ? " carte__suite--action" : ""}`,
            href: i.fichier ? cible : null,
            download: i.fichier ? "" : null,
            /* Le libellé suit le support annoncé, pas l'extension du
               fichier : les documents libres sont présentés comme des
               e-books gratuits, pas comme des PDF. Si un jour un autre
               support atterrit ici, le repli reste juste. */
            texte: externe
              ? "Ouvrir la chaîne"
              : i.fichier
                ? (i.support === "E-book" ? "Télécharger l'e-book" : "Télécharger")
                : "Découvrir",
          });

    return el(
      "article",
      { class: `carte${cliquable ? " carte--lien" : ""}${audio ? " carte--audio" : ""}`,
        "data-acces": i.acces, id: i.id },
      [
        /* Même rangée visuel + étiquette que les œuvres : les contes ont
           désormais une couverture, et une étiquette posée dessous
           repousserait le titre d'une ligne pour rien. Sans image, la
           rangée ne contient que l'étiquette et ne change rien. */
        el("div", { class: "carte__visuel" }, [
          i.image
            ? el("div", { class: "carte__media carte__media--portrait" }, [
                el("img", { src: url(i.image), alt: "", loading: "lazy" }),
              ])
            : null,
          el("span", { class: "etiquette", texte: i.genre }),
        ]),
        titre,
        i.sousTitre ? el("p", { class: "media__sous-titre", texte: i.sousTitre }) : null,
        el("p", { class: "attenue", texte: i.description }),
        el("div", { class: "carte__pied" }, [
          /* preload="none" : sans lui, six lecteurs sur une page lancent
             six requêtes avant qu'on ait touché quoi que ce soit. */
          audio
            ? el("audio", { class: "lecteur", controls: "", preload: "none", src: cible })
            : null,
          el("p", { class: "media__ligne" }, [
            el("span", {
              class: `pastille-acces pastille-acces--${i.acces}`,
              texte: i.acces === "libre" ? "Accès libre" : "Payant",
            }),
            i.detail ? el("span", { class: "media__detail", texte: i.detail }) : null,
            audio
              ? el("a", {
                  class: "media__telecharger",
                  href: cible,
                  download: "",
                  texte: "Télécharger",
                })
              : null,
            audio && articleDeLAudio.has(i.id)
              ? el("a", {
                  class: "media__telecharger",
                  href: url(`pages/${articleDeLAudio.get(i.id).lien}`),
                  texte: "Lire l'article",
                })
              : null,
          ]),
          i.aRenseigner
            ? el("span", { class: "a-renseigner", texte: `À renseigner : ${i.aRenseigner}` })
            : null,
          suite,
        ]),
      ]
    );
  };

  /* Les rayons alternent dans l'échelle bleue, comme le reste du site. */
  const teintes = [
    ["var(--g2)", "var(--g3)"],
    ["var(--g3)", "var(--g4)"],
    ["var(--g4)", "var(--g2)"],
  ];

  hotes.rayons.replaceChildren(
    ...d.rayons.map((r, rang) => {
      /* Le libre d'abord, les œuvres ensuite. Ce n'est pas une question
         de hiérarchie mais d'entrée : on propose de lire avant de
         proposer d'acheter, et une fois qu'on est convaincu, ce qui se
         vend est là, au même endroit, sans avoir à chercher. */
      const cartes = [
        ...d.items.filter((i) => i.rayon === r.id).map(carteDocument),
        ...oeuvres.filter((o) => o.rayon === r.id).map(carteOeuvre),
      ];
      const [de, vers] = teintes[rang % teintes.length];
      return el(
        "section",
        {
          id: `rayon-${r.id}`,
          class: "fondu rayon",
          style: `--de:${de}; --vers:${vers}`,
          "data-theme": "sombre",
          "data-sommaire": r.titre,
        },
        [
          el("div", { class: "contenu" }, [
            el("div", { class: "entete-section" }, [
              el("span", { class: "surtitre", texte: `Rayon ${rang + 1} sur ${d.rayons.length}` }),
              el("h2", { texte: r.titre }),
              el("p", { class: "chapo attenue", texte: r.chapo }),
            ]),
            el("div", { class: "grille grille--defilante" }, cartes),
            etagereDecorative(rang),
          ]),
        ]
      );
    })
  );

  // Arrivée directe sur #livre-xxx ou #parcours-xxx.
  const cible = location.hash.slice(1);
  const o = oeuvres.find((x) => x.id === cible);
  if (o) ouvrirOeuvre(o, document.getElementById(cible));
  // Arrivée sur un rayon (#rayon-pratiquer) : les rayons n'existent qu'après
  // le rendu, le navigateur n'a donc pas pu défiler tout seul jusqu'à eux.
  else if (cible.startsWith("rayon-")) document.getElementById(cible)?.scrollIntoView();
}

/* =========================================================
   Les étagères décoratives

   Un filet posé entre deux sections, avec une rangée de tranches de
   livres dessus. C'est du décor, donc c'est aria-hidden et ça ne coûte
   pas une image : quelques <span> et un dégradé.

   Les largeurs et les hauteurs sont tirées d'un générateur à graine.
   Du vrai hasard donnerait une étagère différente à chaque rendu — et
   comme le rendu se rejoue à chaque chargement, l'étagère bougerait
   sans raison d'une page à l'autre. Avec une graine, le rayon 1 a
   toujours la même étagère, et elle diffère de celle du rayon 2.
   ========================================================= */

function etagereDecorative(graine = 0, nombre = 90) {
  // Générateur congruentiel linéaire : trois lignes, pas de dépendance,
  // et une suite parfaitement reproductible pour une graine donnée.
  let etat = (graine + 1) * 9301 + 49297;
  const suivant = () => {
    etat = (etat * 9301 + 49297) % 233280;
    return etat / 233280;
  };

  /* Assez de tranches pour couvrir le plus large des écrans : la rangée
     est coupée à la largeur disponible (overflow), donc mieux vaut en
     avoir de trop que de s'arrêter au tiers de la page — une étagère
     qui s'interrompt au milieu ressemble à un graphique en barres. */
  const tranches = Array.from({ length: nombre }, () => {
    // Un vide de temps en temps : une étagère entièrement pleine sur
    // deux mètres, ça n'existe pas et ça se voit.
    if (suivant() < 0.09) {
      return el("span", { class: "etagere-deco__vide", style: `--l:${8 + Math.round(suivant() * 14)}px` });
    }
    const h = 42 + Math.round(suivant() * 46);   // 42 → 88 %
    const l = 7 + Math.round(suivant() * 15);    // 7 → 22 px
    const teinte = suivant();
    // Une tranche dorée de temps en temps. Une rangée d'un seul bleu se
    // lit comme un graphique en barres ; c'est la variation de couleur
    // qui la fait basculer du côté des livres.
    const doree = suivant() < 0.14;
    return el("span", {
      class: `etagere-deco__livre${doree ? " etagere-deco__livre--or" : ""}`,
      style: `--h:${h}%; --l:${l}px; --o:${(0.3 + teinte * 0.45).toFixed(2)}`,
    });
  });

  return el("div", { class: "etagere-deco", "aria-hidden": "true" }, [
    el("div", { class: "etagere-deco__rangee" }, tranches),
    el("div", { class: "etagere-deco__filet" }),
  ]);
}

/* =========================================================
   Le vocabulaire et les articles

   Deux sections bâties sur le même moule de carte, avec une
   destination différente : un mot s'ouvre dans une fiche par-dessus la
   page, un article ouvre une page à lui. C'est volontaire — la
   question posée était de savoir si les deux peuvent tenir au même
   endroit, et la seule façon d'y répondre est de les voir côte à côte.

   La fiche est un <dialog> natif. Il donne gratuitement ce qu'une
   fausse modale en <div> oblige à réécrire et à rater : le piège au
   clavier, la fermeture par Échap, le fond inerte, le retour du focus
   sur le mot qu'on venait d'ouvrir.
   ========================================================= */

/* La fiche partagée.

   Un seul <dialog> par page, dont le contenu change : une définition du
   vocabulaire, un livre, un parcours. Centraliser évite d'avoir trois
   modales aux comportements légèrement différents — et c'est toujours
   par les différences qu'une modale devient inutilisable au clavier.

   `hash` rend la fiche ouverte partageable et permet d'arriver
   directement dessus. On remplace l'entrée d'historique au lieu d'en
   empiler une : sinon, dix renvois « voir aussi » demandent dix retours
   en arrière pour sortir de la page.
*/

function creerFiche() {
  let dlg = document.getElementById("fiche");
  /* Les pages qui n'ont pas la fiche dans leur HTML (articles, accueil,
     accompagnement) la reçoivent ici, à l'identique : c'est elle qui
     affiche une définition quand on touche un mot souligné. */
  if (!dlg) {
    dlg = el("dialog", { class: "fiche", id: "fiche", "aria-labelledby": "fiche-titre" }, [
      el("form", { method: "dialog", class: "fiche__fermer-forme" }, [
        el("button", {
          class: "fiche__fermer",
          type: "submit",
          "aria-label": "Fermer",
          html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        }),
      ]),
      el("div", { class: "fiche__corps", "data-fiche-corps": "" }),
    ]);
    (document.querySelector("main") || document.body).append(dlg);
  }
  const corps = dlg.querySelector("[data-fiche-corps]");
  let origine = null;

  dlg.addEventListener("close", () => {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    if (origine) origine.focus();
    origine = null;
  });

  // Cliquer à côté referme. <dialog> ne le fait pas tout seul, et
  // l'événement vise l'élément lui-même quand on touche le fond.
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });

  return {
    ouvrir(noeuds, { declencheur = null, hash = null, large = false } = {}) {
      if (declencheur) origine = declencheur;
      /* Deux largeurs, parce que deux contenus. Une définition est un
         paragraphe : au-delà de 36rem l'œil perd la ligne suivante en
         revenant à la marge. Une œuvre a une couverture à montrer à
         côté du texte, et c'est la colonne de texte — pas la fiche —
         qui garde la mesure de lecture. */
      dlg.classList.toggle("fiche--large", large);
      corps.replaceChildren(...[].concat(noeuds).filter(Boolean));
      corps.scrollTop = 0;
      if (!dlg.open) dlg.showModal();
      if (hash) history.replaceState(null, "", `#${hash}`);
      const titre = corps.querySelector("#fiche-titre");
      if (titre) titre.focus();
    },
  };
}

let FICHE = null;
function fiche() {
  if (FICHE === null) FICHE = creerFiche();
  return FICHE;
}

function enteteDeSection(intro) {
  return el("div", { class: "entete-section" }, [
    intro.surtitre ? el("span", { class: "surtitre", texte: intro.surtitre }) : null,
    el("h2", { texte: intro.titre }),
    intro.chapo ? el("p", { class: "chapo attenue", texte: intro.chapo }) : null,
    intro.note ? el("p", { class: "attenue", texte: intro.note }) : null,
  ]);
}

/* Ouvrir la définition d'un mot dans la fiche. Partagé entre le
   vocabulaire de la Médiathèque et les mots soulignés des pages. */
async function ouvrirMot(id, declencheur) {
  const d = await donnees("vocabulaire");
  const parId = new Map(d.termes.map((t) => [t.id, t]));
  const t = parId.get(id);
  const f = fiche();
  if (!t || !f) return;
  const surLaMediatheque = !!document.querySelector('[data-rendu="vocabulaire-termes"]');
  f.ouvrir(
    [
      el("h3", { id: "fiche-titre", tabindex: "-1", texte: t.terme }),
      el("p", { texte: t.definition }),
      (t.voirAussi || []).length
        ? el("div", { class: "fiche__voir-aussi" }, [
            el("span", { class: "surtitre", texte: "Voir aussi" }),
            el(
              "ul",
              {},
              t.voirAussi
                .filter((autre) => parId.has(autre))
                .map((autre) =>
                  el("li", {}, [
                    el("button", {
                      type: "button",
                      class: "fiche__renvoi",
                      texte: parId.get(autre).terme,
                      onclick: () => ouvrirMot(autre),
                    }),
                  ])
                )
            ),
          ])
        : null,
      surLaMediatheque
        ? null
        : el("p", { class: "fiche__tout" }, [
            el("a", { href: url("pages/mediatheque.html#vocabulaire"), texte: "Tout le vocabulaire →" }),
          ]),
    ],
    { declencheur, hash: surLaMediatheque ? `mot-${id}` : null }
  );
}

/* La première phrase d'une définition, pour l'aperçu du lexique. */
const premierePhrase = (texte) => (texte.match(/^.*?[.!?…](?=\s|$)/) || [texte])[0];

async function rendreVocabulaire() {
  const hoteIntro = document.querySelector('[data-rendu="vocabulaire-intro"]');
  const hoteTermes = document.querySelector('[data-rendu="vocabulaire-termes"]');
  if (!hoteTermes) return;

  const d = await donnees("vocabulaire");
  const parId = new Map(d.termes.map((t) => [t.id, t]));
  const ouvrir = (id, declencheur) => ouvrirMot(id, declencheur);

  if (hoteIntro) hoteIntro.replaceChildren(enteteDeSection(d.intro));

  /* Un lexique rangé par familles plutôt qu'une rangée de pastilles :
     chaque mot montre la première phrase de sa définition, on ouvre la
     fiche pour lire la suite. Un terme sans famille connue atterrit
     dans un dernier groupe, il ne disparaît pas. */
  const familles = [...(d.familles || [])];
  const connues = new Set(familles.map((f) => f.id));
  if (d.termes.some((t) => !connues.has(t.famille))) familles.push({ id: "_autres", titre: "Autres mots" });

  hoteTermes.replaceChildren(
    el(
      "div",
      { class: "lexique" },
      familles
        .map((fam) => {
          const termes = d.termes.filter((t) =>
            fam.id === "_autres" ? !connues.has(t.famille) : t.famille === fam.id
          );
          if (!termes.length) return null;
          return el("section", { class: "lexique__famille", "aria-label": fam.titre }, [
            el("h3", { class: "lexique__titre", texte: fam.titre }),
            el(
              "ul",
              { class: "lexique__liste" },
              termes.map((t) =>
                el("li", {}, [
                  el("button", {
                    type: "button",
                    class: "lexique__mot",
                    id: `mot-${t.id}`,
                    "aria-haspopup": "dialog",
                    onclick: (e) => ouvrir(t.id, e.currentTarget),
                  }, [
                    el("span", { class: "lexique__terme", texte: t.terme }),
                    el("span", { class: "lexique__apercu", texte: premierePhrase(t.definition) }),
                  ]),
                ])
              )
            ),
          ]);
        })
        .filter(Boolean)
    ),
    etagereDecorative(3)
  );

  // Arrivée directe sur #mot-xxx : la définition s'ouvre.
  if (location.hash.startsWith("#mot-")) {
    const id = location.hash.slice(5);
    if (parId.has(id)) ouvrir(id, document.getElementById(`mot-${id}`));
  }
}

async function rendreArticles() {
  const hoteIntro = document.querySelector('[data-rendu="articles-intro"]');
  const hoteListe = document.querySelector('[data-rendu="articles-liste"]');
  /* L'encart « Avant de lire » a été retiré le 02/10 : le cadre est dit
     dans le pied de page et les mentions légales, et les mots du
     vocabulaire sont maintenant cliquables dans le texte. */
  const hoteAudio = document.querySelector('[data-rendu="article-audio"]');
  if (!hoteListe && !hoteAudio) return;

  const d = await donnees("articles");

  /* La pratique guidée en audio, dans l'article qui la décrit. Le lien
     article → audio est noté UNE fois, dans articles.json (`audio`) ;
     la carte de la Médiathèque le relit dans l'autre sens. */
  if (hoteAudio) {
    const page = (location.pathname.split("/").pop() || "").toLowerCase();
    const article = d.articles.find((a) => (a.lien || "").split("/").pop().toLowerCase() === page);
    const media = article && article.audio ? await donnees("mediatheque") : null;
    const item = media && media.items.find((i) => i.id === article.audio);
    if (item) {
      hoteAudio.replaceChildren(
        el("figure", { class: "audio-pratique" }, [
          el("figcaption", {}, [
            el("span", { class: "surtitre", texte: hoteAudio.dataset.intitule || "Écouter la pratique guidée" }),
            el("span", { class: "audio-pratique__titre", texte: item.titre }),
            item.detail ? el("span", { class: "media__detail", texte: item.detail }) : null,
          ]),
          el("audio", { class: "lecteur", controls: "", preload: "none", src: url(item.fichier) }),
        ])
      );
    }
  }

  if (!hoteListe) return;
  if (hoteIntro) hoteIntro.replaceChildren(enteteDeSection(d.intro));

  const dateLisible = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  hoteListe.replaceChildren(
    el(
      "div",
      { class: "grille grille--defilante" },
      d.articles.map((a) => {
        const cible = a.lien ? url(`pages/${a.lien}`) : null;
        return el("article", { class: `carte${cible ? " carte--lien" : ""}`, id: a.id }, [
          el("h3", {}, [cible ? el("a", { href: cible, texte: a.titre }) : el("span", { texte: a.titre })]),
          el("p", { class: "attenue", texte: a.resume }),
          el("div", { class: "carte__pied" }, [
            el("p", { class: "media__ligne" }, [
              dateLisible(a.date) ? el("span", { class: "media__detail", texte: dateLisible(a.date) }) : null,
              a.lecture ? el("span", { class: "media__detail", texte: a.lecture }) : null,
            ]),
            a.aRenseigner
              ? el("span", { class: "a-renseigner", texte: `À renseigner : ${a.aRenseigner}` })
              : null,
            cible ? el("span", { class: "carte__suite", texte: "Lire l'article" }) : null,
          ]),
        ]);
      })
    )
  );
}

/* =========================================================
   Le miroir d'eau

   Le modèle de Sophie tient en trois temps, et sa géométrie est plus
   simple qu'il n'y paraît. De haut en bas :

       au départ      masque · blessé · créateur
       à l'arrivée    créateur · blessé · masque

   C'est une symétrie exacte, et le blessé est l'axe : il ne bouge
   jamais. Sa phrase — « il faut passer par le blessé pour atteindre le
   créateur » — n'est donc pas une étape ajoutée à la métaphore, c'est
   la métaphore. D'où l'eau plutôt que la glace : l'axe d'un reflet,
   c'est la surface, et le blessé est dessus.

   Un iceberg ne pouvait pas porter ça. Sa proportion est imposée par
   la densité ; le retourner n'est pas une image de transformation mais
   une image d'accident.

   Les trois figures existent une seule fois et changent de rang. Le
   rang est une donnée (1 à 5, la surface au 3), la position est du
   CSS : l'animation viendra sans toucher à ce fichier.
   ========================================================= */

async function rendreMiroir() {
  const hote = document.querySelector('[data-rendu="miroir"]');
  if (!hote) return;

  const d = await donnees("miroir");

  /* La planche de symboles d'abord, les figures ensuite. Un <use> dont
     la cible n'est pas encore dans le document reste vide, et tous les
     navigateurs ne le réparent pas quand elle arrive après. */
  hote.replaceChildren(el("div", { "data-partial": "miroir" }));
  if (typeof injecterPartial === "function") await injecterPartial("miroir");

  const scene = el("div", { class: "miroir__scene" });
  scene.append(el("div", { class: "miroir__eau", "aria-hidden": "true" }));

  /* Une figure par part : elle existe une fois pour toutes et ne fait
     que changer de rang. C'est ce qui rendra l'animation gratuite —
     un déplacement, pas une reconstruction. */
  const figures = {};
  d.figures.forEach((f) => {
    const texte = el("div", { class: "miroir__texte" }, [
      el("strong", { texte: f.nom }),
      el("span", { class: "miroir__detail" }),
    ]);
    const n = el("div", { class: "miroir__fig" }, [
      el("span", {
        class: "miroir__symbole", "aria-hidden": "true",
        html: `<svg viewBox="-34 -34 68 68"><use href="#sym-halo" class="miroir__auréole"/><use href="#sym-${f.id}"/></svg>`,
      }),
      texte,
    ]);
    figures[f.id] = { n, detail: texte.querySelector(".miroir__detail") };
    scene.append(n);
  });

  const jalons = el("ol", { class: "miroir__jalons", "aria-hidden": "true" },
    d.etats.map(() => el("li")));

  const titre = el("h3");
  const texte = el("p", { class: "attenue" });
  const precedent = el("button", { class: "bouton bouton--contour", type: "button", texte: "Précédent" });
  const suivant = el("button", { class: "bouton bouton--or", type: "button" });

  let courant = 0;

  const montrer = (n) => {
    courant = n;
    const e = d.etats[n];
    scene.dataset.etat = e.id;

    for (const [id, f] of Object.entries(figures)) {
      const pos = e.figures[id];
      f.n.dataset.rang = pos.rang;
      /* Le rang 3, c'est la surface elle-même : ni dans l'air ni dans
         l'eau. C'est le seul moment où une part est exactement au
         partage, et c'est là que se fait le travail. */
      f.n.dataset.zone = pos.rang < 3 ? "air" : pos.rang > 3 ? "eau" : "seuil";
      f.detail.textContent = pos.detail;
    }

    [...jalons.children].forEach((li, i) => {
      li.dataset.etat = i < n ? "passe" : i === n ? "courant" : "avenir";
    });

    titre.textContent = e.titre;
    texte.textContent = e.texte;
    precedent.disabled = n === 0;
    suivant.textContent = n === d.etats.length - 1 ? "Revenir au départ" : "Continuer";
  };

  /* Pas d'onglets : on ne doit pas pouvoir sauter le passage. La
     contrainte est le propos — « il faut passer par le blessé pour
     atteindre le créateur ». Une rangée d'onglets dirait le contraire. */
  precedent.addEventListener("click", () => montrer(Math.max(0, courant - 1)));
  suivant.addEventListener("click", () => montrer((courant + 1) % d.etats.length));

  hote.append(
    el("div", { class: "entete-section entete-section--bande entete-section--miroir" }, [
      el("div", {}, [
        el("span", { class: "surtitre", texte: d.intro.surtitre }),
        el("h2", { texte: d.intro.titre }),
      ]),
      el("p", { class: "chapo attenue", texte: d.intro.chapo }),
    ]),
    el("div", { class: "miroir" }, [
      scene,
      /* Les commandes sont un élément à part, placé juste après la
         scène dans le DOM. Sur mobile, elles se retrouvent donc
         directement sous les figures : on voit ce qu'on déplace au
         moment où on appuie. Quand elles étaient au bas du panneau,
         le bouton se trouvait à un écran et demi sous la scène — on
         pilotait une animation qu'on ne voyait pas.
         Sur grand écran, la grille les renvoie sous le texte. */
      el("div", { class: "miroir__commandes" }, [jalons, precedent, suivant]),

      /* Seuls le titre et le texte sont annoncés : mettre les boutons
         dans la zone vive ferait relire « Continuer » à chaque étape. */
      el("div", { class: "miroir__panneau", "aria-live": "polite" }, [titre, texte]),
    ]),
    el("p", { class: "attenue miroir__note", texte: d.intro.note }),

    /* D'ou vient l'image. Elle etait posee sans provenance : on la
       montrait sans dire qu'elle emprunte a deux cadres existants.
       Le dire la rend plus solide, pas moins — c'est la regle qu'on
       s'est donnee : ne pas reinventer les termes, et citer ceux
       qu'on emprunte. */
    d.intro.origine
      ? el("aside", { class: "note-lecture miroir__origine" }, [
          el("span", { class: "note-lecture__titre", texte: d.intro.origine.titre }),
          el("p", {}, texteMarque(d.intro.origine.texte, d.intro.origine.marque)),
          d.intro.origine.motif ? motifATrancher(d.intro.origine.motif) : null,
        ])
      : null
  );

  /* Le pas de la grille : la figure la plus haute, plus une marge.
     Les libellés passent de une à trois lignes selon la largeur de
     l'écran et la longueur des textes du JSON — c'est donc le contenu
     qui décide, pas une valeur écrite à l'avance.
     Borné en bas pour que la scène ne s'écrase pas, en haut pour
     qu'elle ne s'étire pas sur grand écran. */
  /* `--pas` est posé sur `.miroir` et non sur la scène : la colonne de
     droite s'en sert pour caler ses jalons exactement sur la ligne
     d'eau, qui est à 2,5 pas du haut. Une propriété personnalisée
     s'hérite, la scène la lit donc toujours. */
  const racine = hote.querySelector(".miroir");
  const ajusterPas = () => {
    const hauteurs = Object.values(figures).map((f) => f.n.offsetHeight);
    const pas = Math.min(84, Math.max(58, Math.max(...hauteurs) + 14));
    racine.style.setProperty("--pas", `${pas}px`);
  };

  montrer(0);
  ajusterPas();

  if (typeof ResizeObserver === "function") {
    /* On observe une figure : elle change de hauteur quand le texte se
       rompt autrement, ce qui est exactement le moment où le pas doit
       être recalculé. */
    new ResizeObserver(ajusterPas).observe(figures[d.figures[0].id].n);
  }
}

/* =========================================================
   Les mots du vocabulaire, cliquables dans le texte

   Dans toute zone marquée [data-vocabulaire] (le corps des articles,
   l'accueil, l'accompagnement), la PREMIÈRE apparition de chaque mot de
   vocabulaire.json devient un bouton souligné en pointillé, qui ouvre
   sa définition dans la fiche. Rien à baliser à la main : un mot ajouté
   au vocabulaire se branche partout tout seul.

   - Les expressions longues passent en premier, et un mot court ne
     mord pas dans une plus longue : « Enfant Intérieur » ne se pose pas
     au début de « Enfant Intérieur Blessé ».
   - Pluriels tolérés (un « s » ou un « x » en fin de mot), apostrophe
     droite ou courbe, insensible à la casse.
   - Jamais dans un titre, un lien, un bouton, le hero, une note de
     chantier : [data-sans-vocabulaire] exclut une zone à la main.
   ========================================================= */
async function lierVocabulaire() {
  const zones = [...document.querySelectorAll("[data-vocabulaire]")];
  if (!zones.length) return;
  const d = await donnees("vocabulaire");

  const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const motif = (terme) =>
    terme
      .split(/\s+/)
      .map((mot) => echapper(mot).replace(/'/g, "['’]") + (mot.length > 3 ? "[sx]?" : ""))
      .join("[\\s\u00a0]+");

  const termes = [...d.termes].sort((a, b) => b.terme.length - a.terme.length);
  const regles = termes.map((t) => {
    // Les expressions plus longues qui commencent par ce mot : on ne
    // veut pas les couper en deux.
    const suites = termes
      .filter((l) => l !== t && l.terme.toLowerCase().startsWith(t.terme.toLowerCase() + " "))
      .map((l) => motif(l.terme.slice(t.terme.length).trim()));
    const garde = suites.length ? `(?![\\s\u00a0]+(?:${suites.join("|")}))` : "";
    return {
      id: t.id,
      re: new RegExp(`(?<![\\p{L}\\p{N}-])${motif(t.terme)}(?![\\p{L}\\p{N}-])${garde}`, "iu"),
    };
  });

  const EXCLUS =
    "a, button, h1, h2, h3, h4, h5, h6, label, mark, nav, svg, dialog, figcaption, .hero, .surtitre, " +
    ".entete-section, .chantier, .a-renseigner, .a-trancher__motif, [role='tab'], [data-sans-vocabulaire], .mot-lie";

  const lies = new Set();
  for (const zone of zones) {
    for (const r of regles) {
      if (lies.has(r.id)) continue;
      const parcours = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.parentElement && !n.parentElement.closest(EXCLUS) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
      });
      let n;
      while ((n = parcours.nextNode())) {
        const m = r.re.exec(n.nodeValue);
        if (!m) continue;
        const debut = n.splitText(m.index);
        debut.splitText(m[0].length);
        debut.replaceWith(
          el("button", {
            type: "button",
            class: "mot-lie",
            "aria-haspopup": "dialog",
            title: "Voir la définition",
            texte: debut.nodeValue,
            onclick: (e) => ouvrirMot(r.id, e.currentTarget),
          })
        );
        lies.add(r.id);
        break;
      }
    }
  }
}
