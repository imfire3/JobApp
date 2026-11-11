# Lentille Produit
Score : 4/10 | Vote : FUND IF

## Ce qui est solide

Le score ATS est **déterministe et explicable** (fait vérifié : mots-clés 25 %, compétences 25 %, expérience 20 %, titre 15 %, outils 15 %, catalogue de plus de 1 300 lignes). C'est du travail que personne ne voit et qui décide de la qualité perçue : un chiffre qu'on peut contester, pas une note magique.

Même chose pour les garde-fous : ne pas inventer d'expérience, ancrer la lettre dans le CV et l'offre, ne promettre ni entretien ni passage ATS. Du goût appliqué au point le plus dangereux — quand une machine parle à la place du candidat. Et le parcours canonique est verrouillé : il existe un point de vue.

## Ce qui pourrait tuer le projet (les 3 risques principaux, le plus dangereux d'abord)

**1. Neuf étapes, aucun moment.** Import CV → parse → offre → extraction → ATS → mots-clés → suggestions → score → lettre → suivi. Ce n'est pas un produit, c'est un couloir. La lentille demande : quel instant précis fait dire « voilà pourquoi j'ai ouvert ça » ? Le brief ne le nomme nulle part. Or ce couloir, un candidat le fait déjà avec ChatGPT et un tableur, gratuitement. Neuf étapes à 70 %, aucune meilleure que quiconque : une commodité assemblée.

**2. Des coutures visibles, dont une qui ment.** Fait vérifié : l'onboarding réclame « sa clé OpenAI » alors que la clé serveur unique est utilisée et que celle de l'utilisateur est ignorée. Les cinq premières minutes enseignent que ce produit raconte n'importe quoi. Même famille : ingestion en `mock` par défaut, et un script de démo qui demande de **cacher** la page Sources. Cacher une couture n'est pas la réparer, c'est couper les coins où le client ne regarde pas encore.

**3. Le produit ne peut pas savoir s'il est bon.** Aucune instrumentation, aucun code de paiement (faits vérifiés). Impossible de trancher la seule question de cette lentille : le moment existe-t-il ? Sans mesure, chaque fonctionnalité est un pari d'opinion et le couloir s'allonge. La prospection en Phase A, contacts simulés, ajoute une surface que personne n'a demandée.

## Les questions que je poserais au fondateur

1. Le pitch en **une phrase**. Pas une liste.
2. Les **cinq premières minutes**, à la seconde : à quel instant l'utilisateur sourit-il ?
3. Trois des neuf étapes supprimées demain : lesquelles, et que reste-t-il de vendable ?
4. Laquelle des neuf un utilisateur paierait-il **seule** ? (Donnée manquante : aucune preuve de disposition à payer.)
5. Que voit l'utilisateur quand Apify, France Travail ou un extracteur casse ?

## Si FUND IF : les conditions

Vérifiables, dans cet ordre, avant tout nouvel investissement :

1. **Une phrase écrite**, sans énumération, publiée dans `docs/product.md`.
2. **Un seul moment nommé**, avec sa définition de réussite. Toute fonctionnalité hors de ce moment est gelée, prospection comprise.
3. **Zéro couture mensongère** : champ « clé OpenAI » supprimé ; page Sources retirée de la navigation tant qu'elle n'est pas réelle ; un chemin d'ingestion réel utilisable par défaut.
4. **Instrumentation minimale** du moment choisi avant toute nouvelle fonctionnalité — activation et retour à J+7.
5. **Test d'observation** sans assistance : nombre et seuil fixés par écrit *avant* le test (hypothèse, aucun chiffre dans le brief). Résultat consigné, échec inclus.
6. **Prix testé** sur ce parcours : rien ne peut être encaissé aujourd'hui, donc rien ne prouve que le moment vaut un paiement.

Tant que le point 1 n'est pas écrit, le reste est de la décoration.
