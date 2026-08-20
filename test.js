"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  workflows,
  associates,
  dailyRecords,
  daWeekly,
  workflowMetrics,
  overviewImprovement,
  overviewIqrImprovement,
  displayedWeeks,
  sourceWorkbookUrl,
  mean,
  improvement,
  rowsToDailyRecords
} = require("./app.js");

const workbookPath = path.join(__dirname, sourceWorkbookUrl);
const workbookBytes = fs.readFileSync(workbookPath);
const indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

assert.equal(sourceWorkbookUrl, "outputs/aht-performance-dashboard/synthetic-aht-source.xlsx");
assert.ok(workbookBytes.length > 10000, "synthetic Excel workbook should contain the full source matrix");
assert.equal(workbookBytes.subarray(0, 2).toString(), "PK", "source workbook should be a valid XLSX ZIP container");
assert.match(indexHtml, /xlsx\.full\.min\.js/, "page should load the browser Excel parser");
assert.match(indexHtml, /Download source workbook/, "method page should expose the synthetic workbook");
assert.match(indexHtml, /Production architecture versus public demo/, "method page should distinguish production ingestion from the demo");
assert.match(indexHtml, /scheduled server-side job/, "method page should explain production ingestion");
assert.match(appSource, /fetch\(sourceWorkbookUrl/, "dashboard should fetch the workbook at startup");
assert.match(appSource, /XLSX\.read/, "dashboard should parse the fetched workbook");

const sourceRows = new Map();
dailyRecords.forEach(record => {
  const key = `${record.date}|${record.daId}`;
  if (!sourceRows.has(key)) {
    const da = associates.find(item => item.id === record.daId);
    sourceRows.set(key, { Date: record.date, "DA ID": record.daId, "DA name": da.name });
  }
  const workflow = workflows.find(item => item.id === record.workflowId);
  sourceRows.get(key)[workflow.name] = record.aht;
});
const reimportedRecords = rowsToDailyRecords([...sourceRows.values()]);
const sortRecords = records => [...records].sort((a, b) =>
  `${a.date}|${a.daId}|${a.workflowId}`.localeCompare(`${b.date}|${b.daId}|${b.workflowId}`)
);
assert.deepEqual(sortRecords(reimportedRecords), sortRecords(dailyRecords), "Excel matrix rows should reproduce the complete daily record set");

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
