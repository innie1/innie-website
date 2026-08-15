const products = window.INNIE_PRODUCTS || [];
const grid = document.getElementById('product-grid');
const empty = document.getElementById('empty-state');

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function renderProducts() {
  if (!grid || !empty) return;
  grid.innerHTML = '';
  empty.hidden = products.length > 0;
  products.forEach((product) => {
    const card = document.createElement('a');
    card.className = 'product-card';
    card.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
    card.innerHTML = `
      <div class="product-top">
        <div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.shortDescription)}</p></div>
        <span class="status"><span class="status-dot">${product.status === 'Live' ? '●' : '○'}</span>${escapeHtml(product.status)}</span>
      </div>
      <div class="product-bottom"><span class="product-link">View ${product.type === 'service' ? 'service' : 'product'} →</span></div>`;
    grid.appendChild(card);
  });
}

const form = document.getElementById('email-form');
const note = document.getElementById('form-note');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = new FormData(form).get('email');
  if (!email) return;
  // Temporary UI confirmation. Connect this single collector to the INNIE email backend before launch.
  note.textContent = 'You’re on the list. We’ll keep you posted.';
  form.reset();
});

renderProducts();
