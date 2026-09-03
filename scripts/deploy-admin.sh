#!/bin/bash
set -euo pipefail

# ============================================
# DEPLOY ADMIN SCRIPT
# Deploy only the admin application
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=========================================="
echo "  DEPLOYING ADMIN APPLICATION"
echo "=========================================="
echo ""

cd "$PROJECT_ROOT"

# Build admin application
echo "Building admin application..."
pnpm --filter @dating-app/admin build

# Deploy with Docker
echo "Deploying admin container..."
docker-compose build admin
docker-compose up -d admin

# Health check
sleep 3
if docker-compose exec admin wget --no-verbose --tries=1 --spider http://localhost/health &> /dev/null; then
    echo -e "${GREEN}✓ Admin application deployed and healthy${NC}"
else
    echo -e "${RED}✗ Admin application health check failed${NC}"
    exit 1
fi

echo -e "${GREEN}Admin deployment complete${NC}"