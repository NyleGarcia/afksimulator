# BoberNet content pack

Theme: "BoberNet", a Star Citizen org Discord. Player is a chronic AFK-er. Invented characters only, PG-13.

## Files

- `data.js` sets `window.AFK_PACKS.bobernet.data`: `{ server, characters, residents, channels, items, achievements }`.

Classic script (no modules). Each pack file starts with:

```js
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};
```

then sets its own key. Other pack files (separate tasks) add more keys beside `data`.

## How it plugs into the v4 content system

1. `manifest.js` registers the pack (id, name, server, files, lazy, requires). Core files are `<script>` tags in `index.html`.
2. `loader.js` validates `window.AFK_PACKS.bobernet` and publishes it as `AFK_RESOLVED.packs.bobernet`.
3. The player selects it in Settings or on the start screen (stored as `afksim.pack`). `bulk.js` is lazy: the game adds its `<script>` after first paint, only while BoberNet is active.
4. `docs/` and `bulk/` (the JSON parts `bulk.js` was merged from) are never loaded by the game. `docs/PARODY_ORGS_REFERENCE.md` names real orgs: documentation only.

See `CONTENT.md` at the repo root for the manifest shape and how to make your own pack.

## Schemas (v4)

- character: `{id, name, color, role: friend|resident|bot, tags[], rival?, lines?{ask,ok,chill,low,mid,high,good,meh,bad,reused,early}, digs[{text, when{susMin,susMax,paths[],modes[],minLateRatio}}]}`. All `when` fields optional.
- resident: character plus `timerDays:[min,max]` (voice timer range in days) and `statusLines[]`.
- channel: `{id, name, icon, type: text|voice, isAfk, members[charIds], mods{susMult,pointMult}, desc}`.
- item: `{id, icon, name, desc, price, effects{susMult,pointMult,micEventChance,excuseBonus,graceMins}, stackable, max, consumable}`. Price is in tokens (1 token per 100 points).
- achievement: `{id, name, desc, hint}`.

Path ids: `walk-away`, `muted-deaf`, `hot-mic`, `alone-in-vc`, `fell-asleep`. Modes: `afk-timeout`, `no-timeout`.

Text tokens: `{me}` player handle, `{p}` promised time, `{t}` elapsed time.

## Contents

- 6 friends: Vexley (Fleet Commander, rival), Tallow (Quartermaster), Dr. Pebble (Medic), Clank (Hauler), Wisp (Pathfinder), Rook (Gunner).
- 5 residents for the Cryo Pod: Space Popsicle (200-1500 days), DERELICT-7, Bunk Bandit, Dusty the Miner, Intern 404.
- 6 text channels, 4 voice channels (Cargo Run VC susMult 0.8, Bunker Ops susMult 1.2 / pointMult 1.2), AFK channel Cryo Pod.
- 8 items, 6 achievements.

## Validate

```sh
node -e "global.window={};require('./data.js');console.log(Object.keys(window.AFK_PACKS.bobernet))"
```
