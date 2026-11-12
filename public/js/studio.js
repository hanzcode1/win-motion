/* ============================================================
   Studio page v4 — render config + cancel + live frame preview
   Fixed: even dimensions (H.264 requirement)
   ============================================================ */

let selectedComposition = null;
let detectedFields = [];
let guiValues = {};
let propsMode = localStorage.getItem('propsMode') || 'gui';
let currentJobId = null;
let pollInterval = null;
let renderStartTime = null;

/* ============ HELPERS ============ */
function toEven(n) {
  const num = Math.floor(Number(n));
  if (!num || num < 2) return 2;
  return num % 2 === 0 ? num : num - 1;
}

/* ============ COMPOSITIONS ============ */
async function loadCompositions() {
  const ul = document.getElementById('compList');
  const select = document.getElementById('compSelect');
  ul.innerHTML = '<li class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat…</li>';
  select.innerHTML = '';

  try {
    const list = await apiGet('/api/compositions');
    ul.innerHTML = '';

    if (list.length === 0) {
      ul.innerHTML = `
        <li class="loading">
          <i class="fa-solid fa-circle-info"></i>
          Belum ada composition.
          <a href="/compositions" style="color:var(--primary);margin-left:4px">Buat sekarang</a>
        </li>`;
      document.getElementById('activeCompName').textContent = '—';
      showPropsEmpty();
      return;
    }

    list.forEach(c => {
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

    const saved = localStorage.getItem('selectedComp');
    const found = list.find(c => c.id === saved);
    await selectComposition(found ? found.id : list[0].id);
  } catch (e) {
    ul.innerHTML = `<li class="loading" style="color:var(--danger)"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHTML(e.message)}</li>`;
    showToast('Gagal memuat', e.message, 'error');
  }
}

async function selectComposition(id) {
  selectedComposition = id;
  localStorage.setItem('selectedComp', id);
  document.querySelectorAll('#compList li').forEach(li => {
    li.classList.toggle('selected', li.dataset.id === id);
  });
  document.getElementById('compSelect').value = id;
  document.getElementById('activeCompName').textContent = id;
  await loadPropsForComposition(id);
}

/* ============ PROPS ============ */
async function loadPropsForComposition(id) {
  showPropsEmpty('Mendeteksi props…');
  try {
    const [codeData, propsData] = await Promise.all([
      apiGet(`/api/compositions/${id}`),
      apiGet(`/api/compositions/${id}/props`)
    ]);

    let fields = propsData.fields || [];
    if (fields.length === 0 && window.PropsDetector) {
      fields = window.PropsDetector.detectPropsFromCode(codeData.code);
    }

    detectedFields = fields;
    guiValues = {};
    fields.forEach(f => {
      guiValues[f.name] = f.defaultValue !== undefined ? f.defaultValue : defaultForType(f.type);
    });

    renderPropsGUI();

    const count = fields.length;
    document.getElementById('propsCount').textContent =
      count === 0 ? '— tidak ada props' : `— ${count} field terdeteksi`;

    syncGuiToJson();
  } catch (e) {
    console.error('[loadProps]', e);
    showPropsEmpty('Gagal deteksi props: ' + e.message);
    document.getElementById('propsCount').textContent = '— error';
  }
}

function defaultForType(type) {
  switch (type) {
    case 'number': return 0;
    case 'checkbox': return false;
    case 'json': return null;
    case 'color': return '#0078d4';
    default: return '';
  }
}

function showPropsEmpty(msg) {
  const empty = document.getElementById('propsEmpty');
  const fields = document.getElementById('propsFields');
  if (msg) {
    empty.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p>${escapeHTML(msg)}</p>`;
  } else {
    empty.innerHTML = `
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <p>Pilih composition untuk melihat props</p>
      <span>Props akan otomatis terdeteksi dari kode</span>
    `;
  }
  empty.style.display = 'block';
  fields.style.display = 'none';
}

function renderPropsGUI() {
  const empty = document.getElementById('propsEmpty');
  const wrap = document.getElementById('propsFields');

  if (detectedFields.length === 0) {
    empty.innerHTML = `
      <i class="fa-solid fa-circle-info"></i>
      <p>Tidak ada props terdeteksi</p>
      <span>Composition ini tidak punya interface Props.</span>
    `;
    empty.style.display = 'block';
    wrap.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  wrap.style.display = 'flex';
  wrap.innerHTML = '';

  detectedFields.forEach(f => {
    const div = document.createElement('div');
    div.className = 'prop-field';
    div.dataset.field = f.name;

    const label = `
      <div class="prop-field-label">
        <strong>${escapeHTML(f.label)}</strong>
        <span class="prop-field-type ${f.optional ? 'optional' : ''}">
          ${escapeHTML(f.type)}${f.optional ? ' · opsional' : ''}
        </span>
      </div>
    `;

    let input = '';
    const val = guiValues[f.name];

    if (f.type === 'text') {
      input = `<input type="text" data-prop="${escapeHTML(f.name)}" value="${escapeHTML(String(val || ''))}" placeholder="${escapeHTML(f.label)}">`;
    } else if (f.type === 'number') {
      input = `<input type="number" data-prop="${escapeHTML(f.name)}" value="${Number(val) || 0}" step="any">`;
    } else if (f.type === 'color') {
      const hex = normalizeHex(val || '#0078d4');
      input = `
        <div class="color-picker-wrap">
          <input type="color" data-prop="${escapeHTML(f.name)}" value="${hex}">
          <input type="text" data-prop-hex="${escapeHTML(f.name)}" value="${hex}" placeholder="#RRGGBB">
        </div>
      `;
    } else if (f.type === 'checkbox') {
      input = `
        <label class="switch-wrap">
          <input type="checkbox" data-prop="${escapeHTML(f.name)}" ${val ? 'checked' : ''}>
          <span class="switch"></span>
          <span class="switch-text">${val ? 'Aktif' : 'Nonaktif'}</span>
        </label>
      `;
    } else if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${escapeHTML(o)}" ${o === val ? 'selected' : ''}>${escapeHTML(o)}</option>`
      ).join('');
      input = `<select data-prop="${escapeHTML(f.name)}">${opts}</select>`;
    } else {
      const jsonVal = val !== null && val !== undefined ? JSON.stringify(val, null, 2) : '';
      input = `<textarea data-prop="${escapeHTML(f.name)}" placeholder='JSON'>${escapeHTML(jsonVal)}</textarea>`;
    }

    div.innerHTML = label + input;

    div.querySelectorAll('[data-prop]').forEach(el => {
      const name = el.dataset.prop;
      const type = el.type;
      const handler = () => {
        if (type === 'checkbox') {
          guiValues[name] = el.checked;
          const txt = div.querySelector('.switch-text');
          if (txt) txt.textContent = el.checked ? 'Aktif' : 'Nonaktif';
        } else if (type === 'number') {
          guiValues[name] = parseFloat(el.value) || 0;
        } else if (type === 'color') {
          guiValues[name] = el.value;
          const hex = div.querySelector(`[data-prop-hex="${name}"]`);
          if (hex) hex.value = el.value.toUpperCase();
        } else if (el.tagName === 'TEXTAREA' && f.type === 'json') {
          try {
            guiValues[name] = el.value.trim() ? JSON.parse(el.value) : null;
            el.style.borderColor = '';
          } catch {
            el.style.borderColor = 'var(--danger)';
          }
        } else {
          guiValues[name] = el.value;
        }
        syncGuiToJson();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });

    const hexInput = div.querySelector(`[data-prop-hex]`);
    if (hexInput) {
      hexInput.addEventListener('input', () => {
        const name = hexInput.dataset.propHex;
        const v = hexInput.value.trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) {
          guiValues[name] = v;
          const picker = div.querySelector(`input[type="color"][data-prop="${name}"]`);
          if (picker) picker.value = v;
          hexInput.style.borderColor = '';
          syncGuiToJson();
        } else {
          hexInput.style.borderColor = 'var(--danger)';
        }
      });
    }

    wrap.appendChild(div);
  });
}

function normalizeHex(hex) {
  if (!hex) return '#0078d4';
  hex = String(hex).trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();
  return '#0078d4';
}

function buildPropsFromGui() {
  const props = {};
  detectedFields.forEach(f => {
    const v = guiValues[f.name];
    if (v !== undefined && v !== null && v !== '') {
      props[f.name] = v;
    }
  });
  return props;
}

function syncGuiToJson() {
  const props = buildPropsFromGui();
  document.getElementById('propsInput').value = JSON.stringify(props, null, 2);
}

function syncJsonToGui() {
  try {
    const props = JSON.parse(document.getElementById('propsInput').value || '{}');
    detectedFields.forEach(f => {
      if (props[f.name] !== undefined) guiValues[f.name] = props[f.name];
    });
    renderPropsGUI();
  } catch {}
}

function setPropsMode(mode) {
  propsMode = mode;
  localStorage.setItem('propsMode', mode);

  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  if (mode === 'json') {
    if (detectedFields.length > 0) syncGuiToJson();
    document.getElementById('propsGui').style.display = 'none';
    document.getElementById('propsJson').style.display = 'flex';
  } else {
    syncJsonToGui();
    document.getElementById('propsJson').style.display = 'none';
    document.getElementById('propsGui').style.display = 'block';
  }
}

function resetPropsToDefault() {
  if (detectedFields.length === 0) {
    showToast('Tidak ada props', 'Composition tidak punya field terdeteksi.', 'warning');
    return;
  }
  detectedFields.forEach(f => {
    guiValues[f.name] = f.defaultValue !== undefined ? f.defaultValue : defaultForType(f.type);
  });
  renderPropsGUI();
  syncGuiToJson();
  showToast('Reset', 'Props dikembalikan ke default.', 'success', 2000);
}

async function copyPropsJson() {
  const json = JSON.stringify(buildPropsFromGui(), null, 2);
  try {
    await navigator.clipboard.writeText(json);
    showToast('Tersalin', 'JSON props di-copy.', 'success', 2000);
  } catch {
    showToast('Gagal copy', 'Gunakan Ctrl+C manual.', 'error');
  }
}

/* ============ DURATION SYNC ============ */
let isSyncingDuration = false;

function getCurrentFps() {
  return parseInt(document.getElementById('fpsInput').value, 10) || 30;
}

function updateDurationFromSeconds() {
  if (isSyncingDuration) return;
  isSyncingDuration = true;

  const sec = parseFloat(document.getElementById('durationSecInput').value) || 0;
  const fps = getCurrentFps();
  const frames = Math.max(1, Math.round(sec * fps));

  document.getElementById('durationInput').value = frames;
  document.getElementById('framesAutoInfo').textContent = `= ${sec}s × ${fps}fps`;
  updateOutputInfo();

  isSyncingDuration = false;
}

function updateDurationFromFrames() {
  if (isSyncingDuration) return;
  isSyncingDuration = true;

  const frames = parseInt(document.getElementById('durationInput').value, 10) || 0;
  const fps = getCurrentFps();
  const sec = frames / fps;

  document.getElementById('durationSecInput').value = sec.toFixed(2);
  document.getElementById('framesAutoInfo').textContent = `= ${sec.toFixed(2)}s × ${fps}fps`;
  updateOutputInfo();

  isSyncingDuration = false;
}

function updateFramesInfo() {
  const fps = getCurrentFps();
  const frames = parseInt(document.getElementById('durationInput').value, 10) || 0;
  const sec = frames / fps;
  document.getElementById('framesAutoInfo').textContent = `= ${sec.toFixed(2)}s × ${fps}fps`;
}

/* ============ INFO BOX ============ */
function updateOutputInfo() {
  const w = parseInt(document.getElementById('widthInput').value, 10) || 0;
  const h = parseInt(document.getElementById('heightInput').value, 10) || 0;
  const fps = getCurrentFps();
  const frames = parseInt(document.getElementById('durationInput').value, 10) || 0;
  const format = document.getElementById('formatInput').value.toUpperCase();
  const ar = (w && h) ? getAspectRatio(w, h) : '?';
  const seconds = (frames / fps).toFixed(2);

  document.getElementById('outputInfo').textContent =
    `${w} × ${h} (${ar}) · ${fps}fps · ${seconds}s · ${frames} frames · ${format}`;
}

/* ============ PRESETS ============ */
function applyResolutionPreset(btn) {
  document.getElementById('widthInput').value = btn.dataset.w;
  document.getElementById('heightInput').value = btn.dataset.h;
  document.querySelectorAll('#resolutionPresets .preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateOutputInfo();
  const ar = getAspectRatio(+btn.dataset.w, +btn.dataset.h);
  document.querySelectorAll('#aspectPresets .preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ratio === ar);
  });
}

// ✅ FIX: Aspect ratio dengan auto-genap
function applyAspectRatio(btn) {
  const [rw, rh] = btn.dataset.ratio.split(':').map(Number);
  const currentW = parseInt(document.getElementById('widthInput').value, 10) || 1280;

  const newH = currentW * (rh / rw);

  // Pastikan genap (H.264 butuh divisible by 2)
  const evenW = toEven(currentW);
  const evenH = toEven(Math.round(newH));

  document.getElementById('widthInput').value = evenW;
  document.getElementById('heightInput').value = evenH;

  document.querySelectorAll('#aspectPresets .preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateOutputInfo();

  // Info ke user kalau ada penyesuaian
  if (evenW !== currentW || evenH !== Math.round(newH)) {
    showToast(
      'Dimensi disesuaikan',
      `${currentW}×${Math.round(newH)} → ${evenW}×${evenH} (harus genap untuk H.264)`,
      'info',
      2500
    );
  }
}

/* ============ FORMAT TIME ============ */
function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/* ============ RENDER ============ */
async function startRender(e) {
  e.preventDefault();

  const compositionId = document.getElementById('compSelect').value;
  const durationInFrames = parseInt(document.getElementById('durationInput').value, 10);
  const fps = getCurrentFps();
  let width = parseInt(document.getElementById('widthInput').value, 10);
  let height = parseInt(document.getElementById('heightInput').value, 10);
  const quality = document.getElementById('qualityInput').value;
  const format = document.getElementById('formatInput').value;

  if (!compositionId) {
    showModal({ title: 'Composition Belum Dipilih', body: 'Pilih composition dulu.', type: 'warning' });
    return;
  }
  if (!durationInFrames || durationInFrames < 1) {
    showModal({ title: 'Durasi Tidak Valid', body: 'Durasi harus ≥ 1 frame.', type: 'warning' });
    return;
  }

  // ✅ FIX: Sanitize dimensi genap sebelum kirim ke server
  const safeW = toEven(width);
  const safeH = toEven(height);
  if (safeW !== width || safeH !== height) {
    console.log(`⚠️  Dimensi auto-fix: ${width}×${height} → ${safeW}×${safeH}`);
    width = safeW;
    height = safeH;
  }

  let props = {};
  if (propsMode === 'gui') {
    props = buildPropsFromGui();
  } else {
    const raw = document.getElementById('propsInput').value.trim();
    if (raw) {
      try { props = JSON.parse(raw); }
      catch (err) {
        showModal({
          title: 'JSON Tidak Valid',
          body: 'Props JSON tidak valid.\n\n' + err.message,
          type: 'error'
        });
        return;
      }
    }
  }

  if (width * height * durationInFrames > 1920 * 1080 * 300) {
    const ok = await confirmAsync({
      title: 'Render Besar?',
      body: `Render ${width}×${height} × ${durationInFrames} frame (${(durationInFrames / fps).toFixed(1)}s) bisa butuh beberapa menit.\n\nLanjutkan?`
    });
    if (!ok) return;
  }

  const renderBtn = document.getElementById('renderBtn');
  renderBtn.disabled = true;
  renderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merender…';

  const pw = document.getElementById('progressWrap');
  const pf = document.getElementById('progressFill');
  const pt = document.getElementById('progressText');
  const ps = document.getElementById('progressStage');
  const pFrame = document.getElementById('progressFrame');
  const pEta = document.getElementById('progressEta');
  const fpWrap = document.getElementById('framePreviewWrap');
  const fpImg = document.getElementById('framePreviewImg');

  pw.classList.remove('hidden');
  pf.style.width = '0%';
  pt.textContent = '0%';
  ps.textContent = 'Memulai…';
  pFrame.textContent = `Frame 0 / ${durationInFrames}`;
  pEta.textContent = '—';
  fpWrap.style.display = 'none';
  fpImg.src = '';
  renderStartTime = Date.now();

  showToast('Render dimulai', `${compositionId} · ${width}×${height} · ${durationInFrames} frame`, 'info', 3500);

  try {
    const data = await apiPost('/api/render', {
      compositionId, props, durationInFrames, fps, width, height, quality, format
    });

    currentJobId = data.jobId;
    document.getElementById('cancelRenderBtn').disabled = false;
    document.getElementById('cancelRenderBtn').innerHTML = '<i class="fa-solid fa-stop"></i> Batalkan Render';

    startPolling(data.jobId, renderBtn);
  } catch (err) {
    resetRenderUI(renderBtn);
    showModal({ title: 'Render Gagal', body: err.message, type: 'error' });
    showToast('Render gagal', err.message, 'error', 6000);
  }
}

function resetRenderUI(renderBtn) {
  renderBtn.disabled = false;
  renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';
  document.getElementById('progressWrap').classList.add('hidden');
  document.getElementById('cancelRenderBtn').disabled = true;
  currentJobId = null;
  renderStartTime = null;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

const STAGE_LABELS = {
  'pending': 'Menunggu…',
  'bundling': 'Bundling TSX…',
  'launching-browser': 'Menjalankan browser…',
  'rendering-frames': 'Merender frames…',
  'encoding': 'Encoding video…',
  'done': 'Selesai!',
  'canceled': 'Dibatalkan'
};

function startPolling(jobId, renderBtn) {
  if (pollInterval) clearInterval(pollInterval);

  const pf = document.getElementById('progressFill');
  const pt = document.getElementById('progressText');
  const ps = document.getElementById('progressStage');
  const pFrame = document.getElementById('progressFrame');
  const pEta = document.getElementById('progressEta');
  const fpWrap = document.getElementById('framePreviewWrap');
  const fpImg = document.getElementById('framePreviewImg');

  pollInterval = setInterval(async () => {
    try {
      const job = await apiGet(`/api/render/${jobId}`);

      pf.style.width = job.progress + '%';
      pt.textContent = job.progress + '%';

      if (job.stage && STAGE_LABELS[job.stage]) {
        ps.textContent = STAGE_LABELS[job.stage];
      }

      if (job.totalFrames) {
        pFrame.textContent = `Frame ${job.frame || 0} / ${job.totalFrames}`;
      }

      if (renderStartTime && job.progress > 3 && job.status === 'rendering') {
        const elapsed = (Date.now() - renderStartTime) / 1000;
        const estTotal = elapsed / (job.progress / 100);
        const remaining = Math.max(0, estTotal - elapsed);
        pEta.textContent = `~${formatDuration(remaining)} tersisa`;
      }

      if (job.previewUrl) {
        fpWrap.style.display = 'block';
        if (fpImg.dataset.src !== job.previewUrl) {
          fpImg.dataset.src = job.previewUrl;
          fpImg.src = job.previewUrl;
        }
      }

      if (job.status === 'done') {
        clearInterval(pollInterval);
        pollInterval = null;
        pf.style.width = '100%';
        pt.textContent = '100%';
        ps.textContent = 'Selesai!';
        pEta.textContent = '';

        renderBtn.disabled = false;
        renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';
        document.getElementById('cancelRenderBtn').disabled = true;

        showToast('Render selesai! 🎉', 'Video berhasil dibuat.', 'success', 5000);
        playPreview(job.output, job.output.split('/').pop());

        setTimeout(() => {
          document.getElementById('progressWrap').classList.add('hidden');
          document.getElementById('framePreviewWrap').style.display = 'none';
        }, 2500);

        currentJobId = null;
        renderStartTime = null;
      } else if (job.status === 'canceled') {
        clearInterval(pollInterval);
        pollInterval = null;

        renderBtn.disabled = false;
        renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';

        showToast('Render dibatalkan', 'Proses render dihentikan.', 'warning', 4000);

        setTimeout(() => {
          document.getElementById('progressWrap').classList.add('hidden');
          document.getElementById('framePreviewWrap').style.display = 'none';
        }, 1500);

        currentJobId = null;
        renderStartTime = null;
      } else if (job.status === 'error') {
        clearInterval(pollInterval);
        pollInterval = null;
        renderBtn.disabled = false;
        renderBtn.innerHTML = '<i class="fa-solid fa-play"></i> Render Video';
        document.getElementById('progressWrap').classList.add('hidden');
        document.getElementById('framePreviewWrap').style.display = 'none';
        showModal({ title: 'Render Gagal', body: job.error || 'Error.', type: 'error' });
        showToast('Render gagal', job.error, 'error', 6000);
        currentJobId = null;
        renderStartTime = null;
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 700);
}

/* ============ CANCEL ============ */
async function cancelRender() {
  if (!currentJobId) return;

  const ok = await confirmAsync({
    title: 'Batalkan Render?',
    body: 'Yakin batalkan render yang sedang berjalan? Frame yang sudah dirender akan dihapus.',
    type: 'warning'
  });
  if (!ok) return;

  const btn = document.getElementById('cancelRenderBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membatalkan…';
  document.getElementById('progressStage').textContent = 'Membatalkan…';

  try {
    await apiPost(`/api/render/${currentJobId}/cancel`, {});
    showToast('Dibatalkan', 'Permintaan cancel dikirim.', 'info', 3000);
  } catch (e) {
    showToast('Gagal cancel', e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> Batalkan Render';
  }
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

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', async () => {
  setPropsMode(propsMode);
  await loadCompositions();
  updateOutputInfo();

  document.getElementById('refreshBtn').onclick = () => {
    loadCompositions();
    showToast('Refreshed', 'Daftar diperbarui.', 'success', 2000);
  };

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => setPropsMode(btn.dataset.mode);
  });

  document.getElementById('resetPropsBtn').onclick = resetPropsToDefault;
  document.getElementById('copyPropsBtn').onclick = copyPropsJson;

  document.getElementById('renderForm').addEventListener('submit', startRender);
  document.getElementById('compSelect').addEventListener('change', e => selectComposition(e.target.value));
  document.getElementById('cancelRenderBtn').onclick = cancelRender;

  document.querySelectorAll('#resolutionPresets .preset-btn').forEach(b => {
    b.onclick = () => applyResolutionPreset(b);
  });
  document.querySelectorAll('#aspectPresets .preset-btn').forEach(b => {
    b.onclick = () => applyAspectRatio(b);
  });

  document.getElementById('durationSecInput').addEventListener('input', updateDurationFromSeconds);
  document.getElementById('durationInput').addEventListener('input', updateDurationFromFrames);
  document.getElementById('fpsInput').addEventListener('change', () => {
    updateDurationFromSeconds();
  });

  // ✅ FIX: Auto-bulatkan dimensi genap saat user ketik manual
  ['widthInput', 'heightInput'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = parseInt(el.value, 10);
      const isWidth = id === 'widthInput';

      // Tampilkan hint kalau ganjil
      if (val && val % 2 !== 0) {
        el.style.borderColor = 'var(--warning)';
        el.title = `${isWidth ? 'Width' : 'Height'} harus genap untuk H.264. Akan disesuaikan otomatis.`;
      } else {
        el.style.borderColor = '';
        el.title = '';
      }

      updateOutputInfo();

      // Un-highlight preset kalau tidak match
      const w = parseInt(document.getElementById('widthInput').value, 10);
      const h = parseInt(document.getElementById('heightInput').value, 10);
      document.querySelectorAll('#resolutionPresets .preset-btn').forEach(b => {
        b.classList.toggle('active', +b.dataset.w === w && +b.dataset.h === h);
      });
    });

    // Saat blur, auto-fix ke genap
    el.addEventListener('blur', () => {
      const val = parseInt(el.value, 10);
      if (val && val % 2 !== 0) {
        const fixed = toEven(val);
        el.value = fixed;
        el.style.borderColor = '';
        el.title = '';
        const isWidth = id === 'widthInput';
        showToast(
          'Dimensi auto-fix',
          `${isWidth ? 'Width' : 'Height'} ${val} → ${fixed} (harus genap untuk H.264)`,
          'info',
          2500
        );
        updateOutputInfo();
      }
    });
  });

  ['formatInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateOutputInfo);
  });

  document.getElementById('propsInput').addEventListener('input', () => {
    if (propsMode === 'json') {
      try {
        JSON.parse(document.getElementById('propsInput').value);
        document.getElementById('propsInput').style.borderColor = '';
      } catch {
        document.getElementById('propsInput').style.borderColor = 'var(--danger)';
      }
    }
  });

  updateDurationFromSeconds();

  setTimeout(() => {
    showToast('Selamat datang! 👋', 'Dimensi ganjil akan otomatis disesuaikan ke genap.', 'info', 4000);
  }, 500);
});