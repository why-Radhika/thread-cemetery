// ── Filter & Search state ─────────────────────────────────────────
let activeFilter = 'all';
let searchQuery  = '';

function applyFilters(projects) {
  let result = [...projects];
  if (activeFilter !== 'all') {
    result = result.filter(p => (p.cause || '') === activeFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      (p.name        || '').toLowerCase().includes(q) ||
      (p.epitaph     || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.cause       || '').toLowerCase().includes(q)
    );
  }
  return result;
}

function setFilter(cause) {
  activeFilter = cause;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cause === cause);
  });
  renderGraveyard();
}

function onSearch(val) {
  searchQuery = val.trim();
  document.getElementById('searchClear').classList.toggle('visible', searchQuery.length > 0);
  renderGraveyard();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  document.getElementById('searchClear').classList.remove('visible');
  renderGraveyard();
}

// ── Render: full page ─────────────────────────────────────────────
async function renderAll() {
  showSkeletons();
  const all = await loadProjects();
  renderStats(all);
  renderGrid(all);
}

function showSkeletons() {
  const grid = document.getElementById('graveyardGrid');
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-stone">
      <div class="stone-body"></div>
    </div>`).join('');
}

// ── Render: stats bar ─────────────────────────────────────────────
function renderStats(projects) {
  document.getElementById('statTotal').textContent = projects.length;

  const totalRespects = projects.reduce((s, p) => s + (p.respects || 0), 0);
  document.getElementById('statRespects').textContent = totalRespects;

  const counts = {};
  projects.forEach(p => { if (p.cause) counts[p.cause] = (counts[p.cause] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const causeEl = document.getElementById('statCause');
  if (top) {
    causeEl.textContent = top[0].split(' ').slice(0, 2).join(' ');
    causeEl.style.fontSize = '1.1rem';
  }
}

// ── Render: graveyard (uses cached data, no new fetch) ────────────
function renderGraveyard() {
  const all = cachedProjects || localLoad();
  renderGrid(all);
}

// ── Render: tombstone grid ────────────────────────────────────────
function renderGrid(all) {
  const grid    = document.getElementById('graveyardGrid');
  const countEl = document.getElementById('resultsCount');
  grid.innerHTML = '';

  const projects    = applyFilters(all);
  const isFiltering = activeFilter !== 'all' || searchQuery;

  countEl.textContent = isFiltering
    ? (projects.length === 0
        ? 'No souls found'
        : `${projects.length} of ${all.length} soul${all.length !== 1 ? 's' : ''} found`)
    : '';

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>${searchQuery ? `No graves matching "${searchQuery}"` : 'No graves in this section'}</p>
        <small>Try a different search or filter</small>
      </div>`;
    return;
  }

  projects.forEach(p => {
    const el = document.createElement('div');
    el.className   = 'tombstone';
    el.style.transform = `rotate(${(Math.random() - 0.5) * 3.5}deg)`;
    el.onclick     = () => openDetailModal(p.id, p);

    const dateRaw = p.date || p.created_at;
    const dateStr = dateRaw
      ? new Date(dateRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const name    = searchQuery ? highlight(escHtml(p.name),    searchQuery) : escHtml(p.name);
    const epitaph = searchQuery && p.epitaph
      ? highlight(escHtml(p.epitaph), searchQuery)
      : escHtml(p.epitaph || '');

    el.innerHTML = `
      <div class="stone-body">
        <div class="stone-rip">✦ R.I.P. ✦</div>
        <div class="stone-name">${name}</div>
        <div class="stone-cause">${escHtml(p.cause || '')}</div>
        ${p.epitaph ? `<div class="stone-epitaph">"${epitaph}"</div>` : ''}
        <div class="stone-date">${dateStr}</div>
      </div>
      <div class="stone-grass">
        <svg viewBox="0 0 200 14" xmlns="http://www.w3.org/2000/svg">${generateGrass(12)}</svg>
      </div>
      <div class="stone-respects" onclick="event.stopPropagation(); quickRespect('${p.id}', this)">
        <button class="respect-btn">🕯</button>
        <span class="respect-count">${p.respects || 0} respects</span>
      </div>`;

    grid.appendChild(el);
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function highlight(text, query) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${esc})`, 'gi'),
    '<mark style="background:rgba(232,160,48,0.25);color:var(--candle);border-radius:2px;">$1</mark>'
  );
}

function generateGrass(count) {
  let blades = '';
  for (let i = 0; i < count; i++) {
    const x    = 5 + (i / count) * 190 + (Math.random() - 0.5) * 10;
    const h    = 6 + Math.random() * 7;
    const lean = (Math.random() - 0.5) * 8;
    blades += `<path d="M${x},14 Q${x + lean},${14 - h / 2} ${x + lean * 0.5},${14 - h}" stroke="#4a6741" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  }
  return blades;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}