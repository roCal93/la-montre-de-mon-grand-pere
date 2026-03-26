# Webhook Stripe — Configuration du Sync Produits

Ce webhook synchronise automatiquement tes produits Strapi vers Stripe à chaque création/modification.

## Configuration requise

### 1. Clé API Stripe

1. Ouvre [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copie ta **Clé secrète** (commence par `sk_`)
3. Dans `.env` (strapi-base), ajoute:
   ```
   STRIPE_SECRET_KEY=sk_test_votre_clé
   ```

### 2. Ajouter le champ `stripePriceId` au modèle Product

Si ce n'est pas déjà fait, ajoute ce champ dans Strapi:
- **Nom du champ**: `stripePriceId`
- **Type**: Texte court (string)
- **Requis**: Non
- **Description**: `ID du prix Stripe (price_xxx)`

### 3. Comment ça fonctionne

Quand tu **crées** ou **modifies** un produit dans Strapi:

1. ✅ Produit actif + prix renseigné → Stripe est mis à jour
2. ✅ Un prix Stripe est créé/mis à jour automatiquement
3. ✅ L'ID `price_xxx` est stocké dans `stripePriceId` 
4. ✅ Produit inactif ou sans prix → Stripe n'est pas touché

Quand tu **supprimes** un produit Strapi:
- Le produit Stripe correspondant est supprimé

### 4. Marche à suivre pour ajouter une montre

1. Va dans **Strapi Admin** → **Produits**
2. Crée/modifie ta montre:
   - Nom ✓
   - Slug ✓  
   - Prix (en EUR) ✓
   - Active: **Oui** ✓
   - Images et description (optionnel)

3. **Sauvegarde** — le webhook se déclenche automatiquement
4. Vérifie les logs pour confirmer la syncho:
   ```
   [Webhook] Product created: guid_de_la_montre
   [Stripe] Created product price_xxx
   [Webhook] Updated product with stripePriceId: price_xxx
   ```

5. Dans Stripe Dashboard, tu dois voir:
   - 1 nouveau **Produit** (avec nom de ta montre)
   - 1 nouveau **Prix** (price_xxx)

### 5. Retrouver l'ID prix dans Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Produits**
2. Cherche ta montre par nom
3. Clique dessus → onglet **Tarification**
4. Copie l'ID du prix (`price_...`)
5. Cet ID s'ajoute automatiquement dans le champ `stripePriceId` de Strapi

### 6. Dépannage

**Le webhook ne se déclenche pas?**
- Vérifie que `STRIPE_SECRET_KEY` est renseigné dans `.env`
- Redémarre Strapi: `pnpm develop`
- Regarde les logs de la console Strapi

**Le prix dans Stripe ne change pas?**
- Stripe ne peut pas modifier un prix existant
- Le webhook crée automatiquement un **nouveau** prix si le montant change
- L'ancien prix reste disponible dans Stripe, tu peux l'archiver manuellement

**Erreur "STRIPE_SECRET_KEY not configured"?**
- Ajoute la clé dans `.env` (ne pas utiliser `.env.example`)
- Redémarre Strapi

### 7. Test rapide

```bash
# Depuis strapi-base
pnpm develop

# Va dans Strapi admin et crée/modifie un produit
# Tu devrais voir les logs:
# [Webhook] Product created: xxxxx
# [Stripe] Created product price_xxx
```

Tu peux aussi vérifier dans **Stripe Dashboard** → **Produits** que ta montre y est.

---

**C'est tout!** Désormais, chaque montre ajoutée/modifiée dans Strapi est automatiquement synchée avec Stripe.

Pour le checkout, utilise le `stripePriceId` pour créer ta session Stripe.
