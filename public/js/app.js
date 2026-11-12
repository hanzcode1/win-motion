/* ============================================================
   Win Motion Studio - Frontend Logic
   ============================================================ */

const API = window.location.origin;

/* ============ THEME ============ */
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  showToast(
    next === 'dark' ? 'Dark mode aktif' : 'Light mode aktif',
    `${next === 'dark' ? '🌙' : '☀️'} Tema berhasil diubah.`,
    'info',
    2000
  );
}

initTheme();

/* ============ TOAST ============ */
function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const icons = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation'
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
    <button class="toast-close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
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
function showModal({ title = 'Info', body = '', type = 'info', buttons = [] }) {
  const overlay = document.getElementById('modalOverlay');
  const icon = document.getElementById('modalIcon');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;

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
  document.getElementById('modalOverlay').classList.add('hidden');
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

/* ============ UPDATE INFO BOX ============ */
function updateOutputInfo() {
  const w = parseInt(document.getElementById('widthInput').value, 10) || 0;
  const h = parseInt(document.getElementById('heightInput').value, 10) || 0;
  const fps = parseInt(document.getElementById('fpsInput').value, 10) || 30;
  const dur = parseInt(document.getElementById('durationInput').value, 10) || 0;
  const format = document.getElementById('formatInput').value.toUpperCase();

  const ar = (w && h) ? getAspectRatio(w, h) : '?';
  const seconds = (dur / fps).toFixed(2);

  document.getElementById('outputInfo').textContent =
    `${w} × ${h} (${ar}) · ${fps}fps · ${seconds}s · ${format}`;
  document.getElementById('durationSec').value = `${seconds}s`;
}

/* ============ LOAD COMPOSITIONS ============ */
async function loadCompositions() {
  const ul = document.getElementById('compList');
  const select = document.getElementById('compSelect');
  ul.innerHTML = '<li class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat…</li>';
  select.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/compositions`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Server return ${res.status}. Bukan JSON.`);
    }
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('Response bukan array');

    ul.innerHTML = '';
    if (list.length === 0) {
      ul.innerHTML = `
        <li class="loading">
          <i class="fa-solid fa-circle-info"></i>
          Belum ada file .tsx di src/compositions/
        </li>`;
      document.getElementById('activeCompName').textContent = '-';
      return;
    }

    list.forEach((c) => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-file-code"></i> <span>${escapeHTML(c.name)}</span>`;
      li.dataset.id = c.id;
      li.onclick = () => selectComposition(c.id);
      ul.appendChild(li);

      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    selectComposition(list[0].id);
  } catch (e) {
    console.error('[loadCompositions]', e);
    ul.innerHTML = `
      <li class="loading" style="color:var(--danger)">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Gagal memuat: ${escapeHTML(e.message)}
      </li>`;
    showToast('Gagal memuat compositions', e.message, 'error', 6000);
  }
}

function selectComposition(id) {
  document.querySelectorAll('#compList li').forEach(li => {
    li.classList.toggle('selected', li.dataset.id === id);
  });
  document.getElementById('compSelect').value = id;
  document.getElementById('activeCompName').textContent = id;
}

/* ============ LOAD RENDERS ============ */
async function loadRenders() {
  const grid = document.getElementById('rendersList');
  grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Memuat…</p></div>';

  try {
    const res = await fetch(`${API}/api/renders`);
    const list = await res.json();

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-inbox"></i>
          <p>Belum ada video yang dirender.</p>
        </div>`;
      return;
    }

    grid.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'render-card';
      card.innerHTML = `
        <div class="render-thumb">
          <video src="${item.url}" muted preload="metadata"></video>
          <button class="render-delete" title="Hapus">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <div class="render-info">
          <h4 title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h4>
          <p><i class="fa-regular fa-clock"></i> ${formatDate(item.createdAt)} · ${formatBytes(item.size)}</p>
        </div>
      `;
      card.querySelector('.render-thumb').onclick = (e) => {
        if (e.target.closest('.render-delete')) return;
        playPreview(item.url, item.name);
      };
      card.querySelector('.render-delete').onclick = (e) => {
        e.stopPropagation();
        confirmDelete(item);
      };
      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Gagal memuat: ${escapeHTML(e.message)}</p>
      </div>`;
  }
}

function confirmDelete(item) {
  showModal({
    title: 'Hapus Video?',
    body: `Video "${item.name}" akan dihapus permanen.`,
    type: 'warning',
    buttons: [
      { label: 'Batal' },
      {
        label: 'Hapus', primary: true,
        onClick: async () => {
          try {
            const res = await fetch(`${API}/api/renders/${item.name}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus');
            showToast('Terhapus', item.name, 'success', 2500);
            loadRenders();
          } catch (e) {
            showToast('Gagal menghapus', e.message, 'error');
          }
        }
      }
    ]
  });
}

/* ============ PREVIEW ============ */
function playPreview(url, name) {
  const video = document.getElementById('previewVideo');
  const empty = document.getElementById('previewEmpty');
  const dl = document.getElementById('downloadBtn');

  video.src = url + '?t=' + Date.now();
  video.style.display = 'block';
  empty.style.display = 'none';
  dl.style.display = 'flex';
  dl.onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'video.mp4';
    a.click();
  };

  document.querySelector('.preview-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  video.play().catch(() => {});
  if (name) showToast('Memutar preview', name, 'info', 2500);
}

/* ============ RENDER ============ */
async function startRender(e) {
  e.preventDefault();

  const compositionId = document.getElementById('compSelect').value;
  const durationInFrames = parseInt(document.getElementById('durationInput').value, 10);
  const fps = parseInt(document.getElementById('fpsInput').value, 10);
  const width = parseInt(document.getElementById('widthInput').value, 10);
  const height = parseInt(document.getElementById('heightInput').value, 10);
  const quality = document.getElementById('qualityInput').value;
  const format = document.getElementById('formatInput').value;

  if (!compositionId) {
    showModal({ title: 'Composition Belum Dipilih', body: 'Pilih composition terlebih dahulu.', type: 'warning' });
    return;
  }
  if (!durationInFrames || durationInFrames < 1) {
    showModal({ title: 'Durasi Tidak Valid', body: 'Durasi harus ≥ 1 frame.', type: 'warning' });
    return;
  }

  let props = {};
  const propsRaw = document.getElementById('propsInput').value.trim();
  if (propsRaw) {
    try { props = JSON.parse(propsRaw); }
    catch (err) {
      showModal({
        title: 'JSON Tidak Valid',
        body: 'Props harus berupa JSON yang valid.\n\nDetail: ' + err.message,
        type: 'error'
      });
      return;
    }
  }

  // Konfirmasi kalau durasi tinggi + resolusi tinggi (bisa lama)
  const totalPixels = width * height * durationInFrames;
  if (totalPixels > 1920 * 1080 * 300) {
    const confirmed = await confirmAsync({
      title: 'Render Besar?',
      body: `Render ${width}×${height} selama ${durationInFrames} frame mungkin butuh beberapa menit.\n\nLanjutkan?`,
      type: 'warning'
    });
    if (!confirmed) return;
  }

  const renderBtn = document.getElementById('renderBtn');
  renderBtn.disabled = true;
  renderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merender…';

  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressStage = document.getElementById('progressStage');
  progressWrap.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  progressStage.textContent = 'Memulai…';

  showToast('Render dimulai', `${compositionId} · ${width}×${height}`, 'info', 3500);

  try {
    const res = await fetch(`${API}/api/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compositionId, props, durationInFrames, fps, width, height, quality, format
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Render gagal');
    pollRender(data.jobId, { renderBtn });
  } catch (err) {
    renderBtn.disabled = false;
    renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';
    progressWrap.classList.add('hidden');
    showModal({ title: 'Render Gagal', body: err.message, type: 'error' });
    showToast('Render gagal', err.message, 'error', 6000);
  }
}

function confirmAsync({ title, body, type = 'info' }) {
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

const STAGE_LABELS = {
  bundling: 'Bundling TSX…',
  'launching-browser': 'Menjalankan browser…',
  'rendering-frames': 'Merender frames…',
  encoding: 'Encoding video…',
  done: 'Selesai!'
};

async function pollRender(jobId, { renderBtn }) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressStage = document.getElementById('progressStage');

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API}/api/render/${jobId}`);
      const job = await res.json();

      progressFill.style.width = job.progress + '%';
      progressText.textContent = job.progress + '%';
      if (job.stage && STAGE_LABELS[job.stage]) {
        progressStage.textContent = STAGE_LABELS[job.stage];
      }

      if (job.status === 'done') {
        clearInterval(interval);
        progressFill.style.width = '100%';
        progressText.textContent = '100%';
        progressStage.textContent = 'Selesai!';

        renderBtn.disabled = false;
        renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';

        showToast('Render selesai! 🎉', 'Video berhasil dibuat.', 'success', 5000);
        playPreview(job.output, job.output.split('/').pop());
        loadRenders();

        setTimeout(() => progressWrapHide(), 1500);
      } else if (job.status === 'error') {
        clearInterval(interval);
        renderBtn.disabled = false;
        renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';
        document.getElementById('progressWrap').classList.add('hidden');

        showModal({ title: 'Render Gagal', body: job.error || 'Terjadi kesalahan.', type: 'error' });
        showToast('Render gagal', job.error, 'error', 6000);
      }
    } catch (err) {
      clearInterval(interval);
      renderBtn.disabled = false;
      renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';
      showToast('Error polling', err.message, 'error');
    }
  }, 700);
}

function progressWrapHide() {
  document.getElementById('progressWrap').classList.add('hidden');
}

/* ============ PRESET HANDLERS ============ */
function applyResolutionPreset(btn) {
  const w = parseInt(btn.dataset.w, 10);
  const h = parseInt(btn.dataset.h, 10);
  document.getElementById('widthInput').value = w;
  document.getElementById('heightInput').value = h;
  document.querySelectorAll('#resolutionPresets .preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateOutputInfo();

  // Auto-update aspect ratio button
  const ar = getAspectRatio(w, h);
  document.querySelectorAll('#aspectPresets .preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ratio === ar);
  });
}

function applyAspectRatio(btn) {
  const [rw, rh] = btn.dataset.ratio.split(':').map(Number);
  const currentW = parseInt(document.getElementById('widthInput').value, 10) || 1280;
  // Pertahankan width, hitung height
  const newH = Math.round(currentW * (rh / rw));
  document.getElementById('heightInput').value = newH;
  document.querySelectorAll('#aspectPresets .preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateOutputInfo();
}

/* ============ EVENT BINDINGS ============ */
document.addEventListener('DOMContentLoaded', () => {
  loadCompositions();
  loadRenders();
  updateOutputInfo();

  document.getElementById('themeToggle').onclick = toggleTheme;

  document.getElementById('refreshBtn').onclick = () => {
    loadCompositions();
    showToast('Refreshed', 'Daftar composition diperbarui.', 'success', 2000);
  };
  document.getElementById('refreshRendersBtn').onclick = () => {
    loadRenders();
    showToast('Refreshed', 'Daftar render diperbarui.', 'success', 2000);
  };
  document.getElementById('newCompBtn').onclick = () => {
    showModal({
      title: 'Buat Composition Baru',
      body: 'Buat file .tsx baru di folder:\n\nsrc/compositions/NamaFile.tsx\n\nLalu klik Refresh.',
      type: 'info'
    });
  };
  document.getElementById('clearBtn').onclick = () => {
    document.getElementById('propsInput').value = '{}';
    showToast('Props di-clear', 'Textarea props dikosongkan.', 'info', 2000);
  };

  document.getElementById('renderForm').addEventListener('submit', startRender);
  document.getElementById('compSelect').addEventListener('change', (e) => selectComposition(e.target.value));

  // Preset resolution
  document.querySelectorAll('#resolutionPresets .preset-btn').forEach(btn => {
    btn.onclick = () => applyResolutionPreset(btn);
  });

  // Preset aspect ratio
  document.querySelectorAll('#aspectPresets .preset-btn').forEach(btn => {
    btn.onclick = () => applyAspectRatio(btn);
  });

  // Auto update info saat user ubah manual
  ['widthInput', 'heightInput', 'fpsInput', 'durationInput', 'formatInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      updateOutputInfo();
      // Un-highlight preset kalau ukuran tidak match
      if (id === 'widthInput' || id === 'heightInput') {
        const w = parseInt(document.getElementById('widthInput').value, 10);
        const h = parseInt(document.getElementById('heightInput').value, 10);
        document.querySelectorAll('#resolutionPresets .preset-btn').forEach(b => {
          b.classList.toggle('active', +b.dataset.w === w && +b.dataset.h === h);
        });
      }
    });
  });

  // Nav active
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  setTimeout(() => {
    showToast('Selamat datang! 👋', 'Win Motion Studio siap digunakan.', 'info', 4000);
  }, 600);
});