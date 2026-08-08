# 🚀 Guide d'Installation Rapide pour Mac

## Installation en 3 étapes

### Étape 1 : Installer Node.js (si pas déjà installé)

Téléchargez et installez Node.js depuis : https://nodejs.org/
- Version recommandée : **LTS (Long Term Support)**
- Minimum requis : Node.js 20+

Pour vérifier si Node.js est installé :
```bash
node -v
```

### Étape 2 : Installer et lancer l'application

Ouvrez le Terminal et naviguez vers le dossier JobApp :
```bash
cd /chemin/vers/JobApp
```

**Option A - Script automatique (Recommandé)** :
```bash
chmod +x start-mac.sh
./start-mac.sh
```

**Option B - Commandes manuelles** :
```bash
npm install
npm run dev
```

L'application sera accessible sur : **http://localhost:3000**

### Étape 3 : Installer l'extension Chrome

1. Ouvrez Google Chrome
2. Allez à : `chrome://extensions/`
3. Activez **"Mode développeur"** (coin supérieur droit)
4. Cliquez sur **"Charger l'extension non empaquetée"**
5. Sélectionnez le dossier : `JobApp/chrome-extension`

**OU** utilisez le fichier ZIP :
- Décompressez `JobApp-Chrome-Extension.zip`
- Chargez le dossier décompressé

## ✅ C'est prêt !

- 🌐 **Application Web** : http://localhost:3000
- 🔌 **Extension Chrome** : Cliquez sur l'icône 💼 dans Chrome

## 📝 Utilisation

### Via l'Application Web
1. Ouvrez http://localhost:3000
2. Ajoutez des offres d'emploi
3. Consultez les offres disponibles

### Via l'Extension Chrome
1. Cliquez sur l'icône JobApp 💼 dans Chrome
2. Vérifiez que le point est vert (serveur connecté)
3. Utilisez les fonctionnalités :
   - **Publier** : Ajoutez une offre manuellement
   - **Extraire** : Importez depuis LinkedIn, Indeed, etc.
   - **Importer** : 10 offres exemple WTTJ

## 🛠 Commandes Utiles

```bash
# Lancer en mode développement (redémarre automatiquement)
npm run dev

# Lancer en mode production
npm start

# Lancer les tests
npm test

# Changer le port (par défaut: 3000)
PORT=8080 npm run dev
```

## 🐛 Problèmes Courants

### Le serveur ne démarre pas
- Vérifiez que le port 3000 n'est pas déjà utilisé
- Utilisez un autre port : `PORT=8080 npm run dev`

### L'extension ne se connecte pas
- Assurez-vous que le serveur est lancé
- Vérifiez l'URL dans Paramètres de l'extension
- Par défaut : `http://localhost:3000`

### Erreur lors de l'installation
- Supprimez le dossier `node_modules`
- Relancez : `npm install`

## 📱 Fonctionnalités

✅ Publier des offres d'emploi  
✅ Consulter toutes les offres  
✅ Postuler aux offres  
✅ Extension Chrome avec extraction automatique  
✅ Import depuis LinkedIn, Indeed, WTTJ  
✅ API REST complète  
✅ Interface moderne et responsive  

## 🎯 Sites Supportés (Extension)

L'extraction automatique fonctionne sur :
- LinkedIn
- Indeed
- Welcome to the Jungle
- Monster
- Glassdoor
- Et plus encore !

## 🔄 Mise à Jour

Pour mettre à jour l'application :
```bash
git pull
npm install
npm run dev
```

Pour mettre à jour l'extension :
- Chrome → Extensions → Icône de rafraîchissement sur l'extension JobApp

## 📞 Support

Pour toute question ou problème :
1. Consultez le README.md complet
2. Consultez chrome-extension/README.md pour l'extension
3. Vérifiez que vous avez Node.js 20+

---

**Fait avec ❤️ pour simplifier la gestion des offres d'emploi**
