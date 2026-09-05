# JobTracker — Kit Framer (landing)

Je ne peux pas créer le projet **dans ton compte Framer** depuis Cursor (pas d’API / MCP Framer connecté).  
Ce fichier = brief prêt à coller : ouvre Framer → **New Site** → rebuild section par section.

**Assets à importer** (dossier `docs/framer-assets/` aussi ouvert sur ton Mac) :

| Fichier | Usage |
|---------|--------|
| `screen-jobs.png` | Hero mockup |
| `screen-extension.png` | Bloc Extension Chrome |
| `screen-optimize.png` | Bloc ATS & mots-clés |
| `screen-job-detail.png` | Showcase analyse fiche |

---

## 1. Setup page

- Page : `/` (Home)
- Desktop breakpoint : 1200 / 1440
- Font display : **Syne** (ou Satoshi / General Sans) — SemiBold / Bold
- Font body : **Inter** ou **Montserrat** — Regular / Medium
- Background page : `#ECEAE6`
- Text : `#111111`
- Soft text : `rgba(17,17,17,0.70)`
- Dark sections : `#111111` + text `#ECEAE6`
- **Pas de vert** (ni purple glow)

Grid overlay (optionnel) : motif 56×56, trait `rgba(17,17,17,0.05)`.

Boutons pill :
- Primary : fill `#111`, text `#ECEAE6`, radius 999
- Secondary : border `rgba(17,17,17,0.25)`, fill transparent

Liens CTA → ton URL app (ex. `/login` ou domaine déployé).

---

## 2. Header

| Élément | Contenu |
|---------|---------|
| Logo | JobTracker |
| Link | Connexion |
| Button | Commencer → |

Layout : max-width 1152, padding horizontal 32, space-between.

---

## 3. Hero

**Eyebrow (uppercase, tracking large, opacity 55%)**  
`JOBTRACKER`

**H1**  
`Le CRM de candidature pour PO & PM.`

**Sous-texte**  
`Extension Chrome pour WTTJ, analyse ATS et mots-clés, cover letters ancrées dans ton CV — plus de CSV orphelins ni de lettres génériques.`

**CTAs**  
- `Essayer gratuitement →`  
- `Se connecter`

**Mockup**  
Frame sombre `#111`, coins ~12, barre type browser (3 dots) + label `app.jobtracker — Jobs`, image `screen-jobs.png` (object-fit cover, top).

**Motion Framer**  
- Hero text : Appear → Fade / Move Y 16 → 0, 0.6s  
- Mockup : Appear delay 0.15s + float léger (loop Y ±6px, 8s)

---

## 4. Section sombre — flux

Background `#111`, text `#ECEAE6`.

**H2**  
`Un flux. De l’import à la lettre.`

**Sous-texte**  
`Pas un énième tableau Kanban vide — un atelier de candidature branché sur ton CV et tes sources.`

**3 colonnes**

| # | Titre | Texte |
|---|-------|-------|
| 01 | Importe ton CV | PDF ou texte. Il devient le contexte unique pour le matching et les lettres. |
| 02 | Capture les offres | Extension Chrome WTTJ : un clic sur une offre, un seul CSV. Ou import CSV / Apify. |
| 03 | ATS + mots-clés | Analyse ATS, mots-clés présents / manquants, optimisation CV avant / après. |

Style : top border `rgba(236,234,230,0.15)`, numéro en opacity 45%.

---

## 5. Bloc Extension Chrome

Layout 2 cols (texte gauche / image droite).

**Label**  
`Extension Chrome`

**H2**  
`Capture une offre WTTJ en un clic.`

**Corps**  
`Sur une fiche Welcome to the Jungle, l’extension JobTracker ajoute l’offre dans un seul CSV — pas dix fichiers qui traînent. Tu réimportes ensuite dans Imports, et l’offre arrive dans ton board.`

**Bullets**  
- Install en mode développeur (Chrome ou Arc)  
- Un fichier CSV unique, réécrit à chaque ajout  
- Import direct vers Jobs + analyse  

**Image** : `screen-extension.png`

---

## 6. Bloc ATS & mots-clés

Layout 2 cols (image gauche / texte droite).

**Label**  
`Analyse ATS & mots-clés`

**H2**  
`Vois ce que le ATS voit vraiment.`

**Corps**  
`JobTracker scrape ton CV et la fiche de poste : compétences détectées, outils, rôles, et surtout les mots-clés manquants. Tu compares CV avant / après, tu ajoutes ce qui manque, et tu suis le taux d’utilisation.`

**Bullets**  
- Scores ATS (parsing, structure, impact, keywords)  
- Table mots-clés : présent / absent / ajouter  
- Optimisation CV avant → après avec % d’utilisation  

**Image** : `screen-optimize.png`

---

## 7. Showcase « L’app, en vrai »

Background soft `#F5F3EF`.

**H2**  
`L’app, en vrai`

**Sous-texte**  
`Extension, ATS & mots-clés, analyse de fiche — le cœur du workflow.`

**3 cards** (image + caption) :

1. Extension Chrome → `screen-extension.png`  
2. ATS & mots-clés → `screen-optimize.png`  
3. Analyse fiche → `screen-job-detail.png`

---

## 8. CTA final

Frame `#111`, padding large.

**H2**  
`Prêt à ranger ta recherche d’emploi ?`

**Texte**  
`Installe l’extension, lance une analyse ATS, et sors ta première lettre en moins d’une session.`

**Button** (clair)  
`Lancer JobTracker →`

---

## 9. Footer

- Gauche : `JobTracker`  
- Droite : `Extension Chrome · ATS & mots-clés · cover letters.`

---

## 10. Checklist Framer rapide

1. New Site → blank  
2. Import les 4 PNG dans Assets  
3. Coller les textes section par section  
4. Appliquer couleurs / Syne  
5. Lier les boutons à ton app  
6. Preview Desktop + Mobile  
7. Publish

**Référence live code** (si le serveur tourne) : http://localhost:3000/
