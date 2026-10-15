# Plan d'action — Audit UX/Design System/Accessibilité JobTracker

**Date :** 15/10/2026
**Statut :** 🔴 **EN ATTENTE DE VALIDATION — aucune modification de code avant accord.**
**Sources :** `docs/audit/accessibility-audit.md` (60 anomalies A11Y), `docs/audit/product-design-audit.md` (31 anomalies UX), `docs/audit/design-system-audit.md` (27 anomalies DS).

---

## 1. Chiffres clés de l'audit

| Indicateur | Valeur |
|---|---|
| Anomalies identifiées | **118** (60 a11y + 31 UX + 27 DS) |
| dont P0 (bloquant) | **12** (9 A11Y + 3 UX) |
| dont P1 (critique) | **39** (30 A11Y + 7 UX + 2 DS) |
| dont P2 (important) | **45** |
| dont P3 (amélioration) | **22** |
| Duplications majeures identifiées | 16 (DS-001 → DS-016) |
| Couleurs hardcodées | 477 hex + 204 classes + 75 rgba |
| Composants morts détectés | 5 fichiers (`page-header`, `marketing/landing`, `job-board`, `job-table`, `sortable-list`) |
| Pages à migrer | 22 routes + 92 fichiers `components/` |
| Tests a11y automatisés existants | **0** |

---

## 2. Priorisation globale

### P0 — Bloquant (12)

| ID | Objet |
|---|---|
| A11Y-001 | Contraste 1,11:1 surtitre landing |
| A11Y-002 | Aucun lien d'évitement |
| A11Y-003 / 004 / 005 | Focus supprimé (job-filters, textarea CV, chip-input) |
| A11Y-006 / 007 / 008 | Boutons/checkbox sans nom accessible |
| A11Y-009 | Overlay onboarding sans `role="dialog"` ni focus trap |
| UX-001 | CTA → route `/imports` inexistante (404) |
| UX-002 | CTA « Copier-coller » auto-référent |
| UX-003 | Double CTA dashboard |

### P1 — Critique (39)

A11Y-010 → 040 (contrastes landing, 89 labels sans `htmlFor`, erreurs non rattachées, widgets ARIA maison, landmarks/titres, reduced-motion, aria-live d'import) · UX-004 → UX-010 · DS-003 (select natifs), DS-005 (listboxes), DS-006 (titres), DS-014 (formulaires profil dupliqués).

### P2 / P3 — 67 anomalies
Voir les fichiers d'audit respectifs.

---

## 3. Lots d'implémentation

> **Ordre revalué :** le lot 2 (Design Tokens) est monté **avant** le lot 1bis a11y « large » (labels, contrastes secondaires), car plusieurs corrections a11y passent par les tokens. Les P0 restent traités en tête, car indépendants.

### LOT 0 — Réparations de parcours (P0, prérequis produit)
*renommé depuis « LOT 1 » pour séparer le bloquant UX des chantiers structurels*

| | |
|---|---|
| **Objectif** | Débloquer les 3 ruptures de parcours P0 |
| **Problèmes** | UX-001, UX-002, UX-003 |
| **Composants** | `tracked-jobs-page`, `dashboard-overview` |
| **Fichiers** | `components/jobs/tracked-jobs-page.tsx:654,710` · `components/dashboard/dashboard-overview.tsx:91-97` · éventuellement nouvelle route `app/imports/` |
| **Dépendances** | Décision produit : créer la route `/imports` **ou** rediriger vers l'import collage existant (question § 6) |
| **Risques** | Casser le flux d'import — à tester de bout en bout |
| **Critères d'acceptation** | Aucun 404 depuis l'état vide des offres ; le bouton d'en-tête ouvre le bon flux ; 1 seul primary sur le dashboard |
| **Tests** | Parcours manuel : état vide → collage ; dashboard : un seul CTA dominant |

### LOT 1 — Accessibilité bloquante (P0 a11y)

| | |
|---|---|
| **Objectif** | Corriger les 9 P0 a11y à effort court |
| **Problèmes** | A11Y-001 à A11Y-009 |
| **Composants** | `landing-page`, `AppShell`, `job-filters`, `login-client`, `chip-input`, `company-card`, `source-search-form`, `job-card`, `product-onboarding/onboarding` |
| **Fichiers** | `components/landing/landing-page.tsx` · `components/layout/app-shell.tsx` · `components/dashboard/job-filters.tsx` · `app/login/login-client.tsx` · `components/profile/chip-input.tsx` · `components/companies/company-card.tsx` · `components/sources/source-search-form.tsx` · `components/dashboard/job-card.tsx` · `components/product-onboarding/onboarding.tsx` |
| **Dépendances** | A11Y-009 → migration sur `ui/dialog` (fait émerger le chantier DS-004) |
| **Risques** | Changement de markup de l'overlay d'onboarding (focus/animation) |
| **Critères d'acceptation** | Chaque P0 re-testé selon sa méthode de validation (voir audit) ; 0 régression visuelle sur la landing |
| **Tests** | Tab complet sur job-filters/textarea/chips ; VoiceOver sur les 3 boutons ; ratio ≥ 4,5:1 pour A11Y-001 |

### LOT 2 — Design Tokens

| | |
|---|---|
| **Objectif** | Centraliser couleurs, ombres, z-index, motion, typo — **sans changer l'identité visuelle** |
| **Problèmes** | DS-017 (9 tokens manquants), DS-018 à DS-021 (couleurs/opacités), DS-025 (typo) |
| **Composants impactés** | Tous (via `globals.css`), `badge`, `lib/jobs/utils.ts` |
| **Fichiers** | `app/globals.css` · `components/ui/badge.tsx` · `lib/jobs/utils.ts` (96-117) · `lib/jobs/job-detail-lab-model.ts` |
| **Dépendances** | Décision sur la portée : tokeniser les **doublons de tokens** (`#171717`,`#212121`,`#FAFAFA`,`#A1A1A1`,`#383838`) et les **accents de marque** (`#00D492`,`#FFB900`,`#111`,`#eceae6`) — **ne pas modifier les valeurs** |
| **Risques** | Régression visuelle si une valeur tokenisée dérive ; **application progressive recommandée** (créer les tokens + les nouveaux usages, remplacer les anciens par lots) |
| **Critères d'acceptation** | `--success/warning/info/brand` utilisés par les nouveaux composants ; `getStatusColor` basé sur des tokens ; `--font-landing-display` monté dans `@theme` ; capture avant/après identique |
| **Tests** | Diff de captures (landing, dashboard, badges statut) avant/après ; `npm run lint` + `npx tsc --noEmit` |

### LOT 3 — Composants UI réutilisables

| | |
|---|---|
| **Objectif** | Créer les 6 primitives manquantes **pour remplacer des duplications réelles** (pas d'abstraction décorative) |
| **Problèmes** | DS-008 (loading), DS-010 (empty), DS-011 (error), DS-007 (pills), DS-009 (skeletons), DS-003 (field) |
| **Nouveaux composants** | `ui/empty-state.tsx` · `ui/error-state.tsx` · prop `loading` sur `ui/button` (spinner + `aria-busy` + disabled) · variants `Badge` `status`/`score` · étoffer `ui/field.tsx` |
| **Fichiers** | `components/ui/*` · `docs/composants.md` (nouveau) |
| **Dépendances** | Lot 2 (tokens sémantiques pour les couleurs d'état) |
| **Risques** | Faible (ajoutatif) — ne rien supprimer dans ce lot |
| **Critères d'acceptation** | Chaque composant documenté (rôle, variantes, props, états, règles a11y, exemple) ; API typée ; focus-visible conforme |
| **Tests** | Tests unitaires sur `ui/button` (loading/disabled), `ui/badge`, `ui/empty-state` ; vérification a11y des noms accessibles |

### LOT 4 — Accessibilité structurelle (landmarks, labels, titres)

| | |
|---|---|
| **Objectif** | Corriger les défauts systémiques de sémantique et de formulaires |
| **Problèmes** | A11Y-015 → 021, 031 → 035, 040, 043 → 045, 050, 052, 059 (soit ~25 anomalies P1/P2) |
| **Composants** | `auth-card-shell`, `AppShell`, `sidebar`, `mobile-nav`, `sticky-page-header`, `Card` (`CardTitle` sémantique), + 20 fichiers de formulaires |
| **Fichiers** | principaux : `components/auth/auth-card-shell.tsx` · `components/layout/{app-shell,sidebar,mobile-nav}.tsx` · `components/ui/card.tsx` · `app/login/login-client.tsx` · `components/dashboard/job-filters.tsx` · `app/applications/page.tsx` · `components/profile/*` · `components/settings/*` · `components/jobs/tracked-search-form-page.tsx` · `components/sources/source-search-form.tsx` |
| **Dépendances** | Lot 3 (`field.tsx` si migration vers `Field`) ; décision : `<h1>` explicite **vs** `CardTitle asChild` |
| **Risques** | Volume (89 labels) — **migrer par dossier**, pas en un commit géant ; risque de régression de clic sur le label |
| **Critères d'acceptation** | 0 `<Label>` sans `htmlFor`/`id` (grep) ; `<main>` sur auth/onboarding ; `aria-current` dans la nav ; `aria-invalid`+`aria-describedby` sur la validation login ; hiérarchie H1-H6 propre (outil d'outline) |
| **Tests** | Grep de non-régression ; parcours clavier complet login → onboarding → dashboard ; VoiceOver sur 3 formulaires |

### LOT 5 — Migration des widgets ARIA maison

| | |
|---|---|
| **Objectif** | Remplacer les 5 réimplémentations (tablist, listbox, combobox, calendrier, disclosure) par les primitives déjà présentes |
| **Problèmes** | A11Y-022 → 030 · DS-005 · DS-004 (overlay) · partiellement DS-003 (select natifs) |
| **Composants** | `profile-page` (tabs), `job-filters` (menus/listbox), `searchable-multi-select`, `city-combobox`, `chip-input`, `date-of-birth-field`, `job-detail-overview` (disclosure), `product-onboarding/onboarding` |
| **Fichiers** | 8 fichiers listés + `components/ui/dropdown-menu.tsx`, `ui/select.tsx`, `ui/tabs.tsx`, `use-anchored-dropdown-style.ts` |
| **Dépendances** | Lot 1 (A11Y-009 déjà migré), Lot 3 si `combobox` s'avère nécessaire |
| **Risques** | **Le lot le plus risqué** : comportements métier (filtres, recherche multi-valeurs, chips) — migrer **un widget à la temps**, tester chaque flux |
| **Critères d'acceptation** | Navigation clavier complète (flèches, Échap, Entrée, Home/End) sur chaque widget ; ARIA conforme (role, aria-expanded/controls/activedescendant) ; aucun retour visuel perdu |
| **Tests** | Playwright clavier par widget ; axe-core sur les pages concernées |

### LOT 6 — Migrer les pages (dé-duplication + navigation)

| | |
|---|---|
| **Objectif** | Supprimer les doublons et harmoniser les pages, page par page |
| **Problèmes** | DS-001, DS-002, DS-006, DS-012 → DS-016, UX-014, UX-015, UX-016, UX-021/022 (tables) |
| **Ordre de migration** (par impact × risque) | 1. `settings/` (header + panneaux, UX-015) · 2. `dashboard/` (CTA, skeleton) · 3. `applications/` (table responsive) · 4. `companies/` (destructives Dialog, aria-label) · 5. `profile/` (DS-014 : extraire `experience/`) · 6. `jobs/` (DS-016 : extraire `detail/`) · 7. suppression des fichiers morts |
| **Fichiers** | `page-header.tsx` (suppr) · `marketing/**` (suppr) · `job-board.tsx` / `job-table.tsx` / `sortable-list.tsx` (suppr après vérif) · 11 pages `StickyPageHeader` · `experience-form`/`experience-card-form`/`experience-dialog` · `job-detail-page`/`job-detail-lab-page` |
| **Dépendances** | Lots 2, 3, 4, 5 (les tokens et composants doivent exister avant la migration) |
| **Risques** | Régressions fonctionnelles sur les formulaires profil et le détail offre — **ne modifier aucune règle métier** ; valider le sort de `job-board` (legacy EN) et de la landing `marketing` avec le produit |
| **Critères d'acceptation** | 0 duplication résiduelle des motifs listés (greps de DS-001/002/010) ; 1 seul `<h1>` par page et 1 seul traitement ; tables scrollables à 320 px ; logout accessible en mobile |
| **Tests** | Parcours complet par page après migration : visuel, interactions, responsive, a11y, régression métier ; `npm test` + `lint` + `tsc` + `build` |

### LOT 7 — Harmonisation typo / espacements / responsive

| | |
|---|---|
| **Objectif** | Échelle typographique et grille 8 px cohérentes, responsive vérifié |
| **Problèmes** | DS-023, DS-025, UX-021 → UX-031, A11Y-041 (cibles 24 px) |
| **Fichiers** | transversal : 23 `text-[Npx]`, 49 rounded arbitraires redondants, gaps `space-y-5`/`gap-5`, cibles 14-20 px |
| **Dépendances** | Lot 6 (migrer avant d'harmoniser, sinon double travail) |
| **Risques** | Dérive visuelle — **appliquer l'échelle sans toucher à la charte** ; exceptions documentées (`min-h-[44px]`, sr-only, switch) |
| **Critères d'acceptation** | 0 `text-[11px|13px|15px|30px]` résiduels ; 0 `rounded-[10px|18px|14px]` redondants ; gaps conformes à l'échelle sauf exceptions documentées ; cibles ≥ 24 px partout |
| **Tests** | Grep de non-régression ; captures 320/375/768/1024/1440 ; zoom 200 % |

### LOT 8 — Interactions, états et feedback

| | |
|---|---|
| **Objectif** | États complets et retours utilisateur uniformes |
| **Problèmes** | DS-001/DS-026 (états manquants), DS-008/DS-009, UX-004 (confirmations), UX-006, UX-009, UX-013, UX-016, A11Y-036 (reduced-motion), A11Y-038 (aria-live), UX-005/011/018/019 (copy FR) |
| **Fichiers** | `globals.css` (reduced-motion) · `dashboard-overview` · `research-page` · `company-card`/`company-detail-page`/`tracked-jobs-page` (Dialog destructif) · copy FR multi-fichiers |
| **Dépendances** | Lots 2, 3 (tokens + Button loading) ; décision produit sur le funnel onboarding (UX-008) et le fake-fill (UX-007) |
| **Risques** | Faible ; attention aux libellés métier traduits à l'arrache |
| **Critères d'acceptation** | `prefers-reduced-motion` neutralise les keyframes ; 0 `window.confirm` ; suggestions IA avec état vide/loading ; toutes les actions groupées annoncent leur progression (`role="status"`) ; 0 string EN dans l'UI FR (grep) |
| **Tests** | DevTools « réduire les animations » ; déclencher chaque suppression ; grep de copy |

### LOT 9 — Tests et verrouillage

| | |
|---|---|
| **Objectif** | Empêcher les régressions (a11y + design system) |
| **Actions** | `eslint-plugin-jsx-a11y` · `@axe-core/playwright` + 3-5 parcours E2E (login, import offres, création candidature, formulaire profil) · règles ESLint `no-restricted-syntax` (DS-027c) · tests unitaires `ui/*` · documentation finale |
| **Dépendances** | Lots 1-8 (sinon la CI part en rouge) |
| **Critères d'acceptation** | `npm run lint` vert avec les nouvelles règles ; axe-core sans violation P0/P1 sur les parcours clés ; baselines mesurables (56 boutons custom → 0, 477 hex → cible) |
| **Tests** | CI complète : `lint` + `tsc` + `npm test` + `build` + E2E a11y |

---

## 4. Dépendances entre lots

```
LOT 0 (parcours P0)          — indépendant, immédiat
LOT 1 (a11y P0)              — indépendant, immédiat
LOT 2 (tokens)               — prérequis de 3, 4 (couleurs), 7
LOT 3 (composants ui)        — prérequis de 4, 5, 6, 8
LOT 4 (sémantique/labels)    — après 3 ; volume → par dossier
LOT 5 (widgets ARIA)         — après 1 et 3 ; le plus risqué → un par un
LOT 6 (migration pages)      — après 2, 3, 4, 5
LOT 7 (typo/espacement)      — après 6
LOT 8 (interactions)         — après 2, 3 (partiellement parallèle à 6)
LOT 9 (tests/CI)             — progressive, finalisé en dernier
```

---

## 5. Critères d'acceptation globaux

1. **0 anomalie P0 ouverte**, P1 en cours de correction documentée.
2. `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` verts.
3. axe-core sans violation critique sur les 5 parcours E2E.
4. Grep de non-régression : 0 `<Label>` sans association, 0 `window.confirm`, 0 `prefers-reduced-motion` manquant, 0 `text-[11px|13px]`.
5. Rapport final avant/après (anomalies identifiées / corrigées / restantes, composants mutualisés, pages migrées, tests exécutés et **non exécutés**).

---

## 6. Questions nécessitant votre décision avant implémentation

1. **UX-001** : créer la route `/imports?paste=1` ou rediriger le CTA vers le flux d'import collage existant ?
2. **DS-013** : supprimer `components/marketing/landing-page.tsx` + `lib/marketing/landing-copy.ts` (i18n FR/EN) — le maintenir ou le jeter ?
3. **DS-016 / UX-014** : supprimer `job-board.tsx`, `job-table.tsx` (legacy EN) et `sortable-list.tsx` — confirmer qu'ils ne sont plus utilisés côté produit.
4. **UX-008** : le funnel onboarding doit-il inclure `metiers` et `api-keys` (alignement `docs/product.md`) ou les étapes sont-elles retirées du parcours ?
5. **Lot 2** : confirmer que tokeniser `#00D492` / `#FFB900` / `#111` / `#eceae6` **sans changer les valeurs** vous convient (pure centralisation).
6. **Lot 5** : acceptation du risque sur la migration des widgets ARIA maison (le chantier le plus sensible), widget par widget.
7. **Storybook** : évalué mais non recommandé actuellement (coût/ROI) au profit de `docs/composants.md` — OK ?

---

## 7. Ce qui n'a pas pu être vérifié

- Tests device réel (320 → 1920), zoom 200 %/400 %, lecteurs d'écran (VoiceOver/NVDA), mode clair réel, focus traps en navigateur, comportement des listboxes en runtime : **à réaliser en Phase 3** avec Playwright + vérifications manuelles documentées.
- `npm run build` / `next build` non exécutés pendant l'audit (lecture seule).
