#!/bin/bash
set -euo pipefail

# ============================================
# BACKUP SCRIPT
# Backup database and important data
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  BACKING UP DATING APP"
echo "=========================================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Get timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dating_app_$TIMESTAMP.sql"

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

# Backup database
echo "Backing up database..."
if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
elif docker-compose exec postgres pg_dump &> /dev/null 2>&1; then
    docker-compose exec postgres pg_dump -U dating_app_user dating_app > "$BACKUP_FILE"
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
else
    echo -e "${RED}ERROR: pg_dump not available${NC}"
    exit 1
fi

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup compressed: ${BACKUP_FILE}.gz${NC}"

# Clean old backups (keep last 7 days)
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "dating_app_*.sql.gz" -mtime +7 -delete
echo -e "${GREEN}✓ Old backups cleaned${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "  BACKUP COMPLETE"
echo -e "==========================================${NC}"