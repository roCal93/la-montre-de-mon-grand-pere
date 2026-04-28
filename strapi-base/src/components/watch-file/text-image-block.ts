export default {
  "collectionName": "components_watch_file_text_image_blocks",
  "info": {
    "displayName": "Dossier Text + Image",
    "description": "Bloc texte et image pour le dossier de restauration"
  },
  "options": {},
  "attributes": {
    "title": {
      "type": "string",
      "displayName": "Titre"
    },
    "content": {
      "type": "blocks",
      "required": true,
      "displayName": "Contenu"
    },
    "image": {
      "type": "media",
      "multiple": false,
      "required": true,
      "allowedTypes": ["images"],
      "displayName": "Image"
    },
    "imagePosition": {
      "type": "enumeration",
      "enum": ["left", "right"],
      "default": "right",
      "required": true,
      "displayName": "Position de l'image"
    }
  },
  "config": {}
};