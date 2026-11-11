# Tarification — JobTracker

Date : **28/10/2026**. Décision proposée, non publiée, non encaissée.

## 1. Recommandation

**[HYPOTHÈSE] Garder 39 € pour 90 jours comme prix de référence du test, sans reconduction automatique ; comparer à 29 € pour exactement la même offre.** Il ne s’agit ni d’un prix final ni d’un prix « validé par le marché ». Le budget, les coûts et la capacité de service restent manquants.

Ne pas afficher simultanément trois formules au premier test : vérifier d’abord si une seule offre fournit assez de valeur. Le choix 29/39 € sert à examiner la sensibilité au prix sans changer le produit. Un tarif plus court répondrait à une autre question, celle de la durée et de la trésorerie.

**Condition : abandonner la promesse d’illimité tant que le coût d’usage n’est pas mesuré.** Proposition de travail pour l’étape `offer` : 90 jours, un CV de référence, jusqu’à **20 dossiers CV/offre**, chacun comprenant analyse, recommandations fondées sur l’expérience et une lettre, avec deux régénérations maximum par dossier. Ces quotas sont des hypothèses opérationnelles, pas des usages constatés ou des limites déjà implémentées. Définir précisément les décomptes et ne pas facturer un échec technique ; toute limite doit être visible avant achat.

Le suivi des candidatures accompagne l’offre ; ne pas vendre de relances automatiques, d’export ou de réécriture intégrée du CV sans en avoir vérifié la disponibilité. Le parcours canonique CV → offre → analyse → suggestions → adéquation → lettre → suivi reste inchangé.

## 2. Ce que disent réellement les entrées

### Panel : résultat de simulation, pas étude de demande

**[FAIT DE CALCUL]** Le script a accepté 20 séries complètes et n’en a exclu aucune. Valeurs par défaut pour le **pass complet de trois mois** : PMC 9,12 €, OPP 9,12 €, IPP 20,28 €, PME 45,03 €. Médianes : trop bon marché 5 €, bonne affaire 19 €, commence à être cher 39 €, trop cher 69 €.

**Interprétation limitée :** 29 et 39 € se situent dans la plage produite par cet outil, mais cela ne démontre pas leur acceptabilité commerciale. À 39 €, 14 séries sur 20 classent déjà le prix comme « cher » et deux comme « trop cher », selon les seuils fournis ; ce ne sont pas des taux de refus réels. Dans les mêmes scénarios, seuls trois personas ont choisi l’achat, généralement après un essai convaincant.

L’OPP à environ 9 € est une première égalité sur un plateau de courbes, pas un optimum économique. Ne pas recommander 9,12 € au motif qu’un script l’appelle « optimal ». Les limites de méthode, devise et discrétisation figurent dans `pricing-curve.md`. La différence entre l’offre illimitée simulée et le forfait borné proposé interdit de transférer automatiquement les seuils à ce nouveau contenu.

### Concurrents : points de repère, pas preuve de consentement à payer

**[RELEVÉS ANTÉRIEURS]** Sources officielles consultées le 28/10/2026 dans `competitors.md` et `competitors.csv`, non revérifiées pendant cette étape :

- [Teal+](https://www.tealhq.com/pricing) : **79 $ pour 90 jours** ; 29 $ pour 30 jours. CV, analyse de mots-clés, suivi ; gratuit déjà disponible.
- [Huntr Pro](https://huntr.co/pricing) : **90 $ pour trois mois** ; 40 $ par mois. CV adaptés, lettres et tracker.
- [Jobscan](https://app.jobscan.co/plan) : **89,95 $ pour trois mois** ; 49,95 $ par mois. Scans CV/offre, optimisation, lettres, tracker.
- [Careerflow](https://www.careerflow.ai) : Premium **54,99 $ par trimestre** ; 23,99 $ par mois, selon le relevé antérieur.
- [Rezi](https://www.rezi.ai/pricing) : **29 $ par mois**, 149 $ à vie selon le relevé ; offre principalement centrée sur le CV. Le détail Enterprise n’est pas utile à la comparaison B2C et n’est pas retenu.

Pas de taux de change ni de traitement fiscal comparables vérifiés : **ne pas classer directement des euros TTC contre des dollars**. Les périmètres, quotas et durées diffèrent également. Les prix cités dans des avis Simplify ne sont pas des tarifs officiels confirmés : exclus de l’ancrage quantitatif.

La médiane précédente de 29,98 $ mélangeait durées, deux tarifs d’un même acteur et prix rapportés : **elle n’est pas retenue pour décider du prix**. Le substitut à battre reste aussi l’usage gratuit d’un assistant généraliste associé à un tableur, pas seulement les abonnements spécialisés.

## 3. Marge et seuil de rentabilité : non calculables à ce stade

**[MANQUANT]** Coûts IA par parcours et régénération, infrastructure variable, collecte, temps de support, frais de paiement, remboursements, régime fiscal, coûts fixes et acquisition. `numbers.json` est absent : ne pas en fabriquer un ni exécuter un calcul CFO avec des entrées inventées.

Pour chaque pass :

`contribution = recette hors taxes applicables − frais de paiement − coûts variables IA/collecte/infra − support variable − remboursements attendus`

Avec une TVA applicable au taux `t`, la recette hors taxes est `prix TTC / (1 + t)` ; sans TVA applicable, ce retrait ne s’applique pas. Ne pas présumer le régime du fondateur. Comptabiliser le temps de support, même lorsqu’il ne donne pas immédiatement lieu à un décaissement.

Les deux candidats restent donc **conditionnels** : contribution à 29 € inconnue, contribution à 39 € inconnue, seuil de rentabilité inconnu. Une borne de quota ne suffit pas à prouver une marge positive.

Avant lancement : mesurer plusieurs parcours complets avec leurs régénérations, puis des usages plus intensifs, et vérifier que les coûts servis sur les 90 jours restent compatibles avec le prix. Si le forfait ne tient pas économiquement, réduire explicitement le périmètre ou renoncer au prix ; pas de consommation cachée ni de dépassement facturé sans accord. Ne pas extrapoler une LTV d’abonnement à partir d’un pass temporaire.

## 4. Échelle d’offres : options ultérieures, pas grille à publier

**[HYPOTHÈSES]** Pour éviter la dispersion initiale :

1. **Découverte** : une analyse et une lettre gratuites sur un CV éventuellement anonymisé, si cette expérience est réellement disponible et son coût supportable. Pas de carte nécessaire pour cette proposition de découverte.
2. **Recherche** : le pass borné à 39 €/90 jours, testé contre 29 € à périmètre identique. Raison d’achat : répéter la préparation sans ressaisie et garder le suivi au même endroit.
3. **Accompagnement** : éventuelle relecture humaine, seulement si le fondateur peut la servir. **Prix non fixé**, à déterminer d’après le temps réel, les compétences disponibles et la demande ; ne pas inventer une équipe de coachs.

Un pass 30 jours moins cher peut répondre à l’objection d’avance de trésorerie, mais n’est pas déduit des seuils à trois mois. Le tester séparément si cette objection ressort d’entretiens réels. Pas d’offre à vie avec une consommation IA future non bornée.

## 5. Offre de démarrage

**Pas de remise de lancement ni de faux prix barré.** La proposition de lancement est une preuve gratuite limitée, suivie du prix affiché, avec des conditions de remboursement compréhensibles et compatibles avec les droits légaux applicables. Aucun entretien, embauche ou passage ATS garanti.

**[PROTOCOLE PROPOSÉ]** Fenêtre de test de **J1 à J14 inclus**, date calendaire non fixée tant que la disponibilité n’est pas fournie. À J15 : arrêt de la variante expérimentale et bilan ; aucune hausse « automatique » prétendument annoncée. Les droits et les 90 jours achetés par les participants restent respectés. Ne pas créer de compte à rebours ou de rareté artificielle.

## 6. Test réel à préparer, sans l’exécuter maintenant

### Question

À offre identique et après une preuve de valeur, 29 € génèrent-ils une meilleure contribution par visiteur qualifié que 39 € ? La conversion seule ne suffit pas : une baisse de prix peut attirer plus d’achats tout en réduisant la contribution.

### Conditions préalables

- Offre et quotas réellement livrables, explications honnêtes du score et absence d’expérience inventée.
- Paiement, informations légales, droits applicables, remboursement, protection des données et assistance vérifiés.
- Instrumentation du parcours et mesure des coûts. Aucun déploiement ou encaissement autorisé par le présent document.

### Déroulement proposé

1. Même canal, critères de qualification et contenu pour les deux variantes ; répartition aléatoire persistante **29 € ou 39 €** pour un même visiteur, si un tel dispositif peut être mis en place légalement et techniquement. Sans cela, cohortes successives documentées, avec biais temporel explicite.
2. Même pass de 90 jours et mêmes quotas dans les deux variantes ; aucune variation de promesse, essai ou garantie. Prix final et conditions visibles avant tout engagement.
3. Enregistrer visiteurs qualifiés uniques, début/fin d’essai, achats effectivement encaissés, remboursements, dossiers préparés, coût et temps de support. Un clic, une carte saisie ou une intention ne sont pas une vente.
4. Ne pas lancer simultanément un test de durée : 29 € et 39 € concernent ici les **mêmes 90 jours**. Un mois à 13 € contre trois mois à 39 € teste aussi l’engagement, pas seulement le prix.
5. J14 : analyser descriptivement les résultats et les objections. Volume et conversion de référence inconnus : aucune taille d’échantillon statistique sérieuse n’est calculable aujourd’hui. Un petit effectif ne désigne pas un gagnant ; prolonger seulement avec budget et capacité confirmés.

### Règles de décision proposées

- **Achats mais contribution négative** : ne pas augmenter l’acquisition ; revoir prix, coût ou périmètre.
- **Essais utiles mais pas de paiements** : explorer les raisons réelles de non-achat et l’alternative gratuite ; ne pas attribuer automatiquement le problème au prix.
- **Les deux variantes attirent des achats** : comparer contribution par visiteur et qualité d’usage, tout en tenant compte de l’incertitude et des remboursements différés.
- **Pas assez de visites ou d’achats** : résultat inconclusif, pas victoire d’un tarif ni preuve d’absence de marché.

Les coûts et remboursements observés à J14 ne couvrent pas encore toute l’obligation de service de 90 jours. Conserver un suivi de cohorte jusqu’à la fin du pass ; toute estimation à J14 doit inclure explicitement le coût restant à servir.

## 7. Trois objections de prix, verbatim synthétiques

Ce ne sont **pas des témoignages clients**. Sources : réponses du panel, catégorie `price`.

> « Je testerais l’analyse et la lettre gratuites, mais je ne sortirais pas 39 € d’un coup pour trois mois. Mon tableur est en retard, oui, mais ça ne suffit pas à me faire payer avant de voir si les conseils servent vraiment mes candidatures produit. » — P008.

> « Avec mes indemnités qui se terminent, je ne sors pas 39 € d’un coup pour trois mois. Je testerais l’analyse et la lettre gratuites, mais pour mes six candidatures je garderais un suivi gratuit et des rappels. » — P010.

> « Avec mes indemnités qui se terminent, je ne mets pas 39 € dans un outil alors que je fais déjà mes lettres gratuitement avec ChatGPT. Mon suivi est en retard, mais ça ne suffit pas à me faire payer un pass de trois mois. » — P011.

Réponse de conception : preuve avant paiement, montant total clair, alternative courte à explorer, aucune pression sur un candidat au budget contraint. Ne pas transformer ces propos en arguments publicitaires attribués à des utilisateurs.

## 8. Données à demander au fondateur

1. Coût mesuré d’un parcours complet et de ses régénérations ; factures ou totaux anonymisés suffisants, pas de CV ni de secrets.
2. Temps de support disponible, budget maximal de test et charges fixes pertinentes.
3. Situation de TVA et frais de paiement réellement applicables.
4. Capacité de livraison du quota proposé, date de disponibilité et fonctions effectivement utilisables.

**Conclusion : 39 €/90 jours contre 29 €/90 jours est une proposition de test, pas une décision de prix rentable.** Aucun prix du produit, aucun `numbers.json`, aucun pitch archivé du panel n’a été modifié. Suite du pack : `founder-offer`, pour borner et rendre vérifiable ce qui serait vendu.
