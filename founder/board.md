# Board — JobTracker

**Vote : 2 FUND IF, 1 PASS — score moyen 3,7/10.**

| Lentille | Score | Vote |
|---|---|---|
| Offres | 4/10 | FUND IF |
| Monopole | 3/10 | PASS |
| Produit | 4/10 | FUND IF |

Le board ne s'accorde pas, et c'est normal : deux membres jugent qu'un produit de niche payant est possible, un membre juge que ce ne sera jamais une entreprise défendable. Les deux lectures portent sur des questions différentes.

## 1. Les risques que plusieurs membres ont soulevés (par ordre de gravité)

**a. Le couloir existe déjà, gratuitement.** Les trois lentilles disent la même chose différemment : neuf étapes enchaînées ne font pas un moment, et ce parcours se refait aujourd'hui avec ChatGPT et un tableur, sans payer. La lentille Monopole ajoute la conséquence : incrémental ⇒ compétition ⇒ marge nulle. C'est le risque numéro un, et il ne se règle pas en ajoutant une fonctionnalité.

**b. Rien ne prouve que le produit vaut quelque chose.** Zéro client, zéro témoignage, zéro instrumentation, zéro code de paiement (faits vérifiés). Aucun membre ne peut répondre à « est-ce que ça marche ? » : la donnée n'existe pas. La lentille Offres en tire la conclusion brutale — sans preuve, seul le prix reste comme argument, et une offre qui ne se distingue que par le prix est une commodité.

**c. Le coût marginal monte, le prix n'existe pas.** La clé OpenAI serveur unique fait porter le coût IA à l'éditeur (fait vérifié), sans prix décidé ni coût par candidature mesuré (données manquantes). Chaque utilisateur gratuit coûte avant de rapporter. La lentille Monopole classe ce risque comme le plus dangereux parce qu'il est structurel et invisible tant qu'il n'y a pas d'usagers.

**d. Des coutures visibles, dont une qui mente.** L'onboarding réclame une clé OpenAI que le code ignore ; l'ingestion est en `mock` par défaut ; le script de démonstration demande de cacher la page Sources « Coming soon ». C'est le premier contact : il enseigne que le produit raconte n'importe quoi.

**Écart entre les membres.** La lentille Monopole vote PASS sur la question « est-ce une entreprise défendable à dix ans ? ». Les lentilles Offres et Produit votent FUND IF sur la question « est-ce qu'un client paie pour ça dans les 30 jours ? ». Un PASS sur la première n'annule pas un FUND IF sur la seconde : cela signifie que le projet doit être jugé comme un produit de niche rentable, pas comme une ambition de monopole. Ne pas fusionner les deux verdicts.

## 2. Conditions fusionnées — checklist vérifiable

**Bloquantes avant tout euro encaissé**

1. **Une phrase, un moment.** Écrire dans `docs/product.md` une phrase sans énumération, et nommer le moment exact où l'utilisateur obtient la valeur. Tant que ce n'est pas écrit, le reste est de la décoration.
2. **Zéro couture mensongère.** Supprimer le champ « clé OpenAI » de l'onboarding ; retirer la page Sources de la navigation tant qu'elle n'est pas réelle ; rendre un chemin d'ingestion réel utilisable par défaut.
3. **Un moyen de paiement actif.** Un seul prix affiché à la fois. Test recommandé : pass 9 € contre 19 €/mois, jamais trois offres en parallèle.
4. **Coût unitaire mesuré.** Coût IA + hébergement par candidature complète, prix au minimum au triple de ce coût (hypothèse de marge, pas un chiffre du brief).
5. **Instrumentation minimale.** Activation (CV importé + une offre analysée + une lettre générée) et retour en semaine 2, avant de recruter qui que ce soit.
6. **Garantie sur un livrable, jamais sur une issue.** Exemple : « si la lettre contient une expérience absente de ton CV, remboursé ». Aucune promesse d'entretien ou de passage ATS.
7. **10 paiements réels, hors réseau, avant toute nouvelle fonctionnalité.** Si 0/10 sur 100 visiteurs qualifiés, le verdict devient PASS.

**À traiter ensuite, pas dans les 30 jours**

8. Un segment chiffré et sourcé, assez petit pour qu'un solo en prenne une part dominante.
9. Un canal de distribution nommé, avec un coût d'acquisition estimé pour les 100 premiers utilisateurs.
10. Un actif qui s'améliore avec l'usage (catalogue ATS enrichi, corpus d'offres françaises, lettres), non copiable en un trimestre.
11. Une réponse écrite à « qu'est-ce qui tient dix ans alors que le client part après six mois ? », avec un marché adjacent nommé.

## 3. La version la plus solide que le board voit

Ce n'est pas ce qui est pitché aujourd'hui, et il faut le dire clairement.

> **« En dix minutes, une offre française devient une candidature prête : ton CV aligné sur ce que l'ATS lit, un score expliqué ligne par ligne, et une lettre qui ne contient rien que tu n'aies réellement fait — puis la suite du suivi au même endroit. »**

Le produit vendu n'est donc pas « un CRM de candidature » ni « neuf étapes réunies », mais **un moment : la candidature prête, crédible, en dix minutes**. Le corridor devient le moyen, pas la promesse. L'acheteur n'est pas « les PO/PM » mais **un cadre de 28 à 42 ans en transition vers un rôle produit, en recherche depuis huit semaines ou plus, sur le marché français** — celui dont la douleur est dense, répétée et solvable. Le prix est un pass court, jamais un abonnement annuel. Et l'actif défendable est le seul déjà présent dans le code : **un score ATS déterministe et explicable**, là où les concurrents rendent une note opaque.

Reste la question que le board ne peut pas trancher : ce moment vaut-il 9 € ou 19 € pour quelqu'un qui n'a plus de salaire ? Aucune donnée ne permet de répondre aujourd'hui. C'est exactement ce que le test terrain doit acheter.

## 4. Suite

Prochaine étape du pack : `/founder-competitors` pour cartographier qui est déjà là et à quel prix, ou `/founder-consumer` pour mettre cette promesse devant un panel simulé de 20 acheteurs et récolter les objections. Le panel ne validera ni la demande ni un taux de conversion — il sert à réécrire la promesse, pas à la prouver.
