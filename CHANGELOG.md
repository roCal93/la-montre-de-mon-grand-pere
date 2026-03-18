# Changelog - Hakuna Mataweb Starter

Toutes les modifications notables du starter seront documentées ici.

## [2.1.0] - 2026-02-10

### Ajouté
- **SEO multilingue** : Support hreflang tags pour les versions linguistiques (nouveau fichier `src/lib/hreflang.ts`)
- **Accessibilité** : Composant SkipToContent pour navigation clavier (`src/components/ui/SkipToContent.tsx`)
- **Accessibilité** : Classes CSS `.sr-only` et `.focus:not-sr-only` dans `globals.css`
- **Sécurité CSP** : Directives supplémentaires (`object-src`, `base-uri`, `form-action`, `upgrade-insecure-requests`)

### Amélioré
- **Header** : Ajout des ARIA labels (`role="banner"`, `aria-label`, `aria-current="page"`)
- **Navigation** : ARIA labels sur tous les liens avec indication des sections
- **BurgerMenu** : Support ARIA complet (`aria-expanded`, `aria-controls`, `role="dialog"`)
- **Layout** : Ajout de `id="main-content"`, `role="main"` et intégration SkipToContent
- **SEO** : Tags hreflang automatiques sur toutes les pages (home + dynamiques)
- **SEO** : Support `x-default` pour les langues non correspondantes
- **ContactFormBlock** : ARIA labels sur tous les champs (`aria-required`, `aria-describedby`, `aria-live`)
- **PrivacyPolicyModal** : Support Markdown complet (H2, H3, listes, liens, gras)

### Modifié
- `src/lib/seo.ts` : Ajout x-default aux hreflang alternates
- `src/app/[locale]/page.tsx` : Génération hreflang pour page home
- `next.config.ts` : CSP renforcée avec commentaire explicatif sur `unsafe-inline`

## [2.0.1] - 2026-02-04

### Corrigé
- Populate profond pour les sections de pages (fix: les nouvelles sections n'apparaissaient pas)
- Réduction du revalidate de 3600s à 60s pour des mises à jour plus rapides

## [2.0.0] - 2026-02-03

### Ajouté
- Fichier VERSION pour tracker la version du starter
- Système de versioning centralisé
- Support pour le nouveau système de versioning de la block-library

### Modifié
- Architecture : séparation totale blocks/starter
- Les blocks ne sont plus inclus dans le starter
- Les blocks sont copiés depuis la block-library lors de la création de projet

### Notes de migration
Si vous avez des projets existants, utilisez le script de synchronisation :
```bash
./tools/scripts/sync-from-starter.sh
```

---

## [1.0.0] - 2026-01-01

### Ajouté
- Version initiale du starter
- Structure Next.js + Strapi
- Composants layout (Header, Footer)
- Configuration Tailwind CSS
- Scripts de déploiement
