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

      <!-- Interactive 5-Star Ratings & Feedback Widget -->
      <section class="rating-section" id="rating-widget">
        <div class="rating-header">
          <div>
            <p class="eyebrow-blue">COMMUNITY FEEDBACK</p>
            <h3 style="font-size: 20px; font-weight: 700; margin: 4px 0 0;">Ratings &amp; Reviews</h3>
          </div>
          <div class="rating-score-display">
            <span class="rating-average-number" id="avg-rating-val">0.0</span>
            <span class="rating-max">/ 5</span>
            <span class="rating-count-label" id="rating-count-val">(0 ratings)</span>
          </div>
        </div>
        
        <p style="font-size: 14px; color: var(--ink-secondary); margin-bottom: 6px;">Tap a star to rate this ${escapeHtml(product.type === 'service' ? 'service' : 'product')}:</p>
        
        <div class="star-rating-picker" id="star-picker" aria-label="Rate 1 to 5 stars">
          <button class="star-btn" data-star="1" type="button" aria-label="1 star">★</button>
          <button class="star-btn" data-star="2" type="button" aria-label="2 stars">★</button>
          <button class="star-btn" data-star="3" type="button" aria-label="3 stars">★</button>
          <button class="star-btn" data-star="4" type="button" aria-label="4 stars">★</button>
          <button class="star-btn" data-star="5" type="button" aria-label="5 stars">★</button>
        </div>
        
        <p class="rating-feedback-note" id="rating-note" role="status"></p>
      </section>

      ${screenshotsHtml}
      ${otherProductsHtml}
    `;

    // Rating Logic
    const avgValEl = document.getElementById('avg-rating-val');
    const countValEl = document.getElementById('rating-count-val');
    const starPicker = document.getElementById('star-picker');
    const ratingNote = document.getElementById('rating-note');
    const starBtns = starPicker?.querySelectorAll('.star-btn');

    async function loadRatings() {
      try {
        const res = await fetch(`/api/rate-product?slug=${encodeURIComponent(product.slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (avgValEl) avgValEl.textContent = data.average > 0 ? data.average.toFixed(1) : '0.0';
          if (countValEl) countValEl.textContent = `(${data.count} ${data.count === 1 ? 'rating' : 'ratings'})`;
        }
      } catch (err) {
        console.error('Failed to load ratings:', err);
      }
    }

    function highlightStars(val) {
      starBtns?.forEach((b) => {
        const star = Number(b.dataset.star);
        if (star <= val) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    const previousRating = localStorage.getItem(`innie_rating_${product.slug}`);
    if (previousRating) {
      highlightStars(Number(previousRating));
      if (ratingNote) ratingNote.textContent = `You rated this ${previousRating} ★. Thank you!`;
    }

    starBtns?.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        const star = Number(btn.dataset.star);
        starBtns.forEach((b) => {
          if (Number(b.dataset.star) <= star) {
            b.classList.add('hovered');
          } else {
            b.classList.remove('hovered');
          }
        });
      });

      btn.addEventListener('mouseleave', () => {
        starBtns.forEach((b) => b.classList.remove('hovered'));
      });

      btn.addEventListener('click', async () => {
        const rating = Number(btn.dataset.star);
        highlightStars(rating);
        localStorage.setItem(`innie_rating_${product.slug}`, rating);
        if (ratingNote) ratingNote.textContent = 'Submitting your rating…';

        try {
          const res = await fetch('/api/rate-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: product.slug, rating })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to submit rating.');
          if (ratingNote) ratingNote.textContent = `⭐ Thank you! You gave this ${rating} out of 5 stars.`;
          await loadRatings();
        } catch (err) {
          if (ratingNote) ratingNote.textContent = err.message;
        }
      });
    });

    loadRatings();
  }
}
