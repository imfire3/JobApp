# Direction artistique — landing JobTracker

**Date :** 28/10/2026  
**Portée :** page publique `/` uniquement. Le parcours de participation reste un courriel prérempli vers le contact déjà présent dans le projet ; aucune inscription n’est simulée.

## Recherche UI UX Pro Max

Skill chargé depuis `.opencode/skills/ui-ux-pro-max/SKILL.md` et recherches lancées avec ses scripts locaux :

- `career SaaS editorial trustworthy --design-system` propose un pattern « Hero + Features + CTA ». Son résultat de style est Glassmorphism, avec une palette bleue/orange et Plus Jakarta Sans. Le verre dépoli et cette palette générée ne sont pas retenus : ils contredisent le brief, et l’application possède déjà une identité documentée.
- `minimalism editorial --domain style` retourne **Minimalism & Swiss Style** (résultat actif) : grille fonctionnelle, hiérarchie typographique, espace blanc et interactions discrètes. C’est la référence de composition retenue.
- Les recherches `font loading`, `responsive image lazy loading` et `bundle performance` avec `--stack nextjs` recommandent `next/font` pour une nouvelle police, `next/image` pour les images et d’éviter un coût de bundle inutile. La landing garde la famille Avenir Next déjà déclarée, sans téléchargement de police ; son visuel étant une illustration HTML/CSS, elle ne charge pas de capture ni de script d’image.

Les résultats du skill sont des recommandations, pas la source de vérité produit. Aucun `design-system/*/MASTER.md` préexistant n’a été trouvé ; la palette documentée dans `docs/audit/design-system-audit.md` et les tokens existants de `app/globals.css` sont conservés. L'utilisateur a demandé d'éviter toute couleur verte : la mint `--brand` (#00d492) est donc exclue de la landing et remplacée par l'action primaire noire déjà imposée par l'application. Le brief Framer plus ancien disait « pas de vert » sans proposer d'alternative ; la nouvelle version remplace le vert complètement.

## Direction et tokens

« Un espace de travail clair pour faire avancer sa recherche d’emploi » : composition éditoriale asymétrique, titres Avenir Next, documents lisibles, règles fines et surfaces sans ombre décorative.

La palette utilise les rôles sémantiques limités à `.landing-page` dans `app/globals.css`. L'accent d'action est `#0a0a0a` (`--landing-accent`), sans aucun vert comme `--brand`, `--success` ou équivalent.

- encre `#111` et papier `#eceae6` ;
- document blanc et fond secondaire `#f5f3ef` ;
- accent action `#0a0a0a` pour les CTA, aligné sur le Figma ;
- repère de confirmation `#ffb900`, sans vert ;
- lignes, texte secondaire et surfaces sombres à contraste vérifié.

Ces tokens ne changent pas les valeurs du thème authentifié. Le CTA est un rectangle à rayon modéré, plutôt qu’une pilule décorative. Aucun dégradé, verre, mouvement d’entrée ou jauge de score n’est ajouté.

## Composition

1. **Hero asymétrique** : proposition et actions à gauche ; pile de documents fictifs à droite. Sur mobile, le texte et les actions précèdent l’aperçu.
2. **Problème** : bloc éditorial court, séparé par une règle, sans collection d’icônes.
3. **Parcours** : trois étapes dans une grille simple, transformée en lecture verticale sur petit écran.
4. **Démonstration** : lecture de l’offre et du CV côte à côte, puis piste et point à confirmer. La mention précise que ce n’est pas une liaison automatique garantie par l’interface.
5. **Score et lettre** : explication compacte des critères internes ; aide de relecture présentée comme une liste, pas un faux panneau interactif.
6. **Participation, FAQ, contact** : CTA réel par `mailto:hello@jobtracker.app`, accordéons natifs et lien de contact existant.

Les captures déjà présentes dans `public/landing/` n’ont pas été réutilisées : le dépôt ne permet pas de garantir qu’elles sont exemptes de données candidates. Les deux aperçus sont des compositions HTML fictives avec données explicitement fictives.

## Accessibilité et performance

- Composant rendu côté serveur, aucune dépendance ni font distante ajoutée.
- Aucune image ou animation permanente dans le parcours critique.
- Liens d’ancrage réels, skip-link, détails FAQ natifs, cibles tactiles de 44 px minimum et focus visible.
- Préférence `prefers-reduced-motion` prise en charge ; aucun contenu n’attend une animation pour apparaître.
- Les pages légales/confidentialité n’existant pas dans les routes vérifiées, aucun lien fictif n’est ajouté au pied de page.

## Validation navigateur

- Captures examinées : hero et démonstration à 375 px et 1440 px ; contrôles aussi à 768, 1024 et 720 px (équivalent de largeur CSS à 200 % sur un viewport de 1440 px).
- Pas de débordement horizontal ; titre, CTA et ancres restent dans le viewport. L’ancre `Exemple` amène le titre en haut de la zone visible.
- FAQ ouverte au clavier ; focus visible de 2 px. `prefers-reduced-motion: reduce` est reconnu et aucun élément ne dépend d’une animation.
- CTA vérifiés comme liens `mailto:` et aucune requête d’écriture n’est émise au chargement. La page ne charge aucune image.
- Contraste calculé du CTA principal : 7,73:1.
- Le navigateur local signale une requête `GET /favicon.ico` en 404 ; aucun favicon existant n’a été trouvé. Aucun faux logo n’a été ajouté pour masquer ce manque.
- Le bouton de trace de prompts global a été masqué uniquement sur `/` car il recouvrait la landing ; il reste présent sur les autres routes.

Contrôles du projet : build Next.js réussi et ESLint ciblé sur la page réussi. `npm run lint` reste bloqué par la configuration existante (« react-hooks » plugin manquant). `npm test` : 300 tests réussis, 11 échecs préexistants dans les tests de prompts et de scoring, hors périmètre landing.
