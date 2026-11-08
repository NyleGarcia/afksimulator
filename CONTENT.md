# Customizing AFK Simulator

Everything you can change lives in plain data files in `content/`. You never need to touch `game.js`.
No build step: edit a file, refresh the page.

| File | What it holds |
| --- | --- |
| `content/characters.js` | friends, AFK-channel residents, bots, and their "digs" (personal insults) |
| `content/channels.js` | text and voice channels, which characters sit in them, channel modifiers |
| `content/items.js` | shop items and their effects |
| `content/paths.js` | the "where do you go AFK" choices, mic events, path chatter |
| `content/dialog.js` | brb phrases, excuses, and the shared chat lines |
| `content/themes.js` | the theme list (colors live in `themes.css`) |
| `content/packs/<id>/` | optional **content packs**: a whole alternative server (see "Content packs" below) |

## How loading works

Each file is a classic `<script>` that adds its data to `window.AFK_CONTENT`, for example
`AFK_CONTENT.characters = [...]`. The scripts are listed in `index.html`. `loader.js` then checks every entry.

- A bad entry (wrong type, missing id, unknown field value) is **skipped** and a warning is printed in the browser
  console, naming the type, the entry id and the field, for example
  `[afk-content] item "my-item" field "price": must be a whole number 0-9999; skipped`.
  The game never crashes because of content.
- A bad *optional* field is dropped with a warning and the rest of the entry is kept.
- If a file is missing or empty, the game falls back to built-in defaults.
- Entries are **added** to whatever is already registered. To add things without editing the shipped files, define
  `window.AFK_CONTENT = { items: [ ... ] }` in your own script placed before the `content/` scripts.
  Ids must be unique per type; a duplicate is skipped.
- Add `?debug=1` to the URL to log how many of each thing loaded (and to expose test hooks on `window.__afk`).
  Under `?debug=1` the squad always starts each round in the first voice channel unless a test calls `setChannel`.

Text tokens you can use in posted chat lines (not in button labels, resident status or item/path names, which are shown as plain text): `{me}` your handle, `{p}` the time you promised, `{t}` how long you have been away.
All text is shown as plain text (never HTML).
Substitution is a single pass: `{me}`, `{p}` and `{t}` are filled once, and any other `{slot}` still left in a posted line is stripped, so a raw token is never shown.
Pack generators fill their own slots (`{place}`, `{ship}`, ...) first, then the same pass runs.

## Characters (`content/characters.js`)

```js
{
  id: 'brody',                 // required, unique, letters/digits/-/_ (max 32)
  name: 'Brody',               // required, shown in chat (max 24 chars, no @ { })
  color: '#e67e22',            // #hex name color (grey if missing)
  role: 'friend',              // 'friend' (default) | 'resident' | 'bot'
  tags: ['gym', 'loud'],       // free-form notes, not used by the game yet
  rival: false,                // true = digs at you more often (65% instead of 40%)
  lines: {                     // optional per-character overrides of the shared chat lines
    ok: ['k bro hurry'],       // keys: ask ok chill low mid high good meh bad reused early kickAfter ...
    high: ['BRO. {t}.']        // used about half the time, otherwise the shared pool is used
  },
  digs: [                      // optional, see below
    { text: "{me} said {p} like it was a contract", when: { susMin: 35, minLateRatio: 3 } }
  ]
}
```

Roles:

- **friend**: chats, sits in voice, can drag you to AFK, votes to kick. The built-in five are friends.
  If no friends load at all, the game uses its five built-in ones.
- **resident**: lives in the AFK channel. One random resident is picked per run (see "Residents").
- **bot**: shown in the member list with a BOT tag. Add its id to a voice channel's `members` to seat it there.

### Digs

A dig is a line aimed at the player. When a friend is about to post a **mid or high suspicion** line
(suspicion 35% or more), the game looks at that friend's digs whose `when` matches right now.
If any match, there is a 40% chance (65% if the character has `rival: true`) the friend posts one instead of the generic line.

`when` (every key is optional; omit `when` for a dig that is always eligible once suspicion is 35+):

| Key | Meaning |
| --- | --- |
| `susMin`, `susMax` | suspicion range 0-100. Defaults: 35 and 100. Digs only fire at 35+, so a `susMax` below 35 never matches |
| `paths` | list of path ids (see `content/paths.js`), e.g. `['walk-away']` |
| `modes` | `'afk-timeout'` and/or `'no-timeout'` |
| `minLateRatio` | only when (time away / time promised) is at least this, e.g. `4` = four times late |
| `afterKick` | `true` = never used during a run; used after you get kicked (60% chance instead of the usual "finally" line) |

### Residents

A resident sits in the AFK channel for the whole run, shown with an idle dot, a rotating status, and a
Discord-style timer "In voice for N days". When you are moved or dragged to the AFK channel you appear next to them,
they sometimes mutter (system-style lines), and you earn the **Roommate** achievement after being moved to AFK with a
resident present 3 times in total. Rarely, you are "promoted to AFK channel moderator".

```js
{
  id: 'dave', name: 'Dave', color: '#c9a66b', role: 'resident',
  status: ['left for a minute', 'brb (day 1)'],   // rotates every few seconds
  lines: { idle: ['…', 'brb'] },                  // what they say; '…' is used when omitted
  timerMin: 900, timerMax: 3000,                  // starting day count is random in this range (default 200-1500)
  timerDayMins: 60                                // game minutes per resident day (default 60)
}
```

The timer ticks with the accelerated game clock. By default one resident day passes per game hour, so you
can watch it change during a run; raise `timerDayMins` to 1440 for real days.

## Channels (`content/channels.js`)

```js
{
  id: 'raid-night',            // required, unique
  name: 'raid night',          // required
  icon: '🔊',                  // optional ('#' for text, 🔊 for voice by default)
  type: 'voice',               // required: 'text' | 'voice'
  isAfk: false,                // voice only. The first channel with isAfk:true is the AFK channel
  members: ['brody', 'kev'],   // character ids that sit in this channel
  mods: { susMult: 1.2, pointMult: 1.2 },   // optional modifiers, 0.1-5
  desc: 'high stakes, high rewards'          // tooltip
}
```

- The **first text channel** is the chat. The others are shown in the sidebar.
- The **first voice channel** (that is not the AFK one) is where you start, and where the squad usually is.
- From round 2 the squad has a 30% chance each round to hop to another voice channel. Its `mods` then apply
  (`susMult` multiplies suspicion gain, `pointMult` multiplies points) and the chat announces it.
- A friend in the channel's `members` is with you in that channel. Friends listed only in other channels
  stay in their own. If you list nobody, all friends follow you.
- The AFK channel's own `mods` apply while you are parked in it.
- If a type is missing (no text channel, no voice channel, no AFK channel) the game adds a default one.

### Text channels are playable (multi-channel chat)

Text channels are switchable (sidebar, the strip under the header on phones, `Alt+Up/Down`, `Alt+Shift+Up/Down` for the
previous/next unread). Each keeps its own history, an unread dot and a red @mention badge. These optional fields
(text channels only; bad values are warned about and ignored) drive the game:

```js
{
  id: 'org-announcements', name: 'org-announcements', type: 'text',
  visibility: 0.95,          // 0..1, how closely friends watch it (default 0.5)
  busyness: 0.2,             // 0..1, how much friend chatter lands here (default 0.5)
  muted: false,              // starts muted (default false); the player can mute/unmute with M or the bell (max 3)
  muteDelay: [4, 12],        // game minutes before a ping in a muted channel reaches you (default [4, 12])
  slowmodeSec: 20,           // real seconds you cannot post again here after a quick reply or excuse (default 0)
  replies: [                 // quick replies for answering pings; t = text (<= 60), r = [min, max] suspicion removed
    { t: 'acknowledged', r: [3, 9] },          // r may be negative (a bad reply); default [1, 6]
    { t: 'o7', r: [1, 5] }
  ]                          // 3 of them are offered at a time; no list = the built-in defaults
}
```

How it plays:
- **Brb channel.** The brb is posted in the channel you are viewing when you pick it. A busy channel (high `visibility`)
  means more pings and ~2.5% faster suspicion; a quiet one means ~15% slower suspicion and fewer pings, but they scatter
  and pings in other channels hit harder (x1.3) when almost nobody saw the brb.
- **Pings.** While you are past your promise, friends post across channels (the brb channel is twice as likely, weighted by
  `busyness`). A line that @mentions you is a ping tied to that channel. A friend may follow up in another channel
  (max 3 per AFK round; the counter resets each round). Pings can only be answered in the channel they were sent to; switching to a channel (seen) or answering
  elsewhere does not clear them.
- **Muted channels.** A ping there only shows up after `muteDelay` game minutes. If you come back before that window has
  passed it is forgiven; once delivered (or older than `muteDelay[1]`) it counts.
- **On return** with pings waiting you get a timed **ping triage** (about 7s + 3.5s per pinged channel): pick which channel
  to answer first, pick a quick reply (`replies`), repeat, or skip. Then the usual excuse step (posted in the channel you
  are in; `slowmodeSec` can block it right after a reply there, "back" is never blocked).
- **Left on read.** Each unanswered ping costs `1.6 x weight x age x (0.6 + visibility)` suspicion (x1.25 if you looked at the
  channel), answered pings only a sliver that grows with how long you took. Pings are summed biggest first with x0.85 per
  extra ping, capped at 14, softer in rounds 1-2, and never push suspicion past 90% by themselves. Being dragged out halves
  it. The summary line and the bank toast show it. Quick replies also refund a little (max 6).
- Saved scores gain an optional `f` (channel you said brb in most) and the Discord share text then ends the stats with
  ` · fav #channel`; older entries render as before.
- Tunables live in the `CT` constant in `game.js`.

## Items (`content/items.js`)

```js
{
  id: 'decoy-status', icon: '🎭', name: 'Decoy Status',
  desc: "Your status says 'Playing: homework'.",
  price: 8,                    // tokens
  stackable: false,            // true = can own several (default max 5)
  max: 3,                      // only with stackable: true (1-99)
  consumable: false,           // true = used up when your next run starts, lasts one run
  effects: { susMult: 0.92 }
}
```

Effects (declarative only; they are combined in one place, `getMods()`, together with the channel mods):

| Effect | Combines | Meaning |
| --- | --- | --- |
| `susMult` | multiply | suspicion gain (0.9 = 10% slower) |
| `pointMult` | multiply | points gain |
| `micEventChance` | multiply | how often hot-mic accidents happen |
| `excuseBonus` | add | extra suspicion removed by a (non-silent) excuse |
| `graceMins` | add | minutes after your promise before friends start counting |

Stackable items apply once per copy owned.

**Tokens**: you earn **1 token per 100 points banked**, counted over each run's running total, so no remainder is lost.
Tokens are kept in `localStorage` (`afksim.tokens`) and survive getting kicked. Buy items from the 🛒 button in the
sidebar, the "Shop" button above the brb choices, or from the start and game-over screens. Owned items are
kept in `localStorage` (`afksim.inv`) across runs. Consumables are used up at the start of the next run.
The share text shows only how many items you own.

## Paths (`content/paths.js`)

```js
AFK_CONTENT.paths = [{
  id: 'walk-away', name: 'walk away', desc: 'classic', risk: 'highest multiplier, highest kick risk',
  pointMult: 1.35, susMult: 1.25,    // required
  pointGrow: 0.4, susGrow: 0.55,     // optional: extra multiplier per AFK hour (max 4h)
  modes: ['no-timeout'],             // optional: only offered in these server modes
  events: ['snore']                  // optional: mic event ids; 'alone-drift' makes friends leave voice
}];
AFK_CONTENT.pathEvents = { snore: { label: 'loud snoring', sus: [3, 7], funny: false, lines: ['is he SNORING'] } };
AFK_CONTENT.pathLines = { moved: ['rip {me}'] };   // moved, drag, aloneLeave, aloneJoin, clipped
```

A mic event can also have `funny: true` and `bonus: 25` (a chance for "chat clipped it" bonus points).
If no valid path loads, the game uses a single built-in "walk away".

## Dialog (`content/dialog.js`)

```js
AFK_CONTENT.dialog = {
  BRB:      [{ t: 'brb 2 min', p: 2, m: 1.35 }],       // text, promised minutes, points multiplier
  EXCUSES:  [{ t: 'sorry my internet died', r: [15, 35] }],  // text, suspicion removed [min, max]
  LINES:    { ask: ['yo @{me} u ready?'], mid: ['@{me} bro'] }
};
```

`LINES` keys used by the game: `ask ok chill low mid high good meh bad reused early kickAfter hype kickReason afkMod`.
(`afkMod` is the rare "promoted to AFK channel moderator" joke.) The game needs at least 3 BRB phrases and 3 excuses,
otherwise it uses its built-in ones.

## Themes (`content/themes.js` + `themes.css`)

1. Add `{ id: 'sunset', name: 'Sunset' }` to `content/themes.js` (id: lowercase letters and dashes, max 20).
2. In `themes.css` add a block that sets the color variables:

```css
:root[data-theme="sunset"] {
  --bg: #2b1d2e; --bg-2: #241826; --bg-3: #1a1020; --bg-hover: #3a2a3e;
  --text: #f5e9f0; --muted: #b9a3b4; --accent: #ff7a59;
  --ok: #3ba55d; --idle: #f0b232; --danger: #ed4245;
}
```

A theme listed without CSS still loads, it just looks like the default colors.

## Worked example: a new friend, a channel and an item

Create `my-content.js` next to `index.html` and load it in `index.html` after the `content/` scripts and before
`loader.js` (or paste the same entries into the shipped files). Each block appends to what is already there.

```js
(function () {
  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};

  // 1. a friend with digs
  C.characters = (C.characters || []).concat([{
    id: 'priya', name: 'priya', color: '#00b894', role: 'friend', rival: true,
    lines: { ok: ['k, timing you'] },
    digs: [
      { text: "it's been {t}. i have started a petition about {me}", when: { susMin: 35 } },
      { text: 'a {p} promise from {me} is basically a weather forecast', when: { minLateRatio: 3 } },
      { text: 'muted AND deafened? that is just ghosting with extra steps', when: { susMin: 40, paths: ['muted-deaf'] } },
      { text: 'we all saw it coming, {me}', when: { afterKick: true } }
    ]
  }]);

  // 2. a voice channel she hangs out in (squad usually stays in the first voice channel)
  C.channels = (C.channels || []).concat([{
    id: 'karaoke', name: 'karaoke', icon: '🎤', type: 'voice',
    members: ['priya', 'dani'], mods: { susMult: 1.1, pointMult: 1.4 },
    desc: 'everyone is too busy to notice you'
  }]);

  // 3. a shop item
  C.items = (C.items || []).concat([{
    id: 'fake-lag', icon: '🐢', name: 'Fake Lag Script', price: 6, stackable: true, max: 2,
    desc: 'Blame the ping. Excuses remove +6 suspicion and friends wait 1 extra minute.',
    effects: { excuseBonus: 6, graceMins: 1 }
  }]);
})();
```

Refresh and open the console with `?debug=1`: the loaded counts go up by one character (and 4 digs), one channel and one item.
If you typo a field you get a warning like `[afk-content] item "fake-lag" field "price": ... skipped` and the game keeps working.

## Tests

`?debug=1` exposes `window.__afk` (state, `tick(minutes)`, `go(pathId)`, `buy(id)`, `mods()`, `setChannel(id)`, `resident()`,
`stats.digs`, and for channels `say(channelId, text)`, `switchCh(id)`, `mute(id)`, `skipTriage()`, `lorPreview()`, `favCh()`)
for headless tests. Without the flag nothing is exposed.


## Content packs (`content/packs/<id>/`)

A pack replaces the *server*: name, channels, characters, residents, shop items, brb/excuse phrases, chat lines and extra
achievements. The built-in server is the pack `classic` ("The Boys (classic)"); everything in `content/*.js` above is classic.
Players pick the pack in **Settings** or on the **start screen**; it is stored in `localStorage` as `afksim.pack`.
Switching starts a fresh run state. Score, tokens and achievements carry over; shop inventory is kept per pack
(`inv` for classic, `inv-<id>`). Paths and themes are shared by every pack. Anything a pack leaves out falls back to classic.

Shipped: `content/packs/bobernet/` ("BoberNet", a Star Citizen org parody).

### Manifest

`content/packs/<id>/manifest.js` registers the pack (classic script):

```js
(window.AFK_PACK_MANIFESTS = window.AFK_PACK_MANIFESTS || []).push({
  id: 'bobernet',                      // required, unique, letters/digits/-/_ (max 32). 'classic' is reserved
  name: 'BoberNet (Star Citizen)',     // required, label in the pack picker (max 40)
  server: 'BoberNet',                  // sidebar header + share text ("in BoberNet"); default data.server.name, then name
  base: 'content/packs/bobernet/',     // optional folder for the files below (default content/packs/<id>/)
  files: ['data.js', 'dialog.js'],     // core files (small). Add them as <script> tags in index.html, or the game loads them on select
  lazy: ['bulk.js'],                   // heavy files: never block first render, loaded after first paint and only while the pack is active
  requires: 4                          // minimum content-system version (this game is 4); a pack needing more is skipped with a warning
});
```

Add the manifest and the core `files` as `<script>` tags in `index.html` before `loader.js` (so the pack is ready at first paint).
A pack whose files are *not* listed there is loaded on demand the first time it is selected.
`lazy` files are never listed in `index.html`.

### Files (each sets one key of `window.AFK_PACKS[id]`)

| Key | Shape |
| --- | --- |
| `data` | `{ server: { name, icon, tagline }, characters[], residents[], channels[], items[], achievements[] }`. Same entry shapes as classic (see above); `lines` may be a single string per key, a resident may use `timerDays: [min, max]` and `statusLines[]` |
| `dialog` | `{ brb[{t,p,m}], excuses[{t,r}], lines{ask,ok,chill,low,mid,high,good,meh,bad,reused,early,kickAfter,hype,kickReason,...}, orgFightPings[], missedFight[], welcomeBack[] }` |
| `pools` | slot values for the generator: `{ place: [ 'text' \| { v, tags?, w? } ], ship: [...], ... }` |
| `templates` | generated lines: `{ mood: { ask: [{t,tags?,w?}], ... }, orgFight: [...], pvpJab: [...], returnFight, welcomeBack, leftOnRead, cargoRun, claimTimer, crash30k, elevatorDoom, wen, misc }`. A template uses `{place}`-style slots plus `{me}` `{p}` `{t}`; `{place:tag}` filters a pool by tag |
| `generate` | `function (template, pools, rng, recentSet) -> string` that fills the slots |
| `parodyOrgs` | `[{ id, name, tag, lines[], taunts[] }]`: rival/neutral orgs mentioned in pings and jabs; use `{place}`/`{activity}` for locations, never `{p}` |
| `bulk` | (lazy) `{ ask, chill, low, mid, high, good, meh, bad, reused, kickAfter, orgFight, pvpJab, missedFight, welcomeBack, brb, excuse, micEvent, trade, serverlore, resident: string[] }`, plain strings using `{me}` `{p}` `{t}` only; each string must be 2-160 chars with no control characters or `cleanBulk` drops it |

Do not put real organisation or person names in any file the game loads. Keep research notes in a `docs/` folder inside the pack (not loaded).

### How a line is chosen

For each category (ask, ok, chill, low, mid, high, good, meh, bad, reused, early, kickAfter, orgFight, pvpJab, missedFight, welcomeBack, micEvent,
trade, serverlore, resident) the game draws a source: **hand-written 35%** (character lines + `dialog.lines`), **generated 35%**
(`templates` + `pools` + `generate`) and **bulk 30%**. A source that does not exist (no templates for that category, bulk not loaded yet) gives its share to the others.
Character **digs** still come first, at their usual probabilities (40%, 65% for a rival). The last 60 lines are remembered and avoided.
Plain-string `bulk.brb` / `bulk.excuse` entries are turned into options on the fly: `p` (minutes) comes from numbers or keywords in the text
(`2 min`, `5`, `an hour`, `dinner`; otherwise random 2-20), `m` falls from 1.6 (a minute) to 0.9 (an hour or more) with the promise,
and an excuse gets a random `r` inside -10..45. The reuse penalty is keyed by the text.

While AFK a pack's friends occasionally post an org-fight ping (sometimes about a rival org: `<org> is camping {place}`, plus one of its taunts),
trade and server-lore chatter, and, at mid/high suspicion, pvp jabs. Returning after an unanswered ping gets `missedFight` / `welcomeBack` lines and a little suspicion.

### Achievements

Pack `achievements` entries are `{ id, name, desc, hint }`. Unlock conditions live in the game, keyed by id: `30k` (AFK 8h20m of game time), `insured` (run with
the `insurance-claim-form` item), `elevator-of-doom` (mic event `flush`/`chewing` on the hot-mic path past 30 min), `missed-the-org-fight`
(return after an unanswered org-fight ping), `solo-idris` (3 pvp jabs about an Idris in one run). Entries whose id has no condition are ignored; `roommate` is already built in.

### How to make your own pack

1. Copy `content/packs/bobernet/` to `content/packs/<yourid>/`, delete the files you do not need (only `data.js` is required) and edit `manifest.js` (new `id`, `name`, `server`, `files`).
2. In each file replace `bobernet` with your id (`window.AFK_PACKS.<yourid>.data = {...}`).
3. Fill `data.js` (server, 3+ friends, optional residents, channels with one `isAfk` voice channel, items). Add `dialog.js` for brb/excuse/lines (3+ of each, or classic's are used).
4. Optional extras: `pools.js` + `templates.js` + `generate.js` for generated lines, `parody-orgs.js`, and a big `bulk.js` listed under `lazy`.
5. Add `<script>` tags for `manifest.js` and your core files in `index.html` before `loader.js`.
6. Open the page with `?debug=1`. Bad entries are skipped with a console warning prefixed by the pack id, for example
   `[afk-content] [mypack] item "x" field "price": ...`; `AFK_RESOLVED.counts.packs` shows how many packs registered, and the pack picker appears in Settings once a second pack is valid.
