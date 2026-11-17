/*
 * SPACIA landing page settings.
 * Edit the values below, then run `node tools/generate-seo.js` so the static
 * SEO files (canonical, JSON-LD, robots.txt, sitemap.xml, llms.txt and the
 * Google Search Console meta tag) stay in sync with this file.
 */
(function () {
  const SITE_URL = 'https://www.spacia-madhyamgram.in';
  const PHONE = '+91 84449 11007';
  const WHATSAPP_NUMBER = '918444911007';

  // Leave empty to send leads to WhatsApp. When set, every form POSTs JSON here.
  // TODO: add the CRM / Google Apps Script / webhook URL that should receive leads.
  const LEAD_ENDPOINT = '';

  // Google Tag Manager is hard-coded in the <head> of index.html and 404.html; this value is
  // for reference only (site.js never injects GTM). GA4 and the Meta Pixel are configured
  // inside GTM, so keep the next two empty to avoid double counting.
  const GTM_ID = 'GTM-WX5GS62L';
  const GA4_ID = '';
  const META_PIXEL_ID = '';

  // Google Search Console HTML-tag verification code (the content="..." value only).
  const GSC_VERIFICATION = ''; // TODO

  // Project coordinates for the ApartmentComplex schema. Not yet verified.
  // TODO: copy the exact pin from Google Maps (right-click the site > copy coordinates).
  const GEO = { latitude: null, longitude: null };

  window.SPACIA_CONFIG = Object.freeze({
    SITE_URL,
    PHONE,
    WHATSAPP_NUMBER,
    LEAD_ENDPOINT,
    GA4_ID,
    GTM_ID,
    META_PIXEL_ID,
    GSC_VERIFICATION,
    GEO: Object.freeze(GEO),
    LAST_UPDATED: '2026-11-17',
    socialImage: 'assets/images/spacia-social-1200x630.webp',
    startingConfiguration: '3 BHK + 2T',
    prices: Object.freeze({
      '3 BHK + 2T': '₹81.30 Lacs',
      '3 BHK + 3T': '₹1.03 Cr',
      '4 BHK + 3T': '₹1.19 Cr'
    }),
    projectName: 'Srijan Spacia',
    developerName: 'Srijan Realty',
    address: 'Jessore Road South, Mouza Doharia, Ward 09, beside Reliance Mall, Madhyamgram, Kolkata 700129',
    reraNumber: 'WBRERA/P/NOR/2025/003059',
    reraCompletionDate: '31 December 2032',
    developerPossessionTarget: '2030'
  });
})();
