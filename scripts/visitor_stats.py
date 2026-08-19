"""Fetch visitor-by-country stats from GoatCounter and write them for the site map.

Run by .github/workflows/visitor-map.yml on a schedule. Reads the GoatCounter
`/api/v0/stats/locations` endpoint, converts ISO 3166-1 alpha-2 country codes to
the numeric codes used as feature ids by the world-atlas TopoJSON that the
browser renders, and merges the result into a committed JSON file so history
accumulates in the repo rather than depending on the provider's retention.

The counts are cumulative since DEFAULT_START. That requires care on two points,
both of which silently under-report if left at the API's defaults:

  * `start` defaults to *one week ago* server-side, so it must always be sent
    explicitly. Querying the default window and then max-merging (see
    merge_with_existing) pins the file to the busiest single week ever observed
    rather than the running total.
  * `/api/v0/stats/locations` paginates at 20 rows by default and reports a
    `more` flag; every page has to be drained or countries past the first page
    are dropped from the total.

The output file is the single declared artifact: data/visitors.json.
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# GoatCounter's stats endpoints default `start` to one week ago. To accumulate a
# lifetime total we ask for everything from well before the site existed; the API
# simply returns nothing for the empty stretch.
DEFAULT_START = "2020-01-01"

# Rows per request. The endpoint's own default is 20; it is paginated with
# `offset` and signals continuation with a `more` flag in the response.
PAGE_SIZE = 100

# GoatCounter reports locations as ISO 3166-1 alpha-2, optionally with a region
# suffix ("US-CA"). The world-atlas TopoJSON keys features by ISO 3166-1
# numeric. This table bridges the two; it covers every feature in the 110m file.
ALPHA2_TO_NUMERIC = {
    "AD": "020", "AE": "784", "AF": "004", "AG": "028", "AL": "008", "AM": "051",
    "AO": "024", "AQ": "010", "AR": "032", "AT": "040", "AU": "036", "AZ": "031",
    "BA": "070", "BB": "052", "BD": "050", "BE": "056", "BF": "854", "BG": "100",
    "BH": "048", "BI": "108", "BJ": "204", "BN": "096", "BO": "068", "BR": "076",
    "BS": "044", "BT": "064", "BW": "072", "BY": "112", "BZ": "084", "CA": "124",
    "CD": "180", "CF": "140", "CG": "178", "CH": "756", "CI": "384", "CL": "152",
    "CM": "120", "CN": "156", "CO": "170", "CR": "188", "CU": "192", "CY": "196",
    "CZ": "203", "DE": "276", "DJ": "262", "DK": "208", "DO": "214", "DZ": "012",
    "EC": "218", "EE": "233", "EG": "818", "EH": "732", "ER": "232", "ES": "724",
    "ET": "231", "FI": "246", "FJ": "242", "FK": "238", "FR": "250", "GA": "266",
    "GB": "826", "GE": "268", "GH": "288", "GL": "304", "GM": "270", "GN": "324",
    "GQ": "226", "GR": "300", "GT": "320", "GW": "624", "GY": "328", "HK": "344",
    "HN": "340", "HR": "191", "HT": "332", "HU": "348", "ID": "360", "IE": "372",
    "IL": "376", "IN": "356", "IQ": "368", "IR": "364", "IS": "352", "IT": "380",
    "JM": "388", "JO": "400", "JP": "392", "KE": "404", "KG": "417", "KH": "116",
    "KP": "408", "KR": "410", "KW": "414", "KZ": "398", "LA": "418", "LB": "422",
    "LK": "144", "LR": "430", "LS": "426", "LT": "440", "LU": "442", "LV": "428",
    "LY": "434", "MA": "504", "MD": "498", "ME": "499", "MG": "450", "MK": "807",
    "ML": "466", "MM": "104", "MN": "496", "MO": "446", "MR": "478", "MT": "470",
    "MU": "480", "MW": "454", "MX": "484", "MY": "458", "MZ": "508", "NA": "516",
    "NC": "540", "NE": "562", "NG": "566", "NI": "558", "NL": "528", "NO": "578",
    "NP": "524", "NZ": "554", "OM": "512", "PA": "591", "PE": "604", "PG": "598",
    "PH": "608", "PK": "586", "PL": "616", "PR": "630", "PS": "275", "PT": "620",
    "PY": "600", "QA": "634", "RO": "642", "RS": "688", "RU": "643", "RW": "646",
    "SA": "682", "SB": "090", "SD": "729", "SE": "752", "SG": "702", "SI": "705",
    "SK": "703", "SL": "694", "SN": "686", "SO": "706", "SR": "740", "SS": "728",
    "SV": "222", "SY": "760", "SZ": "748", "TD": "148", "TF": "260", "TG": "768",
    "TH": "764", "TJ": "762", "TL": "626", "TM": "795", "TN": "788", "TR": "792",
    "TT": "780", "TW": "158", "TZ": "834", "UA": "804", "UG": "800", "US": "840",
    "UY": "858", "UZ": "860", "VE": "862", "VN": "704", "VU": "548",
    "YE": "887", "ZA": "710", "ZM": "894", "ZW": "716",
}
# Deliberately absent: XK (Kosovo). It has no ISO numeric code and the world-atlas
# feature for it carries a null id, so it could never be joined; it is reported
# under "unmatched" instead of being silently dropped.


def parse_args():
    """Command-line interface."""
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--site", required=True,
                   help="GoatCounter site code, i.e. the SITE in https://SITE.goatcounter.com")
    p.add_argument("--token", required=True,
                   help="GoatCounter API token (pass via env, never hardcode)")
    p.add_argument("--out", type=Path, default=Path("data/visitors.json"),
                   help="Output JSON path (default: data/visitors.json)")
    p.add_argument("--start", default=DEFAULT_START,
                   help="Start date YYYY-MM-DD for the cumulative window "
                        "(default: %(default)s). Passing an empty string falls back to "
                        "the API's own default of one week ago, which is not cumulative.")
    p.add_argument("--timeout", type=int, default=30,
                   help="HTTP timeout in seconds (default: 30)")
    return p.parse_args()


def fetch_page(site, token, start, timeout, offset):
    """Return one page of the locations endpoint as the decoded response dict.

    Args:
        site: GoatCounter site code (the SITE in https://SITE.goatcounter.com).
        token: API token with "Read statistics" permission.
        start: Start date YYYY-MM-DD, sent explicitly so the window is the whole
            history rather than the API's default of one week ago.
        timeout: HTTP timeout in seconds.
        offset: Row offset for pagination; 0 for the first page.
    """
    params = {"limit": str(PAGE_SIZE)}
    if start:
        params["start"] = start
    if offset:
        params["offset"] = str(offset)
    url = (f"https://{site}.goatcounter.com/api/v0/stats/locations"
           f"?{urllib.parse.urlencode(params)}")
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        # Fail loudly: a silent empty result would quietly blank the map.
        sys.exit(f"GoatCounter API returned HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach the GoatCounter API: {e.reason}")


def fetch_locations(site, token, start, timeout):
    """Return all location stats as a list of {id, name, count} dicts.

    Walks every page the endpoint offers. The response's `more` flag marks a
    truncated result; stopping at the first page would drop countries past the
    page size and under-report the total.

    Args:
        site: GoatCounter site code.
        token: API token with "Read statistics" permission.
        start: Start date YYYY-MM-DD for the cumulative window.
        timeout: HTTP timeout in seconds.
    """
    rows, offset = [], 0
    while True:
        payload = fetch_page(site, token, start, timeout, offset)
        stats = payload.get("stats")
        if stats is None:
            sys.exit(f"Unexpected API response, no 'stats' key. Got keys: {list(payload)}")
        rows.extend(stats)
        # Guard the `more` flag with a non-empty page: a truthy `more` alongside
        # zero rows would otherwise spin forever.
        if not payload.get("more") or not stats:
            return rows
        offset += len(stats)


def to_country_counts(stats):
    """Fold location rows into {numeric_code: count}, plus names and any unmatched ids.

    GoatCounter ids are alpha-2, sometimes with a region suffix ("US-CA"), so
    counts are summed per country. Unrecognised ids are returned rather than
    dropped, so a schema change on their side shows up instead of silently
    shrinking the map.
    """
    counts, names, unmatched = {}, {}, {}
    for row in stats:
        raw = (row.get("id") or "").strip()
        count = int(row.get("count") or 0)
        if not raw or count <= 0:
            continue
        alpha2 = raw.split("-")[0].upper()
        numeric = ALPHA2_TO_NUMERIC.get(alpha2)
        if numeric is None:
            unmatched[alpha2] = unmatched.get(alpha2, 0) + count
            # Keep the display name so the page can label it properly.
            names.setdefault(alpha2, (row.get("name") or alpha2).split(",")[0].strip())
            continue
        counts[numeric] = counts.get(numeric, 0) + count
        # Keep the first display name seen; region rows carry the same country.
        names.setdefault(numeric, (row.get("name") or alpha2).split(",")[0].strip())
    return counts, names, unmatched


def merge_with_existing(path, counts, names):
    """Take the per-country maximum against any previously committed totals.

    With `start` pinned to DEFAULT_START the fetched counts are already
    cumulative, so this is purely a floor against GoatCounter aging data out:
    it keeps the larger of the stored and freshly fetched count so the file
    never shrinks when history expires upstream.

    This only behaves as a floor because the fetched value is a running total.
    Against a rolling window it would instead freeze the file at the busiest
    window ever seen, which is what it did before `start` was sent explicitly.

    Args:
        path: Existing output JSON to merge against; missing is fine.
        counts: Freshly fetched {numeric_code: count}.
        names: Freshly fetched {numeric_code: display name}.
    """
    if not path.exists():
        return counts, names
    try:
        prev = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return counts, names
    merged = dict(prev.get("countries") or {})
    merged_names = dict(prev.get("names") or {})
    for code, count in counts.items():
        merged[code] = max(count, merged.get(code, 0))
    merged_names.update(names)
    return merged, merged_names


def main():
    """Fetch, transform, merge, and write the visitor-country JSON."""
    args = parse_args()
    stats = fetch_locations(args.site, args.token, args.start, args.timeout)
    print(f"Fetched {len(stats)} location row(s) since {args.start or 'one week ago (API default)'}")
    counts, names, unmatched = to_country_counts(stats)
    if unmatched:
        print(f"WARNING: {len(unmatched)} unrecognised location id(s): {unmatched}",
              file=sys.stderr)

    counts, names = merge_with_existing(args.out, counts, names)
    doc = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": sum(counts.values()) + sum(unmatched.values()),
        "countries": dict(sorted(counts.items())),
        "names": dict(sorted(names.items())),
        # Locations with no joinable map feature (e.g. Kosovo). Kept so the page
        # can still account for them rather than under-reporting the total.
        "unmatched": dict(sorted(unmatched.items())),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"Wrote {args.out}: {doc['total']} visitors across {len(counts)} countries")


if __name__ == "__main__":
    main()
