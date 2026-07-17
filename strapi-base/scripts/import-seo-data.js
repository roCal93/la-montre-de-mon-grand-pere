#!/usr/bin/env node

/**
 * Script d'import des données SEO dans Strapi
 * Usage: node scripts/import-seo-data.js
 * 
 * ⚠️ Assurez-vous que:
 * 1. Strapi est en cours d'exécution (npm run develop)
 * 2. STRAPI_API_TOKEN est défini dans .env
 */

const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_TOKEN) {
    console.error('❌ ERREUR: STRAPI_API_TOKEN manquant dans .env');
    process.exit(1);
}

/**
 * Données SEO à importer
 */
const SEO_DATA = {
    pages: [
        {
            slug: 'home',
            locale: 'fr',
            seoTitle: 'Montres Vintage Authentiques - La Montre de mon Grand-Père',
            seoDescription: 'Découvrez notre sélection de montres vintage soigneusement choisies pour leur histoire, qualité et caractère unique. Chaque pièce revisitée en atelier.',
            noIndex: false,
        },
        {
            slug: 'blog',
            locale: 'fr',
            seoTitle: 'Blog - Guides et Histoires de Montres Vintage',
            seoDescription: 'Plongez dans l\'univers des montres vintage. Découvrez les guides de révision, les histoires des manufactures oubliées et les conseils d\'expert en horlogerie.',
            noIndex: false,
        },
        {
            slug: 'boutique',
            locale: 'fr',
            seoTitle: 'Boutique - Montres Vintage Révisées et Authentiques',
            seoDescription: 'Parcourez notre collection de montres vintage des années 50 à 80. Toutes les pièces sont révisées en atelier, contrôlées et prêtes à être portées.',
            noIndex: false,
        },
    ],
    products: [
        {
            slug: 'eza',
            locale: 'fr',
            seoTitle: 'Montre Eza Vintage - Années 60-70 Révisée',
            seoDescription: 'Découvrez la montre Eza des années 60-70. Pièce vintage authentique révisée en atelier, contrôlée et prête à être portée. Prix: 220€',
            noIndex: false,
        },
        {
            slug: 'product',
            locale: 'fr',
            seoTitle: 'Montre Classique Vintage - Années 50-60',
            seoDescription: 'Montre vintage classique des années 50-60. Entièrement révisée et reconditionnée. Pièce authentique avec un caractère intemporel. Prix: 170€',
            noIndex: false,
        },
        {
            slug: 'mickey-mouse',
            locale: 'fr',
            seoTitle: 'Montre Mickey Mouse Vintage - Années 70-80',
            seoDescription: 'Montre Mickey Mouse des années 70-80. Pièce collector révisée en atelier. Un incontournable pour les amateurs de montres vintages avec caractère. Prix: 170€',
            noIndex: false,
        },
    ],
};

/**
 * Appel API générique
 */
async function strapiRequest(endpoint, method = 'GET', body = null) {
    const url = `${STRAPI_URL}/api${endpoint}`;

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`[${response.status}] ${error}`);
    }

    return response.json();
}

/**
 * Mettre à jour une page
 */
async function updatePage(slug, seoData) {
    try {
        console.log(`📄 Mise à jour page: ${slug}...`);

        // Récupérer l'ID de la page
        const response = await strapiRequest(
            `/pages?filters[slug][$eq]=${slug}&locale=${seoData.locale}`
        );

        if (!response.data || response.data.length === 0) {
            console.log(`  ⚠️  Page "${slug}" non trouvée`);
            return;
        }

        const pageId = response.data[0].documentId;

        // Mettre à jour la page
        await strapiRequest(`/pages/${pageId}`, 'PUT', {
            data: {
                seoTitle: seoData.seoTitle,
                seoDescription: seoData.seoDescription,
                noIndex: seoData.noIndex,
            },
        });

        console.log(`  ✅ Page mise à jour`);
    } catch (error) {
        console.error(`  ❌ Erreur: ${error.message}`);
    }
}

/**
 * Mettre à jour un produit
 */
async function updateProduct(slug, seoData) {
    try {
        console.log(`🛍️  Mise à jour produit: ${slug}...`);

        // Récupérer l'ID du produit
        const response = await strapiRequest(
            `/products?filters[slug][$eq]=${slug}&locale=${seoData.locale}`
        );

        if (!response.data || response.data.length === 0) {
            console.log(`  ⚠️  Produit "${slug}" non trouvé`);
            return;
        }

        const productId = response.data[0].documentId;

        // Mettre à jour le produit
        await strapiRequest(`/products/${productId}`, 'PUT', {
            data: {
                seoTitle: seoData.seoTitle,
                seoDescription: seoData.seoDescription,
                noIndex: seoData.noIndex,
            },
        });

        console.log(`  ✅ Produit mis à jour`);
    } catch (error) {
        console.error(`  ❌ Erreur: ${error.message}`);
    }
}

/**
 * Fonction principale
 */
async function main() {
    console.log('🚀 Démarrage de l\'import des données SEO...\n');
    console.log(`📍 URL Strapi: ${STRAPI_URL}`);
    console.log(`🔑 Token: ${STRAPI_API_TOKEN.substring(0, 10)}...\n`);

    try {
        // Importer les pages
        console.log('📑 Mise à jour des PAGES:\n');
        for (const pageData of SEO_DATA.pages) {
            await updatePage(pageData.slug, pageData);
        }

        console.log('\n');

        // Importer les produits
        console.log('🛍️  Mise à jour des PRODUITS:\n');
        for (const productData of SEO_DATA.products) {
            await updateProduct(productData.slug, productData);
        }

        console.log('\n✨ Import terminé avec succès!');
        console.log('\n📊 Prochaines étapes:');
        console.log('1. Vérifier dans Strapi que les champs SEO sont bien remplis');
        console.log('2. Redémarrer Next.js: npm run dev');
        console.log('3. Tester les meta tags: https://www.metatags.io/');
    } catch (error) {
        console.error('\n❌ Erreur fatale:', error.message);
        process.exit(1);
    }
}

// Lancer le script
main();
