# 🪦 The Thread Cemetery

*Here lie the unfinished, the abandoned, the "I'll get to it someday."*

---

Every developer has a graveyard of dead projects. Half-built apps, abandoned side hustles, novels that never made it past chapter one. We don't talk about them — but we all have them.

The Thread Cemetery is a place to bury them properly. Give your dead project a name, a cause of death, an epitaph. Let strangers pay their respects. Let someone else whisper *me too.*

---

## The idea

It started as a joke about the psychological weight of unfinished things — the quiet guilt of a GitHub repo that hasn't been touched in two years, the folder on your desktop called `final_final_v3`. 

Most project graveyards are private. This one isn't. It turns out there's something unexpectedly moving about reading a stranger's epitaph for their abandoned fitness app, or their half-written novel, or the startup idea they shelved when life got in the way. You feel less alone in your own pile of unfinished things.

---

## What it does

- **Bury a project** — name it, describe what it was going to be, choose how it died, write an epitaph. Optionally link your GitHub profile.
- **Pay respects** — a candle on every grave
- **Me Too** — silent solidarity for the graves that hit close to home
- **Leave condolences** — a short guestbook message on any grave
- **Exhume** — mark a buried project as revived. It moves to the Risen section and glows green.
- **Browse** — grid view with cause-of-death sections, a pannable map view, and a Risen wing for the comeback stories
- **Share a grave** — every tombstone has a shareable link that lands visitors directly on that grave before showing them the full cemetery
- **Weekly digest** — the most-mourned grave of the week, surfaced at the top

---

## Tech

Vanilla HTML, CSS, and JavaScript — no framework, no build step. Supabase for the database. Hosted on GitHub Pages. The map view is drawn on a `<canvas>` element. The whole thing is a single folder you can open in a browser.

```
index.html      — structure
css/            — base, layout, tombstones, components
js/db.js        — Supabase data layer
js/render.js    — graveyard grid, sections, canvas map
js/ui.js        — all user interactions
```

---

## Collaborate

If you want to add something — a new feature, a better map, a dark-humour twist — open an issue or a pull request. The codebase is intentionally simple. No tooling to fight with.

Ideas that would fit:
- Condolence reactions (beyond text)
- Graveyard statistics page — most common cause of death, oldest grave, etc.
- Annual "Graveyard of the Year" digest
- Mobile app

---

*Built with grief. Hosted on GitHub Pages.*  
*[why-Radhika](https://github.com/why-Radhika)*
