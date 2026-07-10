# Progress

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
