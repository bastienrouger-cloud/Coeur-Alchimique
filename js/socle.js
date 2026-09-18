/* =========================================================
   Socle — chargement des partials, données globales, menu.
   Chargé sur toutes les pages.
   ========================================================= */

const CA = (() => {
  const cache = new Map();

  /* La racine du site est déduite de l'emplacement de ce script,
     qui se trouve toujours dans <racine>/js/socle.js.
     Le site fonctionne donc aussi bien à la racine d'un domaine
     (coeuralchimique.fr) que dans un sous-dossier
     (github.io/nom-du-depot/), sans rien changer. */
  const RACINE = (() => {
    const script =
      document.currentScript ||
      [...document.scripts].find((s) => /(^|\/)socle\.js(\?|$)/.test(s.src));
    return new URL("../", script.src).href;
  })();

  /** Transforme un chemin de type /data/site.json en URL absolue valide. */
  function url(chemin) {
    return RACINE + String(chemin).replace(/^\/+/, "");
  }

  /** Charge un JSON une seule fois par session, puis le sert depuis le cache. */
  async function donnees(nom) {
    if (!cache.has(nom)) {
      cache.set(
        nom,
        fetch(url(`data/${nom}.json`)).then((r) => {
          if (!r.ok) throw new Error(`Données introuvables : ${nom}.json`);
          return r.json();
        })
      );
    }
    return cache.get(nom);
  }

  /** Raccourci de création d'élément. */
  function el(balise, attributs = {}, enfants = []) {
    const n = document.createElement(balise);
    for (const [cle, valeur] of Object.entries(attributs)) {
      if (valeur === null || valeur === undefined || valeur === false) continue;
      if (cle === "class") n.className = valeur;
      else if (cle === "html") n.innerHTML = valeur;
      else if (cle === "texte") n.textContent = valeur;
      // onclick: () => … doit devenir un écouteur. Passé à
      // setAttribute, une fonction est convertie en texte : le
      // navigateur en refait une, hors de sa fermeture, et toutes
      // les variables qu'elle utilisait ont disparu.
      else if (cle.startsWith("on") && typeof valeur === "function")
        n.addEventListener(cle.slice(2), valeur);
      else n.setAttribute(cle, valeur);
    }
    for (const enfant of [].concat(enfants)) {
      if (enfant) n.append(enfant);
    }
    return n;
  }

  /** Prix formaté à la française.
      Les centimes ne s'affichent que s'il y en a : 12 € et 13,50 €.
      Avec maximumFractionDigits à 0, 13,50 devenait « 14 € ». */
  function prix(valeur) {
    if (valeur === null || valeur === undefined) return "Prix à venir";
    // minimumFractionDigits doit valoir 2 dès qu'il y a des centimes,
    // sinon 13,50 s'affiche « 13,5 € ». On décide par valeur.
    const centimes = Number.isInteger(valeur) ? 0 : 2;
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: centimes,
      maximumFractionDigits: centimes,
    }).format(valeur);
  }

  return { donnees, el, prix, url, RACINE };
})();

/* ---------- Injection des partials ---------- */

/* Fragments réutilisables. La clé est la valeur de data-partial dans la page. */
const PARTIALS = {
  entete: "partials/header.html",
  pied: "partials/footer.html",
  sceau: "partials/sceau.svg",
  miroir: "partials/miroir.svg",
  coeurs: "partials/coeurs.svg",
};

async function injecterPartial(nom) {
  const hotes = document.querySelectorAll(`[data-partial="${nom}"]`);
  if (!hotes.length) return;
  try {
    const reponse = await fetch(CA.url(PARTIALS[nom]));
    const contenu = await reponse.text();
    hotes.forEach((h) => (h.innerHTML = contenu));
  } catch (e) {
    console.error(`Fragment non chargé (${nom}). Servez le site via un serveur local.`, e);
  }
}

/* ---------- Icônes réseaux ---------- */

const ICONES = {
  youtube:
    '<path d="M23 12s0-3.5-.45-5.17a2.9 2.9 0 0 0-2.04-2.05C18.84 4.33 12 4.33 12 4.33s-6.84 0-8.51.45A2.9 2.9 0 0 0 1.45 6.83C1 8.5 1 12 1 12s0 3.5.45 5.17a2.9 2.9 0 0 0 2.04 2.05c1.67.45 8.51.45 8.51.45s6.84 0 8.51-.45a2.9 2.9 0 0 0 2.04-2.05C23 15.5 23 12 23 12z"/><polygon points="9.75,15.02 15.5,12 9.75,8.98" fill="#453413"/>',
  facebook:
    '<path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z"/>',
  instagram:
    '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.4" cy="6.6" r="1.25"/>',
};

/* ---------- Remplissage de l'en-tête et du pied ---------- */

async function garnirSocle() {
  const site = await CA.donnees("site");

  // Valeurs simples marquées data-site="clé"
  document.querySelectorAll("[data-site]").forEach((n) => {
    const cle = n.dataset.site;
    if (cle === "mailtoEmail") n.setAttribute("href", `mailto:${site.email}`);
    else if (site[cle] !== undefined) n.textContent = site[cle];
  });

  // Le lien de la marque pointe vers la racine, quelle qu'elle soit.
  document.querySelectorAll(".marque").forEach((n) => n.setAttribute("href", CA.RACINE));

  // On compare les noms de fichier : insensible à la racine d'hébergement.
  const pageActuelle = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

  // Une entrée peut couvrir plusieurs pages : « Médiathèque » reste
  // allumée quand on est sur Livres ou E-learnings, qui sont ses rayons.
  // Sur la page elle-même c'est "page" ; sur une page fille, "true" —
  // « l'élément courant du groupe », ce qui est exactement le cas.
  const lien = (entree) => {
    const nomFichier = (h) => h.split("/").pop().toLowerCase();
    const cible = nomFichier(entree.href);
    const filles = (entree.aussi || []).map(nomFichier);
    return CA.el("li", {}, [
      CA.el("a", {
        href: CA.url(entree.href),
        texte: entree.label,
        "aria-current":
          cible === pageActuelle ? "page" : filles.includes(pageActuelle) ? "true" : null,
      }),
    ]);
  };

  document.querySelectorAll('[data-liste="nav"]').forEach((hote) => {
    hote.replaceChildren(...site.nav.map(lien));
  });

  document.querySelectorAll('[data-liste="navSecondaire"]').forEach((hote) => {
    hote.replaceChildren(...site.navSecondaire.map(lien));
  });

  document.querySelectorAll('[data-liste="reseaux"]').forEach((hote) => {
    hote.replaceChildren(
      ...site.reseaux.map((r) =>
        CA.el(
          "a",
          {
            href: r.href,
            "aria-label": r.label,
            title: r.aRenseigner ? `${r.label} — adresse à renseigner` : r.label,
            rel: "noopener",
            target: r.href === "#" ? null : "_blank",
          },
          [
            CA.el("span", { class: "sr-only", texte: r.label }),
            (() => {
              const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
              svg.setAttribute("viewBox", "0 0 24 24");
              svg.setAttribute("fill", "currentColor");
              svg.setAttribute("aria-hidden", "true");
              svg.innerHTML = ICONES[r.icone] || "";
              return svg;
            })(),
          ]
        )
      )
    );
  });

  // Le cadre légal, réutilisé à plusieurs endroits
  document.querySelectorAll("[data-cadre]").forEach((n) => {
    n.replaceChildren(
      CA.el("h3", { texte: site.cadre.titre }),
      CA.el("p", { html: site.cadre.texte })
    );
  });

  // Version courte du cadre, pour le pied de page. Même source, donc
  // impossible que les deux se contredisent un jour.
  document.querySelectorAll("[data-cadre-court]").forEach((n) => {
    n.append(CA.el("p", { html: site.cadre.court }));
  });

  // L'année du copyright se calcule : une année en dur devient fausse
  // le 1er janvier et personne ne s'en aperçoit.
  document
    .querySelectorAll("[data-annee]")
    .forEach((n) => (n.textContent = String(new Date().getFullYear())));
}

/* ---------- Hauteur de l'en-tête ----------

   Le sommaire de page se colle sous l'en-tête, dont la hauteur change
   avec la largeur de l'écran (la baseline disparaît sous 560 px). On
   la publie dans --h-entete plutôt que de l'écrire en dur : sinon on
   obtient un trou ou un recouvrement selon la taille de la fenêtre. */

function suivreHauteurEntete() {
  const entete = document.querySelector(".entete");
  if (!entete) return;
  const publier = () =>
    document.documentElement.style.setProperty("--h-entete", `${entete.offsetHeight}px`);
  publier();
  if (window.ResizeObserver) new ResizeObserver(publier).observe(entete);
  else window.addEventListener("resize", publier);
}

/* ---------- Sommaire de page ----------

   Construit depuis le DOM : toute <section id data-sommaire="Libellé">
   devient une entrée. Rien à tenir à jour en double.

   Le surlignage se fait à l'IntersectionObserver plutôt qu'au scroll :
   le navigateur nous prévient quand une section entre ou sort, au lieu
   qu'on recalcule des positions à chaque pixel parcouru.

   rootMargin découpe une bande de lecture : on ignore le haut de
   l'écran (masqué par les deux barres) et on ne garde que le tiers
   supérieur. La section « courante » est celle qu'on est en train de
   lire, pas celle qui pointe le nez en bas de l'écran. */

function activerSommaire() {
  const hote = document.querySelector("[data-sommaire-hote]");
  if (!hote) return;

  const sections = [...document.querySelectorAll("section[id][data-sommaire]")];
  if (sections.length < 2) return;

  // Rejouable : sur les pages dont les sections sont rendues en JS, on
  // rappelle activerSommaire() une fois le rendu fini. Sans ce vidage,
  // les entrées s'ajouteraient une deuxième fois.
  hote.replaceChildren();

  const liens = new Map();
  const liste = CA.el(
    "ol",
    {},
    sections.map((s) => {
      const a = CA.el("a", { href: `#${s.id}`, texte: s.dataset.sommaire });
      liens.set(s.id, a);
      return CA.el("li", {}, [a]);
    })
  );

  hote.append(CA.el("div", { class: "contenu" }, [liste]));
  hote.setAttribute("aria-label", "Sections de la page");

  const marquer = (id) => {
    liens.forEach((a, cle) => {
      if (cle === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    // On ramène l'entrée active dans la vue quand la barre déborde.
    const actif = liens.get(id);
    if (actif && hote.querySelector("ol").scrollWidth > hote.clientWidth) {
      actif.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const vues = new Set();
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) vues.add(e.target.id);
        else vues.delete(e.target.id);
      }
      // Plusieurs sections peuvent être dans la bande : on garde la
      // première dans l'ordre du document, c'est celle qu'on lit.
      const courante = sections.find((s) => vues.has(s.id));
      if (courante) marquer(courante.id);
    },
    { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
  );
  sections.forEach((s) => observateur.observe(s));
}

/* ---------- Menu mobile ---------- */

function activerMenu() {
  const bouton = document.querySelector(".bascule-menu");
  const nav = document.querySelector(".nav-principale");
  if (!bouton || !nav) return;

  bouton.addEventListener("click", () => {
    const ouvert = bouton.getAttribute("aria-expanded") === "true";
    bouton.setAttribute("aria-expanded", String(!ouvert));
    nav.dataset.ouvert = String(!ouvert);
    bouton.querySelector(".sr-only").textContent = ouvert ? "Ouvrir le menu" : "Fermer le menu";
  });

  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A" && window.innerWidth <= 860) {
      bouton.setAttribute("aria-expanded", "false");
      nav.dataset.ouvert = "false";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.dataset.ouvert === "true") {
      bouton.setAttribute("aria-expanded", "false");
      nav.dataset.ouvert = "false";
      bouton.focus();
    }
  });
}

/* ---------- Cartes pliables ----------

   Un <details> ne s'ouvre pas en CSS : `open` est un attribut, pas une
   propriété. Pour qu'une carte soit repliée sur mobile et ouverte sur
   écran large, il faut donc poser et retirer l'attribut, et suivre les
   changements de largeur — sinon une rotation de téléphone laisse les
   cartes dans l'état de l'orientation précédente.

   Le HTML les écrit ouvertes : sans JavaScript, tout se lit. */

const SEUIL_PLIAGE = "(max-width: 44.99rem)";

function activerCartesPliables() {
  const cartes = document.querySelectorAll(".carte--pliable");
  if (!cartes.length) return;

  const etroit = window.matchMedia(SEUIL_PLIAGE);

  const appliquer = () => {
    cartes.forEach((carte) => {
      // Sur écran large on rouvre tout ; en repassant en étroit on
      // replie, sauf celle que le visiteur venait d'ouvrir lui-même.
      if (!etroit.matches) carte.open = true;
      else carte.open = carte.dataset.ouvertParLeVisiteur === "true";
    });
  };

  cartes.forEach((carte) => {
    carte.addEventListener("toggle", () => {
      if (etroit.matches) carte.dataset.ouvertParLeVisiteur = String(carte.open);
    });
  });

  etroit.addEventListener("change", appliquer);
  appliquer();
}

/* ---------- Démarrage ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all(Object.keys(PARTIALS).map(injecterPartial));
  await garnirSocle();
  activerMenu();
  activerCartesPliables();
  suivreHauteurEntete();
  activerSommaire();
  document.dispatchEvent(new CustomEvent("ca:socle-pret"));
});
