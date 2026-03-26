export default {
  "kind": "collectionType",
  "collectionName": "service_requests",
  "info": {
    "singularName": "service-request",
    "pluralName": "service-requests",
    "displayName": "Demande de service",
    "description": "Demandes de réparation, nettoyage et restauration envoyées par les clients"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "type": {
      "type": "enumeration",
      "enum": ["reparation", "nettoyage", "restauration", "expertise"],
      "required": true
    },
    "watch_description": {
      "type": "string"
    },
    "description": {
      "type": "text",
      "required": true
    },
    "photos": {
      "type": "media",
      "multiple": true,
      "required": false,
      "allowedTypes": ["images"]
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "in_progress", "quote_sent", "accepted", "completed", "cancelled"],
      "default": "pending",
      "required": true
    },
    "admin_response": {
      "type": "text"
    },
    "customer": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    }
  }
};
