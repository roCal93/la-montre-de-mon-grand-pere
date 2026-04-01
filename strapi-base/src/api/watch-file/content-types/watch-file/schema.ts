export default {
  "kind": "collectionType",
  "collectionName": "watch_files",
  "info": {
    "singularName": "watch-file",
    "pluralName": "watch-files",
    "displayName": "Dossier Montre",
    "description": "Dossier de restauration d'une montre client"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "title": {
      "type": "string",
      "default": "Dossier montre",
      "required": true
    },
    "repair_notes": {
      "type": "richtext"
    },
    "technician_notes": {
      "type": "richtext",
      "private": true
    },
    "photos_before": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": ["images"]
    },
    "photos_after": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": ["images"]
    },
    "customer": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "order": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::order.order",
      "pluginOptions": {
        "i18n": {
          "localized": false
        }
      }
    },
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::product.product"
    }
  }
};
