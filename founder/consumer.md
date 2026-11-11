# Panel consommateur — JobTracker

**Simulation exploratoire du 28/10/2026 : 3 choix d’achat, 17 refus sur 20 personas synthétiques.** Le ratio de 15 % décrit uniquement ces sorties de modèle. Ce n’est ni un taux de conversion prévisionnel, ni une borne supérieure fiable, ni une validation de prix ou de demande.

## Protocole et traçabilité

- Entrées : `customer.json`, `pitch.md`, résultats précédents du board et de la cartographie concurrentielle. Les assertions concurrentielles de ces documents ne sont pas revérifiées par ce panel.
- Générateur : `.opencode/skills/founder-consumer/panel.py`, seed **428**, 20 cartes ; mêmes cartes reproductibles, réponses de modèle non garanties reproductibles.
- Un sous-agent indépendant par persona ; reprise des fichiers P001 à P005 déjà présents, exécution de P006 à P020 par vagues de cinq. Aucun avis n’a été écrit par le modérateur.
- Toutes les réponses sont présentes. Vérifications : JSON, champs requis, montants positifs ou nuls et ordonnés, cohérence achats/choix, pitch archivé identique à `pitch.md`.
- Comptage brut : `panel/results.json` et `panel/results.md`. Réponses individuelles : `panel/answers/P001.json` à `P020.json`.
- Les segments, revenus, comportements et leurs proportions sont des **hypothèses de construction**, pas des caractéristiques mesurées de clients. Les revenus des profils en transition ne prouvent pas leur revenu disponible actuel.

## Offre hypothétique soumise aux personas

Pass de **39 € pour trois mois**, sans reconduction, avec une analyse et une lettre gratuites, puis analyses illimitées ; score expliqué ligne par ligne, préparation en dix minutes, suivi et relances, garantie sur l’absence d’expérience inventée.

**Ce pitch n’est pas publiable en l’état.** Paiement, quotas gratuits, illimité, remboursement et résiliation sont des conditions proposées, pas des capacités commerciales vérifiées. Le délai de dix minutes n’est pas mesuré ; le calcul déterministe du score ne prouve ni une explication ligne par ligne dans l’interface ni une efficacité sur les ATS des employeurs. Les relances doivent être vérifiées, sans supposer un envoi automatique. La garantie ne remplace pas les droits légaux applicables.

Le pitch initial est conservé sans modification pour ne pas changer le stimulus en cours de panel. Toute correction devra constituer un autre test, avec version distincte.

## Choix simulés par segment

- Cadres en transition vers le produit : **1 sur 7** choisit l’achat.
- PO/PM en poste qui cherchent à changer : **1 sur 5**.
- Reconversion junior vers le produit : **1 sur 5**.
- Recherche longue, indemnisation qui se termine : **0 sur 3**.

Ces petits groupes ne permettent ni de classer les marchés ni de valider le segment du board. Le comportement est plus instructif dans ces scénarios : aucun des cinq utilisateurs habituels de ChatGPT, des trois utilisateurs d’un tracker existant ou des trois profils comptant chaque euro ne choisit l’achat. Cela suggère des objections à examiner, pas des probabilités par population.

Les trois « oui » restent liés à une vérification préalable par l’essai gratuit. Le booléen `buys` simplifie donc abusivement des intentions souvent conditionnelles : **aucun paiement n’a eu lieu**.

## Pourquoi les personas refusent

Les codes ci-dessous sont les catégories choisies par les sous-agents, pas une mesure indépendante des causes.

### 1. Confiance : 7 des 17 refus

> « Je testerais l’analyse gratuite, mais je ne paie pas 39 € sur la promesse d’un score expliqué : chaque outil me sort déjà un résultat différent. » — P006, propos simulés, extrait.

Deux enjeux distincts : crédibilité de l’analyse et traitement du CV. Montrer les éléments du CV et de l’offre qui justifient une recommandation ; rendre les règles de conservation et de suppression compréhensibles avant l’import. Ne pas promettre une absence de réutilisation ou d’entraînement sans vérification des contrats et paramètres des sous-traitants.

### 2. Habitudes / substituts : 6 des 17 refus

> « J’ai déjà mon réflexe : j’ouvre ChatGPT, je colle l’offre et mon CV, j’ai ma lettre en deux minutes, et ça ne me coûte rien. » — P003, propos simulés, extrait.

Le changement d’outil a un coût. Tester un gain observable face à la méthode actuelle du candidat, à entrée identique, plutôt que soutenir que le score est nécessairement meilleur. L’essai peut aussi suffire à un besoin ponctuel sans déclencher d’achat.

### 3. Prix / avance de trésorerie : 3 des 17 refus

> « Avec mes indemnités qui se terminent, je ne sors pas 39 € d’un coup pour trois mois. » — P010, propos simulés, extrait.

Treize euros par mois en équivalent ne signifie pas treize euros à payer aujourd’hui. Les demandes synthétiques de mois unique ou de pass moins cher sont des hypothèses de formats à tester, pas une disposition à payer constatée.

### 4. Qualité : 1 des 17 refus

P020 veut une lettre personnelle et envoyable avec peu de retouches, pas simplement une lettre supplémentaire. Cette objection traverse aussi plusieurs réponses classées ailleurs : les catégories ne couvrent pas toutes les dimensions de chaque refus.

## Ce qui pourrait faire évoluer les refus

Lecture qualitative des champs `would_change_my_mind`, sans prétendre à un codage statistique :

1. **Preuve sur leur propre cas** : une offre choisie, un CV éventuellement anonymisé, des écarts précis et des recommandations justifiées.
2. **Lettre fidèle et utilisable** : ton personnel, peu de retouches, aucune compétence ni expérience ajoutée.
3. **Réduction d’effort réelle** : moins de ressaisie et un suivi utile, sans apprendre un outil complexe.
4. **Contrôle des données** : pouvoir comprendre leur traitement et tester sans transmettre inutilement ses coordonnées.
5. **Moins d’argent avancé** : option plus courte à comparer ultérieurement à prix et périmètre clairement définis.

## Ce qu’il faut changer avant de dépenser

**Priorité à la preuve et au périmètre de l’offre, pas à une baisse générale du prix.** Préparer une démonstration sur une candidature réelle consentie : méthode actuelle contre JobTracker, temps observé, corrections nécessaires, erreurs factuelles et utilité des recommandations. Le score seul ne doit pas servir de mesure de qualité ni être artificiellement augmenté.

Pour `founder-pricing` : les 20 fichiers contiennent quatre seuils de prix synthétiques. Leur unité de travail est l’euro pour **le pass complet de trois mois**, pas le mois. Ils sont ancrés par le prix de 39 € montré à tous ; ils ne déterminent pas un prix optimal ni un revenu attendu.

Pour `founder-offer` : remplacer les promesses non démontrées par un périmètre réellement livrable ; ne proposer l’illimité qu’après mesure du coût d’usage. Une garantie commerciale doit être claire et compatible avec les droits applicables.

Pour `founder-marketing` : réutiliser les thèmes d’objection, jamais les citations comme témoignages clients. Ne pas présenter « score expliqué » ou « français » comme une exclusivité démontrée par cette simulation.

## Limites particulières de cette reprise

- Le modèle de brief affiche les revenus avec un symbole `$` hérité de l’exemple. Les consignes de reprise P006–P020 précisent de ne pas convertir et de répondre sur le prix du pass en euros. Les sorties automatiques par revenu conservent cet artefact : **ne pas les utiliser pour une analyse monétaire**.
- P001–P005 proviennent de la première exécution ; les quinze suivants ont reçu les précisions de langue, devise et statut hypothétique. Cette différence de consigne est une limite de comparabilité, non corrigée en réécrivant leurs réponses.
- Les profils du générateur couvrent 27–44 ans alors que la cible écrite indique 28–42 ans ; ce décalage de cadrage devra être corrigé pour un prochain protocole, pas dissimulé dans les cartes existantes.
- Aucun entretien, contact, publication, paiement ni test réel n’a été réalisé. Aucune modification de l’application.

**Conclusion :** le panel produit des pistes pour un test de confiance, de gain de temps et de qualité face aux substituts gratuits. Il ne tranche ni le segment, ni le prix, ni la décision de continuer. Étape suivante : `founder-pricing`, en conservant explicitement le statut synthétique de ses entrées.
