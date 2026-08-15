const loginPanel = document.getElementById('login-panel');
const editorPanel = document.getElementById('editor-panel');
const loginForm = document.getElementById('login-form');
const loginNote = document.getElementById('login-note');
const productForm = document.getElementById('product-form');
const publishNote = document.getElementById('publish-note');
const publishButton = document.getElementById('publish-button');
const cancelEdit = document.getElementById('cancel-edit');
const heroInput = document.getElementById('hero');
const screenshotsInput = document.getElementById('screenshots');
const preview = document.getElementById('preview');
const list = document.getElementById('published-list');
const editorTitle = document.getElementById('editor-title');
let published = [];

function note(el, message, type = '') { el.textContent = message; el.className = `admin-note ${type}`; }
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function renderPreview() { preview.innerHTML = ''; const files = [heroInput.files?.[0], ...Array.from(screenshotsInput.files || [])].filter(Boolean); files.forEach(file => { const img = document.createElement('img'); img.alt = file.name; img.src = URL.createObjectURL(file); preview.appendChild(img); }); }
heroInput.addEventListener('change', renderPreview); screenshotsInput.addEventListener('change', renderPreview);
function resetEditor() { productForm.reset(); productForm.elements.editingSlug.value = ''; editorTitle.textContent = 'Add a product or service'; publishButton.textContent = 'Publish product/service'; cancelEdit.hidden = true; preview.innerHTML = ''; note(publishNote, ''); }
function editProduct(product) {
  productForm.elements.editingSlug.value = product.slug; productForm.elements.name.value = product.name; productForm.elements.type.value = product.type; productForm.elements.status.value = product.status; productForm.elements.appUrl.value = product.appUrl || ''; productForm.elements.shortDescription.value = product.shortDescription || ''; productForm.elements.description.value = product.description || '';
  editorTitle.textContent = `Edit ${product.name}`; publishButton.textContent = 'Save changes'; cancelEdit.hidden = false; window.scrollTo({top: 0, behavior: 'smooth'});
}
function renderPublished() {
  if (!published.length) { list.innerHTML = '<div class="published-empty">Nothing published yet.</div>'; return; }
  list.innerHTML = '<p class="eyebrow">PUBLISHED</p>' + published.map((p, i) => `<div class="published-row-item"><div><strong>${p.name}</strong><span>${p.type} · ${p.status}</span></div><div><button type="button" data-edit="${i}" class="mini">Edit</button><button type="button" data-remove="${i}" class="mini danger">Unpublish</button></div></div>`).join('');
  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editProduct(published[Number(b.dataset.edit)])));
  list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', async () => { const p = published[Number(b.dataset.remove)]; if (!confirm(`Unpublish ${p.name}?`)) return; b.disabled = true; try { const r = await fetch('/api/admin-unpublish', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({slug:p.slug})}); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unpublish failed.'); await loadPublished(); resetEditor(); } catch(e) { alert(e.message); } finally { b.disabled = false; } }));
}
async function loadPublished() { const r = await fetch('/api/admin-content'); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not load published items.'); published = d.products || []; renderPublished(); }

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); note(loginNote, 'Signing in…');
  try { const response = await fetch('/api/admin-login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:document.getElementById('admin-password').value})}); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Sign in failed.'); loginPanel.hidden = true; editorPanel.hidden = false; await loadPublished(); }
  catch (error) { note(loginNote, error.message, 'error'); }
});
productForm.addEventListener('submit', async (event) => {
  event.preventDefault(); publishButton.disabled = true; note(publishNote, 'Uploading and publishing…');
  try { const data = Object.fromEntries(new FormData(productForm).entries()); if (data.editingSlug) data.slug = data.editingSlug; delete data.editingSlug; data.heroImage = heroInput.files?.[0] ? await fileToDataUrl(heroInput.files[0]) : ''; data.screenshots = await Promise.all(Array.from(screenshotsInput.files || []).slice(0,12).map(fileToDataUrl)); const response = await fetch('/api/admin-publish', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)}); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Publishing failed.'); note(publishNote, 'Saved successfully. Vercel will redeploy automatically.', 'success'); await loadPublished(); resetEditor(); }
  catch (error) { note(publishNote, error.message, 'error'); } finally { publishButton.disabled = false; }
});
cancelEdit.addEventListener('click', resetEditor);
