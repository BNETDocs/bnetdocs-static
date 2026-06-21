export default async function({ root, fetchJSON, getLookup }) {
  const [data, lookup] = await Promise.all([
    fetchJSON('/news/index.json'),
    getLookup(),
  ]);

  // Sort newest first
  const posts = (data.news_posts || []).slice().sort((a, b) => {
    return new Date(b.created_datetime) - new Date(a.created_datetime);
  });

  const cardsHtml = posts.length === 0
    ? '<p class="text-muted">No news posts yet.</p>'
    : posts.map(post => {
        const category = lookup.newsCategories[post.category_id];
        const categoryBadge = category
          ? `<img src="/assets/img/news/${escHtml(category.filename)}" alt="" height="14" class="mr-1"><span class="badge badge-secondary mr-2">${escHtml(category.label)}</span>`
          : '';

        const created = post.created_datetime
          ? new Date(post.created_datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : '';

        const briefText = stripHtml(post.brief_html || '');

        return `
          <div class="bd-news-card">
            <div class="bd-news-meta">
              ${categoryBadge}
              ${escHtml(created)} &middot; by ${escHtml(post.author_username || 'unknown')}
            </div>
            <h5><a href="${escHtml(post.uri)}/">${escHtml(post.title)}</a></h5>
            ${post.brief_html || ''}
            <a href="${escHtml(post.uri)}/" class="btn btn-sm btn-outline-secondary mt-2">Read more</a>
          </div>
        `;
      }).join('');

  root.innerHTML = `
    <h4 class="mb-4">News</h4>
    ${cardsHtml}
  `;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
