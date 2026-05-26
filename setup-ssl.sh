#!/bin/bash

################################################################################
# INTERVIX - SSL/TLS Setup Script
# MERN + Docker + NGINX + Certbot + EC2
################################################################################

set -e

# =========================
# COLORS
# =========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =========================
# CONFIGURATION
# =========================

# EC2 Public IP
EC2_HOST="${EC2_HOST:-13.127.10.169}"

# Ubuntu EC2 username
EC2_USERNAME="${EC2_USERNAME:-ubuntu}"

# Path to SSH PEM key
EC2_SSH_KEY="${EC2_SSH_KEY:-~/.ssh/intervix-key.pem}"

# Domain
DOMAIN="${DOMAIN:-intervix.duckdns.org}"

# Email for Let's Encrypt
EMAIL="${EMAIL:-shreysandhya.pandey124@gmail.com}"

# App directory
APP_DIR="/home/${EC2_USERNAME}/Intervix"

# =========================
# VALIDATION
# =========================

if [ -z "$EC2_HOST" ]; then
  echo -e "${RED}EC2_HOST not set${NC}"
  exit 1
fi

if [ -z "$EC2_SSH_KEY" ]; then
  echo -e "${RED}EC2_SSH_KEY not set${NC}"
  exit 1
fi

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}DOMAIN not set${NC}"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  echo -e "${RED}EMAIL not set${NC}"
  exit 1
fi

# =========================
# LOGGING FUNCTIONS
# =========================

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

# =========================
# HEADER
# =========================

clear

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 INTERVIX SSL/TLS SETUP                     ║"
echo "║            NGINX + CERTBOT + DOCKER + EC2                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
log "Configuration"
echo "--------------------------------------"
echo "EC2 Host      : $EC2_HOST"
echo "EC2 Username  : $EC2_USERNAME"
echo "Domain        : $DOMAIN"
echo "Email         : $EMAIL"
echo "SSH Key       : $EC2_SSH_KEY"
echo ""

# =========================
# SSH COMMAND
# =========================

SSH_CMD="ssh -i $EC2_SSH_KEY -o StrictHostKeyChecking=no $EC2_USERNAME@$EC2_HOST"

# =========================
# TEST SSH
# =========================

log "Testing SSH connection..."

if ! $SSH_CMD "echo connected" > /dev/null 2>&1; then
  log_error "SSH connection failed"
  exit 1
fi

log_success "SSH connection successful"

# =========================
# REMOTE SCRIPT
# =========================

REMOTE_SCRIPT='

set -e

DOMAIN='"$DOMAIN"'
EMAIL='"$EMAIL"'

log_success() {
  echo "[✓] $1"
}

log_error() {
  echo "[✗] $1"
}

log_warn() {
  echo "[⚠] $1"
}

echo ""
echo "========================================"
echo "STARTING SSL/TLS SETUP"
echo "========================================"
echo ""

# =====================================
# STEP 1 - INSTALL NGINX + CERTBOT
# =====================================

echo "Installing NGINX + Certbot..."

sudo apt update -y

sudo apt install nginx certbot python3-certbot-nginx -y

log_success "NGINX & Certbot installed"

# =====================================
# STEP 2 - START NGINX
# =====================================

echo "Starting NGINX..."

sudo systemctl enable nginx
sudo systemctl start nginx

log_success "NGINX started"

# =====================================
# STEP 3 - REMOVE DEFAULT CONFIG
# =====================================

sudo rm -f /etc/nginx/sites-enabled/default

# =====================================
# STEP 4 - CREATE NGINX CONFIG
# =====================================

echo "Creating NGINX config..."

sudo tee /etc/nginx/sites-available/intervix > /dev/null <<EOF

upstream intervix_frontend {
    server 127.0.0.1:3000;
}

upstream intervix_backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    listen [::]:80;

    server_name '"$DOMAIN"' www.'"$DOMAIN"';

    client_max_body_size 100M;

    # Frontend
    location / {
        proxy_pass http://intervix_frontend;

        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://intervix_backend/api/;

        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.IO / WebRTC
    location /socket.io/ {
        proxy_pass http://intervix_backend/socket.io/;

        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;

        proxy_buffering off;
    }
}

EOF

log_success "NGINX config created"

# =====================================
# STEP 5 - ENABLE CONFIG
# =====================================

sudo ln -sf /etc/nginx/sites-available/intervix /etc/nginx/sites-enabled/intervix

# =====================================
# STEP 6 - TEST NGINX
# =====================================

echo "Testing NGINX config..."

sudo nginx -t

log_success "NGINX config valid"

# =====================================
# STEP 7 - RESTART NGINX
# =====================================

sudo systemctl restart nginx

log_success "NGINX restarted"

# =====================================
# STEP 8 - SSL CERTIFICATE
# =====================================

echo ""
echo "Generating SSL certificate..."

sudo certbot --nginx \
-d '"$DOMAIN"' \
-d www.'"$DOMAIN"' \
--agree-tos \
--email '"$EMAIL"' \
--non-interactive \
--redirect

log_success "SSL certificate generated"

# =====================================
# STEP 9 - ENABLE AUTO RENEW
# =====================================

sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

log_success "Auto-renewal enabled"

# =====================================
# STEP 10 - VERIFY
# =====================================

echo ""
echo "========================================"
echo "SSL SETUP COMPLETE"
echo "========================================"

echo ""
echo "Testing HTTPS..."

if curl -Is https://'"$DOMAIN"' | head -n 1 | grep "200\\|301\\|302" > /dev/null; then
    log_success "HTTPS is working"
else
    log_warn "HTTPS test failed"
fi

echo ""
echo "Website:"
echo "https://'"$DOMAIN"'"
echo ""

echo "Certificate Info:"
sudo certbot certificates || true

echo ""
echo "Auto-renewal status:"
sudo systemctl status certbot.timer --no-pager || true
'

# =========================
# EXECUTE REMOTE SCRIPT
# =========================

log "Executing setup on EC2..."

if ! $SSH_CMD "$REMOTE_SCRIPT"; then
  log_error "SSL setup failed"
  exit 1
fi

# =========================
# COMPLETE
# =========================

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="

echo ""
echo "Your application should now be available at:"
echo ""
echo "https://$DOMAIN"
echo ""

echo "IMPORTANT:"
echo "1. Make sure DuckDNS points to your EC2 IP"
echo "2. Ensure frontend container runs on 3000"
echo "3. Ensure backend container runs on 5000"
echo "4. Security group must allow:"
echo "   - 22"
echo "   - 80"
echo "   - 443"
echo ""

log_success "Setup completed successfully"