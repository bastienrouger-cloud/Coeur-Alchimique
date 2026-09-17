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
    "elearnings-prix": prixParcours.length
      ? `De ${prix(Math.min(...prixParcours))} à ${prix(Math.max(...prixParcours))}`
      : null,
    "elearnings-nombre": nombres[n] ? nombres[n][0].toUpperCase() + nombres[n].slice(1) : String(n),
    "elearnings-nombre-chiffre": String(n),
  };

  cibles.forEach((cible) => {
    const v = valeurs[cible.dataset.chiffre];
    if (v) cible.textContent = v;
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
        el("a", { class: "bouton bouton--contour", href: url("pages/contact.html"), texte: "Prendre rendez-vous" }),
      ]),
    ]),
  ]);
}

async function rendreSoins() {
  const cibles = {
    cartes: document.querySelector('[data-rendu="soins-cartes"]'),
    detail: document.querySelector('[data-rendu="soins-detail"]'),
    benefices: document.querySelector('[data-rendu="soins-benefices"]'),
    faq: document.querySelector('[data-rendu="soins-faq"]'),
  };
  if (!Object.values(cibles).some(Boolean)) return;

  const d = await donnees("soins");

  if (cibles.cartes) cibles.cartes.replaceChildren(...d.options.map(carteSoin));

  if (cibles.detail) {
    cibles.detail.replaceChildren(
      ...d.options.map((option) =>
        el("article", { class: "carte", id: option.id }, [
          el("span", { class: "etiquette", texte: `Option ${option.numero} — ${option.canal}` }),
          el("h3", { texte: option.nom }),
          el("p", { class: "attenue", texte: option.description }),
          el("h4", { texte: "Comment ça se déroule" }),
          el(
            "ol",
            { class: "liste-puces" },
            option.etapes.map((e) =>
              el("li", {}, [el("strong", { texte: `${e.nom} — ` }), document.createTextNode(e.texte)])
            )
          ),
          el("div", { class: "carte__pied" }, [
            el("p", { class: "prix", texte: prix(option.prix) }),
            el("p", { class: "attenue", texte: `Durée : ${option.duree}` }),
            el("a", { class: "bouton bouton--or", href: url("pages/contact.html"), texte: "Prendre rendez-vous" }),
          ]),
        ])
      )
    );
  }

  if (cibles.benefices) {
    cibles.benefices.replaceChildren(
      ...d.benefices.map((b) =>
        el("div", { class: "carte" }, [el("h4", { texte: b.titre }), el("p", { class: "attenue", texte: b.texte })])
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
            el("a", { class: "bouton bouton--or", href: url("pages/contact.html"), texte: "Poser une question" }),
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
        el("span", { class: "etiquette", texte: o.type }),
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
          o.aRenseigner && o.aRenseigner.length
            ? el("span", { class: "a-renseigner", texte: `À renseigner : ${o.aRenseigner.join(", ")}` })
            : null,
        ]),
      ])
    )
  );
}

/* ---------- 6. Sophie ---------- */

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
      el("p", { class: "etat__resume", texte: d.accroche }),
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
          el("span", { class: "chaine__maillon", texte: maillon }),
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
    rendreMiroir(),
    rendreChiffres(),
  ])
    .then(() => {
      // Les rayons de la médiathèque n'existaient pas au premier passage.
      if (typeof activerSommaire === "function") activerSommaire();
    })
    .catch((e) => console.error("Erreur de rendu :", e));
});

/* =========================================================
   La Médiathèque

   Trois rayons — Lire, Écouter, Pratiquer — rangés par geste et non
   par format ni par prix. Ranger par prix serait commercial ; ranger
   par geste dit ce qu'on vient y chercher.

   Le filtre « accès libre » se fait en CSS, par un attribut sur le
   conteneur : aucun élément n'est retiré du DOM, donc rien à
   reconstruire et l'état reste lisible pour un lecteur d'écran.
   ========================================================= */

async function rendreMediatheque() {
  const hotes = {
    intro: document.querySelector('[data-rendu="mediatheque-intro"]'),
    filtres: document.querySelector('[data-rendu="mediatheque-filtres"]'),
    rayons: document.querySelector('[data-rendu="mediatheque-rayons"]'),
    flux: document.querySelector('[data-rendu="mediatheque-flux"]'),
  };
  if (!hotes.rayons) return;

  const d = await donnees("mediatheque");

  if (hotes.intro) {
    hotes.intro.replaceChildren(
      el("p", { class: "chapo attenue", texte: d.intro.chapo }),
      el("p", { class: "attenue", texte: d.intro.note })
    );
  }

  /* Une carte de la médiathèque. Trois cas :
     - un fichier à télécharger  → lien direct, avec download
     - un lien interne           → carte cliquable
     - rien encore               → pastille « à renseigner » */
  const carte = (i) => {
    const cible = i.fichier ? url(i.fichier) : i.lien ? url(`pages/${i.lien}`) : null;

    const entete = [
      el("span", { class: "etiquette", texte: i.type }),
      cible
        ? el("h3", {}, [
            el("a", {
              href: cible,
              download: i.fichier ? "" : null,
              texte: i.titre,
            }),
          ])
        : el("h3", { texte: i.titre }),
      i.sousTitre ? el("p", { class: "media__sous-titre", texte: i.sousTitre }) : null,
      el("p", { class: "attenue", texte: i.description }),
    ];

    const pied = el("div", { class: "carte__pied" }, [
      el("p", { class: "media__ligne" }, [
        el("span", {
          class: `pastille-acces pastille-acces--${i.acces}`,
          texte: i.acces === "libre" ? "Accès libre" : "Payant",
        }),
        i.detail ? el("span", { class: "media__detail", texte: i.detail }) : null,
      ]),
      i.aRenseigner ? el("span", { class: "a-renseigner", texte: `À renseigner : ${i.aRenseigner}` }) : null,
      cible
        ? el("span", { class: "carte__suite", texte: i.fichier ? "Télécharger le PDF" : "Découvrir" })
        : null,
    ]);

    return el(
      "article",
      { class: `carte${cible ? " carte--lien" : ""}`, "data-acces": i.acces, id: i.id },
      [...entete, pied]
    );
  };

  /* Les rayons alternent dans l'échelle bleue, comme le reste du site. */
  const teintes = [
    ["var(--g2)", "var(--g3)"],
    ["var(--g3)", "var(--g4)"],
    ["var(--g4)", "var(--g2)"],
  ];

  hotes.rayons.replaceChildren(
    ...d.rayons.map((r, n) => {
      const items = d.items.filter((i) => i.rayon === r.id);
      const [de, vers] = teintes[n % teintes.length];
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
              el("span", { class: "surtitre", texte: `Rayon ${n + 1} sur ${d.rayons.length}` }),
              el("h2", { texte: r.titre }),
              el("p", { class: "chapo attenue", texte: r.chapo }),
            ]),
            el("div", { class: "grille grille--defilante" }, items.map(carte)),
          ]),
        ]
      );
    })
  );

  if (hotes.flux) {
    hotes.flux.replaceChildren(
      el("div", { class: "entete-section" }, [
        el("h2", { texte: d.flux.titre }),
        el("p", { class: "chapo attenue", texte: d.flux.chapo }),
      ]),
      el("div", { class: "grille" },
        d.flux.entrees.map((e) =>
          el("article", { class: "carte" }, [
            el("h3", { texte: e.titre }),
            el("p", { class: "attenue", texte: e.description }),
            el("div", { class: "carte__pied" }, [
              el("span", { class: "a-renseigner", texte: `À renseigner : ${e.aRenseigner}` }),
            ]),
          ])
        )
      )
    );
  }

  /* Le filtre. aria-pressed porte l'état : le bouton dit lui-même s'il
     est actif, sans qu'on ait à l'annoncer autrement. */
  if (hotes.filtres) {
    const compte = d.items.filter((i) => i.acces === "libre").length;
    const bouton = el("button", {
      class: "filtre",
      type: "button",
      "aria-pressed": "false",
      texte: `N'afficher que l'accès libre (${compte})`,
    });
    bouton.addEventListener("click", () => {
      const actif = bouton.getAttribute("aria-pressed") === "true";
      bouton.setAttribute("aria-pressed", String(!actif));
      document.querySelectorAll(".rayon").forEach((s) => {
        s.dataset.filtre = actif ? "" : "libre";
      });
    });
    hotes.filtres.replaceChildren(bouton);
  }
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
    el("div", { class: "entete-section entete-section--bande" }, [
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
    el("p", { class: "attenue miroir__note", texte: d.intro.note })
  );

  /* Le pas de la grille : la figure la plus haute, plus une marge.
     Les libellés passent de une à trois lignes selon la largeur de
     l'écran et la longueur des textes du JSON — c'est donc le contenu
     qui décide, pas une valeur écrite à l'avance.
     Borné en bas pour que la scène ne s'écrase pas, en haut pour
     qu'elle ne s'étire pas sur grand écran. */
  const ajusterPas = () => {
    const hauteurs = Object.values(figures).map((f) => f.n.offsetHeight);
    const pas = Math.min(84, Math.max(58, Math.max(...hauteurs) + 14));
    scene.style.setProperty("--pas", `${pas}px`);
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
