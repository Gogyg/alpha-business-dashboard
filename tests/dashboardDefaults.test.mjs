import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDashboardDefaults } from '../src/app/utils/dashboardDefaults.ts';

const defaults = {
  digitalMetrics: [{ id: 1, fact: 0 }],
  enpsData: { value: 0, plan: 85 },
  visibilityData: { value: 0, plan: 358 },
};

test('a focus-only quarter can render the dashboard metrics', () => {
  const focus = { title: 'Q4 focus' };
  const result = withDashboardDefaults({ livingDashboardFocus: focus }, defaults);
  assert.equal(result.enpsData.value, 0);
  assert.equal(result.visibilityData.value, 0);
  assert.deepEqual(result.digitalMetrics, defaults.digitalMetrics);
  assert.equal(result.livingDashboardFocus, focus);
});

test('existing zero values and intentionally empty metric lists survive', () => {
  const result = withDashboardDefaults({ digitalMetrics: [], enpsData: { value: 0, plan: 0 } }, defaults);
  assert.deepEqual(result.digitalMetrics, []);
  assert.deepEqual(result.enpsData, { value: 0, plan: 0 });
});

test('absent records and null fields receive defaults', () => {
  assert.deepEqual(withDashboardDefaults(null, defaults), defaults);
  const result = withDashboardDefaults({ enpsData: null, visibilityData: { value: 12 } }, defaults);
  assert.deepEqual(result.enpsData, defaults.enpsData);
  assert.deepEqual(result.visibilityData, { value: 12, plan: 358 });
});
