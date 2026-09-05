# Screenshots JobTracker

Captures viewport 1440×900 (Playwright), aussi copiées dans `public/landing/` pour la LP.

| Fichier | Écran |
|---------|--------|
| `screen-login.png` | Connexion |
| `screen-dashboard.png` | Dashboard |
| `screen-jobs.png` | Jobs / offres suivies |
| `screen-job-detail.png` | Fiche offre |
| `screen-imports.png` | Imports |
| `screen-extension.png` | Extension Chrome |
| `screen-profile.png` | CV Context |
| `screen-optimize.png` | Optimisation CV |
| `screen-settings.png` | Settings |
| `screen-applications.png` | Applications |

Régénérer :

```bash
# depuis la racine du repo, app sur :3000, compte admin
node scripts/capture-screens.mjs   # si le script est ajouté
```

Sinon relancer le script Playwright utilisé pour la LP.
