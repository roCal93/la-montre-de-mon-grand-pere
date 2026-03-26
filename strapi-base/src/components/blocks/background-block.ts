export default {
  "collectionName": "components_blocks_background_blocks",
  "info": {
    "displayName": "Background Block",
    "description": "Change le fond du site (couleur, image, gradient)"
  },
  "options": {},
  "attributes": {
    "type": {
      "type": "enumeration",
      "enum": [
        "color",
        "image",
        "gradient"
      ],
      "default": "color",
      "required": true
    },
    "color": {
      "type": "string"
    },
    "gradient": {
      "type": "string"
    },
    "image": {
      "type": "media",
      "multiple": false,
      "allowedTypes": [
        "images",
        "files"
      ]
    },
    "imageDesktop": {
      "type": "media",
      "multiple": false,
      "allowedTypes": [
        "images",
        "files"
      ]
    },
    "positionMobile": {
      "type": "enumeration",
      "enum": [
        "center center",
        "top center",
        "top left",
        "top right",
        "bottom center",
        "bottom left",
        "bottom right",
        "left center",
        "right center"
      ],
      "default": "center center"
    },
    "positionDesktop": {
      "type": "enumeration",
      "enum": [
        "center center",
        "top center",
        "top left",
        "top right",
        "bottom center",
        "bottom left",
        "bottom right",
        "left center",
        "right center"
      ],
      "default": "center center"
    },
    "sizeMobile": {
      "type": "enumeration",
      "enum": [
        "cover",
        "contain",
        "auto"
      ],
      "default": "cover"
    },
    "sizeDesktop": {
      "type": "enumeration",
      "enum": [
        "cover",
        "contain",
        "auto"
      ],
      "default": "cover"
    },
    "repeat": {
      "type": "enumeration",
      "enum": [
        "no-repeat",
        "repeat",
        "repeat-x",
        "repeat-y"
      ],
      "default": "no-repeat"
    },
    "fixed": {
      "type": "boolean",
      "default": false
    },
    "overlayColor": {
      "type": "string"
    },
    "overlayOpacity": {
      "type": "decimal",
      "default": 0
    },
    "scope": {
      "type": "enumeration",
      "enum": [
        "section",
        "global"
      ],
      "default": "section",
      "description": "Appliquer le fond seulement à la section ou à tout le site (global)."
    }
  },
  "config": {}
};
