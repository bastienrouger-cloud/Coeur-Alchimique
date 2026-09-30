/* =========================================================
   Livre d'or — messages publiés + formulaire d'envoi.

   Chargé sur deux pages :
   - Accompagnement : le mur des messages et le formulaire ;
   - Accueil : une sélection courte.

   Les messages publiés vivent dans data/livre-dor.json :
   { prenom, date (AAAA-MM-JJ), message, accueil?, extrait? }.
   `accueil: true` = le message apparaît sur la page d'accueil ;
   `extrait` = version courte pour l'accueil (sinon le message entier).

   Tant qu'il y a moins de SEUIL_AFFICHAGE messages, le mur et la
   sélection restent masqués : un livre d'or de un ou deux mots
   dessert plus qu'il ne sert. Le formulaire, lui, est toujours là.

   Tout ce qui vient du JSON ou du visiteur passe par textContent —
   jamais par insertion de HTML.
   ========================================================= */

/* Enveloppé dans une fonction : rendu.js, chargé sur la même page,
   déclare déjà `el` et `donnees` au niveau global — une seconde
   déclaration ferait échouer les deux scripts. */
(() => {
const { el, donnees } = CA;

const SEUIL_AFFICHAGE = 3;
const MAX_ACCUEIL = 3;
const LONGUEUR_REPLIEE = 320; // au-delà, le message est replié avec « Lire la suite »

/* ---------- Données ---------- */

function formaterDate(iso) {
  // Midi, pour qu'un décalage de fuseau ne change jamais le jour affiché.
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

async function chargerMessages() {
  try {
    const d = await donnees("livre-dor");
    const messages = Array.isArray(d.messages) ? d.messages : [];
    const valides = messages.filter(
      (m) => m && typeof m.prenom === "string" && m.prenom.trim() && typeof m.message === "string" && m.message.trim()
    );
    // Du plus récent au plus ancien. Le tri est stable : à date égale,
    // l'ordre du fichier est conservé.
    return valides.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  } catch (e) {
    console.error("Livre d'or : messages non chargés.", e);
    return [];
  }
}

/* ---------- Le mur (page Accompagnement) ---------- */

let compteur = 0;

function carteMessage(m) {
  const texte = m.message.trim();
  const dateLisible = formaterDate(m.date);
  const long = texte.length > LONGUEUR_REPLIEE;
  const id = `temoignage-${++compteur}`;

  const paragraphe = el("p", { id, texte });
  const carte = el("article", { class: `temoignage${long ? " temoignage--replie" : ""}` }, [
    el("blockquote", { class: "temoignage__texte" }, [paragraphe]),
  ]);

  if (long) {
    const bouton = el("button", {
      type: "button",
      class: "temoignage__suite",
      "aria-expanded": "false",
      "aria-controls": id,
      texte: "Lire la suite",
    });
    bouton.addEventListener("click", () => {
      const ouvert = carte.classList.toggle("temoignage--replie") === false;
      bouton.setAttribute("aria-expanded", String(ouvert));
      bouton.textContent = ouvert ? "Réduire" : "Lire la suite";
    });
    carte.append(bouton);
  }

  carte.append(
    el("p", { class: "temoignage__signature" }, [
      el("cite", { texte: m.prenom.trim() }),
      dateLisible ? el("span", { texte: " · ", "aria-hidden": "true" }) : null,
      dateLisible ? el("time", { datetime: m.date, texte: dateLisible }) : null,
    ])
  );
  return carte;
}

function rendreMur(messages) {
  const hote = document.querySelector('[data-rendu="livre-dor"]');
  const bloc = document.querySelector("[data-livre-dor-mur]");
  if (!hote || !bloc || messages.length < SEUIL_AFFICHAGE) return;

  hote.replaceChildren(el("div", { class: "temoignages" }, messages.map(carteMessage)));
  bloc.hidden = false;
}

/* ---------- La sélection (page d'accueil) ---------- */

function rendreAccueil(messages) {
  const hote = document.querySelector('[data-rendu="livre-dor-accueil"]');
  const bloc = document.querySelector("[data-livre-dor-accueil]");
  if (!hote || !bloc || messages.length < SEUIL_AFFICHAGE) return;

  const choisis = messages.filter((m) => m.accueil === true).slice(0, MAX_ACCUEIL);
  if (!choisis.length) return;

  hote.replaceChildren(
    el(
      "div",
      { class: "avis-accueil" },
      choisis.map((m) =>
        el("figure", { class: "avis-accueil__item" }, [
          el("blockquote", {}, [el("p", { texte: (m.extrait || m.message).trim() })]),
          el("figcaption", { texte: m.prenom.trim() }),
        ])
      )
    )
  );
  bloc.hidden = false;
}

/* ---------- Envoi du formulaire ---------- */

function brancherFormulaire() {
  const form = document.getElementById("form-livre-dor");
  const statut = document.getElementById("livre-dor-statut");
  if (!form || !statut) return;

  const bouton = form.querySelector('button[type="submit"]');
  const libelleBouton = bouton.textContent;

  const afficher = (texte, type) => {
    statut.textContent = texte;
    statut.className = `statut-formulaire statut-formulaire--${type}`;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (bouton.disabled) return; // double clic, touche Entrée répétée…

    if (!form.reportValidity()) return;

    // Tant que l'identifiant Formspree n'est pas posé dans action="…",
    // on le dit clairement plutôt que d'envoyer dans le vide.
    if (/VOTRE_ID/.test(form.action)) {
      afficher("Le formulaire n'est pas encore branché : l'identifiant Formspree manque.", "erreur");
      return;
    }

    bouton.disabled = true;
    bouton.textContent = "Envoi en cours…";
    form.setAttribute("aria-busy", "true");
    afficher("", "neutre");

    try {
      const reponse = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!reponse.ok) throw new Error(`Formspree a répondu ${reponse.status}`);

      form.reset();
      afficher("Merci, votre message sera publié après relecture.", "succes");
    } catch (erreur) {
      console.error("Livre d'or : envoi échoué.", erreur);
      let courriel = "";
      try {
        courriel = (await donnees("site")).email || "";
      } catch (_) { /* le message d'erreur reste valable sans l'adresse */ }
      afficher(
        "Votre message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez" +
          (courriel ? `, ou écrivez directement à ${courriel}.` : "."),
        "erreur"
      );
    } finally {
      bouton.disabled = false;
      bouton.textContent = libelleBouton;
      form.removeAttribute("aria-busy");
    }
  });
}

/* ---------- Démarrage ---------- */

brancherFormulaire();
chargerMessages().then((messages) => {
  rendreMur(messages);
  rendreAccueil(messages);
});
})();
