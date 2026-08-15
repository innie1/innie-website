const products = window.INNIE_PRODUCTS || [];
const slug = new URLSearchParams(location.search).get('slug');
const product = slug ? products.find((item) => item.slug === slug) : null;
const root = document.getElementById('detail-root');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

if (!product) {
  document.title = 'INNIE — Product Details';
  if (root) {
    root.innerHTML = `
      <a class="back-link" href="index.html#products">&larr; Back to all products</a>
      <div class="empty-detail-state">
        <h2>Nothing published here yet</h2>
        <p>This page will automatically show the details of a product or service when it is published by INNIE.</p>
        <a class="notify-btn" href="index.html" style="display:inline-flex; align-items:center; text-decoration:none; height:44px; padding:0 24px;">Return to Homepage</a>
      </div>
    `;
  }
} else {
  document.title = `INNIE — ${product.name}`;

  const heroMediaContent = product.heroImage
    ? `<img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.name)}" />`
    : `<svg class="photo-placeholder-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 72px; height: 72px;">
         <rect x="4" y="6" width="40" height="36" rx="8" fill="#3B82F6" />
         <circle cx="16" cy="18" r="4" fill="white" />
         <path d="M8 38L20 24L30 34L35 29L40 38H8Z" fill="white" />
       </svg>`;

  const screenshotsHtml = (product.screenshots && product.screenshots.length > 0)
    ? `
      <section class="section-block">
        <h3>Screenshots</h3>
        <div class="screenshots-grid">
          ${product.screenshots.map((src, i) => `
            <div class="screenshot-card">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} screenshot ${i + 1}" loading="lazy" />
            </div>
          `).join('')}
        </div>
      </section>
    `
    : '';

  const others = products.filter((item) => item.slug !== product.slug);
  const otherProductsHtml = others.length > 0
    ? `
      <section class="section-block">
        <h3>Other Products / Services</h3>
        <div class="other-products-grid">
          ${others.slice(0, 4).map((item) => `
            <a class="mini-product-card" href="product.html?slug=${encodeURIComponent(item.slug)}">
              <div class="mini-card-top">
                <div class="mini-card-thumb" style="overflow:hidden; display:flex; align-items:center; justify-content:center;">
                  ${item.heroImage ? `<img src="${escapeHtml(item.heroImage)}" alt="${escapeHtml(item.name)}" style="width:100%;height:100%;object-fit:cover;" />` : ''}
                </div>
                <div class="mini-card-lines">
                  <strong style="font-size: 13px; color: var(--ink-primary);">${escapeHtml(item.name)}</strong>
                  <span style="font-size: 11px; color: var(--ink-muted);">${escapeHtml(item.status || '')}</span>
                </div>
              </div>
              <div class="mini-card-bottom">&rarr;</div>
            </a>
          `).join('')}
        </div>
      </section>
    `
    : '';

  const launchBtnHtml = (product.appUrl && product.status === 'Live')
    ? `<a class="detail-launch-btn" href="${escapeHtml(product.appUrl)}" target="_blank" rel="noopener">Open ${escapeHtml(product.name)} &rarr;</a>`
    : '';

  if (root) {
    root.innerHTML = `
      <a class="back-link" href="index.html#products">&larr; Back to all products</a>

      <div class="detail-top-grid">
        <div class="detail-hero-media">
          ${heroMediaContent}
        </div>

        <div class="detail-info">
          <h1>${escapeHtml(product.name)}</h1>
          <p class="detail-short-desc">${escapeHtml(product.shortDescription || '')}</p>
          
          <div class="detail-status-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Status: ${escapeHtml(product.status || 'Coming Soon')}</span>
          </div>

          <div class="detail-about-section">
            <h2>About the ${escapeHtml(product.type === 'service' ? 'service' : 'product')}</h2>
            <p class="detail-full-desc">${escapeHtml(product.description || product.shortDescription || '')}</p>
            ${launchBtnHtml}
          </div>
        </div>
      </div>

      ${screenshotsHtml}
      ${otherProductsHtml}
    `;
  }
}
