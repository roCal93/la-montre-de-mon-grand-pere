# Composant Button

Composant bouton polyvalent qui peut fonctionner comme un `<button>` ou un `<Link>`.

## Utilisation

### Bouton simple (élément button)

```tsx
import { Button } from '@/components/ui/Button'

<Button onClick={() => console.log('Cliqué!')}>
  Cliquer ici
</Button>
```

### Bouton comme lien (élément Link)

```tsx
<Button href="/contact" variant="primary">
  Nous contacter
</Button>
```

### Lien externe

```tsx
<Button href="https://example.com" target="_blank" variant="secondary">
  Visiter le site
</Button>
```

## Props

### Communes

- `variant?: 'primary' | 'secondary' | 'outline' | 'ghost'` - Style du bouton (défaut: 'primary')
- `children: React.ReactNode` - Contenu du bouton
- `className?: string` - Classes CSS additionnelles

### En tant que bouton

Accepte toutes les props standard de `<button>` HTML :
- `onClick?: () => void`
- `type?: 'button' | 'submit' | 'reset'`
- `disabled?: boolean`
- etc.

### En tant que lien

- `href: string` - URL de destination
- `target?: string` - Cible du lien (_blank, _self, etc.)
- `rel?: string` - Relation (défaut: 'noopener noreferrer' pour liens externes)

## Variantes

### Primary
Bouton principal avec fond bleu - Pour les actions principales (CTA)

```tsx
<Button variant="primary" href="/contact">Contact</Button>
```

### Secondary
Bouton secondaire avec fond gris - Pour les actions secondaires

```tsx
<Button variant="secondary" href="/about">En savoir plus</Button>
```

### Outline
Bouton avec bordure - Pour les actions tertiaires

```tsx
<Button variant="outline" onClick={handleCancel}>Annuler</Button>
```

### Ghost
Bouton transparent - Pour les actions discrètes

```tsx
<Button variant="ghost" href="/docs">Documentation</Button>
```

## Intégration avec Strapi

Le composant est conçu pour fonctionner avec le composant Strapi `shared.button` :

```tsx
import { Button as ButtonData } from '@/types/strapi'

// Dans votre composant de section
{button && (
  <Button 
    href={button.url}
    variant={button.variant as 'primary' | 'secondary' | 'outline' | 'ghost'}
    target={button.isExternal ? '_blank' : undefined}
  >
    {button.label}
  </Button>
)}
```
