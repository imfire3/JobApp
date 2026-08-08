# 💼 JobApp Chrome Extension

Extension Chrome pour gérer facilement vos offres d'emploi avec JobApp.

## ✨ Fonctionnalités

- **Publication rapide** : Publiez des offres d'emploi directement depuis n'importe quelle page web
- **Extraction intelligente** : Extrait automatiquement les informations des offres depuis LinkedIn, Indeed, Welcome to the Jungle et autres sites d'emploi
- **Import en masse** : Importez des offres d'emploi en un clic
- **Interface moderne** : Design élégant avec thème dégradé violet
- **Synchronisation** : Se connecte à votre serveur JobApp local ou distant

## 🚀 Installation sur Chrome/Edge

### Méthode 1 : Installation manuelle (Développement)

1. Ouvrez Chrome et allez à `chrome://extensions/`
2. Activez le **Mode développeur** (coin supérieur droit)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `chrome-extension`

### Méthode 2 : Installation via fichier ZIP

1. Compressez le dossier `chrome-extension` en ZIP
2. Suivez les étapes de la Méthode 1 et chargez le ZIP

## 📦 Installation de l'application JobApp

### Sur Mac (développement local)

1. Assurez-vous d'avoir Node.js installé (version 20 ou supérieure)
2. Téléchargez les fichiers du projet
3. Ouvrez le Terminal et naviguez vers le dossier du projet
4. Installez les dépendances :
   ```bash
   npm install
   ```
5. Lancez le serveur :
   ```bash
   npm run dev
   ```
6. Ouvrez votre navigateur à `http://localhost:3000`

### Sur Mac (via zip téléchargé depuis cette VM)

1. Les fichiers sont prêts dans `/workspace`
2. Vous pouvez télécharger le projet complet
3. Suivez les mêmes étapes que ci-dessus

## 🎯 Utilisation

1. **Lancer l'extension** : Cliquez sur l'icône JobApp dans la barre d'outils Chrome
2. **Vérifier la connexion** : Le point vert indique que le serveur est accessible
3. **Publier une offre** :
   - Remplissez le formulaire manuellement
   - OU cliquez sur "Extraire depuis la page actuelle" si vous êtes sur un site d'emploi
4. **Extraire automatiquement** : 
   - Allez sur une page d'offre d'emploi (LinkedIn, Indeed, etc.)
   - Ouvrez l'extension
   - Cliquez sur "Extraire les infos"
5. **Importer des exemples** : Onglet "Extraire" → "Importer 10 jobs Welcome to the Jungle"

## ⚙️ Configuration

Dans l'onglet **Paramètres** :
- Modifiez l'URL du serveur si vous utilisez un serveur distant
- Par défaut : `http://localhost:3000`

## 🌐 Sites compatibles pour l'extraction

- LinkedIn
- Indeed
- Welcome to the Jungle
- Et bien d'autres sites d'emploi

## 🔧 Développement

Structure de l'extension :
```
chrome-extension/
├── manifest.json      # Configuration de l'extension
├── popup.html        # Interface popup
├── popup.js          # Logique du popup
├── content.js        # Script d'extraction de contenu
├── background.js     # Service worker
└── icon*.png         # Icônes
```

## 📝 Notes

- L'extension nécessite que le serveur JobApp soit en cours d'exécution
- Les données sont stockées sur le serveur (pas dans l'extension)
- L'extraction fonctionne mieux sur les pages d'offres d'emploi standard

## 🐛 Dépannage

**L'extension ne se connecte pas au serveur :**
- Vérifiez que le serveur JobApp est lancé (`npm run dev`)
- Vérifiez l'URL du serveur dans les paramètres
- Assurez-vous que le port 3000 n'est pas bloqué

**L'extraction ne fonctionne pas :**
- Actualisez la page web
- Réinstallez l'extension
- Certains sites peuvent bloquer l'extraction

## 📄 Licence

Ce projet est open source.
