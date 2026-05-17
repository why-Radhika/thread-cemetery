// ══════════════════════════════════════════════════════════════════
// ⚙️  SUPABASE CONFIG — paste your values here
// ══════════════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://zigiidldcjlbvaylxbqi.supabase.co';   // e.g. https://xxxx.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ2lpZGxkY2psYnZheWx4YnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MjAzNDEsImV4cCI6MjA5NDQ5NjM0MX0.JgdcTCuODNWKHDxMViN9X5ju1tXCL_1ui-qQBvrl1Ic'
// ══════════════════════════════════════════════════════════════════

const USE_SUPABASE = SUPABASE_URL !== 'https://zigiidldcjlbvaylxbqi.supabase.co/rest/v1/';
const STORAGE_KEY  = 'thread_cemetery_v1';

let db             = null;
let cachedProjects = null;

// ── Init Supabase client ──────────────────────────────────────────
if (USE_SUPABASE) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ── DB status indicator ───────────────────────────────────────────
function setDbStatus(state) {
  const dot   = document.getElementById('dbDot');
  const label = document.getElementById('dbLabel');
  dot.className = 'db-dot';
  if      (state === 'live')  { dot.classList.add('live');  label.textContent = 'live · supabase'; }
  else if (state === 'error') { dot.classList.add('error'); label.textContent = 'db error · local fallback'; }
  else if (state === 'local') {                             label.textContent = 'local mode'; }
  else                        {                             label.textContent = 'connecting…'; }
}

// ── Default seed data (local mode only) ──────────────────────────
const DEFAULTS = [
  { id: 'default_1', name: 'FitTrack Pro',            description: 'A comprehensive fitness app that would finally revolutionize how people tracked their workouts. Had 47 features planned.', cause: 'Scope creep',     epitaph: 'It never ran, but in our hearts it had six-pack abs.', date: '2024-03-12', respects: 24 },
  { id: 'default_2', name: 'The Great American Novel', description: 'Chapter one was going to change literature forever. Chapter two was going to be even better.',                           cause: 'Life happened',   epitaph: 'Chapter one exists. It is very good.',                  date: '2022-09-01', respects: 41 },
  { id: 'default_3', name: 'My Rust Rewrite',          description: 'Going to rewrite the entire backend in Rust for performance. Spent three weeks learning the borrow checker.',            cause: 'Too ambitious',   epitaph: 'It compiles now. It does nothing.',                     date: '2025-01-20', respects: 67 },
  { id: 'default_4', name: 'Duolingo But For Finance',  description: 'Teaching people to budget through gamified lessons. Built a beautiful landing page and stopped.',                        cause: 'Shiny new idea',  epitaph: 'The landing page still exists. It converts no one.',    date: '2023-06-15', respects: 18 },
  { id: 'default_5', name: 'Social Media Detox App',   description: 'An app to help you stop using apps. The irony was not lost on me.',                                                     cause: 'Lost motivation', epitaph: 'Abandoned while scrolling Twitter.',                    date: '2024-11-03', respects: 89 },
  { id: 'default_6', name: 'Weekend Game Jam Entry',   description: 'A roguelike dungeon crawler with procedural generation, dialogue trees, and a jazz soundtrack.',                         cause: 'Framework drama', epitaph: 'Spent 36 hours arguing about game engines.',            date: '2025-08-18', respects: 33 },
];

// ── Data layer ────────────────────────────────────────────────────

async function loadProjects() {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await db
        .from('graves')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      cachedProjects = data;
      setDbStatus('live');
      return data;
    } catch (e) {
      console.error('Supabase load error:', e);
      setDbStatus('error');
      return localLoad();
    }
  }
  setDbStatus('local');
  return localLoad();
}

function localLoad() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
  return DEFAULTS;
}

async function insertProject(project) {
  if (USE_SUPABASE) {
    const { data, error } = await db
      .from('graves')
      .insert([{
        name:        project.name,
        description: project.desc || '',
        cause:       project.cause,
        epitaph:     project.epitaph || '',
        respects:    0,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const projects = localLoad();
    projects.push(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return project;
  }
}

async function incrementRespects(id) {
  if (USE_SUPABASE) {
    const { data, error } = await db.rpc('increment_respects', { grave_id: id });
    if (error) throw error;
    return data;
  } else {
    const projects = localLoad();
    const p = projects.find(x => x.id === id);
    if (p) {
      p.respects = (p.respects || 0) + 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return p.respects;
    }
  }
}

async function incrementSolidarity(id) {
  if (USE_SUPABASE) {
    const { data, error } = await db.rpc('increment_solidarity', { grave_id: id });
    if (error) throw error;
    return data;
  } else {
    const projects = localLoad();
    const p = projects.find(x => x.id === id);
    if (p) {
      p.solidarity = (p.solidarity || 0) + 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return p.solidarity;
    }
  }
}

async function loadCondolences(graveId) {
  if (USE_SUPABASE) {
    const { data, error } = await db
      .from('condolences')
      .select('*')
      .eq('grave_id', graveId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  // Local fallback: store condolences in localStorage per grave
  const raw = localStorage.getItem(`condolences_${graveId}`);
  return raw ? JSON.parse(raw) : [];
}

async function insertCondolence(graveId, message) {
  if (USE_SUPABASE) {
    const { data, error } = await db
      .from('condolences')
      .insert([{ grave_id: graveId, message }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const existing = JSON.parse(localStorage.getItem(`condolences_${graveId}`) || '[]');
    const entry = { id: 'c_' + Date.now(), grave_id: graveId, message, created_at: new Date().toISOString() };
    existing.push(entry);
    localStorage.setItem(`condolences_${graveId}`, JSON.stringify(existing));
    return entry;
  }
}

async function loadWeeklyDigest() {
  if (!USE_SUPABASE) return null;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from('graves')
    .select('*')
    .gte('created_at', oneWeekAgo)
    .order('respects', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// ── Keep Supabase awake (prevents free tier pausing) ─────────────
if (USE_SUPABASE) {
  const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
  const lastPing  = localStorage.getItem('sb_last_ping');
  const now       = Date.now();
  if (!lastPing || now - parseInt(lastPing) > FOUR_DAYS) {
    db.from('graves').select('id').limit(1).then(() => {
      localStorage.setItem('sb_last_ping', String(now));
    });
  }
}