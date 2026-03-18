# Déploiement Strapi sur Railway

## 📋 Prérequis

- Compte GitHub
- Compte Railway (gratuit)
- Code poussé sur GitHub
- Node 20.x (`nvm use` lit le `.nvmrc`)

## 🚀 Étapes de déploiement

### 1. Créer un projet Railway

1. Allez sur [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Sélectionnez votre repository `hakuna-mataweb-base-strapi`

### 2. Ajouter PostgreSQL

1. Dans votre projet : **New** → **Database** → **Add PostgreSQL**
2. Railway créera automatiquement `DATABASE_URL`

### 3. Configurer les variables d'environnement

Dans Railway → Settings → Variables, ajoutez :

```env
NODE_ENV=production
DATABASE_CLIENT=postgres

# Générez ces secrets avec : openssl rand -base64 32
APP_KEYS=secret1,secret2
API_TOKEN_SALT=votre-secret
ADMIN_JWT_SECRET=votre-secret
TRANSFER_TOKEN_SALT=votre-secret
JWT_SECRET=votre-secret

# CORS - Domaines autorisés (séparés par des virgules)
# Exemple pour un site Amanda Traduction :
ALLOWED_ORIGINS=https://amandatraduction.com,https://www.amandatraduction.com,https://traduction-amanda-production.up.railway.app

# Notes:
# - Les previews Vercel sont autorisées automatiquement par regex (si configuré dans middleware),
#   vous n'avez pas besoin d'énumérer toutes les URLs de preview.
# - Évitez d'utiliser "*" quand `credentials: true` est activé pour des raisons de sécurité.
# - Après modification, redémarrez / redeployez votre service Strapi pour appliquer la nouvelle valeur.

# Test CORS depuis votre machine (vérifier la présence de Access-Control-Allow-Origin)
# Remplacez <ORIGIN> par l'origin à tester (ex: https://www.amandatraduction.com)
# Exemple :
# curl -i -H "Origin: https://www.amandatraduction.com" -G "https://traduction-amanda-production.up.railway.app/api/work-items" --data-urlencode "pagination[limit]=1"
# La réponse doit contenir "Access-Control-Allow-Origin: https://www.amandatraduction.com"

# Script helper
# Vous pouvez aussi utiliser le script fourni pour tester :
# ./scripts/check-cors.sh "https://www.amandatraduction.com" "https://traduction-amanda-production.up.railway.app/api/work-items?pagination[limit]=1"
```

Astuce (si erreur SWC lors du build) :

- Ajoutez aussi `NIXPACKS_NODE_VERSION=20` dans les variables Railway
- Assurez-vous que les dépendances optionnelles NPM ne sont pas omises (SWC)
	- Option 1 : ajoutez `NPM_CONFIG_OPTIONAL=true` dans Railway
	- Option 2 : gardez `optional=true` dans `.npmrc` (déjà configuré dans ce template)
- Ou commitez un fichier `.nvmrc` avec `20` (déjà présent dans ce template)
- Relancez un déploiement en vidant le cache (`Redeploy → Clear build cache`)

Note : certaines configurations Railway/Railpack peuvent réutiliser un cache d'installation (`npm ci cached`).
Si vous voyez une erreur du type `Cannot find module @rollup/rollup-linux-x64-gnu` ou `Failed to load native binding`,
le template déclenche maintenant un contrôle automatique avant `npm run build` pour réinstaller les dépendances optionnelles si nécessaire.

### 4. Déploiement automatique

Railway va :
1. ✅ Installer les dépendances (`npm install`)
2. ✅ Build Strapi (`npm run build`)
3. ✅ Démarrer (`npm start`)

### 5. Accéder à Strapi

URL fournie par Railway : `https://votre-projet.up.railway.app`

Admin : `https://votre-projet.up.railway.app/admin`

## 🔐 Sécurité

- ⚠️ Changez **tous** les secrets par défaut
- ✅ Activez SSL sur la base de données en production
- ✅ CORS configuré dans [config/middlewares.ts](config/middlewares.ts) - Ajoutez `ALLOWED_ORIGINS` dans Railway

## 📦 Scripts disponibles

```bash
npm run dev       # Développement local
npm run build     # Build pour production
npm run start     # Démarrer en production
```

## 🔄 Mises à jour

Railway redéploie automatiquement à chaque push sur la branche `main`.

## 💡 Conseils

- Railway offre **5$/mois gratuit**
- PostgreSQL inclus gratuitement
- Utilisez des variables d'environnement pour tous les secrets
- Testez en local avec PostgreSQL avant de déployer

## 🆘 Dépannage

**Erreur de build** : Vérifiez que `DATABASE_CLIENT=postgres` est défini

**Erreur de connexion** : Railway injecte automatiquement `DATABASE_URL`

**Admin inaccessible** : Vérifiez que `NODE_ENV=production` est défini
