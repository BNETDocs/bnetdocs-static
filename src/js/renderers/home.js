export default async function({ root, page }) {
  const baseUrl = page.baseUrl || '';
  root.innerHTML = `
    <div class="jumbotron jumbotron-fluid bd-hero mb-4">
      <div class="container-fluid">
        <h1 class="display-5 font-weight-bold">BNETDocs</h1>
        <p class="lead text-muted">Battle.net &amp; in-game protocol documentation, preserved.</p>
        <div class="mt-4">
          <a href="${baseUrl}/packet/" class="btn btn-outline-info mr-2">View Packets</a>
          <a href="${baseUrl}/document/" class="btn btn-outline-secondary mr-2">View Documents</a>
          <a href="${baseUrl}/news/" class="btn btn-outline-secondary mr-2">News</a>
        </div>
      </div>
    </div>
    <div class="container-fluid">
      <p class="text-muted">
        BNETDocs is a community-maintained reference for the proprietary network protocols
        used by Blizzard Entertainment's Battle.net platform and its games, including
        StarCraft, Diablo II, Warcraft III, and others.
      </p>
    </div>
  `;
}
