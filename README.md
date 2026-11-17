# Srijan Spacia landing page

Static landing page for Srijan Spacia (SPACIA by Srijan Realty), Madhyamgram — live at https://www.spacia-madhyamgram.in.
Stack: static HTML + vanilla JS, deployed on Vercel. No third-party CSS/JS/fonts except Google Tag Manager.
- Critical above-the-fold CSS is inlined in `<head>` (`<style id="critical-css">`); `userassets/css/style.css` loads non-blocking. If you change header/hero/form styles, update the inline block too.
- `style.css` starts with a purged Bootstrap 5.2.3 subset (reboot, grid, modal) and the self-hosted font faces (`assets/fonts/`, latin + a one-glyph ₹ file per family).
- Modals are handled by `site.js` (Bootstrap-compatible `data-bs-*` attributes).

## Settings — `userassets/js/site-config.js`
`SITE_URL`, `PHONE`, `WHATSAPP_NUMBER`, `LEAD_ENDPOINT`, `GEO`, prices (`GTM_ID` is reference only).
After editing, run `node tools/generate-seo.js` to resync canonical/OG URLs, JSON-LD (incl. FAQ), robots.txt and sitemap.xml.
Search Console is verified by the root file `googleb66561e3103864b6.html` (do not delete it).

## Leads
Every form (hero, modal, site visit, contact) goes through `submitLead()` in `userassets/js/site.js`.
- `LEAD_ENDPOINT` set → POST JSON `{name, phone, email, unit, timeframe, requested_item, page_url, utm_*, gclid, fbclid, timestamp}`.
- Empty → opens WhatsApp with all details prefilled.
Brochure, floor plans, specifications, payment schedule and price breakups are never linked directly; the PDFs are excluded from deploys via `.vercelignore`.

## Tracking
Google Tag Manager `GTM-WX5GS62L` is hard-coded in `<head>` / after `<body>` of index.html and 404.html; GA4 is configured inside GTM.
dataLayer events: `generate_lead {request_item, unit_type, form_id}`, `click_whatsapp`, `click_call`, `open_enquiry_modal {request_item}`.

## Local preview
`python -m http.server 8080` in this folder, then open http://localhost:8080.
