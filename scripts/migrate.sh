#!/bin/bash
set -euo pipefail

# ============================================
# MIGRATION SCRIPT
# Run database migrations
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  RUNNING DATABASE MIGRATIONS"
echo "=========================================="
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}Using Supabase CLI for migrations${NC}"
    cd "$PROJECT_ROOT"
    supabase db push
    echo -e "${GREEN}✓ Migrations applied${NC}"
    exit 0
fi

# Check for DATABASE_URL
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo -e "${YELLOW}DATABASE_URL not set. Checking for .env file...${NC}"
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
    fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo -e "${RED}ERROR: DATABASE_URL is not set${NC}"
    echo "Please set DATABASE_URL in your environment or .env file"
    exit 1
fi

# Run migrations using psql
echo "Running migrations with psql..."
cd "$PROJECT_ROOT/supabase/migrations"

for migration in *.sql; do
    echo "Applying: $migration"
    psql "$DATABASE_URL" -f "$migration"
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}ERROR: Failed to apply $migration${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Applied: $migration${NC}"
done

echo ""
echo -e "${GREEN}=========================================="
echo "  MIGRATIONS COMPLETE"
echo -e "==========================================${NC}"