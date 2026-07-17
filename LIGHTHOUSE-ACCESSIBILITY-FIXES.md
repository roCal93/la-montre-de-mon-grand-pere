# 🔧 Corrections Lighthouse - Accessibilité pour Agents IA

## Problèmes détectés

### 1. ARIA role inappropriate - `<aside role="dialog">`

**Le problème:**
```tsx
<aside role="dialog" aria-modal="true" aria-label="Panier">
  // Contenu du panier
</aside>
```

**Pourquoi c'est un problème:**
- `<aside>` a un rôle implicite de `complementary`
- Utiliser `role="dialog"` le contredit
- Les agents IA ne comprennent pas cette combinaison

**Solution:**
```tsx
// ✅ Option 1: Utiliser <div> avec role="dialog"
<div role="dialog" aria-modal="true" aria-label="Panier">
  // Contenu du panier
</div>

// ✅ Option 2: Utiliser <aside> SAN S rôle explicite
<aside aria-label="Panier">
  // Contenu du panier
</aside>
```

### 2. Fichier `llms.txt` manquant

**Solution appliquée:** ✅ Créé `public/llms.txt` avec les informations de navigation pour les agents IA

---

## Fichiers à corriger

### 1. CartDrawer ou composant du Panier

**Emplacement possible:**
- `src/components/cart/CartDrawer.tsx`
- `src/components/Panier.tsx`
- Ou importé depuis la variante ecommerce

**Correction à appliquer:**

Remplacer:
```tsx
<aside
  role="dialog"
  aria-modal
  aria-label="Panier"
  className="..."
>
```

Par:
```tsx
<div
  role="dialog"
  aria-modal
  aria-label="Panier"
  className="..."
>
```

Et fermer avec `</div>` à la place de `</aside>`

### 2. Arrière-plan du dialog

Le `<div>` pour l'arrière-plan est OK tel qu'il est:
```tsx
<div
  onClick={closeCart}
  aria-hidden="true"
  className="..."
/>
```

---

## Vérification post-correction

1. Exécuter Lighthouse à nouveau
2. Vérifier que le score "Agent AI" augmente
3. Tester la navigation au clavier (Tab, Enter, Escape)
4. Valider avec: https://www.w3.org/WAI/ARIA/apg/

---

## Bonnes pratiques ARIA

✅ **À faire:**
- `role="dialog"` sur `<div>` ou `<section>` (pas `<aside>`)
- `aria-modal="true"` pour les modales
- `aria-label` pour décrire la modal
- `aria-hidden="true"` sur l'arrière-plan
- `aria-labelledby` si titre présent

❌ **À éviter:**
- `role="dialog"` sur des éléments sémantiques implicites (`<aside>`, `<nav>`, etc.)
- Oublier `aria-modal="true"` sur les modales
- Pas de fermeture au clavier (Escape key)

---

## Ressources

- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Lighthouse AI Accessibility Audit](https://github.com/GoogleChrome/lighthouse)
- [W3C ARIA Specification](https://www.w3.org/TR/wai-aria-1.2/)
