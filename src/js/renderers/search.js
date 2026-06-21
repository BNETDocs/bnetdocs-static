export default async function({ root, page, fetchJSON }) {
  const baseUrl = page.baseUrl || '';

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

  let searchIndex;
  try {
    searchIndex = await fetchJSON('/search-index.json');
  } catch {
    results.innerHTML = '<p class="text-muted">Search index not available.</p>';
    return;
  }

  const TYPE_LABEL = { packet: 'Packet', document: 'Document', news: 'News' };
  const TYPE_BADGE = { packet: 'badge-info', document: 'badge-secondary', news: 'badge-primary' };

  function doSearch(q) {
    if (!q) { results.innerHTML = ''; return; }

    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

    const titleHits = [];
    const bodyHits  = [];
    for (const item of searchIndex) {
      const titleText = (item.title + ' ' + (item.hex || '')).toLowerCase();
      const fullText  = (titleText + ' ' + (item.body || '')).toLowerCase();
      if (terms.every(t => titleText.includes(t))) {
        titleHits.push(item);
      } else if (terms.every(t => fullText.includes(t))) {
        bodyHits.push(item);
      }
    }

    const matches = [...titleHits, ...bodyHits];
    if (!matches.length) {
      results.innerHTML = '<p class="text-muted">No results found.</p>';
      return;
    }

    results.innerHTML = matches.slice(0, 30).map(r => {
      const badge = `<span class="badge ${TYPE_BADGE[r.type] || 'badge-secondary'} mr-1">${TYPE_LABEL[r.type] || r.type}</span>`;
      const excerpt = r.body ? `<div class="small text-muted mt-1">${escHtml(r.body.slice(0, 150))}${r.body.length > 150 ? '…' : ''}</div>` : '';
      return `
        <div class="bd-search-result mb-3">
          <div>${badge}<a href="${escHtml(baseUrl + r.url)}" class="font-weight-bold">${escHtml(r.title)}</a></div>
          ${excerpt}
        </div>`;
    }).join('');
  }

  // Update the URL hash after the user pauses typing — debounced to stay
  // well within browser replaceState rate limits (Firefox: 50/30s).
  let urlTimer;
  function scheduleUrlUpdate(q) {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const url = window.location.pathname + window.location.search + (q ? '#' + encodeURIComponent(q) : '');
      try { history.replaceState(null, '', url); } catch (_) {}
    }, 400);
  }

  input.addEventListener('input', e => {
    const q = e.target.value.trim();
    doSearch(q);
    scheduleUrlUpdate(q);
  });

  if (query) {
    input.focus();
    doSearch(query);
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
