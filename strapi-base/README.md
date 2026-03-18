# Template Strapi – Hakuna Mataweb

Template backend pour les projets clients.

## Stack
- Strapi 5
- PostgreSQL (production)
- SQLite (local)
- TypeScript

## Hébergement
- Railway ou VPS

## Utilisation

### 1. Initialisation
```bash
# Copier ce template
cp -r templates/strapi-base projects/clients/mon-projet-backend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
```

### 2. Développement
```bash
# Lancer le serveur de développement
npm run dev

# Le serveur démarre sur http://localhost:1337
# Admin panel: http://localhost:1337/admin
```

### 3. Types TypeScript

#### Génération automatique
Les types TypeScript sont générés automatiquement à partir de vos Content-Types et Components Strapi.

```bash
# Générer les types uniquement
npm run generate:types

# Générer ET synchroniser avec Next.js
npm run types

# Synchroniser seulement (si déjà générés)
npm run sync:types
```

#### Après modification d'un Content-Type
Chaque fois que vous créez ou modifiez un Content-Type dans Strapi :
1. Sauvegardez les modifications dans le Content-Type Builder
2. Exécutez `npm run types`
3. Les types sont mis à jour dans `/types/strapi-types.d.ts`
4. Les types sont automatiquement copiés vers le projet Next.js

#### Structure des fichiers
```
strapi-base/
├── types/
│   └── strapi-types.d.ts          # Types générés (NE PAS MODIFIER)
├── scripts/
│   ├── generate-types.js          # Génération des types
│   └── sync-types.js              # Synchronisation vers Next.js
└── src/
    └── api/                        # Vos Content-Types (source des types)
```

### 4. Déploiement
```bash
# Build de production
npm run build

# Lancer en production
npm start
```

## Configuration

### Variables d'environnement
Créez un fichier `.env` avec :
```env
# Server
HOST=0.0.0.0
PORT=1337

# Database
DATABASE_CLIENT=better-sqlite3
DATABASE_FILENAME=.tmp/data.db

# Production: PostgreSQL
# DATABASE_CLIENT=postgres
# DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Admin JWT
ADMIN_JWT_SECRET=votre-secret
JWT_SECRET=votre-secret

# API Tokens (optionnel)
API_TOKEN_SALT=votre-salt

# Cloudinary - required for uploads in production (preferred)
# CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
# or (less recommended):
# CLOUDINARY_NAME=your_cloud
# CLOUDINARY_KEY=your_key
# CLOUDINARY_SECRET=your_secret
```

### Vérifications manuelles (Cloudinary)
Reportez-vous à `HAKUNA_MATAWEB_AGENCE/docs/cloudinary-setup.md` pour la checklist de vérification (upload test, CSP, image provider).

## Bonnes pratiques

### Content-Types
- Utilisez des noms en anglais (page, article, product)
- Activez Draft & Publish pour le contenu éditorial
- Configurez les permissions API appropriées

### Components
- Regroupez par catégorie (sections, blocks, ui)
- Réutilisez au maximum
- Documentez dans le displayName

### Types TypeScript
- Ne modifiez JAMAIS les fichiers générés
- Régénérez après chaque changement de schema
- Vérifiez la synchronisation avec Next.js

## Scripts disponibles
```bash
npm run dev              # Développement avec auto-reload
npm run build            # Build de production
npm run start            # Démarrer en production
npm run generate:types   # Générer les types TypeScript
npm run sync:types       # Synchroniser avec Next.js
npm run types            # Générer + Synchroniser
```

## Troubleshooting

### Types non à jour
```bash
# Depuis strapi-base
npm run types

# Vérifier que le fichier existe
cat types/strapi-types.d.ts
```

### Erreurs de synchronisation
Assurez-vous que le projet Next.js est au bon emplacement :
```
templates/
├── strapi-base/      # Ici
└── nextjs-base/      # Là
```

⚠️ **Ne jamais modifier ce template directement**  
Pour un nouveau projet : copiez le dossier complet dans `/projects/clients/`
