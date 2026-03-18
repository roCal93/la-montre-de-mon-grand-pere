/**
 * Script de génération des types TypeScript depuis les schémas Strapi
 * Génère un fichier de types propre et utilisable côté frontend
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'types', 'strapi-types.d.ts');

/**
 * Récupère tous les content-types de l'API
 */
function getAllContentTypes() {
    const apiPath = path.join(__dirname, '..', 'src', 'api');
    const contentTypes = [];

    if (!fs.existsSync(apiPath)) {
        console.warn('⚠️  Le dossier src/api n\'existe pas encore');
        return contentTypes;
    }

    const apiDirs = fs.readdirSync(apiPath);

    for (const dir of apiDirs) {
        const schemaPath = path.join(apiPath, dir, 'content-types', dir, 'schema.json');

        if (fs.existsSync(schemaPath)) {
            const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
            contentTypes.push({
                apiId: dir,
                schema
            });
        }
    }

    return contentTypes;
}

/**
 * Récupère tous les components
 */
function getAllComponents() {
    const componentsPath = path.join(__dirname, '..', 'src', 'components');
    const components = [];

    if (!fs.existsSync(componentsPath)) {
        return components;
    }

    const categoryDirs = fs.readdirSync(componentsPath);

    for (const category of categoryDirs) {
        const categoryPath = path.join(componentsPath, category);

        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const componentFiles = fs.readdirSync(categoryPath);

        for (const file of componentFiles) {
            if (file.endsWith('.json')) {
                const componentPath = path.join(categoryPath, file);
                const schema = JSON.parse(fs.readFileSync(componentPath, 'utf8'));
                const componentName = file.replace('.json', '');

                components.push({
                    category,
                    name: componentName,
                    fullName: `${category}.${componentName}`,
                    schema
                });
            }
        }
    }

    return components;
}

/**
 * Convertit un type Strapi en type TypeScript
 */
function convertStrapiType(attribute) {
    switch (attribute.type) {
        case 'string':
        case 'text':
        case 'richtext':
        case 'email':
        case 'uid':
        case 'enumeration':
            return 'string';

        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal':
            return 'number';

        case 'boolean':
            return 'boolean';

        case 'date':
        case 'datetime':
        case 'time':
            return 'string';

        case 'json':
            return 'Record<string, unknown>';

        case 'blocks':
            return 'StrapiBlock[]';

        case 'media':
            return attribute.multiple ? 'StrapiMedia[]' : 'StrapiMedia';

        case 'relation':
            // Pour les relations, générer le type approprié avec StrapiEntity
            if (attribute.target) {
                const targetName = attribute.target.split('.').pop();
                const typeName = targetName.split('-').map(w =>
                    w.charAt(0).toUpperCase() + w.slice(1)
                ).join('');

                // Selon le type de relation
                if (attribute.relation === 'oneToMany' || attribute.relation === 'manyToMany') {
                    return `(${typeName} & StrapiEntity)[]`;
                } else {
                    return `(${typeName} & StrapiEntity)`;
                }
            }
            return 'unknown';

        case 'component':
            if (attribute.component) {
                const componentName = attribute.component.split('.').pop();
                const pascalName = componentName.split('-').map(w =>
                    w.charAt(0).toUpperCase() + w.slice(1)
                ).join('');
                return attribute.repeatable ? `${pascalName}[]` : pascalName;
            }
            return 'unknown';

        case 'dynamiczone':
            return 'unknown[]';

        default:
            return 'unknown';
    }
}

/**
 * Génère l'interface TypeScript pour un content-type
 */
function generateContentTypeInterface(contentType) {
    const { apiId, schema } = contentType;

    // Nom en PascalCase
    const typeName = apiId.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');

    let interfaceStr = `\n/**\n * ${schema.info.displayName || typeName}\n */\n`;
    interfaceStr += `export interface ${typeName} {\n`;

    // Attributs du schema
    for (const [attrName, attrDef] of Object.entries(schema.attributes)) {
        const tsType = convertStrapiType(attrDef);
        const optional = attrDef.required ? '' : '?';
        interfaceStr += `  ${attrName}${optional}: ${tsType};\n`;
    }

    // Ajouter locale et localizations pour les content-types localisés
    if (schema.pluginOptions?.i18n?.localized) {
        interfaceStr += `  locale?: string;\n`;
        interfaceStr += `  localizations?: (${typeName} & StrapiEntity)[];\n`;
    }

    interfaceStr += `}\n`;

    // Types d'entités (Strapi v5 - plus besoin de Entity/Response séparés)
    interfaceStr += `export type ${typeName}Response = StrapiResponse<${typeName}>;\n`;
    interfaceStr += `export type ${typeName}CollectionResponse = StrapiCollectionResponse<${typeName}>;\n`;

    return interfaceStr;
}

/**
 * Génère l'interface TypeScript pour un component
 */
function generateComponentInterface(component) {
    const { name, schema } = component;

    // Nom en PascalCase
    const typeName = name.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');

    let interfaceStr = `\n/**\n * Component: ${component.fullName}\n */\n`;
    interfaceStr += `export interface ${typeName} {\n`;

    // Attributs du schema
    for (const [attrName, attrDef] of Object.entries(schema.attributes || {})) {
        const tsType = convertStrapiType(attrDef);
        const optional = attrDef.required ? '' : '?';
        interfaceStr += `  ${attrName}${optional}: ${tsType};\n`;
    }

    interfaceStr += `}\n`;

    return interfaceStr;
}

/**
 * Génère le fichier de types complet
 */
function generateTypesFile() {
    const contentTypes = getAllContentTypes();
    const components = getAllComponents();

    let output = `/**
 * Types TypeScript générés depuis les schémas Strapi
 * 
 * ⚠️  FICHIER AUTO-GÉNÉRÉ - NE PAS MODIFIER
 * 
 * Pour régénérer: npm run generate:types
 * Généré le: ${new Date().toISOString()}
 */

// ============================================================================
// TYPES DE BASE STRAPI
// ============================================================================

export type StrapiID = number;
export type StrapiDateTime = string;
export type StrapiFileUrl = string;
export type StrapiJSON = Record<string, unknown>;

export interface StrapiMedia {
  id: StrapiID;
  url: StrapiFileUrl;
  mime?: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  formats?: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  };
  [key: string]: unknown;
}

export interface StrapiMediaFormat {
  url: StrapiFileUrl;
  width: number;
  height: number;
  mime: string;
  [key: string]: unknown;
}

export interface StrapiBlock {
  type: string;
  children?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ============================================================================
// TYPES D'ENVELOPPE STRAPI V5
// ============================================================================

// Strapi v5 : les données sont retournées directement (plus d'attributes)
export interface StrapiEntity {
  id: StrapiID;
  documentId: string;
}

export interface StrapiResponse<T> {
  data: (T & StrapiEntity) | null;
  meta: Record<string, unknown>;
}

export interface StrapiCollectionResponse<T> {
  data: Array<T & StrapiEntity>;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiErrorResponse {
  error: {
    status: number;
    name: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
`;

    // Ajouter les components
    if (components.length > 0) {
        output += `
// ============================================================================
// COMPONENTS
// ============================================================================
`;
        for (const component of components) {
            output += generateComponentInterface(component);
        }
    }

    // Ajouter les content-types
    if (contentTypes.length > 0) {
        output += `
// ============================================================================
// CONTENT TYPES
// ============================================================================
`;
        for (const contentType of contentTypes) {
            output += generateContentTypeInterface(contentType);
        }
    }

    // Si aucun content-type trouvé
    if (contentTypes.length === 0) {
        output += `
// ============================================================================
// CONTENT TYPES
// ============================================================================

// Aucun content-type trouvé.
// Créez vos premiers content-types dans le Content-Type Builder de Strapi,
// puis relancez la génération des types.
`;
    }

    return output;
}

/**
 * Main
 */
function main() {
    console.log('🔄 Génération des types TypeScript Strapi...\n');

    try {
        const typesContent = generateTypesFile();

        // Créer le dossier types s'il n'existe pas
        const typesDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(typesDir)) {
            fs.mkdirSync(typesDir, { recursive: true });
        }

        // Écrire le fichier
        fs.writeFileSync(OUTPUT_FILE, typesContent, 'utf8');

        console.log('✅ Types générés avec succès !');
        console.log(`📄 Fichier: ${path.relative(process.cwd(), OUTPUT_FILE)}`);

        const contentTypes = getAllContentTypes();
        const components = getAllComponents();
        console.log(`📦 ${contentTypes.length} content-type(s)`);
        console.log(`🧩 ${components.length} component(s)`);

    } catch (error) {
        console.error('❌ Erreur lors de la génération des types:', error);
        process.exit(1);
    }
}

main();
