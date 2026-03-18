#!/bin/bash

# backup-strapi-db.sh
# Crée un backup de la base SQLite Strapi avant démarrage

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DB_PATH=".tmp/data.db"
BACKUP_DIR=".tmp/backups"
MAX_BACKUPS=10

# Vérifier qu'on est dans un projet Strapi
if [ ! -f "package.json" ] || ! grep -q "@strapi/strapi" package.json; then
    echo -e "${YELLOW}⚠️  Ce script doit être exécuté depuis un dossier strapi-base${NC}"
    exit 1
fi

# Vérifier que la base existe
if [ ! -f "$DB_PATH" ]; then
    echo -e "${BLUE}ℹ️  Aucune base à sauvegarder (première exécution)${NC}"
    exit 0
fi

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

# Nom du backup avec timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="$BACKUP_DIR/data-${TIMESTAMP}.db"

# Créer le backup
cp "$DB_PATH" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup créé: $BACKUP_FILE${NC}"

# Afficher la taille
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${BLUE}  Taille: $SIZE${NC}"

# Nettoyer les vieux backups (garder les MAX_BACKUPS plus récents)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/data-*.db 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    echo -e "${YELLOW}🧹 Nettoyage des anciens backups (max: $MAX_BACKUPS)${NC}"
    ls -t "$BACKUP_DIR"/data-*.db | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo -e "${GREEN}✓ Anciens backups supprimés${NC}"
fi

echo ""
echo -e "${BLUE}📦 Backups disponibles:${NC}"
ls -lht "$BACKUP_DIR"/data-*.db | awk '{print "  " $9 " (" $5 ")"}'
echo ""
