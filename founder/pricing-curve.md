# Sensibilité au prix — sortie technique sur données synthétiques

## Avertissement de lecture — 28/10/2026

Les 20 réponses sont générées par des modèles, pas recueillies auprès de clients. Tous les montants ci-dessous sont des **euros pour le pass entier de trois mois** ; le symbole `$` est imposé par le formateur du script et ne représente ni une autre devise ni une conversion. Le prix 39 désigne une hypothèse testée, pas un prix actuellement encaissé.

Commande : `python3 .opencode/skills/founder-pricing/van_westendorp.py founder/panel/answers --price 39 --out founder/pricing-curve.md`.

La sortie brute est conservée ci-dessous. La commande seule ne reproduit pas cet avertissement ajouté après calcul. Les entrées et le script n’ont pas été modifiés.

### Pourquoi ne pas lire « optimal » littéralement

- `cross()` renvoie le premier point d’égalité, y compris sur un plateau où les deux courbes valent zéro. À 9,12 €, « trop bon marché » et « trop cher » valent tous deux zéro sur ces réponses ; cela ne démontre pas un maximum de revenu, de marge ou d’achat.
- Avec un pas de 0,01 au lieu du pas automatique, les points deviennent environ 9,01 / 45,00 / 9,01 / 20,01 € (PMC / PME / OPP / IPP). Les centimes de la sortie par défaut ne sont pas une précision économique.
- Les PMC et PME sont ceux de cette implémentation : intersections de « trop bon marché » avec le complément de « bon marché », puis du complément de « cher » avec « trop cher ». Ne pas les assimiler sans réserve à toutes les conventions Van Westendorp.
- L’IPP vers 20 € est une intersection descriptive de perceptions, pas une disposition réelle à payer. La « plage acceptable » est uniquement un résultat du script sur les scénarios synthétiques.
- Les quatre médianes ont été contrôlées séparément avec `statistics.median` : **5 / 19 / 39 / 69 €**. Elles coïncident ici avec les valeurs du script.
- Le prix de 39 € était visible dans tous les briefs : ancrage possible. Les réponses incluent des personas qui refusaient l’achat pour des raisons autres que le prix.
- L’offre montrée était illimitée. Un futur forfait plafonné est une offre différente : ces seuils ne la valident pas.

## Sortie brute du script

20 complete answers. Simulated buyers: use this to pick what to test, not as the final word.

| point | price | what it means |
| --- | ---: | --- |
| PMC | $9.12 | below this, too many think it is too cheap to be good |
| OPP | $9.12 | as many say too cheap as too expensive: the least resistance |
| IPP | $20.28 | as many call it a bargain as call it expensive |
| PME | $45.03 | above this, too many say it is too expensive to buy |

**Acceptable range: $9.12 to $45.03.**

Median answers: too cheap $5.00, a bargain $19.00, getting expensive $39.00, too expensive $69.00.

Your current price, $39.00, is **inside** the acceptable range.
