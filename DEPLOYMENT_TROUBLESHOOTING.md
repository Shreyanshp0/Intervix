# INTERVIX - Complete Deployment & Troubleshooting Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Port Configuration](#port-configuration)
3. [Deployment Process](#deployment-process)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Troubleshooting](#troubleshooting)
6. [Common Issues](#common-issues)
7. [Monitoring & Health Checks](#monitoring--health-checks)

---

## Architecture Overview

### Production Architecture

```
Internet Traffic (Port 80/443)
            ↓
    ┌───────────────┐
    │  NGINX (Host) │  ← Reverse Proxy, SSL Termination
    │  Port 80/443  │
    └───────┬───────┘
            ↓
    ┌─────────────────────────────┐
    │     Docker Network: bridge  │
    │  ┌──────────────────────┐   │
    │  │  Frontend Container  │   │
    │  │  nginx:alpine        │   │
    │  │  Port 80 (internal)  │   │  ← Host port 3000
    │  │  ┌────────────────┐  │   │
    │  │  │ React Build    │  │   │
    │  │  │ /usr/share/... │  │   │
    │  │  └────────────────┘  │   │
    │  └──────────────────────┘   │
    │         ↓ /api/ calls        │
    │  ┌──────────────────────┐   │
    │  │ Backend Container    │   │
    │  │ Node.js + Express    │   │
    │  │ Port 5000 (internal) │   │  ← Host port 5000
    │  │ ┌────────────────┐   │   │
    │  │ │ API Routes     │   │   │
    │  │ │ WebSockets     │   │   │
    │  │ └────────────────┘   │   │
    │  └──────────────────────┘   │
    │         ↓ mongodb://         │
    │  ┌──────────────────────┐   │
    │  │ MongoDB Container    │   │
    │  │ Port 27017 (internal)│   │  ← Host port 27017
    │  └──────────────────────┘   │
    └─────────────────────────────┘
```

### Key Points
- **Frontend**: Nginx serving React SPA (port 80 in container → 3000 on host)
- **Backend**: Node.js Express API (port 5000 in container → 5000 on host)
- **Reverse Proxy**: Host NGINX intercepts traffic on 80/443, routes to containers
- **SSL/TLS**: Handled by host NGINX with Let's Encrypt certificates
- **Internal Communication**: Containers communicate via Docker network bridge

---

## Port Configuration

### Container Port Mappings

| Service | Container Port | Host Port | Purpose |
|---------|---|---|---|
| Frontend NGINX | 80 | 3000 | React SPA serving static files + proxy |
| Backend API | 5000 | 5000 | Express API endpoints |
| MongoDB | 27017 | 27017 | Database access (host only) |
| COTURN | 3478 TCP/UDP | 3478 | WebRTC TURN server |
| COTURN | 5349 TCP | 5349 | TURN TLS |
| COTURN | 49160-49200 | 49160-49200 | TURN range |

### Host Port Bindings

| Port | Service | Status | Usage |
|------|---------|--------|-------|
| 80 | NGINX (Host) | AVAILABLE | HTTP reverse proxy |
| 443 | NGINX (Host) | AVAILABLE | HTTPS reverse proxy |
| 3000 | Frontend Container | BOUND | React SPA (accessed via NGINX) |
| 5000 | Backend Container | BOUND | API (accessed via NGINX) |
| 27017 | MongoDB | BOUND | Database (internal only) |

### Why This Configuration?

1. **Frontend on 3000:80** (NOT 80:80)
   - ✅ Container nginx listens on port 80 internally
   - ✅ Mapped to host port 3000 (avoids conflict with host NGINX)
   - ✅ Host NGINX proxies to localhost:3000
   - ❌ Having 80:80 would conflict with host NGINX

2. **Backend on 5000:5000**
   - ✅ Internal port 5000 matches host port 5000
   - ✅ No conflict with HTTP ports
   - ✅ Health checks on localhost:5000 work

3. **Host NGINX on 80/443**
   - ✅ Accepts public traffic on standard HTTP/HTTPS ports
   - ✅ Proxies to backend services on localhost:3000 and localhost:5000
   - ✅ Handles SSL/TLS termination
   - ✅ Single point of entry for all traffic

---

## Deployment Process

### Quick Deployment (GitHub Actions)

1. **Push to main branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions automatically:**
   - Builds backend Docker image
   - Builds frontend Docker image
   - Pushes to Docker Hub
   - SSHs into EC2 and runs deployment

3. **Deployment on EC2:**
   - Stops old containers
   - Pulls fresh images
   - Starts new containers
   - Runs health checks

### Manual Deployment to EC2

#### Prerequisites
```bash
# On your local machine
export EC2_HOST="your-ec2-ip-or-domain"
export EC2_USERNAME="ec2-user"  # or ubuntu, depending on AMI
export EC2_SSH_KEY="/path/to/key.pem"
```

#### Quick Deploy
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

#### Deploy with Options
```bash
# Skip Docker cleanup (faster)
./deploy-production.sh --no-cleanup

# Verbose output
./deploy-production.sh --verbose

# Dry run (see what would be done)
./deploy-production.sh --dry-run
```

#### Manual Docker Commands

SSH into EC2:
```bash
ssh -i /path/to/key.pem ec2-user@your-ec2-ip
cd ~/Intervix

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Check specific service
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Stop and remove all (clean slate)
docker compose down -v  # -v removes volumes too!
```

---

## SSL/TLS Setup

### Quick SSL Setup

```bash
# Set environment variables
export EC2_HOST="your-ec2-ip"
export EC2_USERNAME="ec2-user"
export EC2_SSH_KEY="/path/to/key.pem"
export DOMAIN="intervix.duckdns.org"
export EMAIL="your-email@example.com"

# Run setup script
chmod +x setup-ssl.sh
./setup-ssl.sh
```

### Manual SSL Setup

1. **SSH into EC2:**
   ```bash
   ssh -i /path/to/key.pem ec2-user@your-ec2-ip
   ```

2. **Install NGINX and Certbot:**
   ```bash
   sudo apt-get update
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```

3. **Copy NGINX config:**
   ```bash
   sudo cp ~/Intervix/nginx.host.conf /etc/nginx/sites-available/intervix
   sudo ln -s /etc/nginx/sites-available/intervix /etc/nginx/sites-enabled/intervix
   sudo rm /etc/nginx/sites-enabled/default
   ```

4. **Update domain in config:**
   ```bash
   sudo grep -n 'intervix.duckdns.org' /etc/nginx/sites-available/intervix
   ```

5. **Test NGINX:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx \
     -d intervix.duckdns.org \
     -d \
     --email your-email@example.com \
     --agree-tos
   ```

7. **Verify setup:**
   ```bash
   curl https://intervix.duckdns.org/
   sudo certbot certificates
   ```

8. **Enable auto-renewal:**
   ```bash
   sudo systemctl enable certbot.timer
   sudo systemctl start certbot.timer
   ```

---

## Troubleshooting

### 1. Port Conflict: "Address already in use"

**Problem:**
```
bind() to 0.0.0.0:80 failed (98: Address already in use)
```

**Cause:** Something is already using port 80

**Fix:**
```bash
# Find what's using port 80
sudo lsof -i :80
sudo netstat -tulpn | grep 80

# Kill the process
sudo kill -9 <PID>

# Or stop the service
sudo systemctl stop nginx
docker compose down
```

### 2. Frontend Container Not Responding

**Check logs:**
```bash
docker compose logs frontend
```

**Verify container is running:**
```bash
docker compose ps frontend
```

**Test direct access:**
```bash
curl http://localhost:3000/
```

**Common causes:**
- React build failed (check Dockerfile)
- NGINX misconfiguration in container
- Port not properly exposed

### 3. Backend API Not Reachable

**Check logs:**
```bash
docker compose logs backend
```

**Verify health endpoint:**
```bash
curl http://localhost:5000/health
```

**Check MongoDB connection:**
```bash
docker compose logs backend | grep -i mongodb
```

**Common causes:**
- MongoDB not running
- Environment variables not set
- Backend not started

### 4. NGINX Reverse Proxy Errors

**Check NGINX logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**Test NGINX config:**
```bash
sudo nginx -t
```

**Verify upstream servers:**
```bash
curl http://localhost:3000/  # Frontend
curl http://localhost:5000/health  # Backend
```

### 5. SSL Certificate Issues

**View certificate info:**
```bash
sudo certbot certificates
```

**Renew manually:**
```bash
sudo certbot renew --force-renewal
```

**Check auto-renewal logs:**
```bash
sudo systemctl status certbot.timer
sudo journalctl -u certbot
```

**Common causes:**
- DNS not pointing to server
- Port 80 not accessible (Let's Encrypt validation)
- Certificate expired

---

## Common Issues

### Issue: "Connection Refused" on localhost:3000

**Symptoms:**
- `curl http://localhost:3000` returns "Connection refused"

**Solutions:**
1. Check if frontend container is running:
   ```bash
   docker compose ps frontend
   ```
2. Check container logs:
   ```bash
   docker compose logs frontend
   ```
3. Verify port mapping:
   ```bash
   docker port intervix_frontend
   ```

### Issue: API Calls Returning 502 Bad Gateway

**Symptoms:**
- Frontend loads but API calls fail with 502

**Causes:**
- Backend container not running
- Backend health check failing
- NGINX misconfigured

**Fix:**
```bash
# Check backend
curl http://localhost:5000/health

# Check docker
docker compose logs backend

# Restart backend
docker compose restart backend
```

### Issue: SSL Certificate Not Renewing

**Check renewal status:**
```bash
sudo certbot renew --dry-run
```

**View renewal logs:**
```bash
sudo journalctl -u certbot
```

**Force renewal:**
```bash
sudo certbot renew --force-renewal
```

### Issue: WebSocket Connection Failed

**Symptoms:**
- Live interview features not working
- Socket.io connection errors in console

**Check:**
```bash
# Verify Socket.io endpoint
curl -i http://localhost:5000/socket.io/

# Check NGINX socket.io config
sudo grep -A 10 "socket.io" /etc/nginx/sites-available/intervix
```

**Common causes:**
- WebSocket not proxied correctly
- Connection timeout too short
- Firewall blocking WebSocket ports

---

## Monitoring & Health Checks

### Docker Container Health

```bash
# View container status
docker compose ps

# View specific container health
docker inspect intervix_backend | grep -A 5 "Health"

# Check container logs
docker compose logs <service>
```

### API Health Endpoints

```bash
# Backend health
curl http://localhost:5000/health

# Backend routes
curl http://localhost:5000/health/routes

# Frontend (returns HTML, check status code)
curl -I http://localhost:3000/
```

### NGINX Health Check

```bash
# Verify NGINX is running
sudo systemctl status nginx

# Check NGINX config
sudo nginx -t

# View access logs
sudo tail -f /var/log/nginx/intervix_access.log

# View error logs
sudo tail -f /var/log/nginx/intervix_error.log
```

### System Resource Monitoring

```bash
# View Docker stats
docker stats

# View system resources
top
free -h
df -h

# View network connections
sudo netstat -tulpn
sudo ss -tulpn
```

---

## Quick Command Reference

### Deployment
```bash
./deploy-production.sh                    # Full deployment
./deploy-production.sh --no-cleanup       # Fast deployment
./deploy-production.sh --dry-run          # Preview deployment
```

### SSL Setup
```bash
./setup-ssl.sh                            # Interactive SSL setup
```

### Docker Commands
```bash
docker compose up -d                      # Start all services
docker compose down                       # Stop all services
docker compose logs -f                    # Follow all logs
docker compose logs -f backend            # Follow backend logs
docker compose restart backend            # Restart backend
docker compose ps                         # List containers
docker compose exec backend bash          # SSH into container
```

### NGINX Commands
```bash
sudo nginx -t                             # Test config
sudo systemctl restart nginx              # Restart NGINX
sudo systemctl status nginx               # Check status
sudo tail -f /var/log/nginx/error.log    # View errors
```

### Health Checks
```bash
curl http://localhost:5000/health        # Backend health
curl http://localhost:3000/              # Frontend check
curl https://intervix.duckdns.org/            # Full URL check
```

---

## Contact & Support

For issues not covered here, check:
1. Docker logs: `docker compose logs`
2. NGINX logs: `sudo tail -f /var/log/nginx/error.log`
3. GitHub Actions logs: GitHub repo → Actions
4. Backend console output: `docker compose logs backend`
