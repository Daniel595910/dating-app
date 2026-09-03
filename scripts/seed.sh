#!/bin/bash
set -euo pipefail

# ============================================
# SEED SCRIPT
# Seed database with development data
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  SEEDING DATABASE"
echo "=========================================="
echo ""

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

# Run seed files
cd "$PROJECT_ROOT/supabase/seed"

for seed_file in *.sql; do
    echo "Seeding: $seed_file"
    psql "$DATABASE_URL" -f "$seed_file"
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}ERROR: Failed to seed $seed_file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Seeded: $seed_file${NC}"
done

echo ""
echo -e "${GREEN}=========================================="
echo "  SEEDING COMPLETE"
echo -e "==========================================${NC}"