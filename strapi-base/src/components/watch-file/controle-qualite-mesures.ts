export default {
  "collectionName": "components_watch_file_controle_qualite_mesures",
  "info": {
    "displayName": "4. Controle qualite & mesures",
    "description": "Point 4 du dossier avec mesures detaillees et resume public"
  },
  "options": {},
  "attributes": {
    "marcheMoyennePublique": {
      "type": "string",
      "displayName": "4.0 Marche moyenne fiche produit"
    },
    "etancheitePublique": {
      "type": "string",
      "displayName": "4.0 Etancheite fiche produit"
    },
    "reglageEtPrecision": {
      "type": "component",
      "repeatable": true,
      "component": "watch-file.ligne-reglage-position",
      "displayName": "4.1 Reglage et precision"
    },
    "testEtancheite": {
      "type": "component",
      "repeatable": true,
      "component": "watch-file.ligne-test-etancheite",
      "displayName": "4.2 Test d'etancheite"
    },
    "observationsConclusions": {
      "type": "text",
      "displayName": "4.3 Observations & conclusions"
    }
  },
  "config": {}
};