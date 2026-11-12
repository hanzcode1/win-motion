/* ============================================================
   Shared utilities - theme, toast, modal, API helpers
   ============================================================ */

const API = window.location.origin;

/* ============ THEME ============ */
(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  if (typeof showToast === 'function') {
    showToast(
      next === 'dark' ? 'Dark mode aktif' : 'Light mode aktif',
      next === 'dark' ? '🌙 Tema diubah.' : '☀️ Tema diubah.',
      'info', 2000
    );
  }
}

/* ============ TOAST ============ */
function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    info: 'fa-circle-info', success: 'fa-circle-check',
    error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.setProperty('--dur', duration + 'ms');
  toast.innerHTML = `
    <i class="toast-icon fa-solid ${icons[type] || icons.info}"></i>
    <div class="toast-body">
      <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-msg">${escapeHTML(message)}</div>
    </div>
    <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
  `;
  toast.querySelector('.toast-close').onclick = () => removeToast(toast);
  container.appendChild(toast);
  const timer = setTimeout(() => removeToast(toast), duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => setTimeout(() => removeToast(toast), 800));
}

function removeToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('out');
  setTimeout(() => toast.remove(), 300);
}

/* ============ MODAL ============ */
function showModal({ title = 'Info', body = '', type = 'info', buttons = [], html = null }) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  const icon = document.getElementById('modalIcon');
  document.getElementById('modalTitle').textContent = title;

  const bodyEl = document.getElementById('modalBody');
  if (html) bodyEl.innerHTML = html;
  else bodyEl.textContent = body;

  icon.className = `fa-solid ${
    type === 'error' ? 'fa-circle-exclamation error' :
    type === 'success' ? 'fa-circle-check success' :
    type === 'warning' ? 'fa-triangle-exclamation warning' :
    'fa-circle-info'
  }`;

  const btnWrap = document.getElementById('modalButtons');
  btnWrap.innerHTML = '';
  const btns = buttons.length ? buttons : [{ label: 'OK', primary: true }];
  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.primary ? 'btn-primary' : 'btn-ghost');
    btn.textContent = b.label;
    btn.onclick = () => { closeModal(); b.onClick && b.onClick(); };
    btnWrap.appendChild(btn);
  });
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function confirmAsync({ title, body, type = 'warning' }) {
  return new Promise(resolve => {
    showModal({
      title, body, type,
      buttons: [
        { label: 'Batal', onClick: () => resolve(false) },
        { label: 'Lanjutkan', primary: true, onClick: () => resolve(true) }
      ]
    });
  });
}

function promptAsync({ title, label, value = '', placeholder = '' }) {
  return new Promise(resolve => {
    showModal({
      title,
      body: '',
      html: `
        <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:6px">${escapeHTML(label)}</label>
        <input id="promptInput" type="text" value="${escapeHTML(value)}" placeholder="${escapeHTML(placeholder)}"
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg);color:var(--text);font-family:inherit;font-size:14px">
      `,
      type: 'info',
      buttons: [
        { label: 'Batal', onClick: () => resolve(null) },
        {
          label: 'OK', primary: true,
          onClick: () => {
            const v = document.getElementById('promptInput')?.value || '';
            resolve(v);
          }
        }
      ]
    });
    setTimeout(() => {
      const inp = document.getElementById('promptInput');
      if (inp) {
        inp.focus();
        inp.select();
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const v = inp.value;
            closeModal();
            resolve(v);
          }
        });
      }
    }, 50);
  });
}

/* ============ HELPERS ============ */
function escapeHTML(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatDate(d) {
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function getAspectRatio(w, h) {
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

/* ============ API HELPERS ============ */
async function apiGet(url) {
  const res = await fetch(API + url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function apiPost(url, body) {
  const res = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function apiPut(url, body) {
  const res = await fetch(API + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function apiDelete(url) {
  const res = await fetch(API + url, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ============ BIND THEME TOGGLE ============ */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.onclick = toggleTheme;
});