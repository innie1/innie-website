const products = window.INNIE_PRODUCTS || [];
const slug = new URLSearchParams(location.search).get('slug');
const product = products.find((item) => item.slug === slug);
const root = document.getElementById('detail');

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

if (!product) {
  root.innerHTML = `<a class="back" href="index.html">← Back to INNIE</a><section class="detail-section" style="margin-top:0"><p class="eyebrow">PRODUCT / SERVICE</p><h1>Nothing published here yet.</h1><p>This page will automatically show the details of a product or service when it is published by INNIE.</p></section>`;
} else {
  const screenshots = (product.screenshots || []).map((src, i) => `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} screenshot ${i + 1}" loading="lazy"></figure>`).join('');
  root.innerHTML = `
    <a class="back" href="index.html#products">← Back to Products &amp; Services</a>
    <section class="detail-hero">
      <div class="detail-media">${product.heroImage ? `<img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.name)}">` : '<span class="detail-placeholder">Product image</span>'}</div>
      <div><p class="eyebrow">${escapeHtml(product.type === 'service' ? 'SERVICE' : 'PRODUCT')}</p><h1>${escapeHtml(product.name)}</h1><p class="detail-summary">${escapeHtml(product.shortDescription)}</p><p class="detail-status"><span class="status-dot">${product.status === 'Live' ? '●' : '○'}</span> ${escapeHtml(product.status)}</p>${product.appUrl && product.status === 'Live' ? `<a class="launch" href="${escapeHtml(product.appUrl)}" target="_blank" rel="noopener">Open ${escapeHtml(product.name)} →</a>` : ''}</div>
    </section>
    <section class="detail-section"><p class="eyebrow">ABOUT</p><h2>About this ${product.type === 'service' ? 'service' : 'product'}</h2><p>${escapeHtml(product.description)}</p></section>
    ${screenshots ? `<section class="detail-section"><p class="eyebrow">SCREENSHOTS</p><h2>See it in action</h2><div class="screenshots">${screenshots}</div></section>` : ''}`;
}
