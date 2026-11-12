/* ============================================================
   Render gallery page
   ============================================================ */

let allRenders = [];
let currentVideo = null;

async function loadRenders() {
  const grid = document.getElementById('rendersList');
  grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Memuat…</p></div>';

  try {
    allRenders = await apiGet('/api/renders');
    renderGallery(allRenders);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHTML(e.message)}</p></div>`;
  }
}

function renderGallery(list) {
  const grid = document.getElementById('rendersList');

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>Belum ada video dirender.</p>
        <a href="/studio" class="btn btn-primary" style="margin-top:16px; text-decoration: none;">
          <i class="fa-solid fa-play"></i> Mulai Render
        </a>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  list.forEach(item => {
    const ext = item.name.split('.').pop().toLowerCase();
    const card = document.createElement('div');
    card.className = 'render-card';
    card.innerHTML = `
      <div class="render-thumb">
        ${ext === 'gif'
          ? `<img src="${item.url}" alt="${escapeHTML(item.name)}" style="width:100%;height:100%;object-fit:cover">`
          : `<video src="${item.url}" muted preload="metadata"></video>`}
        <button class="render-delete" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="render-info">
        <h4 title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h4>
        <p><i class="fa-regular fa-clock"></i> ${formatDate(item.createdAt)} · ${formatBytes(item.size)}</p>
      </div>
    `;

    card.querySelector('.render-thumb').onclick = (e) => {
      if (e.target.closest('.render-delete')) return;
      openVideo(item.url, item.name);
    };
    card.querySelector('.render-delete').onclick = (e) => {
      e.stopPropagation();
      confirmDelete(item);
    };
    grid.appendChild(card);
  });
}

function openVideo(url, name) {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');

  document.getElementById('videoTitle').textContent = name;
  video.src = url + '?t=' + Date.now();
  modal.classList.remove('hidden');

  // Lock body scroll
  document.body.classList.add('modal-open');

  // Play (muted fallback kalau autoplay gagal)
  video.play().catch(() => {
    video.muted = true;
    video.play().catch(() => {});
  });

  currentVideo = { url, name };

  document.getElementById('modalDownloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download', `Mengunduh ${name}`, 'success', 2000);
  };
}

function closeVideo() {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('modalVideo');

  // Pause + reset
  try {
    video.pause();
    video.currentTime = 0;
    video.removeAttribute('src');
    video.load();
  } catch {}

  modal.classList.add('hidden');

  // Unlock body scroll
  document.body.classList.remove('modal-open');

  currentVideo = null;
}

function confirmDelete(item) {
  showModal({
    title: 'Hapus Video?',
    body: `"${item.name}" akan dihapus permanen.`,
    type: 'warning',
    buttons: [
      { label: 'Batal' },
      {
        label: 'Hapus', primary: true,
        onClick: async () => {
          try {
            await apiDelete(`/api/renders/${item.name}`);
            showToast('Terhapus', item.name, 'success', 2500);
            loadRenders();
          } catch (e) {
            showToast('Gagal hapus', e.message, 'error');
          }
        }
      }
    ]
  });
}

/* ============ SEARCH ============ */
function filterRenders(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderGallery(allRenders);
    return;
  }
  const filtered = allRenders.filter(r => r.name.toLowerCase().includes(q));
  renderGallery(filtered);
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
  loadRenders();

  document.getElementById('refreshBtn').onclick = () => {
    loadRenders();
    showToast('Refreshed', 'Galeri diperbarui.', 'success', 2000);
  };
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterRenders(e.target.value);
  });
  document.getElementById('closeVideoBtn').onclick = closeVideo;
  document.getElementById('modalCloseBtn').onclick = closeVideo;

  // ESC untuk close video modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
  });
});