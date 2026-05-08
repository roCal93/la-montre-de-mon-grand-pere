export default {
  "collectionName": "components_watch_file_before_after_blocks",
  "info": {
    "displayName": "Dossier Before / After",
    "description": "Comparaison avant après dans le dossier de restauration (plusieurs paires possibles)"
  },
  "options": {},
  "attributes": {
    "title": {
      "type": "string",
      "displayName": "Titre"
    },
    "content": {
      "type": "blocks",
      "required": false,
      "displayName": "Contenu"
    },
    "pairs": {
      "type": "component",
      "repeatable": true,
      "component": "watch-file.before-after-pair",
      "required": false,
      "displayName": "Paires avant / après"
    }
  },
  "config": {}
};
