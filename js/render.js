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
  const container = document.getElementById('risenGrid');
  const risen     = all.filter(p => p.status === 'risen');
  container.innerHTML = '';

  if (risen.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <p>No projects have risen yet.</p>
      <small>Open any grave and click 🌿 Exhume to bring it back.</small>
    </div>`;
    return;
  }

  // Use a proper section-grid so cards are normal tombstone size
  const grid = document.createElement('div');
  grid.className = 'section-grid';
  risen.forEach(p => grid.appendChild(makeTombstone(p)));
  container.appendChild(grid);
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
  el.className = 'tombstone' + (p.status === 'risen' ? ' risen' : '');
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
let mapState = {
  offsetX: 0, offsetY: 0,
  dragging: false, startX: 0, startY: 0,
  stones: [], hoveredId: null,
  initialised: false,
};

function renderMap(all) {
  const canvas = document.getElementById('mapCanvas');
  const DPR    = window.devicePixelRatio || 1;
  const W      = canvas.offsetWidth;
  const H      = canvas.offsetHeight;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;

  // Include ALL graves — buried and risen
  const COLS   = Math.max(3, Math.ceil(Math.sqrt(all.length * 1.4)));
  const CELL_W = 170;
  const CELL_H = 220;
  const PAD    = 80;

  mapState.stones = all.map((p, i) => {
    const col  = i % COLS;
    const row  = Math.floor(i / COLS);
    const seed = i * 137.508;
    const jitX = Math.sin(seed) * 30;
    const jitY = Math.cos(seed * 0.7) * 18;
    const tilt = Math.sin(seed * 0.3) * 5;
    return {
      p,
      x:    PAD + col * CELL_W + CELL_W / 2 + jitX,
      y:    PAD + row * CELL_H + 100        + jitY,
      tilt, w: 88, h: 110,
    };
  });

  if (!mapState.initialised) {
    mapState.offsetX    = 40;
    mapState.offsetY    = 20;
    mapState.initialised = true;
  }

  // ── Core draw ──────────────────────────────────────────────────
  function drawAll() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    // ── Background gradient ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#08080e');
    bg.addColorStop(1, '#0d0d14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Ground texture — irregular dark patches ──
    ctx.save();
    ctx.translate(mapState.offsetX, mapState.offsetY);
    drawGround(ctx);
    ctx.restore();

    // ── Winding paths between rows ──
    ctx.save();
    ctx.translate(mapState.offsetX, mapState.offsetY);
    drawPaths(ctx);
    ctx.restore();

    // ── Stones ──
    ctx.save();
    ctx.translate(mapState.offsetX, mapState.offsetY);
    mapState.stones.forEach(s => drawStone(ctx, s));
    ctx.restore();

    // ── Fog at bottom edge ──
    const fog = ctx.createLinearGradient(0, H * 0.72, 0, H);
    fog.addColorStop(0, 'rgba(8,8,14,0)');
    fog.addColorStop(1, 'rgba(8,8,14,0.82)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    // ── Vignette edges ──
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  // ── Ground — soil patches, grass tufts, pebbles ──
  function drawGround(ctx) {
    const ROWS = Math.ceil(all.length / COLS);
    const TW   = COLS * CELL_W + PAD * 2;
    const TH   = ROWS * CELL_H + PAD * 2;

    // Base soil
    ctx.fillStyle = '#0d0f0d';
    ctx.fillRect(0, 0, TW, TH);

    // Soil variation patches
    for (let i = 0; i < all.length * 3; i++) {
      const px = (Math.sin(i * 73.1) * 0.5 + 0.5) * TW;
      const py = (Math.cos(i * 41.7) * 0.5 + 0.5) * TH;
      const pr = 18 + Math.abs(Math.sin(i * 9.3)) * 28;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, 'rgba(30,28,20,0.35)');
      pg.addColorStop(1, 'rgba(30,28,20,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * 0.6, Math.sin(i) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scattered pebbles
    for (let i = 0; i < all.length * 4; i++) {
      const px = (Math.sin(i * 11.3 + 1) * 0.5 + 0.5) * TW;
      const py = (Math.cos(i * 7.9 + 2)  * 0.5 + 0.5) * TH;
      const pr = 1.5 + Math.abs(Math.sin(i * 5)) * 2.5;
      ctx.fillStyle = `rgba(${50 + Math.floor(Math.sin(i)*10)},${48 + Math.floor(Math.cos(i)*8)},${60 + Math.floor(Math.sin(i*2)*6)},0.6)`;
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * 0.7, Math.sin(i * 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Grass tufts scattered around
    ctx.strokeStyle = '#2a3d22';
    ctx.lineWidth   = 1;
    for (let i = 0; i < all.length * 6; i++) {
      const gx = (Math.sin(i * 23.7 + 0.5) * 0.5 + 0.5) * TW;
      const gy = (Math.cos(i * 17.3 + 1.2) * 0.5 + 0.5) * TH;
      const gh = 5 + Math.abs(Math.sin(i * 4)) * 6;
      const gl = (Math.sin(i * 6.1) * 4);
      ctx.strokeStyle = i % 3 === 0 ? '#2a3d22' : '#223318';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + gl, gy - gh * 0.5, gx + gl * 0.4, gy - gh);
      ctx.stroke();
    }
  }

  // ── Winding gravel paths ──
  function drawPaths(ctx) {
    const ROWS = Math.ceil(all.length / COLS);
    ctx.strokeStyle = 'rgba(60,55,45,0.55)';
    ctx.lineWidth   = 18;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.setLineDash([]);

    // Horizontal path between each row
    for (let r = 0; r <= ROWS; r++) {
      const y = PAD + r * CELL_H + 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      // Slightly wavy
      for (let x = 0; x < COLS * CELL_W + PAD * 2; x += 40) {
        ctx.lineTo(x, y + Math.sin(x * 0.04 + r) * 5);
      }
      ctx.stroke();
    }

    // Path border highlight
    ctx.strokeStyle = 'rgba(80,72,55,0.3)';
    ctx.lineWidth   = 1;
    for (let r = 0; r <= ROWS; r++) {
      const y = PAD + r * CELL_H + 5;
      ctx.beginPath();
      for (let x = 0; x < COLS * CELL_W + PAD * 2; x += 40) {
        ctx.lineTo(x, y - 9 + Math.sin(x * 0.04 + r) * 5);
      }
      ctx.stroke();
    }

    // Vertical path at left edge
    ctx.strokeStyle = 'rgba(60,55,45,0.4)';
    ctx.lineWidth   = 14;
    ctx.beginPath();
    for (let y = 0; y < ROWS * CELL_H + PAD * 2; y += 30) {
      ctx.lineTo(PAD * 0.5, y + Math.sin(y * 0.05) * 4);
    }
    ctx.stroke();

    // Gravel dots on path
    ctx.fillStyle = 'rgba(70,65,50,0.5)';
    for (let r = 0; r <= ROWS; r++) {
      const y = PAD + r * CELL_H + 5;
      for (let x = 10; x < COLS * CELL_W + PAD * 2; x += 12) {
        const py = y + Math.sin(x * 0.04 + r) * 5;
        const pr = 0.8 + Math.abs(Math.sin(x * 7.3 + r * 3.1)) * 1.5;
        ctx.beginPath();
        ctx.arc(x + Math.sin(x * 3.1) * 3, py + Math.cos(x * 2.7) * 3, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Draw a single tombstone ──
  function drawStone(ctx, s) {
    const isRisen   = s.p.status === 'risen';
    const isHovered = mapState.hoveredId === s.p.id;
    const sw = s.w * 0.5;
    const sh = s.h * 0.5;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.tilt * Math.PI / 180);

    // ── Ambient glow (risen = green, hovered = amber) ──
    if (isRisen || isHovered) {
      const gc = isRisen ? [74, 103, 65] : [232, 160, 48];
      const gr = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
      gr.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},${isHovered ? 0.25 : 0.18})`);
      gr.addColorStop(1, `rgba(${gc[0]},${gc[1]},${gc[2]},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(-80, -80, 160, 160);
    }

    // ── Shadow beneath stone ──
    ctx.shadowColor   = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur    = 14;
    ctx.shadowOffsetY = 6;

    // ── Stone shape — proper Gothic arch ──
    function stonePath() {
      ctx.beginPath();
      ctx.moveTo(-sw, sh);                          // bottom-left
      ctx.lineTo(-sw, -sh * 0.3);                  // left side up
      ctx.bezierCurveTo(                            // left arch
        -sw, -sh * 0.85,
        -sw * 0.5, -sh,
        0, -sh
      );
      ctx.bezierCurveTo(                            // right arch
        sw * 0.5, -sh,
        sw, -sh * 0.85,
        sw, -sh * 0.3
      );
      ctx.lineTo(sw, sh);                           // right side down
      ctx.closePath();
    }

    // Stone body fill — gradient for depth
    stonePath();
    const stoneGrad = ctx.createLinearGradient(-sw, -sh, sw, sh);
    if (isRisen) {
      stoneGrad.addColorStop(0, '#1e2e1e');
      stoneGrad.addColorStop(1, '#141e14');
    } else {
      stoneGrad.addColorStop(0, '#252535');
      stoneGrad.addColorStop(1, '#181826');
    }
    ctx.fillStyle = stoneGrad;
    ctx.fill();

    // Stone border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    stonePath();
    ctx.strokeStyle = isRisen
      ? (isHovered ? '#6a9460' : '#4a6741')
      : (isHovered ? '#c8b89a' : '#3a3a50');
    ctx.lineWidth   = isHovered ? 2 : 1.2;
    ctx.stroke();

    // Inner bevel line (makes it look carved)
    ctx.save();
    ctx.scale(0.82, 0.82);
    stonePath();
    ctx.strokeStyle = isRisen ? 'rgba(74,103,65,0.2)' : 'rgba(200,184,154,0.08)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();
    ctx.restore();

    // Crack detail on some stones
    if (!isRisen && Math.sin(s.p.id ? s.p.id.charCodeAt(0) : 0) > 0.2) {
      ctx.strokeStyle = 'rgba(58,58,80,0.6)';
      ctx.lineWidth   = 0.6;
      ctx.beginPath();
      ctx.moveTo(sw * 0.2, -sh * 0.1);
      ctx.lineTo(sw * 0.35, sh * 0.25);
      ctx.stroke();
    }

    // ── R.I.P. text ──
    ctx.fillStyle   = isRisen ? 'rgba(106,148,96,0.6)' : 'rgba(138,122,101,0.5)';
    ctx.font        = `6px 'Georgia', serif`;
    ctx.textAlign   = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('✦ R.I.P. ✦', 0, -sh * 0.55);

    // ── Name ──
    ctx.fillStyle = isRisen ? '#7ab870' : (isHovered ? '#e8d5b8' : '#c8b89a');
    ctx.font      = `bold ${Math.min(12, 130 / Math.max(s.p.name.length, 6))}px 'Georgia', serif`;
    const name    = s.p.name.length > 15 ? s.p.name.slice(0, 14) + '…' : s.p.name;

    // Word-wrap name into two lines if needed
    const words = name.split(' ');
    if (words.length > 1 && name.length > 10) {
      const mid  = Math.ceil(words.length / 2);
      const top  = words.slice(0, mid).join(' ');
      const bot  = words.slice(mid).join(' ');
      ctx.fillText(top, 0, -sh * 0.18);
      ctx.fillText(bot, 0, -sh * 0.18 + 14);
    } else {
      ctx.fillText(name, 0, -sh * 0.1);
    }

    // ── Cause ──
    ctx.fillStyle = isRisen ? '#4a7a40' : '#6a5c4a';
    ctx.font      = `italic 8px 'Georgia', serif`;
    const cause   = (s.p.cause || '').length > 18 ? (s.p.cause || '').slice(0, 17) + '…' : (s.p.cause || '');
    ctx.fillText(cause, 0, sh * 0.22);

    // ── Divider line ──
    ctx.strokeStyle = isRisen ? 'rgba(74,103,65,0.3)' : 'rgba(58,58,80,0.5)';
    ctx.lineWidth   = 0.6;
    ctx.beginPath();
    ctx.moveTo(-sw * 0.6, sh * 0.35);
    ctx.lineTo(sw * 0.6,  sh * 0.35);
    ctx.stroke();

    // ── Respects candle ──
    ctx.fillStyle = '#e8a030';
    ctx.font      = `8px 'Georgia', serif`;
    ctx.fillText(`🕯 ${s.p.respects || 0}`, 0, sh * 0.52);

    // ── Grass tufts at base ──
    const grassColor = isRisen ? '#3a6030' : '#2a3d22';
    for (let gi = -3; gi <= 3; gi++) {
      const gx  = gi * (sw / 3.5);
      const gh  = 7 + Math.abs(Math.sin(gi * 3.7 + (s.p.respects || 0))) * 6;
      const gln = Math.sin(gi * 2.1) * 5;
      ctx.strokeStyle = gi % 2 === 0 ? grassColor : '#223318';
      ctx.lineWidth   = 1.1;
      ctx.beginPath();
      ctx.moveTo(gx, sh + 2);
      ctx.quadraticCurveTo(gx + gln, sh - gh * 0.5, gx + gln * 0.4, sh - gh);
      ctx.stroke();
    }

    // ── Risen special: small flowers ──
    if (isRisen) {
      [[-sw * 0.7, sh * 0.1], [sw * 0.65, sh * 0.05]].forEach(([fx, fy]) => {
        ctx.fillStyle = 'rgba(180,220,140,0.7)';
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,0.6)';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  // ── Initial draw ──
  drawAll();

  // ── Replace canvas to remove old event listeners ──
  const fresh = canvas.cloneNode(false);
  canvas.parentNode.replaceChild(fresh, canvas);
  fresh.width  = W * DPR;
  fresh.height = H * DPR;

  function redraw() {
    const ctx2 = fresh.getContext('2d');
    ctx2.save();
    ctx2.scale(DPR, DPR);
    ctx2.clearRect(0, 0, W, H);

    const bg2 = ctx2.createLinearGradient(0, 0, 0, H);
    bg2.addColorStop(0, '#08080e');
    bg2.addColorStop(1, '#0d0d14');
    ctx2.fillStyle = bg2;
    ctx2.fillRect(0, 0, W, H);

    ctx2.save(); ctx2.translate(mapState.offsetX, mapState.offsetY);
    drawGroundCtx(ctx2);
    ctx2.restore();

    ctx2.save(); ctx2.translate(mapState.offsetX, mapState.offsetY);
    drawPathsCtx(ctx2);
    ctx2.restore();

    ctx2.save(); ctx2.translate(mapState.offsetX, mapState.offsetY);
    mapState.stones.forEach(s => drawStoneCtx(ctx2, s));
    ctx2.restore();

    const fog2 = ctx2.createLinearGradient(0, H * 0.72, 0, H);
    fog2.addColorStop(0, 'rgba(8,8,14,0)');
    fog2.addColorStop(1, 'rgba(8,8,14,0.82)');
    ctx2.fillStyle = fog2;
    ctx2.fillRect(0, 0, W, H);

    const vig2 = ctx2.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H);
    vig2.addColorStop(0, 'rgba(0,0,0,0)');
    vig2.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx2.fillStyle = vig2;
    ctx2.fillRect(0, 0, W, H);
    ctx2.restore();
  }

  // Bind the inner draw functions to the fresh canvas context
  function drawGroundCtx(ctx) { drawGround(ctx); }
  function drawPathsCtx(ctx)  { drawPaths(ctx); }
  function drawStoneCtx(ctx, s) { drawStone(ctx, s); }

  // ── Mouse / touch events ──
  fresh.addEventListener('mousedown', e => {
    mapState.dragging = true;
    mapState.startX   = e.clientX - mapState.offsetX;
    mapState.startY   = e.clientY - mapState.offsetY;
  });
  window.addEventListener('mouseup', () => { mapState.dragging = false; });

  fresh.addEventListener('mousemove', e => {
    const rect = fresh.getBoundingClientRect();
    const mx   = e.clientX - rect.left - mapState.offsetX;
    const my   = e.clientY - rect.top  - mapState.offsetY;
    const hit  = mapState.stones.find(s =>
      mx >= s.x - s.w * 0.6 && mx <= s.x + s.w * 0.6 &&
      my >= s.y - s.h * 0.6 && my <= s.y + s.h * 0.6
    );
    const newHover = hit ? hit.p.id : null;
    if (newHover !== mapState.hoveredId) {
      mapState.hoveredId   = newHover;
      fresh.style.cursor   = hit ? 'pointer' : 'grab';
      redraw();
    }
    if (mapState.dragging) {
      mapState.offsetX = e.clientX - mapState.startX;
      mapState.offsetY = e.clientY - mapState.startY;
      redraw();
    }
  });

  fresh.addEventListener('touchstart', e => {
    mapState.dragging = true;
    mapState.startX   = e.touches[0].clientX - mapState.offsetX;
    mapState.startY   = e.touches[0].clientY - mapState.offsetY;
  }, { passive: true });
  fresh.addEventListener('touchend',  () => { mapState.dragging = false; });
  fresh.addEventListener('touchmove', e => {
    if (!mapState.dragging) return;
    mapState.offsetX = e.touches[0].clientX - mapState.startX;
    mapState.offsetY = e.touches[0].clientY - mapState.startY;
    redraw();
    e.preventDefault();
  }, { passive: false });

  fresh.addEventListener('click', e => {
    const rect = fresh.getBoundingClientRect();
    const mx   = e.clientX - rect.left - mapState.offsetX;
    const my   = e.clientY - rect.top  - mapState.offsetY;
    const hit  = mapState.stones.find(s =>
      mx >= s.x - s.w * 0.6 && mx <= s.x + s.w * 0.6 &&
      my >= s.y - s.h * 0.6 && my <= s.y + s.h * 0.6
    );
    if (hit) openDetailModal(hit.p.id, hit.p);
  });
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