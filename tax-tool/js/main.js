// App entry: load data, wire controls, recompute all counties on input, recolor.
import { TaxMap, fmtUSD, COLOR_INTERPOLATOR, COLOR_BINS, ZERO_COLOR, NO_DATA_COLOR } from "./map.js";
import { countyBreakdown } from "./engines/total.js";
import { federalTotal, federalIncomeTax } from "./engines/federal.js";

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
  swatchZero: document.getElementById("swatch-zero"),
  swatchNoData: document.getElementById("swatch-nodata"),
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

// "Color by" layers, keyed by the #metric option values. `get` reads the value
// from a county breakdown; `pct` marks a ratio (legend shows %, summary falls
// back to totals); `noun` names the layer in the summary line.
const METRICS = {
  total: { label: "Total annual tax", noun: "total", get: (b) => b.total },
  effective: { label: "Total tax ÷ income", noun: "total", get: (b) => b.effective, pct: true },
  income: { label: "State + local income tax", noun: "state + local income tax",
            get: (b) => b.stateIncome + b.localIncome },
  property: { label: "Property tax", noun: "property tax", get: (b) => b.property },
  sales: { label: "Sales tax", noun: "sales tax", get: (b) => b.sales },
};
const currentMetric = () => METRICS[els.metric.value];

function recompute() {
  const inp = inputs();
  els.incomeVal.textContent = fmtUSD(inp.gross);
  els.spendVal.textContent = fmtUSD(inp.monthlySpend) + "/mo";
  els.houseVal.textContent = fmtUSD(inp.housePrice);
  els.fractionVal.textContent = Math.round(inp.taxableFraction * 100) + "%";

  const federal = federalTotal(inp.gross, inp.status, els.incomeType.value);
  // Alabama deducts federal income tax, so the state engine needs that part alone.
  const federalIncome = federalIncomeTax(inp.gross, inp.status);
  const spec = currentMetric();
  const metric = spec.get;
  // Single pass: build results, the color-domain extent (linear min/max, no
  // sort; $0 counties are excluded and drawn off-ramp), and the summary values
  // (the layer's dollars, or totals for the ratio view).
  const results = {};
  const values = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const [geoid, county] of state.countyList) {
    const b = countyBreakdown(inp, county, state.stateRecords, federal, federalIncome);
    if (!b) continue; // no property data -> left as no-data on the map
    results[geoid] = b;
    const m = metric(b);
    values.push(spec.pct ? b.total : m);
    if (m > 0) {
      if (m < lo) lo = m;
      if (m > hi) hi = m;
    }
  }
  // No county has a positive metric value (e.g. "÷ income" or income tax at zero
  // income): there is no range to show, so flag it rather than inventing one.
  const degenerate = !isFinite(lo);
  if (degenerate) { lo = 0; hi = 1; }

  state.map.update(results, metric, lo, hi);
  updateLegendLabels(spec, lo, hi, degenerate);
  buildSummary(spec, values, federal);
}

// The stepped color gradient and off-ramp swatches are constant — build once at boot.
function buildLegendGradient() {
  els.swatchZero.style.background = ZERO_COLOR;
  els.swatchNoData.style.background = NO_DATA_COLOR;
  const colors = d3.quantize(COLOR_INTERPOLATOR, COLOR_BINS);
  const w = 100 / COLOR_BINS;
  const stops = colors
    .map((c, i) => `${c} ${(i * w).toFixed(3)}% ${((i + 1) * w).toFixed(3)}%`)
    .join(", ");
  els.legendBar.style.background = `linear-gradient(to right, ${stops})`;
}

function updateLegendLabels(spec, lo, hi, degenerate = false) {
  els.legendLabel.textContent = spec.label;
  if (degenerate) {
    // Nothing to scale against; showing "0.0% - 100.0%" would advertise a range
    // no county occupies.
    els.legendLo.textContent = "n/a";
    els.legendHi.textContent = spec.pct ? "no income to divide by" : "n/a";
    return;
  }
  els.legendLo.textContent = spec.pct ? (lo * 100).toFixed(1) + "%" : fmtUSD(lo);
  els.legendHi.textContent = spec.pct ? (hi * 100).toFixed(1) + "%" : fmtUSD(hi);
}

function buildSummary(spec, values, federal) {
  values.sort(d3.ascending);
  const median = d3.quantileSorted(values, 0.5);
  els.summary.innerHTML =
    `Federal (same everywhere): <b>${fmtUSD(federal)}</b> &nbsp;·&nbsp; ` +
    `Median county ${spec.noun}: <b>${fmtUSD(median)}</b> &nbsp;·&nbsp; ` +
    `Range: ${fmtUSD(values[0])} – ${fmtUSD(values[values.length - 1])}`;
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
