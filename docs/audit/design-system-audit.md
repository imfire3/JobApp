# Audit Design System & Composants — JobTracker

**Date :** 15/10/2026
**Méthode :** inventaire du code, comptages par grep sur `app/` et `components/`, analyse de `app/globals.css` et `package.json`.
**Fichiers modifiés :** aucun.

---

## 1. Architecture frontend

### 1.1 Stack

| Élément | Valeur |
|---|---|
| Framework | Next.js **16.2.10** (App Router), React **19.2.4**, TypeScript 5 |
| CSS | Tailwind **4** (`@tailwindcss/postcss`), **1 seul fichier** : `app/globals.css` (212 l.) |
| UI | shadcn CLI **4.13**, style **`base-nova`**, baseColor `neutral`, `cssVariables: true`, icônes lucide |
| Primitives | **`@base-ui/react` 1.6** (pas Radix) |
| Styling | `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` |
| Toast / thème | `sonner`, `next-themes` |
| Utilitaire | `cn()` dans `lib/utils.ts:4` ✅ |
| Hooks partagés | **dossier `hooks/` absent** alors que `components.json` déclare l'alias `@/hooks` ; seul hook : `ui/use-anchored-dropdown-style.ts` (4 fichiers) |
| Storybook / doc composants | **aucun** (0 `*.stories.*`, `docs/` = docs produit uniquement) |
| Tests UI | `npm test` = tests node sur `lib/**/*.test.ts` → **0 test de composant** ; **0 outil a11y** dans `package.json` |

### 1.2 Volumétrie

- `app/**/*.tsx` : **25 fichiers** — `components/**/*.tsx` : **92 fichiers** — **27 966 lignes** tsx.
- Quasi toutes les pages sont des wrappers à 1 import vers un composant feature.
- **61 / 117** fichiers tsx importent un `components/ui/*` ; **56 n'en importent aucun** (dont `landing/landing-page.tsx`, `page-header.tsx`).
- Dossiers par LOC : `profile/` 6230 · `jobs/` 5834 · `settings/` 3045 · `dashboard/` 2392 · `ui/` 1559 · `companies/` 1296 · `onboarding/` 1247 · `sources/` 1050 · `landing/` 983 · `research/` 620 · `product-onboarding/` 500 · `marketing/` 354 · `layout/` 354 · `extension/` 262 · `cv/` 151 · `auth/` 35.

### 1.3 `components/ui/` (21 fichiers, 1559 lignes)

| Composant | Usages (hors ui) | Statut |
|---|---|---|
| `button.tsx` | **173** | ✅ vivant, cva — **mais 11 variants/sizes et pas de prop `loading`** |
| `label.tsx` | **215** | ✅ — mais 89 sans `htmlFor` (A11Y-015) |
| `card.tsx` | 96 `<Card>` / 30 fichiers | ✅ — `CardTitle` est une `<div>` (cause A11Y-034) |
| `badge.tsx` | **106** | ✅ — variant `tag` = hex hardcodés (l.38) |
| `input.tsx` | 112 | ✅ |
| `select.tsx` | 28 | ✅ |
| `dialog.tsx` | 10 / 9 fichiers | ✅ |
| `textarea.tsx` | 31 | ✅ |
| `switch` / `checkbox` | 17 / 17 | ✅ |
| `skeleton.tsx` | 26 / 7 fichiers | ⚠️ sous-utilisé (19 `animate-pulse` custom) |
| `tabs.tsx` | 9 | ⚠️ (les vrais tablists sont maison) |
| `table.tsx` | 4 | ⚠️ faible |
| `field.tsx` | 25 / 5 fichiers | ⚠️ pour 215 `<Label>` |
| `dropdown-menu.tsx` | **3 / 2 fichiers** (268 lignes de primitive) | ⚠️ quasi inutilisé alors que 5 listboxes maison existent |
| `sheet.tsx` | 2 | ⚠️ |
| `separator.tsx` | 4 | ⚠️ |
| `tooltip.tsx` | **0** `<Tooltip>` (seul `TooltipProvider` global) | ⚠️ |
| `native-select.ts` | **0** `<NativeSelect>` (seules les helpers sont importées) | ⚠️ demi-mort |
| `use-anchored-dropdown-style.ts` | 4 fichiers | ✅ sous-utilisé |

### 1.4 `components/layout/` (6 fichiers, 354 lignes)

| Fichier | Usages | Statut |
|---|---|---|
| `app-shell.tsx` | 16 | ✅ socle |
| `sidebar.tsx` / `mobile-nav.tsx` / `nav-items.ts` | via app-shell | ✅ |
| `sticky-page-header.tsx` | **11 fichiers** | ✅ **l'en-tête réellement utilisé** |
| `page-header.tsx` (+ `StickyFooter`) | **0** | ❌ **mort** (51 l.) |

### 1.5 Composants réutilisables vs spécifiques page

- **Réutilisables (≥2 parents) :** `app-shell` 16 · `sticky-page-header` 11 · `page-help-button` 11 · `searchable-multi-select` 7 · `job-scoring-progress` 6 · `auth-card-shell` 4 · `cover-letter-modal` 4 · `company-labels` 4 · `kpi-cards`/`job-filters`/`job-card`/`job-bulk-actions` 2 · `date-of-birth-field`/`candidate-profile-form` 2 · `cv-analysis-panel`/`cv-experiences-card` 2 · `nav-items` 2 · `steps` 2.
- **Spécifiques page (1 seul parent) : 39 fichiers**, dont `profile-page.tsx` (1616 l.), `job-detail-page.tsx` (1348), `job-detail-lab-page.tsx` (1170), `login-client.tsx` (1090), `cv-optimize-page.tsx`, `research-page.tsx`, `sources/*`, `companies/*`.

---

## 2. Duplications détectées (DS-001 → DS-016)

| ID | CATÉGORIE | PREUVES (comptages réels) | DESCRIPTION / IMPACT | CORRECTION PROPOSÉE | EFFORT | PRIORITÉ |
|---|---|---|---|---|---|---|
| DS-001 | Boutons | **56 `<button>` hors `ui/button`** dans 23 fichiers (top : `job-filters` ×7, `searchable-multi-select` ×5, `language-entries-field` ×5) ; **5/56 seulement ont un `focus-visible`**, 26 sans aucun hover | Styles recopiés : `px-3 py-2 rounded-full font-medium` ×12, bloc `text-[#FAFAFA] hover:bg-[#171717]` ×4, trio `focus-visible:outline-[#111]` ×5 | Repasser sur `<Button>` (variant `ghost-subtle` à créer si besoin) | M | P2 |
| DS-002 | Cartes | **165 motifs `rounded-{xl,2xl,lg,md} border`** hors ui (dont ~52 dans `ui/*`) ; `profile-page.tsx` recrée `<section class="rounded-2xl border border-border bg-[#171717] p-6">` **×5** (l.955,1034,1053,1199,1447) alors que `<Card>` existe | Décalage visuel latent si le token `--radius`/`--card` bouge | `<Card>` systématique + 28 overrides `Card className` nettoyés (dont 4 `rounded-2xl` redondants) | M | P2 |
| DS-003 | Champs | **25 `<select>` natifs** (experience-form ×8, experience-card-form ×7, education-entries-card ×4, tracked-search-form ×4, metiers ×4, profile ×1) vs **28 `<Select>` shadcn** | Deux familles de contrôles, styles divergents (A11Y-040) | Convertir vers `ui/select` ou rétablir `<NativeSelect>` (0 usage actuel) | M | P1 |
| DS-004 | Modales | 1 overlay 100 % maison `product-onboarding/onboarding.tsx:39` (A11Y-009) ; 0 `aria-modal` dans le projet ; 1 seul `role="dialog"` (`date-of-birth-field`) ; **8 fichiers gèrent `Escape` à la main** | Modale inaccessible + logique dupliquée | Migrer sur `ui/dialog` (A11Y-009) | M | P0 |
| DS-005 | Listboxes / menus | 5 fichiers avec `role="listbox"/"option"` (15 occ.) : `job-filters`, `profile-page`, `chip-input`, `city-combobox`, `searchable-multi-select` ; 3 recréations du style `SelectContent` (`profile-page.tsx:1100`, `experience-form.tsx:497` ≡ `experience-card-form.tsx:406`) ; `dropdown-menu` utilisé 3 fois | Le plus gros vivier d'inaccessibilité (A11Y-027/028/029) + duplication | Unifier sur `ui/select` / `ui/dropdown-menu` + `use-anchored-dropdown-style` | L | P1 |
| DS-006 | Titres de page | **22 `<h1>`**, **6 classes différentes** : `text-2xl font-bold tracking-tight` ×15, `text-3xl font-bold` ×2 (settings, profil — incohérent), `text-2xl font-semibold` ×1, `text-[30px]` ×1, `onboarding-step` ×1, landing ×1 | Hiérarchie de titres à 6 vitesses | Slot `title`/`description`/`actions` sur `StickyPageHeader` (11 pages déjà dessus) | M | P1 |
| DS-007 | Badges / pills | `<Badge>` ×106 vs **53 `rounded-full bg-/px-/border-`** maison dans 20 fichiers | Doubles systèmes de pastilles | Ajouter des variants à `Badge` (`status`, `score`, `chip`) | M | P2 |
| DS-008 | Spinners | **29 `animate-spin`** ad-hoc (motif `mr-2 h-4 w-4 animate-spin` ×11, `mr-1.5 h-3.5 w-3.5` ×4, variantes ×4) ; **0 composant Spinner** ; **pas de prop `loading` sur Button** | Pas de standard d'état de chargement | Prop `loading` sur `ui/button` (spinner + `aria-busy` + disabled) | M | P2 |
| DS-009 | Skeletons | 19 `animate-pulse` dans 11 fichiers dont `<Card class="h-56 animate-pulse">` ×2 ; `<Skeleton>` seulement 26 usages / 7 fichiers | Patterns de chargement divergents | Utiliser `<Skeleton>` partout | S | P2 |
| DS-010 | Empty states | **81 mentions** `aucun/aucune` dans 26 fichiers ; **0 composant EmptyState** ; **11 blocs `border-dashed … text-center`** recréés dans 6 fichiers (motifs identiques ×3 : `rounded-lg border-dashed px-3 py-6` et `rounded-xl border-dashed p-10 space-y-4`) | Aucune cohérence des états vides | Créer `ui/empty-state.tsx` (icon + titre + description + CTA) | M | P2 |
| DS-011 | Error states | `text-destructive` dans 12 fichiers / 11 occurrences ; **0 composant ErrorState**, messages serveur bruts (UX-013) | Retours d'erreur hétérogènes | `ui/error-state.tsx` + mapping des codes erreur | M | P2 |
| DS-012 | En-têtes de page | `page-header.tsx` **0 usage** (mort) vs `sticky-page-header` ×11 ; `<header>` dans le mobile-nav en doublon | Code mort + landmarks en double (A11Y-032/052) | Supprimer `page-header.tsx`, enrichir `sticky-page-header` | S | P2 |
| DS-013 | Landings dupliquées | `components/landing/landing-page.tsx` **771 l. utilisée** vs `components/marketing/landing-page.tsx` **354 l. morte** (+ `lib/marketing/landing-copy.ts` 7 Ko + son test) — la morte référence `--font-marketing-sans` **jamais définie** | Dette de 1100+ lignes, vars orphelines | Supprimer l'ensemble `marketing/` (si l'i18n FR/EN n'est pas requis) | S | P2 |
| DS-014 | Formulaires profil dupliqués | `experience-form.tsx` ↔ `experience-card-form.tsx` : **145 lignes identiques, Jaccard 0.54** ; `education-dialog` ↔ `education-card-form` (43 l.) ; `cv-experiences-card` ↔ `education-entries-card` (38 l.) ; **27 copies** du bloc `border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] text-[#FAFAFA]` | Le dossier `profile/` (6230 l.) est le plus dupliqué | Extraire `profile/experience/` (`ExperienceFields`, `ExperienceRow`, `ExperienceMenu`) réutilisé par les 3 entrées | L | P1 |
| DS-015 | Deux onboarding | `components/onboarding/` (1247 l., importé ×16 via `page-help-button`) vs `components/product-onboarding/` (500 l., welcome gate) — **0 ligne partagée**, 2 vocabulaires | Cohérence de parcours à revoir (UX-008) | Fusionner la couche transverse (`page-help-button`, `progress`) dans `layout/` ou `help/` | M | P2 |
| DS-016 | Detail offre dupliqué | `job-detail-page.tsx` (1348) ↔ `job-detail-lab-page.tsx` (1170) : 64 l. partagées ; `job-board.tsx` ↔ `tracked-jobs-page.tsx` : 101 l. (job-board mort) | 2 implémentations du même écran | Extraire `jobs/detail/` partagé ; supprimer `job-board` (UX-014) | L | P2 |

---

## 3. Couleurs et Design Tokens

### 3.1 Ce qui existe (`app/globals.css`, unique fichier CSS)

✅ Tokens shadcn complets : `--background/foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--radius` (0.625rem = 10 px) + échelle `--radius-sm…4xl`, 9 tokens `--sidebar*`, `--font-sans/mono/heading`, `@custom-variant dark`.

### 3.2 Tokens manquants (DS-017)

| ID | TOKEN MANQUANT | PREUVE D'USAGE NON TOKENNÉ | CORRECTION PROPOSÉE | EFFORT |
|---|---|---|---|---|
| DS-017a | `--success` / `--warning` / `--info` (+ foreground) | **148 classes `emerald/amber/red/orange`** dans les tsx + **53 dans `lib/`** | Créer les 6 tokens sémantiques | M |
| DS-017b | `--color-brand` (accent vert **#00D492**) | **37 hex** + `badge.tsx:38` variant `tag` | `--color-brand` + `--color-brand-foreground: #142B24` | S |
| DS-017c | `--shadow-*` | 8 `shadow-[0_30px_60px_-36px…]` (7× même valeur) vs 38 `shadow-*` standard | `--shadow-card/popover/overlay` | S |
| DS-017d | Échelle z-index | `z-[60]` ×1, `z-[100]` ×1, `z-10` ×20, `z-50` ×12 — 0 token | `--z-popover/sticky/drawer/modal/onboarding` | S |
| DS-017e | Motion (`--duration-*`) | 7 durées 100→1000 ms | Tokens `--duration-fast/base/slow` | S |
| DS-017f | `--font-landing-display` non monté dans `@theme` | 18 usages en syntaxe lourde `font-[family-name:var(…)]` | Monter dans `@theme inline` → `font-landing-display` | S |
| DS-017g | `--font-marketing-sans` référencé mais **jamais défini** (`marketing/landing-page.tsx:59`) | Fallback silencieux `system-ui` | Supprimer avec DS-013 | S |
| DS-017h | `--destructive-foreground` déclaré shadcn, **0 référence** | — | Supprimer ou utiliser | S |
| DS-017i | `--chart-1..5` tous neutres gray alors que 8 statuts sont colorés | `lib/jobs/utils.ts:96-117` | Colorer les charts | S |

### 3.3 Couleurs hardcodées (DS-018 → DS-021)

**ID DS-018 — Hex arbitraires : 477 occurrences (`[#[0-9a-f]`), dont 473 hors `ui/`.**

| n | hex | Rôle / diagnostic |
|---|---|---|
| 105 | `#111` | Ink landing (identité à conserver) |
| **94** | `#FAFAFA` | ≈ doublon littéral `--foreground` dark |
| **71** | `#A1A1A1` | ≈ doublon littéral `--muted-foreground` dark |
| **41** | `#212121` | ≈ doublon littéral `--muted` dark |
| **42** | `#383838` | Bordures — token `--border` non utilisé |
| **37** | **`#00D492`** | Accent marque → `--color-brand` (DS-017b) |
| 26 | `#eceae6` | Ink landing |
| **22** | `#171717` | ≈ doublon littéral `--card` dark |
| 13 | `#2F2F2F` / 4 `#2a2a2a` | Surfaces diverses |
| **12** | **`#FFB900`** | Accent ambre |
| 4 | `#142B24` | Fond du badge `tag` |

**Top fichiers :** `landing/landing-page.tsx` 120 · `profile/experience-form.tsx` 97 · `experience-card-form.tsx` 80 · `settings/cv-analysis-panel.tsx` 45 · `profile-page.tsx` 26 · `demo-request-dialog.tsx` 21 · **`ui/badge.tsx` 4**.

> **Problème mesurable :** `#171717`, `#212121`, `#FAFAFA`, `#A1A1A1` recopiés littéralement cassent dès qu'un token bouge et bloquent le mode clair.
> **Identité à préserver :** `#111`, `#eceae6`, `#00D492`, `#FFB900` (charte réelle) → les tokeniser, **ne pas les remplacer**.

**ID DS-019 — rgba() : 75 occurrences**, dont un motif copié **27 fois** :
`border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.08)]` (`cv-experiences-card` ×6, `education-entries-card` ×6, `profile-page` ×4, `sortable-list`, `experience-card`…).

**ID DS-020 — Classes de couleur Tailwind nommées : 151 tsx + 53 `lib/` = 204.**
Familles : `text-emerald-*` 34 · `text-amber-*` 33 · `border-amber-*` 23 · `bg-amber-*` 19 · `border-emerald-*` 17 · `bg-emerald-*` 12 · autres (orange/red/blue/violet/cyan/teal) ~30.
**Fuite vers `lib/` :** `lib/jobs/utils.ts:96-117` (`getStatusColor` : 8 statuts × classes brutes `bg-blue-100 text-blue-800`… ; `getMatchScoreColor`) + `lib/jobs/job-detail-lab-model.ts` → alimente 14 fichiers. **0 occurrence** de `zinc/neutral/gray/slate/indigo` dans `app/`+`components/`.

**ID DS-021 — Opacités sur le texte : 52 `text-*/NN`** (`text-[#111]/70` ×9, `/55` ×6, `text-foreground/90` ×5, `text-[#eceae6]/55` ×5…) + **60 `opacity-*`** dont `opacity-30` sur boutons disabled (`cv-experiences-card.tsx:565,583`) au lieu de `disabled:opacity-50`.
→ **C'est la cause racine des contrastes A11Y-001/010-014.**

---

## 4. Espacements et valeurs hors grille (DS-022 → DS-024)

**ID DS-022 — Classes arbitraires : 424 `*[Npx]` dans 44 fichiers.**

| Sous-ensemble | Comptage | Détail |
|---|---|---|
| `*-[Npx]` en px | **117**, dont **80 hors multiple de 4 (68 %)** | `rounded-[10px]` ×33, `text-[11px]` ×8, `rounded-[18px]` ×21, `text-[13px]` ×2, `text-[15px]` ×1, `text-[30px]` ×3, `rounded-[14px]` ×2, `gap-[3px]` ×2, `p-[3px]` ×1, `rounded-[2px]` ×3, `h-[18.4px]` ×1 |
| `text-[Npx]` | **23** | `text-[10px]` ×9 (illustrations), `text-[11px]` ×8, `text-[30px]` ×3, `text-[13px]` ×2, `text-[15px]` ×1 — **hors échelle typographique** |
| `rounded-[Npx]` | **57** | dont **49 redondent exactement** avec `rounded-lg|md|xl|2xl` (10 = lg, 18 = 2xl, 8 = md, 14 = xl — `--radius: 0.625rem`) |
| `w/h/min/max-[Npx]` | 40 | `min-w-[220px]` ×4, `min-h-[220px]` ×4, `max-w-[…]` ×8, `min-h-[44px]` (cible tactile OK) |
| z-index | 7 valeurs + `z-[60]`, `z-[100]` | voir DS-017d |
| `shadow-[…]` | 8 | voir DS-017c |
| `duration-*` | 100×5, 300×4, 200×4, 500×2, 700/150/1000 ×1 | voir DS-017e |

**ID DS-023 — Échelle d'espacement retenue (à valider) :** 4 · 8 · 16 · 24 · 32 · 40 · 48 · 64 · 80 px. Les valeurs à examiner du projet : `10, 11, 13, 14, 15, 18, 19, 27` px. Les incohérences de gap/padding inter-pages sont détaillées dans `product-design-audit.md` § 6 (UX-026 → UX-031).
**Exceptions justifiées (ne pas corriger) :** `min-h-[44px]` (cible tactile), `left-[9999px]` (sr-only), `h-[18.4px]` (`ui/switch` optique), `rounded-[min(var(--radius-md),10px)]` dans `ui/button`.

**ID DS-024 — Principes de grille non appliqués :** pas de variable `--spacing` custom (les défauts Tailwind suffisent), mais aucune règle formalisée → l'échelle ci-dessus doit être écrite dans la doc composants et verrouillée en lint.

---

## 5. Typographie (DS-025)

| Classe | n | | Classe | n |
|---|---|---|---|---|
| **`text-base`** | **550 (55 %)** | | `text-3xl` | 27 |
| `text-sm` | 135 | | `text-xl` | 23 |
| `text-xs` | 49 | | `text-4xl` | 15 |
| `text-lg` | 37 | | `text-5xl`/`7xl` | 4 |
| `text-2xl` | 33 | | arbitraires | 23 (10/11/13/15/30 px) |

- **Hiérarchie très aplatie** : `text-base` domine ; dans `profile/` + `settings/` : base 131, sm 73, xs 32.
- **Graisses :** `font-medium` 223 · `font-semibold` 96 · `font-bold` 31 — mais sur les `<h1>` : 4 traitements (bold ×15, semibold ×1, text-3xl bold ×2, medium ×1).
- **Line-height :** `body { text-base leading-6 }` (1.5) — les 39 `leading-6` explicites sont redondants ; `leading-relaxed` ×49.
- **Unités :** globalement `rem` ✅ (px uniquement dans les classes arbitraires, § 4).
- **Polices :** `--font-sans` système ; `--font-landing-display` (Avenir Next) hors `@theme` (DS-017f).

**Échelle cible proposée (à valider) :** Display 48 · H1 36/28 mobile · H2 30 · H3 24 · H4 20 · Body L 18 · Body 16 · Body S 14 · Caption 12 — toutes en `rem`.
**DS-025 — recommandations :** réduire l'usage de `text-base` comme valeur par défaut de titre/badge, unifier les `<h1>` (DS-006), migrer les 23 `text-[Npx]` vers l'échelle (`text-[11px]`→`text-xs`, `text-[13px]`→`text-sm`, `text-[30px]`→`text-3xl`).

---

## 6. États interactifs (DS-026)

| Composant | États présents | Manques |
|---|---|---|
| `ui/button` | default/hover/focus-visible/disabled + 11 sizes | **`loading` absent** (29 spinners ad-hoc), `active` non tokenné |
| 56 boutons custom | hover 30/56 · focus-visible **5/56** · disabled 2/56 · active **0** · `aria-busy` **0** | Voir DS-001 + A11Y-003/004/005 |
| `ui/input` / `textarea` | default/hover/focus/disabled | `aria-invalid` jamais piloté (A11Y-035) |
| `ui/badge` | variants ok | pas de variant `status`/`score` (DS-007) |
| Cards / listes | hover partiel | sélection non systématisée |

---

## 7. Architecture cible (proposée, calée sur l'existant)

> Aucune couche abstraite sans cas d'utilisation. On conserve les dossiers features.

```
app/globals.css                 # tokens uniques (colors, typography, spacing, radius, shadow, z, motion)
components/
  ui/                           # primitives shadcn + 6 ajouts ciblés
    …existant (button, input, card, badge, dialog, select, dropdown-menu, tabs, skeleton…)
    empty-state.tsx             # ← remplace 11 blocs border-dashed (DS-010)
    error-state.tsx             # ← standardise 12 fichiers (DS-011)
    spinner.tsx  /  Button[loading]   # ← remplace 29 animate-spin (DS-008)
    field.tsx                   # étoffer (25 usages vs 215 Label)
    (variants Badge: status, score)   # ← remplace 53 pills (DS-007)
  shared/                       # composants métier réutilisables
    FormField/  (association label/id par défaut → A11Y-015)
    SearchBar/ FilterBar/ DataTable/ (status: évaluer vs code mort job-table)
  layout/
    app-shell/ sidebar/ mobile-nav/ nav-items  (existants)
    sticky-page-header/         # enrichi : title, description, actions → DS-006
  profile/experience/           # ← absorbe experience-form + experience-card-form + experience-dialog (DS-014)
  jobs/detail/                  # ← absorbe job-detail-page + job-detail-lab (DS-016)
  features/*                    # dossiers existants inchangés (dashboard, settings, companies…)
hooks/                          # ← créer (alias déjà déclaré), y déplacer use-anchored-dropdown-style
docs/composants.md              # ← inventaire + variantes + règles a11y (pas de Storybook pour l'instant)
```

**Suppressions de dette :** `components/layout/page-header.tsx` (0 usage) · `components/marketing/**` + `lib/marketing/landing-copy*` (0 usage) · `components/dashboard/job-board.tsx` · `components/dashboard/job-table.tsx` · `components/profile/sortable-list.tsx` — *après vérification d'absence d'import et validation produit.*

---

## 8. Gouvernance proposée (DS-027)

| ID | ACTION | OBJECTIF MESURABLE |
|---|---|---|
| DS-027a | Créer `hooks/` ou corriger l'alias `components.json` | 0 hook orphelin dans `ui/` |
| DS-027b | `docs/composants.md` (rôle, variantes, props, états, règles a11y, exemples) | 1 doc vivante ; Storybook évalué plus tard, non imposé |
| DS-027c | Règles ESLint `no-restricted-syntax` : `<button className=` hors `ui/button` · `\[[0-9a-f]{3,8}\]` hors `ui/` + `landing/` · `rounded-(xl|lg|md)\s+border` hors `ui/` | Baselines mesurables : 56 / 477 / 89 → 0 |
| DS-027d | `eslint-plugin-jsx-a11y` + `@axe-core/playwright` | CI a11y |
| DS-027e | Tests de composants sur `ui/*` (au minimum button, badge, empty-state, field) | 1er filet de régression UI |

---

## 9. Non vérifiables en lecture seule

1. **Similarité visuelle pure** : les comptages sont structurels ; la confirmation nécessite un rendu (captures d'écran) — non fait.
2. **Comportement réel des listboxes maison** : navigation clavier, ancrage, débordement mobile — runtime/Playwright uniquement.
3. **Accessibilité effective** : `aria-modal` ×0, `role="dialog"` ×1 — constat d'absence de marqueurs, pas de résultat axe.
4. **Mode clair** : `html.dark` forcé + `next-themes` `enableSystem={false}` ; comportement réel de la bascule settings non testé.
5. **Consommation réelle** : les compteurs mesurent le code, pas le trafic.
6. **Hors périmètre** : `chrome-extension/`, `supabase/`, `test/`, `.showcase-refs/`, `data/`, images/PDF (`public/`, `docs/framer-assets`).
7. **Build non lancé** : code mort supplémentaire détectable seulement via `npx tsc --noEmit` + `next build`.
