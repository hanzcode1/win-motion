/* ============================================================
   Compositions page - CRUD editor (fixed v3)
   ============================================================ */

let currentId = null;
let isDirty = false;
let templates = {};

/* ============ LOAD LIST ============ */
async function loadCompositions() {
  const ul = document.getElementById('compList');
  ul.innerHTML = '<li class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat…</li>';

  try {
    const list = await apiGet('/api/compositions');
    ul.innerHTML = '';

    if (list.length === 0) {
      ul.innerHTML = `<li class="loading"><i class="fa-solid fa-circle-info"></i> Belum ada composition</li>`;
      return;
    }

    list.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-file-code"></i> <span>${escapeHTML(c.name)}</span>`;
      li.dataset.id = c.id;
      li.onclick = () => openComposition(c.id);
      ul.appendChild(li);
    });

    // Restore selection kalau ada
    if (currentId) {
      const exists = list.find(c => c.id === currentId);
      if (exists) {
        document.querySelectorAll('#compList li').forEach(li => {
          li.classList.toggle('selected', li.dataset.id === currentId);
        });
      }
    }
  } catch (e) {
    ul.innerHTML = `<li class="loading" style="color:var(--danger)"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHTML(e.message)}</li>`;
  }
}

/* ============ SHOW/HIDE STATES ============ */
function showEmptyState() {
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('editorWrap').classList.add('hidden');
  document.getElementById('editorTitle').textContent = 'Pilih Composition';
  document.getElementById('editorStatus').textContent = '-';
  document.getElementById('editorStatus').className = 'badge';
}

function showEditor() {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('editorWrap').classList.remove('hidden');
}

/* ============ OPEN / LOAD ============ */
async function openComposition(id) {
  if (isDirty) {
    const ok = await confirmAsync({
      title: 'Perubahan Belum Disimpan',
      body: 'Yakin pindah? Perubahan yang belum disimpan akan hilang.'
    });
    if (!ok) return;
  }

  try {
    const data = await apiGet(`/api/compositions/${id}`);
    currentId = id;
    isDirty = false;

    // Update header
    document.getElementById('editorTitle').textContent = id + '.tsx';
    document.getElementById('editorStatus').textContent = id;
    document.getElementById('editorStatus').className = 'badge';
    document.getElementById('saveInfo').textContent = 'Tersimpan';
    document.getElementById('saveInfo').style.color = 'var(--text-secondary)';

    // Show editor, hide empty state
    showEditor();

    // Load code
    const editor = document.getElementById('codeEditor');
    editor.value = data.code;
    updateLineNumbers();
    updateStatus();

    // Highlight di sidebar
    document.querySelectorAll('#compList li').forEach(li => {
      li.classList.toggle('selected', li.dataset.id === id);
    });

    // ✅ Scroll ke atas + focus tanpa scroll otomatis
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset scroll di editor container
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) editorContainer.scrollTop = 0;

    // ✅ Focus tanpa scroll (kunci utama!)
    setTimeout(() => {
      editor.focus({ preventScroll: true });
    }, 100);
  } catch (e) {
    showToast('Gagal buka', e.message, 'error');
  }
}

/* ============ SAVE ============ */
async function saveComposition() {
  if (!currentId) return;
  const code = document.getElementById('codeEditor').value;
  if (!code.trim()) {
    showToast('Kosong', 'Code tidak boleh kosong.', 'warning');
    return;
  }

  try {
    await apiPut(`/api/compositions/${currentId}`, { code });
    isDirty = false;
    document.getElementById('saveInfo').textContent = 'Tersimpan';
    document.getElementById('saveInfo').style.color = 'var(--success)';
    showToast('Tersimpan', `${currentId}.tsx berhasil disimpan.`, 'success', 2500);
  } catch (e) {
    showToast('Gagal simpan', e.message, 'error');
  }
}

/* ============ NEW ============ */
async function createNew() {
  const name = await promptAsync({
    title: 'Composition Baru',
    label: 'Nama composition (huruf, angka, _ atau -)',
    placeholder: 'MyComposition'
  });
  if (!name) return;

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    showModal({
      title: 'Nama Tidak Valid',
      body: 'Harus diawali huruf, hanya huruf/angka/_/-',
      type: 'warning'
    });
    return;
  }

  // Pilih template
  const template = await chooseTemplate();
  if (template === null) return;

  try {
    await apiPost('/api/compositions', { id: name, template });
    showToast('Dibuat', `${name}.tsx berhasil dibuat.`, 'success', 2500);
    await loadCompositions();
    await openComposition(name);
  } catch (e) {
    showModal({ title: 'Gagal Buat', body: e.message, type: 'error' });
  }
}

function chooseTemplate() {
  return new Promise(resolve => {
    const tplList = Object.entries(templates).map(([k, v]) =>
      `<option value="${k}">${escapeHTML(v.name)} - ${escapeHTML(v.description)}</option>`
    ).join('');

    showModal({
      title: 'Pilih Template',
      html: `
        <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:6px">Template dasar</label>
        <select id="templateSelect" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg);color:var(--text);font-family:inherit;font-size:14px">
          ${tplList || '<option value="blank">Blank</option>'}
        </select>
      `,
      type: 'info',
      buttons: [
        { label: 'Batal', onClick: () => resolve(null) },
        {
          label: 'Buat', primary: true,
          onClick: () => {
            const v = document.getElementById('templateSelect')?.value || 'blank';
            resolve(v);
          }
        }
      ]
    });
  });
}

/* ============ RENAME ============ */
async function renameComposition() {
  if (!currentId) return;
  const newId = await promptAsync({
    title: 'Rename Composition',
    label: 'Nama baru',
    value: currentId,
    placeholder: 'NewName'
  });
  if (!newId || newId === currentId) return;

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(newId)) {
    showModal({
      title: 'Nama Tidak Valid',
      body: 'Harus diawali huruf, hanya huruf/angka/_/-',
      type: 'warning'
    });
    return;
  }

  try {
    await apiPost(`/api/compositions/${currentId}/rename`, { newId });
    showToast('Renamed', `${currentId} → ${newId}`, 'success', 2500);
    currentId = newId;
    document.getElementById('editorTitle').textContent = newId + '.tsx';
    document.getElementById('editorStatus').textContent = newId;
    await loadCompositions();
  } catch (e) {
    showToast('Gagal rename', e.message, 'error');
  }
}

/* ============ DELETE ============ */
async function deleteComposition() {
  if (!currentId) return;
  const ok = await confirmAsync({
    title: 'Hapus Composition?',
    body: `Yakin hapus ${currentId}.tsx? Tindakan ini tidak bisa dibatalkan.`
  });
  if (!ok) return;

  try {
    await apiDelete(`/api/compositions/${currentId}`);
    showToast('Terhapus', `${currentId}.tsx dihapus.`, 'success', 2500);
    currentId = null;
    isDirty = false;

    // ✅ Kembali ke empty state
    showEmptyState();

    await loadCompositions();
  } catch (e) {
    showToast('Gagal hapus', e.message, 'error');
  }
}

/* ============ CHECK SYNTAX ============ */
function checkSyntax() {
  const code = document.getElementById('codeEditor').value;
  const issues = [];

  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Kurung kurawal tidak seimbang: ${openBraces} buka, ${closeBraces} tutup`);
  }

  const openParen = (code.match(/\(/g) || []).length;
  const closeParen = (code.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    issues.push(`Kurung buka-tutup tidak seimbang: ${openParen} vs ${closeParen}`);
  }

  if (!code.includes('export default')) {
    issues.push('Tidak ada `export default` - composition tidak akan terdeteksi');
  }
  if (!code.includes('declare const React')) {
    issues.push('Missing `declare const React: any;` (jika pakai JSX/React.createElement)');
  }
  if (!code.includes('declare const Remotion')) {
    issues.push('Missing `declare const Remotion: any;` (jika pakai API Remotion)');
  }

  if (issues.length === 0) {
    showModal({
      title: '✓ Syntax OK',
      body: 'Tidak ada masalah terdeteksi.\n\nIngat: ini hanya pengecekan dasar. Syntax error sebenarnya akan muncul saat render.',
      type: 'success'
    });
  } else {
    showModal({
      title: '⚠️ Peringatan',
      body: issues.join('\n\n'),
      type: 'warning'
    });
  }
}

/* ============ LINE NUMBERS & STATUS ============ */
function updateLineNumbers() {
  const editor = document.getElementById('codeEditor');
  const lines = editor.value.split('\n').length;
  const nums = document.getElementById('lineNumbers');
  let html = '';
  for (let i = 1; i <= lines; i++) html += i + '<br>';
  nums.innerHTML = html;
  nums.scrollTop = editor.scrollTop;
}

function updateStatus() {
  const editor = document.getElementById('codeEditor');
  const val = editor.value;
  const pos = editor.selectionStart;
  const before = val.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  document.getElementById('lineInfo').textContent = `Ln ${line}, Col ${col}`;
  document.getElementById('charInfo').textContent = `${val.length} chars`;
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', async () => {
  // ✅ Pastikan state awal: empty state tampil, editor hidden
  showEmptyState();

  // Load templates
  try {
    templates = await apiGet('/api/templates');
  } catch (e) {
    console.warn('Templates gagal load:', e);
    templates = {};
  }

  // Load daftar
  await loadCompositions();

  // Event bindings
  document.getElementById('refreshBtn').onclick = () => {
    loadCompositions();
    showToast('Refreshed', 'Daftar diperbarui.', 'success', 2000);
  };

  document.getElementById('newCompBtn').onclick = createNew;
  document.getElementById('newCompBtn2').onclick = createNew;
  document.getElementById('saveBtn').onclick = saveComposition;
  document.getElementById('renameBtn').onclick = renameComposition;
  document.getElementById('deleteBtn').onclick = deleteComposition;
  document.getElementById('previewBtn').onclick = checkSyntax;

  const editor = document.getElementById('codeEditor');

  // Track dirty state
  editor.addEventListener('input', () => {
    updateLineNumbers();
    updateStatus();
    if (!isDirty) {
      isDirty = true;
      document.getElementById('saveInfo').textContent = 'Belum disimpan';
      document.getElementById('saveInfo').style.color = 'var(--warning)';
    }
  });

  editor.addEventListener('keyup', updateStatus);
  editor.addEventListener('click', updateStatus);

  // Sync scroll line numbers
  editor.addEventListener('scroll', () => {
    document.getElementById('lineNumbers').scrollTop = editor.scrollTop;
  });

  // Tab → 2 spasi + Ctrl+S save
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      updateLineNumbers();
      updateStatus();
      isDirty = true;
      document.getElementById('saveInfo').textContent = 'Belum disimpan';
      document.getElementById('saveInfo').style.color = 'var(--warning)';
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveComposition();
    }
  });

  // Warn before unload kalau ada perubahan
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});