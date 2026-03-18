#!/usr/bin/env node

/**
 * Script de synchronisation des types depuis Strapi (côté Next.js)
 * Copie le fichier de types généré par Strapi vers ce projet
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemins
const STRAPI_TYPES_FILE = path.join(__dirname, '..', '..', 'strapi-base', 'types', 'strapi-types.d.ts');
const NEXTJS_TYPES_DIR = path.join(__dirname, '..', 'src', 'types', 'strapi');
const NEXTJS_TYPES_FILE = path.join(NEXTJS_TYPES_DIR, 'index.ts');

function main() {
    console.log('🔄 Synchronisation des types Strapi vers Next.js...\n');

    try {
        // Vérifier que le fichier source existe
        if (!fs.existsSync(STRAPI_TYPES_FILE)) {
            console.error('❌ Le fichier de types Strapi n\'existe pas.');
            console.error('   Chemin attendu:', STRAPI_TYPES_FILE);
            console.error('\n💡 Depuis le projet strapi-base, exécutez:');
            console.error('   npm run generate:types');
            process.exit(1);
        }

        // Créer le dossier de destination s'il n'existe pas
        if (!fs.existsSync(NEXTJS_TYPES_DIR)) {
            fs.mkdirSync(NEXTJS_TYPES_DIR, { recursive: true });
            console.log('📁 Dossier de types créé');
        }

        // Copier le fichier
        const typesContent = fs.readFileSync(STRAPI_TYPES_FILE, 'utf8');

        // Ajouter un en-tête spécifique pour Next.js
        const nextjsContent = `/**
 * Types TypeScript Strapi pour Next.js
 * 
 * ⚠️  FICHIER AUTO-GÉNÉRÉ - NE PAS MODIFIER
 * 
 * Ce fichier est synchronisé depuis strapi-base/types/strapi-types.d.ts
 * Pour mettre à jour:
 *   1. Depuis strapi-base: npm run generate:types
 *   2. Depuis strapi-base: npm run sync:types
 *   
 * Ou depuis nextjs-base: npm run sync:types
 */

${typesContent.split('\n').slice(9).join('\n')}`;

        fs.writeFileSync(NEXTJS_TYPES_FILE, nextjsContent, 'utf8');

        console.log('✅ Types synchronisés avec succès !');
        console.log(`📄 Source: ${path.relative(process.cwd(), STRAPI_TYPES_FILE)}`);
        console.log(`📄 Destination: ${path.relative(process.cwd(), NEXTJS_TYPES_FILE)}`);
        console.log('\n💡 Les types sont maintenant disponibles via:');
        console.log('   import { Page, PageEntity, ... } from "@/types/strapi"');

    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error.message);
        process.exit(1);
    }
}

main();
