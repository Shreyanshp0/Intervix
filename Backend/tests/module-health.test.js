import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModuleHealthReport } from '../src/utils/module-health.js';

test('module health report loads services safely and exposes dependency metadata', () => {
  const report = buildModuleHealthReport();

  assert.ok(report);
  assert.equal(typeof report.status, 'string');
  assert.ok(report.services.total > 0);
  assert.ok(report.services.loaded >= 0);
  assert.equal(typeof report.configs.nodeEnv, 'string');
  assert.equal(typeof report.dependencyGraph.nodes, 'number');
  assert.ok(Array.isArray(report.circularWarnings));
});
