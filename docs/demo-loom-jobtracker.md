# JobTracker — Script Loom A→Z + pitch

Durée cible : **8–10 minutes**  
Audience : early adopters / portfolio (ton FR naturel)  
URL de base : `http://localhost:3000` (ou URL de staging)

---

## 1. Pitch d’ouverture (~30–40 s)

### Version early adopter / portfolio (à lire)

> Chercher un poste PO ou PM, c’est cinquante onglets ouverts, des CSV partout, et des lettres de motivation génériques.  
> JobTracker centralise tes offres — Welcome to the Jungle, CSV, extension Chrome — score le fit avec ton CV, et génère des cover letters vraiment personnalisées.  
> En quelques minutes, je te montre le parcours complet : import CV, alerte, offres, analyse, lettre.

### Variante investisseur (swap du hook, ~20 s)

> Le marché du job search pour les profils produit est saturé d’outils génériques. JobTracker est un CRM de candidature vertical PO/PM : ingestion d’offres, matching IA sur le CV, et génération de cover letters — un workflow bout-en-bout, pas un simple board Kanban.  
> Voici la démo produit.

---

## 2. Checklist pré-enregistrement

Fais tout ça **avant** d’appuyer sur Record.

- [ ] App démarrée (`npm run dev` ou staging)
- [ ] Compte **admin / admin** prêt *ou* compte démo déjà onboardé avec CV
- [ ] `OPENAI_API_KEY` configurée (sinon analyse CV / cover letter échouent)
- [ ] PDF CV court prêt sur le bureau (1–2 pages)
- [ ] Fichier CSV d’import prêt *ou* template téléchargé depuis `/imports`
- [ ] 2–3 offres déjà en base **ou** CSV prêt à importer en live
- [ ] Navigateur en fenêtre propre (pas d’onglets perso visibles)
- [ ] Zoom navigateur ~100–110 % pour la lisibilité Loom
- [ ] Ne pas ouvrir **Sources** ni **Manage connectors** (page Coming soon)
- [ ] Labels mixtes FR/EN à l’écran : les dire tels quels, ne pas “franciser” Dashboard / Jobs / Settings

---

## 3. Script scène par scène

Actions souris entre crochets. Répliques en italique.

### Scène 0 — Pitch (0:00–0:30)

**Écran :** `/login`

- [ ] Cadre l’écran login JobTracker
- *Lire le pitch (version early adopter)*

---

### Scène 1 — Connexion + CV (0:30–1:30) — `/login`

**Option A — rapide (recommandée si compte déjà prêt)**  
- [ ] Cliquer le chip démo **admin / admin** (si présent) ou se connecter
- [ ] Si CV déjà importé : passer à la scène 2 ou directement Jobs

**Option B — parcours complet onboarding**  
- [ ] **Créer un compte** → remplir Prénom, Nom, Email, Mot de passe → **S'inscrire**
- [ ] Sur l’étape CV : **Importer un fichier PDF** *ou* coller le texte
- [ ] **Importer mon CV**

**À dire :**  
*Première étape : ton CV devient le contexte IA de toute l’app — match, analyse ATS, cover letters.*

---

### Scène 2 — Métier + première alerte (1:30–2:15) — `/onboarding/metiers`

- [ ] Choisir 1–2 postes (ex. Product Owner, Product Manager)
- [ ] Choisir 1–2 lieux (Paris, remote, hybrid)
- [ ] Valider → création de la tracked search / alerte

**À dire :**  
*Tu définis ton métier et tes lieux. JobTracker crée une alerte de recherche — le filtrage des offres part de là.*

---

### Scène 3 — Extension Chrome (2:15–2:45) — `/jobs?extension=1`

- [ ] Laisser apparaître la modale **Installe l’extension Chrome**
- [ ] Montrer brièvement les 3 étapes
- [ ] **Plus tard** (ne pas bloquer la démo)
- [ ] Pointer dans la sidebar : **Extension Chrome** (`/extension`)

**À dire :**  
*Pour Welcome to the Jungle, l’extension Chrome ajoute les offres dans un CSV unique, que tu réimportes ensuite. On revient dessus si besoin — le menu Extension Chrome est là.*

---

### Scène 4 — Imports CSV (2:45–4:15) — `/imports`

- [ ] Onglet **CSV / Excel**
- [ ] Montrer le template *ou* uploader le CSV préparé
- [ ] Preview des lignes
- [ ] **Importer et analyser** — laisser la barre de progression se voir
- [ ] Valider vers le board si demandé

*(Optionnel, 15 s : survoler l’onglet **Apify JSON** et **Extension Chrome** sans y rester.)*

**À dire :**  
*Ici tu injectes des offres en masse. CSV, Excel, ou JSON Apify. Chaque offre peut être analysée avant d’atterrir dans Jobs.*

---

### Scène 5 — Board Jobs (4:15–5:45) — `/jobs`

- [ ] Header **Offres suivies** : sélecteur d’alerte
- [ ] Montrer **Sync toutes** / **Nouvelle alerte** (sans tout lancer si sync longue)
- [ ] Basculer **Cards** ↔ **Table**
- [ ] Filtres rapides (location, status, Last 24h si pertinent)
- [ ] Cocher 1–2 offres → barre bulk (Sélectionner, Candidaté, Cover letters…)
- [ ] Ouvrir **une** fiche job

**À dire :**  
*Le board, c’est ton centre de contrôle : alertes, filtres, actions groupées — y compris générer plusieurs cover letters d’un coup.*

---

### Scène 6 — Analyse fiche + cover letter (5:45–7:45) — `/jobs/[id]`

Parcourir le flow numéroté FR :

1. **Analyse de mon CV**
2. **Analyse de la fiche de poste**
3. **Mots-clés en rapport**
4. **Améliorations de mon CV**
5. **Générer une cover letter**

- [ ] Lancer / laisser tourner l’analyse si besoin
- [ ] Scroller mots-clés matchés / manquants
- [ ] **Générer une cover letter** → modal : parcourir, **Copy** ou **Save**

**À dire :**  
*C’est le cœur IA : on croise ton CV et l’annonce. Tu vois le fit, les gaps, et tu sors une lettre ancrée dans ton vrai parcours — pas un blabla générique.*

---

### Scène 7 — Optimisation CV (7:45–8:45) — `/profile-ai/optimize`

- [ ] Montrer le **% d’utilisation** des mots-clés
- [ ] Table : Avant / Après / **Ajouter**
- [ ] Ajouter 1 mot-clé manquant
- [ ] **Crayon** sur CV après → petite édition
- [ ] *(Optionnel)* **Enregistrer le CV après**

**À dire :**  
*Après l’analyse, tu optimises ton CV : avant / après, mots-clés en table, et un taux d’utilisation clair.*

*(Si tu viens de CV Context : **Analyze CV** redirige aussi vers cette page.)*

---

### Scène 8 — Settings + prompts (8:45–9:30) — `/settings`

- [ ] **Mots-clés ATS** + bouton **Optimiser**
- [ ] **Prompts IA** : sections **fermées par défaut**
- [ ] Ouvrir **Analyse CV (ATS)** → montrer qu’on peut customiser / Reset défaut
- [ ] Mentionner Match job éditable ; Cover letter en lecture seule pour l’instant

**À dire :**  
*Dans Settings, tu contrôles les mots-clés ATS et les prompts IA — sans toucher au code.*

---

### Scène 9 — Applications (9:30–10:00) — `/applications`

- [ ] Créer rapidement 1 candidature (company + position)
- [ ] Montrer les colonnes du pipeline

**À dire :**  
*Et pour le suivi : un pipeline Applications séparé — To Apply jusqu’à Accepted.*

---

### Scène 10 — Closing (dernières 15–20 s)

**Écran :** rester sur Applications ou revenir au Dashboard

**À dire :**  
*En résumé : import des offres, score de fit, lettre personnalisée — au même endroit.  
Si tu veux tester ou me faire un retour, le lien est en description. Merci.*

**CTA suggéré (description Loom) :**  
- Lien app / repo  
- “Dis-moi ce qui te ferait gagner le plus de temps : sync WTTJ live, batch lettres, ou mobile.”

---

## 4. Plan B — si l’IA est lente ou plante

| Problème | Contournement caméra |
|----------|----------------------|
| Analyze / cover letter > 20 s | *“Je laisse tourner — j’ai déjà une analyse prête sur une autre offre.”* → ouvrir une fiche pré-analysée |
| Erreur API / clé manquante | Ne pas recharger en boucle. Montrer **résultats déjà en cache** (scores, keywords) + modal cover letter déjà générée |
| Import CSV vide / erreur | Utiliser le board déjà peuplé ; *“L’import suit le même flux — je pars d’offres déjà chargées.”* |
| Modale extension insiste | **Plus tard** immédiatement ; pointer `/extension` sans y rester |
| Onboarding déjà fait | Partir directement de `/jobs` après login ; résumer CV + alerte en 10 s |

**Préparer hors caméra (idéal) :**  
1 offre avec analyse + cover letter déjà générées, 1 CSV test valide, CV sauvegardé dans CV Context.

---

## 5. Ce qu’il ne faut pas montrer

| Écran / promesse | Pourquoi |
|------------------|----------|
| `/sources` ou Manage connectors | Stub **Coming soon** |
| Sync LinkedIn “live” | Non exposé comme connecteur fiable dans l’UI |
| Kanban dashboard non branché | Pas le parcours principal |
| Analyze sans CV sauvegardé | Échec garanti |
| Promettre que Applications = statuts Jobs | Modèles séparés |

---

## 6. Timing condensé (mémo prompteur)

| Temps | Où | Une phrase |
|-------|-----|------------|
| 0:00 | Login | Pitch |
| 0:30 | Login / CV | Le CV = contexte IA |
| 1:30 | Métiers | Alerte métier + lieux |
| 2:15 | Jobs + modal | Extension Chrome, plus tard |
| 2:45 | Imports | CSV → board |
| 4:15 | Jobs | Alertes, filtres, bulk |
| 5:45 | Fiche job | Fit → cover letter |
| 7:45 | Optimize | Avant/après + % |
| 8:45 | Settings | Prompts fermés, éditables |
| 9:30 | Applications | Pipeline |
| 9:50 | Close | Import → score → lettre |

---

## 7. Description Loom (copier-coller)

```
JobTracker — démo A→Z (PO / PM job-search CRM)

Import d’offres (CSV / WTTJ / extension Chrome) → matching IA sur ton CV → cover letters personnalisées.

Parcours : onboarding CV → alerte métier → Imports → Jobs → analyse fiche → optimisation CV → Settings (prompts) → Applications.

Feedback bienvenu 👇
```
