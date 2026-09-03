#!/bin/bash
set -euo pipefail

# ============================================
# RESTORE SCRIPT
# Restore database from backup
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  RESTORING DATING APP DATABASE"
echo "=========================================="
echo ""

# List available backups
if [[ ! -d "$BACKUP_DIR" ]]; then
    echo -e "${RED}ERROR: No backup directory found${NC}"
    exit 1
fi

echo "Available backups:"
echo ""
ls -1 "$BACKUP_DIR"/dating_app_*.sql.gz 2>/dev/null || {
    echo -e "${RED}No backup files found${NC}"
    exit 1
}
echo ""

# Prompt for backup file
read -p "Enter backup filename to restore (or press Enter for latest): " BACKUP_FILE

if [[ -z "$BACKUP_FILE" ]]; then
    BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/dating_app_*.sql.gz | head -1)
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}WARNING: This will overwrite the current database${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Check for DATABASE_URL
if [[ -z "${DATABASE_URL:-}" ]]; then
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
    fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo -e "${RED}ERROR: DATABASE_URL is not set${NC}"
    exit 1
fi

# Decompress and restore
echo "Restoring database from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  RESTORE COMPLETE"
echo -e "==========================================${NC}"