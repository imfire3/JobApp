# JobTracker — guide de session

JobTracker aide un candidat à importer des offres, exploiter son CV, évaluer la **Correspondance**, préparer lettres/messages et suivre ses candidatures. Stack : Next.js App Router, React/TypeScript, Tailwind v4, Supabase/RLS et OpenAI côté serveur.

## Lire avant de modifier

1. Toujours : `docs/product.md`, `docs/architecture.md`, `.cursor/rules/00-project.mdc` et `.cursor/rules/60-testing.mdc`.
2. UI : `.cursor/rules/20-ui.mdc`, `docs/design-system.md`, puis la primitive ou le composant déjà utilisé dans l’écran ciblé (`components/ui/`, `components/layout/`, `components/<domaine>/`).
3. Fonctionnalité : `docs/guide-fonctionnement-app.md`, la page `app/**/page.tsx`, son composant et les routes `app/api/**` qu’elle appelle.
4. Données, API ou migration : `.cursor/rules/40-database.mdc`, les migrations concernées et `lib/auth.ts`/clients Supabase avant toute écriture.

## Règles non négociables

- Vérifie `git status` et préserve tout travail existant. Modifie le plus petit périmètre utile, sans réécrire une page ni casser un parcours existant.
- Réutilise d’abord `components/ui` et `components/layout`. Ajoute une variante à une primitive si le besoin est partagé; crée un composant partagé seulement si la composition ou le comportement se répète.
- **Pleine largeur :** toute nouvelle page applicative utilise `AppShell` et occupe toute la largeur disponible à côté de la sidebar. Ne reprends pas de `container`, `mx-auto max-w-*` ou largeur fixe au niveau du conteneur de page. Une exception doit être explicite et documentée dans le code.
- Ne mets pas de secrets ni d’appels OpenAI dans le navigateur. Toute lecture/écriture utilisateur passe par une route serveur authentifiée et les politiques RLS; contrôle l’appartenance de la ressource.
- Préserve le parcours CV → offre → analyse/Correspondance → lettre préparée → candidature suivie. Les envois sont toujours manuels par le candidat.
- Préserve les comportements importants : profil partiellement rempli autorisé, sélection et actions groupées d’offres, filtres, statuts et données de candidature cohérents entre écrans.
- Valide types, tests, build et l’interface modifiée (responsive, clavier, focus, états). Distingue un problème préexistant d’une régression.

## Maintenance documentaire

Dans le même changement, mets à jour `docs/product.md` si un parcours ou une décision produit change, `docs/guide-fonctionnement-app.md` si le comportement constaté change, `docs/design-system.md` si une primitive/token évolue et `docs/architecture.md` si une frontière technique ou des données changent.

Les détails opérationnels sont dans `.cursor/rules/`; `AGENTS.md` reste l’index court chargé au début d’une session.
