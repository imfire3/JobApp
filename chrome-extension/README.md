# JobTracker — Extension WTTJ (Chrome / Arc)

Parse une page offre Welcome to the Jungle et met à jour **un seul fichier CSV** (ouvrable dans Excel) — pas de nouveaux fichiers à chaque export.

## Installer sur Arc (ou Chrome)

1. Ouvre Arc → barre d’adresse : `arc://extensions`  
   (Chrome : `chrome://extensions`)
2. Active **Developer mode** / Mode développeur
3. **Load unpacked** / Charger l’extension non empaquetée
4. Sélectionne ce dossier `chrome-extension` (ou la copie dans Téléchargements)
5. Clique **Recharger** si l’extension était déjà installée

## Utilisation

1. Ouvre une offre WTTJ : `.../companies/.../jobs/...`
2. Clique l’onglet **JobTracker** à droite (ou l’icône de l’extension)
3. **Lier / créer le fichier** → choisis ou crée `jobtracker-wttj-jobs.csv` (une seule fois)
4. **Ajouter cette offre** → l’offre est ajoutée et le **même fichier** est réécrit
5. Répète sur d’autres offres (toujours le même fichier)
6. **Mettre à jour le fichier** si besoin de forcer une réécriture
7. Importe ce CSV dans JobTracker → **Imports**

## Fichier de base

- Format : CSV UTF-8 (Excel l’ouvre directement)
- Comportement : **écrasement** du fichier lié, jamais de `wttj-jobs-2026-….csv` multiples
- Pour changer d’emplacement : **Lier / créer le fichier** à nouveau

## Colonnes exportées

`source, title, company, location, remote, salary, posted_at, url, apply_url, description`
