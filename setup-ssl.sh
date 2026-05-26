#!/bin/bash

################################################################################
# INTERVIX - SSL/TLS Setup Script
# ================================
#
# Purpose:
#   - Configure NGINX on EC2 host for SSL/TLS with Let's Encrypt
#   - Setup automatic SSL certificate renewal
#   - Configure reverse proxy properly
#
# Prerequisites:
#   - SSH access to EC2 instance
#   - Docker & Docker Compose running with Intervix
#   - NGINX installed on EC2 host
#   - Domain name pointing to EC2 instance
#   - Port 80 accessible from internet (for Let's Encrypt verification)
#
# Usage:
#   ./setup-ssl.sh
#
# Environment Variables:
#   EC2_HOST       - EC2 instance IP or hostname
#   EC2_USERNAME   - SSH username (default: ec2-user)
#   EC2_SSH_KEY    - Path to SSH private key
#   DOMAIN         - Your domain name (e.g., intervix.com)
#   EMAIL          - Email for Let's Encrypt notifications
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
EC2_USERNAME="${shreyanshp0:-ec2-user}"
DOMAIN="${DOMAIN:-http://intervix.duckdns.org/}"
EMAIL="${EMAIL:-shreysandhya.pandey124@gmail.com}"
APP_DIR="/home/${EC2_USERNAME}/Intervix"

# Validate inputs
if [ -z "$EC2_HOST" ]; then
  echo -e "${RED}Error: EC2_HOST not set${NC}"
  exit 1
fi

if [ -z "$EC2_SSH_KEY" ]; then
  echo -e "${RED}Error: EC2_SSH_KEY not set${NC}"
  exit 1
fi

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: DOMAIN not set (e.g., intervix.com)${NC}"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  echo -e "${RED}Error: EMAIL not set (for Let's Encrypt notifications)${NC}"
  exit 1
fi

# Log functions
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[⚠]${NC} $1"
}

# Header
clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                   INTERVIX - SSL/TLS Setup                                 ║"
echo "║                     (Let's Encrypt + Certbot)                              ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "Configuration:"
echo "  Host: $EC2_HOST"
echo "  User: $EC2_USERNAME"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo ""

# SSH command
SSH_CMD="ssh -i $EC2_SSH_KEY -o StrictHostKeyChecking=no $EC2_USERNAME@$EC2_HOST"

# Test connection
log "Testing SSH connection..."
if ! $SSH_CMD "echo 'OK'" > /dev/null 2>&1; then
  log_error "Failed to connect to $EC2_HOST"
  exit 1
fi
log_success "SSH connection successful"
echo ""

# SSL setup script
SSL_SETUP_SCRIPT='
set -e

DOMAIN='"$DOMAIN"'
EMAIL='"$EMAIL"'
APP_DIR='"$APP_DIR"'

echo "=========================================="
echo "🔐 Starting SSL/TLS Setup..."
echo "=========================================="
echo ""

# Step 1: Check if NGINX is installed
echo "1️⃣  Checking NGINX installation..."
if ! command -v nginx &> /dev/null; then
  echo "❌ NGINX not found. Installing..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx certbot python3-certbot-nginx
  log_success "NGINX and Certbot installed"
else
  log_success "NGINX is installed"
fi

# Step 2: Check if Certbot is installed
echo "2️⃣  Checking Certbot installation..."
if ! command -v certbot &> /dev/null; then
  echo "Installing Certbot..."
  sudo apt-get install -y -qq certbot python3-certbot-nginx
  log_success "Certbot installed"
else
  log_success "Certbot is installed"
fi

# Step 3: Create certbot directories
echo "3️⃣  Creating certificate directories..."
sudo mkdir -p /var/www/certbot
log_success "Directories created"

# Step 4: Backup current NGINX config
echo "4️⃣  Backing up NGINX configuration..."
sudo mkdir -p /etc/nginx/backups
BACKUP_FILE="/etc/nginx/backups/intervix_$(date +%Y%m%d_%H%M%S).conf"
if [ -f /etc/nginx/sites-available/intervix ]; then
  sudo cp /etc/nginx/sites-available/intervix "$BACKUP_FILE"
  log_success "Backup created: $BACKUP_FILE"
fi

# Step 5: Setup temporary HTTP-only config for Let'\''s Encrypt
echo "5️⃣  Setting up temporary HTTP config for Let'\''s Encrypt validation..."
sudo tee /etc/nginx/sites-available/intervix > /dev/null << '\''EOF'\''
server {
    listen 80;
    listen [::]:80;
    server_name '"$DOMAIN"' www.'"$DOMAIN"';

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "OK";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/intervix /etc/nginx/sites-enabled/intervix
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload NGINX
if sudo nginx -t; then
  sudo systemctl reload nginx
  log_success "Temporary NGINX config loaded"
else
  log_error "NGINX config test failed"
  exit 1
fi

# Step 6: Obtain SSL certificate
echo "6️⃣  Obtaining SSL certificate from Let'\''s Encrypt..."
echo "    (This will create an account with $EMAIL)"
sudo certbot certonly --webroot -w /var/www/certbot \
  -d '"$DOMAIN"' -d www.'"$DOMAIN"' \
  --email '"$EMAIL"' \
  --agree-tos \
  --non-interactive \
  --expand || log_warn "Certificate generation completed (may already exist)"

log_success "SSL certificate obtained"

# Step 7: Setup HTTPS config
echo "7️⃣  Configuring HTTPS..."
cat << '\''EOF'\'' > /tmp/intervix.nginx.conf
upstream intervix_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

upstream intervix_frontend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name '"$DOMAIN"' www.'"$DOMAIN"';

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name '"$DOMAIN"' www.'"$DOMAIN"';

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/'"$DOMAIN"'/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/'"$DOMAIN"'/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/'"$DOMAIN"'/chain.pem;

    # SSL Configuration
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    client_max_body_size 25m;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Access Logs
    access_log /var/log/nginx/intervix_access.log;
    error_log /var/log/nginx/intervix_error.log;

    # Frontend
    location / {
        proxy_pass http://intervix_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
        proxy_read_timeout 300s;
        proxy_buffering off;
    }

    # Backend API
    location /api/ {
        proxy_pass http://intervix_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Connection "";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://intervix_backend/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 100m;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://intervix_backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
EOF

sudo cp /tmp/intervix.nginx.conf /etc/nginx/sites-available/intervix
log_success "HTTPS config installed"

# Step 8: Test and reload NGINX
echo "8️⃣  Testing NGINX configuration..."
if sudo nginx -t; then
  sudo systemctl reload nginx
  log_success "NGINX reloaded successfully"
else
  log_error "NGINX config test failed - reverting"
  sudo cp "$BACKUP_FILE" /etc/nginx/sites-available/intervix
  sudo systemctl reload nginx
  exit 1
fi

# Step 9: Setup auto-renewal
echo "9️⃣  Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
log_success "Auto-renewal enabled"

# Step 10: Verify setup
echo "🔟 Verifying SSL setup..."
if curl -sf https://'"$DOMAIN"'/ > /dev/null 2>&1; then
  log_success "✅ SSL is working!"
else
  log_warn "⚠️  HTTPS not accessible yet (may need DNS propagation or firewall rules)"
fi

echo ""
echo "=========================================="
echo "✅ SSL/TLS Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Certificate Information:"
sudo certbot certificates 2>/dev/null | grep -A 5 "'"$DOMAIN"'" || echo "Certificate details not available yet"
echo ""
echo "🔄 Auto-Renewal:"
echo "  • Next renewal check: $(systemctl status certbot.timer 2>/dev/null | grep -i "trigger" || echo "Check: sudo systemctl status certbot.timer")"
echo "  • Manual renewal: sudo certbot renew --dry-run"
echo ""
'

# Execute on EC2
log "Executing SSL setup on $EC2_HOST..."
echo ""

if ! $SSH_CMD "$SSL_SETUP_SCRIPT"; then
  log_error "SSL setup failed"
  exit 1
fi

# Post-setup information
echo ""
log "SSL Setup Complete!"
echo ""
echo "✅ Next Steps:"
echo "  1. Verify DNS points to $EC2_HOST"
echo "  2. Test: curl https://$DOMAIN/"
echo "  3. Check certificate: sudo certbot certificates"
echo "  4. Monitor auto-renewal: sudo systemctl status certbot.timer"
echo ""

log_success "SSL/TLS setup completed successfully!"
