// County choropleth built on d3 + topojson (vendored under the site-root
// /js/vendor/, shared with the visitor map, and loaded as window globals by
// index.html, not as ES module imports).
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

// Number of discrete color bins, shared by the map scale and the legend so they
// always match. Change this one value to adjust the binning.
const COLOR_BINS = 25;

// Off-ramp fills: white for a $0 tax, mid gray for missing data. Neither
// appears in the jet ramp, so both read unambiguously on the map and legend.
const ZERO_COLOR = "#ffffff";
const NO_DATA_COLOR = "#8a8a8a";

// Single source of the on-ramp rule: only positive values are colored on the
// ramp and count toward its [lo, hi] extent.
const onRamp = (v) => v > 0;

export class TaxMap {
  constructor(svgSelector, tooltipSelector) {
    this.svg = d3.select(svgSelector);
    this.tooltip = d3.select(tooltipSelector);
    this.path = d3.geoPath(d3.geoAlbersUsa());
    // Discrete color bins sampled from the ramp (not a continuous scale).
    this.color = d3.scaleQuantize().range(d3.quantize(COLOR_INTERPOLATOR, COLOR_BINS));
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

    // Cache the county path selection so update() reuses it (no per-event requery).
    this.countyPaths = this.svg.append("g").selectAll("path")
      .data(counties.features)
      .join("path")
      .attr("d", this.path)
      .attr("class", "county")
      .attr("fill", NO_DATA_COLOR)
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

  // Recolor from {geoid: breakdown} and the matching precomputed {geoid: value},
  // over the [lo, hi] domain (computed once in the caller and shared with the
  // legend). With `zeroOffRamp`, off-ramp values (a $0 tax) get ZERO_COLOR and
  // the `zero` class (darker stroke, so white areas keep their borders);
  // otherwise they clamp to the ramp's bottom bin.
  update(results, values, lo, hi, zeroOffRamp) {
    this.results = results;
    this.color.domain([lo, hi]);
    const isZero = (d) => d.id in values && zeroOffRamp && !onRamp(values[d.id]);
    this.countyPaths
      .classed("zero", isZero)
      .attr("fill", (d) => {
        if (!(d.id in values)) return NO_DATA_COLOR;
        return isZero(d) ? ZERO_COLOR : this.color(values[d.id]);
      });
  }
}

export { fmtUSD, COLOR_INTERPOLATOR, COLOR_BINS, ZERO_COLOR, NO_DATA_COLOR, onRamp };
