#!/bin/bash

################################################################################
# INTERVIX - Unified Deployment Script
# =====================================
# 
# Purpose:
#   - Deploy Intervix application to EC2 with Docker Compose
#   - Perform health checks
#   - Validate reverse proxy setup
#
# Prerequisites:
#   - SSH access to EC2 instance
#   - Docker & Docker Compose installed on EC2
#   - GitHub Actions secrets configured
#
# Usage:
#   ./deploy-production.sh [OPTIONS]
#
# Options:
#   --no-cleanup     Skip Docker cleanup (faster deployment)
#   --skip-health    Skip health checks
#   --verbose        Show detailed output
#   --dry-run        Show what would be done (no actual deployment)
#
# Environment Variables:
#   EC2_HOST         - EC2 instance IP or hostname
#   EC2_USERNAME     - SSH username (default: ec2-user)
#   EC2_SSH_KEY      - Path to SSH private key
#   APP_DIR          - App directory on EC2 (default: ~/Intervix)
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="${APP_DIR:-~/Intervix}"
EC2_USERNAME="${EC2_USERNAME:-ec2-user}"
SKIP_CLEANUP=false
SKIP_HEALTH=false
VERBOSE=false
DRY_RUN=false

# Parse arguments
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

# Validate required environment variables
if [ -z "$EC2_HOST" ]; then
  echo -e "${RED}Error: EC2_HOST environment variable not set${NC}"
  exit 1
fi

if [ -z "$EC2_SSH_KEY" ]; then
  echo -e "${RED}Error: EC2_SSH_KEY environment variable not set${NC}"
  exit 1
fi

# Log function
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
echo "║                   INTERVIX - Production Deployment                         ║"
echo "║                                                                            ║"
echo "║  Frontend:  Docker container (3000:80) → Host (localhost:3000)            ║"
echo "║  Backend:   Docker container (5000:5000) → Host (localhost:5000)          ║"
echo "║  NGINX:     Host port 80 → Frontend container (reverse proxy)             ║"
echo "║  SSL/TLS:   HTTPS via Let's Encrypt (optional)                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "Deployment Configuration:"
echo "  Host: $EC2_HOST"
echo "  User: $EC2_USERNAME"
echo "  App Dir: $APP_DIR"
echo "  Skip Cleanup: $SKIP_CLEANUP"
echo "  Skip Health: $SKIP_HEALTH"
echo "  Dry Run: $DRY_RUN"
echo ""

if [ "$DRY_RUN" = true ]; then
  log_warn "DRY RUN MODE - No changes will be made"
  echo ""
fi

# Build SSH command
SSH_CMD="ssh -i $EC2_SSH_KEY -o StrictHostKeyChecking=no $EC2_USERNAME@$EC2_HOST"

# Test SSH connection
log "Testing SSH connection..."
if ! $SSH_CMD "echo 'SSH connection successful'" > /dev/null 2>&1; then
  log_error "Failed to connect to $EC2_HOST"
  exit 1
fi
log_success "SSH connection successful"
echo ""

# Deployment script to run on EC2
DEPLOY_SCRIPT='
set -e

APP_DIR='"$APP_DIR"'
SKIP_CLEANUP='"$SKIP_CLEANUP"'
SKIP_HEALTH='"$SKIP_HEALTH"'
DRY_RUN='"$DRY_RUN"'

if [ "$DRY_RUN" = "true" ]; then
  echo "[DRY RUN] Would execute the following:"
  echo "  1. Navigate to $APP_DIR"
  echo "  2. Stop containers"
  echo "  3. Clean Docker resources"
  echo "  4. Pull latest images"
  echo "  5. Start containers"
  echo "  6. Run health checks"
  exit 0
fi

cd "$APP_DIR"

echo "=========================================="
echo "🚀 Starting Deployment..."
echo "=========================================="
echo ""

# Step 1: Stop existing containers
echo "⏹️  Stopping running containers..."
docker compose down || true

# Step 2: Cleanup (conditional)
if [ "$SKIP_CLEANUP" != "true" ]; then
  echo "🧹 Cleaning up Docker resources..."
  docker system prune -a -f
  docker builder prune -a -f
  docker volume prune -f
else
  echo "⏭️  Skipping Docker cleanup..."
fi

# Step 3: Pull and start fresh
echo "📥 Pulling latest images..."
docker compose pull

echo "🔨 Starting services..."
docker compose up -d --force-recreate --no-build

# Step 4: Wait for services
echo "⏳ Waiting for services to bootstrap (8 seconds)..."
sleep 8

# Step 5: Show status
echo "📊 Container Status:"
docker compose ps
echo ""

# Step 6: Health checks (conditional)
if [ "$SKIP_HEALTH" != "true" ]; then
  echo "🏥 Running health checks..."
  
  # Backend health
  echo "  → Backend health check (http://localhost:5000/health)..."
  HEALTH_CHECK_RETRIES=5
  HEALTH_CHECK_DELAY=2
  
  for ((i=1; i<=HEALTH_CHECK_RETRIES; i++)); do
    if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
      echo "  ✅ Backend is healthy"
      break
    fi
    
    if [ $i -lt $HEALTH_CHECK_RETRIES ]; then
      echo "  ⏳ Retry $i/$HEALTH_CHECK_RETRIES (waiting ${HEALTH_CHECK_DELAY}s)..."
      sleep $HEALTH_CHECK_DELAY
    else
      echo "  ❌ Backend health check failed after $HEALTH_CHECK_RETRIES attempts"
      echo "Backend logs:"
      docker compose logs backend --tail=50
      exit 1
    fi
  done
  
  # Routes check
  echo "  → Backend routes configuration check..."
  if curl -sf http://localhost:5000/health/routes > /dev/null 2>&1; then
    echo "  ✅ Backend routes are configured"
  else
    echo "  ⚠️  Routes endpoint not responding (non-critical)"
  fi
  
  # Frontend health
  echo "  → Frontend health check (http://localhost:3000/)..."
  if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo "  ✅ Frontend is healthy"
  else
    echo "  ❌ Frontend health check failed"
    echo "Frontend logs:"
    docker compose logs frontend --tail=50
    exit 1
  fi
else
  echo "⏭️  Skipping health checks..."
fi

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
'

# Execute deployment on EC2
log "Executing deployment on EC2..."
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] The following script would be executed on $EC2_HOST:"
  echo "---"
  echo "$DEPLOY_SCRIPT"
  echo "---"
else
  if ! $SSH_CMD "$DEPLOY_SCRIPT"; then
    log_error "Deployment failed"
    exit 1
  fi
fi

# Post-deployment information
echo ""
log "Post-Deployment Information:"
echo ""
echo "📍 Service Endpoints (from EC2 perspective):"
echo "  • Frontend Container: http://localhost:3000"
echo "  • Backend API: http://localhost:5000"
echo "  • MongoDB: localhost:27017"
echo ""
echo "🔗 Access from Internet:"
echo "  • HTTP: http://$EC2_HOST (will redirect to HTTPS if configured)"
echo "  • HTTPS: https://intervix.duckdns.org (configure DNS first)"
echo ""
echo "🔐 SSL/TLS Setup (if not already configured):"
echo "  1. Copy nginx.host.conf to /etc/nginx/sites-available/intervix"
echo "  2. Enable site: sudo ln -s /etc/nginx/sites-available/intervix /etc/nginx/sites-enabled/"
echo "  3. Remove default: sudo rm /etc/nginx/sites-enabled/default"
echo "  4. Test: sudo nginx -t"
echo "  5. Start NGINX: sudo systemctl start nginx"
echo "  6. Run Certbot: sudo certbot --nginx -d intervix.duckdns.org"
echo ""
echo "📊 Monitoring Commands (SSH to EC2):"
echo "  • View logs: cd ~/Intervix && docker compose logs -f"
echo "  • View backend logs: docker compose logs -f backend"
echo "  • View frontend logs: docker compose logs -f frontend"
echo "  • Health check: curl http://localhost:5000/health"
echo ""

log_success "Deployment complete!"
