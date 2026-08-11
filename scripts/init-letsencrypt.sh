#!/bin/bash
# ============================================================
# init-letsencrypt.sh
# Run this ONCE on the server to obtain SSL certificates
# from Let's Encrypt before starting the full stack.
# ============================================================

set -e

# Load .env variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DOMAIN="${DOMAIN:?Error: DOMAIN is not set in .env}"
EMAIL="${CERTBOT_EMAIL:?Error: CERTBOT_EMAIL is not set in .env}"
STAGING="${LETSENCRYPT_STAGING:-0}"  # Set to 1 for testing to avoid rate limits

echo "================================================="
echo "  Let's Encrypt SSL Certificate Setup"
echo "  Domain:  $DOMAIN"
echo "  Email:   $EMAIL"
echo "  Staging: $STAGING"
echo "================================================="

# ─── Step 1: Create required directories ───
echo ""
echo "[Step 1] Creating directories..."
mkdir -p certbot/conf certbot/www

# ─── Step 2: Stop any running containers ───
echo "[Step 2] Stopping any running containers..."
docker compose down 2>/dev/null || true
docker stop nginx-acme 2>/dev/null || true
docker rm nginx-acme 2>/dev/null || true

# ─── Step 3: Start temporary HTTP-only nginx for ACME challenge ───
echo "[Step 3] Starting temporary HTTP-only nginx..."
docker run -d --name nginx-acme \
  -p 80:80 \
  -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
  nginx:alpine \
  sh -c "echo 'server { listen 80; server_name _; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 \"ready\"; add_header Content-Type text/plain; } }' > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"

sleep 2

# Verify nginx is running
if ! curl -s http://localhost > /dev/null 2>&1; then
  echo "ERROR: Temporary nginx failed to start!"
  docker logs nginx-acme
  exit 1
fi
echo "  OK - Temporary nginx is running on port 80"

# ─── Step 4: Request certificate from Let's Encrypt ───
echo "[Step 4] Requesting Let's Encrypt certificate..."

STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
  STAGING_ARG="--staging"
  echo "  WARNING: Using staging environment (not production)"
fi

docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  $STAGING_ARG \
  -d "$DOMAIN"

echo "  OK - Certificate obtained!"

# ─── Step 5: Stop temporary nginx ───
echo "[Step 5] Stopping temporary nginx..."
docker stop nginx-acme && docker rm nginx-acme
echo "  OK - Temporary nginx removed"

# ─── Step 6: Start full stack ───
echo "[Step 6] Starting full stack with HTTPS..."
docker compose up -d

echo ""
echo "================================================="
echo "  SSL setup complete!"
echo "  Your site is now available at:"
echo "     https://$DOMAIN"
echo ""
echo "  Check status: docker compose ps"
echo "  View logs:    docker compose logs -f nginx"
echo "================================================="
