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
`stats.digs`) for headless tests.
