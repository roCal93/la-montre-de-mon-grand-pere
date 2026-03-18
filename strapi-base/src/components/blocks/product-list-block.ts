export default {
  "collectionName": "components_blocks_product_list_blocks",
  "info": {
    "displayName": "Product List Block",
    "description": "Grille de produits avec filtres par catégorie (e-commerce)"
  },
  "options": {},
  "attributes": {
    "title": {
      "type": "string"
    },
    "subtitle": {
      "type": "text"
    },
    "category": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::product-category.product-category"
    },
    "maxItems": {
      "type": "integer",
      "default": 12,
      "min": 1,
      "max": 100
    },
    "showFilters": {
      "type": "boolean",
      "default": true
    }
  }
};
