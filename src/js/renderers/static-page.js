const PAGE_CONTENT = {
  credits: {
    title: 'Credits',
    content: `
      <h4 class="mb-4">Credits</h4>
      <p>BNETDocs is maintained by volunteers who have dedicated time to documenting
         Blizzard Entertainment's proprietary network protocols.</p>
      <p>Special thanks to all contributors, past and present, who have helped build
         this resource for the reverse-engineering and emulation community.</p>
      <ul>
        <li>BNETDocs was originally created by Carl Bennett (<strong>CarlTheExplorer</strong>).</li>
        <li>Protocol research by countless members of the Battle.net hacking community.</li>
        <li>Hosted on GitHub Pages.</li>
      </ul>
      <p>
        <a href="https://github.com/BNETDocs/bnetdocs-static" class="btn btn-outline-secondary">View on GitHub</a>
      </p>
    `,
  },
  discord: {
    title: 'Discord',
    content: `
      <h4 class="mb-4">Discord</h4>
      <p>Join the BNETDocs Discord server to discuss Battle.net protocols, ask questions,
         and connect with other researchers and developers.</p>
      <p>
        <a href="https://discord.gg/bnetdocs" class="btn btn-outline-info">Join Discord</a>
      </p>
    `,
  },
  donate: {
    title: 'Donate',
    content: `
      <h4 class="mb-4">Donate</h4>
      <p>BNETDocs is a free community resource. If you find it useful, consider supporting
         its hosting and development.</p>
      <p class="text-muted">Donation links coming soon.</p>
    `,
  },
  privacy: {
    title: 'Privacy Policy',
    content: `
      <h4 class="mb-4">Privacy Policy</h4>
      <p>BNETDocs Static is a static website served from GitHub Pages. We do not collect
         any personal data directly.</p>
      <ul>
        <li>No cookies are set by this site.</li>
        <li>No user accounts or logins.</li>
        <li>GitHub Pages may log access for operational purposes per their
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">privacy policy</a>.</li>
      </ul>
    `,
  },
  legal: {
    title: 'Legal',
    content: `
      <h4 class="mb-4">Legal</h4>
      <p>The protocol documentation on BNETDocs is the result of independent reverse-engineering
         research performed by the community. This site is not affiliated with or endorsed by
         Blizzard Entertainment.</p>
      <p>Battle.net, StarCraft, Diablo, and Warcraft are trademarks of Blizzard Entertainment, Inc.</p>
      <p>Site content is available under the terms described in the
         <a href="https://github.com/BNETDocs/bnetdocs-static/blob/main/LICENSE.txt">LICENSE.txt</a> file.</p>
    `,
  },
};

export default async function({ root, page }) {
  const pageKey = (page.page || '').toLowerCase();
  const entry = PAGE_CONTENT[pageKey];

  if (entry) {
    root.innerHTML = `<div class="col-lg-8">${entry.content}</div>`;
  } else {
    root.innerHTML = `
      <div class="text-center py-5">
        <h1 class="display-4">404</h1>
        <p class="lead text-muted">Page not found.</p>
        <a href="/" class="btn btn-outline-info">Home</a>
      </div>
    `;
  }
}
