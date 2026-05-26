import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRouteHealthReport } from '../src/utils/route-diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendRoot = path.resolve(__dirname, '../../Frontend/src');
const frontendApiRoutesFile = path.join(frontendRoot, 'constants', 'apiRoutes.js');

const legacyPatterns = [
  '/candidate/profile/me',
  '/candidate/resume',
  '/jobs/recruiter',
  '/jobs/candidate',
  '/jobs/applications'
];

test('route health report exposes canonical unversioned routes without collisions', () => {
  const report = buildRouteHealthReport();
  const routePaths = report.routes.map((route) => `${route.method} ${route.fullPath}`);

  assert.equal(report.collisions.length, 0);
  assert.ok(routePaths.includes('GET /api/candidate/me'));
  assert.ok(routePaths.includes('GET /api/candidate/jobs/feed'));
  assert.ok(routePaths.includes('GET /api/recruiter/jobs'));
  assert.ok(routePaths.includes('GET /api/resume/me'));
  assert.ok(routePaths.includes('GET /api/health/routes'));
});

test('frontend route constants target the canonical unversioned API', () => {
  const contents = fs.readFileSync(frontendApiRoutesFile, 'utf8');

  assert.match(contents, /const API_PREFIX = '\/api'/);
  assert.match(contents, /candidate:\s*{[\s\S]*me:\s*`\$\{API_PREFIX\}\/candidate\/me`/);
  assert.match(contents, /recruiter:\s*{[\s\S]*jobs:\s*`\$\{API_PREFIX\}\/recruiter\/jobs`/);
  assert.match(contents, /resume:\s*{[\s\S]*me:\s*`\$\{API_PREFIX\}\/resume\/me`/);
});

test('frontend source no longer references legacy route strings', () => {
  const files = [];
  const stack = [frontendRoot];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    entries.forEach((entry) => {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }

      if (absolutePath.endsWith('.js') || absolutePath.endsWith('.jsx')) {
        files.push(absolutePath);
      }
    });
  }

  const offenders = [];
  files.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    legacyPatterns.forEach((pattern) => {
      if (source.includes(pattern)) {
        offenders.push({ file, pattern });
      }
    });
  });

  assert.deepEqual(offenders, []);
});
