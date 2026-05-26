# INTERVIX - Quick Start Deployment Checklist

## 🚀 Pre-Deployment Checklist

### Local Environment Setup
- [ ] Clone/pull latest code
- [ ] All configuration files updated (docker-compose.yml, nginx configs)
- [ ] Git committed and ready to push

### EC2 Instance Prerequisites
- [ ] EC2 instance running (Ubuntu 20.04+)
- [ ] Docker and Docker Compose installed
- [ ] SSH key accessible on local machine
- [ ] Security group allows ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Environment Variables (Set Before Deployment)
```bash
export EC2_HOST="your.ec2.ip.or.domain"      # e.g., 54.123.45.67
export EC2_USERNAME="ec2-user"               # or "ubuntu" if Ubuntu AMI
export EC2_SSH_KEY="/path/to/key.pem"        # e.g., ~/.ssh/intervix-key.pem
export DOMAIN="intervix.duckdns.org"              # e.g., intervix.com
export EMAIL="your-email@example.com"        # For Let's Encrypt
```

---

## 📋 Step 1: Local Setup (5 minutes)

### 1.1 Make scripts executable
```bash
chmod +x deploy-production.sh setup-ssl.sh
```

### 1.2 Verify docker-compose.yml
```bash
# Check syntax
docker compose config
```

### 1.3 Verify NGINX configs
```bash
# Check nginx.host.conf syntax (will be validated on server)
cat nginx.host.conf | head -20
```

✅ **Mark Complete:** Local files ready

---

## 📋 Step 2: EC2 Initial Setup (One-time, 5 minutes)

### 2.1 SSH into EC2
```bash
ssh -i $EC2_SSH_KEY $EC2_USERNAME@$EC2_HOST
```

### 2.2 Install Docker & Docker Compose (if not already done)
```bash
# Update system
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2.3 Clone Intervix repository
```bash
cd ~
git clone https://github.com/Shreyanshp0/Intervix.git
cd Intervix
```

### 2.4 Create .env files
```bash
# Backend .env
cat > Backend/.env << EOF
MONGODB_URI=mongodb://mongodb:27017/intervix
JWT_SECRET=your-jwt-secret-key-here
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
HF_TOKEN=your-hf-token
EOF

# Frontend .env
cat > Frontend/.env << EOF
VITE_API_URL=/api
EOF
```

### 2.5 Verify directory structure
```bash
ls -la ~/Intervix/
docker compose config
```

✅ **Mark Complete:** EC2 environment ready

---

## 📋 Step 3: Deploy Application (10 minutes)

### 3.1 Run deployment from your local machine
```bash
# From your local machine (where you cloned the repo)
export EC2_HOST="your.ec2.ip"
export EC2_USERNAME="ec2-user"
export EC2_SSH_KEY="/path/to/key.pem"

./deploy-production.sh
```

**What this script does:**
- Stops old containers
- Cleans up Docker resources
- Pulls latest images
- Starts services
- Runs health checks

### 3.2 Verify deployment
```bash
# From your local machine, SSH and verify
ssh -i $EC2_SSH_KEY $EC2_USERNAME@$EC2_HOST "cd ~/Intervix && docker compose ps"

# Should show: mongodb, backend, frontend, coturn (all running)
```

### 3.3 Test endpoints
```bash
# From your local machine
curl http://$EC2_HOST:3000/                    # Frontend
curl http://$EC2_HOST:5000/health              # Backend
curl http://$EC2_HOST:5000/health/routes       # Routes
```

✅ **Mark Complete:** Application deployed successfully

---

## 📋 Step 4: Configure DNS (5 minutes)

### 4.1 Update DNS records
Point your domain to the EC2 instance:

**A Record:**
```
Name: @
Type: A
Value: your.ec2.ip.address
TTL: 300
```

**CNAME (optional, for www):**
```
Name: www
Type: CNAME
Value: intervix.duckdns.org
TTL: 300
```

### 4.2 Verify DNS propagation
```bash
nslookup intervix.duckdns.org
dig intervix.duckdns.org

# Should return your EC2 IP address
```

⏳ **Wait:** DNS propagation (usually 5-30 minutes)

✅ **Mark Complete:** DNS configured

---

## 📋 Step 5: Configure SSL/TLS (15 minutes)

### 5.1 Run SSL setup script (from your local machine)
```bash
export DOMAIN="intervix.duckdns.org"
export EMAIL="your-email@example.com"

./setup-ssl.sh
```

**What this script does:**
- Installs NGINX and Certbot on EC2
- Copies NGINX configuration
- Obtains SSL certificate from Let's Encrypt
- Configures auto-renewal
- Restarts NGINX

### 5.2 Verify SSL certificate
```bash
# SSH into EC2
ssh -i $EC2_SSH_KEY $EC2_USERNAME@$EC2_HOST

# Check certificate
sudo certbot certificates

# Test HTTPS
curl https://intervix.duckdns.org/
```

### 5.3 Verify auto-renewal
```bash
# On EC2
sudo systemctl status certbot.timer

# View renewal schedule
sudo certbot renew --dry-run
```

✅ **Mark Complete:** SSL/TLS configured

---

## 📋 Step 6: Verify Full Setup (10 minutes)

### 6.1 Test from internet (not localhost)
```bash
# From your local machine (on different network if possible)

# Frontend
curl https://intervix.duckdns.org/
curl https://intervix.duckdns.org/

# API Health
curl https://intervix.duckdns.org/api/health
curl https://intervix.duckdns.org/api/health/routes

# WebSocket
curl -I https://intervix.duckdns.org/socket.io/?transport=polling
```

### 6.2 Test in browser
- Open https://intervix.duckdns.org in browser
- Developer console (F12) should show:
  - ✅ No HTTPS errors
  - ✅ No mixed content warnings
  - ✅ Socket.io connected (if live features active)
  - ✅ API calls successful

### 6.3 Test live features
- [ ] Live interview creation works
- [ ] Video/audio connects
- [ ] Chat messages send/receive
- [ ] Screen sharing works (if implemented)
- [ ] Socket.io connection stable

✅ **Mark Complete:** All systems verified

---

## 📋 Step 7: Monitor & Maintain

### Daily Checks
```bash
# SSH into EC2
ssh -i $EC2_SSH_KEY $EC2_USERNAME@$EC2_HOST

# Check container health
docker compose ps

# View recent logs
docker compose logs --tail=100

# Check disk space
df -h

# Check memory
free -h
```

### Weekly Tasks
- [ ] Review error logs: `docker compose logs backend | grep ERROR`
- [ ] Check certificate expiration: `sudo certbot certificates`
- [ ] Test backup/restore procedure
- [ ] Review security group rules

### Monthly Tasks
- [ ] Update Docker images
- [ ] Security patches: `sudo apt-get update && sudo apt-get upgrade`
- [ ] Performance review: `docker stats`
- [ ] Capacity planning

### Certificate Renewal (Automatic)
- ✅ Certbot auto-renewal configured
- ✅ Renewal runs 2x daily
- ✅ Monitored by systemd timer

---

## 🆘 Troubleshooting Quick Links

If you encounter issues, refer to:

1. **Port conflicts:** See "Port Conflict" in [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
2. **Containers not running:** See "Frontend/Backend Not Responding" in troubleshooting guide
3. **API errors:** Check backend logs: `docker compose logs backend`
4. **Frontend errors:** Check browser console (F12) and frontend logs
5. **NGINX errors:** `sudo tail -f /var/log/nginx/error.log`
6. **SSL issues:** `sudo certbot certificates` and check auto-renewal

---

## ⚡ Quick Reference Commands

### Deployment
```bash
./deploy-production.sh                          # Full deploy
./deploy-production.sh --no-cleanup             # Fast deploy
./deploy-production.sh --dry-run                # Preview
```

### SSL Setup
```bash
./setup-ssl.sh                                  # Automatic SSL setup
```

### Container Management (SSH into EC2 first)
```bash
docker compose up -d                           # Start all
docker compose down                            # Stop all
docker compose logs -f                         # View logs
docker compose restart backend                 # Restart service
docker compose ps                              # List containers
```

### Health Checks
```bash
curl https://intervix.duckdns.org/                 # Frontend
curl https://intervix.duckdns.org/api/health       # Backend
sudo certbot certificates                     # SSL status
```

### Logs
```bash
docker compose logs backend                   # Backend logs
docker compose logs frontend                  # Frontend logs
sudo tail -f /var/log/nginx/error.log         # NGINX errors
sudo journalctl -u certbot                    # SSL renewal logs
```

---

## 📊 Port Summary (Quick Reference)

| Port | Service | Status |
|------|---------|--------|
| 80 | NGINX (Host) | ✅ HTTP redirect to HTTPS |
| 443 | NGINX (Host) | ✅ HTTPS reverse proxy |
| 3000 | Frontend Container | ✅ Mapped to container:80 |
| 5000 | Backend Container | ✅ API server |
| 27017 | MongoDB | ✅ Internal only |
| 3478 | COTURN | ✅ WebRTC/TURN |

---

## 🎯 Success Criteria

Your deployment is complete when:

- ✅ `docker compose ps` shows all containers running
- ✅ `curl https://intervix.duckdns.org` returns frontend HTML
- ✅ `curl https://intervix.duckdns.org/api/health` returns `{"status":"ok"}`
- ✅ Browser opens https://intervix.duckdns.org without SSL errors
- ✅ Developer console shows Socket.io connected
- ✅ API calls work (no 502 Bad Gateway)
- ✅ Live interview features work (if applicable)
- ✅ No errors in: `docker compose logs` and `sudo tail /var/log/nginx/error.log`

---

## 📞 Emergency Rollback

If something goes wrong:

```bash
# SSH into EC2
ssh -i $EC2_SSH_KEY $EC2_USERNAME@$EC2_HOST
cd ~/Intervix

# Stop everything
docker compose down -v

# Revert to previous version
git reset --hard HEAD~1

# Redeploy
docker compose pull
docker compose up -d

# Verify
docker compose logs -f backend
```

---

## 📚 Full Documentation

- **Changes Made:** See [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)
- **Troubleshooting:** See [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
- **Configuration Files:** See docker-compose.yml, nginx.host.conf, nginx.production.conf

---

## ✨ Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Setup | 5 min | ⬜ Not started |
| EC2 Init | 5 min | ⬜ Not started |
| Deploy | 10 min | ⬜ Not started |
| DNS Config | 5 min | ⬜ Not started |
| SSL Setup | 15 min | ⬜ Not started |
| Verification | 10 min | ⬜ Not started |
| **Total** | **~50 min** | ⬜ Pending |

---

**Last Updated:** 2026-05-26
**Status:** Ready for deployment ✅
