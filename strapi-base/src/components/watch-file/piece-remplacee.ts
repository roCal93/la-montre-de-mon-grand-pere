export default {
  "collectionName": "components_watch_file_piece_remplacees",
  "info": {
    "displayName": "Piece remplacee",
    "description": "Ligne du tableau 3.2 pieces remplacees"
  },
  "options": {},
  "attributes": {
    "designationPiece": {
      "type": "string",
      "displayName": "Designation de la piece"
    },
    "referenceCalibre": {
      "type": "string",
      "displayName": "Reference / calibre"
    },
    "quantite": {
      "type": "integer",
      "min": 1,
      "displayName": "Quantite"
    },
    "origine": {
      "type": "string",
      "displayName": "Origine"
    },
    "etatPiece": {
      "type": "enumeration",
      "enum": ["orig", "rep"],
      "displayName": "Etat"
    }
  },
  "config": {}
};