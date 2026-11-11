# Brief du board — JobTracker

Document autonome : les membres du board ne voient pas la conversation. Tout ce qui suit est vérifié, fourni, ou explicitement marqué comme hypothèse ou comme manquant.

## 1. L'idée

JobTracker est une application web de recherche d'emploi qui relie tout le cycle de candidature dans un seul produit : import du CV → analyse ATS → import d'une offre → extraction → mots-clés manquants → suggestions d'amélioration du CV → score d'adéquation → lettre personnalisée → suivi de la candidature. Le produit se présente comme un « CRM de candidature » plutôt qu'un simple tableau de suivi.

Cible déclarée : profils Product Owner / Product Manager, marché francophone. C'est une hypothèse de départ, pas un marché validé. Cible alternative à tester : cadres de 28 à 42 ans en transition vers des rôles produit/tech, en recherche active depuis 8 semaines ou plus.

Prix : non décidé. Produit aujourd'hui gratuit, aucun paiement implémenté. Hypothèses de test : pass court 9 €, 19 €/mois, 39 €/3 mois.

Ressources : fondateur solo. Budget, capacité hebdomadaire et date de lancement non fournis.

## 2. Faits vérifiés dans le dépôt (28/10/2026)

- Parcours canonique documenté et verrouillé par les règles du projet (import CV → parse → import offre → extraction → ATS → mots-clés → suggestions → score → lettre → suivi).
- Le score ATS est **déterministe** et explicable : mots-clés 25 %, compétences 25 %, expérience 20 %, titre 15 %, outils 15 %, avec un catalogue ATS interne de plus de 1 300 lignes. Ce n'est pas un simple appel à un modèle.
- Les appels IA utilisent une **clé OpenAI serveur unique** ; les clés fournies par l'utilisateur sont ignorées. Le coût IA est donc porté par l'éditeur.
- L'onboarding demande pourtant à l'utilisateur de saisir « sa clé OpenAI », alors qu'elle n'est plus utilisée : incohérence de parcours connue.
- **Aucun code de paiement** (ni Stripe, ni Paddle, ni abonnement) : le produit ne peut rien encaisser aujourd'hui.
- Ingestion d'offres : connecteurs France Travail et Apify (WTTJ, LinkedIn) existent, mais le mode par défaut reste `mock`. Le script de démonstration demande de ne pas montrer la page Sources, annoncée « Coming soon ».
- CRM de suivi des candidatures et prospection d'entreprises existent (prospection en Phase A, contacts simulés, envoi manuel uniquement, jamais automatique).
- **Aucune instrumentation produit** : pas d'analytics, donc aucune mesure d'activation ou de rétention disponible.
- Garde-fous produits : ne pas inventer d'expérience du candidat, ne pas promettre de passage ATS ni d'entretien, lettres ancrées dans le CV et l'offre.

## 3. Données manquantes (à ne jamais traiter comme nulles)

Utilisateurs actifs, clients payants, rétention, fréquence d'usage, prix pratiqué, chiffre d'affaires, coût IA réel par analyse, coût d'hébergement, coût de collecte d'offres, charge de support, conversion, coût d'acquisition, budget disponible, capacité de travail, date de lancement visée.

## 4. Marché : points de repère datés (relevés le 28/10/2026)

| Acteur | Prix relevé | Offre gratuite | Source |
|---|---|---|---|
| Teal+ | 13 $/semaine · 29 $/30 jours · 79 $/90 jours | Suivi illimité, CV, mots-clés limités | tealhq.com/pricing |
| Huntr Pro | 40 $/mois · 90 $/3 mois · 160 $/6 mois | 100 offres suivies, 2 CV adaptés | huntr.co/pricing |
| Rezi Pro | 29 $/mois · 149 $ à vie · 99 $/200 utilisateurs | 1 CV, 3 PDF | rezi.ai/pricing |
| Jobscan | non relevé (page non récupérable ce jour) | — | à vérifier |
| ChatGPT / Gemini | prix non affiché sur la page consultée | usage gratuit couvrant une partie du besoin | openai.com/chatgpt/pricing |
| Substituts | tableur, Notion, LinkedIn/WTTJ, extensions d'autofill | gratuits | usage courant |

Contexte de marché : les trois acteurs comparables offrent déjà une version gratuite généreuse ; leurs prix se situent entre 25 et 40 $ par mois ; deux d'entre eux vendent des durées courtes ou un paiement unique. Aucun n'est centré sur le marché français ni sur l'ingestion d'offres françaises.

## 5. Contraintes propres à la recherche d'emploi

- Le besoin est **temporaire** : la recherche se termine, l'usage aussi. Le churn élevé est structurel, pas un défaut d'exécution.
- Budget du candidat contraint, souvent sans revenu pendant la période.
- Données personnelles sensibles (CV, date de naissance, prétentions salariales) : la confiance conditionne l'essai.
- Les recommandations engagent le candidat : une lettre qui exagère ou invente une expérience détruit la relation.
- Dépendance aux sources d'offres : conditions d'utilisation, quotas d'API, coût par fournisseur, fragilité des extracteurs.
- Aucune promesse d'entretien, de recrutement ou de passage de filtre ATS ne peut être faite.

## 6. Ce que le board doit trancher

1. Y a-t-il un segment avec une douleur suffisante pour un usage régulier, et lequel ?
2. Le produit peut-il justifier un paiement face à un usage gratuit de ChatGPT et aux offres gratuites des concurrents ?
3. Quelle est la seule chose que ce produit doit faire mieux que quiconque ?
4. Qu'est-ce qui empêche une copie en six mois ?
5. Quelles conditions vérifiables doivent être remplies avant d'investir du temps ou de l'argent dans la suite du pack ?

## 7. Règles de production

- Distinguer fait vérifié, information fournie, hypothèse, estimation et donnée manquante.
- Ne pas inventer de concurrent, de prix, d'utilisateur, d'entretien, de témoignage ou d'indicateur.
- Les lentilles sont des résumés de cadres publiés : ne jamais parler au nom de leurs auteurs, ne jamais affirmer qu'ils approuveraient quoi que ce soit.
- Noter l'entreprise, pas le fondateur. Un PASS est un résultat, pas un échec.
