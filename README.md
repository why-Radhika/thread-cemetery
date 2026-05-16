# 🪦 The Thread Cemetery

> *Every developer has a graveyard. This one is public.*

A darkly beautiful, community graveyard for abandoned side projects. Submit your unfinished app, half-written novel, or "I'll get to it someday" idea — give it a proper burial with a cause of death and epitaph. Pay respects to the projects of strangers. Share a grave link with the world.

**[→ Visit the Cemetery](https://YOUR-USERNAME.github.io/thread-cemetery)**

---

## ✨ Features

- **Bury a project** — name it, describe it, choose its cause of death, write an epitaph
- **Graveyard view** — scrollable field of tombstones with randomised tilts and animated grass
- **Pay Respects** — a candle-click counter on every grave
- **Search** — find graves by name, epitaph, description, or cause
- **Filter by cause** — Lost motivation · Scope creep · Shiny new idea · and more
- **Shareable grave URLs** — every tombstone gets a `#grave-id` deep link
- **Live backend** — all submissions shared globally via Supabase
- **Local fallback** — works offline with localStorage if Supabase is unreachable
- **Gothic aesthetic** — Cinzel & Cormorant Garant fonts, drifting fog, candlelight glow

---

## 🗂 Project Structure

```
thread-cemetery/
├── index.html          # HTML structure and modals
├── css/
│   ├── base.css        # CSS variables, reset, animations
│   ├── layout.css      # Header, stats, fog, graveyard grid, footer
│   ├── tombstone.css   # Tombstone card and skeleton loader styles
│   └── components.css  # Modals, forms, search, filters, toast, DB dot
└── js/
    ├── db.js           # Supabase config, data layer (load/insert/increment)
    ├── render.js       # Graveyard rendering, filtering, search, stats
    └── ui.js           # Modals, bury form, respects, share, hash routing
```

---

## 🛠 Tech Stack

| Layer      | Choice                  |
|------------|-------------------------|
| Frontend   | HTML + CSS + Vanilla JS |
| Database   | Supabase (PostgreSQL)   |
| Hosting    | GitHub Pages            |
| Fonts      | Google Fonts            |

No build step. No framework. No npm. Just open `index.html`.

---

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR-USERNAME/thread-cemetery.git
cd thread-cemetery
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the **SQL Editor**, run:

```sql
create table public.graves (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  cause       text default '',
  epitaph     text default '',
  respects    integer default 0,
  created_at  timestamptz default now()
);

alter table public.graves enable row level security;

create policy "Anyone can read graves"
  on public.graves for select using (true);

create policy "Anyone can insert graves"
  on public.graves for insert with check (true);

create or replace function increment_respects(grave_id uuid)
returns integer language sql as $$
  update public.graves set respects = respects + 1
  where id = grave_id returning respects;
$$;

grant select, insert on public.graves to anon;
grant execute on function increment_respects(uuid) to anon;
```

### 3. Add your keys

Open `js/db.js` and replace the placeholders:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
```

Your keys are in Supabase → **Project Settings → API**.

### 4. Run locally

Open `index.html` with the **Live Server** VS Code extension. No terminal needed.

---

## 🚀 Deploy to GitHub Pages

```bash
git add .
git commit -m "initial burial"
git push origin main
```

Then: GitHub repo → **Settings → Pages → Source: main / root** → Save.

Your site will be live at `https://YOUR-USERNAME.github.io/thread-cemetery` within a minute.

---

## 🔮 Roadmap

- [ ] Sort by Most Recent / Most Respected / Oldest
- [ ] Random grave button
- [ ] Condolence comments on each grave
- [ ] "I abandoned this too" solidarity counter
- [ ] Exhume a project — mark it as revived (glows green)
- [ ] OG preview image for social sharing
- [ ] Anonymous vs named burial (link to GitHub profile)

---

## 🪦 Contributing

Found a bug? Have an idea for a feature? Open an issue or a pull request. All abandoned-project enthusiasts welcome.

---

*Built with grief. Hosted on GitHub Pages.*