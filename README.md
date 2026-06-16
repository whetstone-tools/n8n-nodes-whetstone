# n8n-nodes-whetstone

An [n8n](https://n8n.io) community node for **U.S. public-records data** — business
registration, new business filings, federal watchlist screening, and federal awards —
in one node. Useful for KYB/onboarding automations, sanctions/export screening,
sales-lead monitoring, and company enrichment.

Powered by the [Whetstone](https://whetstonetools.com/company-check/) actors on Apify.
All data is official U.S. government public-record data.

## Operations

| Operation | What it returns | Powered by |
|---|---|---|
| **Business Search (KYB)** | A company's official Secretary of State registration (status, dates, registered agent) across **25 states** | SoS registries |
| **New Business Filings** | Newly registered businesses from **10 states**, windowed by date — a feed of brand-new companies | Official state sources |
| **Watchlist Screen** | Fuzzy-matched hits against **12 U.S. government watchlists** (OFAC SDN, BIS Entity/Denied/Unverified/MEU, State Dept Debarred/ISN, and more) | ITA Consolidated Screening List |
| **Federal Awards** | A company's federal contracts, grants, and loans with amounts, agencies, and dates | USAspending.gov |

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter:

```
n8n-nodes-whetstone
```

(Self-hosted n8n only; community nodes aren't available on n8n Cloud's verified-only
instances unless allowed.)

## Credentials

The operations run as actors on [Apify](https://apify.com), so you need a free **Apify
API token**:

1. Create a free account at apify.com.
2. Go to **Settings → API & Integrations → Personal API tokens** and copy a token.
3. In n8n, create a new **Whetstone (Apify) API** credential and paste the token.

**Billing:** each operation runs the matching Whetstone actor on your Apify account and
is billed under Apify's pay-per-result pricing (about **$2 per 1,000 result rows**; a
query that returns nothing costs only trivial compute). Apify's free monthly usage
covers light use.

## Example automations

- **Customer onboarding / KYB:** when a new deal closes in your CRM → Business Search +
  Watchlist Screen the company name → flag any hit to Slack and attach the registration
  record.
- **Sales lead feed:** every morning → New Business Filings (your states, `daysBack: 1`)
  → append new companies to a Google Sheet / your CRM.
- **Vendor screening:** before a payment → Watchlist Screen the payee → block + alert if
  a match scores above your threshold.
- **Account enrichment:** for each account → Federal Awards → write total federal
  contract value back to the record.

This node is also usable as a **tool by the n8n AI Agent** — an agent can call
"Watchlist Screen" or "Business Search" on its own.

## Notes & limits

- **Heavy queries can be slow.** Business Search across all 25 states (or filings across
  all 10) runs synchronously and may approach the 300-second limit. Narrow the states
  list for faster, cheaper runs.
- **Name-based matching.** Watchlist and federal-award results are matched by name and
  are **not identity confirmation** — verify a hit against the official source before
  acting. Nothing here is legal, compliance, or financial advice.
- A free, interactive version of the combined lookup is at
  [whetstonetools.com/company-check](https://whetstonetools.com/company-check/).

## License

[MIT](LICENSE) © Whetstone Tools · support@whetstonetools.com
