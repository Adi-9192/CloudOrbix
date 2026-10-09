import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDashboardSummary } from './dashboard-metrics.js';

test('calculates dashboard project counts from approved status values only', () => {
  const summary = calculateDashboardSummary([
    { approval_status: 'approved', current_status: 'Delayed', revenue: 100, completion: 25 },
    { approval_status: 'approved', current_status: 'Delayed', revenue: 200, completion: 50 },
    { approval_status: 'approved', current_status: 'On-track', revenue: 300, completion: 60 },
    { approval_status: 'approved', current_status: 'Completed', revenue: 400, completion: 100 },
    { approval_status: 'approved', current_status: 'Cancelled', revenue: 500, completion: 100 },
    { approval_status: 'pending', current_status: 'Delayed', revenue: 900, completion: 10 },
    { approval_status: 'approved', current_status: 'On-track', revenue: 200, completion: 50, estimated_end_date: '2000-01-01' },
  ], [
    { status: 'On-track', level: 'High' },
    { status: 'Completed', level: 'High' },
  ]);

  assert.equal(summary.totalClients, 6);
  assert.equal(summary.delayedProjects, 2);
  assert.equal(summary.activeClients, 2);
  assert.equal(summary.activeProjects, 4);
  assert.equal(summary.completedProjects, 1);
  assert.equal(summary.totalRevenue, 1700);
  assert.equal(summary.averageRevenue, 1700 / 6);
  assert.equal(summary.openRisks, 1);
  assert.equal(summary.highRisks, 1);
});

test('returns zero-safe dashboard metrics for no approved records', () => {
  assert.deepEqual(calculateDashboardSummary([
    { approval_status: 'pending', current_status: 'Delayed', revenue: 100 },
  ]), {
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    activeProjects: 0,
    completedProjects: 0,
    delayedProjects: 0,
    openRisks: 0,
    highRisks: 0,
    averageCompletion: 0,
  });
});

test('recalculates delayed project count after projects are added or edited', () => {
  const projects = [
    { current_status: 'On-track' },
    { current_status: 'Delayed' },
  ];
  assert.equal(calculateDashboardSummary(projects).delayedProjects, 1);

  projects[0].current_status = 'Delayed';
  projects.push({ current_status: 'On-track' });
  assert.equal(calculateDashboardSummary(projects).delayedProjects, 2);
});
