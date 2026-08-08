#!/bin/bash
# Script d'installation et de lancement pour Mac

echo "🚀 Installation et lancement de JobApp"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé!"
    echo "📥 Téléchargez Node.js sur: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js version $NODE_VERSION détectée. Version 20+ recommandée."
    echo "📥 Téléchargez la dernière version sur: https://nodejs.org/"
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Install dependencies
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"
echo ""

# Start server
echo "🎯 Lancement du serveur JobApp..."
echo ""
echo "📍 L'application sera accessible sur: http://localhost:3000"
echo "🛑 Pour arrêter le serveur: Ctrl+C"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
