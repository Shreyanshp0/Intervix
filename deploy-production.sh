#!/bin/bash

################################################################################
# INTERVIX - Production Deployment Script
# MERN + Docker + Docker Compose + NGINX + EC2
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

APP_DIR="${APP_DIR:-/home/ubuntu/Intervix}"

EC2_HOST="${EC2_HOST:-13.127.10.169}"

EC2_USERNAME="${EC2_USERNAME:-ubuntu}"

EC2_SSH_KEY="${EC2_SSH_KEY:-~/.ssh/intervix-key.pem}"

SKIP_CLEANUP=false
SKIP_HEALTH=false
VERBOSE=false
DRY_RUN=false

# =========================
# ARGUMENTS
# =========================

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cleanup)
      SKIP_CLEANUP=true
      shift
      ;;
    --skip-health)
      SKIP_HEALTH=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

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

# =========================
# LOG FUNCTIONS
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
echo "║               INTERVIX PRODUCTION DEPLOYMENT               ║"
echo "║          MERN + Docker + NGINX + EC2 + SSL                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
log "Deployment Configuration"
echo "---------------------------------------"
echo "EC2 Host      : $EC2_HOST"
echo "EC2 Username  : $EC2_USERNAME"
echo "App Directory : $APP_DIR"
echo "Skip Cleanup  : $SKIP_CLEANUP"
echo "Skip Health   : $SKIP_HEALTH"
echo "Dry Run       : $DRY_RUN"
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
# REMOTE DEPLOY SCRIPT
# =========================

DEPLOY_SCRIPT='

set -e

APP_DIR='"$APP_DIR"'
SKIP_CLEANUP='"$SKIP_CLEANUP"'
SKIP_HEALTH='"$SKIP_HEALTH"'
DRY_RUN='"$DRY_RUN"'

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
echo "STARTING DEPLOYMENT"
echo "========================================"
echo ""

# =====================================
# DRY RUN
# =====================================

if [ "$DRY_RUN" = "true" ]; then
  echo "[DRY RUN]"
  echo "Would deploy application to EC2"
  exit 0
fi

# =====================================
# GO TO APP DIRECTORY
# =====================================

cd "$APP_DIR"

# =====================================
# SHOW CURRENT STATUS
# =====================================

echo "Current containers:"
docker ps || true

echo ""

# =====================================
# STOP CONTAINERS
# =====================================

echo "Stopping existing containers..."

docker compose down || true

log_success "Containers stopped"

# =====================================
# CLEANUP
# =====================================

if [ "$SKIP_CLEANUP" != "true" ]; then

  echo "Cleaning Docker resources..."

  docker system prune -a -f || true
  docker volume prune -f || true
  docker builder prune -a -f || true

  log_success "Docker cleanup complete"

else
  log_warn "Skipping Docker cleanup"
fi

# =====================================
# PULL LATEST IMAGES
# =====================================

echo "Pulling latest images..."

docker compose pull

log_success "Images pulled"

# =====================================
# START CONTAINERS
# =====================================

echo "Starting containers..."

docker compose up -d --force-recreate --no-build

log_success "Containers started"

# =====================================
# WAIT FOR BOOT
# =====================================

echo "Waiting for containers to boot..."

sleep 10

# =====================================
# CONTAINER STATUS
# =====================================

echo ""
echo "Container Status:"
docker compose ps

echo ""

# =====================================
# VERIFY PORTS
# =====================================

echo "Checking listening ports..."

sudo lsof -i :3000 || true
sudo lsof -i :5000 || true

echo ""

# =====================================
# HEALTH CHECKS
# =====================================

if [ "$SKIP_HEALTH" != "true" ]; then

  echo "Running health checks..."

  # ===============================
  # BACKEND HEALTH
  # ===============================

  echo ""
  echo "Checking backend..."

  BACKEND_OK=false

  for i in {1..10}; do

    if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
      BACKEND_OK=true
      break
    fi

    echo "Retry $i/10..."
    sleep 3

  done

  if [ "$BACKEND_OK" = true ]; then
    log_success "Backend healthy"
  else
    log_error "Backend health failed"

    echo ""
    echo "Backend Logs:"
    docker compose logs backend --tail=100

    exit 1
  fi

  # ===============================
  # FRONTEND HEALTH
  # ===============================

  echo ""
  echo "Checking frontend..."

  FRONTEND_OK=false

  for i in {1..10}; do

    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
      FRONTEND_OK=true
      break
    fi

    echo "Retry $i/10..."
    sleep 3

  done

  if [ "$FRONTEND_OK" = true ]; then
    log_success "Frontend healthy"
  else
    log_error "Frontend health failed"

    echo ""
    echo "Frontend Logs:"
    docker compose logs frontend --tail=100

    exit 1
  fi

else
  log_warn "Skipping health checks"
fi

# =====================================
# VERIFY NGINX
# =====================================

echo ""
echo "Checking NGINX..."

if sudo nginx -t; then
  log_success "NGINX configuration valid"
else
  log_error "NGINX configuration invalid"
  exit 1
fi

# =====================================
# RESTART NGINX
# =====================================

echo "Restarting NGINX..."

sudo systemctl restart nginx

log_success "NGINX restarted"

# =====================================
# VERIFY WEBSITE
# =====================================

echo ""
echo "Verifying website..."

if curl -Is http://localhost | head -n 1 | grep "200\\|301\\|302" > /dev/null; then
  log_success "Website responding"
else
  log_warn "Website may not be responding yet"
fi

# =====================================
# FINAL STATUS
# =====================================

echo ""
echo "========================================"
echo "DEPLOYMENT SUCCESSFUL"
echo "========================================"

echo ""
echo "Frontend:"
echo "http://localhost:3000"

echo ""
echo "Backend:"
echo "http://localhost:5000"

echo ""
echo "NGINX:"
echo "http://localhost"

echo ""

docker compose ps

echo ""

echo "Recent Logs:"
docker compose logs --tail=20

'

# =========================
# EXECUTE DEPLOYMENT
# =========================

log "Executing deployment on EC2..."

echo ""

if [ "$DRY_RUN" = true ]; then

  echo "[DRY RUN SCRIPT]"
  echo "$DEPLOY_SCRIPT"

else

  if ! $SSH_CMD "$DEPLOY_SCRIPT"; then
    log_error "Deployment failed"
    exit 1
  fi

fi

# =========================
# COMPLETE
# =========================

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="

echo ""
echo "Application URLs:"
echo ""
echo "Frontend:"
echo "http://$EC2_HOST"
echo ""

echo "Backend:"
echo "http://$EC2_HOST/api"
echo ""

echo "HTTPS:"
echo "https://intervix.duckdns.org"
echo ""

echo "Useful Commands:"
echo ""
echo "SSH:"
echo "ssh -i ~/.ssh/intervix-key.pem ubuntu@$EC2_HOST"
echo ""

echo "View Logs:"
echo "cd ~/Intervix && docker compose logs -f"
echo ""

echo "Restart Containers:"
echo "cd ~/Intervix && docker compose restart"
echo ""

echo "Restart NGINX:"
echo "sudo systemctl restart nginx"
echo ""

log_success "Deployment completed successfully"