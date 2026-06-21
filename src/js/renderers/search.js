export default async function({ root, page }) {
  const baseUrl = page.baseUrl || '';

  // Accept query from either hash (#q) or query string (?q=)
  const hashQuery = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : '';
  const urlQuery  = new URLSearchParams(window.location.search).get('q') || '';
  const query     = hashQuery || urlQuery;

  root.innerHTML = `
    <h4 class="mb-4">Search</h4>
    <input type="search" id="bd-search-main" class="form-control mb-4"
      placeholder="Search packets, documents, news..." value="${escHtml(query)}">
    <div id="bd-search-results"></div>
  `;

  const input   = document.getElementById('bd-search-main');
  const results = document.getElementById('bd-search-results');

  let pagefind;
  try {
    pagefind = await import(baseUrl + '/pagefind/pagefind.js');
    if (pagefind.options) await pagefind.options({ bundlePath: baseUrl + '/pagefind/' });
    await pagefind.init();
  } catch {
    results.innerHTML = '<p class="text-muted">Search index not available.</p>';
    return;
  }

  async function doSearch(q) {
    window.location.hash = q ? encodeURIComponent(q) : '';
    if (!q) { results.innerHTML = ''; return; }

    results.innerHTML = '<p class="text-muted small">Searching…</p>';
    const res = await pagefind.search(q);

    if (!res.results.length) {
      results.innerHTML = '<p class="text-muted">No results found.</p>';
      return;
    }

    const items = await Promise.all(res.results.slice(0, 20).map(r => r.data()));
    results.innerHTML = items.map(r => `
      <div class="bd-search-result mb-3">
        <a href="${escHtml(r.url)}" class="font-weight-bold">${r.meta.title || r.url}</a>
        <div class="small text-muted mt-1">${r.excerpt}</div>
      </div>
    `).join('');
  }

  input.addEventListener('input', e => doSearch(e.target.value.trim()));
  if (query) {
    input.focus();
    doSearch(query);
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
