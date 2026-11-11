# Concurrents — JobTracker

Cartographie des acteurs, des prix et des plaintes publiques, sur sources publiques uniquement. **Relevés du 28/10/2026.** Chaque prix renvoie à la page qui l'affiche ; chaque plainte renvoie à son avis.

Étiquettes : `[VÉRIFIÉ]` page publique consultée ce jour · `[RAPPORTÉ]` montant cité par un client, non confirmé par l'éditeur · `[MANQUANT]` non obtenu, jamais traité comme zéro.

---

## 1. Méthode et limites de cette passe

**Ce qui a fonctionné** : pages tarifaires officielles de Jobscan (via `app.jobscan.co/plan`), Teal, Huntr, Rezi, Careerflow ; pages produit de Simplify ; avis Trustpilot de Jobscan (346 avis), Teal (118), Huntr, Simplify, Rezi.

**Ce qui a échoué, et pourquoi**
- `websearch` : outil indisponible (« Web search cancelled ») sur toute la session. Aucune recherche par moteur n'a pu être faite directement.
- Jobscan `jobscan.co/pricing` : page vide côté serveur ; le tarif réel est sur `app.jobscan.co/plan`, récupéré via un proxy de lecture.
- Trustpilot en accès direct : HTTP 403. Contourné par lecteur de page ; certaines pages (Huntr, filtres) restent bloquées par intermittence.
- G2 / Capterra / Reddit en direct : bloqués. Reddit a été interrogé via une API d'archive publique, mais les résultats étaient majoritairement des commentaires promotionnels de faible qualité (comptes à 1 point, formulations de type affiliation). **Ils n'ont pas été retenus comme plaintes** : les citer aurait fabriqué de la preuve.
- **Aucun concurrent français natif de scoring ATS n'a pu être identifié avec certitude.** Ce n'est pas la preuve qu'il n'en existe pas — c'est une donnée manquante, à lever manuellement (voir §7).

**Biais à garder en tête** : les avis Trustpilot sont auto-sélectionnés, les éditeurs y répondent publiquement (Jobscan et Teal le font systématiquement), et un pic d'avis à 5 étoiles très récents peut refléter une campagne de sollicitation. Les plaintes ci-dessous sont donc des **signaux**, pas des taux de défaillance.

---

## 2. Les acteurs, du plus proche au plus lointain

| Acteur | Type | Prix comparable `[VÉRIFIÉ]` | Gratuit ? | Note publique | Ce qu'il vend vraiment |
|---|---|---|---|---|---|
| **Jobscan** | **Direct** | 29,98 $/mois (facturé 89,95 $/3 mois, essai 7 j) · 49,95 $/mois | Oui, 5 scans/mois | 4,3/5 · 346 avis | « Optimise ton CV pour l'ATS exact de cette offre » : détection de l'ATS, score, mots-clés manquants, optimisation IA, lettre, tracker |
| **Teal** | **Direct** | 13 $/sem · 29 $/30 j · 79 $/90 j | Oui, suivi illimité | 4,2/5 · 118 avis | Tracker + analyse de mots-clés par offre + constructeur de CV. Le gratuit est déjà généreux |
| **Huntr** | **Direct** | 40 $/mois · 90 $/3 mois · 160 $/6 mois | Oui, 100 offres, 2 CV adaptés | 4,5/5 | Tracker + CV adaptés + lettres + autofill par extension. Le plus « CRM » des trois |
| **Simplify** | Direct-ish | Gratuit + Simplify+ ; **19,99 $ et 39,99 $** cités par des clients `[RAPPORTÉ]` | Oui, large | 2,8/5 | Autofill massif, CV adapté, tracker, mise en relation recruteurs. Cible étudiants / jeunes diplômés |
| **Rezi** | Adjacent | 29 $/mois · **149 $ à vie** · 99 $/200 utilisateurs | Oui, 1 CV, 3 PDF | Aucun avis Trustpilot | Constructeur de CV IA + score ATS + entretien. Pas un tracker |
| **Careerflow** | Adjacent | 8,99 $/sem · 23,99 $/mois · 54,99 $/trim · 172,99 $/an ; Plus 19,99 $/sem · 44,99 $/mois | Oui | Non relevé | « Career copilot » : CV, LinkedIn, tracker, autofill, lettres |
| **ChatGPT / Gemini** | Substitut | `[MANQUANT]` (page consultée sans montant exploitable) | Oui, suffisant pour une partie du besoin | — | Reformulation à la demande, offre collée, lettre générée. **Le vrai concurrent** |
| **Tableur / Notion** | Substitut | 0 € | Oui | — | Le tracker que tout le monde bricole déjà |
| **APEC / WTTJ / LinkedIn / Indeed** | Substitut (source) | 0 € pour le candidat | Oui | — | Là où les offres françaises existent, avec alertes et autofill |

**Lecture immédiate** : personne, dans cette liste, n'est français, ni pensé pour les offres françaises, ni positionné sur un score ATS **explicable**. Les trois « directs » vendent la même chose à des prix différents — et tous les trois offrent déjà une version gratuite utilisable.

---

## 3. Fourchette de prix du marché comparé

Prix ramenés au **mois** pour être comparables (hors promotions, hors taxes) :

| Acteur | Équivalent mensuel |
|---|---|
| Careerflow Premium | 23,99 $ |
| Teal+ (30 jours) | 29,00 $ |
| Rezi Pro | 29,00 $ |
| **Jobscan (trimestriel)** | **29,98 $** |
| Simplify+ `[RAPPORTÉ]` | 39,99 $ |
| Huntr Pro | 40,00 $ |
| Jobscan (mensuel) | 49,95 $ |

- **Minimum** : 23,99 $/mois (Careerflow) · **Médiane** : 29,98 $/mois (Jobscan trimestriel) · **Maximum** : 49,95 $/mois (Jobscan mensuel).
- **Pass courts** : 13 $/semaine (Teal), 8,99 $/semaine (Careerflow), 9 $/3 mois implicite nulle part — le format court existe, mais à la semaine, pas au « pass de recherche ».
- **Paiement unique** : 149 $ à vie (Rezi). Un seul acteur, sur un produit sans coût marginal d'IA lourd.

**Conséquences pour un prix JobTracker**
1. Un abonnement à 19 €/mois se situe **sous la médiane** du marché : c'est défendable, pas agressif.
2. Un pass 39 €/3 mois se lit comme **13 €/mois** — soit moins que le pass 30 jours de Teal. Cohérent avec un besoin de 8 à 12 semaines.
3. Un prix « à vie » est exclu : avec un coût IA par usage porté par l'éditeur `[VÉRIFIÉ : clé OpenAI serveur unique]`, il transfère tout le risque sur le fondateur.

---

## 4. Carte de positionnement (texte)

Deux axes qui comptent pour l'acheteur, pas pour le marché :

- **Axe horizontal** : suivi / organisation ←→ **profondeur d'analyse CV-offre**
- **Axe vertical** : générique international ←→ **ancré sur le marché français**

```
                 ANCRÉ FRANCE
                      │
      (personne ici)  │
                      │      ★ JobTracker (revendiqué,
                      │        non prouvé)
                      │
  SUIVI ──────────────┼────────────── ANALYSE
                      │
   Notion / Tableur   │   Teal · Huntr · Rezi
   APEC · WTTJ        │   Jobscan · Careerflow
                      │   Simplify
                      │
                 GÉNÉRIQUE / INTERNATIONAL
```

Le quadrant « ancré France × analyse profonde » est **vide dans cette cartographie**. Ce n'est pas une preuve d'opportunité : c'est peut-être un quadrant vide parce que personne n'en veut, ou parce que le marché français est trop petit pour intéresser les acteurs installés. Les deux hypothèses tiennent.

---

## 5. Ce dont les clients se plaignent — classé, avec liens

Avis Trustpilot, dates réelles. Les plaintes sont classées par récurrence et par pertinence pour JobTracker.

**1. Le score est opaque ou se trompe sur un vocabulaire spécialisé** — la plainte la plus directement exploitable.
> « Many mistakes in interpreting professional terms in my technical area. Maybe good for entry level or generic job seekers. » — *Jobscan, 12/10/2026* · https://www.trustpilot.com/reviews/6acdc303dc47f3be855458a2
> « every CV in anyway it's written it will show low rate » — *Jobscan, 21/09/2026* · https://www.trustpilot.com/reviews/6abc3133b5823a64902a5797

**2. Le paiement et le remboursement sont vécus comme piégeux** — le risque de réputation numéro un du secteur.
> « I subscribed to Simplify+ and cancelled the same day… refused to refund the $39.99 because I had already activated and briefly used the service. » — *Simplify, 08/10/2026* · https://www.trustpilot.com/reviews/6ac8f96572889f6186fa0a0f
> « Refund refused after I reported incorrect Autopilot information… I paid $19.99 » — *Simplify, 13/10/2026* · https://www.trustpilot.com/reviews/6ad002e55c145e4be991597d
> « They make it hard to cancel… no way to cancel directly from your account page. » — *Jobscan, 23/08/2026* · https://www.trustpilot.com/reviews/6a8b0282c1ca4ae40a3dc25f

**3. « C'est ce que ChatGPT me fait gratuitement »** — la plainte qui vise directement la valeur perçue.
> « Much of what I tested felt like functionality I can already get from general AI tools such as ChatGPT, rather than something worth a separate paid subscription. » — *Simplify, 08/10/2026*
> « I started using Gemini for free and was FAR more impressed with the quality of the suggestions and cover letters. » — *Teal, 01/01/2026* · https://www.trustpilot.com/reviews/69960b3890fbe2a5c2cca98c

**4. La qualité de la sortie n'est pas au niveau promis** — lettres fautives, CV dégradé.
> « At least 50% of the cover letters generated had my last name misspelled » — *Teal, 01/01/2026*
> « when using AI optimize it it will make the worst CV layout I have ever seen » — *Jobscan, 21/09/2026*

**5. Les offres affichées sont fantômes** — la dépendance aux sources, vue par le client.
> « The job listings on their site feel like mostly ghost listings. I didn't get a single email back » — *Teal, 25/05/2026* · https://www.trustpilot.com/reviews/6a19e2ee8bbebbb7eb960a99

**6. Le harcèlement marketing et la sortie difficile** — moins grave, mais coûteux en confiance.
> « every day a new spam email. Unsubscribe disfunctional » — *Teal, 16/06/2026* · https://www.trustpilot.com/reviews/6a31683757dfcabbc6fa11e9

**Ce que les clients louent**, et qu'il serait malhonnête d'ignorer : le tracker qui remplace un Excel (Teal), la vitesse pour adapter un CV (Huntr), et surtout **le repérage de mots-clés manquants** — plusieurs avis à 5 étoiles décrivent un score qui monte après correction, puis des entretiens. C'est exactement le cœur de JobTracker, et c'est déjà bien servi.

---

## 6. Le vide que JobTracker peut occuper

Trois constats se recoupent :

1. **Aucun acteur n'est français.** Tous vendent en anglais, à des candidats anglophones, avec des offres anglophones. Le marché français est adressé par des substituts gratuits (APEC, WTTJ) et des assistants génériques.
2. **Le score est la brique que tout le monde vend et dont personne n'explique la logique** — d'où la plainte n°1. JobTracker possède déjà un score **déterministe et pondéré** `[VÉRIFIÉ : mots-clés 25, compétences 25, expérience 20, titre 15, outils 15]`. C'est le seul actif de la liste qui puisse répondre « voici pourquoi ton score est de 62, ligne par ligne ».
3. **La confiance de paiement est un espace libre.** Les plaintes de remboursement de Jobscan et Simplify laissent un créneau pour une promesse simple : paiement unique, remboursement sur livrable, résiliation en un clic, pas de reconduction cachée.

**La phrase de positionnement que ce vide autorise** — et qu'aucun concurrent ne peut copier sans se contredire :

> **« Ton score ATS, expliqué ligne par ligne, sur une offre française — et une lettre qui ne contient rien que tu n'aies réellement fait. »**

Ce n'est pas « mieux que ChatGPT » : c'est **vérifiable**, là où ChatGPT est une boîte noire et où Jobscan rend un chiffre sans justifier ses règles.

**Ce que ce vide n'est pas** : une preuve de demande. Un quadrant vide peut être un marché non adressé ou un marché non solvable. Le board a déjà tranché la question du segment (cadre 28–42 ans en transition vers un rôle produit, 8 semaines de recherche ou plus) ; cette cartographie ne la valide pas, elle la rend seulement **plausible**.

---

## 7. Qui peut copier ça, et en combien de temps

`[ESTIMATION]` — raisonnement sur les capacités visibles des produits, pas sur leurs feuilles de route.

| Copieur | Ce qu'il a déjà | Temps pour ajouter FR + score expliqué | Verdict |
|---|---|---|---|
| **Jobscan** | Score ATS, détection d'ATS, tracker, lettre, paiement, 346 avis | Localisation FR des offres = 1 à 2 trimestres ; explication du score = quelques semaines | **Le plus rapide et le plus dangereux** |
| **Teal** | Analyse de mots-clés jugée excellente par ses utilisateurs, gratuit généreux | Interface FR + offres FR : 1 à 2 trimestres | Dangereux sur le gratuit |
| **Huntr** | Tracker + CV adaptés + autofill, 4,5/5 | Traduction + connecteurs FR | Moyen |
| **ChatGPT / Gemini** | Le besoin brut, gratuit, déjà installé | « Fais-moi un score ATS pondéré et explique-le » fonctionne déjà approximativement | **Ne copie pas : rend le produit inutile par le bas** |

**Conclusion honnête** : il n'y a **pas de fossé technique**. La copie de la fonctionnalité prend un trimestre à un acteur financé. Ce qui ne se copie pas en un trimestre, c'est (a) la distribution en français — SEO, communautés, écoles, extension sur WTTJ, et (b) la réputation de confiance sur le paiement. Les deux se construisent lentement, et sont les seules défenses disponibles.

**À vérifier manuellement avant de conclure à un marché vide en France** : recherche « score ATS », « test ATS CV », « lettre de motivation IA » sur Google.fr et Bing, en navigation privée, sur 3 pages de résultats ; puis les offres d'emploi des éditeurs français de CV (CVdesignr, Zety FR, Novoresume, Resume.io FR). Ce travail n'a pas pu être fait ici, faute d'accès aux moteurs. `[MANQUANT]`

---

## 8. Ce que cette cartographie change

1. **Le prix se situe, il ne s'invente pas** : 19 €/mois est sous la médiane (29,98 $), 39 €/3 mois est sous le pass 30 jours de Teal. La fourchette du board (9 / 19 / 39) est cohérente avec le marché — ce qui ne dit rien de la disposition à payer.
2. **La promesse doit être « score expliqué », pas « score »** : c'est la seule différence que les plaintes publiques rendent défendable, et le seul actif déjà dans le code.
3. **La confiance de paiement est un argument de vente** : remboursement sur livrable, résiliation immédiate, pas de reconduction cachée. Les concurrents perdent des clients sur ces points, publiquement.
4. **Le risque de copie est réel et proche** : la défense est la distribution française et la réputation, pas la fonctionnalité. Toute la stratégie de lancement doit en tenir compte.
5. **Le vrai concurrent reste ChatGPT** : deux avis spontanés le nomment comme substitut supérieur. Le test terrain doit mesurer un gain **observable** par rapport à lui, pas une préférence déclarée.
