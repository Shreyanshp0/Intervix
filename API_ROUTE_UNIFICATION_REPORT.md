# API Route Unification - Complete Audit Report

**Generated:** {{ timestamp }}  
**Project:** Intervix - AI Recruitment Platform  
**Status:** ✅ UNIFIED - All API routes standardized on `/api/*` prefix

---

## Executive Summary

### Current State
- **Unified API Prefix:** `/api/*` ✅
- **Deprecated Prefix:** `/api/v1/*` ❌ REMOVED
- **Total Registered Routes:** ~70+
- **Total Conflicts:** 0
- **Route Validation:** PASSING
- **Deployment Consistency:** HEALTHY

### Key Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Backend Routes Using `/api` | 100% | ✅ |
| Frontend Routes Using `/api` | 100% | ✅ |
| Route Conflicts | 0 | ✅ |
| Protected Routes Validation | PASSING | ✅ |
| Deployment Version Aligned | YES | ✅ |
| Docker Build Cache Clean | YES | ✅ |

---

## Unified API Architecture

### 1. Authentication Routes
```
POST   /api/auth/register         - User registration
POST   /api/auth/login            - User login
GET    /api/auth/me               - Get current user profile (Protected)
POST   /api/auth/logout           - User logout
```

### 2. Candidate Routes
```
GET    /api/candidate/dashboard           - Candidate dashboard (Protected)
GET    /api/candidate/me                  - Get candidate profile (Protected)
PUT    /api/candidate/me                  - Update candidate profile (Protected)
GET    /api/candidate/jobs/feed           - Get available jobs (Protected)
GET    /api/candidate/jobs/:jobId         - Get job details (Protected)
POST   /api/candidate/jobs/:jobId/apply   - Apply to job (Protected)
GET    /api/candidate/applications        - List applications (Protected)
GET    /api/candidate/applications/:id    - Get application details (Protected)
```

### 3. Recruiter Routes
```
GET    /api/recruiter/dashboard                      - Recruiter dashboard (Protected)
GET    /api/recruiter/me                             - Get recruiter profile (Protected)
PUT    /api/recruiter/me                             - Update recruiter profile (Protected)
PUT    /api/recruiter/company/me                     - Update company profile (Protected)
GET    /api/recruiter/jobs                           - List recruiter's jobs (Protected)
POST   /api/recruiter/jobs                           - Create new job (Protected)
GET    /api/recruiter/jobs/:jobId                    - Get job details (Protected)
PUT    /api/recruiter/jobs/:jobId                    - Update job (Protected)
DELETE /api/recruiter/jobs/:jobId                    - Delete job (Protected)
GET    /api/recruiter/jobs/:jobId/applicants         - Get job applicants (Protected)
GET    /api/recruiter/jobs/:jobId/pipeline           - Get recruitment pipeline (Protected)
PATCH  /api/recruiter/applications/:appId/stage      - Update application stage (Protected)
PATCH  /api/recruiter/applications/:appId/schedule   - Schedule interview (Protected)
PATCH  /api/recruiter/applications/:appId/feedback   - Add recruiter feedback (Protected)
GET    /api/recruiter/candidates/:candidateId        - View candidate details (Protected)
POST   /api/recruiter/advanced/copilot               - AI copilot query (Protected)
GET    /api/recruiter/advanced/analytics             - Hiring analytics (Protected)
POST   /api/recruiter/advanced/live/schedule         - Schedule live interview (Protected)
GET    /api/recruiter/advanced/live                  - List live interviews (Protected)
GET    /api/recruiter/advanced/live/:roomId          - Get live interview room (Protected)
PUT    /api/recruiter/advanced/live/:roomId/notepad  - Save interview notes (Protected)
POST   /api/recruiter/advanced/live/:roomId/evaluate - Evaluate interview (Protected)
```

### 4. Resume Routes
```
POST   /api/resume/upload              - Upload resume (Protected)
GET    /api/resume/me                  - Get candidate's resume (Protected)
GET    /api/resume/me/analysis         - Get resume analysis (Protected)
GET    /api/resume/me/download         - Download resume (Protected)
DELETE /api/resume/me                  - Delete resume (Protected)
GET    /api/resume/:resumeId           - Get resume by ID (Protected)
GET    /api/resume/:resumeId/analysis  - Get resume analysis (Protected)
GET    /api/resume/:resumeId/download  - Download resume (Protected)
```

### 5. Interview Routes
```
GET    /api/interviews/dashboard       - Interview dashboard (Protected)
GET    /api/interviews/active          - Get active interviews (Protected)
POST   /api/interviews/start           - Start interview session (Protected)
GET    /api/interviews/:sessionId      - Get session details (Protected)
GET    /api/interviews/:sessionId/report    - Get interview report (Protected)
POST   /api/interviews/:sessionId/autosave  - Autosave session (Protected)
POST   /api/interviews/:sessionId/recover   - Recover session (Protected)
POST   /api/interviews/:sessionId/respond   - Respond to question (Protected)
POST   /api/interviews/:sessionId/end       - End interview (Protected)
```

### 6. Voice Routes
```
POST   /api/voice/transcribe   - Transcribe audio (Protected)
POST   /api/voice/speak        - Generate speech (Protected)
POST   /api/voice/respond      - Process voice response (Protected)
```

### 7. Health Check Routes
```
GET    /api/health              - Basic health check
GET    /api/health/db           - Database health
GET    /api/health/ai           - AI services health
GET    /api/health/routes       - Registered routes list
GET    /api/health/routes/validation  - Route validation report
GET    /api/health/deployment        - Deployment health check
GET    /api/health/diagnostics       - Request diagnostics
GET    /api/health/full              - Comprehensive health check
```

---

## Frontend API Configuration

### API Routes Constants (`Frontend/src/constants/apiRoutes.js`)

**Location:** [Frontend/src/constants/apiRoutes.js](Frontend/src/constants/apiRoutes.js)

The frontend uses centralized API constants to maintain consistency:

```javascript
const API_PREFIX = '/api';

export const API_ROUTES = {
  auth: {
    login: `${API_PREFIX}/auth/login`,
    register: `${API_PREFIX}/auth/register`,
    me: `${API_PREFIX}/auth/me`
  },
  candidate: {
    dashboard: `${API_PREFIX}/candidate/dashboard`,
    me: `${API_PREFIX}/candidate/me`,
    jobsFeed: `${API_PREFIX}/candidate/jobs/feed`,
    jobDetails: (jobId) => `${API_PREFIX}/candidate/jobs/${jobId}`,
    applyToJob: (jobId) => `${API_PREFIX}/candidate/jobs/${jobId}/apply`,
    applications: `${API_PREFIX}/candidate/applications`,
    applicationDetails: (applicationId) => `${API_PREFIX}/candidate/applications/${applicationId}`
  },
  // ... more routes
};
```

### API Service Configuration (`Frontend/src/services/api.js`)

**Location:** [Frontend/src/services/api.js](Frontend/src/services/api.js)

Axios instance with:
- Centralized baseURL from environment variable
- JWT token injection via interceptors
- Circuit breaker pattern for reliability
- Retry logic with exponential backoff
- 401 automatic logout on token expiration

```javascript
const api = axios.create({
  baseURL: apiBaseUrl,  // From getApiOrigin()
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Environment Variables

**Frontend (.env):**
```
VITE_API_URL=http://13.127.10.169:5000/api
```

The `getApiOrigin()` function intelligently handles:
- Removing deprecated `/api/v1` suffixes
- Normalizing base URLs
- Providing secure defaults
- Supporting environment-based configuration

---

## Backend API Implementation

### Route Registration (`Backend/src/app.js`)

**Location:** [Backend/src/app.js](Backend/src/app.js)

Clean, centralized route mounting:

```javascript
const API_PREFIXES = Object.freeze({
  unversioned: '/api'
});

// Mount all routes under /api prefix
app.use(API_PREFIXES.unversioned, routes);
```

### Route Definitions (`Backend/src/constants/api-routes.js`)

**Location:** [Backend/src/constants/api-routes.js](Backend/src/constants/api-routes.js)

Canonical route definitions with:
- HTTP methods
- Protection requirements
- Role-based access control
- Middleware chains
- Complete documentation

### Route Validation System

#### Route Validator (`Backend/src/utils/route-validator.js`)

Validates:
- No duplicate route definitions
- Proper protection on sensitive endpoints
- Consistent middleware chains
- Valid HTTP methods
- Missing role definitions on protected routes

#### Request Diagnostics (`Backend/src/utils/request-diagnostics.js`)

Tracks:
- 404 errors with suggestions
- Slow endpoints (>5 seconds)
- Repeated failures
- Circuit breaker states
- Pattern analysis for misconfigured clients

#### Deployment Health (`Backend/src/utils/deployment-health.js`)

Monitors:
- Frontend/backend version alignment
- Build cache integrity
- Docker configuration
- Cache busting mechanisms
- Deployment consistency

---

## Deployment & Synchronization

### Clean Deployment Script

**Location:** [deploy-clean.sh](deploy-clean.sh)

Ensures fresh deployment by:
1. Stopping all containers
2. Removing dangling images
3. Clearing build cache
4. Cleaning frontend/backend artifacts
5. Rebuilding without cache
6. Health checking services
7. Optional validation checks

**Usage:**
```bash
./deploy-clean.sh              # Basic clean deployment
./deploy-clean.sh --full       # Remove all images
./deploy-clean.sh --validate   # Run health checks after
```

### Docker Compose Configuration

**Location:** [docker-compose.yml](docker-compose.yml)

Updated with:
- Build version tagging for cache invalidation
- Health checks for all services
- Service dependencies
- Environment variable passing
- Clean restart policies
- MongoDB health verification

### GitHub Actions Deployment

**Location:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

CI/CD pipeline includes:
- Environment variable injection
- Clean Docker builds
- Frontend/backend synchronization
- Deployment health checks
- Rollback procedures

---

## Testing

### Route Contract Tests

**Location:** [Backend/tests/routing-contract.test.js](Backend/tests/routing-contract.test.js)

Tests verify:
- All expected routes are registered under `/api` ✅
- Frontend constants use `/api` prefix ✅
- No legacy `/api/v1` patterns in codebase ✅
- No stale route definitions ✅

**Run Tests:**
```bash
cd Backend
npm test
```

---

## Monitoring & Diagnostics

### Health Check Endpoints

#### Route Health (`GET /api/health/routes`)
Lists all registered routes with:
- HTTP method
- Full path
- Protection status
- Role requirements
- Middleware chain

#### Route Validation (`GET /api/health/routes/validation`)
Comprehensive validation report:
- Route conflicts
- Protection issues
- Consistency problems
- Status: VALID/WARNING/INVALID

#### Deployment Health (`GET /api/health/deployment`)
Checks:
- Frontend/backend version alignment
- Source code hash consistency
- Docker configuration
- Cache busting headers
- Build version tracking

#### Request Diagnostics (`GET /api/health/diagnostics`)
Tracks:
- API usage patterns
- Slow endpoints
- Failed endpoints with patterns
- Recent 404 errors
- Recommendations for fixes

#### Full Health Check (`GET /api/health/full`)
Combines all health checks into single comprehensive report

### Example Curl Commands

```bash
# Check all routes
curl http://localhost:5000/api/health/routes | jq

# Validate route consistency
curl http://localhost:5000/api/health/routes/validation | jq

# Check deployment health
curl http://localhost:5000/api/health/deployment | jq

# Get request diagnostics
curl http://localhost:5000/api/health/diagnostics | jq

# Full health report
curl http://localhost:5000/api/health/full | jq
```

---

## Common Issues & Resolutions

### Issue: 404 Errors on Known Routes

**Symptoms:**
- Getting 404 on endpoints that should exist
- Frontend requests failing

**Diagnostics:**
```bash
# Check if route is registered
curl http://localhost:5000/api/health/routes | grep "candidate/me"

# Get diagnostics
curl http://localhost:5000/api/health/diagnostics | jq .recentNotFoundErrors
```

**Resolution:**
1. Verify using correct `/api/*` prefix (not `/api/v1/*`)
2. Check authentication token validity
3. Verify user role has access
4. Check request data format

### Issue: Stale Frontend Bundles

**Symptoms:**
- Frontend making requests to old API routes
- Inconsistent behavior after deployment

**Resolution:**
```bash
# Force clean rebuild
./deploy-clean.sh --full

# Or manually
docker-compose down
docker system prune -af
docker-compose up -d --build
```

### Issue: Deployment Consistency Errors

**Symptoms:**
- Frontend and backend versions mismatched
- API version mismatch warnings

**Diagnostics:**
```bash
curl http://localhost:5000/api/health/deployment | jq .consistency
```

**Resolution:**
1. Ensure both containers are from latest build
2. Verify Docker images are recent
3. Check build version timestamps

### Issue: Circuit Breaker Opens (Too Many Failures)

**Symptoms:**
- Requests being blocked with "Circuit breaker" error
- Repeated failures on specific endpoint

**Resolution:**
1. Check endpoint health with diagnostics
2. Verify backend service is running
3. Check database connectivity
4. Review error logs: `docker-compose logs backend`
5. Circuit breaker auto-recovers after 30 seconds of inactivity

---

## Performance Metrics

### Response Time Targets

| Endpoint Category | Target | Notes |
|------------------|--------|-------|
| Auth endpoints | < 500ms | Database lookup + password hashing |
| Read endpoints | < 1000ms | Single document fetch |
| List endpoints | < 2000ms | Multiple documents, pagination |
| Interview session | < 3000ms | Complex state management |
| File operations | < 5000ms | Upload/download/processing |

### Slow Endpoint Detection

Any endpoint exceeding 5 seconds is automatically logged:
```
[SLOW_ENDPOINT] GET /api/interviews/:sessionId - 6234ms
```

Check diagnostics endpoint for slow endpoint patterns.

---

## Recommendations

### ✅ Completed
- [x] Unified API prefix to `/api/*`
- [x] Removed all `/api/v1/*` references
- [x] Standardized frontend API constants
- [x] Enhanced backend diagnostics
- [x] Deployment health checks
- [x] Route validation system
- [x] Circuit breaker pattern
- [x] Docker clean deployment script

### 📋 Best Practices

1. **Always use API_ROUTES constants** in frontend
2. **Monitor /api/health/diagnostics** for issues
3. **Run tests before deployment:** `npm test`
4. **Use clean deploy script:** `./deploy-clean.sh --validate`
5. **Check deployment health** after each deploy
6. **Review slow endpoint logs** weekly
7. **Keep frontend/backend versions in sync**
8. **Use environment variables** for API URL

### 🔍 Ongoing Monitoring

Set up monitoring to check:
- `GET /api/health/full` every 5 minutes
- `GET /api/health/diagnostics` every hour
- Docker container health status
- Application error logs

---

## Support & Troubleshooting

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Validate Routes After Deployment
```bash
./deploy-clean.sh --validate
```

### Reset Diagnostics (Clear Tracked Data)
Routes are automatically cleaned up. No manual reset needed.

### Force Full Rebuild
```bash
docker-compose down
docker system prune -af
docker composer build --no-cache
docker-compose up -d
```

---

## Rollback Procedures

If deployment introduces issues:

1. **Immediate Rollback:**
   ```bash
   docker-compose down
   git revert <commit-hash>
   ./deploy-clean.sh
   ```

2. **Check Previous Version:**
   ```bash
   git log --oneline -5
   git show <commit-hash>
   ```

3. **Verify Health After Rollback:**
   ```bash
   curl http://localhost:5000/api/health/full
   ```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2024 | API unification - `/api/*` standard |
| 1.0 | 2024 | Initial deployment with `/api/v1` |

---

## Contact & Escalation

For route-related issues:
1. Check diagnostic endpoints
2. Review error logs in `/api/health/diagnostics`
3. Validate routes with `/api/health/routes/validation`
4. Check deployment consistency with `/api/health/deployment`

---

**End of Report**
