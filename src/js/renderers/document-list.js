export default async function({ root, page, fetchJSON }) {
  const baseUrl = page.baseUrl || '';
  const data = await fetchJSON('/document/index.json');
  const documents = data.documents || [];

  root.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="mb-0">Documents</h4>
    </div>
    <div class="mb-3">
      <input type="search" class="form-control form-control-sm" id="bd-doc-search" placeholder="Search documents...">
    </div>
    <div class="table-responsive">
      <table class="table table-sm bd-table">
        <thead>
          <tr>
            <th class="bd-sortable" data-sort="title" style="cursor:pointer;">Title <span class="sort-icon"></span></th>
            <th class="bd-brief-col">Brief</th>
            <th class="bd-sortable" data-sort="author" style="cursor:pointer;">Author <span class="sort-icon"></span></th>
            <th class="bd-sortable" data-sort="date" style="cursor:pointer;">Date <span class="sort-icon"></span></th>
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
    const briefText = stripHtml(doc.brief_html || '');

    const tr = document.createElement('tr');
    tr.dataset.title  = (doc.title || '').toLowerCase();
    tr.dataset.brief  = briefText.toLowerCase();
    tr.dataset.author = (doc.author_username || '').toLowerCase();
    tr.dataset.date   = doc.created_datetime || '';
    tr.innerHTML = `
      <td><a href="${escHtml(baseUrl + doc.uri)}/">${escHtml(doc.title)}</a> ${statusBadges}</td>
      <td class="bd-brief-col text-muted small">${escHtml(briefText.slice(0, 80))}${briefText.length > 80 ? '…' : ''}</td>
      <td class="text-nowrap">${escHtml(doc.author_username || 'unknown')}</td>
      <td class="text-nowrap text-muted small">${escHtml(created)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Search filter
  function applyFilter() {
    const val = document.getElementById('bd-doc-search').value.toLowerCase();
    let count = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const match = !val || tr.dataset.title.includes(val) || tr.dataset.brief.includes(val);
      tr.style.display = match ? '' : 'none';
      if (match) count++;
    });
    document.getElementById('bd-no-results').style.display = count === 0 ? '' : 'none';
  }

  document.getElementById('bd-doc-search').addEventListener('input', applyFilter);

  // Sortable columns
  let sortCol = null;
  let sortAsc = true;

  document.querySelectorAll('.bd-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortCol === col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = col;
        sortAsc = true;
      }
      document.querySelectorAll('.bd-sortable .sort-icon').forEach(el => el.textContent = '');
      th.querySelector('.sort-icon').textContent = sortAsc ? ' ▲' : ' ▼';

      const rows = [...tbody.querySelectorAll('tr')];
      rows.sort((a, b) => {
        const va = a.dataset[col] || '';
        const vb = b.dataset[col] || '';
        const cmp = va.localeCompare(vb, undefined, { numeric: col === 'date' });
        return sortAsc ? cmp : -cmp;
      });
      rows.forEach(r => tbody.appendChild(r));
      applyFilter();
    });
  });
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
