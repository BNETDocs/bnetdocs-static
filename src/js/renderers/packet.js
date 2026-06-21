export default async function({ root, page, fetchJSON, getLookup }) {
  const baseUrl = page.baseUrl || '';
  const [packet, lookup] = await Promise.all([
    fetchJSON(`/packet/${page.id}.json`),
    getLookup(),
  ]);

  const appLayer  = lookup.appLayers[packet.packet_application_layer_id]  || { label: 'Unknown' };
  const transLayer = lookup.transLayers[packet.packet_transport_layer_id] || { label: 'Unknown' };
  const hexId = '0x' + packet.packet_id.toString(16).toUpperCase().padStart(2, '0');

  const flags = packet.options_bitmask || 0;
  const isDeprecated = !!(flags & 0x4);
  const isResearch   = !!(flags & 0x8);
  const isDraft      = !!(flags & 0x10);

  const directions = { 1: 'Client → Server', 2: 'Server → Client', 3: 'Peer → Peer', 4: 'Bidirectional' };
  const dirLabel = directions[packet.packet_direction_id] || 'Unknown';

  const usedByHtml = (packet.used_by || []).map(id => {
    const p = lookup.products[id];
    return p ? `<span class="badge badge-secondary mr-1">${escHtml(p.label)}</span>` : '';
  }).join('');

  const badges = [
    isDeprecated ? `<span class="badge badge-warning mr-1">Deprecated</span>` : '',
    isResearch   ? `<span class="badge badge-info mr-1">In Research</span>` : '',
    isDraft      ? `<span class="badge badge-secondary mr-1">Draft</span>` : '',
  ].join('');

  const formatBlock = packet.format
    ? `<div class="packet-format mb-3">
        <button class="copy-btn" onclick="copyFormat(this)" title="Copy to clipboard">Copy</button>
        <pre class="mb-0"><code class="language-csharp">${escHtml(packet.format)}</code></pre>
       </div>`
    : '<p class="text-muted font-italic">No format documented.</p>';

  const commentsHtml = renderComments(packet.comments || []);

  const created = packet.created_datetime
    ? new Date(packet.created_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const edited = packet.edited_datetime
    ? new Date(packet.edited_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  root.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb bd-breadcrumb">
        <li class="breadcrumb-item"><a href="${baseUrl}/packet/">Packets</a></li>
        <li class="breadcrumb-item"><a href="${baseUrl}/packet/?layer=${packet.packet_application_layer_id}">${escHtml(appLayer.label)}</a></li>
        <li class="breadcrumb-item active">${escHtml(packet.packet_name || hexId)}</li>
      </ol>
    </nav>
    <div class="row">
      <div class="col-lg-8">
        <h2 class="mono font-weight-bold mb-1">${escHtml(packet.packet_name || hexId)}</h2>
        <div class="mb-3">${badges}</div>
        ${packet.brief_html || ''}
        <h5 class="text-muted mt-4 mb-2">Packet Format</h5>
        ${formatBlock}
        ${packet.remarks_html ? `<h5 class="text-muted mt-4 mb-2">Remarks</h5><div class="bd-remarks">${packet.remarks_html}</div>` : ''}
        <hr>
        <h5 class="text-muted mt-4 mb-2">Comments <span class="text-muted small">(read-only archive)</span></h5>
        ${commentsHtml}
        <p class="mt-2"><a href="https://discord.gg/u87WVeu" class="btn btn-sm btn-outline-info">Discuss on Discord</a></p>
      </div>
      <div class="col-lg-4">
        <div class="bd-meta-card card mb-3">
          <div class="card-body">
            <h6 class="card-title text-muted text-uppercase small mb-3">Packet Info</h6>
            <dl class="row mb-0 small">
              <dt class="col-6">Message ID</dt>
              <dd class="col-6 mono">${escHtml(hexId)}</dd>
              <dt class="col-6">Direction</dt>
              <dd class="col-6">${escHtml(dirLabel)}</dd>
              <dt class="col-6">Protocol</dt>
              <dd class="col-6">${escHtml(appLayer.label)}</dd>
              <dt class="col-6">Transport</dt>
              <dd class="col-6">${escHtml(transLayer.label)}</dd>
              ${usedByHtml ? `<dt class="col-6">Used by</dt><dd class="col-6">${usedByHtml}</dd>` : ''}
              <dt class="col-6">Author</dt>
              <dd class="col-6">${escHtml(packet.author_username || 'unknown')}</dd>
              <dt class="col-6">Added</dt>
              <dd class="col-6">${escHtml(created)}</dd>
              ${edited ? `<dt class="col-6">Edited</dt><dd class="col-6">${escHtml(edited)}</dd>` : ''}
            </dl>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.hljs) {
    root.querySelectorAll('pre code').forEach(el => {
      if (!el.className) el.classList.add('language-csharp');
      hljs.highlightElement(el);
    });
  }
}

function renderComments(comments) {
  if (!comments.length) return '<p class="text-muted small">No comments.</p>';
  return comments.map(c => `
    <div class="bd-comment mb-3">
      <div class="small text-muted mb-1">
        <strong>${escHtml(c.author_username || 'unknown')}</strong>
        &middot;
        ${new Date(c.created_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </div>
      <div class="bd-comment-body">${c.content_html || ''}</div>
    </div>
  `).join('');
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.copyFormat = function(btn) {
  const code = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
};
