# Voxel Clone - Three.js & Django Channels

Ce projet est un clone de Minecraft basé sur le web, utilisant **Three.js** pour le rendu 3D côté client et **Django Channels** pour la gestion du multijoueur en temps réel via WebSockets.

## 🏗 Architecture

Le projet est divisé en deux parties principales :

### 1. Frontend (`/` et `/src`)
- **Framework** : Vanilla JS avec [Vite](https://vitejs.dev/) comme bundler.
- **Moteur 3D** : [Three.js](https://threejs.org/).
- **Génération de terrain** : `simplex-noise` pour la génération procédurale.
- **Réseau** : WebSocket natif pour communiquer avec le backend.

### 2. Backend (`/api`)
- **Framework** : Django.
- **Temps réel** : Django Channels (avec Daphne comme serveur ASGI).
- **Base de données** : SQLite (par défaut).
- **Apps** :
    - `game` : Gestion de la logique de jeu et des consommateurs WebSocket.
    - `console` : Outils d'administration ou de debug.

---

## 🚀 Installation et Développement Local

### Prérequis
- Node.js (v16+)
- Python (v3.10+)

### 1. Configuration du Backend
Le backend gère les connexions WebSocket.

```bash
# Aller dans le dossier api
cd api

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python manage.py migrate

# Lancer le serveur de développement
python manage.py runserver
# Le serveur sera accessible sur http://127.0.0.1:8000
```

### 2. Configuration du Frontend
Le frontend est l'interface de jeu.

```bash
# Revenir à la racine du projet
cd ..

# Installer les dépendances JS
npm install

# Lancer le serveur de développement Vite
npm run dev
```
Ouvrez votre navigateur sur l'URL indiquée par Vite (généralement `http://localhost:5173`).

---

## 🌍 Déploiement sur VPS

Un script de déploiement `send_to_vps.sh` est fourni pour automatiser la mise en production.

### Prérequis sur le VPS
- Un dossier `/root/ONDESVOXEL/` doit exister.
- Python et les dépendances doivent être installés sur le serveur.
- Un serveur web (Nginx) pour servir les fichiers statiques (le build du frontend) et faire proxy vers Daphne (backend).

### Fonctionnement du script `send_to_vps.sh`
Ce script effectue les actions suivantes :
1. **Sync Backend** : Envoie le dossier `api/` vers `/root/ONDESVOXEL/api/` via `rsync` (excluant la DB et les caches).
2. **Build Frontend** : Compile le projet Vite (`npm run vite build`).
3. **Assets** : Copie le dossier `assets/` dans le dossier de build `dist/`.
4. **Sync Frontend** : Envoie le contenu de `dist/` vers `/root/ONDESVOXEL/web/` via `scp`.
5. **Cleanup** : Supprime le dossier `dist/` local.

### Commande de déploiement
```bash
./send_to_vps.sh
```

### ⚠️ Configuration Important pour la Prod
Avant de déployer, assurez-vous que l'URL du WebSocket dans `src/NetworkManager.js` pointe vers votre IP publique ou nom de domaine, et non `localhost`.

```javascript
// src/NetworkManager.js
// Changer :
const wsUrl = 'ws://127.0.0.1:8000/ws/game/';
// Par votre IP/Domaine de prod :
const wsUrl = 'ws://148.230.117.98:8000/ws/game/'; // Exemple
```

---

## 📂 Structure du Projet

```
MCCLONE/
├── api/                 # Backend Django
│   ├── console/         # App Console
│   ├── game/            # App Game (Logique multijoueur)
│   ├── voxel_server/    # Config Django (settings, asgi, urls)
│   ├── manage.py
│   └── requirements.txt
├── assets/              # Textures et ressources statiques
├── public/              # Fichiers publics Vite
├── src/                 # Code source Frontend
│   ├── World/           # Logique du monde (Chunks, Blocks)
│   ├── Player/          # Logique du joueur (Physique, Input)
│   ├── Utils/           # Utilitaires
│   ├── NetworkManager.js # Gestion des WebSockets
│   ├── main.js          # Point d'entrée
│   └── ...
├── send_to_vps.sh       # Script de déploiement
├── package.json         # Dépendances Node
└── index.html           # Point d'entrée HTML
```