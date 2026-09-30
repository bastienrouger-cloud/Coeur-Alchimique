/* =========================================================
   Livre d'or — affichage des messages et envoi du formulaire.

   Les messages publiés vivent dans data/livre-dor.json
   ({ prenom, date, message }, date au format AAAA-MM-JJ).
   Le formulaire envoie vers Formspree en fetch : le visiteur
   reste sur la page. Rien n'est publié automatiquement.

   Tout ce qui vient du JSON ou du visiteur passe par
   textContent — jamais par insertion de HTML.
   ========================================================= */

/* Enveloppé dans une fonction : rendu.js, chargé sur la même page,
   déclare déjà `el` et `donnees` au niveau global — une seconde
   déclaration ferait échouer les deux scripts. */
(() => {
const { el, donnees } = CA;

/* ---------- Affichage des messages ---------- */

function formaterDate(iso) {
  // Midi, pour qu'un décalage de fuseau ne change jamais le jour affiché.
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

async function rendreLivreDor() {
  const hote = document.querySelector('[data-rendu="livre-dor"]');
  if (!hote) return;

  let messages = [];
  try {
    const d = await donnees("livre-dor");
    messages = Array.isArray(d.messages) ? d.messages : [];
  } catch (e) {
    console.error("Livre d'or : messages non chargés.", e);
    return; // on laisse le texte « aucun message » du HTML
  }

  const valides = messages.filter(
    (m) => m && typeof m.prenom === "string" && m.prenom.trim() && typeof m.message === "string" && m.message.trim()
  );
  if (!valides.length) return;

  // Du plus récent au plus ancien. Le tri est stable : à date égale,
  // l'ordre du fichier est conservé (le plus haut dans le JSON reste en haut).
  valides.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const liste = el("div", { class: "temoignages" });
  for (const m of valides) {
    const dateLisible = formaterDate(m.date);
    liste.append(
      el("article", { class: "temoignage" }, [
        el("blockquote", { class: "temoignage__texte" }, [el("p", { texte: m.message.trim() })]),
        el("p", { class: "temoignage__signature" }, [
          el("cite", { texte: m.prenom.trim() }),
          dateLisible ? el("span", { class: "temoignage__sep", texte: " · ", "aria-hidden": "true" }) : null,
          dateLisible ? el("time", { datetime: m.date, texte: dateLisible }) : null,
        ]),
      ])
    );
  }
  hote.replaceChildren(liste);
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

rendreLivreDor();
brancherFormulaire();
})();
