export default async function({ root, page, fetchJSON }) {
  const baseUrl = page.baseUrl || '';
  const doc = await fetchJSON(`/document/${page.id}.json`);

  const flags = doc.options_bitmask || 0;
  const isDeprecated = !!(flags & 0x4);
  const isResearch   = !!(flags & 0x8);
  const isDraft      = !!(flags & 0x10);

  const badges = [
    isDeprecated ? `<span class="badge badge-warning mr-1">Deprecated</span>` : '',
    isResearch   ? `<span class="badge badge-info mr-1">In Research</span>` : '',
    isDraft      ? `<span class="badge badge-secondary mr-1">Draft</span>` : '',
  ].join('');

  const created = doc.created_datetime
    ? new Date(doc.created_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const edited = doc.edited_datetime
    ? new Date(doc.edited_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const commentsHtml = renderComments(doc.comments || []);

  root.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb bd-breadcrumb">
        <li class="breadcrumb-item"><a href="${baseUrl}/document/">Documents</a></li>
        <li class="breadcrumb-item active">${escHtml(doc.title)}</li>
      </ol>
    </nav>
    <div class="row">
      <div class="col-lg-8">
        <h2 class="font-weight-bold mb-1">${escHtml(doc.title)}</h2>
        <div class="mb-3">${badges}</div>
        ${doc.content_html ? `<div class="bd-remarks">${doc.content_html}</div>` : (doc.brief_html || '')}
        <hr>
        <h5 class="text-muted mt-4 mb-2">Comments <span class="text-muted small">(read-only archive)</span></h5>
        ${commentsHtml}
        <p class="mt-2"><a href="https://discord.gg/u87WVeu" class="btn btn-sm btn-outline-info">Discuss on Discord</a></p>
      </div>
      <div class="col-lg-4">
        <div class="bd-meta-card card mb-3">
          <div class="card-body">
            <h6 class="card-title text-muted text-uppercase small mb-3">Document Info</h6>
            <dl class="row mb-0 small">
              <dt class="col-5">Author</dt>
              <dd class="col-7">${escHtml(doc.author_username || 'unknown')}</dd>
              <dt class="col-5">Added</dt>
              <dd class="col-7">${escHtml(created)}</dd>
              ${edited ? `<dt class="col-5">Edited</dt><dd class="col-7">${escHtml(edited)}</dd>` : ''}
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
