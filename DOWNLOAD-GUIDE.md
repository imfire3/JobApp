# 📥 Comment télécharger JobApp sur votre Mac

## Option 1 : Via Git (Recommandé)

Si vous avez Git installé sur votre Mac :

```bash
# Cloner le repository
git clone https://github.com/imfire3/JobApp.git

# Aller dans le dossier
cd JobApp

# Installer et lancer
./start-mac.sh
```

## Option 2 : Téléchargement ZIP depuis GitHub

1. Allez sur : https://github.com/imfire3/JobApp
2. Cliquez sur le bouton vert **"Code"**
3. Sélectionnez **"Download ZIP"**
4. Décompressez le fichier téléchargé
5. Ouvrez le Terminal et naviguez vers le dossier :
   ```bash
   cd ~/Downloads/JobApp-main
   ./start-mac.sh
   ```

## Option 3 : Télécharger depuis cette VM Cloud

### Fichiers à télécharger :

Les fichiers sont prêts dans `/workspace` de cette VM. Vous pouvez les télécharger :

**Fichiers principaux :**
- Tout le dossier `/workspace` contient l'application complète
- `JobApp-Chrome-Extension.zip` - Extension Chrome prête à l'emploi
- `INSTALLATION-MAC.md` - Guide d'installation complet
- `start-mac.sh` - Script de démarrage automatique

### Depuis le terminal de votre Mac :

Si vous avez accès SSH à cette VM :
```bash
# Remplacez <vm-host> par l'adresse de la VM
scp -r ubuntu@<vm-host>:/workspace ~/JobApp
cd ~/JobApp
./start-mac.sh
```

## Après le téléchargement

### 1. Installer Node.js (si nécessaire)
- Téléchargez depuis : https://nodejs.org/
- Version recommandée : LTS (Long Term Support)
- Minimum : Node.js 20+

### 2. Lancer l'application
```bash
cd /chemin/vers/JobApp
chmod +x start-mac.sh  # Rendre le script exécutable
./start-mac.sh         # Lancer l'application
```

L'application sera disponible sur : **http://localhost:3000**

### 3. Installer l'extension Chrome

**Option A - Dossier décompressé :**
1. Chrome → `chrome://extensions/`
2. Activer "Mode développeur"
3. "Charger l'extension non empaquetée"
4. Sélectionner : `JobApp/chrome-extension`

**Option B - Fichier ZIP :**
1. Décompresser `JobApp-Chrome-Extension.zip`
2. Suivre l'Option A avec le dossier décompressé

## 🎯 Vérification rapide

Pour vérifier que tout fonctionne :

```bash
# Vérifier Node.js
node -v  # Devrait afficher v20.x.x ou plus

# Vérifier npm
npm -v   # Devrait afficher 10.x.x ou plus

# Dans le dossier JobApp
npm test  # Lancer les tests (optionnel)
```

## 🆘 Besoin d'aide ?

Consultez :
- `README.md` - Documentation complète
- `INSTALLATION-MAC.md` - Guide d'installation détaillé
- `chrome-extension/README.md` - Documentation de l'extension

## 📦 Contenu du package

```
JobApp/
├── server.js                      # Serveur backend
├── package.json                   # Dépendances
├── public/                        # Frontend web
│   ├── index.html
│   ├── style.css
│   └── app.js
├── chrome-extension/              # Extension Chrome
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── background.js
│   └── *.png (icônes)
├── test/                          # Tests
├── start-mac.sh                   # Script de lancement
├── README.md                      # Documentation
├── INSTALLATION-MAC.md            # Guide Mac
└── JobApp-Chrome-Extension.zip    # Extension packagée
```

## 🚀 Commandes essentielles

```bash
# Installer les dépendances
npm install

# Lancer en développement (redémarre automatiquement)
npm run dev

# Lancer en production
npm start

# Changer le port
PORT=8080 npm run dev

# Lancer les tests
npm test
```

---

**Profitez de JobApp ! 💼**
