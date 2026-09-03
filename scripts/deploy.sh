#!/bin/bash
set -euo pipefail

# ============================================
# DEPLOY SCRIPT
# Main deployment script
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  DEPLOYING DATING APP"
echo "=========================================="
echo ""

# Check environment
if [[ -z "${NODE_ENV:-}" ]]; then
    export NODE_ENV=production
fi

echo "Environment: $NODE_ENV"

# Check for required environment variables
REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
)

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo -e "${RED}ERROR: $var is not set${NC}"
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

if [[ $MISSING_VARS -gt 0 ]]; then
    echo -e "${RED}Please set all required environment variables${NC}"
    exit 1
fi

# Pull latest changes if in git repo
if [[ -d "$PROJECT_ROOT/.git" ]]; then
    echo "Pulling latest changes..."
    cd "$PROJECT_ROOT"
    git pull
fi

# Build and deploy with Docker Compose
echo ""
echo "Building and deploying with Docker Compose..."
cd "$PROJECT_ROOT"
docker-compose down
docker-compose up -d --build

# Check deployment
echo ""
echo "Checking deployment..."
sleep 5

if curl -f http://localhost/health &> /dev/null; then
    echo -e "${GREEN}✓ Web application is healthy${NC}"
else
    echo -e "${RED}✗ Web application health check failed${NC}"
fi

if curl -f http://localhost/admin/health &> /dev/null; then
    echo -e "${GREEN}✓ Admin application is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Admin health check failed (may not be exposed at this URL)${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  DEPLOYMENT COMPLETE"
echo -e "==========================================${NC}"