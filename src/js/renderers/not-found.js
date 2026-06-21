export default async function({ root, fetchJSON }) {
  const path = window.location.pathname;

  const packetMatch  = path.match(/^\/packet\/(\d+)/);
  const docMatch     = path.match(/^\/document\/(\d+)/);
  const newsMatch    = path.match(/^\/news\/(\d+)/);

  if (packetMatch) {
    try {
      const data = await fetchJSON('/packet/index.json');
      const p = (data.packets || []).find(x => x.id === parseInt(packetMatch[1]));
      if (p) { window.location.replace(p.uri + '/'); return; }
    } catch {}
  }

  if (docMatch) {
    try {
      const data = await fetchJSON('/document/index.json');
      const d = (data.documents || []).find(x => x.id === parseInt(docMatch[1]));
      if (d) { window.location.replace(d.uri + '/'); return; }
    } catch {}
  }

  if (newsMatch) {
    try {
      const data = await fetchJSON('/news/index.json');
      const n = (data.news_posts || []).find(x => x.id === parseInt(newsMatch[1]));
      if (n) { window.location.replace(n.uri + '/'); return; }
    } catch {}
  }

  root.innerHTML = `
    <div class="text-center py-5">
      <h1 class="display-4">404</h1>
      <p class="lead text-muted">Page not found.</p>
      <p class="text-muted mb-4"><code>${escHtml(window.location.pathname)}</code></p>
      <a href="/" class="btn btn-outline-info mr-2">Home</a>
      <a href="/packet/" class="btn btn-outline-secondary mr-2">Packets</a>
      <a href="/document/" class="btn btn-outline-secondary">Documents</a>
    </div>
  `;
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
