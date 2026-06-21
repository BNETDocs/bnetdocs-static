export default async function({ root, fetchJSON }) {
  const data = await fetchJSON('/document/index.json');
  const documents = data.documents || [];

  root.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="mb-0">Documents</h4>
    </div>
    <div class="mb-3">
      <input type="search" class="form-control form-control-sm" id="bd-doc-search" placeholder="Search document titles...">
    </div>
    <div class="table-responsive">
      <table class="table table-sm bd-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="bd-doc-tbody">
        </tbody>
      </table>
      <p id="bd-no-results" class="text-muted text-center py-4" style="display:none;">No documents match your search.</p>
    </div>
  `;

  const tbody = document.getElementById('bd-doc-tbody');

  documents.forEach(doc => {
    const flags = doc.options_bitmask || 0;
    const isDeprecated = !!(flags & 0x4);
    const isResearch   = !!(flags & 0x8);
    const isDraft      = !!(flags & 0x10);

    const statusBadges = [
      isDeprecated ? '<span class="badge badge-warning mr-1" style="font-size:0.65rem;">Deprecated</span>' : '',
      isResearch   ? '<span class="badge badge-info mr-1" style="font-size:0.65rem;">Research</span>' : '',
      isDraft      ? '<span class="badge badge-secondary mr-1" style="font-size:0.65rem;">Draft</span>' : '',
    ].join('');

    const created = doc.created_datetime
      ? new Date(doc.created_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';

    const tr = document.createElement('tr');
    tr.dataset.title = (doc.title || '').toLowerCase();
    tr.innerHTML = `
      <td><a href="${escHtml(doc.uri)}/">${escHtml(doc.title)}</a> ${statusBadges}</td>
      <td class="text-nowrap">${escHtml(doc.author_username || 'unknown')}</td>
      <td class="text-nowrap text-muted small">${escHtml(created)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Search filter
  document.getElementById('bd-doc-search').addEventListener('input', e => {
    const val = e.target.value.toLowerCase();
    let count = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const match = !val || tr.dataset.title.includes(val);
      tr.style.display = match ? '' : 'none';
      if (match) count++;
    });
    document.getElementById('bd-no-results').style.display = count === 0 ? '' : 'none';
  });
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
