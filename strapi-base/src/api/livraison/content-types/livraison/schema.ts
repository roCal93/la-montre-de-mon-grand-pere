export default {
  "kind": "singleType",
  "collectionName": "livraison",
  "info": {
    "singularName": "livraison",
    "pluralName": "livraisons",
    "displayName": "Livraison",
    "description": "Page d'informations sur la livraison et les retours"
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
    "title": {
      "type": "string",
      "required": true,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "content": {
      "type": "richtext",
      "required": true,
      "pluginOptions": {
        "i18n": {
          "localized": true
        }
      }
    },
    "lastUpdated": {
      "type": "date",
      "pluginOptions": {
        "i18n": {
          "localized": false
        }
      }
    }
  }
}
