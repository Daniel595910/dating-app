#!/bin/bash
set -euo pipefail

# ============================================
# SETUP SCRIPT
# Initial project setup
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  DATING APP - PROJECT SETUP"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
    echo -e "${RED}ERROR: Node.js 20+ is required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check pnpm
echo "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing...${NC}"
    npm install -g pnpm@8
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Check Docker
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}WARNING: Docker is not installed${NC}"
    echo "Docker is required for local development infrastructure"
else
    echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
fi

# Check Docker Compose
echo "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}WARNING: Docker Compose is not installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose $(docker-compose --version)${NC}"
fi

# Install dependencies
echo ""
echo "Installing project dependencies..."
cd "$PROJECT_ROOT"
pnpm install --frozen-lockfile
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Set up environment files
echo ""
echo "Setting up environment files..."
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    echo -e "${YELLOW}IMPORTANT: Edit .env with your actual configuration values${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists. Skipping.${NC}"
fi

# Generate SSL certificates
echo ""
echo "Generating SSL certificates..."
if [[ -f "$PROJECT_ROOT/scripts/generate-certs.sh" ]]; then
    bash "$PROJECT_ROOT/scripts/generate-certs.sh"
else
    echo -e "${YELLOW}SSL script not found. Skipping.${NC}"
fi

# Build packages
echo ""
echo "Building shared packages..."
pnpm build --filter="@dating-app/*"
echo -e "${GREEN}✓ Packages built${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}  SETUP COMPLETE${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Run 'docker-compose up -d' to start services"
echo "3. Run 'pnpm migrate' to apply database migrations"
echo "4. Run 'pnpm seed' to seed development data"
echo "5. Run 'pnpm dev' to start development servers"
echo ""