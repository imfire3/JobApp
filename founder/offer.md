# Offre — JobTracker

Date : **28/10/2026**. Analyse et proposition précommerciale. Pas d’encaissement, de publication ni de modification de l’application.

## Verdict en une phrase

Le meilleur noyau d’offre soutenable par le code est **préparer une candidature à partir du CV et de l’offre : comparaison CV/offre, écarts et mots-clés, lettre ancrée dans ces sources, puis suivi du statut**. Ce noyau n’est pas encore une offre commercialisable : paiement absent, coûts et limites d’usage non mesurés, comportement live non vérifié.

Le problème à résoudre n’est pas « ajouter encore une fonction ». C’est de prouver au candidat qu’il gagne un effort concret par rapport à son tandem actuel — assistant IA généraliste et tableur — sans lui demander une confiance aveugle sur son CV ou sur le score.

## Faits de code vérifiés pour borner l’offre

- `POST /api/analyze-job` exige un CV partagé et une offre appartenant à l’utilisateur, puis calcule une analyse IA et un score ATS déterministe. Le score comprend cinq sous-scores (mots-clés 25 %, compétences 25 %, expérience 20 %, titre 15 %, outils 15 %) : `lib/jobs/ats-offer-score.ts`.
- La page `components/jobs/job-detail-page.tsx` montre le score ATS, ses cinq sous-scores et des mots-clés présents/manquants. C’est un **détail par catégorie**, pas une explication de chaque ligne du CV ni une prédiction des filtres d’un employeur.
- Les routes de lettre sont authentifiées et sauvegardent une lettre : `app/api/generate-cover-letter/route.ts`, `lib/cover-letters/service.ts`. Les consignes d’IA utilisent le CV et les informations de l’offre ; la qualité finale n’a pas été évaluée ici.
- `app/api/jobs/route.ts` permet de lister les offres de l’utilisateur et de mettre à jour un statut. Cela ne prouve pas l’existence d’un rappel automatique de relance.
- Les offres peuvent être ajoutées via plusieurs chemins, mais la synchronisation live dépend de capacités et de paramètres. `docs/job-sync.md` distingue France Travail configuré, ajout URL/CSV/extension, et connecteurs Apify/mode mock. Ne pas vendre « offres françaises centralisées automatiquement » comme capacité universelle.
- Aucun code de paiement n’a été trouvé lors de l’analyse antérieure. Les quotas du pitch (nombre d’offres, générations) ne sont pas appliqués par le code actuel.

Ces faits prouvent la présence de chemins logiciels dans le dépôt, **pas** leur disponibilité publique, leur fiabilité opérationnelle, leur niveau de conformité ou la satisfaction d’utilisateurs.

## Liste des obstacles et réponse d’offre

Échelle de valeur estimée : 1 (faible) à 5 (forte). **Coût de livraison : non noté**, car les coûts IA, d’infrastructure, de support et de paiement manquent. Les mesures proposées sont des réponses à étudier, pas des capacités acquises.

| # | Obstacle dans les mots du candidat | Réponse à inclure ou à vérifier | Valeur estimée | Coût |
|---:|---|---|---:|---|
| 1 | « ChatGPT et mon tableur sont gratuits. » | Démonstration comparative, mêmes CV et offre, sans revendiquer une supériorité avant mesure. | 5 | Inconnu |
| 2 | « Est-ce que cette offre est vraiment disponible ? » | N’afficher que les chemins d’import opérationnels et leur statut ; distinguer ajout manuel, CSV et connecteur live. | 5 | Inconnu |
| 3 | « Je ne sais pas ce qui est inclus dans les 39 €. » | Publier prix total, durée, renouvellement, limites par CV/offre/lettre et support avant le paiement. | 5 | Inconnu |
| 4 | « Je ne confie pas mon CV à un site inconnu. » | Expliquer qui traite le CV, pourquoi, pendant combien de temps, et comment le supprimer — après vérification technique et contractuelle. | 5 | Inconnu |
| 5 | « Votre score ATS est un chiffre arbitraire. » | Afficher les cinq sous-scores et leurs pondérations, le périmètre du score et ses limites ; ne pas le présenter comme décision d’ATS. | 5 | Inconnu |
| 6 | « Chaque outil me donne un score différent. » | Exemple explicable sur CV/offre consentis, mettre en évidence les critères et incertitudes ; ne pas prétendre que le score correspond à celui d’un recruteur. | 4 | Inconnu |
| 7 | « Les mots-clés ne comprennent pas mon métier. » | Afficher termes trouvés/manquants et permettre au candidat de contester un terme ; mesurer les faux positifs par domaine. | 4 | Inconnu |
| 8 | « Les offres du tracker sont peut-être périmées ou fictives. » | Montrer provenance, URL et date observée lorsqu’elles existent ; signaler les imports utilisateur et connecteurs non disponibles. | 4 | Inconnu |
| 9 | « Je n’ai pas envie de configurer encore un outil. » | Réduire le premier parcours à CV existant → une offre → une analyse ; mesurer le temps réel, sans promettre dix minutes. | 4 | Inconnu |
| 10 | « Je devrai refaire tout le contexte à chaque offre. » | Utiliser le contexte CV partagé déjà prévu par le produit ; rendre les champs réutilisés visibles et corrigeables. | 4 | Inconnu |
| 11 | « Une suggestion peut inventer une compétence. » | Maintenir les garde-fous : reformulation uniquement appuyée par le CV ; signaler les termes à confirmer et laisser la décision au candidat. | 5 | Inconnu |
| 12 | « Une lettre IA va sonner générique ou fausse. » | Lier la lettre au CV et à l’offre, proposer un exemple clairement marqué comme exemple, vérifier nom et faits avant export/envoi. | 5 | Inconnu |
| 13 | « Je ne peux pas voir pourquoi une formulation a été proposée. » | Relier chaque proposition aux preuves présentes et afficher ce qui n’est pas attesté ; ne jamais ajouter un résultat ou une métrique. | 5 | Inconnu |
| 14 | « Je dois repasser à Word pour corriger la lettre. » | Prévoir une relecture et une édition simples si le parcours existant le permet ; tester le nombre de corrections nécessaires avant d’en faire une promesse. | 3 | Inconnu |
| 15 | « Le suivi ne me fera pas penser à relancer. » | Dire précisément que le CRM enregistre le statut ; ne pas appeler cela un rappel tant qu’un rappel effectif n’est pas vérifié. | 3 | Inconnu |
| 16 | « Je n’ai pas le budget pour payer plusieurs mois d’avance. » | Comparer un pass court et un pass 90 jours dans un test distinct ; garder le total payé évident, sans renouvellement caché. | 4 | Inconnu |
| 17 | « Et si l’IA échoue ou consomme un quota sans résultat ? » | Définir le traitement des échecs, les limites et le support avant vente ; ne pas facturer un résultat technique inachevé selon des conditions explicites. | 4 | Inconnu |
| 18 | « Et si je paie puis décide que ça ne m’aide pas ? » | Conditions de remboursement et droits de rétractation validés juridiquement ; aucune garantie discrétionnaire chiffrée sans modèle de coût. | 4 | Inconnu |

La liste prioritaire est **transparence des données, démonstration de valeur, périmètre et traitement du score**. Des bonus cosmétiques ne résolvent aucun de ces freins.

## Stack proposé — hypothèse, pas offre en vente

### Nom

**Pass Candidature 90 jours** — nom descriptif, encore à tester.

### Noyau

Le candidat ajoute un CV et une offre. JobTracker compare les contenus, présente le score d’adéquation et les sous-scores ATS disponibles, relève les mots-clés détectés/manquants, propose des améliorations à confirmer par le candidat, produit une lettre basée sur le CV et l’offre, puis permet d’enregistrer le statut de candidature.

### Prix envisagé

**39 € en paiement unique pour 90 jours**, uniquement comme variable de test face à 29 € pour une offre strictement identique. Le prix, la durée et le paiement ne sont pas disponibles dans l’application aujourd’hui.

### Bonus

**Aucun bonus ajouté.** Le contexte CV partagé et le suivi sont des éléments du parcours central, pas des bonus prouvés. Le nombre de candidatures, les générations incluses et les éventuels services humains doivent être fixés après mesure du coût et vérification des limites techniques.

### Garantie, urgence et rareté

- **Pas de garantie commerciale ajoutée** dans cette version : coût de remboursement, cadre juridique et fréquence de réclamation sont inconnus. Les droits légaux des consommateurs s’appliquent indépendamment de cette proposition et doivent être vérifiés avant toute vente.
- Pas de promesse de passage ATS, d’entretien, d’emploi, de gain de temps déterminé ni de qualité parfaite de lettre.
- Aucune urgence ou rareté artificielle. Pas de lot « limité » sans capacité réelle qui le justifie.

### Conditions bloquantes avant un test payant

1. Définir explicitement quotas et unités facturées ; aucune formule « illimitée » sans mesure des coûts.
2. Mesurer le coût d’analyse, de lettre, de régénérations, de stockage et de support sur plusieurs usages réalistes.
3. Vérifier les capacités live, les flux de données CV et les options de suppression.
4. Implémenter et contrôler les conditions de paiement, d’annulation, d’échec, de remboursement et les obligations légales.
5. Tester la qualité sur des exemples avec consentement, sans réutiliser les CV pour cette étude commerciale.

## Équation de valeur — estimation qualitative avant / après

Échelle estimée de 1 à 10. Pour « temps », 10 signifie résultat plus rapide ; pour « effort », 10 signifie moins d’effort demandé. **Ce ne sont pas des scores issus du panel ni des mesures du produit.** Avant = promesse du pitch initial ; après = crédibilité de la proposition plus étroite.

| Dimension | Pitch initial | Offre resserrée | Pourquoi |
|---|---:|---:|---|
| Résultat désiré | 7 | 6 | De « candidature prête » à un livrable concret CV/offre/lettre/suivi ; pas d’issue d’embauche. |
| Probabilité perçue | 2 | 3 | Sous-scores et parcours sont vérifiables dans le code ; aucune preuve d’usage ni qualité mesurée. |
| Rapidité | 8 | 4 | L’ancienne promesse « dix minutes » n’était pas mesurée ; le délai est maintenant explicitement à mesurer. |
| Effort faible | 8 | 5 | Le contexte CV partagé peut limiter la ressaisie ; import, configuration, relecture et apprentissage restent à mesurer. |

**Lecture :** la version resserrée est moins séduisante sur le papier, mais elle réduit les promesses invérifiées. Le levier le plus important n’est pas une garantie : c’est une démonstration crédible qui peut augmenter la probabilité perçue et mesurer le temps/effort. La promesse initiale ne doit pas être rétablie sans données.

## Re-test synthétique de l’offre

L’ancien texte est archivé dans `pitch-v1.md`. Le nouveau texte est dans `pitch.md`, et le panel distinct est dans `panel-offer-v2/` pour ne pas écraser les réponses initiales.

| Panel simulé | Achat simulé | Refus | Seed |
|---|---:|---:|---:|
| Offre précédente (`panel/`) | 3/20 (15 %) | 17/20 | 428 |
| Offre resserrée (`panel-offer-v2/`) | 2/20 (10 %) | 18/20 | 428 |

**Conclusion : le taux simulé n’a pas progressé ; baisse de 1 personne sur 20.** Ne pas conclure que l’offre est moins bonne ou que la demande réelle est de 10 %. Même seed = mêmes personas, mais les réponses proviennent de nouvelles générations de modèles ; les instructions de reprise différaient aussi. Comparaison non causale et très petite.

Dans le nouveau panel : **11 refus classés « trust »**, contre 7 précédemment ; 3 « habit » contre 6 ; 2 « convenience » contre 1 ; 2 « price » contre 3. Le signal qualitatif converge : le traitement des CV, la confiance dans le score et la preuve de qualité sont des blocages plus importants que le prix seul. Les catégories sont celles choisies par les agents et ne sont pas un codage humain indépendant.

Extrait de refus synthétique, pas un témoignage client :

> « Je ne l’achèterais pas à 39 € : je doute déjà des scores ATS, et le score proposé repose sur des critères propres à JobTracker. Les mots-clés et la lettre pourraient m’aider, mais l’offre ne dit pas assez pour me convaincre de lâcher mon tableur. » — P006, panel simulé.

Ce qui aurait fait évoluer les refus : explication claire du stockage et de la suppression du CV, démonstration courte sur CV/offre, lettre réaliste et limites d’usage visibles. **Ne pas fabriquer d’avis vérifiables** : les personas ont proposé des avis comme condition, mais aucun avis réel n’existe dans ce dossier.

## Suite recommandée

Avant de refaire le panel, ne pas réécrire une autre promesse. D’abord valider en interne le parcours réel et le coût, puis montrer la démonstration à de vrais candidats consentants en entretiens — sans prétendre que cela valide le paiement. Le premier test commercial doit attendre les conditions bloquantes listées ci-dessus.

Prochaine étape du pack : `founder-cfo`. Il ne pourra chiffrer aucune marge tant que le fondateur n’a pas fourni coûts, frais, charges et limites. Ne pas créer `numbers.json` avec des nombres hypothétiques présentés comme réels.
