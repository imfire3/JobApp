# Comment fonctionne JobTracker

**JobTracker** est un CRM de recherche d'emploi orienté PO/PM. L'idée : importer des offres (CSV/Excel), les visualiser, sélectionner celles qui t'intéressent, coller ton CV une fois, puis générer des lettres de motivation en lot avec l'IA.

---

## 1. Vue d'ensemble

**Parcours MVP typique :**

1. Créer un compte / se connecter
2. Importer des offres (fichier ou 10 jobs d'exemple)
3. Coller ton CV dans **CV Context**
4. Cocher les offres intéressantes
5. Générer les lettres de motivation en batch
6. Suivre les candidatures dans **Applications**

```
Login → Importer jobs → Job board → Coller CV → Sélectionner → Générer lettres → Suivre candidatures
```

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16 (App Router), React, Tailwind, shadcn/ui |
| Backend | Routes API Next.js (`app/api/*`) |
| Auth + DB | Supabase (Auth + PostgreSQL + RLS) |
| IA | OpenAI (`gpt-4o-mini` par défaut) |

L'app tourne en local sur `http://localhost:3000`. Les variables d'environnement dans `.env.local` connectent Supabase et OpenAI.

---

## 3. Architecture

```
app/                    → Pages (routes)
components/             → UI réutilisable (job board, sidebar, etc.)
lib/                    → Logique métier (auth, imports, OpenAI, Supabase)
supabase/migrations/    → Schéma PostgreSQL
types/                  → Types TypeScript partagés
```

**Deux types de code :**

- **Client** (`"use client"`) — formulaires, job board, interactions
- **Serveur** — routes API, accès DB sécurisé, appels OpenAI

Le navigateur ne parle **pas** directement à OpenAI. Il appelle tes API (`/api/...`), qui vérifient l'auth puis exécutent la logique côté serveur.

---

## 4. Authentification

- **Inscription** : `supabase.auth.signUp()` sur `/login`
- **Connexion** : `supabase.auth.signInWithPassword()`
- **Protection** : `proxy.ts` → `lib/supabase/middleware.ts` redirige vers `/login` si pas de session
- **API** : chaque route appelle `getAuthenticatedUser()` dans `lib/auth.ts` et renvoie `401` si non connecté

Chaque utilisateur ne voit que **ses** données grâce au **RLS** (Row Level Security) Supabase : `auth.uid() = user_id`.

**Flux :**

1. L'utilisateur saisit email + mot de passe sur `/login`
2. Supabase Auth crée une session (cookie)
3. Le middleware vérifie la session à chaque requête
4. Les pages protégées (`/jobs`, `/dashboard`, etc.) sont accessibles

---

## 5. Les pages principales

### Dashboard (`/dashboard`)

Vue synthétique : KPIs (jobs importés, sélectionnés, lettres générées, etc.) et activité récente. Charge les données via `GET /api/dashboard/summary`.

### Jobs (`/jobs`) — cœur de l'app

Le composant `JobBoard` affiche :

- **KPIs** en haut
- **Filtres** (source, lieu, remote, score, statut…)
- **Vue cartes** ou **table**
- Actions :
  - **Import 10 sample jobs** → `POST /api/import-jobs/sample`
  - **Cocher** des offres (`selected: true`)
  - **Analyser** le match IA → `POST /api/analyze-job`
  - **Générer lettre** (une ou en lot) → `POST /api/generate-cover-letter`

### Imports (`/imports`)

Upload CSV ou Excel. Colonnes attendues :

```
source, title, company, location, remote, salary, posted_at, url, description
```

Champs obligatoires : **title** + **url**. Déduplication par URL par utilisateur.

### CV Context (`/profile-ai`)

Zone simple pour coller ton CV (texte brut). Optionnel : upload PDF → extraction du texte. Sauvegardé dans la table `cv_contexts` via `PUT /api/profile`.

C'est **la seule source** utilisée pour générer les lettres de motivation.

### Applications (`/applications`)

Pipeline CRM : statuts (`to_apply`, `applied`, `hr_interview`, `offer`, `rejected`…), notes, dates. Données via `GET/POST/PATCH /api/applications`.

### Sources (`/sources`)

Placeholder **"Coming soon"**. Les connecteurs live (LinkedIn, Apify, etc.) ne sont pas actifs dans le MVP — l'import manuel remplace le scraping.

### Settings (`/settings`)

Préférences générales (thème, notifications, clés API optionnelles).

---

## 6. Flux détaillé : import de jobs

1. Fichier uploadé vers `POST /api/import-jobs`
2. `lib/imports/jobs-file.ts` parse CSV/Excel
3. Validation ligne par ligne
4. Vérification des URLs existantes pour cet utilisateur
5. Insertion dans `jobs` avec `status: 'new'`
6. Réponse : `{ imported, duplicates, invalid }`

Le bouton **"Import 10 sample jobs"** lit `data/sample_jobs.csv` côté serveur (`POST /api/import-jobs/sample`) — même logique, sans upload.

**Règles :**

- Chaque ligne doit avoir un `title` et une `url` valides
- Si l'URL existe déjà pour cet utilisateur → doublon ignoré
- Les lignes invalides sont comptées et listées dans le résumé d'import

---

## 7. Flux détaillé : génération de lettres

**Prérequis :**

- CV rempli dans **CV Context**
- `OPENAI_API_KEY` dans `.env.local`

**Étapes :**

1. L'utilisateur coche un ou plusieurs jobs sur le job board
2. Clic sur **"Generate cover letters (N)"**
3. L'app vérifie que le CV est renseigné (`GET /api/profile`)
4. Pour chaque job sélectionné :
   - `POST /api/generate-cover-letter` avec `{ jobId }`
   - Chargement du job + `cv_contexts` depuis Supabase
   - Appel OpenAI (`lib/openai/client.ts`)
   - Sauvegarde dans `jobs.cover_letter` et `cover_letters`
5. Toast de confirmation avec le nombre de succès/échecs

**Résultat :**

- Lettre stockée dans `jobs.cover_letter`
- Copie dans `cover_letters`
- Statut du job → `cover_generated`
- Modal pour lire/éditer la lettre

---

## 8. Flux IA : scoring de match (optionnel)

`POST /api/analyze-job` envoie à OpenAI :

- ton CV
- le titre, l'entreprise, la description de l'offre

**Retour :**

- `match_score` (0–100)
- `match_reasons` (5 points forts)
- `match_gaps` (3 lacunes)
- `cover_letter_angle` (angle suggéré pour la lettre)

Stocké sur le job pour affichage et réutilisation à la génération.

---

## 9. Modèle de données (tables clés)

| Table | Rôle |
|-------|------|
| `auth.users` | Comptes (géré par Supabase) |
| `cv_contexts` | CV texte par utilisateur (`id` = `user_id`) |
| `jobs` | Offres importées (titre, entreprise, URL, statut, score, lettre…) |
| `cover_letters` | Historique des lettres générées par job |
| `applications` | Suivi candidatures (statut, notes, dates) |
| `profiles` | Profil legacy (rôles cibles, etc.) |
| `job_sources`, `tracked_searches` | Automatisation future (pas MVP actif) |

**Statuts d'un job :**

`new` → `selected` → `cover_generated` → `applied` → `interview` → `rejected` / `archived`

**Contrainte importante :** une seule offre par URL et par utilisateur (`unique (user_id, url)`).

---

## 10. Sécurité et isolation

- **RLS** : chaque table filtre par `auth.uid()`
- **API** : vérifie la session avant toute opération
- **Clés** : `NEXT_PUBLIC_*` côté client (anon key), `OPENAI_API_KEY` uniquement serveur
- **Middleware** : bloque l'accès aux pages sans login (sauf `/login`, `/auth`, `/api/setup/status`)

---

## 11. MVP vs à venir

| Fonctionnel maintenant | Pas encore actif |
|------------------------|------------------|
| Auth email/mot de passe | Connecteurs live (Sources) |
| Import CSV/Excel | Sync automatique 24h |
| 10 jobs d'exemple | Scraping LinkedIn/Indeed |
| CV texte + PDF | Profil IA complexe |
| Génération lettres (unitaire + batch) | Scoring auto à l'import |
| Job board + filtres | Dashboard analytics avancé |
| Suivi candidatures basique | Notifications push |

---

## 12. Configuration requise

**Variables `.env.local` :**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_... ou eyJ...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

**Supabase — Auth :**

- Site URL : `http://localhost:3000`
- Redirect URLs : `http://localhost:3000/auth/callback`

**Base de données :**

Migrations dans `supabase/migrations/` (001 à 006), appliquées via `npx supabase db push`.

---

## 13. Résumé

**JobTracker** = un tableau de bord personnel où tu **importes** des offres PO/PM, tu **colles ton CV une fois**, tu **sélectionnes** les offres qui t'intéressent, et l'IA **génère des lettres de motivation personnalisées** — le tout stocké dans Supabase, isolé par compte utilisateur.

---

*Document généré le 8 juillet 2026 — JobTracker MVP*
