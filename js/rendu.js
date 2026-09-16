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
    ateliers: document.querySelector('[data-rendu="ateliers"]'),
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

  if (cibles.ateliers) {
    cibles.ateliers.replaceChildren(
      el("h3", { texte: d.ateliers.titre }),
      el("p", { class: "attenue", texte: d.ateliers.texte }),
      el("p", {}, [el("span", { class: "a-renseigner", texte: d.ateliers.statut })])
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
      el("article", { class: "carte", id: o.id }, [
        el("div", { class: "carte__media" }, [
          el("img", { src: url(o.image), alt: o.alt, loading: "lazy", width: "640", height: "400" }),
        ]),
        el("span", { class: "etiquette", texte: o.type }),
        el("h3", { texte: o.titre }),
        o.sousTitre ? el("p", { class: "attenue", texte: o.sousTitre }) : null,
        el("p", { class: "attenue", texte: o.description }),
        el("div", { class: "carte__pied" }, [
          o.prix ? el("p", { class: "prix", texte: prix(o.prix) }) : null,
          o.lien
            ? el("a", {
                class: "bouton bouton--contour",
                href: o.lien,
                target: "_blank",
                rel: "noopener",
                texte: `Voir chez ${o.editeur}`,
              })
            : el("span", { class: "a-renseigner", texte: `À renseigner : ${o.aRenseigner.join(", ")}` }),
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
  ]).catch((e) => console.error("Erreur de rendu :", e));
});
