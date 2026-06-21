export default async function({ root, page, fetchJSON, getLookup }) {
  const baseUrl = page.baseUrl || '';
  const [data, lookup] = await Promise.all([
    fetchJSON('/packet/index.json'),
    getLookup(),
  ]);

  const packets = data.packets || [];

  // Build unique sorted list of application layers present in the data
  const layerIds = [...new Set(packets.map(p => p.packet_application_layer_id))].sort((a, b) => a - b);
  const layerCheckboxes = layerIds.map(id => {
    const label = (lookup.appLayers[id] || { label: `Layer ${id}` }).label;
    return `
      <div class="form-check">
        <input class="form-check-input bd-filter-layer" type="checkbox" value="${id}" id="layer-${id}" checked>
        <label class="form-check-label" for="layer-${id}">${escHtml(label)}</label>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="mb-0">Packets</h4>
      <button class="bd-filter-toggle d-lg-none" id="bd-filter-toggle-btn">Filters</button>
    </div>
    <div class="row">
      <div class="col-lg-2 mb-3 mb-lg-0" id="bd-sidebar-wrapper">
        <aside class="bd-filter-sidebar" id="bd-sidebar">
          <div class="bd-filter-section">
            <h6>Search</h6>
            <input type="search" class="form-control form-control-sm" id="bd-packet-search" placeholder="Name or ID...">
          </div>
          <div class="bd-filter-section">
            <h6>Protocol</h6>
            ${layerCheckboxes}
          </div>
          <div class="bd-filter-section">
            <h6>Direction</h6>
            <div class="form-check">
              <input class="form-check-input bd-filter-dir" type="checkbox" value="1" id="dir-1" checked>
              <label class="form-check-label" for="dir-1">Client → Server</label>
            </div>
            <div class="form-check">
              <input class="form-check-input bd-filter-dir" type="checkbox" value="2" id="dir-2" checked>
              <label class="form-check-label" for="dir-2">Server → Client</label>
            </div>
            <div class="form-check">
              <input class="form-check-input bd-filter-dir" type="checkbox" value="3" id="dir-3" checked>
              <label class="form-check-label" for="dir-3">Peer → Peer</label>
            </div>
            <div class="form-check">
              <input class="form-check-input bd-filter-dir" type="checkbox" value="4" id="dir-4" checked>
              <label class="form-check-label" for="dir-4">Bidirectional</label>
            </div>
          </div>
          <div class="bd-filter-section">
            <h6>Status</h6>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="show-deprecated" checked>
              <label class="form-check-label" for="show-deprecated">Show Deprecated</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="show-research" checked>
              <label class="form-check-label" for="show-research">Show In Research</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="show-draft" checked>
              <label class="form-check-label" for="show-draft">Show Draft</label>
            </div>
          </div>
        </aside>
      </div>
      <div class="col-lg-10">
        <div class="table-responsive">
          <table class="table table-sm bd-table" id="bd-packet-table">
            <thead>
              <tr>
                <th class="bd-sortable" data-sort="packetId" style="cursor:pointer;">ID <span class="sort-icon"></span></th>
                <th class="bd-sortable" data-sort="name" style="cursor:pointer;">Name <span class="sort-icon"></span></th>
                <th class="bd-sortable" data-sort="dirLabel" style="cursor:pointer;">Direction <span class="sort-icon"></span></th>
                <th class="bd-sortable" data-sort="layerLabel" style="cursor:pointer;">Protocol <span class="sort-icon"></span></th>
                <th class="bd-brief-col">Brief</th>
              </tr>
            </thead>
            <tbody id="bd-packet-tbody">
            </tbody>
          </table>
          <p id="bd-no-results" class="text-muted text-center py-4" style="display:none;">No packets match the current filters.</p>
        </div>
      </div>
    </div>
  `;

  // Render all rows up front
  const tbody = document.getElementById('bd-packet-tbody');
  const directions = { 1: 'Client → Server', 2: 'Server → Client', 3: 'Peer → Peer', 4: 'Bidirectional' };

  packets.forEach(p => {
    const flags = p.options_bitmask || 0;
    const hexId = '0x' + p.packet_id.toString(16).toUpperCase().padStart(2, '0');
    const appLayer = (lookup.appLayers[p.packet_application_layer_id] || { label: '' }).label;
    const dirLabel = directions[p.packet_direction_id] || '';
    const briefText = stripHtml(p.brief_html || '');

    const statusBadges = [
      (flags & 0x4) ? '<span class="badge badge-warning mr-1" style="font-size:0.65rem;">D</span>' : '',
      (flags & 0x8) ? '<span class="badge badge-info mr-1" style="font-size:0.65rem;">R</span>' : '',
      (flags & 0x10) ? '<span class="badge badge-secondary mr-1" style="font-size:0.65rem;">Draft</span>' : '',
    ].join('');

    const tr = document.createElement('tr');
    tr.dataset.packetId  = p.packet_id;
    tr.dataset.layerId   = p.packet_application_layer_id;
    tr.dataset.layerLabel = appLayer.toLowerCase();
    tr.dataset.dirId     = p.packet_direction_id;
    tr.dataset.dirLabel  = dirLabel.toLowerCase();
    tr.dataset.flags     = flags;
    tr.dataset.name      = (p.packet_name || hexId).toLowerCase();
    tr.dataset.hexId     = hexId.toLowerCase();

    tr.innerHTML = `
      <td class="mono text-nowrap">${escHtml(hexId)}</td>
      <td class="mono"><a href="${escHtml(baseUrl + p.uri)}/">${escHtml(p.packet_name || hexId)}</a> ${statusBadges}</td>
      <td class="text-nowrap">${escHtml(dirLabel)}</td>
      <td class="text-nowrap">${escHtml(appLayer)}</td>
      <td class="bd-brief-col text-muted small">${escHtml(briefText.slice(0, 80))}${briefText.length > 80 ? '…' : ''}</td>
    `;
    tbody.appendChild(tr);
  });

  // Filter logic
  function applyFilters() {
    const searchVal = document.getElementById('bd-packet-search').value.toLowerCase();
    const checkedLayers = new Set(
      [...document.querySelectorAll('.bd-filter-layer:checked')].map(el => parseInt(el.value))
    );
    const checkedDirs = new Set(
      [...document.querySelectorAll('.bd-filter-dir:checked')].map(el => parseInt(el.value))
    );
    const showDeprecated = document.getElementById('show-deprecated').checked;
    const showResearch   = document.getElementById('show-research').checked;
    const showDraft      = document.getElementById('show-draft').checked;

    let visibleCount = 0;
    tbody.querySelectorAll('tr').forEach(tr => {
      const layerId = parseInt(tr.dataset.layerId);
      const dirId   = parseInt(tr.dataset.dirId);
      const flags   = parseInt(tr.dataset.flags);

      const isDeprecated = !!(flags & 0x4);
      const isResearch   = !!(flags & 0x8);
      const isDraft      = !!(flags & 0x10);

      const matchesSearch = !searchVal
        || tr.dataset.name.includes(searchVal)
        || tr.dataset.hexId.includes(searchVal);

      const visible = checkedLayers.has(layerId)
        && checkedDirs.has(dirId)
        && (!isDeprecated || showDeprecated)
        && (!isResearch   || showResearch)
        && (!isDraft      || showDraft)
        && matchesSearch;

      tr.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    document.getElementById('bd-no-results').style.display = visibleCount === 0 ? '' : 'none';
  }

  // Attach filter listeners
  document.getElementById('bd-packet-search').addEventListener('input', applyFilters);
  document.querySelectorAll('.bd-filter-layer, .bd-filter-dir, #show-deprecated, #show-research, #show-draft')
    .forEach(el => el.addEventListener('change', applyFilters));

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
        const na = parseFloat(va);
        const nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
        const cmp = va.localeCompare(vb);
        return sortAsc ? cmp : -cmp;
      });
      rows.forEach(r => tbody.appendChild(r));
      applyFilters();
    });
  });

  // Check for layer filter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const layerParam = urlParams.get('layer');
  if (layerParam) {
    document.querySelectorAll('.bd-filter-layer').forEach(el => {
      el.checked = el.value === layerParam;
    });
    applyFilters();
  }

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('bd-filter-toggle-btn');
  const sidebar   = document.getElementById('bd-sidebar');
  let sidebarOpen = false;
  if (toggleBtn) {
    sidebar.style.display = 'none';
    toggleBtn.addEventListener('click', () => {
      sidebarOpen = !sidebarOpen;
      sidebar.style.display = sidebarOpen ? '' : 'none';
      toggleBtn.textContent = sidebarOpen ? 'Hide Filters' : 'Filters';
    });
    // On desktop always show
    const mq = window.matchMedia('(min-width: 992px)');
    const onMq = e => { sidebar.style.display = e.matches ? '' : (sidebarOpen ? '' : 'none'); };
    mq.addEventListener('change', onMq);
    onMq(mq);
  }
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
