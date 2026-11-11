# Système de design JobTracker

Ce document décrit la correspondance entre les variables Figma « JobTracker V2 », les tokens Tailwind de `app/globals.css` et les composants partagés. Les écrans applicatifs utilisent les tokens `app-*`; les couleurs de la landing restent indépendantes.

## Couleurs sémantiques

| Rôle Figma | Token CSS / classe Tailwind | Valeur sombre | Usage |
| --- | --- | --- | --- |
| `Bg/Background` | `--app-bg` / `bg-app-bg` | `#0d0d0d` | Fond global de l’application; `--background` reste aligné dessus. |
| `Bg/Canvas` | `--app-canvas` / `bg-app-canvas` | `#0a0a0a` | Canevas local du Dashboard et fond d’anneaux de focus de cet écran. Ne remplace pas le fond global. |
| `Bg/Surface` | `--app-surface` / `bg-app-surface` | `#171717` | Cartes et surfaces secondaires. |
| `Bg/Control` | `--app-control` / `bg-app-control` | `#262626` | Champs, contrôles et surfaces imbriquées. |
| `Border/Default` | `--app-border-default` / `border-app-border-default` | `#595959` | Contours visibles et actions secondaires. |
| `Border/Control` | `--app-border-strong` / `border-app-border-strong` | `#525252` | Bordure standard des champs et contrôles. |
| `Border/Subtle` | `--app-border` / `border-app-border` | `#404040` | Séparateurs et contours de cartes. |
| `Text/Primary` | `--app-text` / `text-app-text` | `#fafafa` | Texte principal. |
| `Text/Strong` | `--app-text-strong` / `text-app-text-strong` | `#ffffff` | Titres, valeurs ou libellés à fort contraste. |
| `Text/Label` | `--app-text-label` / `text-app-text-label` | `#e5e5e5` | Libellés de page. |
| `Text/Secondary` | `--app-text-secondary` / `text-app-text-secondary` | `#a3a3a3` | Texte secondaire et focus. |
| `Text/Subtle` | `--app-text-subtle` / `text-app-text-subtle` | `#d4d4d4` | Descriptions et texte secondaire lisible. |
| `Text/Muted` | `--app-text-muted` / `text-app-text-muted` | `#737373` | Indications et espaces réservés. |
| `Text/Disabled` | `--app-text-disabled` / `text-app-text-disabled` | `#434343` | Contenu désactivé uniquement. |
| `Text/Inverse` | `--app-text-inverse` / `text-app-text-inverse` | `#0a0a0a` | Texte sur action claire. |
| `Action/Primary` | `--app-action` / `bg-app-action` | `#ffffff` | Action primaire. |
| `Action/Pressed` | `--app-action-hover` / `hover:bg-app-action-hover` | `#e5e5e5` | Survol/pression d’une action claire. |
| `Feedback/Success` | `--app-success` / `text-app-success` | `#09e280` | État de réussite; accompagner d’un libellé ou d’une icône. |
| `Feedback/Warning` | `--app-warning` / `text-app-warning` | `#ff6900` | Avertissement; ne pas coder le sens par la couleur seule. |
| `Feedback/Danger` | `--app-danger` / `text-app-danger` | `#f87171` | Erreur ou danger, toujours accompagné d’un libellé. |
| Correspondance | `--app-match` / `text-app-match` | `#6fafdc` | Score de correspondance, distinct du statut d’une offre. |
| Fond correspondance | `--app-match-surface` / `bg-app-match-surface` | `rgba(77,157,213,.15)` | Fond local du score de correspondance. |

Les valeurs clair/sombre des tokens sont déclarées ensemble dans `app/globals.css`. Les rôles de landing (`landing-*`) sont une palette marketing séparée et ne doivent pas être remplacés par les tokens d’application.

## Fichiers de référence

- Tokens, thèmes et liaison Tailwind v4 : [`app/globals.css`](../app/globals.css), bloc `@theme inline`.
- Primitives : [`components/ui/button.tsx`](../components/ui/button.tsx), [`input.tsx`](../components/ui/input.tsx), [`card.tsx`](../components/ui/card.tsx), [`select.tsx`](../components/ui/select.tsx), [`tabs.tsx`](../components/ui/tabs.tsx).
- Structure d’écran : [`components/layout/page-header.tsx`](../components/layout/page-header.tsx), [`sticky-page-header.tsx`](../components/layout/sticky-page-header.tsx) et [`app-shell.tsx`](../components/layout/app-shell.tsx).
- Patrons migrés : [`components/profile/candidate-profile-form.tsx`](../components/profile/candidate-profile-form.tsx), [`components/dashboard/dashboard-surface.tsx`](../components/dashboard/dashboard-surface.tsx), [`components/dashboard/job-card.tsx`](../components/dashboard/job-card.tsx) et [`components/jobs/tracked-jobs-page.tsx`](../components/jobs/tracked-jobs-page.tsx).

## Dimensions et composants partagés

- Champs `Input` : `variant="control"`, hauteur 50 px, rayon 8 px, trait 1,25 px. `date` garde son rayon 14 px pour les segments de date; `auth` reste dédié aux écrans d’authentification.
- Boutons : `size="control"` pour les actions d’écran; `size="icon-control"` pour une commande seule. Les couleurs et focus viennent des variantes partagées de `Button`.
- Cartes : `Card variant="app"` et `variant="inset"` pour les surfaces de l’application; le `Card` shadcn par défaut reste disponible pour les écrans non migrés.
- Onglets : `TabsList`/`TabsTrigger variant="section"` pour une navigation d’écran à pilule active. Les flèches déplacent le focus; Entrée/Espace active l’onglet (comportement Base UI par défaut).
- Select : `SelectTrigger variant="control"` lorsqu’il s’agit du select partagé. Les filtres Offres possèdent aussi des déclencheurs ancrés spécifiques; ils utilisent les mêmes tokens de dimensions et de couleurs.
- Statut et correspondance : le statut est toujours affiché en clair (ex. « Candidaté »); le score est une valeur chiffrée en pourcentage avec le libellé accessible « de correspondance ». Leur couleur n’est pas leur seul moyen de distinction.

### Exemples d’usage

```tsx
<Input variant="control" id="job-title" placeholder="Product Manager" />
<Button size="control">Enregistrer</Button>
<Button variant="outline" size="icon-control" aria-label="Aide" />

<TabsList variant="section">
  <TabsTrigger value="profile" variant="section">Informations personnelles</TabsTrigger>
</TabsList>
```

- L’onboarding emploie les `Input control`, les onglets `section` et une zone de contenu qui défile avant son pied d’actions : voir `candidate-profile-form.tsx`.
- Le Dashboard assemble ses cartes via `DashboardSurface`, `DashboardInset` et `dashboardCtaClassName`, au lieu de réintroduire une surface locale.
- Les filtres Offres utilisent `Input control` et partagent les mêmes hauteur, bordure, focus et couleurs que les autres contrôles.
- Les badges de `job-card.tsx` séparent la Correspondance (`app-match`) des métadonnées et le statut reste explicite dans le sélecteur.
- La section « Les attentes de l’offre face à ton CV » suit la référence Figma [`21:17584`](https://www.figma.com/design/oeAbsGSJMspH5kHOxqjf34/JobTracker-V2?node-id=21-17584) : intitulé et badge de statut côte à côte, chevron à droite, puis détail déplié avec l’extrait de l’offre, l’extrait du CV, une conclusion et l’action de précision. Le poids du critère est secondaire et reste dans le détail.
- L’onglet « Offre » suit la référence Figma [`21:18629`](https://www.figma.com/design/oeAbsGSJMspH5kHOxqjf34/JobTracker-V2?node-id=21-18629) : carte « Résumé du poste », ligne « Missions » / « Compétences recherchées », puis section « Mots-clés ATS » avec tableau (mot-clé, importance, occurrences, présence CV) et accordéon « Afficher l’offre originale ». Les cartes utilisent `Card variant="app"` ; les badges reprennent `app-success-surface` et `app-warning-surface`.

## Layout et grille

- **Pleine largeur :** `AppShell` occupe toute la largeur disponible à côté de la sidebar. Les pages applicatives n’utilisent pas `container`, `mx-auto` ni de `max-w-*` au niveau de leur conteneur principal.
- **Marges de page :** définies une seule fois par `AppShell` (`p-4 pb-8 md:p-6 md:pb-10 lg:px-12 lg:pt-8 lg:pb-12 xl:px-16`). Les en-têtes sticky (`PageHeader`, `StickyPageHeader`) compensent ces marges avec `-mx-*` pour s’étendre de bord en bord.
- **Retraits internes des cartes :** fournis par `--card-spacing` (16 px sur `Card variant="app"`, 12 px sur `variant="inset"`, 24 px sur la carte shadcn). `CardHeader` et `CardContent` appliquent déjà `px-(--card-spacing)` : ne remets pas `p-0` sur ces blocs, sauf bord à bord assumé et commenté (tableau ou bandeau qui doit toucher le bord). Le contenu d’une carte reste ainsi à l’aplomb de son titre.
- **Grille responsive :** les formulaires et filtres utilisent `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` (ou plus selon le nombre de champs) et s’empilent sur mobile. Les tableaux et pipelines trop larges défilent dans leur propre conteneur (`overflow-x-auto`) sans faire défiler la page elle-même.
- **Limites utiles :** une modale, un champ court, un paragraphe d’introduction (`max-w-2xl`/`max-w-3xl`) ou une colonne de tableau peut conserver une largeur interne. Une exception au niveau d’une page entière doit être justifiée par un commentaire.
- **Vérification :** `npm run check:page-layout` (serveur de dev requis) contrôle l’absence de débordement horizontal sur les pages principales et les pages de détail à 390, 768, 1440 et 1920 px.

### États à fournir

- **Pleine largeur :** à 390, 768, 1440 et 1920 px, `#main-content` et son conteneur direct occupent toute la largeur restante (`1184 px` à 1440 px, `1664 px` à 1920 px, sidebar de 256 px). La page ne défile jamais horizontalement : `documentElement.scrollWidth = clientWidth`.
- **Sidebar :** visible à partir de `md` (768 px), remplacée par `MobileNav` en dessous. Il n’existe pas d’état replié : un seul gabarit de 256 px, donc une seule mesure d’alignement à vérifier.
- **Grille :** `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` ou plus ; les colonnes se replient en une seule sous `sm`. Tableaux et pipelines restent dans leur conteneur (`TableContainer`, rail `overflow-x-auto`) qui défile à leur place.
- **Contenu d’écran :** `Skeleton` pendant le chargement, `EmptyState` quand une liste est vide, `ErrorState` en cas d’échec — les trois conservent les marges de page, sans colonne centrée ajoutée par la page.

## Exceptions et écarts Figma

- **Écrans sans sidebar (`AuthCardShell`) :** `/login` (dont `/onboarding`, qui redirige vers l’étape CV) ainsi que `/onboarding/profile`, `/onboarding/profileupdate`, `/onboarding/metiers` et `/onboarding/api-keys` gardent une colonne centrée bornée (`max-w-xl`, portée à 980 px sur le formulaire de profil). C’est une exception assumée à la règle de pleine largeur, documentée dans `components/auth/auth-card-shell.tsx`.
- `--background` global reste `#0d0d0d` (`Bg/Background`). Le `Bg/Canvas #0a0a0a` du Dashboard est un token local distinct afin de ne pas assombrir les autres écrans.
- Les couleurs des campagnes et sections marketing de la landing sont hors palette applicative.
- Le calendrier de naissance reste un calendrier de jours; la référence Figma consultée montre une grille d’années. Cet écart de comportement visuel est conservé jusqu’à décision produit.
- Les couleurs de statut métier existantes (statut envoyé, refus, etc.) peuvent utiliser leurs tokens sémantiques dédiés. Elles doivent garder leur texte descriptif et leur contraste.

## Contrôle des couleurs brutes

`npm run check:design-tokens` vérifie les écrans migrés Dashboard, Offres, détail d’offre et Candidatures. Il échoue si un composant de ces zones réintroduit un hex ou une couleur RGB littérale. `app/globals.css` (source des tokens) et la landing ne sont volontairement pas scannés.
