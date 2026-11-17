# Srijan Spacia landing page

Static landing page for Srijan Spacia (SPACIA by Srijan Realty), Madhyamgram — live at https://www.spacia-madhyamgram.in.
Stack: static HTML + Bootstrap 5.2 (CSS, modal JS) + vanilla JS, deployed on Vercel.

## Settings — `userassets/js/site-config.js`
`SITE_URL`, `PHONE`, `WHATSAPP_NUMBER`, `LEAD_ENDPOINT`, `GTM_ID`, `GA4_ID`, `META_PIXEL_ID`, `GSC_VERIFICATION`, `GEO`, prices.
After editing, run `node tools/generate-seo.js` to resync canonical/OG URLs, JSON-LD (incl. FAQ), the Search Console tag, robots.txt and sitemap.xml.

## Leads
Every form (hero, modal, site visit, contact) goes through `submitLead()` in `userassets/js/site.js`.
- `LEAD_ENDPOINT` set → POST JSON `{name, phone, email, unit, timeframe, requested_item, page_url, utm_*, gclid, fbclid, timestamp}`.
- Empty → opens WhatsApp with all details prefilled.
Brochure, floor plans, specifications, payment schedule and price breakups are never linked directly; the PDFs are excluded from deploys via `.vercelignore`.

## Tracking
Loads only when IDs are set (GTM preferred). Events: `generate_lead`/`Lead`, `click_whatsapp`, `click_call`, `open_enquiry_modal`.

## Local preview
`python -m http.server 8080` in this folder, then open http://localhost:8080.
