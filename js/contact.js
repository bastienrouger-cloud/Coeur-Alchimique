/* =========================================================
   Contact — formulaire à motifs, envoi par Formspree.

   - « Vous écrivez pour… » : trois motifs. Seul le bloc du motif
     choisi s'affiche (soin : formule, disponibilités, WhatsApp ;
     parcours : lequel). Les blocs masqués sont aussi désactivés,
     donc rien de ce qu'ils contiennent n'est envoyé.
   - Sans JavaScript, tout reste visible et le formulaire envoie
     quand même (redirection vers la page de Formspree).
   - Même formulaire Formspree que le livre d'or : c'est l'objet du
     mail (_subject) qui dit d'où vient le message et pour quoi.
   - L'adresse peut pré-choisir le motif : contact.html?motif=soin,
     ?motif=parcours&ouvrage=<id>, ?motif=autre.

   Enveloppé dans une fonction : rendu.js déclare déjà `el` et
   `donnees` en global, une seconde déclaration casserait tout.
   ========================================================= */
(() => {
  const form = document.getElementById("form-contact");
  const statut = document.getElementById("contact-statut");
  if (!form || !statut) return;

  const OBJETS = {
    soin: "Contact — Soin",
    parcours: "Contact — Parcours ou livre",
    autre: "Contact — Autre demande",
  };
  const blocs = [...form.querySelectorAll("[data-pour]")];
  const motifs = [...form.querySelectorAll('input[name="motif"]')];
  const sujet = form.querySelector('input[name="_subject"]');
  const params = new URLSearchParams(window.location.search);

  /* ---------- Motif : n'afficher que le bloc utile ---------- */

  function montrer(motif) {
    for (const bloc of blocs) {
      const actif = bloc.dataset.pour === motif;
      bloc.hidden = !actif;
      bloc.disabled = !actif;
    }
    sujet.value = OBJETS[motif] || "Contact — nouveau message";
  }

  motifs.forEach((r) => r.addEventListener("change", () => montrer(r.dataset.motif)));

  const motifDemande = motifs.find((r) => r.dataset.motif === params.get("motif"));
  if (motifDemande) motifDemande.checked = true;
  montrer(motifDemande ? motifDemande.dataset.motif : null);

  /* ---------- Listes tirées des JSON (une seule source) ---------- */

  async function remplirFormules() {
    const hote = form.querySelector('[data-rendu="contact-formules"]');
    if (!hote) return;
    const soins = await CA.donnees("soins");
    const options = soins.options.map((o) => {
      const valeur = `${o.canal} — ${o.prix} €`;
      return CA.el("label", { class: "champ--case" }, [
        CA.el("input", { type: "radio", name: "formule", value: valeur }),
        CA.el("span", {}, [
          document.createTextNode(`${o.canal} — `),
          CA.el("strong", { texte: `${o.prix}\u00a0€` }),
          CA.el("span", { class: "attenue", texte: ` · ${o.duree}` }),
        ]),
      ]);
    });
    hote.prepend(...options); // « Je ne sais pas encore » reste en dernier
  }

  async function remplirOuvrages() {
    const select = form.querySelector('[data-rendu="contact-ouvrages"]');
    if (!select) return;
    const [elearnings, livres] = await Promise.all([CA.donnees("elearnings"), CA.donnees("livres")]);

    const groupe = (titre, items) =>
      CA.el("optgroup", { label: titre }, items.map((i) => CA.el("option", { value: i.nom, "data-id": i.id, texte: i.nom })));

    // Deux carnets portent le même titre : une seule entrée suffit pour poser une question.
    const vus = new Set();
    const ouvrages = livres.ouvrages
      .filter((o) => !vus.has(o.titre) && vus.add(o.titre))
      .map((o) => ({ id: o.id, nom: o.titre }));

    select.append(
      groupe("Parcours en ligne", elearnings.programmes.map((p) => ({ id: p.id, nom: p.nom }))),
      groupe("Livres", ouvrages)
    );

    const id = params.get("ouvrage");
    if (id) {
      const option = select.querySelector(`option[data-id="${CSS.escape(id)}"]`);
      if (option) option.selected = true;
    }
  }

  Promise.all([remplirFormules(), remplirOuvrages()]).catch((e) =>
    console.error("Contact : listes non chargées.", e)
  );

  /* ---------- Envoi ---------- */

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

    bouton.disabled = true;
    bouton.textContent = "Envoi en cours…";
    form.setAttribute("aria-busy", "true");
    afficher("", "neutre");

    let site = {};
    try { site = await CA.donnees("site"); } catch (_) { /* messages valables sans */ }

    try {
      const reponse = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!reponse.ok) throw new Error(`Formspree a répondu ${reponse.status}`);

      const prenom = form.prenom.value.trim();
      form.reset();
      montrer(null);
      afficher(
        `Merci${prenom ? " " + prenom : ""}, votre message est bien parti. ` + (site.delaiReponse || ""),
        "succes"
      );
    } catch (erreur) {
      console.error("Contact : envoi échoué.", erreur);
      afficher(
        "Votre message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez" +
          (site.email ? `, ou écrivez directement à ${site.email}.` : "."),
        "erreur"
      );
    } finally {
      bouton.disabled = false;
      bouton.textContent = libelleBouton;
      form.removeAttribute("aria-busy");
    }
  });
})();
