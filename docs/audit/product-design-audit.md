# Audit Product Design & UX/UI — JobTracker

**Date :** 15/10/2026
**Périmètre :** parcours complet (`/` → login → onboarding → dashboard → offres → détail → candidatures → entreprises → recherche → sources → compte → profil IA), heuristiques de Nielsen, états, responsive, espacements, hiérarchie.
**Méthode :** lecture du code, de `docs/product.md` et des parcours. Aucun test device réel — voir § 8.
**Fichiers modifiés :** aucun.

---

## 1. Cartographie des pages et parcours

| Route | Composant | Rôle |
|---|---|---|
| `/` | `components/landing/landing-page.tsx` (771 l.) | Landing marketing, CTA inscription + démo |
| `/login` | `app/login/login-client.tsx` (1090 l.) | 3 modes : `login`, `signup`, `cv` (import CV) |
| `/onboarding` | redirect legacy | → `/login?cv=1` |
| `/onboarding/profile` | `onboarding/profile-page.tsx` | Revue du profil extrait du CV |
| `/onboarding/metiers` | `onboarding/metiers-page.tsx` | Alertes métier / lieux / contrats |
| `/onboarding/api-keys` | `onboarding/api-keys-page.tsx` | Clé OpenAI |
| `/dashboard` | `dashboard/*` | KPIs, activité, suggestions IA |
| `/jobs` | `jobs/tracked-jobs-page.tsx` (844 l.) | Board offres, filtres, import, sync |
| `/jobs/[id]` | `jobs/job-detail-page.tsx` (1348 l.) | Détail offre + analyse + lettre |
| `/jobs/[id]/lab` | `jobs/lab/*` (1170+893 l.) | Variante « lab » du détail |
| `/jobs/searches/new`, `/[searchId]` | `jobs/tracked-search-*` | Recherches suivies (hors nav) |
| `/applications` | `app/applications/page.tsx` (749 l.) | Pipeline de candidatures |
| `/companies`, `/[id]` | `companies/*` | Prospection entreprises + fiche |
| `/research` | `research/research-page.tsx` | Plans de recherche IA |
| `/sources`, `/[sourceId]` | `sources/*` | Connecteurs / logs de sync |
| `/settings` | `settings/*` (3045 l.) | Général, ATS, prompts, admin |
| `/profile-ai`, `/optimize` | pages légères + `settings/cv-optimize-page` | CV / profil IA |
| `/extension` | `extension/*` | Guide extension Chrome |

**Nav** (`layout/nav-items.ts`) : Dashboard · Offres · Entreprises · Recherche IA · Candidatures · Extension · Sources · Profil & CV · Compte.

**Structures parallèles détectées :** 2 landings (`landing/` utilisée, `marketing/` morte), 2 détails d'offre (`jobs/` + `jobs/lab/`), 2 systèmes d'onboarding (`onboarding/` 1247 l. + `product-onboarding/` 500 l., 0 ligne partagée), 2 en-têtes de page (`page-header` mort vs `sticky-page-header` utilisé ×11).

---

## 2. Problèmes UX — heuristiques de Nielsen

### UX-001 → UX-003 · P0 (bloquant)

| ID | HEURISTIQUE | FICHIER:LIGNE | PROBLÈME | IMPACT UTILISATEUR | CORRECTION PROPOSÉE | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| UX-001 | 1. Visibilité de l'état du système / 9. Erreurs | `components/jobs/tracked-jobs-page.tsx:654` | CTA vide « Copier-coller l'offre » → `router.push("/imports?paste=1")` alors que **la route `app/imports` n'existe pas** | **404** à l'état d'entrée critique de l'import ; perte d'utilisateur | Créer la route ou pointer vers le flux collage réel | M | Cliquer le CTA depuis l'état vide |
| UX-002 | 4. Cohérence / 7. Flexibilité | `tracked-jobs-page.tsx:710` | Bouton d'en-tête « Copier-coller l'offre » → `router.push("/jobs")` (lui-même) | Action morte, confiance dégradée | Pointer vers le flux d'import par collage | S | Cliquer le bouton |
| UX-003 | 1. Visibilité / 8. Esthétique | `components/dashboard/dashboard-overview.tsx:91-97` | **2 CTA « Voir mes offres »** (l'un outline, l'un primary) vers `/jobs` | Confusion, hiérarchie cassée sur l'accueil | Garder un primary + un CTA distinct (ex. import) | S | Revue visuelle dashboard |

### UX-004 → UX-010 · P1 (sérieux)

| ID | HEURISTIQUE | FICHIER:LIGNE | PROBLÈME | IMPACT | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| UX-004 | 5. Prévention des erreurs | `companies/company-card.tsx:71`, `company-detail-page.tsx:123`, `tracked-jobs-page.tsx:353`, `job-board.tsx:244` | Suppressions destructrices via **`window.confirm` natif** alors que `ui/dialog.tsx` existe | Confirmation banalisée, style non contrôlé, incohérent avec le design system | `AlertDialog`/`Dialog` destructif nommant l'objet | M | Tester chaque suppression |
| UX-005 | 4. Cohérence et standards | `tracked-jobs-page.tsx:92,97,624,735-739`, `sources-page.tsx:184`, `general-settings-form.tsx:62,110,115,236`, `cv-analysis-panel.tsx:124-155` | Libellés/toasts **en anglais** dans une app FR (« Failed to load jobs », « Run now », « Save settings ») | Fracture de polish, incompréhension | Traduire FR (voir aussi A11Y-054/057/058) | S | Revue de copy |
| UX-006 | 1. Visibilité de l'état | `dashboard-overview.tsx:146-153` | Section « Suggestions IA » **sans état vide ni skeleton** (card blanche vide si `ai_recommendations = []`) | L'utilisateur croit à un bug | État vide avec CTA + skeleton de chargement | S | Mock `[]` |
| UX-007 | 9. Reconnaissance des erreurs / 8. Esthétique | `login-client.tsx:968-979`, `tracked-jobs-page.tsx:684-694` | Bouton **« Fake fill data »** visible côté inscription quand le self-signup est autorisé | Perçu comme bêta/bug ; comptes parasites | Masquer hors `NODE_ENV === "development"` | S | Build production |
| UX-008 | 3. Contrôle et liberté / 7. Flexibilité | `login-client.tsx:187-189`, `profile-page.tsx:91-107` | Fin d'onboarding directe vers dashboard : **étapes `metiers` et `api-keys` sautées** alors que `docs/product.md` décrit un funnel complet | Étapes produit non vécues (alertes, clé IA non configurées) | Aligner les gates sur le funnel documenté ou sortir les étapes du flux | M | Parcours complet from scratch |
| UX-009 | 1. Visibilité de l'état | `research-page.tsx:100-120` | Fetch des capabilities **sans état de chargement** (flash de contenu vide au 1er rendu) | Premier écran trompeur | Skeleton ou état `loading` d'init | S | Cold load `/research` |
| UX-010 | 10. Aide et documentation | global | Aucun fil d'Ariane ; `PageHelpButton` présent mais **désactivé sans entrée d'aide** (`page-help-button.tsx:88`) | Repérage difficile sur `/jobs/[id]`, `/companies/[id]`, `/sources/[id]` | Aide systématique par route + breadcrumb sur les sous-pages | M | Parcourir les sous-pages profondes |

### UX-011 → UX-016 · P2 (modéré)

| ID | HEURISTIQUE | FICHIER:LIGNE | PROBLÈME | IMPACT | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|---|
| UX-011 | 4. Cohérence | `login-client.tsx:1028,1043` | Labels login en anglais (« Email or username », « Password ») vs signup FR | Écran d'acquisition incohérent | Traduire | S | Revue |
| UX-012 | 1. Visibilité / 4. Cohérence | `dashboard-overview.tsx:115` + 19 `animate-pulse` du projet | `animate-pulse` custom alors que `ui/skeleton.tsx` existe (dont `<Card class="animate-pulse">` ×2) | Patterns divergents | Utiliser `Skeleton` | S | Revue code |
| UX-013 | 9. Récupération des erreurs | ex. `company-detail-page.tsx:133` | Toasts propageant `error.message` serveur brut | Messages techniques non actionnables | Mapper codes → libellés FR | M | Déclencher chaque erreur API |
| UX-014 | 4. Cohérence | `components/dashboard/job-board.tsx` (538 l.) | Composant legacy EN (« Import 10 sample jobs », « No jobs yet »), double CTA import/sync, **non référencé** | Dette ; réintroduction possible | Supprimer ou isoler dev-only (avec `job-table`, `sortable-list`) | S | Recherche d'imports |
| UX-015 | 6. Reconnaissance / 10. Aide | `settings/page.tsx:13-23` | Page la plus longue (8 panneaux) **sans `StickyPageHeader` ni `<h1>`** | Aucun repère de position | Header de page + ancrages de section | M | Scroll sur `/settings` |
| UX-016 | 7. Flexibilité | `sidebar.tsx:14-32` vs `mobile-nav.tsx` | Déconnexion uniquement en desktop ; mobile = nav sans logout ni aide | Parité mobile incomplète | Ajouter déconnexion + aide dans le Sheet mobile | S | Test mobile |

### UX-017 → UX-020 · P3

| ID | HEURISTIQUE | FICHIER:LIGNE | PROBLÈME | CORRECTION | EFFORT | VALIDATION |
|---|---|---|---|---|---|---|
| UX-017 | 8. Esthétique minimaliste | `education-card-form.tsx:123` et 473 autres hex hors `ui/` | Couleurs hardcodées by-passant les tokens (cassure du thème clair) | Voir `design-system-audit.md` § C | M | Voir plan d'action |
| UX-018 | 4. Cohérence | `login-client.tsx:986,1057` | « Patiente… » pendant le chargement | « Un instant… » / « Connexion… » | S | Revue |
| UX-019 | 4. Cohérence | `sources-page.tsx:184` vs `tracked-jobs-page.tsx:753` | « Run now » vs « Synchroniser » : vocabulaire sync à deux vitesses | Vocabulaire unique | S | Revue |
| UX-020 | 6. Reconnaissance | `app-shell.tsx:38-56` | Extension sur-exposée (item de nav n°6 + modal auto sur `/jobs`) | Réduire à l'aide contextuelle | S | Revue |

**Points forts confirmés :** toasts Sonner systématiques ; `disabled={loading|saving|syncing}` présent sur la plupart des submits (`applications/page.tsx:593`, `api-keys-page.tsx:207`, `metiers-page.tsx:600`) ; `PageHelpButton` sur les pages principales ; confirmations inline dédiées pour expériences/formations (`experience-card.tsx:112-130`, `education-card-form.tsx:348-369`) ; états vides avec CTA sur le cœur du loop (offres, candidatures, entreprises).

---

## 3. États loading / error / empty par page

| Page | Loading | Error | Empty | Lacune |
|---|---|---|---|---|
| Login / CV | Suspense + `CvImportProgress` | toasts + step error | aide upload/paste | — |
| Onboarding profile | Skeleton | fallback silencieux | profil prérempli | — |
| Onboarding métiers | boutons loading | toasts | chips vides | — |
| Onboarding api-keys | « Chargement… » | toasts | — | — |
| Dashboard | pulse activité, KPI sans skeleton | toast | activité oui, **IA non** | **UX-006** |
| Offres | loading header + cards | toast | CTA multi-choix + filtre vide | — |
| Détail offre | Loader2 / Skeleton | toasts | « Aucune preuve… » | — |
| Candidatures | skeleton pipeline + table | toast | CTA création | — |
| Entreprises | Loader2 + skeleton kanban | toast | CTA prospecter | — |
| Recherche IA | steps (import) | toasts | candidats sans bloc dédié | **UX-009** (init) |
| Sources | skeleton cards | toast | catalogue | — |
| Compte (panneaux) | Loader2 / « Chargement… » | toasts | labels ATS vides | fetch silencieux `settings-form.tsx:116-120` |
| Profil IA | Skeleton onboarding | toasts | chips/langues vides | — |

---

## 4. Feedback et actions

- **Toasts :** Sonner, canal unique, 36 fichiers — excellent.
- **Double soumission :** bonne couverture `disabled` sur les formulaires principaux ; actions groupées passées par le `busy` de `job-bulk-actions.tsx:78`.
- **Optimistic UI :** partielle (sélection/statut des offres), notes candidatures rechargées depuis le serveur (correct).
- **Confirmations destructrices :** inline dédiées pour expériences/formations, **natif `window.confirm`** pour entreprises et suppressions groupées (UX-004).
- **Progression longue :** compteurs d'import groupé corrects mais libellés EN (UX-005/A11Y-058) ; timeline d'import CV **simulée** (`onboarding-progress.tsx:18-38`).

---

## 5. Responsive Design

### Structure saine (conforme)

- Shell : sidebar `hidden md:block` + `MobileNav` en Sheet sous `md` (`app-shell.tsx:81`, `mobile-nav.tsx:20`).
- Conteneur : `max-w-7xl p-4 md:p-6 lg:p-8` (`app-shell.tsx:85`).
- Grilles fluides : `sm:grid-cols-2` → `lg:grid-cols-3` → `xl:grid-cols-4`.
- Kanban : `flex gap-3 overflow-x-auto` + `min-w-[220-260px]` (offres, candidatures, entreprises).
- Headers : `StickyPageHeader` aligné `-mx-4 md:-mx-6 lg:-mx-8`.
- Sheets/Dialogs : `w-full sm:max-w-lg`, `max-h-[90dvh] overflow-y-auto`.

### Risques détectés (à confirmer sur device)

| ID | FICHIER:LIGNE | RISQUE | CORRECTION | EFFORT |
|---|---|---|---|---|
| UX-021 | `applications/page.tsx:420-490` | Table 6 colonnes + Select 180 px **sans `overflow-x-auto`** → débordement quasi certain à 320 px | Wrapper scrollable + colonnes masquées en `hidden md:table-cell` | M |
| UX-022 | `dashboard/job-table.tsx:64` | Table multi-colonnes sans wrapper scroll | Idem (ou suppression du composant, UX-014) | S |
| UX-023 | `job-filters.tsx:346` | `xl:grid-cols-7` dense (acceptable, responsive down) | Vérifier à 320 px | S |
| UX-024 | `marketing/landing-page.tsx:150` | `text-5xl` sans palier mobile (composant mort à confirmer) | Si réactivé : `text-4xl sm:text-5xl` | S |
| UX-025 | `login-client.tsx:692` | `gap-6/8` custom + `p-6 py-6` redondant | Normaliser (grille 8 px) | S |

**Formats à tester :** 320 / 375 / 428 — 768 / 1024 — 1280 / 1440 / 1920 (non exécutés, voir § 8).

---

## 6. Espacements et hiérarchie

### Patterns dominants (cohérents — à conserver)

- Page : `space-y-6` (dashboard, offres, candidatures, sources).
- En-tête : `StickyPageHeader` (mb-6, py-4, backdrop) — **standard à étendre**.
- Titre de page : `h1 text-2xl font-bold tracking-tight` + sous-titre `text-base text-muted-foreground` — très cohérent (15 pages).
- Cards : `p-4` interne / `p-6` par défaut.

### Incohérences

| ID | ÉLÉMENT | VALEURS OBSERVÉES | CORRECTION PROPOSÉE |
|---|---|---|---|
| UX-026 | Sections | `space-y-8` (page settings) vs `space-y-6` (panels) | Grille 8 px : 32 px entre sections, 24 px entre blocs |
| UX-027 | CardContents | `space-y-5` (`ats-keywords-panel.tsx:155`, `research-page.tsx:357`) vs `space-y-4` partout ailleurs | Ramener à `space-y-4` (16 px) |
| UX-028 | Grid gaps | `gap-5` (`ats-keywords-panel.tsx:205`) vs `gap-4` standard | `gap-4` |
| UX-029 | Header actions | `gap-4` (offres) vs `gap-3` (candidatures) | `gap-2`/`gap-3` systématique |
| UX-030 | Padding card profil | `p-5` hardcodé (`education-card-form.tsx:123`) | `p-4` ou `p-6` (tokens) |
| UX-031 | Login | `gap-6/8` + `p-6 py-6` redondant (`login-client.tsx:692`) | Nettoyer |

**Valeur hors grille signalée mais justifiable à examiner :** `text-[13px]`/`leading-[18px]` (`login-client.tsx:731,742`) — hors échelle ; à remplacer par `text-sm`.
Le détail des valeurs px non multiples de 4 est dans `design-system-audit.md` § D.

### Hiérarchie des titres

- 6 traitements de `<h1>` coexistent : `text-2xl font-bold` ×15, `text-3xl font-bold` ×2 (settings, profil), `text-2xl font-semibold` ×1, `text-[30px] font-medium` ×1 (login), clamp landing ×1, `onboarding-step` ×1.
- **Correction :** unifier via `StickyPageHeader` avec slot `title`/`description`/`actions` (voir DS-006).

---

## 7. CTA et boutons

| Page | Primary | Secondaire | Anomalie |
|---|---|---|---|
| Landing | Inscription | Login, démo | Hiérarchie claire |
| Login | Se connecter / Créer / Suivant | Outline fake-fill | **UX-007** |
| Dashboard | « Voir mes offres » ×2 | — | **UX-003** |
| Offres | Importer mes offres | Copier-coller (**mort**), Sync, Fake fill | **UX-002, UX-001** |
| Candidatures | Nouvelle candidature | Rafraîchir | OK |
| Entreprises | Lancer la recherche | Export Excel, Prospecter | OK |
| Sources | Run now (EN) | Gérer, logs | **UX-019** |
| Compte | Save settings (EN) | — | **UX-005** |
| Détail offre | Analyser / Lettre | Retour | OK, contextuel |

---

## 8. Non vérifiables statiquement

1. Rendu réel 320 / 375 / 428 des tables (candidatures, job table) et du Sheet mobile.
2. Contrastes réels (mode clair, badges de statut, `#A1A1A1` sur cartes).
3. Focus traps des Dialogs/Sheets, navigation clavier du kanban (drag).
4. Performance perçue : timeline CV simulée vs latence API ; course `router.push` + `refresh` post-signup.
5. Session expirée / offline sur les pages client-fetch.
6. `window.confirm` sur iOS Safari.
7. Overflow réel du hero de la landing à 320 px.
8. Zoom 200 %/400 % (relié à l'audit a11y § 7).

---

## 9. Synthèse priorisée

1. **P0** : réparer `/imports` + CTA collage + doublon dashboard (3 anomalies, parcours d'import cassé).
2. **P1** : confirmations destructives via Dialog, unification FR, état vide suggestions IA, masquer fake-fill, réaligner le funnel onboarding, aide sur sous-pages.
3. **P2** : parité mobile (logout), header settings, suppression du legacy `job-board`, mapping des erreurs serveur, tables responsive.
4. **P3** : tokens, libellés de chargement, vocabulaire de sync.
