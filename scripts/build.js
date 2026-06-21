#!/usr/bin/env node
// BNETDocs Static — build.js
// Runs via: node scripts/build.js

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────

const ROOT      = path.resolve(__dirname, '..');
const DIST      = path.join(ROOT, 'dist');
const SRC_PUB   = path.join(ROOT, 'src', 'public');
const SRC_CSS   = path.join(ROOT, 'src', 'css');
const SRC_JS    = path.join(ROOT, 'src', 'js');
const SRC_TMPL  = path.join(ROOT, 'src', 'templates');
const DATA      = path.join(ROOT, 'data');

const SITE_URL  = 'https://bnetdocs.org';
const SITE_NAME = 'BNETDocs';
const BASE_URL  = process.env.BASE_URL || '';

// ── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(msg + '\n');
}

function warn(msg) {
  process.stderr.write('WARN: ' + msg + '\n');
}

/** Recursively create a directory (equivalent to mkdir -p). */
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Copy a file, creating dest directories as needed. */
function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/**
 * Copy a content-bearing JSON file, rewriting absolute HTML paths
 * (href="/" and src="/") to include BASE_URL.  In JSON, attribute
 * values are double-quote-escaped, so we match href=\"/ in the raw text.
 */
function copyContentJson(src, dest) {
  mkdirp(path.dirname(dest));
  let content = fs.readFileSync(src, 'utf8');
  if (BASE_URL) {
    content = content
      .replace(/href=\\"\/(?!\/)/g, `href=\\"${BASE_URL}/`)
      .replace(/src=\\"\/(?!\/)/g,  `src=\\"${BASE_URL}/`);
  }
  fs.writeFileSync(dest, content, 'utf8');
}

/**
 * Recursively copy all files from srcDir into destDir,
 * preserving relative subdirectory structure.
 */
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath  = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

/** Read a JSON file; return null and warn on failure. */
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    warn(`Could not read ${filePath}: ${e.message}`);
    return null;
  }
}

/** Strip HTML tags from a string. */
function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .trim();
}

/** Escape a string for safe embedding in HTML attributes. */
function escAttr(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/** Truncate a string to maxLen characters, appending ellipsis if needed. */
function truncate(s, maxLen) {
  s = s.trim();
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…';
}

/** Generate a URL slug from a string. */
function makeSlug(str) {
  return (str || '').toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Template engine ────────────────────────────────────────────────────────

const PAGE_TEMPLATE = fs.readFileSync(path.join(SRC_TMPL, 'page.html'), 'utf8');

/**
 * Fill the page.html template.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} opts.canonicalUrl
 * @param {string} [opts.ogType]
 * @param {object} opts.pageData   — BNETDOCS_PAGE object
 */
function renderPage(opts) {
  const {
    title,
    description,
    canonicalUrl,
    ogType  = 'website',
    pageData,
  } = opts;

  // PAGE_DATA goes into a <script> tag, so use raw JSON — not HTML-escaped.
  // Escape </script> sequences to prevent early tag termination.
  const enrichedPageData = { ...pageData, baseUrl: BASE_URL };
  const pageDataJson = JSON.stringify(enrichedPageData).replace(/<\/script>/gi, '<\\/script>');

  return PAGE_TEMPLATE
    .replace(/\{\{TITLE\}\}/g,         escAttr(title))
    .replace(/\{\{DESCRIPTION\}\}/g,   escAttr(description))
    .replace(/\{\{CANONICAL_URL\}\}/g, escAttr(canonicalUrl))
    .replace(/\{\{OG_TYPE\}\}/g,       escAttr(ogType))
    .replace(/\{\{BASE_URL\}\}/g,      BASE_URL)
    .replace(/\{\{PAGE_DATA\}\}/g,     pageDataJson);
}

/** Write a file to dest, creating parent directories as needed. */
function writeFile(dest, content) {
  mkdirp(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf8');
}

/** Minimal redirect HTML shell. */
function redirectShell(uri) {
  const safe = uri.replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${escAttr(uri)}">
<script>window.location.replace('${safe}');</script>
</head><body></body></html>
`;
}

// ── Step 1: Clean dist/ ────────────────────────────────────────────────────

log('Cleaning dist/...');
if (fs.existsSync(DIST)) {
  fs.rmdirSync(DIST, { recursive: true });
}
mkdirp(DIST);

// ── Step 2: Copy src/public/ → dist/ ──────────────────────────────────────

log('Copying src/public/ → dist/...');
copyDir(SRC_PUB, DIST);

// ── Step 3: Copy CSS ───────────────────────────────────────────────────────

log('Copying CSS...');
const cssSrc  = path.join(SRC_CSS, 'style.css');
const cssDest = path.join(DIST, 'assets', 'css', 'style.css');
if (fs.existsSync(cssSrc)) {
  copyFile(cssSrc, cssDest);
} else {
  warn('src/css/style.css not found, skipping.');
}

// ── Step 4: Copy JS ────────────────────────────────────────────────────────

log('Copying JS...');
copyDir(SRC_JS, path.join(DIST, 'assets', 'js'));

// ── Step 5: Copy data JSON files ───────────────────────────────────────────

log('Copying data JSON files...');

function copyDataFile(srcRel, destRel) {
  const src  = path.join(DATA, srcRel);
  const dest = path.join(DIST, destRel);
  if (fs.existsSync(src)) {
    copyFile(src, dest);
  } else {
    warn(`Data file not found: ${src}`);
  }
}

// Root lookup files (no HTML content, plain copy)
for (const name of ['products.json', 'application-layers.json', 'transport-layers.json', 'news-categories.json']) {
  copyDataFile(name, name);
}

// Index files (contain brief_html — rewrite paths)
copyContentJson(path.join(DATA, 'packets/index.json'),   path.join(DIST, 'packet/index.json'));
copyContentJson(path.join(DATA, 'documents/index.json'), path.join(DIST, 'document/index.json'));

// News index — also expose as news.json for legacy access
const newsIndexSrc  = path.join(DATA, 'news', 'index.json');
const newsIndexDest = path.join(DIST, 'news', 'index.json');
if (fs.existsSync(newsIndexSrc)) {
  copyContentJson(newsIndexSrc, newsIndexDest);
  copyContentJson(newsIndexSrc, path.join(DIST, 'news.json'));
} else {
  warn('data/news/index.json not found, skipping news index copy.');
}

// Individual detail files (contain remarks_html / content_html — rewrite paths)
for (const [subdir, distDir] of [['packets', 'packet'], ['documents', 'document'], ['news', 'news']]) {
  const srcDir = path.join(DATA, subdir);
  if (!fs.existsSync(srcDir)) continue;
  for (const file of fs.readdirSync(srcDir)) {
    if (file === 'index.json') continue;
    if (!file.endsWith('.json')) continue;
    copyContentJson(path.join(srcDir, file), path.join(DIST, distDir, file));
  }
}

// ── Step 6 & 7: Generate HTML shells ──────────────────────────────────────

log('Generating HTML shells...');

// Load index data (may be null if files are missing)
const packetIndex   = readJSON(path.join(DATA, 'packets',   'index.json'));
const documentIndex = readJSON(path.join(DATA, 'documents', 'index.json'));
const newsIndex     = readJSON(path.join(DATA, 'news',      'index.json'));

// ---- Packets ----
const packets = (packetIndex && packetIndex.packets) || [];
for (const p of packets) {
  const hexId    = '0x' + p.packet_id.toString(16).toUpperCase().padStart(2, '0');
  const title    = `${p.packet_name || hexId} (${hexId}) · ${SITE_NAME}`;
  const desc     = truncate(stripHtml(p.brief_html || ''), 160);
  const canonical = `${SITE_URL}${p.uri}/`;

  // Derive slug from the URI the data already provides
  const uriParts = p.uri.split('/').filter(Boolean);
  const slug = uriParts[uriParts.length - 1] || makeSlug(p.packet_name || String(p.id));

  // Detail page: dist/packet/{id}/{slug}/index.html
  const detailHtml = renderPage({
    title,
    description: desc,
    canonicalUrl: canonical,
    ogType: 'article',
    pageData: { type: 'packet', id: p.id },
  });
  writeFile(path.join(DIST, 'packet', String(p.id), slug, 'index.html'), detailHtml);

  // Redirect page: dist/packet/{id}/index.html → full URI
  writeFile(
    path.join(DIST, 'packet', String(p.id), 'index.html'),
    redirectShell(`${p.uri}/`)
  );
}

// ---- Documents ----
const documents = (documentIndex && documentIndex.documents) || [];
for (const d of documents) {
  const title     = `${d.title} · ${SITE_NAME}`;
  const desc      = truncate(stripHtml(d.brief_html || ''), 160);
  const canonical = `${SITE_URL}${d.uri}/`;

  const uriParts = d.uri.split('/').filter(Boolean);
  const slug = uriParts[uriParts.length - 1] || makeSlug(d.title || String(d.id));

  const detailHtml = renderPage({
    title,
    description: desc,
    canonicalUrl: canonical,
    ogType: 'article',
    pageData: { type: 'document', id: d.id },
  });
  writeFile(path.join(DIST, 'document', String(d.id), slug, 'index.html'), detailHtml);

  writeFile(
    path.join(DIST, 'document', String(d.id), 'index.html'),
    redirectShell(`${d.uri}/`)
  );
}

// ---- News ----
const newsPosts = (newsIndex && newsIndex.news_posts) || [];
for (const n of newsPosts) {
  const title     = `${n.title} · ${SITE_NAME}`;
  const desc      = truncate(stripHtml(n.brief_html || ''), 160);
  const canonical = `${SITE_URL}${n.uri}/`;

  const uriParts = n.uri.split('/').filter(Boolean);
  const slug = uriParts[uriParts.length - 1] || makeSlug(n.title || String(n.id));

  const detailHtml = renderPage({
    title,
    description: desc,
    canonicalUrl: canonical,
    ogType: 'article',
    pageData: { type: 'news', id: n.id },
  });
  writeFile(path.join(DIST, 'news', String(n.id), slug, 'index.html'), detailHtml);

  writeFile(
    path.join(DIST, 'news', String(n.id), 'index.html'),
    redirectShell(`${n.uri}/`)
  );
}

// ── Step 7: Index pages ────────────────────────────────────────────────────

log('Generating index pages...');

// Home
writeFile(path.join(DIST, 'index.html'), renderPage({
  title: `${SITE_NAME} — Battle.net Protocol Documentation`,
  description: 'Community-maintained reference for Battle.net and in-game network protocols.',
  canonicalUrl: `${SITE_URL}/`,
  ogType: 'website',
  pageData: { type: 'home' },
}));

// Packet index
writeFile(path.join(DIST, 'packet', 'index.html'), renderPage({
  title: `Packets · ${SITE_NAME}`,
  description: 'Browse Battle.net packet documentation for BNCS, MCP, D2GS, W3GS, BNLS, and more.',
  canonicalUrl: `${SITE_URL}/packet/`,
  ogType: 'website',
  pageData: { type: 'packet-list' },
}));

// Document index
writeFile(path.join(DIST, 'document', 'index.html'), renderPage({
  title: `Documents · ${SITE_NAME}`,
  description: 'Browse Battle.net protocol reference documents.',
  canonicalUrl: `${SITE_URL}/document/`,
  ogType: 'website',
  pageData: { type: 'document-list' },
}));

// News index
writeFile(path.join(DIST, 'news', 'index.html'), renderPage({
  title: `News · ${SITE_NAME}`,
  description: 'Latest news and updates from BNETDocs.',
  canonicalUrl: `${SITE_URL}/news/`,
  ogType: 'website',
  pageData: { type: 'news-list' },
}));

// Search
writeFile(path.join(DIST, 'search', 'index.html'), renderPage({
  title: `Search · ${SITE_NAME}`,
  description: 'Search BNETDocs packets, documents, and news.',
  canonicalUrl: `${SITE_URL}/search/`,
  ogType: 'website',
  pageData: { type: 'search' },
}));

// ── Step 8: Static content pages ──────────────────────────────────────────

log('Generating static content pages...');

const staticPages = [
  { key: 'credits', label: 'Credits',        desc: 'Credits and acknowledgments for BNETDocs contributors.' },
  { key: 'discord', label: 'Discord',         desc: 'Join the BNETDocs Discord server.' },
  { key: 'donate',  label: 'Donate',          desc: 'Support BNETDocs development.' },
  { key: 'privacy', label: 'Privacy Policy',  desc: 'BNETDocs privacy policy.' },
  { key: 'legal',   label: 'Legal',           desc: 'Legal information for BNETDocs.' },
];

for (const sp of staticPages) {
  writeFile(path.join(DIST, sp.key, 'index.html'), renderPage({
    title: `${sp.label} · ${SITE_NAME}`,
    description: sp.desc,
    canonicalUrl: `${SITE_URL}/${sp.key}/`,
    ogType: 'website',
    pageData: { type: 'static', page: sp.key },
  }));
}

// ── Step 9: 404 page ──────────────────────────────────────────────────────

log('Generating 404.html...');
writeFile(path.join(DIST, '404.html'), renderPage({
  title: `Page Not Found · ${SITE_NAME}`,
  description: 'The requested page could not be found.',
  canonicalUrl: `${SITE_URL}/`,
  ogType: 'website',
  pageData: { type: 'not-found' },
}));

// ── Step 10: RSS feed ──────────────────────────────────────────────────────

log('Generating news.rss...');

function rfcDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toUTCString();
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

let rssItems = '';
for (const n of newsPosts) {
  const flags = n.options_bitmask || 0;
  if (!(flags & 0x2)) continue; // skip unpublished
  const link = `${SITE_URL}${n.uri}/`;
  rssItems += `    <item>
      <title>${escXml(n.title)}</title>
      <link>${escXml(link)}</link>
      <description>${escXml(stripHtml(n.brief_html || ''))}</description>
      <pubDate>${rfcDate(n.created_datetime)}</pubDate>
      <guid isPermaLink="true">${escXml(link)}</guid>
    </item>\n`;
}

const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>Battle.net &amp; in-game protocol documentation, preserved.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/news.rss" rel="self" type="application/rss+xml"/>
${rssItems}  </channel>
</rss>
`;
writeFile(path.join(DIST, 'news.rss'), rssFeed);

// ── Step 11: Search index ──────────────────────────────────────────────────

log('Generating search index...');
const searchIndex = [];

for (const p of packets) {
  const hexId = '0x' + p.packet_id.toString(16).toUpperCase().padStart(2, '0');
  searchIndex.push({
    type:  'packet',
    url:   p.uri + '/',
    title: p.packet_name ? `${p.packet_name} (${hexId})` : hexId,
    body:  stripHtml(p.brief_html || ''),
    hex:   hexId,
  });
}

for (const d of documents) {
  searchIndex.push({
    type:  'document',
    url:   d.uri + '/',
    title: d.title || '',
    body:  stripHtml(d.brief_html || ''),
  });
}

for (const n of newsPosts) {
  searchIndex.push({
    type:  'news',
    url:   n.uri + '/',
    title: n.title || '',
    body:  stripHtml(n.brief_html || ''),
  });
}

writeFile(path.join(DIST, 'search-index.json'), JSON.stringify(searchIndex));

// ── Done ───────────────────────────────────────────────────────────────────

log('');
log('Build complete. Output: dist/');
log(`  Packets:   ${packets.length}`);
log(`  Documents: ${documents.length}`);
log(`  News:      ${newsPosts.length}`);
