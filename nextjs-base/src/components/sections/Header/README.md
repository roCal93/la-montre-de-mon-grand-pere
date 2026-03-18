# Header Component

Composant Header dynamique qui récupère ses données depuis Strapi.

## Props

```typescript
interface HeaderProps {
  logo?: {
    url: string
    alternativeText?: string
    width?: number
    height?: number
  }
  title?: string
  navigation?: Array<{
    label: string
    href: string
  }>
}
```

## Utilisation basique (sans logo)

```tsx
<Header 
  title="Mon Site" 
  navigation={[
    { label: 'À propos', href: '/a-propos' },
    { label: 'Services', href: '/services' },
    { label: 'Contact', href: '/contact' }
  ]}
/>
```

## Utilisation avec logo

```tsx
<Header 
  logo={{
    url: '/uploads/logo.png',
    alternativeText: 'Logo du site',
    width: 200,
    height: 60
  }}
  navigation={[
    { label: 'À propos', href: '/a-propos' },
    { label: 'Services', href: '/services' }
  ]}
/>
```

## Exemple avec données Strapi

Dans votre layout ou page :

```tsx
// app/[locale]/layout.tsx
import { Header } from '@/components/sections/Header/Header'
import { fetchAPI } from '@/lib/strapi'

async function getHeaderData(locale: string) {
  const data = await fetchAPI('/header', {
    locale,
    next: { revalidate: 3600 } // Cache 1h
  })
  
  return data
}

export default async function Layout({ 
  children,
  params 
}: { 
  children: React.ReactNode
  params: { locale: string }
}) {
  const headerData = await getHeaderData(params.locale)
  
  return (
    <>
      <Header 
        logo={headerData.logo}
        title={headerData.title}
        navigation={headerData.navigation}
      />
      {children}
    </>
  )
}
```

## Structure Strapi recommandée

Créer un **Single Type** `header` avec :

- `logo` (Media - Single)
- `title` (Text)
- `navigation` (Component - Repeatable)
  - `label` (Text)
  - `href` (Text)

## Fonctionnalités

✅ Support logo ou titre texte  
✅ Navigation dynamique depuis Strapi  
✅ Lien actif automatique (highlight)  
✅ Responsive (mobile avec burger menu)  
✅ i18n automatique avec `[locale]`  
✅ LanguageSwitcher intégré  
✅ Optimisation Next.js Image
