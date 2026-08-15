# House Search

Private local Next.js app for on-demand housing search. Default view ranks US ZIPs by **gross rental yield** (typical rent vs typical home value) and hides above-average crime. Multi-country listing search remains under **Browse listings**.

## Features (MVP)

- **Investor scan (default):** US ZIP ranking by gross yield = `(ZORI × 12) / ZHVI`
  - Typical home value from [Zillow ZHVI](https://www.zillow.com/research/data/) (single-family)
  - Typical rent from Zillow ZORI (Price My Rental / Rent Zestimate has no public API; this is the nationwide equivalent)
  - Hard crime filter: county violent crime **at or below the US average** (County Health Rankings / FBI UCR). Optional “exclude only high crime” (top quartile)
  - Default purchase cap **$240,000**
  - Click a ZIP → Realtor.com for-sale listings (Firecrawl, 20 cap), sorted by estimated yield using that ZIP’s ZORI
- **Browse listings:** one primary portal per country:
  - Mexico → Inmuebles24
  - Spain → Idealista
  - United States → Realtor.com
  - Colombia → FincaRaíz
  - Chile → Portal Inmobiliario
  - Italy → Immobiliare.it
- Filters: country, city/region, rent/sale, price, bedrooms, bathrooms, floor area
- On-demand Firecrawl scrape only after submit (no preloading)
- Max **20 accepted listings** per source from **one** result page
- 10-minute in-memory cache for identical searches
- Charlie Health–inspired UI (tokens adapted; no CH branding/assets)

## Setup

```bash
npm install
npm run data:refresh   # optional; repo already includes data/markets.json
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Market data

`npm run data:refresh` downloads public CSVs (Zillow ZHVI/ZORI + County Health Rankings violent crime), joins them on ZIP/county, and writes [`data/markets.json`](data/markets.json). Raw CSVs land in `data/raw/` (gitignored). Re-run monthly when Zillow refreshes.

Gross yield is market-typical, not a house-specific Rent Zestimate. Crime is **county** grain, not neighborhood.

### Firecrawl keys

Server-only. Keys are loaded from:

1. `FIRECRAWL_API_KEY` (optional)
2. `/Users/zacharylandes/scrape/keys.md` (one `fc-…` key per line)

Override path with `FIRECRAWL_KEYS_PATH`.

**Never** copy keys into this repo or client bundles.

Key health policy:

| Status | Behavior |
|--------|----------|
| 401 | Disable that key |
| 402 | Mark credits exhausted; rotate to another key |
| 403 | Fail request (do not assume rotation helps) |
| 408 / 429 / 5xx | Honor `Retry-After` / backoff, then retry |
| Extraction/schema errors | Do not rotate keys |

### Optional env

```bash
# Use mock listings (Playwright / local UI without Firecrawl)
HOUSE_SEARCH_MOCK_SEARCH=1

# Enable experimental Facebook Marketplace adapter + connect UI (local only)
HOUSE_SEARCH_ENABLE_FACEBOOK=1

# Facebook local browser (all optional)
HOUSE_SEARCH_FB_PROFILE_DIR=/absolute/path/to/fb-profile  # default ~/.house-search/fb-profile
HOUSE_SEARCH_FB_CHROME_CHANNEL=chrome                     # or chrome-beta / msedge
HOUSE_SEARCH_FB_HEADFUL=1                                 # show Chrome during search (debug)

# Alternate keys file
FIRECRAWL_KEYS_PATH=/absolute/path/to/keys.md
```

## Scripts

```bash
npm run dev          # local server
npm run build        # production build
npm run test         # Vitest unit/component tests
npm run test:e2e     # Playwright (starts mocked dev server)
npm run lint         # ESLint
npm run data:refresh # Rebuild data/markets.json from Zillow + crime CSVs

# Live integration test: real portals via Firecrawl (consumes credits).
# Verifies a real city search returns valid listings and respects the 20 cap.
FIRECRAWL_LIVE=1 npm run test -- src/search/live.test.ts
```

Note: live JSON/LLM extraction on large result pages often takes 20–45s
per portal (`SOURCE_TIMEOUT_MS` is 65s). Repeat searches within the cache
window return instantly.

## Facebook (experimental, local only)

Facebook can't be scraped via Firecrawl: the `scrape` endpoint is blocked, and
its cloud browser (datacenter IP) triggers an endless Facebook CAPTCHA loop on
login. So Facebook runs **locally in your own Chrome** via Playwright
(`channel: "chrome"`) against a dedicated persistent profile. Because it uses
your machine/home IP, login is a normal one-time step and the session persists.

Requires a local Chrome install. Only works when the app runs on your machine
(not a remote deploy). Disabled by default. With `HOUSE_SEARCH_ENABLE_FACEBOOK=1`:

1. Two-step connect UI:
   - `POST /api/facebook/session` opens a visible Chrome window on
     `facebook.com` using the profile dir. Sign in there (once).
   - `DELETE /api/facebook/session` closes the window so the profile keeps the
     session.
2. `GET /api/facebook/status` reports connected when the `c_user` cookie exists
   in the profile.
3. Search launches a headless context on the same profile, navigates Marketplace
   search, and extracts up to 20 `/marketplace/item/` cards from the DOM.
4. Profile dir: `~/.house-search/fb-profile` (override with
   `HOUSE_SEARCH_FB_PROFILE_DIR`). One context at a time (profile-dir lock).

Note: Chrome 136+ ignores `--remote-debugging-port` on the default profile, so
reusing your everyday Chrome session directly isn't possible — hence the
dedicated profile with a one-time sign-in.

Logged-out Marketplace returns partial/no results; sign in once to get full
results.

## Live smoke notes

Bounded Firecrawl smoke (one page per MVP portal) after JSON-schema fix:

| Portal | Result |
|--------|--------|
| Inmuebles24 | OK (listings returned) |
| Realtor.com | OK |
| FincaRaíz | OK |
| Portal Inmobiliario | OK |
| Idealista | Geo/filter URL sensitive; city pages use `city-province` slugs |
| Immobiliare.it | Page often loads; extraction can be empty under bot/layout variance |

Source status in the UI surfaces per-portal failures without failing the whole search.
