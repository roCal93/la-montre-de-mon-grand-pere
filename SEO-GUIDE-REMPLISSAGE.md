# 📋 Guide de Remplissage des Champs SEO

Guide complet pour remplir les champs SEO des pages, articles de blog et produits dans Strapi.

---

## 1️⃣ PAGE ACCUEIL

**Slug:** `home` (ou vide)

| Champ | Contenu | Caractères |
|-------|---------|-----------|
| **seoTitle** | Montres Vintage Authentiques - La Montre de mon Grand-Père | 65 |
| **seoDescription** | Découvrez notre sélection de montres vintage soigneusement choisies pour leur histoire, qualité et caractère unique. Chaque pièce revisitée en atelier. | 155 |
| **seoImage** | Logo ou hero image du site (hauteur: 1200x630px) | - |
| **noIndex** | `FALSE` | - |

### Meta Tags générés:
```
<title>Montres Vintage Authentiques - La Montre de mon Grand-Père</title>
<meta name="description" content="Découvrez notre sélection de montres vintage soigneusement choisies pour leur histoire, qualité et caractère unique. Chaque pièce revisitée en atelier.">
<meta property="og:title" content="Montres Vintage Authentiques - La Montre de mon Grand-Père">
<meta property="og:description" content="Découvrez notre sélection de montres vintage soigneusement choisies pour leur histoire, qualité et caractère unique. Chaque pièce revisitée en atelier.">
```

---

## 2️⃣ PAGE BLOG

**Slug:** `blog`

| Champ | Contenu | Caractères |
|-------|---------|-----------|
| **seoTitle** | Blog - Guides et Histoires de Montres Vintage | 55 |
| **seoDescription** | Plongez dans l'univers des montres vintage. Découvrez les guides de révision, les histoires des manufactures oubliées et les conseils d'expert en horlogerie. | 160 |
| **seoImage** | Image représentative du blog | - |
| **noIndex** | `FALSE` | - |

---

## 3️⃣ PAGE CATALOGUE (BOUTIQUE)

**Slug:** `boutique`

| Champ | Contenu | Caractères |
|-------|---------|-----------|
| **seoTitle** | Boutique - Montres Vintage Révisées et Authentiques | 60 |
| **seoDescription** | Parcourez notre collection de montres vintage des années 50 à 80. Toutes les pièces sont révisées en atelier, contrôlées et prêtes à être portées. | 160 |
| **seoImage** | Photo d'un produit phare ou du catalogue | - |
| **noIndex** | `FALSE` | - |

---

## 4️⃣ PAGE PANIER

⚠️ **Remarque:** La page panier est une page système Next.js (pas dans Strapi).  
Si vous voulez l'optimiser pour le SEO, il faut le faire dans le code Next.js.

```typescript
// Dans nextjs-base/src/app/[locale]/panier/page.tsx
export const metadata: Metadata = {
  title: 'Panier - La Montre de mon Grand-Père',
  description: 'Gérez vos articles et procédez au paiement sécurisé de votre commande.',
  robots: 'noindex, follow'  // Important: ne pas indexer les pages du panier
}
```

---

## 5️⃣ PRODUITS - EXEMPLES

### Produit 1: Eza

| Champ | Contenu | Caractères |
|-------|---------|-----------|
| **seoTitle** | Montre Eza Vintage - Années 60-70 Révisée | 50 |
| **seoDescription** | Découvrez la montre Eza des années 60-70. Pièce vintage authentique révisée en atelier, contrôlée et prête à être portée. Prix: 220€ | 155 |
| **seoImage** | Photo haute résolution du produit Eza | - |
| **noIndex** | `FALSE` | - |

### Produit 2: Classique

| Champ | Contenu | Caractères |
|-------|---------|-----------|
| **seoTitle** | Montre Classique Vintage - Années 50-60 | 48 |
| **seoDescription** | Montre vintage classique des années 50-60. Entièrement révisée et reconditionnée. Pièce authentique avec un caractère intemporel. Prix: 170€ | 160 |
| **seoImage** | Photo du produit Classique | - |
| **noIndex** | `FALSE` | - |

### Produit 3: Mickey Mouse

| Champ | Contenu | Caractères |
|-------|---------|-----------|
| **seoTitle** | Montre Mickey Mouse Vintage - Années 70-80 | 49 |
| **seoDescription** | Montre Mickey Mouse des années 70-80. Pièce collector révisée en atelier. Un incontournable pour les amateurs de montres vintages avec caractère. Prix: 170€ | 160 |
| **seoImage** | Photo du produit Mickey Mouse | - |
| **noIndex** | `FALSE` | - |

---

## 📝 ARTICLES DE BLOG - STRUCTURE

Pour chaque nouvel article, proposez une structure:

| Champ | Exemple |
|-------|---------|
| **seoTitle** | [Titre Article] - La Montre de mon Grand-Père (max 65 car) |
| **seoDescription** | [Courte description de 155-160 caractères qui invite à cliquer] |
| **seoImage** | [Image représentative - 1200x630px] |
| **noIndex** | `FALSE` |

**Exemple d'article:**
```
Title: "Comment reconnaître une véritable montre vintage ?"
seoTitle: "Guide - Reconnaître une Vraie Montre Vintage | Experts"
seoDescription: "Découvrez comment distinguer une véritable montre vintage. Nos 5 critères essentiels pour évaluer l'authenticité, l'état et la valeur d'une pièce."
```

---

## 🎯 BONNES PRATIQUES À SUIVRE

✅ **À faire:**
- Meta titles entre 50-60 caractères
- Descriptions entre 150-160 caractères
- Inclure le mot clé principal en début
- Unique pour chaque page/produit
- Images en haute qualité (1200x630px minimum)
- Ajouter des chiffres ou des points clés

❌ **À éviter:**
- Dupliquer le contenu entre pages
- Textes génériques ou vagues
- Trop de mots clés (keyword stuffing)
- Images de basse qualité
- Oublier de remplir un champ

---

## 📊 CHECKLIST DE REMPLISSAGE

### Pages:
- [ ] Accueil - seoTitle, seoDescription, seoImage, noIndex=FALSE
- [ ] Blog - seoTitle, seoDescription, seoImage, noIndex=FALSE
- [ ] Boutique - seoTitle, seoDescription, seoImage, noIndex=FALSE

### Produits (au minimum les 3 visibles):
- [ ] Eza - tous les champs SEO
- [ ] Classique - tous les champs SEO
- [ ] Mickey Mouse - tous les champs SEO
- [ ] [Autres produits] - tous les champs SEO

### Articles de blog:
- [ ] [Article 1] - seoTitle, seoDescription, seoImage, noIndex=FALSE
- [ ] [Article 2] - seoTitle, seoDescription, seoImage, noIndex=FALSE

### Page Panier:
- [ ] Mettre `robots: noindex, follow` dans le code Next.js

---

## 🚀 INSTRUCTIONS D'IMPORT DANS STRAPI

1. Ouvrir l'interface Strapi admin (http://localhost:1337/admin)
2. Pour chaque **Page/Article/Produit**:
   - Cliquer sur le contenu
   - Scroller jusqu'aux champs SEO
   - Remplir: seoTitle, seoDescription, seoImage, noIndex
   - Cliquer "Publier" (Draft & Publish)
3. Redémarrer Next.js si besoin: `npm run dev`
4. Vérifier sur le site que les meta tags sont présents

---

## 📱 OUTILS DE VÉRIFICATION

Une fois remplis et publiés, testez avec:

1. **Google Search Console** - Vérifier que les meta descriptions s'affichent
2. **OpenGraph Preview** - https://www.opengraphcheck.com/
3. **Meta Tags Preview** - https://www.metatags.io/
4. **Google Rich Results** - https://search.google.com/test/rich-results

Entrez votre URL pour voir comment votre page s'affiche sur Google et dans les partages réseaux sociaux.

---

**Créé le:** 2026-07-17  
**Pour:** La Montre de mon Grand-Père
