export default {
  "collectionName": "components_watch_file_before_after_pairs",
  "info": {
    "displayName": "Paire Avant / Après",
    "description": "Une paire d'images avant / après"
  },
  "options": {},
  "attributes": {
    "label": {
      "type": "string",
      "required": false,
      "displayName": "Légende (optionnel)"
    },
    "beforeImage": {
      "type": "media",
      "multiple": false,
      "required": true,
      "allowedTypes": ["images"],
      "displayName": "Image avant"
    },
    "afterImage": {
      "type": "media",
      "multiple": false,
      "required": true,
      "allowedTypes": ["images"],
      "displayName": "Image après"
    }
  }
};
