export default {
  "kind": "collectionType",
  "collectionName": "webhook_errors",
  "info": {
    "singularName": "webhook-error",
    "pluralName": "webhook-errors",
    "displayName": "Webhook Error",
    "description": "Persistent logs for webhook processing failures"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "provider": {
      "type": "enumeration",
      "enum": [
        "stripe",
        "strapi",
        "other"
      ],
      "default": "stripe",
      "required": true
    },
    "eventId": {
      "type": "string",
      "required": true
    },
    "eventType": {
      "type": "string",
      "required": true
    },
    "message": {
      "type": "text",
      "required": true
    },
    "stack": {
      "type": "text"
    },
    "occurredAt": {
      "type": "datetime",
      "required": true
    }
  }
};
