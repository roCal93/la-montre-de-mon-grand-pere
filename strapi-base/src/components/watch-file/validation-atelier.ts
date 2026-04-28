export default {
  "collectionName": "components_watch_file_validation_ateliers",
  "info": {
    "displayName": "5. Validation atelier",
    "description": "Validation finale atelier du dossier de restauration"
  },
  "options": {},
  "attributes": {
    "dateFin": {
      "type": "date",
      "displayName": "Date de fin"
    },
    "dureeIntervention": {
      "type": "string",
      "displayName": "Durée d'intervention"
    },
    "signature": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"],
      "displayName": "Signature"
    },
    "dateSignature": {
      "type": "date",
      "displayName": "Date de signature"
    }
  },
  "config": {}
};