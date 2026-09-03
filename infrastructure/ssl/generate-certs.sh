#!/bin/bash
set -euo pipefail

# SSL Certificate Generation Script
# Generates self-signed certificates for development and testing
# For production, use Let's Encrypt or a proper CA

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/certs"

# Create certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

echo "=== SSL Certificate Generation ==="
echo "Generating self-signed certificates in: $CERTS_DIR"
echo ""

# Check if certificates already exist
if [[ -f "$CERTS_DIR/cert.pem" && -f "$CERTS_DIR/key.pem" ]]; then
    echo "WARNING: Certificates already exist."
    echo "  cert.pem: $CERTS_DIR/cert.pem"
    echo "  key.pem:  $CERTS_DIR/key.pem"
    echo ""
    read -p "Do you want to overwrite them? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Existing certificates preserved."
        exit 0
    fi
fi

# Generate certificates
echo "Generating new self-signed certificates..."
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$CERTS_DIR/key.pem" \
    -out "$CERTS_DIR/cert.pem" \
    -subj "/C=US/ST=State/L=City/O=DatingApp/OU=Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Set appropriate permissions
chmod 600 "$CERTS_DIR/key.pem"
chmod 644 "$CERTS_DIR/cert.pem"

echo ""
echo "=== Certificate Generation Complete ==="
echo "Certificate: $CERTS_DIR/cert.pem"
echo "Private Key: $CERTS_DIR/key.pem"
echo ""
echo "IMPORTANT: These are self-signed certificates for development only."
echo "For production, use Let's Encrypt or a proper Certificate Authority."