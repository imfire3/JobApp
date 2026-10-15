# Audit d'accessibilité — JobTracker

**Norme de référence :** WCAG 2.2, niveaux A et AA
**Date :** 15/10/2026
**Méthode :** analyse statique du code source (`app/`, `components/`), calcul des contrastes depuis les tokens `oklch` de `app/globals.css`, greps ciblés. Aucun test dynamique (navigateur, lecteur d'écran, zoom) n'a été exécuté — voir § « Non vérifiables statiquement ».
**Fichiers modifiés :** aucun (phase d'audit).

---

## 1. Synthèse

| Sévérité | Nombre |
|---|---|
| **P0** — bloquant | 9 |
| **P1** — critique | 30 |
| **P2** — important | 15 |
| **P3** — amélioration | 6 |
| **Total** | **60** |

### Défauts systémiques

1. **89 `<Label>` sans `htmlFor`** sur 20 fichiers (A11Y-015) — anomalie la plus répandue.
2. **Focus supprimé sans alternative** dans 3 composants de saisie (A11Y-003/004/005).
3. **Contrastes cassés par les opacités arbitraires** sur la landing (7 sélecteurs sous le seuil, dont 1 à 1,11:1).
4. **Aucun `prefers-reduced-motion`** dans tout le dépôt alors que la landing anime en boucle.
5. **Aucun lien d'évitement** et **aucun `<main>`** sur les pages auth/onboarding.
6. **5 widgets ARIA maison** (tablist, listbox, combobox, calendrier, disclosure) réimplémentent des primitives `components/ui/*` qui gèrent déjà le focus et la navigation clavier.
7. **Aucun outil d'a11y** dans `package.json` (pas de `eslint-plugin-jsx-a11y`, pas d'`@axe-core/playwright`).

---

## 2. Anomalies P0 — bloquantes

### A11Y-001
- **PAGE :** Accueil (landing)
- **COMPOSANT :** Surtitre « Extension Chrome — optionnelle »
- **CATÉGORIE :** Contraste
- **DESCRIPTION :** `text-[#111]/5` à `components/landing/landing-page.tsx:587` → ratio **1,11:1** sur fond clair : texte quasi invisible.
- **IMPACT UTILISATEUR :** Le contenu est illisible pour tout le monde, a fortiori en déficience visuelle.
- **CRITÈRE :** WCAG 1.4.3 (4,5:1)
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** Passer à une valeur d'opacité ≥ 55 % (`text-[#111]/60`) ou à `text-muted-foreground`.
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** Calcul de ratio (WebAIM Contrast Checker) + vérification visuelle.

### A11Y-002
- **PAGE :** Toutes les pages authentifiées
- **COMPOSANT :** Shell applicatif
- **CATÉGORIE :** Navigation clavier / 2.4.1
- **DESCRIPTION :** Aucun lien d'évitement vers `<main>` : 0 occurrence dans le projet (`app/layout.tsx`, `components/layout/app-shell.tsx:84`).
- **IMPACT UTILISATEUR :** Au clavier/lecteur d'écran, il faut traverser toute la sidebar à chaque page.
- **CRITÈRE :** WCAG 2.4.1 (A)
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** Ajouter un `<a href="#main" class="sr-only focus:not-sr-only">Aller au contenu</a>` en tête de `AppShell` et `id="main"` sur `<main>`.
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** Tab depuis le haut de page → le lien devient visible et saute au contenu.

### A11Y-003
- **PAGE :** Offres (`/jobs`)
- **COMPOSANT :** JobFilterMenu / JobDateFilter / FilterSelect
- **CATÉGORIE :** Focus visible
- **DESCRIPTION :** `outline-none` sans aucune variante `focus-visible` sur les 3 déclencheurs (`components/dashboard/job-filters.tsx:100`, `:206`, `:300`).
- **IMPACT UTILISATEUR :** Impossible de savoir quel filtre est focus au clavier.
- **CRITÈRE :** WCAG 2.4.7 + 1.4.11 (AA)
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** Réutiliser le pattern `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2` déjà présent ailleurs, ou passer les déclencheurs sur `ui/button`.
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** Navigation Tab + capture de l'anneau de focus.

### A11Y-004
- **PAGE :** Connexion (`/login`, mode CV)
- **COMPOSANT :** Textarea « Coller mon CV »
- **CATÉGORIE :** Focus visible
- **DESCRIPTION :** `border-0 … focus-visible:ring-0` → aucun indicateur de focus (`app/login/login-client.tsx:845`).
- **IMPACT UTILISATEUR :** Champ long et critique : l'utilisateur perd le point d'insertion visuel.
- **CRITÈRE :** WCAG 2.4.7 + 1.4.11
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** Restaurer une bordure ou un ring au focus (`focus-visible:ring-2 focus-visible:ring-ring`).
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** Tab sur le champ, vérifier l'indicateur.

### A11Y-005
- **PAGE :** Profil & CV, onboarding
- **COMPOSANT :** ChipInput (compétences)
- **CATÉGORIE :** Focus visible
- **DESCRIPTION :** `border-none focus-visible:ring-0` (`components/profile/chip-input.tsx:128`).
- **IMPACT UTILISATEUR :** Composite de chips au clavier sans repère de focus.
- **CRITÈRE :** WCAG 2.4.7 + 1.4.11
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** Indicateur de focus sur le conteneur (ring ou bordure).
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** Tab + saisie/suppression de chips au clavier.

### A11Y-006
- **PAGE :** Entreprises
- **COMPOSANT :** CompanyCard — bouton corbeille
- **CATÉGORIE :** Nom accessible (4.1.2)
- **DESCRIPTION :** `<Button size="icon">` ne contenant qu'un `<Trash2>` aria-hidden, sans `aria-label` (`components/companies/company-card.tsx:64-77`). Seul bouton icône seul non nommé du projet.
- **IMPACT UTILISATEUR :** Le lecteur d'écran annonce « bouton » sans action ; suppression destructive incompréhensible.
- **CRITÈRE :** WCAG 4.1.2 (A)
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** `aria-label="Supprimer l'entreprise {nom}"` + confirmation (voir UX-004).
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** VoiceOver : le bouton annonce son intitulé.

### A11Y-007
- **PAGE :** Sources — formulaire de recherche
- **COMPOSANT :** MultiValueInput (bouton de suppression d'étiquette)
- **CATÉGORIE :** Nom accessible + cible
- **DESCRIPTION :** Bouton sans nom (icône `<X>` aria-hidden) **et** cible 16×16 px (`components/sources/source-search-form.tsx:61-66`).
- **IMPACT UTILISATEUR :** Action invisible au clavier/lecteur d'écran et difficile à viser au doigt.
- **CRITÈRE :** WCAG 4.1.2 + 2.5.8 (24×24 min)
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** `aria-label="Retirer {valeur}"`, zone cliquable ≥ 24 px (padding ou `min-h-6 min-w-6`).
- **EFFORT :** S
- **MÉTHODE DE VALIDATION :** VoiceOver + mesure de la boîte cliquable.

### A11Y-008
- **PAGE :** Offres (cartes)
- **COMPOSANT :** JobCard — checkbox de sélection
- **CATÉGORIE :** Nom accessible
- **DESCRIPTION :** `<Checkbox>` sans nom accessible, imbriquée dans un conteneur `role="link"` focusable (`components/dashboard/job-card.tsx:98-102`).
- **IMPACT UTILISATEUR :** Sélection multiple inutilisable au lecteur d'écran ; risque d'activer le lien au lieu de cocher.
- **CRITÈRE :** WCAG 4.1.2 + 1.3.1
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** `aria-label="Sélectionner {titre}"` sur la checkbox + stopPropagation du clic ; vérifier l'ordre de focus.
- **EFFORT :** M
- **MÉTHODE DE VALIDATION :** Clavier : Tab → cocher sans suivre le lien ; VoiceOver nom complet.

### A11Y-009
- **PAGE :** Onboarding produit / Welcome gate
- **COMPOSANT :** Overlay onboarding
- **CATÉGORIE :** Modale / piège de focus
- **DESCRIPTION :** `fixed inset-0 z-[60]` sans `role="dialog"`, sans `aria-modal`, sans piège de focus ni fermeture Échap (`components/product-onboarding/onboarding.tsx:39`) — seul composant du projet qui n'utilise pas Base UI Dialog.
- **IMPACT UTILISATEUR :** Le focus part derrière l'overlay ; le lecteur d'écran ne sait pas qu'une modale est ouverte ; Échap inopérant.
- **CRITÈRE :** WCAG 4.1.2, 2.4.3, 2.1.2
- **SÉVÉRITÉ :** P0
- **CORRECTION PROPOSÉE :** Migrer sur `components/ui/dialog.tsx` (Base UI) qui fournit focus trap, Échap et `aria-modal`.
- **EFFORT :** M
- **MÉTHODE DE VALIDATION :** Test clavier : Tab boucle dans la modale, Échap ferme, le focus revient au déclencheur.

---

## 3. Anomalies P1 — critiques

> Champ **PAGE** déduit du composant parent.

### Contrastes (landing et 2 composants internes)

| ID | PAGE | COMPOSANT / LOCALISATION | DESCRIPTION (ratio) | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| A11Y-010 | Landing | Mentions légales `landing-page.tsx:756` | `text-[#111]/45` = **2,99:1** | 1.4.3 | `text-[#111]/70` ou token `muted-foreground` | S | Calcul ratio |
| A11Y-011 | Landing | Numéros d'étapes `:320` | `text-[#111]/45` = **2,99:1** | 1.4.3 | idem | S | Calcul ratio |
| A11Y-012 | Landing | Surtitres/preuves/légendes/footer `:244,261,448,602,706,711` (6 occ.) | `text-[#111]/55` = **4,07:1** | 1.4.3 | `text-[#111]/70` | S | Calcul ratio |
| A11Y-013 | Landing | Caption mock navigateur `:285` | `text-white/40` sur `#111` = **3,82:1** | 1.4.3 | `text-white/70` | S | Calcul ratio |
| A11Y-014 | Extension | Taille de fichier `extension-guide.tsx:61` | `text-muted-foreground/70` = **4,04:1** | 1.4.3 | Supprimer l'opacité | S | Calcul ratio |
| A11Y-039 | Profil & CV | Sections non actives `candidate-profile-form.tsx:494` | `text-muted-foreground/60` = **3,30:1** | 1.4.3 | `text-muted-foreground` ou /80 | S | Calcul ratio |

**Impact commun :** texte secondaire illisible ou limite sous le seuil légal pour les utilisateurs malvoyants.
**Catégorie :** Contraste. **Sévérité :** P1.

### Association label / champ (défaut systémique)

| ID | PAGE | COMPOSANT / FICHIERS | DESCRIPTION | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| A11Y-015 | 20 fichiers formulaires | top : `tracked-search-form-page.tsx` ×15, `source-search-form.tsx` ×12, `cv-experiences-card.tsx` ×9, `general-settings-form.tsx` ×7, `job-filters.tsx` ×7, `experience-dialog.tsx` ×6 | **89 `<Label>` sans `htmlFor`** : libellés non associés aux champs | 1.3.1, 3.3.2 | Ajouter `id` + `htmlFor` (ou `<label>` englobant) sur chaque champ | M | Clavier + lecteur d'écran : le label est annoncé à la focus |
| A11Y-016 | Recherche IA | Textarea « Consigne » `research-page.tsx:316-321` | Aucun libellé (placeholder seul) | 3.3.2 | `<Label htmlFor>` + aria-describedby si aide | S | idem |
| A11Y-017 | Détail offre / Lab | Textareas lettre + reformulation `job-detail-page.tsx:1290`, `job-detail-lab-page.tsx:928,1042` | Aucun libellé associé | 3.3.2 | `<Label>` visible ou `aria-label` | S | idem |
| A11Y-018 | Onboarding métiers | Champ « Autre » `metiers-page.tsx:331` | `id="other-role"` sans `<Label htmlFor>` | 3.3.2 | Associer le label existant | S | idem |
| A11Y-019 | Connexion | `<input type="file">` `login-client.tsx:753-756` | `sr-only` sans `<label htmlFor="cv-pdf">` → contrôle sans nom | 4.1.2 | `<label htmlFor="cv-pdf" class="sr-only">` | S | VoiceOver |
| A11Y-020 | Candidatures | `<Label>Statut</Label>` + `<Select>` `applications/page.tsx:525-539, 633-647` | Non associés (formulaire de création **et** panneau latéral) | 1.3.1 | `id`/`htmlFor` sur les 2 endroits | S | Clavier |
| A11Y-021 | Compte / Sources | `<Label>` + `<Switch>` en fratrie `general-settings-form.tsx:181-187`, `source-detail-page.tsx:181-187` | Interrupteur non associé : nom absent, label non cliquable | 1.3.1 | Envelopper le Switch dans le label ou `id`+`htmlFor` | S | Clavier + VoiceOver |
| A11Y-035 | Connexion / Inscription | Validation `login-client.tsx:252,385,525,529,649…` | Erreurs uniquement via `toast.error` : aucun `aria-invalid`, aucun `aria-describedby` vers un message | 3.3.1, 4.1.2 | `aria-invalid` + `aria-describedby` vers un message inline (`role="alert"`) | M | VoiceOver : l'erreur est annoncée avec le champ |
| A11Y-040 | Profil & CV / Offres | `<select>` natifs `profile-page.tsx:1151`, `education-entries-card.tsx:148,162,181,196`, `experience-card-form.tsx:252,262,287,297`, `experience-form.tsx:338,348,373,383`, `tracked-search-form.tsx:199` | Contrôles sans `id` ni `aria-label`, label voisin sans `htmlFor` (« Début », « Fin », niveau de langue…) | 4.1.2, 1.3.1 | `id` + `htmlFor` (ou migration vers `ui/select`) | M | VoiceOver |

**Catégorie :** Formulaires. **Sévérité :** P1.

### Widgets ARIA maison (à remplacer par `components/ui/*`)

| ID | PAGE | COMPOSANT | DESCRIPTION | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| A11Y-022 | Profil & CV | Tablist personnalisée `profile-page.tsx:919-947` | Roving tabindex **sans navigation aux flèches** : impossible de changer d'onglet au clavier | 2.1.1 | Migrer sur `ui/tabs` (Base UI gère le roving) | M | Clavier : ← → changent d'onglet |
| A11Y-023 | Profil & CV | Onglets `profile-page.tsx:933-937` | `aria-controls` pointant vers **aucun élément** | 4.1.2, 1.3.1 | Corriger les ids ou migrer vers `ui/tabs` | S | Inspection du DOM |
| A11Y-024 | Offres (vue Suivi) | Kanban `job-kanban.tsx:184-250` | Cartes `draggable` sans `onKeyDown` : **changer de colonne est impossible au clavier** | 2.1.1 | Actions alternatives (menu « Déplacer vers… ») sur chaque carte | M | Clavier : déplacer une carte sans souris |
| A11Y-025 | Profil & CV | Calendrier date de naissance `date-of-birth-field.tsx:245-316` | `role="dialog"` sans `aria-modal`, sans piège de focus, sans Échap ; jours nommés « 15 » sans date complète ; `aria-selected` absent | 4.1.2, 2.4.3, 2.1.2 | Migrer sur une primitive date (Base UI) ou compléter l'ARIA | M | Clavier + VoiceOver |
| A11Y-026 | Onboarding produit | Pastilles `onboarding.tsx:67-77` | `<span role="tab">` non focusables dans un `role="tablist"`, aucun `aria-controls` | 1.3.1, 4.1.2 | Boutons focusables ou `ui/tabs` | S | Tab sur les pastilles |
| A11Y-027 | Offres | JobFilterMenu `job-filters.tsx:93-127` | `aria-expanded` sans `aria-haspopup`/`aria-controls` ; menu = `<div>` sans `role` ; cases visuelles sans `aria-checked`/`aria-pressed` | 4.1.2, 1.3.1 | Migrer sur `ui/dropdown-menu` avec items à cocher | M | Clavier + VoiceOver |
| A11Y-028 | Offres | JobDateFilter / FilterSelect `job-filters.tsx:214-240, 309-335` | `<ul role="listbox">` avec `<li>` non neutralisés, options tabulables une à une, aucune navigation flèches, listbox sans nom | 1.3.1, 2.1.1, 4.1.2 | Migrer sur `ui/select` | M | Clavier complet |
| A11Y-029 | Offres / Profil | Comboboxes maison `searchable-multi-select.tsx:157-175,283-304`, `city-combobox.tsx:95-112,143-153`, `chip-input.tsx:129-155` | `aria-autocomplete`/`aria-expanded` mais **sans `role="combobox"` ni `aria-controls`** ; `<li>` non neutralisés ; `aria-selected={false}` codé en dur (`city-combobox.tsx:105`) ; pas de flèches | 4.1.2, 1.3.1, 2.1.1 | Compléter le pattern ARIA (liste de propriétés) **ou** migrer vers une primitive | L | Clavier + VoiceOver |
| A11Y-030 | Détail offre (lab) | Disclosure d'analyse `job-detail-overview.tsx:223-227` | Bouton d'ouverture sans `aria-expanded`/`aria-controls` | 4.1.2, 1.3.1 | Ajouter les 2 attributs + `id` de panneau | S | VoiceOver |

**Sévérité :** P1 (A11Y-024 bloquant pour le clavier).

### Landmarks, sémantique, titres

| ID | PAGE | COMPOSANT | DESCRIPTION | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| A11Y-031 | `/login`, `/onboarding/*` | `components/auth/auth-card-shell.tsx:21` | **Aucun `<main>`** sur les pages d'authentification et d'onboarding | 1.3.1 | Envelopper le contenu dans `<main>` | S | Inspecteur landmarks |
| A11Y-032 | Profil, Compte | `profile-page.tsx:875`, `settings-form.tsx:276` | `<header>` imbriqué dans des `<div>` → landmarks `banner` implicites en doublon avec `mobile-nav.tsx:20` | 1.3.1 | Utiliser un `<div>` pour les en-têtes de page internes (le `banner` global est porté par le shell) | S | Inspecteur landmarks |
| A11Y-033 | Toutes pages app | `sidebar.tsx:48`, `mobile-nav.tsx:41` | `<nav>` sans `aria-label` alors que plusieurs `<nav>` coexistent | 1.3.1 | `aria-label="Navigation principale"` / `"Navigation mobile"` | S | VoiceOver rotor nav |
| A11Y-034 | Connexion / Inscription | `login-client.tsx:886, 1018` | **Aucun `<h1>`** : le titre est porté par `CardTitle` qui est une `<div>` (`ui/card.tsx`) | 1.3.1 | Titre en `<h1>` (via la prop `asChild` ou un `<h1>` explicite) | S | Outline des titres |
| A11Y-043 | Onboarding métiers / api-keys | `metiers-page.tsx`, `api-keys-page.tsx` | **Aucun niveau de titre** sur la page | 1.3.1 | Ajouter `<h1>` + hiérarchie | S | Outline des titres |
| A11Y-044 | Compte | `ai-prompts-panel.tsx:261`, `ats-keywords-panel.tsx:130` | Titres de section portés par `CardTitle` (`<div>`) → structure de titres absente | 1.3.1 | Rendre `CardTitle` sémantique (`<h3>` par défaut, configurable) ou titres explicites | M | Outline des titres |
| A11Y-052 | Desktop | `mobile-nav.tsx:20` + `app-shell.tsx:84` | `<header>` en `md:hidden` → **sur desktop aucun landmark `banner`** | 1.3.1 | Déplacer le `<header>` hors de la condition mobile | S | Inspecteur landmarks |

### Autres P1

| ID | PAGE | COMPOSANT | DESCRIPTION | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| A11Y-036 | Global (landing) | `app/globals.css:151-190` | **Zéro `@media (prefers-reduced-motion)`** dans le dépôt ; `landing-drift 8s ease-in-out infinite` en boucle | 2.3.3, 1.4.12 | Bloc `@media (prefers-reduced-motion: reduce)` neutralisant les keyframes + utilitaires `motion-reduce:` | S | DevTools : simuler « Réduire les animations » |
| A11Y-037 | Connexion | `ui/tabs.tsx:76` + `login-client.tsx:751,815` | `outline-none` sur `TabsContent` (panneau focusable) → le focus disparaît au changement d'onglet | 2.4.7 | Supprimer l'`outline-none` ou ajouter `focus-visible:ring` | S | Tab après changement d'onglet |
| A11Y-038 | Offres (import groupé) | `tracked-jobs-page.tsx:733-745` | Message de progression mis à jour en continu **sans `role="status"`/`aria-live`** | 4.1.3 | `role="status"` (polite) sur le conteneur ; throttle des annonces | S | VoiceOver pendant l'import |
| A11Y-048 | Landing (dialog démo) | `demo-request-dialog.tsx:79` | `placeholder:text-[#111]/40` = **2,62:1** (mais P2 au final : placeholder) | 1.4.3 | `text-[#111]/60` minimum + labels visibles (voir A11Y-015) | S | Calcul ratio |

---

## 4. Anomalies P2 — importantes

| ID | PAGE | COMPOSANT | DESCRIPTION | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| A11Y-041 | Divers | Boutons de suppression d'étiquette `source-search-form.tsx:61`, `searchable-multi-select.tsx:198-205`, `chip-input.tsx:101-107`, `experience-card-form.tsx:366`, `experience-form.tsx:456` | Cibles **14 à 20 px** < 24 px | 2.5.8 | Padding/taille minimale 24 px | S | Mesure boîte cliquable |
| A11Y-042 | Offres (code mort) | JobTable `job-table.tsx:94-97` | `<TableRow onClick>` sans `tabIndex`/`onKeyDown` (composant non référencé) | 2.1.1 | Supprimer le composant ou le corriger avant réutilisation | S | Clavier |
| A11Y-045 | Extension | URL Chrome `extension-guide.tsx:110-114` | `<Input readOnly>` sans libellé | 1.3.1, 3.3.2 | `aria-label="URL de l'extension"` | S | VoiceOver |
| A11Y-046 | Recherche IA | Groupe « Sources » `research-page.tsx:437-439` | `<Label>` seul : **0 `<fieldset>` dans le projet** pour regrouper des cases | 1.3.1 | `<fieldset>` + `<legend>` ou `role="group"` + `aria-labelledby` | S | VoiceOver |
| A11Y-047 | Landing | FAQ `landing-page.tsx:631-646` | `aria-expanded` sans `aria-controls` ni `id` de panneau | 4.1.2 | Ajouter `aria-controls` + `id` | S | VoiceOver |
| A11Y-049 | Profil & CV | Nav interne de sections `candidate-profile-form.tsx:474-505` | `aria-current="page"` au lieu de `aria-pressed`/`role="tab"` ; inactif en `muted-foreground/60` (cf. A11Y-039) | 4.1.2, 1.4.3 | `aria-pressed` ou `role="tab"` + contraste corrigé | S | VoiceOver |
| A11Y-050 | Offres | JobFiltersBar `job-filters.tsx:93,195,360,376,387,409,418,433` | `<Label>` sans `htmlFor`, et `htmlFor="posted-within-days"` pointant vers un `<button>` | 1.3.1, 3.3.2 | Corriger les associations (dans le lot A11Y-015) | S | Clavier |
| A11Y-051 | Global | Thème `app/layout.tsx:27-31` + `globals.css` | `<html className="dark">` écrit en dur alors que les réglages proposent une bascule claire (`general-settings-form.tsx:152`) → **contrastes en mode clair non vérifiés, comportement incertain** | 1.4.3, 1.4.11 | Confirmer dynamiquement ; si le mode clair est officiel, auditer les 7 sélecteurs de la landing en clair | M | Bascule thème en navigateur + recalcul des ratios |
| A11Y-053 | Profil & CV | Calendrier `date-of-birth-field.tsx:265-276` | Jours de semaine en `<span>` (pas `<th scope="col">`), lettres ambiguës | 1.3.1, 2.4.6 | Tableau réel avec `<th scope>` et libellés explicites (« lundi ») | M | VoiceOver |
| A11Y-054 | Offres / Sources | Formulaires `tracked-search-form-page.tsx:377-565`, `source-search-form.tsx:45,130,138` | Libellés **en anglais** sur `lang="fr"` (`Job titles`, `Keywords`, `Search name`) | 3.1.2 (AAA) | Traduire en FR | S | Revue de copy |
| A11Y-055 | Offres / Candidatures | `job-card.tsx:77-95`, `applications/page.tsx:363-377` | `role="link"`/`role="button"` sur conteneurs nativement non focusables alors qu'un `<Link>` serait plus robuste (perte du clic milieu/menu droit) | 2.4.4, 2.1.1 | Préférer `<Link>` autour du titre + aires d'action distinctes | M | Clavier + clic milieu |

---

## 5. Anomalies P3 — améliorations

| ID | PAGE | DESCRIPTION | CRITÈRE | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|
| A11Y-056 | Modales | `<span class="sr-only">Close</span>` en anglais (`ui/sheet.tsx:75`, `ui/dialog.tsx:75`) | 3.1.2 | « Fermer » | S | VoiceOver |
| A11Y-057 | Connexion / Compte | « Email or username », « Password », « Saving… / Save settings » sur `lang="fr"` (`login-client.tsx:1028,1060`, `general-settings-form.tsx:234`) | 3.1.2 | Traduire | S | Revue de copy |
| A11Y-058 | Offres | « Selected / Current / Success / Failed / Idle » (`tracked-jobs-page.tsx:737-744`) | 3.1.2 | Traduire | S | Revue de copy |
| A11Y-059 | Navigation | Aucun `aria-current="page"` sur la destination active (`sidebar.tsx:53-64`, `mobile-nav.tsx:46-57`) — état communiqué par la seule couleur | 1.4.1, 1.3.1 | Ajouter `aria-current="page"` | S | VoiceOver |
| A11Y-060 | `/sources/[id]` | Pas de `<h1>` et contenu intégralement en anglais (route placeholder) | 1.3.1, 3.1.2 | Titre + copy FR | S | Outline + revue |

---

## 6. Constats globaux (hors anomalies individuelles)

- **Deux coquilles disjointes** : `AppShell` (avec `<main>`) vs `AuthCardShell` (sans `<main>`) — incohérence de landmarks.
- **Défaut de formulaire systémique** : validation par toast (correct pour l'annonce live, hérité de Sonner) mais aucun lien champ → message.
- **Zéro `<fieldset>`** dans le projet pour les regroupements de contrôles.
- **Bonne pratique à répliquer** : `applications/page.tsx:363-377` (article `role="button"` avec `aria-label`, `tabIndex`, `onKeyDown`, `focus-visible`) est correctement câblé ; lucide-react masque ses icônes par défaut ; les listboxes de `job-filters` ferment sur Échap et clic extérieur.
- **Code mort contenant des anomalies** : `job-board.tsx`, `job-table.tsx`, `marketing/landing-page.tsx`, `sortable-list.tsx` — non référencés mais source de régression si réintroduits.
- **Aucun outil d'a11y** dans `package.json` : rien ne se rejoue en CI.

---

## 7. Non vérifiables statiquement

Ces points ne sont **pas** comptés dans les 60 anomalies et devront être testés en navigateur :

1. **Reflow (1.4.10)** — `html { overflow-hidden }` + `body { h-full overflow-hidden }` (`app/layout.tsx:31-32`) et `AuthCardShell { h-dvh overflow-hidden }` : comportement à 200 %/400 % de zoom et à 320 px à confirmer (le défilement est délégué à `<main>`).
2. **Zoom texte (1.4.4)** — `overflow-x-auto` et `line-clamp` en contexte.
3. **Mode clair réel (A11Y-051)** — confirmer que la bascule « Clair » modifie bien la palette et re-contraster.
4. **VoiceOver / NVDA** — annonce réelle des toasts, `role="option"`, `role="link"`, `aria-invalid` absents.
5. **États hover/actif/désactivé/placeholder** perçus ; `border` (`white/10` = 1,24:1) et `input` (`white/15`) en 1.4.11 sur contrôles à bordure unique.
6. **Pièges de focus réels** — onboarding (A11Y-009), calendrier (A11Y-025), Dialogs/Sheets (retour du focus au déclencheur).
7. **Orientation (1.3.4)** — paysage mobile.
8. **Cibles en contexte (2.5.8)** — mesurer la boîte de clic effective (padding des ancêtres) des boutons d'A11Y-041.
9. **`inert` du fond** pendant l'onboarding.
10. **Cadence des annonces (4.1.3)** pendant l'import groupé.

---

## 8. Ordre de correction recommandé

1. Focus supprimé (A11Y-003/004/005) + contrastes landing (A11Y-001, 010-014) — effort faible, impact immédiat.
2. Skip-link (A11Y-002) + landmarks & `<h1>` (A11Y-031/032/033/034/043/044/052).
3. Association label/champ (A11Y-015 à 021, 035, 040, 050) — migration `id` + `htmlFor`.
4. Widgets ARIA maison (A11Y-022 à 030) — **remplacer par `components/ui/*`** plutôt que corriger.
5. `prefers-reduced-motion` (A11Y-036) + overlay onboarding (A11Y-009).
6. Verrouillage : `eslint-plugin-jsx-a11y` + `@axe-core/playwright`.
