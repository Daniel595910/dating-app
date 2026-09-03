#!/bin/bash
set -euo pipefail

# ============================================
# SSL CERTIFICATE GENERATION
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$PROJECT_ROOT/infrastructure/ssl/certs"

mkdir -p "$CERTS_DIR"

echo "Generating self-signed SSL certificates..."

openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$CERTS_DIR/key.pem" \
    -out "$CERTS_DIR/cert.pem" \
    -subj "/C=US/ST=State/L=City/O=DatingApp/OU=Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

chmod 600 "$CERTS_DIR/key.pem"
chmod 644 "$CERTS_DIR/cert.pem"

echo "✓ Certificates generated:"
echo "  Certificate: $CERTS_DIR/cert.pem"
echo "  Private Key: $CERTS_DIR/key.pem"