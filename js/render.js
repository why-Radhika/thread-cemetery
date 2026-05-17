// ── Filter, Search & Sort state ──────────────────────────────────
let activeFilter = 'all';
let searchQuery  = '';
let activeSort   = 'newest'; // 'newest' | 'oldest' | 'respected'

function applyFilters(projects) {
  let result = [...projects];

  // Filter by cause
  if (activeFilter !== 'all') {
    result = result.filter(p => (p.cause || '') === activeFilter);
  }

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      (p.name        || '').toLowerCase().includes(q) ||
      (p.epitaph     || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.cause       || '').toLowerCase().includes(q)
    );
  }

  // Sort
  result.sort((a, b) => {
    if (activeSort === 'respected') {
      return (b.respects || 0) - (a.respects || 0);
    }
    const aDate = new Date(a.created_at || a.date || 0);
    const bDate = new Date(b.created_at || b.date || 0);
    return activeSort === 'oldest' ? aDate - bDate : bDate - aDate;
  });

  return result;
}

function setSort(val) {
  activeSort = val;
  renderGraveyard();
}

function visitRandomGrave() {
  const all = cachedProjects || localLoad();
  if (!all.length) return;
  const p = all[Math.floor(Math.random() * all.length)];
  openDetailModal(p.id, p);
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

// ── View mode ─────────────────────────────────────────────────────
let currentView = 'grid';

function setView(view) {
  currentView = view;
  document.getElementById('btnGrid').classList.toggle('active',  view === 'grid');
  document.getElementById('btnRisen').classList.toggle('active', view === 'risen');
  document.getElementById('btnMap').classList.toggle('active',   view === 'map');

  document.querySelector('.graveyard').style.display        = view === 'grid'  ? '' : 'none';
  document.getElementById('risenSection').style.display     = view === 'risen' ? '' : 'none';
  document.getElementById('mapSection').style.display       = view === 'map'   ? '' : 'none';
  document.querySelector('.search-filter-wrap').style.display = view === 'grid' ? '' : 'none';
  document.getElementById('resultsCount').style.display     = view === 'grid'  ? '' : 'none';

  if (view === 'risen') renderRisen(cachedProjects || localLoad());
  if (view === 'map')   renderMap(cachedProjects || localLoad());
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
  const buried = projects.filter(p => p.status !== 'risen');
  document.getElementById('statTotal').textContent = buried.length;

  const totalRespects = projects.reduce((s, p) => s + (p.respects || 0), 0);
  document.getElementById('statRespects').textContent = totalRespects;

  const counts = {};
  buried.forEach(p => { if (p.cause) counts[p.cause] = (counts[p.cause] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const causeEl = document.getElementById('statCause');
  if (top) {
    causeEl.textContent = top[0].split(' ').slice(0, 2).join(' ');
    causeEl.style.fontSize = '1.1rem';
  }
}

// ── Render: graveyard (uses cached data) ─────────────────────────
function renderGraveyard() {
  const all = cachedProjects || localLoad();
  renderGrid(all);
}

// ── Render: risen section ─────────────────────────────────────────
function renderRisen(all) {
  const grid   = document.getElementById('risenGrid');
  const risen  = all.filter(p => p.status === 'risen');
  grid.innerHTML = '';

  if (risen.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <p>No projects have risen yet.</p>
      <small>Exhume a grave to bring it back.</small>
    </div>`;
    return;
  }
  risen.forEach(p => {
    const el = makeTombstone(p);
    el.classList.add('risen');
    grid.appendChild(el);
  });
}

// ── Render: tombstone grid ────────────────────────────────────────
function renderGrid(all) {
  const grid    = document.getElementById('graveyardGrid');
  const countEl = document.getElementById('resultsCount');
  grid.innerHTML = '';

  const projects    = applyFilters(all.filter(p => p.status !== 'risen'));
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

  // Show sections when not filtering by a specific cause
  const useSections = activeFilter === 'all' && !searchQuery;

  if (useSections) {
    // Group by cause
    const sections = {};
    projects.forEach(p => {
      const cause = p.cause || 'Unknown';
      if (!sections[cause]) sections[cause] = [];
      sections[cause].push(p);
    });

    // Render each section
    Object.entries(sections).forEach(([cause, graves]) => {
      // Section header
      const header = document.createElement('div');
      header.className = 'section-header';
      header.innerHTML = `
        <div class="section-line"></div>
        <span class="section-title">${escHtml(cause)}</span>
        <div class="section-line"></div>
        <span class="section-count">${graves.length} soul${graves.length !== 1 ? 's' : ''}</span>`;
      grid.appendChild(header);

      // Tombstones for this section
      const row = document.createElement('div');
      row.className = 'section-grid';
      graves.forEach(p => row.appendChild(makeTombstone(p)));
      grid.appendChild(row);
    });
  } else {
    // Flat grid (filtered / searched)
    projects.forEach(p => grid.appendChild(makeTombstone(p)));
  }
}

function makeTombstone(p) {
  const el = document.createElement('div');
  el.className = 'tombstone';
  el.style.transform = `rotate(${(Math.random() - 0.5) * 3.5}deg)`;
  el.onclick = () => openDetailModal(p.id, p);

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
  return el;
}

// ── Map view ──────────────────────────────────────────────────────
let mapState = { offsetX: 0, offsetY: 0, dragging: false, startX: 0, startY: 0, stones: [] };

function renderMap(all) {
  const canvas  = document.getElementById('mapCanvas');
  const ctx     = canvas.getContext('2d');
  const DPR     = window.devicePixelRatio || 1;
  const W       = canvas.offsetWidth;
  const H       = canvas.offsetHeight;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  const buried = all.filter(p => p.status !== 'risen');

  // Lay out stones in a grid with natural scatter
  const COLS     = Math.ceil(Math.sqrt(buried.length * 1.6));
  const CELL_W   = 180;
  const CELL_H   = 200;
  const MAP_W    = COLS * CELL_W + 120;
  const MAP_H    = Math.ceil(buried.length / COLS) * CELL_H + 140;

  mapState.stones = buried.map((p, i) => {
    const col  = i % COLS;
    const row  = Math.floor(i / COLS);
    const jitX = (Math.sin(i * 7.3) * 28);
    const jitY = (Math.cos(i * 4.1) * 18);
    const tilt = (Math.sin(i * 2.7) * 4);
    return {
      p,
      x:    60 + col * CELL_W + CELL_W / 2 + jitX,
      y:    60 + row * CELL_H + 80 + jitY,
      tilt,
      w:    100, h: 120,
    };
  });

  // Centre map initially
  if (mapState.offsetX === 0 && mapState.offsetY === 0) {
    mapState.offsetX = (W - MAP_W) / 2;
    mapState.offsetY = 20;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines (ground texture)
    ctx.strokeStyle = 'rgba(58,58,80,0.2)';
    ctx.lineWidth = 1;
    for (let gx = (mapState.offsetX % 60); gx < W; gx += 60) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = (mapState.offsetY % 60); gy < H; gy += 60) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    ctx.save();
    ctx.translate(mapState.offsetX, mapState.offsetY);

    mapState.stones.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.tilt * Math.PI / 180);

      const isRisen = s.p.status === 'risen';
      const stoneColor  = isRisen ? '#1a2e1a' : '#1e1e2a';
      const borderColor = isRisen ? '#4a6741' : '#3a3a50';
      const glowColor   = isRisen ? 'rgba(74,103,65,0.3)' : 'rgba(232,160,48,0.0)';

      // Glow
      if (isRisen) {
        const grd = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
        grd.addColorStop(0, 'rgba(74,103,65,0.2)');
        grd.addColorStop(1, 'rgba(74,103,65,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(-60, -70, 120, 120);
      }

      // Stone arch shape
      const sw = s.w * 0.5, sh = s.h * 0.5;
      ctx.beginPath();
      ctx.moveTo(-sw, sh);
      ctx.lineTo(-sw, -sh * 0.5);
      ctx.quadraticCurveTo(-sw, -sh, 0, -sh);
      ctx.quadraticCurveTo(sw, -sh, sw, -sh * 0.5);
      ctx.lineTo(sw, sh);
      ctx.closePath();

      ctx.fillStyle = stoneColor;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Name text
      ctx.fillStyle = isRisen ? '#6a9460' : '#c8b89a';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      const name = s.p.name.length > 14 ? s.p.name.slice(0, 13) + '…' : s.p.name;
      ctx.fillText(name, 0, -10);

      // Cause
      ctx.fillStyle = isRisen ? '#4a6741' : '#8a7a65';
      ctx.font = 'italic 9px Georgia, serif';
      const cause = (s.p.cause || '').slice(0, 16);
      ctx.fillText(cause, 0, 8);

      // Respects
      ctx.fillStyle = '#e8a030';
      ctx.font = '9px Georgia, serif';
      ctx.fillText(`🕯 ${s.p.respects || 0}`, 0, 26);

      // Grass tufts at base
      ctx.strokeStyle = '#3a5230';
      ctx.lineWidth = 1;
      [-20, -10, 0, 10, 20].forEach(gx => {
        ctx.beginPath();
        ctx.moveTo(gx, sh);
        ctx.quadraticCurveTo(gx - 3, sh - 7, gx, sh - 12);
        ctx.stroke();
      });

      ctx.restore();
    });

    ctx.restore();
  }

  draw();

  // ── Interaction ──
  // Remove old listeners to avoid stacking
  const old = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(old, canvas);
  const c = document.getElementById('mapCanvas');
  const ctx2 = c.getContext('2d');
  ctx2.scale(DPR, DPR);

  c.addEventListener('mousedown', e => {
    mapState.dragging = true;
    mapState.startX   = e.clientX - mapState.offsetX;
    mapState.startY   = e.clientY - mapState.offsetY;
  });
  window.addEventListener('mouseup', () => { mapState.dragging = false; });
  c.addEventListener('mousemove', e => {
    if (!mapState.dragging) return;
    mapState.offsetX = e.clientX - mapState.startX;
    mapState.offsetY = e.clientY - mapState.startY;
    drawMap();
  });

  // Touch support
  c.addEventListener('touchstart', e => {
    mapState.dragging = true;
    mapState.startX   = e.touches[0].clientX - mapState.offsetX;
    mapState.startY   = e.touches[0].clientY - mapState.offsetY;
  });
  c.addEventListener('touchend', () => { mapState.dragging = false; });
  c.addEventListener('touchmove', e => {
    if (!mapState.dragging) return;
    mapState.offsetX = e.touches[0].clientX - mapState.startX;
    mapState.offsetY = e.touches[0].clientY - mapState.startY;
    drawMap();
    e.preventDefault();
  }, { passive: false });

  // Click to open grave
  c.addEventListener('click', e => {
    const rect = c.getBoundingClientRect();
    const mx   = (e.clientX - rect.left - mapState.offsetX);
    const my   = (e.clientY - rect.top  - mapState.offsetY);
    const hit  = mapState.stones.find(s =>
      mx >= s.x - s.w * 0.5 && mx <= s.x + s.w * 0.5 &&
      my >= s.y - s.h * 0.5 && my <= s.y + s.h * 0.5
    );
    if (hit) openDetailModal(hit.p.id, hit.p);
  });

  function drawMap() {
    const c2   = document.getElementById('mapCanvas');
    const ctx3 = c2.getContext('2d');
    ctx3.clearRect(0, 0, W, H);
    ctx3.fillStyle = '#0d0d12';
    ctx3.fillRect(0, 0, W, H);

    ctx3.strokeStyle = 'rgba(58,58,80,0.2)';
    ctx3.lineWidth = 1;
    for (let gx = (mapState.offsetX % 60); gx < W; gx += 60) {
      ctx3.beginPath(); ctx3.moveTo(gx, 0); ctx3.lineTo(gx, H); ctx3.stroke();
    }
    for (let gy = (mapState.offsetY % 60); gy < H; gy += 60) {
      ctx3.beginPath(); ctx3.moveTo(0, gy); ctx3.lineTo(W, gy); ctx3.stroke();
    }

    ctx3.save();
    ctx3.translate(mapState.offsetX, mapState.offsetY);
    mapState.stones.forEach(s => {
      ctx3.save();
      ctx3.translate(s.x, s.y);
      ctx3.rotate(s.tilt * Math.PI / 180);

      const isRisen = s.p.status === 'risen';
      const sw = s.w * 0.5, sh = s.h * 0.5;

      if (isRisen) {
        const grd = ctx3.createRadialGradient(0, 0, 10, 0, 0, 70);
        grd.addColorStop(0, 'rgba(74,103,65,0.2)');
        grd.addColorStop(1, 'rgba(74,103,65,0)');
        ctx3.fillStyle = grd;
        ctx3.fillRect(-60, -70, 120, 120);
      }

      ctx3.beginPath();
      ctx3.moveTo(-sw, sh);
      ctx3.lineTo(-sw, -sh * 0.5);
      ctx3.quadraticCurveTo(-sw, -sh, 0, -sh);
      ctx3.quadraticCurveTo(sw, -sh, sw, -sh * 0.5);
      ctx3.lineTo(sw, sh);
      ctx3.closePath();
      ctx3.fillStyle   = isRisen ? '#1a2e1a' : '#1e1e2a';
      ctx3.fill();
      ctx3.strokeStyle = isRisen ? '#4a6741' : '#3a3a50';
      ctx3.lineWidth   = 1.5;
      ctx3.stroke();

      ctx3.fillStyle = isRisen ? '#6a9460' : '#c8b89a';
      ctx3.font = 'bold 11px Georgia, serif';
      ctx3.textAlign = 'center';
      const name = s.p.name.length > 14 ? s.p.name.slice(0, 13) + '…' : s.p.name;
      ctx3.fillText(name, 0, -10);

      ctx3.fillStyle = isRisen ? '#4a6741' : '#8a7a65';
      ctx3.font = 'italic 9px Georgia, serif';
      ctx3.fillText((s.p.cause || '').slice(0, 16), 0, 8);

      ctx3.fillStyle = '#e8a030';
      ctx3.font = '9px Georgia, serif';
      ctx3.fillText(`🕯 ${s.p.respects || 0}`, 0, 26);

      ctx3.strokeStyle = '#3a5230';
      ctx3.lineWidth = 1;
      [-20, -10, 0, 10, 20].forEach(gx => {
        ctx3.beginPath();
        ctx3.moveTo(gx, sh);
        ctx3.quadraticCurveTo(gx - 3, sh - 7, gx, sh - 12);
        ctx3.stroke();
      });

      ctx3.restore();
    });
    ctx3.restore();
  }
}
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