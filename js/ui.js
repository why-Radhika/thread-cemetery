// ── Bury Modal ────────────────────────────────────────────────────
function openBuryModal() {
  ['fName', 'fDesc', 'fEpitaph'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCause').value = '';
  openModal('buryModal');
}

async function buryProject() {
  const name    = document.getElementById('fName').value.trim();
  const desc    = document.getElementById('fDesc').value.trim();
  const cause   = document.getElementById('fCause').value;
  const epitaph = document.getElementById('fEpitaph').value.trim();

  if (!name)  { showToast('A name is required — even in death.'); return; }
  if (!cause) { showToast('How did it die? Choose a cause.'); return; }

  const btn = document.querySelector('.submit-btn');
  btn.textContent = 'Digging the grave…';
  btn.disabled    = true;

  try {
    const saved = await insertProject({
      name, desc, cause, epitaph,
      id:       'p_' + Date.now(),
      date:     new Date().toISOString().split('T')[0],
      respects: 0,
    });
    if (cachedProjects) cachedProjects.unshift(saved);
    closeModal('buryModal');
    await renderAll();
    showToast('⚰ Project buried. May it rest in peace.');
  } catch (e) {
    console.error(e);
    showToast('Something went wrong during the burial.');
  } finally {
    btn.textContent = '⚰  Commit to the Ground';
    btn.disabled    = false;
  }
}

// ── Detail Modal ──────────────────────────────────────────────────
let currentDetailId = null;

function openDetailModal(id, p) {
  if (!p) {
    p = (cachedProjects || localLoad()).find(x => x.id === id);
    if (!p) return;
  }
  currentDetailId = id;

  document.getElementById('dName').textContent  = p.name;
  document.getElementById('dDesc').textContent  = p.description || p.desc || 'No description given.';
  document.getElementById('dCause').textContent = p.cause || '';

  const dateRaw = p.date || p.created_at;
  document.getElementById('dDate').textContent = dateRaw
    ? 'Buried: ' + new Date(dateRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const epitaphWrap = document.getElementById('dEpitaphWrap');
  if (p.epitaph) {
    epitaphWrap.style.display = 'block';
    document.getElementById('dEpitaph').textContent = `"${p.epitaph}"`;
  } else {
    epitaphWrap.style.display = 'none';
  }

  document.getElementById('detailRespectBtn').classList.remove('paid');
  document.getElementById('detailRespectCount').textContent = p.respects || 0;
  openModal('detailModal');
}

async function payRespectFromDetail() {
  if (!currentDetailId) return;
  try {
    await incrementRespects(currentDetailId);
    if (cachedProjects) {
      const p = cachedProjects.find(x => x.id === currentDetailId);
      if (p) p.respects = (p.respects || 0) + 1;
    }
    const p = (cachedProjects || localLoad()).find(x => x.id === currentDetailId);
    document.getElementById('detailRespectCount').textContent = p ? p.respects : '–';
    document.getElementById('detailRespectBtn').classList.add('paid');
    renderStats(cachedProjects || localLoad());
    renderGraveyard();
    showToast('🕯 Respects paid.');
  } catch (e) {
    showToast('Could not save respects.');
  }
}

async function quickRespect(id, el) {
  try {
    await incrementRespects(id);
    if (cachedProjects) {
      const p = cachedProjects.find(x => x.id === id);
      if (p) {
        p.respects = (p.respects || 0) + 1;
        el.querySelector('.respect-count').textContent = `${p.respects} respects`;
      }
    }
    renderStats(cachedProjects || localLoad());
    showToast('🕯 Respects paid.');
  } catch (e) {
    showToast('Could not save respects.');
  }
}

// ── Modal helpers ─────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'detailModal' && currentDetailId) {
    history.replaceState(null, '', `#grave-${currentDetailId}`);
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
  if (id === 'detailModal') history.replaceState(null, '', location.pathname);
}

function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('buryModal');
    closeModal('detailModal');
  }
});

// ── Toast ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Share grave URL ───────────────────────────────────────────────
function shareGrave() {
  if (!currentDetailId) return;
  const url = `${location.origin}${location.pathname}#grave-${currentDetailId}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('🔗 Grave link copied to clipboard.');
      const btn  = document.getElementById('detailShareBtn');
      const orig = btn.innerHTML;
      btn.innerHTML          = '✓ Copied!';
      btn.style.borderColor  = 'var(--candle)';
      btn.style.color        = 'var(--candle)';
      setTimeout(() => {
        btn.innerHTML         = orig;
        btn.style.borderColor = '';
        btn.style.color       = '';
      }, 2000);
    });
  } else {
    prompt('Copy this grave link:', url);
  }
}

// ── Hash routing ──────────────────────────────────────────────────
async function checkHashOnLoad() {
  const hash = location.hash;
  if (hash && hash.startsWith('#grave-')) {
    const id = hash.replace('#grave-', '');
    setTimeout(() => {
      const p = (cachedProjects || []).find(x => x.id === id);
      if (p) openDetailModal(id, p);
    }, 800);
  }
}

// ── Init ──────────────────────────────────────────────────────────
renderAll().then(() => checkHashOnLoad());