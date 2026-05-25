# API Route Unification - Deployment Checklist & Implementation Guide

## Pre-Deployment Checklist

### Code Quality (15 min)
- [ ] Run tests: `npm test` (Backend)
- [ ] Verify no `/api/v1` references remain: `grep -r "/api/v1" .`
- [ ] Check API constants are imported correctly
- [ ] Lint frontend and backend code
- [ ] No build errors in either frontend or backend

### Environment Configuration (10 min)
- [ ] Backend `.env` configured correctly
- [ ] Frontend `.env` has correct `VITE_API_URL`
- [ ] Docker environment variables set correctly
- [ ] Secrets are not hardcoded
- [ ] Database connection string is valid

### Docker & Deployment (20 min)
- [ ] Docker is installed and running
- [ ] `docker-compose` is available
- [ ] Enough disk space for images and containers
- [ ] No conflicting containers running on ports 3000, 5000, 5173
- [ ] Git repository is clean (no uncommitted changes)

### Backend Readiness (10 min)
- [ ] All routes mounted under `/api` prefix
- [ ] Database migrations complete
- [ ] API schema definitions in place
- [ ] Authentication middleware configured
- [ ] Rate limiting configured

### Frontend Readiness (10 min)
- [ ] All API imports use `API_ROUTES` constants
- [ ] No hardcoded API URLs (except defaults)
- [ ] Axios interceptors working
- [ ] Socket.io configuration correct
- [ ] Error handling implemented

---

## Deployment Steps

### Phase 1: Pre-Deployment Validation (15 min)

**1.1 Backup Current State**
```bash
# Create backup of current configuration
mkdir -p ./deployment-backups/$(date +%Y%m%d-%H%M%S)
cp docker-compose.yml ./deployment-backups/$(date +%Y%m%d-%H%M%S)/
cp Frontend/.env ./deployment-backups/$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
cp Backend/.env ./deployment-backups/$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
```

**1.2 Run Tests**
```bash
cd Backend
npm test
cd ..
# Expected output: All tests passing, no /api/v1 references found
```

**1.3 Check for Deprecated Routes**
```bash
grep -r "/api/v1" . --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
# Expected output: 0
```

**1.4 Verify Configuration**
```bash
# Check backend config
cat Backend/.env | grep -E "(MONGODB|PORT|JWT)" | head -5

# Check frontend config
cat Frontend/.env
```

### Phase 2: Clean Deployment (30 min)

**2.1 Stop Current Services**
```bash
docker-compose down
# Remove orphaned containers
docker-compose down --remove-orphans
```

**2.2 Clean Docker System**
```bash
# Remove dangling containers and images
docker container prune -f
docker image prune -f

# Full cleanup (optional)
docker system prune -af
docker builder prune -af
```

**2.3 Clean Build Artifacts**
```bash
# Frontend
rm -rf Frontend/dist
rm -rf Frontend/node_modules/.vite  # Vite cache

# Backend  
# Don't delete node_modules - will be installed fresh in Docker
```

**2.4 Rebuild and Deploy**
```bash
# Option A: Using deployment script
./deploy-clean.sh --validate

# Option B: Manual deployment
docker-compose up -d --build

# Wait for services to start
sleep 30

# Check status
docker-compose ps
```

### Phase 3: Post-Deployment Validation (20 min)

**3.1 Service Health Checks**
```bash
# Check if services are running
docker-compose ps
# Expected: All services showing "Up"

# Check backend health
curl -s http://localhost:5000/health | jq .
# Expected: { "status": "healthy", ... }

# Check frontend health
curl -s http://localhost:3000 | head -10
# Expected: Should return HTML
```

**3.2 Route Registration Verification**
```bash
# Get all registered routes
curl -s http://localhost:5000/api/health/routes | jq .summary
# Expected: ~70 routes with /api prefix

# Verify specific routes
curl -s http://localhost:5000/api/health/routes | jq '.routes[] | select(.fullPath | contains("candidate"))' | head -5
# Expected: Should see candidate routes with /api prefix
```

**3.3 Route Validation Report**
```bash
# Check route validation
curl -s http://localhost:5000/api/health/routes/validation | jq .
# Expected: status = "VALID", no conflicts

# Check for any issues
curl -s http://localhost:5000/api/health/routes/validation | jq .validation
```

**3.4 Deployment Consistency Check**
```bash
# Verify frontend/backend alignment
curl -s http://localhost:5000/api/health/deployment | jq .consistency
# Expected: { versionMatch: true, hashMatch: true, aligned: true }

# Check build versions
curl -s http://localhost:5000/api/health/deployment | jq .buildVersion
```

**3.5 Request Diagnostics**
```bash
# Check for any issues so far
curl -s http://localhost:5000/api/health/diagnostics | jq .summary
# Expected: Low error counts, no critical issues
```

**3.6 Comprehensive Health Check**
```bash
# Final overall health check
curl -s http://localhost:5000/api/health/full | jq .
# Expected: overallStatus = "HEALTHY", all checks passing
```

### Phase 4: Frontend Testing (20 min)

**4.1 Access Frontend**
```
Open browser: http://localhost:3000
Expected: Login page loads without errors
```

**4.2 Test Authentication Flow**
```
1. Go to /login (should be at http://localhost:3000)
2. Attempt login with test credentials
3. Check browser Network tab:
   - POST /api/auth/login should succeed
   - Authorization header should be set
   - Redirect to dashboard should work
```

**4.3 Test Candidate Dashboard**
```
1. Log in as candidate
2. Navigate to dashboard
3. Network requests should be:
   - GET /api/candidate/dashboard
   - GET /api/candidate/me
   - GET /api/candidate/jobs/feed
4. No 404 errors should appear
5. Data should load within 3 seconds
```

**4.4 Test Job Browsing**
```
1. Click on "Jobs" or navigate to jobs page
2. Network request: GET /api/candidate/jobs/feed
3. Jobs should load and display
4. Click individual job should call: GET /api/candidate/jobs/:jobId
```

**4.5 Test Application Submission**
```
1. Find a job and click "Apply"
2. Fill out application form
3. Submit application
4. Network request: POST /api/candidate/jobs/:jobId/apply
5. Success message should appear
6. Application should appear in "Applications" page
```

**4.6 Test Recruiter Features** (if applicable)
```
1. Log in as recruiter
2. Test job creation: POST /api/recruiter/jobs
3. Test job listing: GET /api/recruiter/jobs
4. Test applicant view: GET /api/recruiter/jobs/:jobId/applicants
5. Test application pipeline: GET /api/recruiter/jobs/:jobId/pipeline
```

### Phase 5: Load & Performance Testing (30 min)

**5.1 Simulate User Load**
```bash
# Using Apache Bench (if installed)
ab -n 100 -c 10 http://localhost:3000/

# Using curl in a loop
for i in {1..50}; do
  curl -s http://localhost:5000/api/candidate/dashboard \
    -H "Authorization: Bearer YOUR_TOKEN" > /dev/null &
done
wait

# Check diagnostics after load
curl -s http://localhost:5000/api/health/diagnostics | jq '.slowEndpointsCount, .summary'
```

**5.2 Monitor Slow Endpoints**
```bash
# Check for slow endpoints
curl -s http://localhost:5000/api/health/diagnostics | jq .topSlowEndpoints
# Expected: Most endpoints <2 seconds, nothing over 5 seconds
```

**5.3 Check Error Patterns**
```bash
# Look for repeated failures
curl -s http://localhost:5000/api/health/diagnostics | jq .topFailingEndpoints
# Expected: Empty or minimal failures
```

### Phase 6: Logging & Monitoring (15 min)

**6.1 Check Backend Logs**
```bash
docker-compose logs backend --tail 50
# Look for:
# - No /api/v1 references
# - No route conflicts
# - Healthy service startup messages
```

**6.2 Check Frontend Logs**
```bash
docker-compose logs frontend --tail 50
# Look for successful build and startup
```

**6.3 Monitor Real-time**
```bash
# Watch all logs
docker-compose logs -f --tail 20
# Ctrl+C to stop
```

**6.4 Database Health**
```bash
# Check MongoDB
curl -s http://localhost:5000/api/health/db | jq .
# Expected: { healthy: true, state: 1 }
```

**6.5 AI Services Health**
```bash
# Check AI integrations (Groq, HuggingFace)
curl -s http://localhost:5000/api/health/ai | jq .
# Expected: { hf: { healthy: true }, groq: { healthy: true } }
```

---

## Rollback Procedures

### Quick Rollback (5 min)
If immediate issues occur:

```bash
# Stop current deployment
docker-compose down

# Restore from backup if needed
# (Refer to your backup procedure)

# Start previous version
docker-compose up -d

# Verify health
curl -s http://localhost:5000/api/health/full | jq .overallStatus
```

### Full Rollback (15 min)
If deploying on multiple environments:

```bash
# 1. Revert code changes
git revert <deployment-commit>

# 2. Restore configuration
cp ./deployment-backups/latest/* . 2>/dev/null || true

# 3. Rebuild and redeploy
./deploy-clean.sh --validate

# 4. Verify all health checks
curl -s http://localhost:5000/api/health/full | jq .
```

---

## Post-Deployment Monitoring (Week 1)

### Daily Checks
```bash
# Run every morning
curl -s http://localhost:5000/api/health/full | jq .

# Check error logs
docker-compose logs backend --since 24h | grep -i error | head -10
```

### Weekly Checks
```bash
# Run once per week
curl -s http://localhost:5000/api/health/diagnostics | jq .recommendations

# Check slow endpoints
curl -s http://localhost:5000/api/health/diagnostics | jq .topSlowEndpoints | head -10
```

### Monitor for:
- Increased 404 errors
- Slow endpoint trends
- Circuit breaker activations
- Memory usage growth
- Database query performance

---

## Success Criteria

✅ **Deployment is successful if:**

1. All services running without errors
2. `GET /api/health/routes` returns 70+ routes with `/api` prefix
3. `GET /api/health/routes/validation` shows status "VALID"
4. `GET /api/health/deployment` shows status "HEALTHY" with aligned versions
5. No routes with `/api/v1` prefix
6. Frontend loads without console errors
7. Authentication flow works end-to-end
8. API requests receive responses in <3 seconds (95th percentile)
9. No recurring 404 errors in `/api/health/diagnostics`
10. All health check endpoints return 200 status

---

## Common Deployment Issues & Solutions

### Issue: Containers Won't Start
**Solution:**
```bash
# Check error logs
docker-compose logs backend

# Verify ports are free
lsof -i :5000  # Should be empty
lsof -i :3000  # Should be empty
lsof -i :27017 # Should only show MongoDB

# Check Docker daemon
docker ps

# Restart Docker daemon if needed
systemctl restart docker
```

### Issue: Frontend Can't Connect to Backend
**Solution:**
```bash
# Verify VITE_API_URL in Frontend/.env
cat Frontend/.env | grep VITE_API_URL

# Test backend is accessible
curl -v http://localhost:5000/health

# Check network within Docker
docker-compose exec frontend curl http://backend:5000/health
```

### Issue: Database Connection Fails
**Solution:**
```bash
# Check MongoDB is running
docker-compose logs mongodb

# Verify connection string
cat Backend/.env | grep MONGODB

# Test connection
docker-compose exec backend node -e "const m = require('mongoose'); m.connect(process.env.MONGODB_URI).then(() => console.log('OK'))"
```

### Issue: Stale Cache Causing 404s
**Solution:**
```bash
# Clear Docker cache and rebuild
./deploy-clean.sh --full

# Or manually
docker-compose down
docker system prune -af
docker-compose up -d --build
```

### Issue: Routes Show `/api/v1` in Response
**Solution:**
```bash
# Check what's being returned
curl http://localhost:5000/api/health/routes | grep v1 | head -5

# This shouldn't happen if deployment is correct
# If it does, check:
# 1. Backend code has correct prefix: grep -r "/api/v1" Backend/
# 2. Constants file is correct: cat Backend/src/constants/api-routes.js
# 3. Rebuild without cache: ./deploy-clean.sh --full
```

---

## Performance Benchmarks

After successful deployment, benchmark these endpoints:

```bash
# Login
time curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Target: <500ms

# Get Candidate Dashboard
time curl -s http://localhost:5000/api/candidate/dashboard \
  -H "Authorization: Bearer $TOKEN"
# Target: <1000ms

# Get Jobs Feed
time curl -s http://localhost:5000/api/candidate/jobs/feed \
  -H "Authorization: Bearer $TOKEN"
# Target: <2000ms

# Health check
time curl -s http://localhost:5000/api/health/routes
# Target: <100ms
```

---

## Verification Checklist (Final)

- [ ] All services running: `docker-compose ps` shows "Up"
- [ ] Routes valid: `GET /api/health/routes/validation` = "VALID"
- [ ] No /api/v1: `grep -r "/api/v1" .` = 0 results
- [ ] Frontend loads: `http://localhost:3000` accessible
- [ ] Login works: Can authenticate and get token
- [ ] Dashboard loads: Can view candidate/recruiter dashboard
- [ ] Jobs load: Can view job feed and details
- [ ] Diagnostics clean: No critical errors in `/api/health/diagnostics`
- [ ] Performance good: Endpoints responding in <3 seconds
- [ ] Logs clean: No error messages in `docker-compose logs`

---

## Sign-Off

**Deployment Date:** ______________
**Deployed By:** ______________
**Reviewed By:** ______________
**Status:** ☐ SUCCESS ☐ ISSUES PRESENT ☐ ROLLED BACK

**Notes:**
_________________________________________________________________
_________________________________________________________________

---

**For Support:** Refer to [API_ROUTE_UNIFICATION_REPORT.md](API_ROUTE_UNIFICATION_REPORT.md)
