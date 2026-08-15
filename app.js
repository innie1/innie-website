const products = window.INNIE_PRODUCTS || [];
const grid = document.getElementById('product-grid');
const emptyState = document.getElementById('empty-state');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function renderProducts() {
  if (!grid) return;
  
  if (products.length > 0) {
    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '';
    
    products.forEach((product) => {
      const card = document.createElement('a');
      card.className = 'filled-product-card';
      card.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
      
      const imgContent = product.heroImage 
        ? `<img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.name)}" />`
        : `<svg class="photo-placeholder-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
             <rect x="4" y="6" width="40" height="36" rx="8" fill="#3B82F6" />
             <circle cx="16" cy="18" r="4" fill="white" />
             <path d="M8 38L20 24L30 34L35 29L40 38H8Z" fill="white" />
           </svg>`;

      card.innerHTML = `
        <div class="product-card-img">
          ${imgContent}
        </div>
        <div>
          <h3 class="product-card-name">${escapeHtml(product.name)}</h3>
          <p class="product-card-desc">${escapeHtml(product.shortDescription || '')}</p>
        </div>
        <div class="product-card-footer">
          <span class="product-card-status">
            <span class="status-indicator" style="background: ${product.status === 'Live' ? '#10B981' : '#0066FF'};"></span>
            ${escapeHtml(product.status || 'Coming Soon')}
          </span>
          <span style="color: var(--primary-blue); font-size: 14px; font-weight: 600;">&rarr;</span>
        </div>
      `;
      grid.appendChild(card);
    });
  } else {
    grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
  }
}

const form = document.getElementById('email-form');
const note = document.getElementById('form-note');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  const emailInput = form.querySelector('input[type="email"]');
  const email = emailInput ? emailInput.value.trim() : '';
  if (!email) return;

  button.disabled = true;
  note.textContent = 'Saving…';
  
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not save your email.');
    note.textContent = 'You’re on the list. We’ll notify you when we launch!';
    form.reset();
  } catch (error) {
    note.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

renderProducts();
