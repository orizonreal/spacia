// Run with `node tools/generate-seo.js` after changing siteUrl or prices
// in userassets/js/site-config.js. This keeps static SEO files in sync.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, contents) => fs.writeFileSync(path.join(root, name), contents, 'utf8');
const configText = read('userassets/js/site-config.js');
const configContext = { window: {} };
vm.runInNewContext(configText, configContext);
const config = configContext.window.SPACIA_CONFIG;
if (!config) throw new Error('Could not read SPACIA_CONFIG from userassets/js/site-config.js');
const siteUrl = new URL(config.siteUrl).href;
const origin = new URL(siteUrl).origin;
let html = read('index.html');
const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
const previousOrigin = canonicalMatch ? new URL(canonicalMatch[1]).origin : origin;
const startingPrice = `${config.prices[config.startingConfiguration]}* onwards`;
if (!config.prices[config.startingConfiguration]) throw new Error('The starting configuration has no price in site-config.js');

html = html.replaceAll(previousOrigin, origin);
html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]+("\s*>)/i, `$1${siteUrl}$2`);
html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]+("\s*>)/i, `$1${siteUrl}$2`);
const socialImage = new URL(config.socialImage, siteUrl).href;
html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]+("\s*>)/i, `$1${socialImage}$2`);
html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]+("\s*>)/i, `$1${socialImage}$2`);
html = html.replace(/(<span\b[^>]*data-spacia-starting-price[^>]*>)[\s\S]*?(<\/span>)/gi, (_match, open, close) => `${open}${startingPrice}${close}`);
html = html.replace(/(<span\b[^>]*data-spacia-config-price=["']([^"']+)["'][^>]*>)[\s\S]*?(<\/span>)/gi, (_match, open, configuration, close) => {
  const price = config.prices[configuration];
  if (!price) throw new Error(`Missing configured price for ${configuration}`);
  return `${open}${price}${close}`;
});

const decodeHtml = (value) => value
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .trim();
const faqSection = html.match(/<section\b[^>]*class="[^"]*spacia-faq[^"]*"[\s\S]*?<\/section>/i)?.[0] || '';
const questions = [...faqSection.matchAll(/<details\b[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/details>/gi)]
  .map((match) => ({
    '@type': 'Question',
    name: decodeHtml(match[1]),
    acceptedAnswer: { '@type': 'Answer', text: decodeHtml(match[2]) }
  }))
  .filter((item) => item.name && item.acceptedAnswer.text);

const jsonLdMatch = html.match(/(<script\s+id="spacia-structured-data"\s+type="application\/ld\+json">)([\s\S]*?)(<\/script>)/i);
if (!jsonLdMatch) throw new Error('Could not find SPACIA JSON-LD in index.html');
const schema = JSON.parse(jsonLdMatch[2]);
schema['@graph'] = (schema['@graph'] || []).map((item) => {
  for (const key of ['@id', 'url', 'image', 'thumbnailUrl', 'contentUrl']) {
    if (typeof item[key] === 'string') item[key] = item[key].replaceAll(previousOrigin, origin);
  }
  if (['WebSite', 'WebPage', 'ApartmentComplex'].includes(item['@type'])) item.url = siteUrl;
  return item;
}).filter((item) => item['@type'] !== 'FAQPage');
schema['@graph'].push({ '@type': 'FAQPage', '@id': `${siteUrl}#faq`, url: siteUrl, mainEntity: questions });
html = html.replace(jsonLdMatch[0], `${jsonLdMatch[1]}\n${JSON.stringify(schema, null, 2)}\n${jsonLdMatch[3]}`);
write('index.html', html);

write('robots.txt', `User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`);
const currentDate = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}</loc>\n    <lastmod>${currentDate}</lastmod>\n  </url>\n</urlset>\n`);
let llms = read('llms.txt').replaceAll(previousOrigin, origin);
llms = llms.replace(/^- Project website: .*$/m, `- Project website: ${siteUrl}`);
write('llms.txt', llms);
console.log(`SEO files synchronized for ${siteUrl}; ${questions.length} FAQ entries included.`);
