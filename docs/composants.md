# Composants UI

Source de vérité des composants de `components/ui/` pour les nouvelles interfaces.
Les valeurs visuelles viennent des tokens centralisés dans `app/globals.css`
(`--color-brand`, `--color-success`, `--color-warning`, `--color-info`,
`--color-score-*`, `--color-status-*`, `--color-success`, `--z-index-*`,
`--transition-duration-*`). Ne jamais re-copier une valeur hex ou oklch en dur.

Base : shadcn `base-nova` sur `@base-ui/react` + `class-variance-authority` +
`cn()` (`tailwind-merge`). Style canonique du focus :
`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
(l'utilitaire `outline` nu n'existe pas en Tailwind 4).

## Index

| Composant | Rôle |
| --- | --- |
| `badge` | Étiquette compacte (variantes : `default`, `secondary`, `destructive`, `outline`, `tag`, `chip`, `status`, `score`) |
| `button` | Bouton avec variantes cva + état `loading` (LOT 3) |
| `card` | Bloc carte (header/content/footer) |
| `checkbox` | Case à cocher |
| `dialog` | Modale (`ui/dialog.tsx`, base-nova) |
| `dropdown-menu` | Menu contextuel |
| `empty-state` | État vide (icône + titre + description + CTA) (LOT 3) |
| `error-state` | Bloc d'erreur annoncé (`role="alert"`) (LOT 3) |
| `field` | Empilé label / description / erreur (LOT 3) |
| `input` | Champ texte |
| `label` | Label de formulaire (variante `inline`) |
| `native-select` | Select natif stylé |
| `select` | Select custom base-nova |
| `separator` | Séparateur horizontal/vertical |
| `sheet` | Panneau latéral |
| `skeleton` | Squelette de chargement |
| `sonner` | Toasts (Toaster) |
| `switch` | Interrupteur |
| `spinner` | Loader (`Loader2` + `animate-spin`) (LOT 3) |
| `table` | Tableau |
| `tabs` | Onglets |
| `textarea` | Zone de texte |
| `tooltip` | Infobulle |

---

## Button

### Rôle

Action principale/secondaire. Une seule action primaire par vue.

### Props

| Prop | Type | Défaut | Effet |
| --- | --- | --- | --- |
| `variant` | `default \| secondary \| destructive \| outline \| ghost \| link` | `default` | Palette |
| `size` | `default \| sm \| lg \| icon \| icon-sm \| xs` | `default` | Hauteur 40/36/44/… |
| `loading` | `boolean` | `false` | Spinner + `aria-busy` + `disabled` |
| `disabled` | `boolean` | `false` | Désactivé natif |

`loading` neutralise l'action (`disabled={disabled || loading}`) et pose
`aria-busy="true"` ; le spinner remplace l'icône d'inline-start et le libellé
reste visible (l'appelant peut changer le texte lui-même, ex. « Envoi… »).
`loading` est retiré du spread vers `ButtonPrimitive` — aucune collision avec
Base UI (pas de prop native `loading`).

### Règles a11y

- `type` défaut `button` : expliciter `type="submit"` dans les formulaires.
- Le spinner est `aria-hidden` (l'état est porté par `aria-busy`).
- Ne jamais utiliser le `disabled` seul pour un motif temporaire sans
  `aria-busy` : le lecteur d'écran doit comprendre que l'action est en cours.

### Exemple

```tsx
<Button type="submit" loading={isSaving}>
  Enregistrer
</Button>
```

---

## Badge

### Rôle

Étiquette courte et non interactive.

### Variantes

| Variante | Usage |
| --- | --- |
| `default` / `secondary` / `destructive` / `outline` | Génériques shadcn |
| `tag` | Chip de contenu (compétences, rôles, outils) — tokens `brand` |
| `chip` | Filtre actif (Figma FilterChip) |
| `status` | Pilule de statut d'offre — **couleur via `className`** |
| `score` | Pilule de score match — **couleur via `className`** |

Les variantes `status` et `score` ne portent **que la forme** (pilule
`rounded-full`, `text-xs`, `tabular-nums` pour `score`). La couleur est passée
par `className` pour rester branchée sur les tokens :

```tsx
// lib/jobs/utils.ts
<Badge variant="status" className={getStatusColor(job.status)}>
  {statusLabels[job.status]}
</Badge>

// lib/jobs/job-detail-lab-model.ts
const meta = matchScoreMeta(job.matchScore)
<Badge variant="score" className={meta.textColor}>
  {meta.label}
</Badge>
```

### Règles a11y

Un badge n'est jamais un bouton ni un lien : si l'élément est cliquable, c'est
un `button` ou un `link` (rôle porté par le composant d'action, pas par le
badge).

---

## EmptyState

### Rôle

Message d'état vide avec action de sortie (CTA). Remplace les blocs
`border-dashed` maison (×13+ dans le codebase — migration en LOT 6).

### Props

| Prop | Type | Effet |
| --- | --- | --- |
| `size` | `default \| sm \| inline` | `p-10 rounded-xl` / `p-8 rounded-lg` / `px-3 py-6 rounded-lg` |
| `icon` | `LucideIcon` | Icône décorative (`aria-hidden`), taille liée au `size` |
| `title` | `string` | Titre (facultatif) |
| `description` | `ReactNode` | Texte secondaire muted (facultatif) |
| `children` | `ReactNode` | CTA |

### Règles a11y

L'icône est `aria-hidden` (le texte porte le sens). Si le vide est le résultat
d'un filtre, proposer un CTA « Réinitialiser les filtres ».

### Exemple

```tsx
<EmptyState
  icon={Inbox}
  title="Aucune offre pour le moment"
  description="Importe un CSV ou ajoute une offre manuellement."
>
  <Button>Importer un CSV</Button>
</EmptyState>
```

---

## ErrorState

### Rôle

Bloc d'erreur non-bloquant (échec d'action, données indisponibles).

### Props

| Prop | Type | Défaut | Effet |
| --- | --- | --- | --- |
| `title` | `string` | — | Titre en gras |
| `description` | `ReactNode` | — | Message muted-destructive |
| `role` | `alert \| status` | `alert` | Annonce lecteur d'écran |
| `children` | `ReactNode` | — | Actions de récupération (Recommencer…) |

Utiliser `role="status"` (polite) pour un échec non urgent, `role="alert"`
(impératif) pour bloquer la compréhension de la vue.

### Exemple

```tsx
<ErrorState title="Analyse impossible" description="Réessaie dans un instant.">
  <Button variant="outline" size="sm">Recommencer</Button>
</ErrorState>
```

---

## Field (+ FieldLabel / FieldDescription / FieldError)

### Rôle

Empilé label + contrôle + description + erreur, gap fixe 8 px. Ne casse pas
l'API existante de `Field` (div stack).

### Sous-composants

| Composant | Rôle |
| --- | --- |
| `FieldLabel` | `<label>` — `text-base font-medium`, styles disabled `group-data-[disabled=true]` |
| `FieldDescription` | `<p>` — aide, `text-muted-foreground` |
| `FieldError` | `<p role="alert">` + `CircleAlert` `aria-hidden`, `text-destructive` |

### Règles a11y

- `FieldLabel htmlFor` **obligatoire** (ou envelopper le contrôle en enfant).
- `FieldError` est déjà `role="alert"` : ne pas ajouter d'`aria-live` en plus.
- Une seule erreur par champ, placée sous le contrôle.

### Exemple

```tsx
<Field>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" name="email" type="email" aria-invalid={!!error} />
  <FieldDescription>Utilisé pour la connexion.</FieldDescription>
  {error ? <FieldError>{error}</FieldError> : null}
</Field>
```

---

## Spinner

### Rôle

Indicateur de chargement inline (`Loader2` lucide + `animate-spin`, `size-4`).

### Règles a11y

Toujours `aria-hidden="true"` : le spinner est purement décoratif, l'état de
chargement est porté par `aria-busy` (Button) ou un texte visible
(« Analyse… »). Ne jamais montrer un spinner sans état texte ou `aria-busy`.

### Exemple

```tsx
<Spinner className="size-5" />
```

Utiliser `Button loading` plutôt qu'un spinner nu dans les boutons.
