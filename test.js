"use strict";

const assert = require("node:assert/strict");
const {
  workflows,
  associates,
  dailyRecords,
  daWeekly,
  workflowMetrics,
  overviewImprovement,
  overviewIqrImprovement,
  displayedWeeks,
  mean,
  improvement
} = require("./app.js");

assert.equal(workflows.length, 4, "expected four synthetic workflows");
assert.equal(associates.length, 16, "expected sixteen synthetic DAs");
assert.equal(displayedWeeks.length, 4, "dashboard should display four weekly changes");
assert.ok(dailyRecords.length > 400, "expected a meaningful daily synthetic dataset");
assert.ok(dailyRecords.every(record => record.aht > 0), "blank assignments must not become zero AHT values");
assert.ok(dailyRecords.every(record => !/amazon/i.test(record.daId + record.workflowId)), "synthetic records must not use Amazon identifiers");

workflows.forEach(workflow => {
  const weekly = workflowMetrics.get(workflow.id);
  assert.equal(weekly.length, 5, `${workflow.name} should retain a baseline plus four displayed weeks`);
  weekly.forEach((metric, index) => {
    assert.ok(metric.values.length >= 6, `${workflow.name} week ${index} needs a usable DA distribution`);
    assert.ok(metric.iqr >= 0, "IQR cannot be negative");
    assert.ok(metric.q1 <= metric.median && metric.median <= metric.q3, "quartiles must be ordered");
    if (index > 0) {
      assert.ok(Math.abs(metric.target - weekly[index - 1].q3 * 0.95) < 1e-9, "target must equal previous Q3 reduced by 5%");
      assert.ok(Math.abs(metric.ahtImprovement - improvement(weekly[index - 1].mean, metric.mean)) < 1e-9, "AHT improvement formula mismatch");
      assert.ok(Math.abs(metric.iqrImprovement - improvement(weekly[index - 1].iqr, metric.iqr)) < 1e-9, "IQR improvement formula mismatch");
    }
  });
});

displayedWeeks.forEach((weekIndex, outputIndex) => {
  const expectedAht = mean(workflows.map(workflow => workflowMetrics.get(workflow.id)[weekIndex].ahtImprovement));
  const expectedIqr = mean(workflows.map(workflow => workflowMetrics.get(workflow.id)[weekIndex].iqrImprovement));
  assert.ok(Math.abs(overviewImprovement[outputIndex] - expectedAht) < 1e-9, "overview AHT must be a simple workflow mean");
  assert.ok(Math.abs(overviewIqrImprovement[outputIndex] - expectedIqr) < 1e-9, "overview IQR must be a simple workflow mean");
});

const latestAssignments = new Set(daWeekly.filter(row => row.weekIndex === 4).map(row => `${row.daId}|${row.workflowId}`));
associates.forEach(da => da.workflows.forEach(workflowId => {
  assert.ok(latestAssignments.has(`${da.id}|${workflowId}`), `latest report missing ${da.name}/${workflowId}`);
}));

console.log(`Validated ${dailyRecords.length} daily records, ${daWeekly.length} DA-week aggregates, and ${workflows.length} workflow dashboards.`);
