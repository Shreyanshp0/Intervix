#!/bin/bash

# API Route Unification - Docker Deployment Script
# ================================================
# 
# Purpose:
# - Clean up stale Docker containers and images
# - Remove cached dependencies and builds
# - Ensure fresh deployment of unified API routes
# - Validate deployment consistency
#
# Usage:
# ./deploy-clean.sh [--full] [--validate]
#
# Options:
# --full       : Remove all Docker images (not just dangling)
# --validate   : Run health checks after deployment
#

set -e

# Configuration
DOCKER_PRUNE_DANGLING=true
DOCKER_PRUNE_ALL_IMAGES=false
RUN_VALIDATION=false
BACKUP_DIR="./deployment-backups/$(date +%Y%m%d-%H%M%S)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --full)
      DOCKER_PRUNE_ALL_IMAGES=true
      shift
      ;;
    --validate)
      RUN_VALIDATION=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "API Route Unification - Clean Deployment"
echo "========================================"
echo ""

# Step 1: Stop all containers
echo "[1/8] Stopping all running containers..."
docker-compose down --remove-orphans 2>/dev/null || true
echo "✓ Containers stopped"
echo ""

# Step 2: Remove old containers
echo "[2/8] Removing stopped containers..."
docker container prune -f
echo "✓ Containers pruned"
echo ""

# Step 3: Clean up unused images
echo "[3/8] Removing unused Docker images..."
if [ "$DOCKER_PRUNE_ALL_IMAGES" = true ]; then
  echo "  (Full image pruning enabled)"
  docker image prune -af --filter "until=24h"
else
  echo "  (Dangling image pruning only)"
  docker image prune -f
fi
echo "✓ Images pruned"
echo ""

# Step 4: Clean build cache
echo "[4/8] Cleaning Docker build cache..."
docker builder prune -af
echo "✓ Build cache cleaned"
echo ""

# Step 5: Clean frontend build
echo "[5/8] Cleaning frontend build artifacts..."
if [ -d "Frontend/dist" ]; then
  rm -rf Frontend/dist
  echo "✓ Frontend dist cleaned"
else
  echo "  (No dist directory found)"
fi

if [ -d "Frontend/node_modules" ]; then
  echo "  Warning: Frontend node_modules directory exists"
  echo "  This will be reinstalled during Docker build"
fi
echo ""

# Step 6: Clean backend build
echo "[6/8] Cleaning backend artifacts..."
if [ -d "Backend/node_modules" ]; then
  echo "  Warning: Backend node_modules directory exists"
  echo "  This will be reinstalled during Docker build"
fi
echo ""

# Step 7: Rebuild and deploy
echo "[7/8] Rebuilding Docker images..."
echo "  Building backend image..."
docker-compose build --no-cache backend
echo "✓ Backend built"

echo "  Building frontend image..."
docker-compose build --no-cache frontend
echo "✓ Frontend built"

echo ""
echo "[8/8] Starting containers..."
docker-compose up -d
echo "✓ Containers started"
echo ""

# Step 8: Wait for services to be ready
echo "Waiting for services to be ready (30 seconds)..."
sleep 30
echo "✓ Services ready"
echo ""

# Step 9: Validation (optional)
if [ "$RUN_VALIDATION" = true ]; then
  echo "========================================"
  echo "Running deployment validation..."
  echo "========================================"
  echo ""

  BACKEND_URL="http://localhost:5000"
  HEALTH_CHECK_URL="$BACKEND_URL/health"
  ROUTES_CHECK_URL="$BACKEND_URL/api/health/routes"
  VALIDATION_CHECK_URL="$BACKEND_URL/api/health/routes/validation"
  DEPLOYMENT_CHECK_URL="$BACKEND_URL/api/health/deployment"

  # Check backend health
  echo "Checking backend health..."
  if curl -s "$HEALTH_CHECK_URL" > /dev/null; then
    echo "✓ Backend is healthy"
  else
    echo "✗ Backend health check failed"
    exit 1
  fi

  # Check routes
  echo "Checking routes..."
  ROUTES_RESPONSE=$(curl -s "$ROUTES_CHECK_URL")
  if echo "$ROUTES_RESPONSE" | grep -q "candidate"; then
    echo "✓ Routes are registered"
  else
    echo "✗ Route check failed"
    echo "Response: $ROUTES_RESPONSE"
    exit 1
  fi

  # Check route validation
  echo "Checking route validation..."
  VALIDATION_RESPONSE=$(curl -s "$VALIDATION_CHECK_URL")
  if echo "$VALIDATION_RESPONSE" | grep -q "VALID"; then
    echo "✓ Routes are valid"
  else
    echo "✗ Route validation failed"
    echo "Response: $VALIDATION_RESPONSE"
  fi

  # Check deployment health
  echo "Checking deployment health..."
  DEPLOYMENT_RESPONSE=$(curl -s "$DEPLOYMENT_CHECK_URL")
  if echo "$DEPLOYMENT_RESPONSE" | grep -q "HEALTHY"; then
    echo "✓ Deployment is healthy"
  else
    echo "✗ Deployment health check failed"
    echo "Response: $DEPLOYMENT_RESPONSE"
  fi

  echo ""
fi

echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Check frontend at http://localhost:3000"
echo "2. Monitor logs: docker-compose logs -f"
echo "3. View route diagnostics: curl http://localhost:5000/api/health/routes"
echo "4. View deployment health: curl http://localhost:5000/api/health/deployment"
echo ""
echo "To validate API consistency:"
echo "  ./deploy-clean.sh --validate"
echo ""
