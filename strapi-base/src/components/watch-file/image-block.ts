export default {
  "collectionName": "components_watch_file_image_blocks",
  "info": {
    "displayName": "Dossier Image",
    "description": "Bloc image simple pour le dossier de restauration"
  },
  "options": {},
  "attributes": {
    "title": {
      "type": "string",
      "displayName": "Titre"
    },
    "image": {
      "type": "media",
      "multiple": false,
      "required": true,
      "allowedTypes": ["images"],
      "displayName": "Image"
    }
  },
  "config": {}
};