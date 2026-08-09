# 💼 JobApp - Application de Gestion d'Emplois

Application web complète avec extension Chrome pour gérer et publier des offres d'emploi.

## 📦 Contenu du Projet

### 1. Application Web (Node.js + Express)
- **Backend API** : Server Express avec endpoints REST
- **Frontend** : Interface web moderne (HTML/CSS/JS)
- **Base de données** : En mémoire (pour développement)

### 2. Extension Chrome
- **Extraction automatique** d'offres depuis LinkedIn, Indeed, Welcome to the Jungle
- **Publication rapide** depuis n'importe quelle page web
- **Interface moderne** avec design dégradé violet

## 🚀 Installation Rapide

### Sur Mac (ou Linux)

1. **Prérequis** : Node.js 20+ ([Télécharger ici](https://nodejs.org/))

2. **Lancer l'application** :
   ```bash
   npm install
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:3000`

3. **Installer l'extension Chrome** :
   - Ouvrez Chrome → `chrome://extensions/`
   - Activez "Mode développeur"
   - "Charger l'extension non empaquetée" → Sélectionnez le dossier `chrome-extension`
   
   OU utilisez le fichier `JobApp-Chrome-Extension.zip`

## 📂 Structure du Projet

```
JobApp/
├── server.js                 # Serveur Express (Backend)
├── package.json             # Dépendances Node.js
├── public/                  # Frontend
│   ├── index.html          # Page principale
│   ├── style.css           # Styles
│   └── app.js              # Logique frontend
├── chrome-extension/        # Extension Chrome
│   ├── manifest.json       # Config extension
│   ├── popup.html          # Interface popup
│   ├── popup.js            # Logique popup
│   ├── content.js          # Extraction de contenu
│   ├── background.js       # Service worker
│   ├── icon*.png           # Icônes
│   └── README.md           # Doc extension
└── test/                    # Tests
    └── api.test.js         # Tests API
```

## ✨ Fonctionnalités

### Application Web
- ✅ **Authentification Google et Apple** (OAuth 2.0)
- ✅ Publier des offres d'emploi
- ✅ Voir toutes les offres
- ✅ Postuler aux offres
- ✅ Importer des offres depuis Welcome to the Jungle (mock)
- ✅ **Exporter vers Excel (.xlsx)**
- ✅ **Exporter vers CSV (.csv)**
- ✅ API REST complète

### Extension Chrome
- ✅ Extraction automatique depuis les sites d'emploi
- ✅ Publication rapide d'offres
- ✅ Synchronisation avec le serveur
- ✅ Interface élégante et moderne
- ✅ Badge avec nombre d'offres

## 🌐 API Endpoints

### Emplois
- `GET /api/health` - Vérifier l'état du serveur
- `GET /api/jobs` - Liste toutes les offres
- `POST /api/jobs` - Créer une nouvelle offre
- `POST /api/jobs/:id/apply` - Postuler à une offre
- `POST /api/import/wttj/mock` - Importer 10 offres exemple
- **`GET /api/export/excel` - Exporter toutes les offres en Excel**
- **`GET /api/export/csv` - Exporter toutes les offres en CSV**

### Authentification
- `GET /auth/google` - Connexion avec Google
- `GET /auth/google/callback` - Callback Google OAuth
- `GET /auth/apple` - Connexion avec Apple
- `GET /auth/apple/callback` - Callback Apple OAuth
- `GET /auth/logout` - Déconnexion
- `GET /api/auth/user` - Récupérer l'utilisateur connecté
- `GET /api/auth/config` - Configuration des providers d'authentification

## 🧪 Tests

```bash
npm test
```

## 📱 Utilisation

### Via l'Application Web
1. Ouvrez `http://localhost:3000`
2. Utilisez le formulaire pour publier une offre
3. Consultez les offres disponibles
4. Postulez en un clic

### Via l'Extension Chrome
1. Cliquez sur l'icône JobApp dans Chrome
2. Vérifiez que le serveur est en ligne (point vert)
3. Options :
   - **Publier** : Créez une offre manuellement
   - **Extraire** : Importez depuis la page actuelle
   - **Paramètres** : Configurez l'URL du serveur

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet (voir `.env.example`) :

```bash
# Configuration du serveur
PORT=3000
SESSION_SECRET=your-secure-session-secret

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Apple Sign In (optionnel)
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Key\n-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback
```

### Configuration OAuth

#### Google OAuth
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet
3. Activez l'API "Google+ API"
4. Créez des identifiants OAuth 2.0
5. Ajoutez `http://localhost:3000/auth/google/callback` dans les URI de redirection

#### Apple Sign In
1. Allez sur [Apple Developer](https://developer.apple.com/)
2. Créez un Service ID
3. Configurez Sign in with Apple
4. Créez une clé privée et téléchargez-la
5. Ajoutez `http://localhost:3000/auth/apple/callback` dans les URI de redirection

**Note** : L'authentification est optionnelle. L'application fonctionne sans configuration OAuth, mais les boutons de connexion ne seront pas affichés.

### Changer le Port
```bash
PORT=8080 npm run dev
```

### URL du Serveur (Extension)
Dans l'extension → Paramètres → Modifier l'URL

## 📥 Téléchargement sur Mac

### Depuis cette VM Cloud
Les fichiers sont prêts dans `/workspace`. Vous pouvez :

1. **Télécharger tout le projet** :
   - Utilisez Git : `git clone <url>`
   - Ou téléchargez le ZIP du repository

2. **Installer sur votre Mac** :
   ```bash
   cd JobApp
   npm install
   npm run dev
   ```

3. **Installer l'extension** :
   - Décompressez `JobApp-Chrome-Extension.zip`
   - Chargez dans Chrome comme indiqué ci-dessus

## 🌟 Technologies

- **Backend** : Node.js, Express.js
- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Extension** : Chrome Extension API (Manifest V3)
- **Tests** : Node.js Test Runner

## 🐛 Support

Pour tout problème :
1. Vérifiez que Node.js 20+ est installé
2. Vérifiez que le port 3000 est disponible
3. Consultez `chrome-extension/README.md` pour l'extension

## 📝 Notes de Développement

- Les données sont stockées **en mémoire** et se réinitialisent au redémarrage
- Pour une utilisation en production, ajoutez une vraie base de données (MongoDB, PostgreSQL, etc.)
- L'extension nécessite que le serveur soit lancé pour fonctionner

## 🎨 Captures d'écran

L'extension Chrome présente :
- Design moderne avec dégradé violet (#667eea → #764ba2)
- Interface à onglets (Publier / Extraire / Paramètres)
- Indicateur de statut du serveur
- Extraction intelligente depuis les sites d'emploi populaires

## 📄 Licence

Open Source - Libre d'utilisation et de modification

---

**Fait avec ❤️ pour faciliter la gestion des offres d'emploi**
