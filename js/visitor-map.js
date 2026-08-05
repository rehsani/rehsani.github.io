// World choropleth of site visitors by country.
//
// Data comes from data/visitors.json, refreshed by .github/workflows/visitor-map.yml
// and keyed by ISO 3166-1 numeric codes so it joins directly to the world-atlas
// TopoJSON feature ids. Everything (d3, topojson, the 105KB map, the counts) is
// fetched only once the widget scrolls into view, so the landing page above it
// pays nothing for this.

(function () {
  "use strict";

  var MOUNT = "#visitor-map";
  var ASSETS = {
    d3: "js/vendor/d3.v7.min.js",
    topojson: "js/vendor/topojson-client.v3.min.js",
    world: "data/world-countries-110m.json",
    visitors: "data/visitors.json",
  };
  // Fill for countries with no recorded visits, against the dark background.
  var EMPTY_FILL = "#20262b";

  var mount = document.querySelector(MOUNT);
  if (!mount) return;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function status(msg) {
    mount.innerHTML = '<p class="visitors-status">' + msg + "</p>";
  }

  function render(world, data) {
    var counts = data.countries || {};
    var names = data.names || {};
    var values = Object.keys(counts).map(function (k) { return counts[k]; });

    if (!values.length) {
      status("No visits recorded yet.");
      return;
    }

    var features = topojson.feature(world, world.objects.countries).features;
    var width = 320, height = 170;

    var svg = d3.select(mount).html("").append("svg")
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("class", "visitors-svg")
      .attr("role", "img")
      .attr("aria-label", "World map shading countries by number of site visitors");

    var projection = d3.geoNaturalEarth1().fitSize([width, height], { type: "Sphere" });
    var path = d3.geoPath(projection);

    // Counts are heavily skewed toward one or two countries, so a linear ramp
    // would flatten everything else to the same shade. Sqrt keeps the long tail
    // distinguishable without over-stating small counts the way log would.
    var color = d3.scaleSequentialSqrt()
      .domain([0, d3.max(values)])
      .interpolator(d3.interpolateRgb("#2b4250", "#9ccbe6"));

    svg.append("g").selectAll("path")
      .data(features)
      .join("path")
      .attr("d", path)
      .attr("fill", function (f) {
        var n = counts[f.id];
        return n ? color(n) : EMPTY_FILL;
      })
      .attr("stroke", "rgba(255,255,255,0.12)")
      .attr("stroke-width", 0.3)
      .append("title")
      .text(function (f) {
        var n = counts[f.id];
        var label = names[f.id] || (f.properties && f.properties.name) || "";
        return n ? label + ": " + n + (n === 1 ? " visitor" : " visitors") : label;
      });

    // Counts stay true to the data even though a few countries have no polygon
    // at this map resolution (Singapore, Hong Kong, Malta, Bahrain, Macao,
    // Mauritius) or no joinable code at all (Kosovo). Those visits are included
    // in the caption totals but are not drawn.
    var total = data.total || values.reduce(function (a, b) { return a + b; }, 0);
    var nCountries = values.length + Object.keys(data.unmatched || {}).length;
    var caption = total.toLocaleString("en-US") + (total === 1 ? " visit" : " visits") +
      " from " + nCountries + (nCountries === 1 ? " country" : " countries");
    d3.select(mount).append("p").attr("class", "visitors-caption").text(caption);
  }

  function start() {
    status("Loading map…");
    Promise.all([loadScript(ASSETS.d3), loadScript(ASSETS.topojson)])
      .then(function () {
        return Promise.all([
          fetch(ASSETS.world).then(function (r) { return r.json(); }),
          fetch(ASSETS.visitors).then(function (r) { return r.json(); }),
        ]);
      })
      .then(function (res) { render(res[0], res[1]); })
      .catch(function (err) {
        // An honest empty state beats a blank box; the old widget failed silently.
        status("Visitor map unavailable.");
        console.error("visitor-map:", err);
      });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        start();
      }
    }, { rootMargin: "200px" });
    io.observe(mount);
  } else {
    start();
  }
})();
