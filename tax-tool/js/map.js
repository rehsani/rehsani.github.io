// County choropleth built on d3 + topojson (loaded globally from CDN).
// Uses geoAlbersUsa so Alaska and Hawaii appear as insets.

const fmtUSD = (n) => "$" + Math.round(n).toLocaleString("en-US");

// Map/legend color ramp: matplotlib's classic "jet" (dark blue -> blue -> cyan
// -> yellow -> red -> dark red), built from its RGB control points since d3 has
// no built-in jet. Map and legend both use this one interpolator.
const _jet = d3.scaleLinear()
  .domain([0, 0.125, 0.375, 0.625, 0.875, 1])
  .range(["#000080", "#0000ff", "#00ffff", "#ffff00", "#ff0000", "#800000"])
  .interpolate(d3.interpolateRgb);
const COLOR_INTERPOLATOR = (t) => _jet(Math.max(0, Math.min(1, t)));

export class TaxMap {
  constructor(svgSelector, tooltipSelector) {
    this.svg = d3.select(svgSelector);
    this.tooltip = d3.select(tooltipSelector);
    this.path = d3.geoPath(d3.geoAlbersUsa());
    // 100 discrete color bins sampled from the ramp (not a continuous scale).
    this.color = d3.scaleQuantize().range(d3.quantize(COLOR_INTERPOLATOR, 100));
    this.features = [];
    this.results = {}; // geoid -> breakdown
  }

  // Draw county paths once; `onHover(geoid)` supplies the tooltip breakdown.
  init(topo, onHover) {
    const counties = topojson.feature(topo, topo.objects.counties);
    // Fit the projection to the SVG's viewBox coordinate space (not the rendered
    // pixel size); preserveAspectRatio then scales the whole thing to the
    // container without distortion or clipping.
    const [, , vbWidth, vbHeight] = this.svg.attr("viewBox").split(/\s+/).map(Number);
    this.path.projection().fitSize([vbWidth, vbHeight], counties);
    this.features = counties.features;

    this.svg.append("g").selectAll("path")
      .data(counties.features)
      .join("path")
      .attr("d", this.path)
      .attr("class", "county")
      .attr("fill", "#eee")
      .on("mousemove", (event, d) => {
        const b = this.results[d.id];
        if (!b) { this.tooltip.style("opacity", 0); return; }
        this.tooltip.style("opacity", 1)
          .style("left", event.pageX + 14 + "px")
          .style("top", event.pageY + 14 + "px")
          .html(onHover(d.id, b));
      })
      .on("mouseleave", () => this.tooltip.style("opacity", 0));

    // State outlines for readability.
    this.svg.append("path")
      .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
      .attr("class", "state-border")
      .attr("d", this.path);
  }

  // Recolor from a {geoid: breakdown} map, scaling by `metric` (a getter).
  update(results, metric) {
    this.results = results;
    // Color domain = true min/max of the current scenario's counties, recomputed
    // every update so the full palette always spans this scenario's range.
    const vals = Object.values(results).map(metric).filter((v) => v > 0).sort(d3.ascending);
    const lo = vals[0] ?? 0;
    const hi = vals[vals.length - 1] ?? 1;
    this.color.domain([lo, hi]);
    this.svg.selectAll("path.county")
      .attr("fill", (d) => {
        const b = results[d.id];
        return b ? this.color(metric(b)) : "#e0e0e0";
      });
    return [lo, hi];
  }

  legendDomain() {
    return this.color.domain();
  }
}

export { fmtUSD, COLOR_INTERPOLATOR };
