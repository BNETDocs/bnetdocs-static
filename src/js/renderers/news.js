export default async function({ root, page, fetchJSON, getLookup }) {
  const baseUrl = page.baseUrl || '';
  const [post, lookup] = await Promise.all([
    fetchJSON(`/news/${page.id}.json`),
    getLookup(),
  ]);

  const category = lookup.newsCategories[post.category_id];
  const categoryBadge = category
    ? `<img src="${baseUrl}/assets/img/news/${escHtml(category.filename)}" alt="" height="16" class="mr-1">
       <span class="badge badge-secondary mr-2">${escHtml(category.label)}</span>`
    : '';

  const created = post.created_datetime
    ? new Date(post.created_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const edited = post.edited_datetime
    ? new Date(post.edited_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const commentsHtml = renderComments(post.comments || []);

  root.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb bd-breadcrumb">
        <li class="breadcrumb-item"><a href="${baseUrl}/news/">News</a></li>
        <li class="breadcrumb-item active">${escHtml(post.title)}</li>
      </ol>
    </nav>
    <div class="row">
      <div class="col-lg-8">
        <div class="d-flex align-items-center mb-2">
          ${categoryBadge}
          <span class="text-muted small">${escHtml(created)}${edited ? ` &middot; edited ${escHtml(edited)}` : ''} &middot; by ${escHtml(post.author_username || 'unknown')}</span>
        </div>
        <h2 class="font-weight-bold mb-3">${escHtml(post.title)}</h2>
        ${post.content_html || post.brief_html || ''}
        <hr>
        <h5 class="text-muted mt-4 mb-2">Comments <span class="text-muted small">(read-only archive)</span></h5>
        ${commentsHtml}
        <p class="mt-2"><a href="https://discord.gg/bnetdocs" class="btn btn-sm btn-outline-info">Discuss on Discord</a></p>
      </div>
    </div>
  `;

  if (window.hljs) {
    root.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
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
