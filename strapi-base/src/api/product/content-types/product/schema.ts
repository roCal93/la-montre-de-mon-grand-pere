export default {
  "kind": "collectionType",
  "collectionName": "products",
  "info": {
    "singularName": "product",
    "pluralName": "products",
    "displayName": "Product",
    "description": "E-commerce product"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": true
    },
    "description": {
      "type": "richtext",
      "displayName": "Histoire",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "shortDescription": {
      "type": "text",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "price": {
      "type": "decimal",
      "required": true,
      "min": 0
    },
    "compareAtPrice": {
      "type": "decimal",
      "min": 0
    },
    "images": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": [
        "images"
      ]
    },
    "active": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "category": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::product-category.product-category",
      "inversedBy": "products"
    },
    "stripePriceId": {
      "type": "string",
      "private": true
    },
    "reference": {
      "type": "string"
    },
    "brand": {
      "type": "string"
    },
    "badges": {
      "type": "json",
      "default": []
    },
    "technicalSpecs": {
      "type": "json",
      "default": []
    },
    "conditionRatings": {
      "type": "json",
      "default": []
    },
    "restorationWork": {
      "type": "json",
      "default": []
    },
    "beforeImage": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": [
        "images"
      ]
    },
    "afterImage": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": [
        "images"
      ]
    }
  }
};
