const loginPanel = document.getElementById('login-panel');
const editorPanel = document.getElementById('editor-panel');
const loginForm = document.getElementById('login-form');
const loginNote = document.getElementById('login-note');
const productForm = document.getElementById('product-form');
const publishNote = document.getElementById('publish-note');
const publishButton = document.getElementById('publish-button');
const heroInput = document.getElementById('hero');
const screenshotsInput = document.getElementById('screenshots');
const preview = document.getElementById('preview');

function note(el, message, type = '') { el.textContent = message; el.className = `admin-note ${type}`; }
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
  });
}
function renderPreview() {
  preview.innerHTML = '';
  const files = [heroInput.files?.[0], ...Array.from(screenshotsInput.files || [])].filter(Boolean);
  files.forEach(file => { const img = document.createElement('img'); img.alt = file.name; img.src = URL.createObjectURL(file); preview.appendChild(img); });
}
heroInput.addEventListener('change', renderPreview); screenshotsInput.addEventListener('change', renderPreview);

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); note(loginNote, 'Signing in…');
  try {
    const response = await fetch('/api/admin-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: document.getElementById('admin-password').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sign in failed.');
    loginPanel.hidden = true; editorPanel.hidden = false;
  } catch (error) { note(loginNote, error.message, 'error'); }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault(); publishButton.disabled = true; note(publishNote, 'Uploading and publishing…');
  try {
    const data = Object.fromEntries(new FormData(productForm).entries());
    data.heroImage = heroInput.files?.[0] ? await fileToDataUrl(heroInput.files[0]) : '';
    data.screenshots = await Promise.all(Array.from(screenshotsInput.files || []).slice(0, 12).map(fileToDataUrl));
    const response = await fetch('/api/admin-publish', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Publishing failed.');
    note(publishNote, 'Published successfully. Vercel will redeploy automatically.', 'success');
    productForm.reset(); preview.innerHTML = '';
  } catch (error) { note(publishNote, error.message, 'error'); }
  finally { publishButton.disabled = false; }
});
