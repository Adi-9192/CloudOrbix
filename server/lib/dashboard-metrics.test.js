import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateDashboardActiveProjectCompletion,
  calculateDashboardProjectBreakdown,
  calculateDashboardSummary,
} from './dashboard-metrics.js';

test('groups approved projects for the dashboard pie chart', () => {
  const projects = [
    { approval_status: 'approved', current_status: 'On Track', region: 'EMEA', hyperscaler: 'Azure' },
    { approval_status: 'approved', current_status: 'On Track', region: 'EMEA', hyperscaler: 'AWS' },
    { approval_status: 'approved', current_status: 'Delayed', region: 'APAC', hyperscaler: 'Azure' },
    { approval_status: 'pending', current_status: 'On Track', region: 'EMEA', hyperscaler: 'Azure' },
  ];

  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'status'), [
    { name: 'On Track', value: 2 },
    { name: 'At Risk', value: 1 },
  ]);
  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'region'), [
    { name: 'EMEA', value: 2 },
    { name: 'APAC', value: 1 },
  ]);
  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'hyperscaler'), [
    { name: 'AZURE', value: 2 },
    { name: 'AWS', value: 1 },
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

test('excludes cancelled projects from dashboard totals and breakdowns', () => {
  const projects = [
    { approval_status: 'approved', current_status: 'On Track' },
    { approval_status: 'approved', current_status: 'Cancelled' },
    { approval_status: 'approved', current_status: 'canceled' },
    { approval_status: 'approved', current_status: 'Completed' },
  ];

  assert.equal(calculateDashboardSummary(projects).totalClients, 2);
  assert.deepEqual(calculateDashboardProjectBreakdown(projects, 'status'), [
    { name: 'Completed', value: 1 },
    { name: 'On Track', value: 1 },
  ]);
});

test('returns each approved active project with its completion percentage', () => {
  const projects = [
    { id: 1, client_name: 'Alpha', approval_status: 'approved', current_status: 'On Track', completion: 0 },
    { id: 2, client_name: 'Beta', approval_status: 'approved', current_status: 'At Risk', completion: 25 },
    { id: 3, client_name: 'Gamma', approval_status: 'approved', current_status: 'On Hold', completion: 25.5 },
    { id: 4, client_name: 'Delta', approval_status: 'approved', current_status: 'On Track', completion: 50 },
    { id: 5, client_name: 'Epsilon', approval_status: 'approved', current_status: 'On Track', completion: 75 },
    { id: 6, client_name: 'Zeta', approval_status: 'approved', current_status: 'Off Track (External)', completion: 99 },
    { id: 7, client_name: 'Eta', approval_status: 'approved', current_status: 'Completed', completion: 80 },
    { id: 8, client_name: 'Theta', approval_status: 'approved', current_status: 'On Track', completion: 100 },
    { id: 9, client_name: 'Iota', approval_status: 'approved', current_status: 'Cancelled', completion: 10 },
    { id: 10, client_name: 'Kappa', approval_status: 'pending', current_status: 'On Track', completion: 10 },
  ];

  assert.deepEqual(calculateDashboardActiveProjectCompletion(projects), [
    { id: '6', name: 'Zeta', completion: 99 },
    { id: '5', name: 'Epsilon', completion: 75 },
    { id: '4', name: 'Delta', completion: 50 },
    { id: '3', name: 'Gamma', completion: 25.5 },
    { id: '2', name: 'Beta', completion: 25 },
    { id: '1', name: 'Alpha', completion: 0 },
  ]);
  assert.equal(calculateDashboardActiveProjectCompletion(projects).length, calculateDashboardSummary(projects).activeProjects);
});

test('returns an empty active-project chart series if there are no active projects', () => {
  assert.deepEqual(calculateDashboardActiveProjectCompletion([
    { approval_status: 'approved', current_status: 'Completed', completion: 100 },
    { approval_status: 'approved', current_status: 'Cancelled', completion: 40 },
  ]), []);
});

test('counts completed projects by status instead of completion percentage', () => {
  const summary = calculateDashboardSummary([
    { current_status: 'On Track', completion: 100 },
    { current_status: 'Completed', completion: 40 },
    { current_status: 'Cancelled', completion: 100 },
  ]);

  assert.equal(summary.completedProjects, 1);
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

  assert.equal(summary.totalClients, 6);
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
