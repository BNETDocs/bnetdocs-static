// BNETDocs Static — app.js entry point

// Keyboard shortcut: '/' focuses search
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== document.getElementById('bd-search-input')) {
    e.preventDefault();
    document.getElementById('bd-search-input').focus();
  }
});

// Search form: redirect to /search/#query on submit
document.getElementById('bd-search-form').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('bd-search-input').value.trim();
  if (q) window.location.href = '/search/#' + encodeURIComponent(q);
});

const page = window.BNETDOCS_PAGE;
const root = document.getElementById('bd-root');
const loading = document.getElementById('bd-loading');

// Fetch helper with error handling
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

// Lazy-load lookup tables once
let _lookup = null;
async function getLookup() {
  if (_lookup) return _lookup;
  const [products, appLayers, transLayers, newsCategories] = await Promise.all([
    fetchJSON('/products.json'),
    fetchJSON('/application-layers.json'),
    fetchJSON('/transport-layers.json'),
    fetchJSON('/news-categories.json'),
  ]);
  _lookup = {
    products: Object.fromEntries(products.map(p => [p.bnet_product_id, p])),
    appLayers: Object.fromEntries(appLayers.map(l => [l.id, l])),
    transLayers: Object.fromEntries(transLayers.map(l => [l.id, l])),
    newsCategories: Object.fromEntries(newsCategories.map(c => [c.id, c])),
  };
  return _lookup;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function run() {
  const renderers = {
    'packet':        () => import('./renderers/packet.js'),
    'packet-list':   () => import('./renderers/packet-list.js'),
    'document':      () => import('./renderers/document.js'),
    'document-list': () => import('./renderers/document-list.js'),
    'news':          () => import('./renderers/news.js'),
    'news-list':     () => import('./renderers/news-list.js'),
    'search':        () => import('./renderers/search.js'),
    'home':          () => import('./renderers/home.js'),
    'not-found':     () => import('./renderers/not-found.js'),
    'static':        () => import('./renderers/static-page.js'),
  };

  const loader = renderers[page.type] || renderers['not-found'];
  const mod = await loader();
  await mod.default({ root, page, fetchJSON, getLookup });
  loading.style.display = 'none';
  root.style.display = '';
}

run().catch(err => {
  console.error(err);
  loading.style.display = 'none';
  root.style.display = '';
  root.innerHTML = `<div class="alert alert-danger mt-3">
    <strong>Error loading page:</strong> ${escHtml(err.message)}
    <br><a href="/">Return to home</a>
  </div>`;
});

export { fetchJSON, getLookup, escHtml };
