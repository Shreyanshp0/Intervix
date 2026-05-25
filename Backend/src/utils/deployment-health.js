/**
 * Deployment Health Check System
 * 
 * Validates:
 * - Frontend/Backend version synchronization
 * - Route consistency across deployment
 * - Docker container state
 * - Build cache integrity
 * - Cache busting mechanisms
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Build version/hash from git commit or timestamp
const getBuildVersion = () => {
  try {
    // Try to get git commit hash
    const gitDir = path.join(__dirname, '../../.git');
    if (fs.existsSync(gitDir)) {
      const headFile = path.join(gitDir, 'HEAD');
      const content = fs.readFileSync(headFile, 'utf8').trim();
      if (content.startsWith('ref: ')) {
        const refPath = path.join(gitDir, content.substring(5));
        if (fs.existsSync(refPath)) {
          return fs.readFileSync(refPath, 'utf8').trim().substring(0, 8);
        }
      }
    }
  } catch (e) {
    // Fall back to timestamp-based version
  }

  return `v${Date.now()}`;
};

const getPackageVersion = (packagePath) => {
  try {
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return pkg.version || 'unknown';
    }
  } catch (e) {
    return 'unknown';
  }
};

const calculateDirHash = (dirPath, maxDepth = 3, currentDepth = 0) => {
  if (currentDepth >= maxDepth) return '';

  let hash = crypto.createHash('sha256');

  try {
    if (!fs.existsSync(dirPath)) return '';

    const files = fs.readdirSync(dirPath);
    const filtered = files
      .filter(f => !['node_modules', '.git', 'dist', 'build'].includes(f))
      .sort();

    filtered.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        hash.update(calculateDirHash(fullPath, maxDepth, currentDepth + 1));
      } else if (stat.isFile()) {
        // Hash first 1KB of each file to avoid performance issues
        const content = fs.readFileSync(fullPath, 'utf8').substring(0, 1024);
        hash.update(content);
      }
    });
  } catch (e) {
    // Continue on errors
  }

  return hash.digest('hex').substring(0, 8);
};

const validateDeploymentConsistency = () => {
  const backendPath = path.join(__dirname, '../../');
  const frontendPath = path.join(__dirname, '../../../Frontend');

  const backendVersion = getPackageVersion(path.join(backendPath, 'package.json'));
  const frontendVersion = getPackageVersion(path.join(frontendPath, 'package.json'));

  const backendHash = calculateDirHash(path.join(backendPath, 'src'));
  const frontendHash = calculateDirHash(path.join(frontendPath, 'src'));

  const buildVersion = getBuildVersion();

  return {
    timestamp: new Date().toISOString(),
    buildVersion,
    backend: {
      version: backendVersion,
      srcHash: backendHash
    },
    frontend: {
      version: frontendVersion,
      srcHash: frontendHash
    },
    consistency: {
      versionMatch: backendVersion === frontendVersion,
      hashMatch: backendHash === frontendHash,
      aligned: backendVersion === frontendVersion && backendHash === frontendHash
    },
    deployment: {
      containerized: process.env.DOCKER_CONTAINER === 'true' || !!process.env.HOSTNAME?.includes('container'),
      environment: process.env.NODE_ENV || 'development',
      apiUrl: process.env.VITE_API_URL || 'not-configured'
    }
  };
};

const validateCacheBusting = () => {
  // Generate cache busting headers
  const buildVersion = getBuildVersion();
  const timestamp = Date.now();

  return {
    buildVersion,
    timestamp,
    eTag: crypto.createHash('md5').update(buildVersion + timestamp).digest('hex'),
    cacheControl: {
      html: 'public, max-age=3600, must-revalidate',
      static: 'public, max-age=31536000, immutable',
      api: 'no-cache, no-store, must-revalidate'
    },
    headers: {
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'X-Build-Version': buildVersion,
      'X-Build-Timestamp': timestamp.toString(),
      'ETag': crypto.createHash('md5').update(buildVersion + timestamp).digest('hex')
    }
  };
};

const validateDockerIntegrity = () => {
  const dockerComposeFile = path.join(__dirname, '../../..', 'docker-compose.yml');
  const issues = [];

  try {
    if (!fs.existsSync(dockerComposeFile)) {
      issues.push({
        severity: 'warning',
        issue: 'docker-compose.yml not found',
        recommendation: 'Ensure Docker Compose file exists at project root'
      });
      return { issues, valid: false };
    }

    const content = fs.readFileSync(dockerComposeFile, 'utf8');

    // Check for potential stale references
    if (/\/api\/v\d+/.test(content)) {
      issues.push({
        severity: 'critical',
        issue: 'docker-compose.yml contains versioned API references',
        recommendation: 'Remove all versioned API references from Docker configuration'
      });
    }

    // Validate image references
    if (!content.includes('image:') || !content.includes('build:')) {
      issues.push({
        severity: 'warning',
        issue: 'Docker Compose may be missing image or build configurations',
        recommendation: 'Verify Docker Compose structure includes proper build and image directives'
      });
    }

    // Check for volume mounts that might cache stale code
    const volumeMatches = content.match(/volumes:[\s\S]*?(?=\n\s{2}[a-z]|\n[a-z]|$)/g);
    if (volumeMatches) {
      volumeMatches.forEach((volumeSection) => {
        if (volumeSection.includes('node_modules') || volumeSection.includes('dist')) {
          issues.push({
            severity: 'warning',
            issue: 'Docker volumes mounting node_modules or dist may cause cache issues',
            recommendation: 'Consider using named volumes or .dockerignore to prevent stale dependencies'
          });
        }
      });
    }

  } catch (e) {
    issues.push({
      severity: 'error',
      issue: `Failed to validate docker-compose.yml: ${e.message}`,
      recommendation: 'Check Docker Compose file syntax and permissions'
    });
  }

  return {
    issues,
    valid: issues.filter(i => i.severity === 'critical').length === 0
  };
};

const generateDeploymentHealthReport = () => {
  const consistency = validateDeploymentConsistency();
  const cacheBusting = validateCacheBusting();
  const dockerIntegrity = validateDockerIntegrity();

  const isHealthy = consistency.consistency.aligned && 
                    dockerIntegrity.valid &&
                    !dockerIntegrity.issues.some(i => i.severity === 'critical');

  return {
    timestamp: new Date().toISOString(),
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    consistency,
    deployment: consistency.deployment,
    cacheBusting,
    docker: dockerIntegrity,
    recommendations: [
      ...dockerIntegrity.issues.map(i => i.recommendation)
    ],
    productionReady: isHealthy && process.env.NODE_ENV === 'production'
  };
};

module.exports = {
  getBuildVersion,
  getPackageVersion,
  calculateDirHash,
  validateDeploymentConsistency,
  validateCacheBusting,
  validateDockerIntegrity,
  generateDeploymentHealthReport
};
