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
    // Update URL so share button works, but don't show spotlight
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

// ── Grave Spotlight (shared link landing) ────────────────────────
let spotlightId = null;

function showSpotlight(p) {
  spotlightId = p.id;

  document.getElementById('spName').textContent  = p.name;
  document.getElementById('spDesc').textContent  = p.description || p.desc || 'No description given.';
  document.getElementById('spCause').textContent = p.cause || '';

  const dateRaw = p.date || p.created_at;
  document.getElementById('spDate').textContent = dateRaw
    ? 'Buried: ' + new Date(dateRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const epitaphWrap = document.getElementById('spEpitaphWrap');
  if (p.epitaph) {
    epitaphWrap.style.display = 'block';
    document.getElementById('spEpitaph').textContent = `"${p.epitaph}"`;
  } else {
    epitaphWrap.style.display = 'none';
  }

  document.getElementById('spRespectBtn').classList.remove('paid');
  document.getElementById('spRespectCount').textContent = p.respects || 0;

  const el = document.getElementById('graveSpotlight');
  el.style.display = '';           // clear any inline style
  el.classList.add('active');      // CSS handles display:flex
  document.body.style.overflow = 'hidden';
}

function exitSpotlight() {
  const el = document.getElementById('graveSpotlight');
  el.classList.remove('active');
  el.style.display = 'none';
  document.body.style.overflow = '';
  spotlightId = null;
  history.replaceState(null, '', location.pathname);
}

async function payRespectFromSpotlight() {
  if (!spotlightId) return;
  try {
    await incrementRespects(spotlightId);
    if (cachedProjects) {
      const p = cachedProjects.find(x => x.id === spotlightId);
      if (p) p.respects = (p.respects || 0) + 1;
    }
    const p = (cachedProjects || localLoad()).find(x => x.id === spotlightId);
    document.getElementById('spRespectCount').textContent = p ? p.respects : '–';
    document.getElementById('spRespectBtn').classList.add('paid');
    showToast('🕯 Respects paid.');
  } catch (e) {
    showToast('Could not save respects.');
  }
}

// ── Hash routing ──────────────────────────────────────────────────
async function checkHashOnLoad() {
  const hash = location.hash;
  if (!hash || !hash.startsWith('#grave-')) return;

  const id = hash.replace('#grave-', '');

  // Guarantee fresh data — don't rely on cachedProjects being set
  let projects = cachedProjects;
  if (!projects || projects.length === 0) {
    projects = await loadProjects();
  }

  const p = projects.find(x => String(x.id) === String(id));
  console.log('[spotlight] hash id:', id, '| found:', p ? p.name : 'NOT FOUND', '| total projects:', projects.length);

  if (p) {
    showSpotlight(p);
  } else {
    // ID not found — show a gentle fallback
    showToast('This grave could not be found. It may have been moved.');
  }
}

// ── Init ──────────────────────────────────────────────────────────
renderAll().then(() => checkHashOnLoad());