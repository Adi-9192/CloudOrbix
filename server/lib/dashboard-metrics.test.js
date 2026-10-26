import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateDashboardProjectBreakdown,
  calculateDashboardSummary,
} from './dashboard-metrics.js';

test('groups approved projects for the dashboard pie chart', () => {
  const projects = [
    { approval_status: 'approved', current_status: 'On Track', region: 'EMEA', hyperscaler: 'Azure', project_type: 'Standard' },
    { approval_status: 'approved', current_status: 'On Track', region: 'EMEA', hyperscaler: 'AWS', project_type: 'Standard' },
    { approval_status: 'approved', current_status: 'Delayed', region: 'APAC', hyperscaler: 'Azure', project_type: 'Non-Standard' },
    { approval_status: 'pending', current_status: 'On Track', region: 'EMEA', hyperscaler: 'Azure', project_type: 'Standard' },
  ];

  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'status'), [
    { name: 'On Track', value: 2 },
    { name: 'Delayed', value: 1 },
  ]);
  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'region'), [
    { name: 'EMEA', value: 2 },
    { name: 'APAC', value: 1 },
  ]);
  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'hyperscaler'), [
    { name: 'Azure', value: 2 },
    { name: 'AWS', value: 1 },
  ]);
  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'projectType'), [
    { name: 'Standard', value: 2 },
    { name: 'Non-Standard', value: 1 },
  ]);
  assert.throws(
    () => calculateDashboardProjectBreakdown(projects, 'year'),
    /Unsupported project breakdown/,
  );
});

test('normalizes equivalent on-track statuses in the dashboard breakdown', () => {
  assert.deepEqual(calculateDashboardProjectBreakdown([
    { current_status: 'On Track' },
    { current_status: 'On-track' },
    { current_status: 'on_track' },
  ], 'status'), [
    { name: 'On Track', value: 3 },
  ]);
});

test('calculates dashboard project counts from approved status values only', () => {
  const summary = calculateDashboardSummary([
    { approval_status: 'approved', current_status: 'Delayed (External)', revenue: 100, completion: 25 },
    { approval_status: 'approved', current_status: 'Delayed (Internal)', revenue: 200, completion: 50 },
    { approval_status: 'approved', current_status: 'Delayed', revenue: 50, completion: 5 },
    { approval_status: 'approved', current_status: 'On-track', revenue: 300, completion: 60 },
    { approval_status: 'approved', current_status: 'Completed', revenue: 400, completion: 100 },
    { approval_status: 'approved', current_status: 'Cancelled', revenue: 500, completion: 100 },
    { approval_status: 'pending', current_status: 'Delayed', revenue: 900, completion: 10 },
    { approval_status: 'approved', current_status: 'On-track', revenue: 200, completion: 50, estimated_end_date: '2000-01-01' },
  ], [
    { status: 'On-track', level: 'High' },
    { status: 'Completed', level: 'High' },
    { status: 'At Risk', level: 'Low' },
  ]);

  assert.equal(summary.totalClients, 7);
  assert.equal(summary.delayedProjectsExternal, 1);
  assert.equal(summary.delayedProjectsInternal, 1);
  assert.equal(summary.activeClients, 2);
  assert.equal(summary.activeProjects, 5);
  assert.equal(summary.completedProjects, 1);
  assert.equal(summary.totalRevenue, 1750);
  assert.equal(summary.averageRevenue, 1750 / 7);
  assert.equal(summary.totalRisks, 3);
  assert.equal(summary.openRisks, 2);
  assert.equal(summary.highRisks, 1);
});

test('returns zero-safe dashboard metrics for no approved records', () => {
  assert.deepEqual(calculateDashboardSummary([
    { approval_status: 'pending', current_status: 'Delayed (External)', revenue: 100 },
  ]), {
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    activeProjects: 0,
    completedProjects: 0,
    delayedProjectsExternal: 0,
    delayedProjectsInternal: 0,
    totalRisks: 0,
    openRisks: 0,
    highRisks: 0,
    averageCompletion: 0,
  });
});

test('recalculates external and internal delayed projects after edits', () => {
  const projects = [
    { current_status: 'On-track' },
    { current_status: 'Delayed (External)' },
  ];
  assert.equal(calculateDashboardSummary(projects).delayedProjectsExternal, 1);

  projects[0].current_status = 'Delayed (Internal)';
  projects.push({ current_status: 'Delayed-External' });
  const summary = calculateDashboardSummary(projects);
  assert.equal(summary.delayedProjectsExternal, 2);
  assert.equal(summary.delayedProjectsInternal, 1);
});
