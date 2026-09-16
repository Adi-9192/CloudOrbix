import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateKpis } from './kpi.js';

test('calculates approved client KPIs and excludes pending records', () => {
  const result = calculateKpis([
    { approval_status: 'approved', current_status: 'Onboarded', revenue: 100, completion: 50 },
    { approval_status: 'approved', current_status: 'Completed', revenue: 200, completion: 100 },
    { approval_status: 'pending', current_status: 'Onboarded', revenue: 900, completion: 90 },
  ], [{ status: 'Open' }, { status: 'Closed' }]);
  assert.deepEqual(result, { totalClients: 2, activeClients: 1, totalRevenue: 300, activeProjects: 1, completedProjects: 1, openRisks: 1, averageCompletion: 75 });
});

test('returns zero-safe metrics for empty data', () => {
  assert.deepEqual(calculateKpis(), { totalClients: 0, activeClients: 0, totalRevenue: 0, activeProjects: 0, completedProjects: 0, openRisks: 0, averageCompletion: 0 });
});
