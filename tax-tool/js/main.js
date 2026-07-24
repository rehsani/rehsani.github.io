// App entry: load data, wire controls, recompute all counties on input, recolor.
import { TaxMap, fmtUSD, COLOR_INTERPOLATOR, COLOR_BINS } from "./map.js";
import { countyBreakdown } from "./engines/total.js";
import { federalTotal } from "./engines/federal.js";

const state = { counties: null, stateRecords: null, nameById: {}, map: null };

const els = {
  income: document.getElementById("income"),
  spend: document.getElementById("spend"),
  house: document.getElementById("house"),
  fraction: document.getElementById("fraction"),
  status: document.getElementById("status"),
  incomeType: document.getElementById("income-type"),
  metric: document.getElementById("metric"),
  incomeVal: document.getElementById("income-val"),
  spendVal: document.getElementById("spend-val"),
  houseVal: document.getElementById("house-val"),
  fractionVal: document.getElementById("fraction-val"),
  legendBar: document.getElementById("legend-bar"),
  legendLo: document.getElementById("legend-lo"),
  legendHi: document.getElementById("legend-hi"),
  legendLabel: document.getElementById("legend-label"),
  summary: document.getElementById("summary"),
};

function inputs() {
  return {
    gross: +els.income.value,
    monthlySpend: +els.spend.value,
    housePrice: +els.house.value,
    taxableFraction: +els.fraction.value / 100,
    status: els.status.value,
  };
}

const metricGetter = () =>
  els.metric.value === "effective" ? (b) => b.effective : (b) => b.total;

function recompute() {
  const inp = inputs();
  els.incomeVal.textContent = fmtUSD(inp.gross);
  els.spendVal.textContent = fmtUSD(inp.monthlySpend) + "/mo";
  els.houseVal.textContent = fmtUSD(inp.housePrice);
  els.fractionVal.textContent = Math.round(inp.taxableFraction * 100) + "%";

  const federal = federalTotal(inp.gross, inp.status, els.incomeType.value);
  const metric = metricGetter();
  // Single pass: build results, the color-domain extent (linear min/max, no
  // sort), and the totals list for the summary.
  const results = {};
  const totals = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const [geoid, county] of state.countyList) {
    const b = countyBreakdown(inp, county, state.stateRecords, federal);
    if (!b) continue; // no property data -> left as no-data on the map
    results[geoid] = b;
    totals.push(b.total);
    const m = metric(b);
    if (m > 0) {
      if (m < lo) lo = m;
      if (m > hi) hi = m;
    }
  }
  if (!isFinite(lo)) { lo = 0; hi = 1; }

  state.map.update(results, metric, lo, hi);
  updateLegendLabels(lo, hi);
  buildSummary(totals, federal);
}

// The stepped color gradient is constant — build it once at boot.
function buildLegendGradient() {
  const colors = d3.quantize(COLOR_INTERPOLATOR, COLOR_BINS);
  const w = 100 / COLOR_BINS;
  const stops = colors
    .map((c, i) => `${c} ${(i * w).toFixed(3)}% ${((i + 1) * w).toFixed(3)}%`)
    .join(", ");
  els.legendBar.style.background = `linear-gradient(to right, ${stops})`;
}

function updateLegendLabels(lo, hi) {
  const isEff = els.metric.value === "effective";
  els.legendLo.textContent = isEff ? (lo * 100).toFixed(1) + "%" : fmtUSD(lo);
  els.legendHi.textContent = isEff ? (hi * 100).toFixed(1) + "%" : fmtUSD(hi);
  els.legendLabel.textContent = isEff ? "Total tax ÷ income" : "Total annual tax";
}

function buildSummary(totals, federal) {
  totals.sort(d3.ascending);
  const median = d3.quantileSorted(totals, 0.5);
  els.summary.innerHTML =
    `Federal (same everywhere): <b>${fmtUSD(federal)}</b> &nbsp;·&nbsp; ` +
    `Median county total: <b>${fmtUSD(median)}</b> &nbsp;·&nbsp; ` +
    `Range: ${fmtUSD(totals[0])} – ${fmtUSD(totals[totals.length - 1])}`;
}

function tooltipHTML(geoid, b) {
  const name = state.nameById[geoid] || "County";
  const st = state.counties[geoid]?.state || "";
  const row = (label, v) => `<tr><td>${label}</td><td>${fmtUSD(v)}</td></tr>`;
  return `<div class="tt-title">${name}, ${st}</div>` +
    `<table>${row("Federal", b.federal)}${row("State income", b.stateIncome)}` +
    `${row("Local income", b.localIncome)}${row("Sales", b.sales)}` +
    `${row("Property", b.property)}` +
    `<tr class="tt-total"><td>Total</td><td>${fmtUSD(b.total)}</td></tr>` +
    `<tr><td>Tax &divide; income</td><td>${(b.effective * 100).toFixed(1)}%</td></tr></table>`;
}

async function boot() {
  const [counties, incomeBundle, topo] = await Promise.all([
    fetch("data/county_tax_inputs.json").then((r) => r.json()),
    fetch("data/state_income_tax.json").then((r) => r.json()),
    fetch("data/counties-10m.json").then((r) => r.json()),
  ]);
  state.counties = counties;
  state.stateRecords = incomeBundle.states;
  state.countyList = Object.entries(counties); // materialize once, reused each recompute
  const cf = topojson.feature(topo, topo.objects.counties).features;
  cf.forEach((f) => { state.nameById[f.id] = f.properties.name; });

  state.map = new TaxMap("#map", "#tooltip");
  state.map.init(topo, tooltipHTML);
  buildLegendGradient();

  // Coalesce rapid slider input into at most one recompute per animation frame.
  let scheduled = false;
  const onInput = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; recompute(); });
  };
  for (const el of [els.income, els.spend, els.house, els.fraction, els.status,
                    els.incomeType, els.metric]) {
    el.addEventListener("input", onInput);
  }
  recompute();
}

boot();
