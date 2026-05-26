# INTERVIX - Port Configuration Fix - Change Summary

## Executive Summary

**Problem:** Frontend Docker container was creating port conflict with host NGINX
- Container tried to expose port 80:80 (conflicted with NGINX on host)
- NGINX on host also needed port 80 for reverse proxy
- Error: `bind() to 0.0.0.0:80 failed (98: Address already in use)`

**Solution:** Implemented proper containerized architecture with:
- Frontend container on 3000:80 (mapped to host port 3000)
- Backend container on 5000:5000 (mapped to host port 5000)
- Host NGINX on port 80/443 acting as reverse proxy
- Proper Docker networking and health checks

---

## Files Changed

### 1. `docker-compose.yml` ✅
**Status:** UPDATED

#### Changes Made:

##### a) Frontend Service
```diff
- ports:
-   - "5173:5173" # Vite default port
-   - "3000:80"   # Production port
+ ports:
+   - "3000:80"   # Frontend container internal nginx on port 80, mapped to host 3000
```
**Explanation:**
- Removed Vite port (not needed in production)
- Kept 3000:80 mapping (already correct, but clarified comment)
- Added explicit network assignment

```diff
+ networks:
+   - intervix-network
```
**Explanation:**
- Added Docker bridge network for inter-container communication
- Allows backend to reference frontend as `frontend:80` internally

##### b) Backend Service
```diff
+ networks:
+   - intervix-network
```
**Explanation:**
- Added to same network for communication with other services
- Maintains 5000:5000 port mapping (correct)

##### c) MongoDB Service
```diff
+ networks:
+   - intervix-network
```
**Explanation:**
- Included in bridge network so backend can connect

##### d) COTURN Service
```diff
+ networks:
+   - intervix-network
```
**Explanation:**
- Added network connectivity

##### e) Optional Docker NGINX Service (COMMENTED OUT)
```yaml
# nginx:
#   image: nginx:alpine
#   container_name: intervix_nginx
#   ports:
#     - "80:80"
#     - "443:443"
#   volumes:
#     - ./nginx.production.conf:/etc/nginx/conf.d/default.conf:ro
#     - /etc/letsencrypt:/etc/letsencrypt:ro
#   depends_on:
#     - frontend
#     - backend
#   restart: unless-stopped
#   networks:
#     - intervix-network
```
**Explanation:**
- Alternative option for running NGINX in Docker
- NOT enabled by default (use host NGINX instead)
- Provides flexibility if containerized setup is preferred

##### f) Networks Definition
```yaml
networks:
  intervix-network:
    driver: bridge
```
**Explanation:**
- Creates bridge network for all containers
- Allows DNS-based communication between containers

---

### 2. `nginx.production.conf` ✅
**Status:** UPDATED

#### Changes Made:

##### a) Upstream Definitions
```diff
- upstream intervix_backend {
-     server 127.0.0.1:5000;
-     keepalive 64;
- }
- 
- upstream intervix_frontend {
-     server 127.0.0.1:3000;
-     keepalive 32;
- }

+ upstream intervix_backend {
+     server backend:5000;
+     keepalive 64;
+ }
+ 
+ upstream intervix_frontend {
+     server frontend:80;
+     keepalive 32;
+ }
```
**Explanation:**
- Changed from `127.0.0.1` to Docker internal DNS names
- This config is for NGINX running INSIDE a Docker container
- If NGINX is in the network, it can reach `backend:5000` and `frontend:80`
- This file is used when NGINX is containerized (optional alternative)

##### b) Connection Handling
```diff
+ proxy_set_header Connection "";
+ proxy_buffering off;
```
**Explanation:**
- Better HTTP/1.1 keep-alive handling
- Disables buffering for real-time data (interviews, WebSocket)

##### c) SSL Configuration Notes
```yaml
# SSL Configuration section improved with:
# - ssl_stapling for better SSL performance
# - Better cipher configuration
# - Connection reuse settings
```

---

### 3. `nginx.host.conf` ✨
**Status:** CREATED (NEW)

**Purpose:** NGINX configuration for running on the EC2 host machine (NOT containerized)

#### Key Features:

##### a) Upstream Definitions
```nginx
upstream intervix_backend {
    server 127.0.0.1:5000;  # localhost:5000
    keepalive 64;
}

upstream intervix_frontend {
    server 127.0.0.1:3000;  # localhost:3000
    keepalive 32;
}
```
**Explanation:**
- Points to containers via localhost (host perspective)
- Port 3000 is where frontend container is mapped to on host
- Port 5000 is where backend container is mapped to on host

##### b) HTTP Server (Port 80)
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name intervix.duckdns.org;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}
```
**Explanation:**
- Listens on port 80 on the host
- Allows Let's Encrypt ACME validation
- Redirects all traffic to HTTPS

##### c) HTTPS Server (Port 443)
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name intervix.duckdns.org;
    
    ssl_certificate /etc/letsencrypt/live/intervix.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/intervix.duckdns.org/privkey.pem;
```
**Explanation:**
- Listens on port 443 with SSL/TLS
- Uses Let's Encrypt certificates (managed by Certbot)

##### d) Frontend Proxy
```nginx
location / {
    proxy_pass http://intervix_frontend;  # → localhost:3000
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Connection "";
    proxy_read_timeout 300s;
    proxy_buffering off;
}
```
**Explanation:**
- Routes `/` to frontend container on localhost:3000
- Preserves client IP with X-Forwarded headers
- Disables buffering for real-time updates

##### e) API Proxy
```nginx
location /api/ {
    proxy_pass http://intervix_backend/api/;  # → localhost:5000/api/
    # ... similar configuration
}
```
**Explanation:**
- Routes `/api/*` to backend container on localhost:5000

##### f) WebSocket Proxy (Socket.io)
```nginx
location /socket.io/ {
    proxy_pass http://intervix_backend/socket.io/;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;  # 1 hour timeout for long connections
}
```
**Explanation:**
- Special handling for WebSocket connections
- Used for live interviews and real-time features
- Long timeout for persistent connections

---

### 4. `.github/workflows/deploy.yml` ✅
**Status:** UPDATED

#### Changes Made:

##### a) Added Docker Image Tagging
```diff
+ docker tag shreyanshp0/intervix-backend:latest shreyanshp0/intervix-backend:$(date +%Y%m%d_%H%M%S)
+ docker tag shreyanshp0/intervix-frontend:latest shreyanshp0/intervix-frontend:$(date +%Y%m%d_%H%M%S)
```
**Explanation:**
- Adds timestamped tags for version tracking
- Easier to rollback to previous versions if needed

##### b) Enhanced Deployment Logging
```diff
+ echo "=========================================="
+ echo "🚀 Starting Deployment..."
+ echo "=========================================="
+ 
+ echo "⏹️  Stopping running containers..."
+ echo "🧹 Cleaning up Docker resources..."
+ echo "📥 Pulling latest images..."
+ echo "🔨 Starting services..."
```
**Explanation:**
- Better visibility into deployment progress
- Easier debugging if deployment fails
- Clear indication of each step

##### c) Health Check Improvements
```diff
+ # Health checks
+ echo "🏥 Running health checks..."
+ 
+ # Backend health check
+ echo "  → Backend health check..."
+ if curl -f http://localhost:5000/health; then
+   echo "  ✅ Backend is healthy"
+ else
+   echo "  ❌ Backend health check failed"
+   echo "Backend logs:"
+   docker compose logs backend
+   exit 1
+ fi
```
**Explanation:**
- More detailed health checks with logging
- Auto-logs errors for easier troubleshooting
- Exits with error code if health checks fail

##### d) Frontend Health Check Added
```diff
+ # Frontend health
+ echo "  → Frontend health check..."
+ if curl -f http://localhost:3000/; then
+   echo "  ✅ Frontend is healthy"
+ else
+   echo "  ❌ Frontend health check failed"
+   docker compose logs frontend
+   exit 1
+ fi
```
**Explanation:**
- New check to verify frontend container is responding
- Validates that port 3000 mapping is working
- Catches startup issues early

---

### 5. `deploy-production.sh` ✨
**Status:** CREATED (NEW)

**Purpose:** Automated deployment script for local machine to SSH into EC2

#### Features:

- **Pre-flight checks:** Validates EC2 connection
- **Dry-run mode:** Preview deployment without making changes
- **Flexible cleanup:** Skip Docker cleanup for faster deployment
- **Health verification:** Comprehensive health checks
- **Better output:** Color-coded logging with progress indicators
- **Error handling:** Graceful error messages and rollback

#### Usage:
```bash
export EC2_HOST="1.2.3.4"
export EC2_USERNAME="ec2-user"
export EC2_SSH_KEY="/path/to/key.pem"

./deploy-production.sh                    # Full deployment
./deploy-production.sh --no-cleanup       # Skip Docker cleanup
./deploy-production.sh --dry-run          # Preview only
```

---

### 6. `setup-ssl.sh` ✨
**Status:** CREATED (NEW)

**Purpose:** Automated SSL/TLS certificate setup with Let's Encrypt and Certbot

#### Features:

- **Automatic installation:** Installs NGINX and Certbot if missing
- **Backup existing config:** Saves current NGINX config before changes
- **Certificate generation:** Obtains SSL certificate from Let's Encrypt
- **HTTPS configuration:** Automatically configures reverse proxy with SSL
- **Auto-renewal setup:** Enables automatic certificate renewal
- **Verification:** Tests HTTPS access after setup

#### Usage:
```bash
export EC2_HOST="1.2.3.4"
export EC2_USERNAME="ec2-user"
export EC2_SSH_KEY="/path/to/key.pem"
export DOMAIN="intervix.duckdns.org"
export EMAIL="your-email@example.com"

./setup-ssl.sh
```

---

### 7. `DEPLOYMENT_TROUBLESHOOTING.md` ✨
**Status:** CREATED (NEW)

**Purpose:** Comprehensive deployment guide and troubleshooting reference

#### Sections:

- **Architecture Overview:** Diagrams showing traffic flow
- **Port Configuration:** Table of all port mappings and their purposes
- **Deployment Process:** Step-by-step deployment instructions
- **SSL/TLS Setup:** Manual and automated SSL setup
- **Troubleshooting:** Solutions for common issues
- **Common Issues:** FAQ with fixes
- **Monitoring:** Health check commands
- **Command Reference:** Quick reference for common commands

---

## Architecture Flow Diagram

### BEFORE (BROKEN)
```
Internet (Port 80)
    ↓
NGINX Host (Port 80) ← CONFLICT!
    ↓
Frontend Container (80:80) ← Port 80 already taken
    ↗️  ERROR: Address already in use
```

### AFTER (FIXED)
```
Internet (Port 80/443)
    ↓
NGINX Host (Port 80/443) ← Host NGINX
    ↓ (proxy)
Frontend Container (3000:80) ← Host port 3000
    ↓
Backend Container (5000:5000) ← Host port 5000
    ↓
MongoDB Container (27017) ← Internal only
```

---

## Port Mapping Summary

### Production Deployment

| Layer | Service | Container Port | Host Port | External Access |
|-------|---------|---|---|---|
| **Public** | NGINX Reverse Proxy | N/A | 80/443 | ✅ Internet |
| **Frontend** | React SPA (nginx) | 80 | 3000 | Via NGINX proxy |
| **Backend** | API (Node.js) | 5000 | 5000 | Via NGINX proxy |
| **Database** | MongoDB | 27017 | 27017 | Internal only |

### Key Rules

✅ **DO:**
- Run Frontend on `3000:80` (container port 80, host port 3000)
- Run Backend on `5000:5000` (container port matches host)
- Run NGINX on host port 80/443
- Use NGINX to proxy to localhost:3000 and localhost:5000
- Use Docker bridge network for inter-container communication

❌ **DON'T:**
- Run Frontend on `80:80` (conflicts with host NGINX)
- Run NGINX in Docker on port 80 (conflicts with host NGINX)
- Expose MongoDB to public network
- Put NGINX in front of Docker containers on same port as containers

---

## Verification Checklist

After deployment, verify:

- [ ] Frontend container running: `docker compose ps | grep frontend`
- [ ] Backend container running: `docker compose ps | grep backend`
- [ ] Port 3000 accessible: `curl http://localhost:3000`
- [ ] Port 5000 accessible: `curl http://localhost:5000/health`
- [ ] NGINX proxy working: `curl http://localhost:80`
- [ ] Socket.io working: Check browser console, no connection errors
- [ ] API calls working: Test an API endpoint in frontend
- [ ] WebSocket connecting: Check live interview features
- [ ] SSL certificate (if setup): `curl https://intervix.duckdns.org`
- [ ] Auto-renewal scheduled: `sudo systemctl status certbot.timer`

---

## Common Deployment Mistakes to Avoid

### ❌ Mistake 1: Frontend on 80:80
```yaml
ports:
  - "80:80"  # DON'T DO THIS!
```
**Why it fails:** Host NGINX also needs port 80
**Fix:** Use `3000:80` instead

### ❌ Mistake 2: NGINX in Docker on port 80
```yaml
nginx:
  ports:
    - "80:80"  # DON'T DO THIS!
```
**Why it fails:** Can't run two services on same port
**Fix:** Use host NGINX, Docker NGINX must use different port or be omitted

### ❌ Mistake 3: Hardcoding localhost in frontend NGINX
```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;  # WRONG in Docker!
}
```
**Why it fails:** localhost in container refers to container itself
**Fix:** Use `backend:5000` (Docker DNS name)

### ❌ Mistake 4: Frontend built with wrong API URL
```bash
VITE_API_URL="http://localhost:5000/api"  # WRONG!
```
**Why it fails:** Browser tries to connect to localhost:5000 directly
**Fix:** Use relative path `/api` or full domain URL

### ❌ Mistake 5: No network for containers
```yaml
services:
  frontend: ...
  backend: ...
  # No networks defined
```
**Why it fails:** Containers can't communicate by DNS names
**Fix:** Add networks section and assign services to network

---

## Performance & Security Notes

### Performance Optimizations Applied
- ✅ Connection pooling (keepalive in upstreams)
- ✅ Buffering disabled for WebSocket and real-time features
- ✅ HTTP/1.1 keep-alive connections
- ✅ Gzip compression (in NGINX)
- ✅ Client max body size for uploads (25m)

### Security Headers Added
- ✅ HSTS (Strict-Transport-Security)
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy
- ✅ Content-Security-Policy
- ✅ Permissions-Policy (camera, microphone)
- ✅ Cross-Origin policies

### SSL/TLS Best Practices
- ✅ TLS 1.2 and 1.3 only
- ✅ Strong cipher selection
- ✅ Session caching
- ✅ OCSP stapling
- ✅ Certificate auto-renewal with Certbot

---

## Testing the Setup

### Local Testing (Before Deployment)

```bash
# Verify docker-compose syntax
docker compose config

# Build images
docker compose build

# Start services
docker compose up -d

# Check health
curl http://localhost:3000     # Frontend
curl http://localhost:5000/health  # Backend

# View logs
docker compose logs -f
```

### Post-Deployment Testing (On EC2)

```bash
# SSH into EC2
ssh -i key.pem ec2-user@your-ec2-ip

# Check containers
docker compose ps

# Test endpoints
curl http://localhost:3000
curl http://localhost:5000/health
curl http://localhost:5000/health/routes

# Test NGINX reverse proxy
curl http://localhost:80  # Should return frontend

# Test SSL (if configured)
curl https://intervix.duckdns.org/
```

---

## Deployment Timeline

1. **Local Development** → Commit to GitHub
2. **GitHub Actions Triggered** → Build Docker images
3. **Push to Docker Hub** → Version control
4. **SSH to EC2** → Deploy containers
5. **Health Checks** → Verify deployment
6. **Live on Internet** → After DNS setup

---

## Rollback Procedure

If deployment fails:

```bash
# SSH to EC2
ssh -i key.pem ec2-user@your-ec2-ip
cd ~/Intervix

# View available versions
docker images shreyanshp0/intervix-backend

# Stop current deployment
docker compose down

# Edit docker-compose.yml to use older version
docker compose pull
docker compose up -d

# Verify
docker compose logs -f
curl http://localhost:5000/health
```

---

## Next Steps

1. ✅ Review all changes in this document
2. ✅ Test locally: `docker compose up -d`
3. ✅ Deploy to EC2: `./deploy-production.sh`
4. ✅ Setup SSL: `./setup-ssl.sh`
5. ✅ Configure DNS to point to EC2
6. ✅ Monitor: `docker compose logs -f`
7. ✅ Setup monitoring/alerts for production

---

## Support

For issues:
1. Check `DEPLOYMENT_TROUBLESHOOTING.md`
2. View Docker logs: `docker compose logs`
3. Check NGINX: `sudo tail -f /var/log/nginx/error.log`
4. Test endpoints: `curl http://localhost:port`
