#!/bin/bash
set -euo pipefail

# ============================================
# DEPLOY WEB SCRIPT
# Deploy only the web application
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=========================================="
echo "  DEPLOYING WEB APPLICATION"
echo "=========================================="
echo ""

cd "$PROJECT_ROOT"

# Build web application
echo "Building web application..."
pnpm --filter @dating-app/web build

# Deploy with Docker
echo "Deploying web container..."
docker-compose build web
docker-compose up -d web

# Health check
sleep 3
if docker-compose exec web wget --no-verbose --tries=1 --spider http://localhost/health &> /dev/null; then
    echo -e "${GREEN}✓ Web application deployed and healthy${NC}"
else
    echo -e "${RED}✗ Web application health check failed${NC}"
    exit 1
fi

echo -e "${GREEN}Web deployment complete${NC}"