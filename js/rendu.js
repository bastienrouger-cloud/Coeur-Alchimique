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

  const coeur = el("div", { class: "coeur-support" });
  coeur.innerHTML = `
    <svg class="coeur-svg" viewBox="0 0 100 100" role="img" aria-label="Le cœur, au centre de la bibliothèque intérieure">
      <defs>
        <linearGradient id="degradeCoeur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2f6bb5"/>
          <stop offset="100%" stop-color="#16305a"/>
        </linearGradient>
      </defs>
      <path d="M50 82C31 68 16 56.5 16 42.5A16.5 16.5 0 0 1 50 34a16.5 16.5 0 0 1 34 8.5C84 56.5 69 68 50 82z"
            fill="url(#degradeCoeur)" stroke="rgba(246,241,230,.35)" stroke-width="1.2"/>
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
    const stops = coeur.querySelectorAll("#degradeCoeur stop");
    const couples = {
      blesse: ["#2f6bb5", "#16305a"],
      alchimique: ["#7f8ba6", "#9c7c3a"],
      createur: ["#e3c879", "#c9a227"],
    }[etat];
    if (stops.length === 2 && couples) {
      stops[0].setAttribute("stop-color", couples[0]);
      stops[1].setAttribute("stop-color", couples[1]);
    }
  }
}

/* ---------- 2. Les trois états du cœur ---------- */

async function rendreEtats() {
  const hoteOnglets = document.querySelector('[data-rendu="etats-onglets"]');
  const hotePanneaux = document.querySelector('[data-rendu="etats-panneaux"]');
  if (!hoteOnglets || !hotePanneaux) return;

  const d = await donnees("etats-coeur");
  const etagere = document.querySelector('[data-rendu="etagere"]');

  const onglets = d.etats.map((etat, i) =>
    el("button", {
      class: "onglet-etat",
      type: "button",
      role: "tab",
      id: `onglet-${etat.id}`,
      "aria-controls": `panneau-${etat.id}`,
      "aria-selected": String(i === 0),
      tabindex: i === 0 ? "0" : "-1",
      texte: etat.nom,
    })
  );

  const panneaux = d.etats.map((etat, i) =>
    el(
      "div",
      {
        class: "etat-panneau",
        role: "tabpanel",
        id: `panneau-${etat.id}`,
        "aria-labelledby": `onglet-${etat.id}`,
        hidden: i === 0 ? null : "",
      },
      [
        el("div", {}, [
          el("span", { class: "surtitre", texte: etat.sousTitre }),
          el("h3", { texte: etat.nom }),
          el("p", { class: "etat__resume", texte: etat.resume }),
          el("p", { class: "attenue", texte: etat.texte }),
        ]),
        el("ul", { class: "liste-puces" }, etat.signes.map((s) => el("li", { texte: s }))),
      ]
    )
  );

  hoteOnglets.replaceChildren(...onglets);
  hotePanneaux.replaceChildren(...panneaux);

  function choisir(index) {
    onglets.forEach((o, i) => {
      o.setAttribute("aria-selected", String(i === index));
      o.tabIndex = i === index ? 0 : -1;
    });
    panneaux.forEach((p, i) => (i === index ? p.removeAttribute("hidden") : p.setAttribute("hidden", "")));
    if (etagere) peindreEtagere(etagere, d.etats[index].id);
  }

  onglets.forEach((onglet, i) => {
    onglet.addEventListener("click", () => choisir(i));
    onglet.addEventListener("keydown", (e) => {
      const suivant = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!suivant) return;
      e.preventDefault();
      const cible = (i + suivant + onglets.length) % onglets.length;
      choisir(cible);
      onglets[cible].focus();
    });
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

document.addEventListener("ca:socle-pret", () => {
  Promise.all([
    rendreBibliotheque(),
    rendreEtats(),
    rendreSoins(),
    rendreElearnings(),
    rendreLivres(),
    rendreSophie(),
    rendreMediatheque(),
    rendreIceberg(),
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
   L'iceberg

   La métaphore de Sophie : la partie invisible est de loin la plus
   grosse. Deux états — avant, après — et le même schéma qui bascule.

   Le dessin ne bouge pas : ce sont les étiquettes qui changent de
   côté. C'est le propos exact de Sophie, qui parle d'une « remise à
   l'endroit » et non d'une transformation de l'iceberg lui-même.

   Même dispositif que les trois états du cœur : role="tablist",
   navigation aux flèches, panneaux liés par aria-controls. Un
   visiteur au clavier a le même accès qu'à la souris.
   ========================================================= */

async function rendreIceberg() {
  const hote = document.querySelector('[data-rendu="iceberg"]');
  if (!hote) return;

  const d = await donnees("iceberg");
  const onglets = el("div", { class: "iceberg__onglets", role: "tablist", "aria-label": "Avant et après le travail" });
  const zone = el("div", { class: "iceberg__zone" });
  const etiquettes = el("div", { class: "iceberg__etiquettes" });
  const legende = el("div", { class: "iceberg__legende" });

  const bloc = (e, cote) =>
    el("div", { class: `iceberg__cote iceberg__cote--${cote}` },
      [
        el("p", { class: "iceberg__eau", texte: cote === "visible" ? "Le visible" : "L'invisible" }),
        ...e[cote].map((x) =>
          el("div", { class: "iceberg__marqueur" }, [
            el("strong", { texte: x.nom }),
            el("span", { texte: x.detail }),
          ])
        ),
      ]);

  const montrer = (n) => {
    const e = d.etats[n];
    [...onglets.children].forEach((b, i) => {
      b.setAttribute("aria-selected", String(i === n));
      b.tabIndex = i === n ? 0 : -1;
    });
    etiquettes.replaceChildren(bloc(e, "visible"), bloc(e, "invisible"));
    legende.replaceChildren(
      el("h3", { texte: e.titre }),
      el("p", { class: "attenue", texte: e.texte })
    );
    zone.dataset.etat = e.id;
  };

  d.etats.forEach((e, i) => {
    const b = el("button", {
      class: "iceberg__onglet", type: "button", role: "tab",
      id: `iceberg-onglet-${e.id}`, "aria-selected": "false", texte: e.bouton,
    });
    b.addEventListener("click", () => montrer(i));
    b.addEventListener("keydown", (ev) => {
      const pas = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
      if (!pas) return;
      ev.preventDefault();
      const suivant = (i + pas + d.etats.length) % d.etats.length;
      montrer(suivant);
      onglets.children[suivant].focus();
    });
    onglets.append(b);
  });

  zone.append(el("div", { class: "iceberg__svg", "data-partial": "iceberg" }), etiquettes);
  hote.replaceChildren(
    el("div", { class: "entete-section" }, [
      el("span", { class: "surtitre", texte: d.intro.surtitre }),
      el("h2", { texte: d.intro.titre }),
      el("p", { class: "chapo attenue", texte: d.intro.chapo }),
    ]),
    onglets,
    el("div", { class: "iceberg" }, [zone, legende]),
    el("p", { class: "attenue iceberg__note", texte: d.intro.note })
  );

  montrer(0);
  // Le fragment SVG est injecté après coup : l'hôte n'existait pas
  // quand socle.js a fait sa passe.
  if (typeof injecterPartial === "function") await injecterPartial("iceberg");
}
