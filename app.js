"use strict";

const workflows = [
  { id: "workflow-a", name: "Workflow A", description: "Structured evaluation workflow", color: "#688ae8", base: [34.8, 32.9, 31.6, 31.2, 31.0] },
  { id: "workflow-b", name: "Workflow B", description: "Multi-step review workflow", color: "#2ea597", base: [43.2, 40.7, 39.2, 38.8, 38.6] },
  { id: "workflow-c", name: "Workflow C", description: "High-variance analysis workflow", color: "#8456ce", base: [27.4, 25.9, 24.9, 24.7, 24.8] },
  { id: "workflow-d", name: "Workflow D", description: "Rapid classification workflow", color: "#e07941", base: [18.6, 17.7, 17.1, 16.9, 16.9] }
];

const associates = [
  { id: "da-01", name: "Avery Chen", workflows: ["workflow-a", "workflow-b"] },
  { id: "da-02", name: "Maya Singh", workflows: ["workflow-a"] },
  { id: "da-03", name: "Theo Martin", workflows: ["workflow-a", "workflow-c"] },
  { id: "da-04", name: "Nadia Ellis", workflows: ["workflow-a", "workflow-d"] },
  { id: "da-05", name: "Sam Rivera", workflows: ["workflow-b"] },
  { id: "da-06", name: "Priya Shah", workflows: ["workflow-b", "workflow-c"] },
  { id: "da-07", name: "Jon Bell", workflows: ["workflow-b"] },
  { id: "da-08", name: "Lena Brooks", workflows: ["workflow-b", "workflow-d"] },
  { id: "da-09", name: "Noah Williams", workflows: ["workflow-c"] },
  { id: "da-10", name: "Amara Okafor", workflows: ["workflow-c", "workflow-d"] },
  { id: "da-11", name: "Eli Turner", workflows: ["workflow-c"] },
  { id: "da-12", name: "Sofia Rossi", workflows: ["workflow-c", "workflow-a"] },
  { id: "da-13", name: "Jamie Park", workflows: ["workflow-d"] },
  { id: "da-14", name: "Zara Khan", workflows: ["workflow-d", "workflow-a"] },
  { id: "da-15", name: "Leo Grant", workflows: ["workflow-d"] },
  { id: "da-16", name: "Imani Cole", workflows: ["workflow-d", "workflow-b"] }
];

const weekStarts = [
  new Date("2026-07-13T12:00:00Z"),
  new Date("2026-07-20T12:00:00Z"),
  new Date("2026-07-27T12:00:00Z"),
  new Date("2026-08-03T12:00:00Z"),
  new Date("2026-08-10T12:00:00Z")
];

const weekLabels = ["17 Jul", "24 Jul", "31 Jul", "7 Aug", "14 Aug"];
const displayedWeeks = [1, 2, 3, 4];
const displayedWeekLabels = displayedWeeks.map(i => weekLabels[i]);

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(48731);
const daOffsets = new Map(associates.map((da, index) => [da.id, (index % 8 - 3.5) / 20]));
const spreadScale = [1, 0.87, 0.75, 0.68, 0.65];

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function generateDailyRecords() {
  const records = [];
  weekStarts.forEach((weekStart, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex);
      associates.forEach(da => {
        da.workflows.forEach((workflowId, assignmentIndex) => {
          const workflow = workflows.find(item => item.id === workflowId);
          const worksToday = da.workflows.length === 1 || ((dayIndex + assignmentIndex + associates.indexOf(da)) % 3 !== 0);
          if (!worksToday) return;
          const personalOffset = daOffsets.get(da.id) * spreadScale[weekIndex];
          const dayPattern = (dayIndex - 2) * 0.006;
          const noise = (random() - 0.5) * workflow.base[weekIndex] * (0.065 * spreadScale[weekIndex]);
          const aht = Math.max(5, workflow.base[weekIndex] * (1 + personalOffset + dayPattern) + noise);
          records.push({ date: isoDate(date), weekIndex, daId: da.id, workflowId, aht: Number(aht.toFixed(2)) });
        });
      });
    }
  });
  return records;
}

const dailyRecords = generateDailyRecords();

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function standardDeviation(values) {
  const average = mean(values);
  return Math.sqrt(mean(values.map(value => (value - average) ** 2)) || 0);
}

function improvement(previous, current) {
  if (!previous || current === null || current === undefined) return null;
  return ((previous - current) / previous) * 100;
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
    return groups;
  }, new Map());
}

const daWeeklyGroups = groupBy(dailyRecords, record => `${record.daId}|${record.workflowId}|${record.weekIndex}`);
const daWeekly = [...daWeeklyGroups.entries()].map(([key, records]) => {
  const [daId, workflowId, weekIndex] = key.split("|");
  return { daId, workflowId, weekIndex: Number(weekIndex), aht: mean(records.map(record => record.aht)), days: records.length };
});

const workflowMetrics = new Map();
workflows.forEach(workflow => {
  const weekly = weekStarts.map((_, weekIndex) => {
    const entries = daWeekly.filter(item => item.workflowId === workflow.id && item.weekIndex === weekIndex);
    const values = entries.map(item => item.aht);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    return {
      weekIndex,
      entries,
      values,
      mean: mean(values),
      min: Math.min(...values),
      q1,
      median,
      q3,
      max: Math.max(...values),
      iqr: q3 - q1,
      std: standardDeviation(values)
    };
  });
  weekly.forEach((week, index) => {
    week.ahtImprovement = index ? improvement(weekly[index - 1].mean, week.mean) : null;
    week.iqrImprovement = index ? improvement(weekly[index - 1].iqr, week.iqr) : null;
    week.target = index ? weekly[index - 1].q3 * 0.95 : null;
  });
  workflowMetrics.set(workflow.id, weekly);
});

const overviewImprovement = displayedWeeks.map(weekIndex => mean(
  workflows.map(workflow => workflowMetrics.get(workflow.id)[weekIndex].ahtImprovement)
));

const overviewIqrImprovement = displayedWeeks.map(weekIndex => mean(
  workflows.map(workflow => workflowMetrics.get(workflow.id)[weekIndex].iqrImprovement)
));

function formatNumber(value, decimals = 1) {
  return Number(value).toFixed(decimals);
}

function formatPercent(value, decimals = 1) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

function valueClass(value, neutralBand = 1) {
  if (Math.abs(value) <= neutralBand) return "value-neutral";
  return value > 0 ? "value-positive" : "value-negative";
}

function createKpiCard(label, value, context, tone = "neutral", valueClassName = "") {
  return `<article class="kpi-card ${tone}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value ${valueClassName}">${value}</div>
    <div class="kpi-context">${context}</div>
  </article>`;
}

function renderOverview() {
  const latestIndex = 4;
  const latestAvg = overviewImprovement.at(-1);
  const latestIqr = overviewIqrImprovement.at(-1);
  const onTarget = workflows.filter(workflow => {
    const metric = workflowMetrics.get(workflow.id)[latestIndex];
    return metric.mean <= metric.target;
  }).length;

  document.querySelector("#overview-kpis").innerHTML = [
    createKpiCard("Latest average AHT improvement", formatPercent(latestAvg), "Across four workflows", Math.abs(latestAvg) <= 1 ? "neutral" : "positive", valueClass(latestAvg)),
    createKpiCard("Latest average IQR improvement", formatPercent(latestIqr), "Consistency across workflows", latestIqr > 0 ? "positive" : "warning", valueClass(latestIqr)),
    createKpiCard("Workflows meeting target", `${onTarget} / ${workflows.length}`, "Latest weekly AHT", onTarget === workflows.length ? "positive" : "warning"),
    createKpiCard("Reporting window", "4 weeks", "24 Jul to 14 Aug 2026", "neutral")
  ].join("");

  drawLineChart(document.querySelector("#overview-aht-chart"), {
    labels: displayedWeekLabels,
    series: [{ name: "Average improvement", values: overviewImprovement, color: "#688ae8" }],
    ySuffix: "%",
    zeroLine: true
  });
  renderAccessibleTable("#overview-aht-table", displayedWeekLabels, [{ name: "Average improvement", values: overviewImprovement, formatter: formatPercent }]);

  document.querySelector("#workflow-movement-list").innerHTML = workflows.map(workflow => {
    const metric = workflowMetrics.get(workflow.id)[latestIndex];
    return `<div class="movement-item">
      <div><div class="movement-name">${workflow.name}</div><div class="movement-sub">AHT ${formatNumber(metric.mean)} min · Target ${formatNumber(metric.target)} min</div></div>
      <div class="movement-value ${valueClass(metric.ahtImprovement)}">${formatPercent(metric.ahtImprovement)}</div>
    </div>`;
  }).join("");

  document.querySelector("#overview-workflow-table tbody").innerHTML = workflows.map(workflow => {
    const metric = workflowMetrics.get(workflow.id)[latestIndex];
    const isOnTarget = metric.mean <= metric.target;
    return `<tr>
      <td><strong>${workflow.name}</strong><br><small>${workflow.description}</small></td>
      <td class="numeric">${formatNumber(metric.mean)} min</td>
      <td class="numeric ${valueClass(metric.ahtImprovement)}">${formatPercent(metric.ahtImprovement)}</td>
      <td class="numeric">${formatNumber(metric.iqr)}</td>
      <td class="numeric ${valueClass(metric.iqrImprovement)}">${formatPercent(metric.iqrImprovement)}</td>
      <td class="numeric">${formatNumber(metric.q3 * 0.95)} min</td>
      <td><span class="status-pill ${isOnTarget ? "on-track" : "watch"}">${isOnTarget ? "On target" : "Watch"}</span></td>
    </tr>`;
  }).join("");
}

function renderWorkflow(workflowId) {
  const workflow = workflows.find(item => item.id === workflowId) || workflows[0];
  const metrics = workflowMetrics.get(workflow.id);
  const latest = metrics[4];
  document.querySelector("#workflow-title").textContent = workflow.name;
  document.querySelector("#workflow-description").textContent = `${workflow.description}. Latest data through 14 Aug 2026.`;
  document.querySelector("#workflow-selector").value = workflow.id;

  document.querySelector("#workflow-kpis").innerHTML = [
    createKpiCard("Latest weekly AHT", `${formatNumber(latest.mean)} min`, `Target ${formatNumber(latest.target)} min`, latest.mean <= latest.target ? "positive" : "warning"),
    createKpiCard("AHT improvement", formatPercent(latest.ahtImprovement), "Week on week", Math.abs(latest.ahtImprovement) <= 1 ? "neutral" : "positive", valueClass(latest.ahtImprovement)),
    createKpiCard("Latest IQR", formatNumber(latest.iqr), `Q1 ${formatNumber(latest.q1)} · Q3 ${formatNumber(latest.q3)}`, "neutral"),
    createKpiCard("IQR improvement", formatPercent(latest.iqrImprovement), "Week on week", latest.iqrImprovement > 0 ? "positive" : "warning", valueClass(latest.iqrImprovement))
  ].join("");

  const fourWeeks = displayedWeeks.map(index => metrics[index]);
  drawLineChart(document.querySelector("#workflow-aht-chart"), {
    labels: displayedWeekLabels,
    series: [
      { name: "AHT", values: fourWeeks.map(item => item.mean), color: workflow.color },
      { name: "Target", values: fourWeeks.map(item => item.target), color: "#656871", dashed: true }
    ],
    ySuffix: " min"
  });
  drawLineChart(document.querySelector("#workflow-aht-change-chart"), {
    labels: displayedWeekLabels,
    series: [{ name: "AHT improvement", values: fourWeeks.map(item => item.ahtImprovement), color: "#3184c2" }],
    ySuffix: "%",
    zeroLine: true
  });
  drawLineChart(document.querySelector("#workflow-iqr-chart"), {
    labels: displayedWeekLabels,
    series: [{ name: "IQR", values: fourWeeks.map(item => item.iqr), color: "#8456ce" }],
    ySuffix: ""
  });
  drawLineChart(document.querySelector("#workflow-iqr-change-chart"), {
    labels: displayedWeekLabels,
    series: [{ name: "IQR improvement", values: fourWeeks.map(item => item.iqrImprovement), color: "#2ea597" }],
    ySuffix: "%",
    zeroLine: true
  });

  renderAccessibleTable("#workflow-aht-table", displayedWeekLabels, [
    { name: "AHT", values: fourWeeks.map(item => item.mean), formatter: value => `${formatNumber(value)} min` },
    { name: "Target", values: fourWeeks.map(item => item.target), formatter: value => `${formatNumber(value)} min` }
  ]);
  renderAccessibleTable("#workflow-aht-change-table", displayedWeekLabels, [{ name: "AHT improvement", values: fourWeeks.map(item => item.ahtImprovement), formatter: formatPercent }]);
  renderAccessibleTable("#workflow-iqr-table", displayedWeekLabels, [{ name: "IQR", values: fourWeeks.map(item => item.iqr), formatter: formatNumber }]);
  renderAccessibleTable("#workflow-iqr-change-table", displayedWeekLabels, [{ name: "IQR improvement", values: fourWeeks.map(item => item.iqrImprovement), formatter: formatPercent }]);

  renderDistributionStrip(latest, document.querySelector("#workflow-distribution"));
  window.currentWorkflowId = workflow.id;
}

function renderDistributionStrip(stats, container) {
  container.innerHTML = `<div class="distribution-scale" aria-label="Quartile distribution from ${formatNumber(stats.min)} to ${formatNumber(stats.max)} minutes">
    <div class="quartile">Q1 · best</div><div class="quartile">Q2</div><div class="quartile">Q3</div><div class="quartile">Q4 · review</div>
  </div>
  <div class="distribution-ticks"><span>${formatNumber(stats.min)}</span><span>Q1 ${formatNumber(stats.q1)}</span><span>Median ${formatNumber(stats.median)}</span><span>Q3 ${formatNumber(stats.q3)}</span><span>${formatNumber(stats.max)} min</span></div>`;
}

function renderPrivate(daId) {
  const da = associates.find(item => item.id === daId) || associates[0];
  document.querySelector("#da-selector").value = da.id;
  const latestEntries = daWeekly.filter(item => item.daId === da.id && item.weekIndex === 4);
  const avgAht = mean(latestEntries.map(item => item.aht));
  const assigned = latestEntries.length;
  const onTarget = latestEntries.filter(entry => entry.aht <= workflowMetrics.get(entry.workflowId)[4].target).length;

  document.querySelector("#private-summary").innerHTML = `
    <article class="private-profile">
      <small>Private report for</small><h2>${da.name}</h2>
      <div class="profile-stat"><span>Reporting week</span><span>14 Aug</span></div>
      <div class="profile-stat"><span>Active workflows</span><span>${assigned}</span></div>
      <div class="profile-stat"><span>Meeting target</span><span>${onTarget}/${assigned}</span></div>
    </article>
    ${createKpiCard("Average personal AHT", `${formatNumber(avgAht)} min`, "Across active workflows", "neutral")}
    ${createKpiCard("Workflows on target", `${onTarget} / ${assigned}`, "Private performance view", onTarget === assigned ? "positive" : "warning")}`;

  document.querySelector("#private-distributions").innerHTML = latestEntries.map(entry => {
    const workflow = workflows.find(item => item.id === entry.workflowId);
    const stats = workflowMetrics.get(entry.workflowId)[4];
    const quartile = entry.aht <= stats.q1 ? 1 : entry.aht <= stats.median ? 2 : entry.aht <= stats.q3 ? 3 : 4;
    return `<article class="distribution-card">
      <div class="distribution-card-header"><div><h2>${workflow.name}</h2><small>${workflow.description}</small></div><span class="status-pill ${entry.aht <= stats.target ? "on-track" : "watch"}">${entry.aht <= stats.target ? "On target" : "Watch"}</span></div>
      <div class="distribution-chart"><canvas id="distribution-${workflow.id}" role="img" aria-label="${da.name} is in quartile ${quartile} for ${workflow.name}"></canvas></div>
      <dl class="distribution-detail">
        <div><dt>Your AHT</dt><dd>${formatNumber(entry.aht)}</dd></div>
        <div><dt>Quartile</dt><dd>Q${quartile}</dd></div>
        <div><dt>Team mean</dt><dd>${formatNumber(stats.mean)}</dd></div>
        <div><dt>Target</dt><dd>${formatNumber(stats.target)}</dd></div>
      </dl>
    </article>`;
  }).join("");

  latestEntries.forEach(entry => {
    const canvas = document.querySelector(`#distribution-${entry.workflowId}`);
    drawDistribution(canvas, workflowMetrics.get(entry.workflowId)[4], entry.aht);
  });
  window.currentDaId = da.id;
}

function renderMethod() {
  const previewDate = "2026-08-14";
  const dayRecords = dailyRecords.filter(record => record.date === previewDate);
  const matrix = new Map(dayRecords.map(record => [`${record.daId}|${record.workflowId}`, record.aht]));
  const previewAssociates = associates.slice(0, 8);
  document.querySelector("#source-preview-table").innerHTML = `<thead><tr><th scope="col">Synthetic DA</th>${workflows.map(workflow => `<th scope="col">${workflow.name}</th>`).join("")}</tr></thead>
    <tbody>${previewAssociates.map(da => `<tr><td><strong>${da.name}</strong></td>${workflows.map(workflow => {
      const value = matrix.get(`${da.id}|${workflow.id}`);
      return `<td class="numeric">${value ? formatNumber(value) : "—"}</td>`;
    }).join("")}</tr>`).join("")}</tbody>`;
}

const redrawers = new Set();
let resizeTimer;
if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => redrawers.forEach(redraw => redraw()), 120);
  });
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function drawLineChart(canvas, options, register = true) {
  const draw = () => {
    const { context: ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 36, right: 26, bottom: 38, left: 52 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const allValues = options.series.flatMap(series => series.values).filter(value => value !== null);
    let min = Math.min(...allValues);
    let max = Math.max(...allValues);
    if (options.zeroLine) { min = Math.min(min, 0); max = Math.max(max, 0); }
    const range = max - min || 1;
    min -= range * 0.18;
    max += range * 0.18;
    const x = index => padding.left + (options.labels.length === 1 ? plotWidth / 2 : index * plotWidth / (options.labels.length - 1));
    const y = value => padding.top + (max - value) * plotHeight / (max - min);

    ctx.clearRect(0, 0, width, height);
    ctx.font = "11px Open Sans, Arial, sans-serif";
    ctx.textBaseline = "middle";
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = min + (max - min) * (tick / 4);
      const yPos = y(value);
      ctx.strokeStyle = "#eaeded";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padding.left, yPos); ctx.lineTo(width - padding.right, yPos); ctx.stroke();
      ctx.fillStyle = "#687078";
      ctx.textAlign = "right";
      ctx.fillText(`${value.toFixed(Math.abs(value) < 10 ? 1 : 0)}${options.ySuffix || ""}`, padding.left - 8, yPos);
    }
    if (options.zeroLine && min < 0 && max > 0) {
      ctx.strokeStyle = "#879596";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(padding.left, y(0)); ctx.lineTo(width - padding.right, y(0)); ctx.stroke();
      ctx.setLineDash([]);
    }

    options.labels.forEach((label, index) => {
      ctx.fillStyle = "#545b64";
      ctx.textAlign = "center";
      ctx.fillText(label, x(index), height - 17);
    });

    let legendX = padding.left;
    options.series.forEach(series => {
      ctx.strokeStyle = series.color;
      ctx.fillStyle = series.color;
      ctx.lineWidth = 2.2;
      ctx.setLineDash(series.dashed ? [6, 4] : []);
      ctx.beginPath();
      series.values.forEach((value, index) => {
        if (value === null) return;
        if (index === 0) ctx.moveTo(x(index), y(value)); else ctx.lineTo(x(index), y(value));
      });
      ctx.stroke();
      ctx.setLineDash([]);

      series.values.forEach((value, index) => {
        if (value === null) return;
        ctx.beginPath(); ctx.arc(x(index), y(value), 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#16191f";
        ctx.font = "10px Monaco, Menlo, monospace";
        ctx.textAlign = "center";
        const label = `${value.toFixed(1)}${options.ySuffix || ""}`;
        ctx.fillText(label, x(index), y(value) - 12);
        ctx.fillStyle = series.color;
      });

      ctx.fillStyle = series.color;
      ctx.fillRect(legendX, 8, 14, 3);
      ctx.fillStyle = "#545b64";
      ctx.font = "11px Open Sans, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(series.name, legendX + 20, 10);
      legendX += ctx.measureText(series.name).width + 48;
    });
  };
  draw();
  if (register) redrawers.add(draw);
}

function drawDistribution(canvas, stats, daValue, register = true) {
  const draw = () => {
    const { context: ctx, width, height } = setupCanvas(canvas);
    const padding = { top: 30, right: 26, bottom: 42, left: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const domainMin = Math.min(stats.min, stats.mean - stats.std * 2.6);
    const domainMax = Math.max(stats.max, stats.mean + stats.std * 2.6);
    const x = value => padding.left + (value - domainMin) * plotWidth / (domainMax - domainMin);
    const quartiles = [domainMin, stats.q1, stats.median, stats.q3, domainMax];
    const colors = ["rgba(49,132,194,.18)", "rgba(103,163,83,.18)", "rgba(224,191,69,.24)", "rgba(186,46,15,.16)"];
    const labels = ["Q1", "Q2", "Q3", "Q4"];
    ctx.clearRect(0, 0, width, height);

    quartiles.slice(0, -1).forEach((start, index) => {
      const left = x(start);
      const right = x(quartiles[index + 1]);
      ctx.fillStyle = colors[index];
      ctx.fillRect(left, padding.top, right - left, plotHeight);
      ctx.fillStyle = "#545b64";
      ctx.font = "700 10px Open Sans, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[index], (left + right) / 2, padding.top + 12);
    });

    ctx.strokeStyle = "#aab7b8";
    ctx.lineWidth = 1;
    [stats.q1, stats.median, stats.q3].forEach(value => {
      ctx.beginPath(); ctx.moveTo(x(value), padding.top); ctx.lineTo(x(value), padding.top + plotHeight); ctx.stroke();
    });

    const sigma = Math.max(stats.std, 0.1);
    const density = value => Math.exp(-0.5 * ((value - stats.mean) / sigma) ** 2);
    ctx.strokeStyle = "#232f3e";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let pixel = 0; pixel <= Math.floor(plotWidth); pixel += 2) {
      const value = domainMin + pixel / plotWidth * (domainMax - domainMin);
      const curveY = padding.top + plotHeight - density(value) * (plotHeight * 0.72);
      if (pixel === 0) ctx.moveTo(padding.left + pixel, curveY); else ctx.lineTo(padding.left + pixel, curveY);
    }
    ctx.stroke();

    const markerX = x(daValue);
    const markerY = padding.top + plotHeight - density(daValue) * (plotHeight * 0.72);
    ctx.save();
    ctx.translate(markerX, markerY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#131a22";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();

    ctx.fillStyle = "#16191f";
    ctx.font = "700 11px Open Sans, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("You", markerX, Math.max(13, markerY - 15));

    const tickValues = [stats.min, stats.q1, stats.median, stats.q3, stats.max];
    ctx.font = "10px Monaco, Menlo, monospace";
    ctx.fillStyle = "#687078";
    tickValues.forEach(value => ctx.fillText(value.toFixed(1), x(value), height - 17));
  };
  draw();
  if (register) redrawers.add(draw);
}

function renderAccessibleTable(selector, labels, series) {
  const table = `<table class="sr-table"><caption>Chart data</caption><thead><tr><th>Series</th>${labels.map(label => `<th>${label}</th>`).join("")}</tr></thead><tbody>${series.map(item => `<tr><th>${item.name}</th>${item.values.map(value => `<td>${item.formatter ? item.formatter(value) : value}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  document.querySelector(selector).innerHTML = table;
}

function populateControls() {
  document.querySelector("#workflow-navigation").innerHTML = workflows.map((workflow, index) => `<button class="nav-item" data-view="workflow" data-workflow="${workflow.id}" type="button"><span class="nav-icon" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>${workflow.name}</button>`).join("");
  document.querySelector("#workflow-selector").innerHTML = workflows.map(workflow => `<option value="${workflow.id}">${workflow.name}</option>`).join("");
  document.querySelector("#da-selector").innerHTML = associates.map(da => `<option value="${da.id}">${da.name}</option>`).join("");
}

function showView(viewName, options = {}) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  document.querySelector(`#view-${viewName === "workflow" ? "workflow" : viewName}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const selector = viewName === "workflow" ? `.nav-item[data-workflow="${options.workflowId}"]` : `.nav-item[data-view="${viewName}"]`;
  document.querySelector(selector)?.classList.add("active");
  if (viewName === "workflow") renderWorkflow(options.workflowId);
  if (viewName === "private") renderPrivate(window.currentDaId || associates[0].id);
  if (viewName === "method") renderMethod();
  if (viewName === "overview") renderOverview();
  document.querySelector("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function initialize() {
  populateControls();
  renderOverview();
  renderWorkflow(workflows[0].id);
  renderPrivate(associates[0].id);
  renderMethod();

  document.querySelector("#primary-navigation").addEventListener("click", event => {
    const button = event.target.closest(".nav-item");
    if (!button) return;
    showView(button.dataset.view, { workflowId: button.dataset.workflow });
  });
  document.querySelector("#workflow-selector").addEventListener("change", event => {
    showView("workflow", { workflowId: event.target.value });
  });
  document.querySelector("#da-selector").addEventListener("change", event => renderPrivate(event.target.value));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    workflows,
    associates,
    dailyRecords,
    daWeekly,
    workflowMetrics,
    overviewImprovement,
    overviewIqrImprovement,
    displayedWeeks,
    mean,
    quantile,
    improvement
  };
}

if (typeof document !== "undefined") initialize();
