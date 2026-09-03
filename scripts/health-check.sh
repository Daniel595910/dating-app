#!/bin/bash
set -euo pipefail

# ============================================
# HEALTH CHECK SCRIPT
# Check health of all services
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  HEALTH CHECK"
echo "=========================================="
echo ""

FAILED=0

check_url() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    if curl -f -s -o /dev/null --max-time 5 "$url"; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        FAILED=$((FAILED + 1))
    fi
}

check_port() {
    local host=$1
    local port=$2
    local name=$3
    
    echo -n "Checking $name... "
    if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}✓ Reachable${NC}"
    else
        echo -e "${RED}✗ Unreachable${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Web application
check_url "http://localhost/health" "Web Application"

# Admin application
check_url "http://localhost/admin/health" "Admin Application"

# Nginx gateway
check_url "http://localhost/health" "Nginx Gateway"

# Redis
check_port "localhost" "6379" "Redis"

# PostgreSQL
check_port "localhost" "5432" "PostgreSQL"

# Prometheus
check_url "http://localhost:9090/-/healthy" "Prometheus"

echo ""
echo "=========================================="
if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}  ALL SERVICES HEALTHY${NC}"
else
    echo -e "${RED}  $FAILED SERVICE(S) FAILED${NC}"
fi
echo "=========================================="

exit $FAILED