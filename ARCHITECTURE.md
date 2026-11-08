# Architecture

Vanilla JS browser game. No build step, no modules, no bundler: `index.html` loads classic `<script>` tags in a fixed
order. Content data lives in `content/` (see `CONTENT.md`); this file is about the code.

## Shared namespace rule (read this first)

All `js/*.js` files are classic scripts. In a classic script, top-level `const` / `let` / `function` live in the one
global lexical scope, so **every file sees every other file's top-level names**, including reassignable `let`s such as
`tokens`, `inv`, `onKickLethal`, `extraSources`. That is how the old single closure was split with zero rewriting.

- Names resolve at call time, so a function may use anything defined in any file. Only **top-level statements that run
  at load** (e.g. `const X = f()`, `onKickLethal = ...`, `useContent(CLASSIC)`) need their dependencies to be in files
  loaded earlier. Keep load-time code to declarations; do the rest in `main.js`.
- Never declare the same top-level name in two files (SyntaxError at load: "Identifier has already been declared").
  Function declarations become `window` properties, so do not name one like a browser global (`open`, `close`,
  `stop`, `print`, `name`, `status`, `find`, `focus`...). `grep -n "^function foo\|^const foo\|^let foo" js/*.js` first.
- Wrap a new file's private helpers in a block or IIFE if you do not want to export them.
- `window.AFK.modules` lists the loaded modules in order (each file pushes its name at the end; useful when debugging
  load order).
- Other scripts use `window.AFK_*` globals: `AFK_CONTENT` (raw content), `AFK_RESOLVED` (validated, from `loader.js`),
  `AFK_RNG` (`rng.js`), `AFK_FX` (`effects.js`), `AFK_ROSTER` (`roster.js`), `AFK_GN` (`gamenight.js` engine).
- All user/content text goes through `textContent` (never `innerHTML`). Keep it that way.
- `?debug=1` gates `window.__afk` (end of `main.js`) and the rogue harness (`debug.js`). Neither is exposed otherwise.

## Load order (index.html)

1. `content/*.js` data files, `content/packs/*` (register on `AFK_CONTENT`)
2. `loader.js` (validates -> `AFK_RESOLVED`), `rng.js`, `effects.js`, `roster.js`, `gamenight.js` (pure engines, own IIFEs)
3. `js/core.js` -> `lines` -> `session` -> `chat` -> `reactions` -> `ui` -> `shop` -> `afk` -> `overlays` -> `settings` -> `rogue`
   -> `rogue-run` -> `gn` -> `rogue-ui` -> `debug` -> `main`

## Modules

| File | Lines | Owns | Load-time code |
| --- | --- | --- | --- |
| `js/core.js` | ~450 | utils (`$ pick clamp fmt*`), `store` (localStorage), themes, `{me}` token substitution (`meTok`), content sets (`mkContent`, `useContent`), crew rebuild, paths, `ACH`, state `S`, items/inventory/tokens, `getMods`, charges | `useContent(CLASSIC)`, path overrides |
| `js/lines.js` | ~380 | character lines + digs (`say`, `digFor`), packs (`applyPack`, `setPack`, lazy bulk loading), line pipeline (`speak`, `mixLine`, `genFill`), `deriveBrb/Excuse`, `pickOptions`, org fight/jabs, return chatter | none |
| `js/session.js` | ~170 | AFK-channel resident, `reset()`, audio (`beep`, `sfx`), `avatar` | none |
| `js/chat.js` | ~540 | text channels (`CT` tuning, `post` + AFK speaker queue `cq*`, `msgNode`, pings, LoR penalty), channel switch/mute/list, actions panel, slowmode, return triage (`startTriage`...`offerExcuse`) | none |
| `js/reactions.js` | ~480 | channel topic pools + validation of `topic`/`readOnly`/`posters`, view-only channels (posters, composer lock, acknowledge), emoji reactions (picker, friend reactions, capped suspicion relief) | none (`rctInit()` binds listeners) |
| `js/ui.js` | ~230 | sidebar channels + members, `syncUI`, `renderChip`, `render`, `toast` | none |
| `js/ambient.js` | ~560 | ambient server flavor (`AFK_AMB`): validated `content/ambient.js` / pack `ambient.js`, extra channels, grouped roster, rail icons, rate-limited chatter/bot/event timer, presence shuffle, read-only peek drawer. Never calls `post()`, never touches `S.pings`/`S.ch`/`S.unread`. Hooked from `ui.js` (`mount`, `members`, `frame`) | none (one `setTimeout` chain started by `mount()`) |
| `js/shop.js` | ~280 | inventory strip, active abilities, shop modal (`showShop`, `openShop`) | none |
| `js/afk.js` | ~610 | flow: `start`, brb/path choice, `goAfk`, `afkStep`, VC drag, mic events, `comeBack`, `chooseExcuse`, `bank`, `nextRound`, kick (`onKickLethal` hook declared here) | none |
| `js/voice.js` | ~230 | player-chosen voice channels (sidebar + phone buttons, `joinVoice`), park in the AFK channel and the Rejoin voice step (`vcPark`, `offerRejoin`, `doRejoin`), `VC_TUNE`, per-channel flavor. Classic only (`vcOn()`); loaded after `afk.js`, called from `ui.js`/`afk.js` at runtime | none |
| `js/overlays.js` | ~390 | persistence (scores, achievements), modal/overlay plumbing, share text, pack picker, leaderboard, start + game-over screens | none |
| `js/settings.js` | ~250 | "Your crew" settings, settings overlay, `setName` | none |
| `js/rogue.js` | ~620 | rogue constants (`RG_TUNE`), mode flags (`gameMode`), meta progression, plan, boons/relics/curses, cards, intro/boon/relic/event/shop steps | `extraSources = ...` |
| `js/rogue-run.js` | ~470 | rounds: `rgBeginRound`, `rgAfkTick`, `rgSettle`, `rgStart/Save/Resume/End` | `onKickLethal = ...` hook |
| `js/gn.js` | ~160 | Game Night adapter around `AFK_GN` (`GN`, `gnStartRun`), `setGameMode`, `modeSwitch` | none |
| `js/rogue-ui.js` | ~350 | rogue end screen, HUD, info, archive, rogue scores/share, URL params (`?mode=`, `?seed=`...), rogue start panel | URL-param IIFE |
| `js/debug.js` | ~310 | `rgDebug` test + balance harness (only used with `?debug=1`) | none |
| `js/main.js` | ~190 | keyboard/pointer input, mute button, 100 ms main loop, boot (`applyPack`, `reset`, `render`, `showStart`), `window.__afk` | boot sequence |

CSS (`index.html` link order = cascade order; `themes.css` stays last): `css/base.css` (tokens, rail, channels, avatars),
`css/chat.css` (chat, actions, AFK state, members), `css/modal.css` (modal, toasts, responsive/reduced-motion rules),
`css/settings.css` (settings, leaderboard, paths, content channels, pack picker), `css/channels.css` (multi-channel chat), `css/reactions.css` (reactions, acknowledge button, view-only composer), `css/voice.css` (voice buttons, phone voice bar),
`css/shop.css` (rarity, shop, abilities, crew), `css/rogue.css`, `css/gamenight.css`, then `themes.css`.

## Which file to edit

- New brb/excuse/chat line: `content/` data, not code. New item/boon/relic: `content/items.js` / `content/rogue.js`.
- Scoring, suspicion, mods maths: `js/core.js` (`getMods`) + `js/afk.js` (`afkStep`, `bank`).
- Anything chat-shaped: `js/chat.js`. Rogue anything: `js/rogue*.js`. Game Night: `gamenight.js` (engine) / `js/gn.js` (glue).
- Parallel work: different files can be edited at once. Two agents should not both add top-level names without
  checking collisions (see rule above). If you split a file, add the new `<script>` at the same position in `index.html`.

## Tests

Playwright suites live outside the repo (scratchpad `t.py`, `test_*.py`) and drive `http://localhost:8080`.

## Ambient server (js/ambient.js)

Pure flavor, zero gameplay effect. Data schema: `content/AMBIENT_SCHEMA.md`. `ui.js` calls `AFK_AMB.mount()` at the end of `buildChannels` (every pack switch), `AFK_AMB.members(list)` at the end of `renderMembers` and `AFK_AMB.frame()` from `render`. One timeout chain (7-15 s, skipped while the tab is hidden) posts chatter, bot lines and events into ambient-only histories; unread badges are ambient-only and never feed pings or left-on-read. Ambient members whose name equals the player's, a crew member's or a base cast name are hidden live. Invalid data is warned about once and skipped. Styles: `css/ambient.css`. `AFK_AMB.debug()` / `.pump(n)` are for tests.
