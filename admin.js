const loginPanel = document.getElementById('login-panel');
const editorPanel = document.getElementById('editor-panel');
const loginForm = document.getElementById('login-form');
const loginNote = document.getElementById('login-note');
const productForm = document.getElementById('product-form');
const publishNote = document.getElementById('publish-note');
const publishButton = document.getElementById('publish-button');
const cancelEdit = document.getElementById('cancel-edit');
const editorTitle = document.getElementById('editor-title');
const list = document.getElementById('published-list');
const preview = document.getElementById('preview');
const heroInput = document.getElementById('hero');
const screenshotsInput = document.getElementById('screenshots');
const adminSignoutBtn = document.getElementById('admin-signout');

// Stats Elements
const statProducts = document.getElementById('stat-products');
const statSubscribers = document.getElementById('stat-subscribers');
const statRating = document.getElementById('stat-rating');
const statLive = document.getElementById('stat-live');

// Subscriber Management Elements
const subscribersList = document.getElementById('subscribers-list');
const refreshSubscribersBtn = document.getElementById('refresh-subscribers');
const exportCsvBtn = document.getElementById('export-csv-btn');
const copySubscribersBtn = document.getElementById('copy-subscribers-btn');
const subscriberSearchInput = document.getElementById('subscriber-search');

let published = [];
let allSubscribers = [];
let heroDataUrl = null;
let screenshotDataUrls = [];

function note(element, message, type = '') {
  if (!element) return;
  element.textContent = message || '';
  element.className = `admin-note ${type}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateMetrics() {
  if (statProducts) statProducts.textContent = published.length;
  if (statLive) statLive.textContent = published.filter(p => p.status === 'Live').length;
  if (statSubscribers) statSubscribers.textContent = allSubscribers.length;
}

function resetEditor() {
  productForm.reset();
  productForm.elements.editingSlug.value = '';
  editorTitle.textContent = 'Add a product or service';
  publishButton.textContent = 'Publish to Catalog';
  cancelEdit.hidden = true;
  preview.innerHTML = '';
  heroDataUrl = null;
  screenshotDataUrls = [];
  note(publishNote, '');
}

function editProduct(product) {
  productForm.elements.editingSlug.value = product.slug;
  productForm.elements.name.value = product.name;
  productForm.elements.type.value = product.type;
  productForm.elements.status.value = product.status;
  productForm.elements.appUrl.value = product.appUrl || '';
  productForm.elements.shortDescription.value = product.shortDescription || '';
  productForm.elements.description.value = product.description || '';

  editorTitle.textContent = `Edit ${product.name}`;
  publishButton.textContent = 'Save changes';
  cancelEdit.hidden = false;
  window.scrollTo({ top: 120, behavior: 'smooth' });

  preview.innerHTML = '';
  if (product.heroImage) {
    const img = document.createElement('img');
    img.src = product.heroImage;
    img.title = 'Current Hero Image';
    preview.appendChild(img);
  }
  if (product.screenshots && product.screenshots.length > 0) {
    product.screenshots.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      preview.appendChild(img);
    });
  }
}

function renderPublished() {
  if (!published.length) {
    list.innerHTML = '<div class="published-empty">No products or services published yet. Fill out the form to add your first release!</div>';
    updateMetrics();
    return;
  }

  list.innerHTML = published.map((p, i) => `
    <div class="catalog-card-item">
      <div class="catalog-item-main">
        <div class="catalog-item-thumb">
          ${p.heroImage ? `<img src="${escapeHtml(p.heroImage)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" alt="" />` : '📦'}
        </div>
        <div>
          <h4 class="catalog-item-name">${escapeHtml(p.name)}</h4>
          <div class="catalog-item-meta">
            <span style="font-weight:600; text-transform:capitalize;">${escapeHtml(p.type)}</span>
            <span>&middot;</span>
            <span style="color:${p.status === 'Live' ? '#16a34a' : '#0284c7'}; font-weight:600;">${escapeHtml(p.status)}</span>
            <span>&middot;</span>
            <span id="admin-rating-${escapeHtml(p.slug)}" style="color: #d97706; font-weight: 600;">★ 0.0</span>
          </div>
        </div>
      </div>
      <div class="catalog-item-actions">
        <a class="admin-btn secondary mini" href="product.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener" title="Preview public detail page">View ↗</a>
        <button type="button" data-edit="${i}" class="admin-btn secondary mini">Edit</button>
        <button type="button" data-remove="${i}" class="admin-btn danger-mini">Unpublish</button>
      </div>
    </div>
  `).join('');

  let totalRatingsSum = 0;
  let totalRatingsCount = 0;

  published.forEach(p => {
    fetch(`/api/rate-product?slug=${encodeURIComponent(p.slug)}`).then(r => r.ok ? r.json() : null).then(data => {
      const el = document.getElementById(`admin-rating-${p.slug}`);
      if (el && data && data.count > 0) {
        el.textContent = `★ ${data.average} (${data.count})`;
        totalRatingsSum += (data.average * data.count);
        totalRatingsCount += data.count;
        if (statRating && totalRatingsCount > 0) {
          statRating.textContent = (totalRatingsSum / totalRatingsCount).toFixed(1);
        }
      }
    }).catch(() => {});
  });

  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editProduct(published[Number(b.dataset.edit)])));
  list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', async () => {
    const p = published[Number(b.dataset.remove)];
    if (!confirm(`Unpublish ${p.name}? This will remove it from the homepage and detail view.`)) return;
    b.disabled = true;
    try {
      const r = await fetch('/api/admin-unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: p.slug })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Unpublish failed.');
      await loadPublished();
      resetEditor();
    } catch (e) {
      alert(e.message);
    } finally {
      b.disabled = false;
    }
  }));

  updateMetrics();
}

async function loadPublished() {
  try {
    const r = await fetch('/api/admin-content');
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Could not load published items.');
    published = d.products || [];
    renderPublished();
  } catch (err) {
    console.error(err);
  }
}

// Render Subscriber List & Search Filter
function renderSubscribers(filterText = '') {
  if (!subscribersList) return;
  const filtered = allSubscribers.filter(s => s.email.toLowerCase().includes(filterText.toLowerCase()));

  if (!filtered.length) {
    subscribersList.innerHTML = filterText 
      ? `<div class="published-empty">No subscribers match "${escapeHtml(filterText)}".</div>`
      : `<div class="published-empty">No subscribers collected yet. Once visitors enter their email on the homepage, they will appear here!</div>`;
    return;
  }

  subscribersList.innerHTML = filtered.map(s => {
    const dateFormatted = s.created_at ? new Date(s.created_at).toLocaleString() : 'Recent';
    return `
      <div class="subscriber-row">
        <span class="subscriber-email">${escapeHtml(s.email)}</span>
        <span class="subscriber-date">${escapeHtml(dateFormatted)}</span>
      </div>
    `;
  }).join('');
}

async function loadSubscribers() {
  if (!subscribersList) return;
  subscribersList.innerHTML = '<div class="published-empty">Loading subscribers…</div>';
  try {
    const res = await fetch('/api/admin-subscribers');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch subscribers.');
    allSubscribers = data.subscribers || [];
    updateMetrics();
    renderSubscribers(subscriberSearchInput?.value || '');
  } catch (err) {
    subscribersList.innerHTML = `<div class="published-empty" style="color: #dc2626;">${escapeHtml(err.message)}</div>`;
  }
}

// Search Filter
subscriberSearchInput?.addEventListener('input', (e) => {
  renderSubscribers(e.target.value);
});

// Export CSV
exportCsvBtn?.addEventListener('click', () => {
  if (!allSubscribers.length) {
    alert('No subscribers to export yet.');
    return;
  }
  const csvRows = ['Email,Date Subscribed'];
  allSubscribers.forEach(s => {
    csvRows.push(`"${s.email.replace(/"/g, '""')}","${s.created_at || ''}"`);
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `innie-subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Copy All Emails
copySubscribersBtn?.addEventListener('click', () => {
  if (!allSubscribers.length) {
    alert('No subscriber emails to copy yet.');
    return;
  }
  const emailsString = allSubscribers.map(s => s.email).join(', ');
  navigator.clipboard.writeText(emailsString).then(() => {
    const originalText = copySubscribersBtn.textContent;
    copySubscribersBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copySubscribersBtn.textContent = originalText;
    }, 2000);
  }).catch(() => {
    alert('Could not copy to clipboard.');
  });
});

refreshSubscribersBtn?.addEventListener('click', loadSubscribers);

// Uploads
heroInput?.addEventListener('change', async () => {
  if (!heroInput.files[0]) return;
  try {
    heroDataUrl = await readFile(heroInput.files[0]);
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = heroDataUrl;
    preview.appendChild(img);
  } catch (e) {
    alert(e.message);
  }
});

screenshotsInput?.addEventListener('change', async () => {
  screenshotDataUrls = [];
  try {
    for (const f of screenshotsInput.files) {
      screenshotDataUrls.push(await readFile(f));
    }
    const currentImgs = preview.querySelectorAll('img');
    preview.innerHTML = '';
    currentImgs.forEach(i => preview.appendChild(i));
    screenshotDataUrls.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      preview.appendChild(img);
    });
  } catch (e) {
    alert(e.message);
  }
});

// Publish / Edit Form Submit
productForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  publishButton.disabled = true;
  note(publishNote, 'Publishing changes…');

  const formData = new FormData(productForm);
  const payload = {
    editingSlug: formData.get('editingSlug') || undefined,
    name: formData.get('name'),
    type: formData.get('type'),
    status: formData.get('status'),
    appUrl: formData.get('appUrl'),
    shortDescription: formData.get('shortDescription'),
    description: formData.get('description'),
    heroImageUpload: heroDataUrl || undefined,
    screenshotUploads: screenshotDataUrls.length > 0 ? screenshotDataUrls : undefined
  };

  try {
    const r = await fetch('/api/admin-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Publishing failed.');
    note(publishNote, 'Published successfully!', 'success');
    resetEditor();
    await loadPublished();
  } catch (err) {
    note(publishNote, err.message, 'error');
  } finally {
    publishButton.disabled = false;
  }
});

cancelEdit?.addEventListener('click', resetEditor);

// Login Form
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = loginForm.querySelector('button');
  const password = document.getElementById('admin-password').value;
  button.disabled = true;
  note(loginNote, 'Authenticating…');

  try {
    const r = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Login failed.');
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    if (adminSignoutBtn) adminSignoutBtn.style.display = 'inline-flex';
    await Promise.all([loadPublished(), loadSubscribers()]);
  } catch (err) {
    note(loginNote, err.message, 'error');
  } finally {
    button.disabled = false;
  }
});

// Sign Out Action
adminSignoutBtn?.addEventListener('click', () => {
  document.cookie = 'innie_admin=; Max-Age=0; path=/;';
  loginPanel.hidden = false;
  editorPanel.hidden = true;
  adminSignoutBtn.style.display = 'none';
  loginForm.reset();
  note(loginNote, 'Signed out successfully.');
});

// Check Session on Init
(async function init() {
  try {
    const r = await fetch('/api/admin-content');
    if (r.ok) {
      loginPanel.hidden = true;
      editorPanel.hidden = false;
      if (adminSignoutBtn) adminSignoutBtn.style.display = 'inline-flex';
      const d = await r.json();
      published = d.products || [];
      renderPublished();
      loadSubscribers();
    }
  } catch {}
})();
