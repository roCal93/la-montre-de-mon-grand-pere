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
    "relatedArticles": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::blog-article.blog-article"
    },
    "watchFile": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::watch-file.watch-file",
      "mappedBy": "product"
    },
    "stripePriceId": {
      "type": "string",
      "private": true
    },
    "seoTitle": {
      "type": "string",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "seoDescription": {
      "type": "richtext",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "seoImage": {
      "type": "media",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      },
      "multiple": false,
      "allowedTypes": [
        "images"
      ]
    },
    "noIndex": {
      "type": "boolean",
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    }
  }
};
