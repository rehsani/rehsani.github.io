# Progress

## 2026-08-05 15:38:12

- Built a self-hosted visitor map to replace the dead ClustrMaps/MapMyVisitors widget (that service and RevolverMaps have both shut down; the whole free hosted-widget category is gone, so this owns the pipeline instead).
- Created scripts/visitor_stats.py — fetches GoatCounter /api/v0/stats/locations, folds region rows ("US-CA") into their country, converts ISO alpha-2 to the ISO numeric codes the world-atlas TopoJSON uses, and merges per-country high-water marks into the committed JSON so history survives provider retention limits. Hand-written 184-entry code table validated against the authoritative ISO 3166 list: 0 wrong codes, reaches all 174 map features.
- Created .github/workflows/visitor-map.yml — daily cron (04:17 UTC) + manual dispatch, commits data/visitors.json only when changed. Needs GOATCOUNTER_SITE and GOATCOUNTER_TOKEN repo secrets.
- Created js/visitor-map.js — Natural Earth choropleth, sqrt colour scale (counts are heavily skewed), per-country tooltips. Lazy-loaded via IntersectionObserver so the landing page pays nothing until Contact scrolls into view.
- Added data/world-countries-110m.json (105 KB). Chose 110m over 50m (739 KB) to protect the 199 KB landing page; the six countries it omits (Singapore, Hong Kong, Malta, Bahrain, Macao, Mauritius) are listed as text under the map rather than silently dropped.
- Moved js/vendor/{d3,topojson-client} from tax-tool to the site root so both maps share one copy; updated tax-tool/index.html script paths and the map.js comment. Verified the tax tool still computes: federal $21,099 at 100k single/wage, 3,131 counties — identical to before the move.
- Restored the .visitors-column CSS deleted earlier this session, adapted for the map; added the column to index.html's contact section.
- Verified end to end against mock data: 177 country paths, 14 shaded, tooltips on all, caption and off-map list correct. data/visitors.json ships empty ("No visits recorded yet") until the GoatCounter account exists.

## 2026-08-05 14:51:44

- Fixed the one regression the final review caught: css/style.css:395 — the `@media (max-width: 800px)` nav font-size rule selected only `.top-bar .nav-links a`, so after the Tools toggle became a `<button>` it kept its inherited 16px while sibling links dropped to 14.4px (0.9rem). Added `.top-bar .nav-links .dropdown-toggle` to the selector. Verified by screenshot at a 500px layout viewport (inside the <=800px band): "Tools" now matches Home/About/Blog/Publications.
- Note on verification method: `chrome --headless=new --window-size=375,H` does NOT yield a 375px layout viewport (measured 500px, Chrome's minimum window width, then cropped to 375). Width-dependent claims need CDP device-metrics override, not --window-size. An earlier apparent "Contact clipped at 375px" finding was this artifact, not a site defect.

## 2026-08-05 14:14:56

Second review-fix pass (8 approved findings), applied on top of the 11:48 working tree. Nothing committed or pushed.

- tax-tool/js/engines/total.js:2 — deleted the dead `import { federalTotal } from "./federal.js"`. `countyBreakdown()` takes the precomputed `federal` as its 4th argument; `federalTotal` is imported and called only in main.js:4/47. All five engine modules still import cleanly under node.
- css/style.css:8 — deleted `body { min-width: 800px }` and the now-redundant `body { min-width: 0 }` override that sat in the `@media (max-width: 800px)` block. Also deleted the `body { min-width: 0 }` the previous pass had added at tax-tool/css/style.css:19, after confirming the root declaration was gone. Computed `min-width` is now `0px` on all 8 pages; measured zero horizontal overflow at every width from 1200px to 320px.
- css/style.css — added `box-sizing: border-box` to the `body` rule (not the `calc(100vh - 4.5rem)` variant, not a global `*` reset). This was the cause of blog.html scrolling by exactly its own 72px top padding on a viewport where the content fits: measured spurious vertical overflow 72px -> 0px at 1200/900/815/810/801/800/760/600/480/475/420px. Confirmed `.landing` and `#about` do not move — both resolve `min-height: 100vh` against the viewport, and index.html's first-ink position is byte-identical above 800px.
- Corrected two wrong image dimension declarations that had been masking real layout shift, and completed the missing ones. Re-derived every value with `sips` first; all 11 now match their file exactly, and each PNG's WebP sibling was confirmed to share its dimensions (the `<source>` is what actually loads). blog-timing.html: `2a_characters.png` 720x480 -> **1024x1024**, `2c_timing_market_bar_plot.png` 720x480 -> **1500x1200**, `2b_timing_market_line_plot.png` -> 1800x1200. blog-401k.html: `1a`/`1b`/`1c` -> 1800x1200. blog-urmia.html: added 682x768, 682x768, 1800x1050, 1650x750. blog-tax-map.html: added 1400x1000 to `tax-map-tool.png`.
- Measured the shift by pausing image requests over CDP so each `<img>` sits in the genuine *pending* state, then releasing them. blog-timing.html at a 672px content width went from `2a` +224px / `2c` +89.6px / page +314px to **0px on every image and 0px cumulative**. blog-urmia.html +987px -> 0, blog-tax-map.html +460px -> 0, blog-401k.html already 0. Checked the `.img-pair` flex caveat at 900/600/375px: the paired 682x768 figures still size correctly (328px side-by-side at 900, wrapping to full width below 616px of content) with zero horizontal overflow, so the `width` attribute did not upset the flex sizing.
- blog-tax-map.html — added the missing AlphaCAMELS `<li>` to the Tools `.dropdown-menu`, matching the other 7 pages' markup and ordering. All 8 pages now report 3 menu items.
- blog-401k.html:44 — deleted the stray `<li><a href="#">CV</a></li>` that no other page had. Nav item count drops 7 -> 6, matching the other root pages. This also fixed the secondary defect: at 320px the extra item had pushed the dropdown menu 28.2px past the right edge of the viewport where it was unreachable (the menu is in a `position: fixed` bar, so it never contributed to scrollWidth). Menu right edge is now 8.3px inside the viewport, identical to blog.html; confirmed visually with the menu open at 320px.
- css/style.css + tax-tool/css/style.css — made the body top padding track the real bar height instead of a flat 4.5rem. Measured the bar with Inter loaded (the widest case; the system fallback is narrower and never reaches a third row): **71px above 800px, 82px from 800px down, 110px once nav-links wraps again**. That second wrap lands at <=400px on the root pages but at <=475px on the tool, which carries one extra nav item ("Write-up"). So: base stays 4.5rem, `@media (max-width: 800px)` gains `padding-top: 5.75rem` (92px), a new `@media (max-width: 400px)` sets `7.5rem` (120px), and the tool's own sheet sets `7.5rem` at `<=475px` — kept local so the root pages do not get a 28px dead gap across 401-475px.
- Fix 7 repaired two real coverage bugs, one of which had not been reported: tax-tool/index.html's `<h1>` was 10px under the bar at every width <=475px (not just 375px), and blog-alphacamels.html's "Back to blog" link was 6px under it at <=400px. After the change, body padding clears the bar on all 8 pages at all 14 widths tested (1200/900/815/810/801/800/760/600/480/475/420/400/375/320) and no page has any ink under the bar. Cost, for the record: content sits 20px lower at <=800px and 48px lower at <=400px than before, since those pages had been relying on their child containers' padding.
- Deleted the orphaned `images/1d_final_value_by_start_year.png` (+ the `.webp` the previous pass generated for it). Re-confirmed zero references across all html/css/js/xml/md/json first; it was referenced by blog-401k.html when added in 24e2e7e (2026-02-17) and orphaned the next day in e4d6749. The PNG is recoverable with `git show 24e2e7e:images/1d_final_value_by_start_year.png` (63047 bytes). All 108 local asset references now resolve and no image in images/ is unreferenced.
- Verified over a local `python3 -m http.server` with headless Chrome driven via CDP: 224 page loads across all 8 pages x 14 widths produced zero console errors and zero 404s; the Tools dropdown still opens by hover, click and keyboard (Enter opens, Escape closes and returns focus) on all 8 pages; the tax map still draws 3,232 county paths in 26 distinct fills and recolours on slider input (federal $21,099 -> $197,253, legend and summary both recomputed) at both 1200px and 375px.

## 2026-08-05 11:48:56

Review-fix pass (14 verified findings). Nothing committed or pushed; all changes left in the working tree.

- sitemap.xml — added the missing `blog-alphacamels.html` entry (lastmod 2026-06-30, monthly, 0.7); refreshed the four stale `2025-03-16` lastmods (`/`, blog.html, blog-401k.html, blog-timing.html) to their real last-commit date 2026-07-22.
- Added Open Graph + Twitter Card blocks to the 7 pages that lacked them (blog.html, blog-401k.html, blog-timing.html, blog-urmia.html, blog-tax-map.html, blog-alphacamels.html, tax-tool/index.html), reusing each page's own `<title>` and meta description verbatim. `og:type` = article for posts, website for blog.html + the tool.
- Added `og:image` / `twitter:image` (absolute PNG URLs) to all 8 pages per the decided mapping, and switched every `twitter:card` to `summary_large_image` (including index.html, which previously said `summary`).
- tax-tool/index.html — added the missing `meta name="description"` (written from the page's own intro paragraph) and `link rel="canonical"`.
- index.html:52 — added a screen-reader-only `<h1>` at the start of the landing section; css/style.css gained a `.visually-hidden` clip-rect utility (1px box + `clip`/`clip-path`, not display:none). Verified computed size 1x1 with `clip-path: inset(50%)` and no visual change to the cover.
- css/style.css — moved the 13-rule `.blog-article` core shared by all five posts into the stylesheet and deleted it from every inline `<style>` block; each post keeps only its genuine extras (401k tables, alphacamels pre/code, timing `.character`, tax-map `.disclaimer-box`/`.launch`/img-border override, urmia `.img-pair`).
- css/style.css + new js/nav.js — made the Tools dropdown operable by keyboard and touch. Toggle converted from `<a href="#">` to `<button type="button">` with `aria-expanded`/`aria-haspopup` on all 7 pages, UA button chrome stripped so it renders identically to the sibling links, `.open` class driven by click/Enter/Space with Escape-to-close and outside-click dismissal, plus a `html:not(.js-nav)` `:focus-within`/`:focus-visible` no-script fallback. Hover behaviour unchanged.
- tax-tool/index.html + tax-tool/css/style.css — replaced the tool's parallel `site-bar`/`site-name`/`site-nav`/`nav-dropdown*` nav with the root pages' `top-bar`/`name`/`nav-links`/`dropdown*` `<ul><li>` markup, linked the root `../css/style.css` ahead of the tool's own sheet, deleted the duplicated nav rules, and added the missing Publications + Contact links (Write-up kept). Only override needed was `body { min-width: 0 }` so the tool stays fluid under the root sheet's 800px floor.
- images/ — converted 13 PNGs to WebP (photos lossy `-q 82`, text-bearing charts `-lossless`), keeping every original PNG. `urmia-watermask-2020-07.png` skipped: its lossy WebP came out larger (14.8 KB -> 18.6 KB). Landing-page payload drops from ~3.9 MB to ~205 KB (cover 1.94 MB -> 117 KB, about-bg 1.91 MB -> 89 KB). All `<img>` in posts now sit in `<picture>` with a `<source type="image/webp">` and the PNG as the `<img>` fallback; the two `background-image` rules use `image-set()` with a preceding PNG declaration as fallback. Added `.blog-article picture { display: block }` so the wrapper does not change layout.
- tax-tool/js/map.js:1 — corrected the header comment: d3/topojson are vendored under js/vendor/ and loaded as window globals, not from a CDN.
- tax-tool/js/map.js — deleted the unused `legendDomain()` method (main.js computes lo/hi itself).
- css/style.css — removed the dead visitor-map CSS (`.visitors-column` x3 including the one inside `@media (max-width: 800px)`, `.visitors-intro`, `.visitors-widget` x2 and the stale iframe-scaling comment); markup went away in 168296a. `#contact .contact-layout` still centers its single column unchanged.
- Outstanding content item, deliberately NOT changed: blog-alphacamels.html:95 still reads "Preprint: arXiv (link coming once it clears moderation)". Accurate while the posting is on hold; needs a real URL once it clears.
- Verified with a local `python3 -m http.server` plus headless Chrome over CDP: all 8 pages load with no console errors and no 404s (only a pre-existing `/favicon.ico` 404, no favicon in the repo); every local href/src/srcset resolves 200; the dropdown opens by hover, click, Enter and Space, closes on second click / Escape (focus returned to the toggle) / outside click on all 7 pages; the tax map still draws 3,231 counties in 25 bins and recolours when the income, house-price and metric controls change.

## 2026-07-14 09:42:20

- Added an "AlphaCAMELS" entry to the Tools dropdown linking to https://github.com/rehsani/alphacamels (opens in new tab) across all 6 pages: index.html, blog.html, blog-401k.html, blog-timing.html, blog-alphacamels.html, blog-urmia.html. Sits alongside the existing "Lake Area from Space" tool; placeholder tools (Rent Index, Wealth Estimator) kept per request. Merged origin/main (Urmia post + Lake Area tool) into the branch, resolving the Tools-dropdown conflict to keep both tools.

## 2026-07-10 14:52:10

Added trend numbers to blog-urmia.html (new paragraph after the 42-year figure): July Landsat peak 1995 = 7,705 km² → 2025 = 3,292 (−57%); Sen-slope decline 1995–2015 ≈ −190 km²/yr ("half a square kilometer every day for twenty years"); July means 1994–99 = 6,672 vs 2020–25 = 3,876 (−42%). Numbers computed from urmia_july_landsat_1984_2025.csv, ok-status non-low-n rows only. Proofread pass: fixed "Landsat's labels" → "Landsat labels", made decade-comparison years explicit (1994–1999 / 2020–2025).

## 2026-07-10 14:46:00

Expanded the winter-divergence caveat in blog-urmia.html: now explains WHY the sensors disagree (independent NASA/USGS vs ESA snow/ice classifiers decide which pixels get removed; winter lake surfaces are the ambiguous cases they judge differently; frozen-surface-as-area has no clean answer) instead of only stating that they disagree.

## 2026-07-10 14:15:47

Reframed the Urmia post so the tool leads: title/h1 "An Open-Source Tool for Watching Lakes from Space", meta + intro name lake-area-gee up front, water-map caption credits the tool. Added "Lake Area from Space" to the Tools dropdown on all 6 HTML pages; updated blog.html index title. Repo side: README links the post, description + 6 topics set. Profile pinning is manual (API mutation removed).

## 2026-07-10 13:57:00

Rewrote blog-urmia.html for a general audience: acronyms spelled out (MNDWI, NASA/USGS Landsat, ESA Sentinel-2, Google Earth Engine explained), jargon replaced with plain language, scale anchor (7,000 km² > Delaware), caveats reframed as general satellite-measurement lessons.

## 2026-07-10 13:45:52

Added the Lake Urmia blog post: blog-urmia.html (matches blog-timing.html template), 4 figures from lake-area-gee/outputs into images/, entries in blog.html index and sitemap.xml. Covers the 42-year record, method, results, five uncertainty caveats, and links the lake-area-gee repo.

## 2026-07-04 18:16:33

- Removed the GA4 tag (G-23RL82K794) from <head> per request — no analytics/map on the site for now. Visitors-column CSS left untouched (dead but ready).
- Committed and pushed to origin/main: live site no longer has the dead mapmyvisitors widget.

## 2026-07-04 18:10:00

- Removed the "Recent visitors" section from index.html entirely (contact section now single column) — visitor-map approach paused until we settle on a widget. Third-party widgets all proved unreliable; self-hosted build works but the Apps Script deploy was too much overhead for now.
- Deleted test files js/visitor-globe.js and js/sample-points.js (and the empty js/ dir).
- Kept the GA4 tag (G-23RL82K794) in <head> for site analytics (independent of the map); updated its comment.
- Left .visitors-column CSS rules in place (dead but ready) for easy re-add later.
- Site changes still uncommitted/unpushed.

## 2026-07-04 17:56:28

- Filled real GA4 Measurement ID (G-8S4TQMJ64F) into the head snippet.
- Updated js/visitor-globe.js to the latest widget (smaller dots, custom "Visitors: N" tooltip).
- Still in offline test: data-endpoint temporarily points at js/sample-points.js; to be reverted to the real Apps Script /exec URL before push. Property ID for Apps Script still pending.

## 2026-07-04 17:36:38

- Replaced the dead mapmyvisitors visitor map with the self-hosted visitor-globe widget. Root cause of the old one: mapmyvisitors' free-widget backend is defunct (its dot-data endpoint returns homepage HTML; the token 404s), so no dots ever loaded.
- index.html: added GA4 gtag snippet in <head> (placeholder G-XXXXXXXXXX — needs real Measurement ID); swapped the mmvst_globe script for `<div id="visitor-globe">` + `js/visitor-globe.js` (placeholder data-endpoint — needs deployed Apps Script /exec URL).
- Added js/visitor-globe.js (copy of visitor-globe/widget.js).
- Two placeholders must be filled before the map works: GA4 Measurement ID (G-XXXX) in the head snippet, and the Apps Script /exec URL in the widget's data-endpoint. Until the endpoint is real the container stays blank (script load error logged to console); once it returns data with zero points it shows an honest "No visitors recorded yet" empty state.
- Site changes left UNCOMMITTED for review (placeholders to fill + push is Reza's call).
