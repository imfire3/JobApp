# Configuration de l'Authentification OAuth

Ce guide explique comment configurer l'authentification Google et Apple pour JobApp.

## Vue d'ensemble

JobApp supporte l'authentification OAuth 2.0 avec :
- **Google Sign In** (OAuth 2.0)
- **Apple Sign In** (OAuth 2.0)

L'authentification est **optionnelle** : l'application fonctionne parfaitement sans configuration OAuth. Si les credentials ne sont pas configurés, un message "Authentication not configured" s'affiche au lieu des boutons de connexion.

## Configuration Google OAuth

### 1. Créer un Projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Dans le menu, allez dans "APIs & Services" → "Credentials"

### 2. Configurer l'écran de consentement OAuth

1. Cliquez sur "OAuth consent screen"
2. Choisissez "External" (ou "Internal" pour G Suite)
3. Remplissez les informations requises :
   - Nom de l'application : `JobApp`
   - Email de support utilisateur
   - Domaines autorisés (si applicable)
4. Ajoutez les scopes : `email` et `profile`
5. Sauvegardez

### 3. Créer les Credentials OAuth 2.0

1. Allez dans "Credentials" → "Create Credentials" → "OAuth client ID"
2. Type d'application : "Web application"
3. Nom : `JobApp Web Client`
4. Authorized redirect URIs :
   - Développement : `http://localhost:3000/auth/google/callback`
   - Production : `https://votre-domaine.com/auth/google/callback`
5. Cliquez sur "Create"
6. Copiez le **Client ID** et le **Client Secret**

### 4. Variables d'Environnement

Ajoutez dans votre fichier `.env` :

```bash
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

## Configuration Apple Sign In

### 1. Prérequis

- Compte Apple Developer ($99/an)
- Accès à [Apple Developer Portal](https://developer.apple.com/)

### 2. Créer un App ID

1. Allez sur [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Cliquez sur "+" pour créer un nouvel identifer
3. Sélectionnez "App IDs" → Continue
4. Sélectionnez "App" → Continue
5. Remplissez :
   - Description : `JobApp`
   - Bundle ID : `com.votre-entreprise.jobapp` (format reverse-domain)
6. Dans Capabilities, cochez "Sign In with Apple"
7. Continue → Register

### 3. Créer un Service ID

1. Créez un nouvel identifier
2. Sélectionnez "Services IDs" → Continue
3. Remplissez :
   - Description : `JobApp Web Service`
   - Identifier : `com.votre-entreprise.jobapp.web`
4. Cochez "Sign In with Apple" → Configure
5. Ajoutez votre domaine et redirect URLs :
   - Domains : `localhost` (dev) ou `votre-domaine.com` (prod)
   - Return URLs : `http://localhost:3000/auth/apple/callback`
6. Save → Continue → Register

### 4. Créer une Clé (Key)

1. Allez dans "Keys" → "+" pour créer une nouvelle clé
2. Nom : `JobApp Sign In Key`
3. Cochez "Sign In with Apple" → Configure
4. Sélectionnez votre App ID principal
5. Save → Continue → Register
6. **IMPORTANT** : Téléchargez le fichier `.p8` (vous ne pourrez pas le retélécharger)
7. Notez le **Key ID** (10 caractères)

### 5. Récupérer le Team ID

1. Allez dans [Membership](https://developer.apple.com/account/#!/membership/)
2. Copiez votre **Team ID**

### 6. Préparer la Clé Privée

Ouvrez le fichier `.p8` téléchargé et copiez son contenu. Vous devez l'encoder pour l'utiliser dans les variables d'environnement :

```bash
# Le contenu ressemble à ça :
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

### 7. Variables d'Environnement

Ajoutez dans votre fichier `.env` :

```bash
APPLE_CLIENT_ID=com.votre-entreprise.jobapp.web
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=YYYYYYYYYY
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback
```

**Note** : Les retours à la ligne dans `APPLE_PRIVATE_KEY` doivent être échappés avec `\n`

## Configuration de Session

Ajoutez également une clé secrète pour les sessions :

```bash
SESSION_SECRET=votre-secret-tres-securise-a-changer-en-production
```

**Important** : Générez un secret fort et unique pour la production !

## Fichier .env Complet

Exemple de fichier `.env` avec toutes les configurations :

```bash
# Serveur
PORT=3000
NODE_ENV=development
SESSION_SECRET=changez-moi-en-production

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Apple Sign In
APPLE_CLIENT_ID=com.exemple.jobapp.web
APPLE_TEAM_ID=ABC1234567
APPLE_KEY_ID=XYZ9876543
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkw...\n-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback
```

## Test de la Configuration

### 1. Sans OAuth configuré

```bash
npm run dev
```

Ouvrez http://localhost:3000 → Vous verrez "Authentication not configured"

### 2. Avec Google OAuth

```bash
GOOGLE_CLIENT_ID="votre-id" GOOGLE_CLIENT_SECRET="votre-secret" npm run dev
```

Ouvrez http://localhost:3000 → Vous verrez le bouton "Sign in with Google"

### 3. Vérification API

```bash
# Vérifier la configuration
curl http://localhost:3000/api/auth/config

# Réponse attendue :
{
  "googleEnabled": true,
  "appleEnabled": false
}

# Vérifier l'état de connexion
curl http://localhost:3000/api/auth/user

# Réponse si non connecté :
{
  "authenticated": false
}
```

## Déploiement en Production

### URLs de Callback

Changez les URLs pour votre domaine de production :

```bash
GOOGLE_CALLBACK_URL=https://votre-domaine.com/auth/google/callback
APPLE_CALLBACK_URL=https://votre-domaine.com/auth/apple/callback
```

### Sécurité

1. **Session Secret** : Générez un secret cryptographiquement fort
   ```bash
   # Exemple avec OpenSSL
   openssl rand -base64 32
   ```

2. **Cookies sécurisés** : En production, les cookies sont automatiquement sécurisés (HTTPS uniquement)

3. **HTTPS** : Utilisez toujours HTTPS en production

4. **Domaines autorisés** : 
   - Google : Ajoutez votre domaine dans "Authorized domains"
   - Apple : Ajoutez votre domaine dans le Service ID

### Store de Session

En production, utilisez un store persistent comme Redis :

```bash
npm install connect-redis redis
```

Puis modifiez `server.js` pour utiliser Redis au lieu du store en mémoire.

## Dépannage

### Google OAuth

**Erreur : "redirect_uri_mismatch"**
- Vérifiez que l'URL de callback est exactement celle configurée dans Google Console
- Vérifiez le protocole (http vs https)
- Vérifiez le port

**Erreur : "invalid_client"**
- Vérifiez le Client ID et Client Secret
- Assurez-vous qu'ils correspondent au même projet

### Apple Sign In

**Erreur : "invalid_client"**
- Vérifiez le Service ID (APPLE_CLIENT_ID)
- Vérifiez que Sign in with Apple est activé pour ce Service ID

**Erreur : "invalid_grant"**
- Vérifiez la clé privée (APPLE_PRIVATE_KEY)
- Vérifiez le Key ID
- Vérifiez le Team ID

**Erreur avec la clé privée**
- Assurez-vous que les `\n` sont bien présents dans la variable d'environnement
- Vérifiez que les lignes BEGIN et END sont complètes

### Général

**Les boutons n'apparaissent pas**
- Vérifiez que les variables d'environnement sont bien chargées
- Testez l'endpoint `/api/auth/config`
- Vérifiez les logs du serveur au démarrage

**Session ne persiste pas**
- Vérifiez que SESSION_SECRET est défini
- En développement, utilisez http (pas https) avec localhost
- Vérifiez les cookies dans les DevTools du navigateur

## Ressources

### Google
- [Documentation OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Console Google Cloud](https://console.cloud.google.com/)

### Apple
- [Documentation Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [Apple Developer Portal](https://developer.apple.com/account/)

### Passport.js
- [passport-google-oauth20](https://www.passportjs.org/packages/passport-google-oauth20/)
- [passport-apple](https://www.passportjs.org/packages/passport-apple/)
