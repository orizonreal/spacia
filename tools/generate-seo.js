// Run with `node tools/generate-seo.js` after changing userassets/js/site-config.js
// (SITE_URL, prices, GEO, socialImage) or the FAQ in index.html.
// It keeps the static SEO output in sync: JSON-LD, canonical/OG URLs,
// robots.txt and sitemap.xml. (Search Console is verified with a root HTML file.)
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, contents) => fs.writeFileSync(path.join(root, name), contents, 'utf8');

const context = { window: {} };
vm.runInNewContext(read('userassets/js/site-config.js'), context);
const config = context.window.SPACIA_CONFIG;
if (!config) throw new Error('Could not read SPACIA_CONFIG from userassets/js/site-config.js');

const siteUrl = new URL(config.SITE_URL.replace(/\/?$/, '/')).href; // always ends with "/"
const abs = (relative) => new URL(relative, siteUrl).href;
const today = new Date().toISOString().slice(0, 10);
const lastUpdated = config.LAST_UPDATED || today;
const startingPrice = config.prices[config.startingConfiguration];
if (!startingPrice) throw new Error('The starting configuration has no price in site-config.js');

let html = read('index.html');

// Canonical + social URLs
html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]+(")/i, `$1${siteUrl}$2`);
html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]+(")/i, `$1${siteUrl}$2`);
html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]+(")/i, `$1${abs(config.socialImage)}$2`);
html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]+(")/i, `$1${abs(config.socialImage)}$2`);

// Prices
html = html.replace(/(<span\b[^>]*data-spacia-starting-price[^>]*>)[\s\S]*?(<\/span>)/gi, `$1${startingPrice}$2`);
html = html.replace(/(<span\b[^>]*data-spacia-config-price=["']([^"']+)["'][^>]*>)[\s\S]*?(<\/span>)/gi, (_m, open, configuration, close) => {
  const price = config.prices[configuration];
  if (!price) throw new Error(`Missing configured price for ${configuration}`);
  return `${open}${price}${close}`;
});

// FAQ schema mirrors the visible FAQ exactly.
const decodeHtml = (value) => value
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/\s+/g, ' ')
  .trim();
const faqSection = html.match(/<section\b[^>]*class="[^"]*spacia-faq[^"]*"[\s\S]*?<\/section>/i)?.[0] || '';
const questions = [...faqSection.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/details>/gi)]
  .map((match) => ({ '@type': 'Question', name: decodeHtml(match[1]), acceptedAnswer: { '@type': 'Answer', text: decodeHtml(match[2]) } }))
  .filter((item) => item.name && item.acceptedAnswer.text);
if (!questions.length) throw new Error('No FAQ entries found in index.html');

const title = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)[1]);
const description = decodeHtml(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)[1]);
const id = (fragment) => `${siteUrl}#${fragment}`;

const project = {
  '@type': 'ApartmentComplex',
  '@id': id('project'),
  name: 'Srijan Spacia',
  alternateName: ['SPACIA by Srijan Realty', 'Spacia Madhyamgram'],
  url: siteUrl,
  description: 'Srijan Spacia (SPACIA by Srijan Realty) is a residential and retail development of 3 and 4 BHK flats on Jessore Road South, beside Reliance Mall, Madhyamgram, Kolkata 700129, with 449 apartments across six G+12 towers on 3.6 acres.',
  image: [abs('assets/hero/aerial-dusk-1200.webp'), abs(config.socialImage), abs('assets/optimized/swimming-pool-twilight-hires-900.webp')],
  identifier: config.reraNumber,
  numberOfAccommodationUnits: { '@type': 'QuantitativeValue', value: 449 },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Holding No 28, Jessore Road South, Mouza Doharia, Ward 09, beside Reliance Mall',
    addressLocality: 'Madhyamgram',
    addressRegion: 'West Bengal',
    postalCode: '700129',
    addressCountry: 'IN'
  },
  hasMap: 'https://www.google.com/maps/search/?api=1&query=Srijan+Spacia+Jessore+Road+Madhyamgram',
  amenityFeature: ['Outdoor Gym', 'Butterfly Garden', 'Community Hall', 'Swimming Pool', 'Celebration Lawn', 'Landscaped Lawn', 'Forest Trail', "Senior Citizen's Leisure Garden", '18,000 sq.ft. clubhouse', '29,000+ sq.ft. in-house retail']
    .map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
  additionalProperty: [
    ['Towers', '6 towers, G+12'],
    ['Project area', '3.6 acres'],
    ['Open space', '64%, including podium'],
    ['Configurations', '3 BHK + 2T, 3 BHK + 3T and 4 BHK + 3T'],
    ['Starting price', `${startingPrice} onwards (3 BHK + 2T)`],
    ['IGBC rating', 'Platinum Pre-Certified'],
    ['Developer-advertised possession target', config.developerPossessionTarget],
    ['WBRERA registered completion date', config.reraCompletionDate]
  ].map(([name, value]) => ({ '@type': 'PropertyValue', name, value }))
};
const geo = config.GEO || {};
if (Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude)) {
  project.geo = { '@type': 'GeoCoordinates', latitude: geo.latitude, longitude: geo.longitude };
}

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': id('website'), url: siteUrl, name: 'Srijan Spacia Madhyamgram', inLanguage: 'en-IN' },
    {
      '@type': 'WebPage',
      '@id': id('webpage'),
      url: siteUrl,
      name: title,
      description,
      inLanguage: 'en-IN',
      isPartOf: { '@id': id('website') },
      about: { '@id': id('project') },
      mainEntity: { '@id': id('project') },
      primaryImageOfPage: { '@type': 'ImageObject', url: abs('assets/hero/aerial-dusk-1200.webp'), width: 1200, height: 600 },
      breadcrumb: { '@id': id('breadcrumb') },
      dateModified: lastUpdated
    },
    {
      '@type': 'BreadcrumbList',
      '@id': id('breadcrumb'),
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }]
    },
    {
      '@type': 'Organization',
      '@id': id('developer'),
      name: 'Srijan Realty',
      url: 'https://www.srijanrealty.com/'
    },
    project,
    {
      '@type': 'VideoObject',
      '@id': id('project-reel'),
      name: 'Srijan Spacia project walkthrough reel',
      description: 'A short vertical video showcasing Srijan Spacia by Srijan Realty on Jessore Road, Madhyamgram, Kolkata.',
      thumbnailUrl: abs('assets/video/poster.webp'),
      contentUrl: abs('assets/video/reel.webm'),
      // First published on this site in the commit that added the reel (2026-11-05).
      uploadDate: '2026-11-05T15:55:36+05:30',
      duration: 'PT53S',
      inLanguage: 'en-IN'
    },
    { '@type': 'FAQPage', '@id': id('faq'), url: siteUrl, mainEntity: questions }
  ]
};

const jsonLd = html.match(/(<script\s+id="spacia-structured-data"\s+type="application\/ld\+json">)([\s\S]*?)(<\/script>)/i);
if (!jsonLd) throw new Error('Could not find the JSON-LD block in index.html');
html = html.replace(jsonLd[0], `${jsonLd[1]}\n${JSON.stringify(schema, null, 2)}\n${jsonLd[3]}`);
write('index.html', html);

write('robots.txt', `User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);

const sitemapImages = [
  'assets/hero/aerial-dusk-1200.webp',
  config.socialImage,
  'assets/optimized/swimming-pool-twilight-hires-900.webp',
  'assets/optimized/party-lawn-area-twilight-hires-900.webp',
  'assets/optimized/semi-aerial-total-landscape_day-900.webp',
  'assets/optimized/elevation-day-hires-900.webp',
  'assets/optimized/living-room-hires-final-900.webp',
  'assets/optimized/community-hall-hires-final-900.webp',
  'assets/optimized/aerial-view-dusk-hires-900.webp',
  'assets/optimized/spacia-location-map-1600.webp'
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${today}</lastmod>
${sitemapImages.map((image) => `    <image:image>\n      <image:loc>${abs(image)}</image:loc>\n    </image:image>`).join('\n')}
  </url>
</urlset>
`);

console.log(`SEO files synchronized for ${siteUrl}; ${questions.length} FAQ entries; geo ${project.geo ? 'included' : 'omitted (TODO)'}.`);
