# Customizing AFK Simulator

Everything you can change lives in plain data files in `content/`. You never need to touch `js/` (the engine; see "Code layout" below and `ARCHITECTURE.md`).
No build step: edit a file, refresh the page.

| File | What it holds |
| --- | --- |
| `content/characters.js` | friends, AFK-channel residents, bots, and their "digs" (personal insults) |
| `content/channels.js` | text and voice channels, which characters sit in them, channel modifiers |
| `content/items.js` | classic shop items and their effects (tiers, rarity, categories) |
| `content/rogue.js` | **rogue mode**: boons, relics, curses, events, bosses, loadouts, ascensions, synergies |
| `content/roster-traits.js` | optional: palette + traits for the "Your crew" names (built-in fallbacks exist) |
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

Other scripts the game loads (not content): `rng.js` (seeded random streams), `effects.js` (the effects combiner), `roster.js` (your crew), then `game.js`.

Text tokens you can use in posted chat lines (not in button labels, resident status or item/path names, which are shown as plain text): `{me}` your handle, `{p}` the time you promised, `{t}` how long you have been away, `{friend}` a random OTHER friend (never the speaker; `{friend:the others}` gives the fallback text when nobody else is around).
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
- Tunables live in the `CT` constant in `js/chat.js`.

### Chat pacing: the speaker queue (`CT.q`, `js/chat.js`)

While you are AFK, friend and bot lines never stack: each waits its turn. One line at a time: a `name is typing…` chip
(only when the line is for the channel you are looking at), the message, then a short gap. Pings from several channels
queue instead of landing together.

- What is queued: any `post()` by a non-player, non-system speaker during the `afk` phase. What is not: player lines,
  system lines (`sys`), `opts.now`, the catch-up loop (`catchingUp`), the `?debug` fast sim (`FAST`), and every other
  phase (chat, triage, excuse, kick, return chatter already use their own `later()` spacing).
- Accounting: the ping record (`addPing`) is created when the line LANDS, so `minsAtSend`, `seen`, owed and
  left-on-read all see what the player could actually have seen. Weights (`opts.weight`) are untouched. `opts.fight`
  tags a ping as an org-fight ping at landing. A line still queued when the AFK session ends (return, drag, kick, reset,
  mode switch) is dropped and never becomes a ping.
- Cap: `CT.q.cap` queued lines. When full, the oldest filler (a line that does not mention you) is dropped; a ping is
  never dropped, so a ping surge can exceed the cap. With `CT.q.rush` or more pings waiting the gap shrinks
  (`CT.q.rushMult`) so a burst still clears.
- Tuning (ms): typing beat = `typeBase + chars * typePerCh` clamped to `typeMin..typeMax` (700 + 22/char, 900..2200);
  gap after a message = random `gapMin..gapMax` (1500..2600). About 3-4 s per line at the defaults. `CT.q.on = false`
  turns it off. Tests: `cqState()`, `cqFlush()` (land everything now); `window.__afk.say(ch, text, {now: true})` bypasses it.

## Voice channels, moves and rejoin (`js/voice.js`, `css/voice.css`)

Classic-only (rogue picks the squad's channel from its seeded plan; Game Night GHOST keeps the old flow: avatar sits in the AFK
channel while you are away, then returns by itself). The sidebar voice rows are real `<button>`s; on phones a `Voice channels`
strip under the text-channel strip does the same job.

- **Joining.** Click (or Tab + Enter) a voice channel in chat, between rounds (brb options on screen). Not while leaving, AFK or
  judging. A hop takes a 0.9 s "connecting" beat, posts a system line, costs suspicion **+1, then +2.5, then +4** (per round) and a friend
  who is in that channel answers with a line from the channel's flavor. Your pick sticks for the run (the squad no longer rolls a hop).
  Each channel keeps its own `members` (who is in the room) and `mods` (`susMult`, `pointMult`): the sidebar shows them.
- **Flavor** (optional, per voice channel id; bad entries are ignored): classic `AFK_CONTENT.voiceFlavor`, pack `AFK_PACKS[id].data.voiceFlavor`:
  `{ 'channel-id': { hello: ['line with {me}'], brb: [{ t: 'brb loading the last crate', p: 15, m: 0.95 }] } }`.
  `hello` (<= 140 chars) is what a friend says when you join. `brb` options (`t` <= 60, promise `p` 1-90, multiplier `m` 0.5-2) replace the
  third brb option while you sit in that channel (picked by round and hop count). Excuses are not channel-specific.
- **BoberNet voice rooms**: Hangar Bay VC (baseline), Quantum Lounge (chill, x0.9 / x0.9), Cargo Run VC (forgives silence, x0.75 sus / x0.85 pts),
  Bunker Ops (x1.2 / x1.2), Strike Comms (PvP, tense: x1.35 sus / x1.4 pts). Classic: squad vc, study room (forgiving), raid night.
- **Being moved.** When the AFK bot moves you (`afk-timeout`) or a friend drags you out, your avatar leaves your voice channel and shows next
  to the resident in the AFK channel; the member list and the status line say "moved". **You do not auto-return**: after the excuse and the
  bank a `Rejoin voice` step appears (the button, or click your old channel, or any other voice channel, in the sidebar). The reconnect beat
  is `900 + 12 ms per game minute gone`, capped at 3.8 s. Rejoining costs `round(minutes gone / 90)` suspicion (max 3, "where were you"),
  friends comment (`rejoin` / `rejoinLong` dialog lines, `rejoinLong` at 60+ min) and the **next round is marked**: friends watch closer
  (suspicion gain x1.1 for that round). If that next round is a clean, on-time return (not moved, not dragged, not early) it pays a
  redemption bonus of `+20 x round` pts ("back on track after the park"); the mark is consumed by the next bank either way.
- **Bot suspicion bump.** The auto-move adds **+25% suspicion**, clamped to the kick line minus 1 (it never kicks by itself). The bar
  shows it, the system line and the AFK status line say `🤖 AFK bot flagged you: +25% suspicion`, and the value carries over (suspicion is frozen while parked).
  Tunables: `VC_TUNE` at the top of `js/voice.js`.

## Channel topics, view-only channels and reactions (`js/reactions.js`)

Three chat features that live in `js/reactions.js` (+ small hooks in `js/chat.js`). The new channel fields are **not**
known to `loader.js`; `reactions.js` reads them from the raw content (`AFK_CONTENT.channels`, `AFK_PACKS[id].data.channels`)
and validates them itself: a bad value logs a `[content] ...` warning (also pushed to `AFK_RESOLVED.warnings`) and is ignored,
it never throws.

### Topic pools (what friends say IN a channel)

Extra text-channel fields:

```js
{ id: 'pvp-ops', type: 'text', ...,
  topic: 'pvp-ops'   // optional pool key. Default: the channel id (if a pool with that key exists)
}
```

The pool itself: `AFK_CONTENT.dialog.TOPICS` (classic, `content/dialog.js`) or `AFK_PACKS[id].dialog.topics` (a pack,
`content/packs/<id>/dialog.js`): `{ 'pool-key': ['line', '@{me} ping line', ...] }`.

- Lines that contain `{me}` or `@everyone` are the **ping lines** (used when the game wants a friend to ping you); the rest
  is ambient chatter. Write both kinds in every pool (about a third pings). Only the `{me}` token is allowed; max 140 chars;
  a pool needs 3+ valid lines. Classic pools: `memes`, `clips`, `announcements`. BoberNet pools: `pvp-ops`, `trade-routes`,
  `ship-art`, `clips`, `org-announcements`. A channel without a pool (`general`) is unchanged.
- **When it applies.** Whenever the game picks a channel for an *ambient* friend line (`weightedCh()`: chill chatter, AFK pings),
  the line posted there is swapped for a line from that channel's pool (a ping stays a ping). Topic lines do not repeat within 16 picks.
  Not swapped: your own messages, dig lines (a friend's personal insult keeps its text anywhere), follow-ups
  ("did you see my message in #x"), system messages, and anything posted with an explicit text (`post(..)` without an ambient pick).
- `routeCh(pref)` (packs): pack lines that belong to a channel (org-fight pings -> `pvp-ops`, trade chatter -> `trade-routes`)
  always go there. Server-lore chatter (no pref) goes to a channel without a topic (`general`).
- Quick replies (`replies`) are already per channel; classic `announcements` and BoberNet `org-announcements` use the acknowledge flow instead.

### View-only channels

```js
{ id: 'announcements', type: 'text', ..., readOnly: true, posters: ['afk-bot'] }
```

- `readOnly: true` (text only): the player cannot post, brb or explain themselves there. The channel gets a lock icon in the
  sidebar/strip and header, an italic "view only" aria-label, and the composer shows the locked state
  "You do not have permission to send messages in this channel."
- Saying brb with a view-only channel open: the three brb options are disabled (title "<channel> IS VIEW ONLY"); click another
  channel. Excuses (not the "say nothing" one) are disabled the same way. Any `post()` by the player or by a non-poster into
  a view-only channel is moved to the first writable text channel.
- `posters` (readOnly only): character ids allowed to post there (bots or officers; default: every bot). Friends and bots from
  `posters` are the only voices in the channel. Classic: `afk-bot`. BoberNet: `vexley`, `tallow`.
- **@everyone pings.** In a view-only channel a line with `@everyone` counts as a mention: while you are AFK it creates an owed ping
  (weight as any ping). On return, triage lists the channel as usual, but you cannot reply: you get **Acknowledge**
  (clears every owed ping there, no message is posted, +2..5 suspicion relief like a reply) or you click the **Acknowledge**
  button on the announcement itself, or you simply stay in the channel for 2.5 s of triage ("reading it").
- Follow-up pings ("did you see my message in #x") are never sent to a view-only channel. Reactions work in view-only channels.

### Reactions

- Every message has a reaction button (shown on hover/focus; always dimmed-visible on touch) and, when it has reactions, chips
  under the text: emoji + count; click a chip to add/remove your own. Keyboard: Tab to the message list, Up/Down move between
  messages, **R** or **Enter** opens the picker (a `role=menu` of 6: 👍 😂 💀 🔥 👀 🧢), arrows/Home/End/1-6 move, Enter picks,
  Esc closes and returns focus. Reactions are only possible in phases chat/intro/triage/excuse (not AFK, not after a kick).
- **Friends react.** Your normal messages get 0-1 reactions (45%); your **brb** and **excuse** always get 1-3, 0.5-1.2 s apart.
  Friends also react to each other (30%, view-only announcements 55%, mostly 👍/👀).
- **Skepticism.** For a brb/excuse the friends' mood is `sk = clamp(1.2 * sus / kickAt + 0.18 * timesThisExcuseWasUsed, 0, 1)`. Each reactor
  sends a sceptical emoji (🧢 💀 👀) with probability `0.9 * sk`, otherwise a friendly one (👍 😂 🔥). Cosmetic, no scoring effect.
- **Your reaction to a friend's message** that *fits* its content lowers suspicion a little: **-0.8 suspicion per fitting
  reaction (`REACT.fit`), at most -2.4 per round (`REACT.cap`, i.e. 3 fitting reactions)**, once per message (toggling off and on again pays
  nothing), never below 0, and not for your own messages. Fit = matches the message category: funny (`lol/lmao/clip/meme/fail...`) fits 😂 💀;
  nice (`nice/render/hull/gg/...`) fits 🔥 👍; calls to action / announcements (`@`, `rally`, `fight`, `acknowledge`, ...) fit 👍 👀; price
  talk (`price/rumor/route...`) fits 🧢 👀; anything else fits 👍 👀. A fitting chip gets a green ring. Tuning lives in `REACT` and
  `RCT_CATS` at the top of `js/reactions.js`.

## Effects vocabulary (items, boons, relics, curses, loadouts, ascensions)

There is ONE effects vocabulary. It lives in `loader.js` (`AFK_RESOLVED.effectDefs`) and is combined in one place (`effects.js`
+ `getMods()` in `js/core.js`). Every source that has an `effects` object speaks it. Unknown keys and out-of-range values are
dropped with a console warning. Columns: **single** = the most one source may declare (the loader rejects beyond it),
**clamp C / R** = the total after combining everything, for classic / rogue.

| Key | Kind | single | clamp C | clamp R | Meaning |
| --- | --- | --- | --- | --- | --- |
| `susMult` | multiply | 0.5..2 | 0.55..2 | 0.4..2.5 | suspicion gain |
| `susFlatPerRound` | add | -10..10 | -15..15 | -20..20 | suspicion added at the start of each round (negative heals) |
| `pointMult` | multiply | 0.5..1.5 | 0.6..2 | 0.6..3 | points |
| `pointFlatPerMin` | add | 0..4 | 0..10 | 0..14 | flat points per game minute (grows 20% per round) |
| `comboKeep` | charges | 1..2 | 0..3 | 0..4 | a combo reset is cancelled once per charge |
| `comboStartBonus` | add | 0..1 | 0..1 | 0..2 | combos restart at x(1+n) |
| `secondWind` / `secondWindSus` | charges / min | 1..2 / 25..70 | 0..3 / 25..70 | 0..4 / 25..70 | a would-be kick is cancelled; suspicion drops to `secondWindSus` (default 50, the lowest declared wins) |
| `excuseReroll` | charges | 1..2 | 0..4 | 0..6 | a bad or busted excuse rolls once more |
| `excuseBonus` | add | -10..25 | 0..60 | 0..80 | extra suspicion removed by an excuse |
| `pingShield` | charges | 1..3 | 0..6 | 0..10 | the hottest owed pings are forgiven on return |
| `triageTime` | multiply | 0.6..1.5 | 0.7..2 | 0.6..2.2 | length of the ping triage timer |
| `micEventChance` | multiply | 0.1..3 | 0.1..3 | 0.1..3 | hot-mic accidents |
| `clipBonusMult` | multiply | 1..3 | 1..3 | 1..3 | bonus when chat clips a funny mic event |
| `graceMins` | add | -3..6 | 0..12 | 0..14 | minutes after your promise before friends start counting |
| `dragChanceMult` | multiply | 0.4..3 | 0.25..3 | 0.25..3 | how often friends drag you out (no-timeout rounds) |
| `lieBonusMult` | multiply | 1..2.5 | 0.5..3 | 0.5..3.5 | the "lie bonus" for staying out far past your promise |
| `tokenMult` | multiply | 1..1.5 | 1..2 | 1..2 | tokens (classic) / rogue tokens (rogue) |
| `goldMult` | multiply | 1..2 | 1..2 | 1..2.5 | rogue run gold (ignored in classic) |
| `startSus` | add | 0..30 | 0..40 | 0..40 | suspicion at the start of a run |
| `susCap` | add | 0..20 | 0..30 | 0..40 | the kick line becomes 100 + n |
| `abFakeInternet` `abMuteHammer` `abDecoy` `abPingBomb` | charges | 1..2 | 0..3 | 0..4 | active abilities (buttons or Q W E R in safe moments) |

Rules: multipliers compose multiplicatively (`value^n` per stack), adds sum, then ONE clamp per key at the end (never per source).
`charges` keys are not combined into the modifiers: they are granted as counters (`S.charges`) when the source becomes active
(classic: at run start or when armed; rogue: on pickup) and spent charges are never refunded. Environmental multipliers (channel mods,
path mods, boss rules, elite rounds, act pressure, abilities used this round) are applied AFTER the clamp. `AFK_FX.fmt(key, value)` is the
chip text everywhere (shop rows, tooltips, rogue cards).

**Active abilities** (only while you are in chat, path, excuse or triage, never while away): Fake Internet (your next excuse lands, at least -35,
cannot be busted; excuse/triage), Mute Hammer (no mic accidents this round; chat/path), Decoy Status (suspicion x0.5 this round; chat/path),
Reply-All Macro (answers every owed ping at once at a small penalty; triage). Hotkeys Q W E R.

## Items (`content/items.js`)

The classic token shop. In **rogue mode classic items do nothing** (the run has its own boons, relics, curses and gold).

```js
{
  id: 'decoy-status', icon: '🎭', name: 'Decoy Status',
  desc: "Your status says 'Playing: homework'.",
  price: 8,                    // tokens (whole number)
  category: 'gear',            // gear | excuses | opsec | hustle | gadgets | gambles (shop tab)
  tier: 'permanent',           // permanent (always on) | run (held in stock, switches on when a run starts, lasts the run)
                               //   | consumable (held in stock, ARMED by you before a brb, lasts one round or one ability use)
  rarity: 'common',            // common | rare | legendary (border colour + badge)
  tags: ['sus'],               // up to 6 lowercase tags, free text
  stackable: false,            // true = can own several (default max 5)
  max: 3,                      // only with stackable: true (1-99)
  consumable: false,           // legacy flag: true means tier "run" (older item files keep working)
  effects: { susMult: 0.92 }   // the effects vocabulary above
}
```

Design budget used by the shipped items (not enforced by the loader): no single item above `pointMult` 1.25 or below `susMult` 0.88,
permanent items together about x1.2 points. Price bands: common 2-12, rare 10-25, legendary 30-50 tokens.

**Tokens**: you earn **1 token per 100 points banked** (x `tokenMult`), counted over each run's running total, so no remainder is lost.
Tokens are kept in `localStorage` (`afksim.tokens`) and survive getting kicked. Buy items from the 🛒 button in the sidebar, the "Shop"
button above the brb choices, or from the start and game-over screens (category tabs, effect chips, a "after buying" preview, `(max)` when a
clamp is reached). Owned items are kept in `localStorage` (`afksim.inv`, `inv-<pack>` for a pack's items) across runs.
The sidebar shows a "your build" line (every active effect; charges as current/max). The share text shows only how many items you own.

## Your crew (settings: friend names)

Settings > **Your crew**: up to 8 names (16 characters each) with an optional trait (`roaster`, `hype`, `chill`, `rival`, `chaotic`) replace the
server's friends **by slot** in chat, the member list, voice channels, digs and share text. The crew keeps the original character ids (so channel
membership still works), gets stable colours, and applies at the start of a run. Names are sanitised (no `@`, braces, control characters), the
list is stored in `localStorage` (`afksim.roster`), and Export/Import use a small JSON string (`{"v":1,"crew":[{"n":"Dave","t":"roaster"}]}`,
max 2048 characters, validated hard). `content/roster-traits.js` may set `AFK_CONTENT.roster = { palette: ['#hex', ...], traits: { roaster: { tags, digRate, quiet, wildcard, lines, digs } } }`;
without it the built-in traits in `roster.js` are used.

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
An event may also set `icon` (emoji, max 8 chars, default 🎙️) and `tag` (max 16 chars, default `mic`); the system line reads `{icon} {tag}: {label}`,
so non-mic events (status spotted, notification pings, kitchen noises) can read right. Each AFK offer shows 3 random paths from the pool for the round's server mode,
so adding paths just adds variety. Audible-in-VC paths should use `modes: ['no-timeout']`.
### Path mechanics (all optional)

| field | effect |
|---|---|
| `calm: 1.4` | suspicion does not grow until AFK time reaches 1.4x the promise |
| `punctual: 2.2` | returning within 15% of the promise multiplies the banked points by 2.2 |
| `earlyKeep: 0.8` | returning early keeps 80% of points instead of the usual 25% |
| `pulseEvery: 40, pulseLen: 12, pulsePts: 2.2, pulseSus: 2.2` | every 40 game-minutes a 12-minute surge multiplies points and suspicion |
| `silent: true` | friends never ping you while AFK (so no triage), suspicion still grows |

The path offer shows a short tag for each (`calm start`, `surges`, `no pings`, `on-time bonus`, `early exit ok`) and the AFK panel status line shows the surge clock or the on-time window.

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

## Rogue mode (`content/rogue.js`, `content/packs/<id>/rogue.js`)

A run: **3 acts x 4 rounds**. Round 4 of every act is a **boss**; round 2 or 3 of every act is an **elite** (both at ascension 4+).
A round plays like classic (brb, path, AFK, ping triage, excuse, bank) plus a **goal**: stay AFK `8 / 20 / 40` minutes (act 1/2/3; elites x1.5) and
come back alive to pick 1 of 3 **boons**. Missing the goal means no boon and a combo reset. Kicks cost an **alt account** (extra life, start 2, max 3);
no alts left ends the run. After a cleared boss you pick a **relic** (1 of 3). Shops open after rounds 3, 6 and 9; one **event** per act happens after a seeded
round 1-3 of that act; elites offer an optional **curse** first. Beating the act-3 boss wins. The mode lives in `localStorage` (`afksim.gameMode`);
URL params `?mode=rogue&seed=K7M2-9QXA&asc=3&loadout=ghost` prefill the rogue start panel (all sanitised; asc and loadout must be unlocked).

`content/rogue.js` registers `AFK_CONTENT.rogue = { flavor, boons, relics, curses, events, bosses, loadouts, ascensions, synergies }`. Every effect uses the
effects vocabulary above. Ids are `[a-z0-9_-]{1,32}`. Bad entries are skipped with a `[afk-content]` warning like everywhere else.
Rogue needs at least 1 loadout, 3 boons, 1 relic and a boss for each act, or the Rogue toggle is disabled.

```js
// boon: offered after a cleared round, bought in the run shop. rarity budgets are ENFORCED by the loader (over-budget entries are skipped):
//   common: pointMult <= 1.10, susMult >= 0.93, charges <= 1 per key | rare: <= 1.20, >= 0.85, <= 2 | legendary: <= 1.40, >= 0.75, <= 3
{ id: 'ghost-protocol', name: 'Ghost Protocol', icon: '👻', rarity: 'rare', tags: ['sus', 'drag'], desc: 'Friends lose your trail.',
  effects: { susMult: 0.88, dragChanceMult: 0.7 },
  max: 1,                         // stacks (default 1)
  instant: { gold: 0, sus: 0, alts: 0 },   // optional: applied once on pickup
  weight: 1, acts: [1, 2, 3],     // offer weight, act gating
  requires: { tag: 'mic', count: 1 },      // optional: only offered once you own that many boons with the tag
  unlock: { tokens: 0 } }         // 0 = free from the start, n = Archive price in rogue tokens

// relic: a permanent passive from a boss (same shape without rarity/max/weight/acts/requires; budget = legendary)
{ id: 'hazard-tape', name: 'Hazard Tape', icon: '🚧', tags: ['sus'], desc: '...', effects: { susMult: 0.8 }, when: { roundType: 'boss' }, unlock: { tokens: 0 } }

// curse: offered before an elite round (accept or decline, max 2 active). payout is granted when you CLEAR that elite round.
{ id: 'glass-cannon', name: 'Glass Cannon', icon: '💥', desc: '...', duration: 'round',   // round | act | run
  effects: { pointMult: 1.4, susMult: 1.3 },        // curses may use the whole `single` range of the vocabulary
  shopPriceMult: 1.3,                                // optional (loan-shark): shop prices while active
  payout: { gold: 25, boonRarity: 'rare', boonChance: 1, alts: 0, relicReroll: 0, effects: { pointMult: 1.25 }, effectsDuration: 'act' } }  // gold x act scale

// event: choose-your-own-adventure, one per act. text/outcome text may use {me} {friend}
{ id: 'vending-machine', title: 'The Vending Machine', icon: '🥤', acts: [1, 2, 3], weight: 1, text: '...',
  choices: [   // 2-4 choices
    { label: 'Insert coin', hint: 'safe snack', cost: { gold: 1 },                  // cost is paid up front (gold, alts)
      requires: { goldMin: 20, alts: 2, flag: 'donor' },                             // optional
      outcomes: [ { w: 1, text: '...', instant: { sus: -12 }, giveBoon: { id: 'x' } | { rarity: 'rare', tag?: 'mic' },
                    giveCurse: 'curse-id', giveRelic: true, effects: { pointMult: 1.1 }, effectsDuration: 'run' | 'act', flag: 'name' } ] } ] }
// a rarity with nothing unlocked falls back to the next lower rarity

// boss: act 1-3, objective = AFK this many game minutes and come back with suspicion under the kick line
{ id: 'ultimatum', name: 'Org Leader Ultimatum', icon: '📣', act: 1, objective: { minMins: 20 }, promise: { p: 15, m: 1.0 },  // forced brb
  reward: { gold: 100 }, rules: { modeLock: 'no-timeout', graceZero: true, pingRateMult: 1.6 },
  intro: ['...'], midFight: ['T-minus {t}. Are you there, {me}?'], win: ['...'], fail: ['...'] }
// rules: modeLock ('no-timeout'|'afk-timeout'), graceZero, pingRateMult 0.5-4, susMultRound / pointMultRound 0.5-2, dragChanceMult 0.25-3,
//   micEventMult 0.1-3, blackout { at:[a,b], dur:[c,d], susMult } (friends leave voice mid-round), mutedOff, triageTimeMult 0.5-1.5, noDecay,
//   excuseMult 0.25-1, kickVoteAt 10-100, forceVc <voice channel id> (falls back to the channel with the highest mods), pingShield 0-4 (granted for the round)

// loadout: starting kit (Archive unlock). unlock.ascMax N additionally needs a win at ascension N
{ id: 'ghost', name: 'Ghost', icon: '👻', desc: '...', unlock: { tokens: 60 }, effects: { susMult: 0.85, pointMult: 0.85 },
  alts: 2, gold: 0, rerolls: 1, boons: [], curses: [], freeBoon: 'sound-board', offerCards: 3 }   // offerCards 3 or 4 (Gambler)

// ascensions: levels 1..5 in order, stacking. rules: bossPingRateAdd, lorCapAdd, altsStart, bossObjectiveMult, elitesPerAct, graceCap, startCurse
{ level: 1, name: 'Tight Leash', desc: '...', effects: { susMult: 1.08 }, rules: {}, scoreMult: 1.15 }

// synergy: when you own `count` boons with a tag, a bonus source switches on (once)
{ id: 'mic-network', tag: 'mic', count: 3, name: 'Hot Mic Network', effects: { clipBonusMult: 1.5 }, instant: { gold: 25 }, desc: '...' }

// flavor: act names, run name, labels
flavor: { actNames: ['The Lobby', 'The Grind', 'The Void'], runName: 'Night Shift', bossLabel: 'BOSS', eliteLabel: 'ELITE' }
```

**Rarity weights** per offer slot by act: act 1 `70/27/3`, act 2 `55/35/10`, act 3 `45/38/17` (common/rare/legendary). An offer is 3 distinct boons (4 with the
Gambler), none at `max`, only unlocked, act-gated. **Pity**: after two offers with no rare+ the next first slot is rare+. A cleared elite makes slot 1 rare+ (a curse
payout can raise it). Rerolls start at 1 (loadout), +1 from the shop and some payouts. If a rarity has nothing available the offer falls back to the nearest rarity.

**Gold** (separate from classic tokens and rogue tokens): `floor(points banked / 100 x 0.35 x goldMult)` per settled round, plus boss, elite and event gold.
Shop prices scale with the act `x1 / x2.5 / x5`: common boon 8, rare 16, legendary 40 (act 2+), ability charge 4, heal (-25 suspicion) 6, remove a curse 12, +1 alt 30
(once per shop, max 3 alts), +1 reroll 5, reroll the shop `2 + 2n`. **Act pressure**: friends drag you out `x1 / x1.48 / x2.15` as often by act and a further `x1 / x2.5 / x4.1`
in the boss round (see `RG_TUNE` in `js/rogue.js`); the boss intro card states it.

**Score** = `floor(points banked x ascension score multiplier x (win ? 1.5 : 1))`. **Rogue tokens** at run end = `floor(points / 100 x 0.2 x tokenMult) + 5 per boss + (win ? 25 + 10 x ascension : 0)`.
The Archive (start panel) spends them on boons, relics and loadouts. Winning at your highest unlocked ascension unlocks the next (1-5). Meta lives in
`localStorage` (`afksim.rogue`: tokens, ascMax, wins, runs, unlocked ids, best score per ascension), the in-progress run in `afksim.rogueRun` (saved at every intermission,
re-validated against the current content on resume), the rogue leaderboard in `afksim.rogueScores` (top 10, separate from classic `afksim.scores`).

### Seeding and what is NOT seeded

Rogue uses keyed random streams (`rng.js`): every decision draws from a fresh stream that depends only on `(seed, name, index)`, so choices cannot desync.

| Stream | Decides |
| --- | --- |
| `env`, round | server mode, afk-timeout threshold, voice-channel roam, elite placement (per act), the 3 path options |
| `boon`, round, reroll | the boon offer (cards depend on the seed, the round, the reroll count, the boons you already own and the pity counter) |
| `shop`, act, reroll | shop stock |
| `event`, round, choice | which event, and each outcome roll; the event round per act comes from `event`/`round`/act |
| `curse`, round | the curse offered before an elite (and its legendary-chance roll) |
| `boss`, act | which boss of the act |
| `relic`, act, reroll | the relic offer |
| `start` | the random starting curse at ascension 5 |

**Seeded**: the whole map (round types, modes, thresholds, channels, bosses, event rounds), boon / relic / shop / curse / event selection and outcomes, and the path options.
Same seed + same ascension = same plan, whatever the loadout. Same seed + same choices = same offers; offers can differ after different picks because owned boons are excluded
("the first offer of each round is identical" only while the owned set is). **Not seeded** (plain `Math.random`): chat lines and flavor, friend ping timing and targets, mic accident
rolls, drag rolls, left-on-read details, the boss chatter and blackout timing, excuse rolls and busted-excuse rolls, BRB and excuse text options. Combat consumption also depends on frame timing, so even a
seeded stream could not reproduce it. In short: same seed = same map, not same drama.

### How packs extend rogue content (`content/packs/<id>/rogue.js`)

```js
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};
window.AFK_PACKS.bobernet.rogue = {
  disable: ['sticky-note'],                       // remove base entries by id (any type) before offering
  flavor: { actNames: ['Hangar Bay', 'Jump Point', 'The Outer Belt'], runName: 'Fleet Rotation', bossLabel: 'FLEET ALERT', eliteLabel: 'CONTESTED ZONE',
            bossIntro: { ultimatum: ['...'] } },  // presentation only
  override: {                                     // SAME id as a base entry: only name / icon / desc / intro / text / title / label / lines are read
    bosses: [ { id: 'ultimatum', name: 'Fleet Commander Ultimatum', icon: '🛰️', intro: ['...'], lines: { midFight: ['...'], win: ['...'], fail: ['...'] } } ],
    boons:  [ { id: 'caffeine-drip', name: 'Quantum Fuel Drip', desc: '...' } ] },
  boons: [ ... ], relics: [ ... ], curses: [ ... ], events: [ ... ], bosses: [ ... ], loadouts: [ ... ]   // NEW ids only, validated like base content (budgets included)
};
```

Add `'rogue.js'` to the pack manifest `files` and a `<script>` tag before `loader.js`. A new entry whose id collides with a base id is treated as an override (effects and rules in it are ignored with a warning).
Packs cannot change ascensions. Events may reference base boons and curses by id; a dangling id drops that outcome with a warning. A pack without `rogue.js` plays rogue with base content and flavor.
The merged result for a pack is `AFK_RESOLVED.rogueFor(packId)`.

### Balance

Numbers are checked with `sim_rogue.py` (it plays whole runs through the real game code, headlessly, with the `?debug=1` fast-forward harness `window.__afk.rogue`):

```
uv run --with playwright python sim_rogue.py main 400        # A0, 400 runs per policy
uv run --with playwright python sim_rogue.py asc 160         # A0..A5
uv run --with playwright python sim_rogue.py sweep 20 random # force every boon / relic once
uv run --with playwright python sim_rogue.py loadouts 100
```

Policies: `random` picks boons, events, curses and shop items at random (and a random path); `greedy` scores boons and purchases, answers pings, buys the spare alt, parks "alone in VC" for bosses and
pushes its luck less. Both promise the longest brb, stay past the promise to the round goal and come back when suspicion gets high. Win rates (Wilson 95% interval), A0, no loadout bonuses:

| policy | runs | win rate | mean score | score p10 / p50 / p90 | died act 1 / 2 / 3 / won |
| --- | --- | --- | --- | --- | --- |
| random | 400 | **11.5%** (9-15) | 23,814 | 9.9k / 22.5k / 38.4k | 0 / 131 / 223 / 46 |
| greedy | 400 | **46.8%** (42-52) | 31,330 | 11.9k / 31.1k / 47.1k | 0 / 59 / 154 / 187 |

Ascension ladder (greedy, 160 runs each; random in brackets): A0 45.6% (15.6), A1 33.8% (6.2), A2 30.6% (7.5), A3 30.6% (1.9), A4 13.8% (0.6), A5 12.5% (0.6).
Per-ascension drag pressure (small `dragChanceMult` effects in `content/rogue.js`) was added to the ascension effects because suspicion alone almost never kills a competent player: the real killer is being
dragged out of a boss round before the objective.

Time: a whole run is about 13.7 rounds and 3.5-3.7 real minutes of AFK waiting on average (max about 5 min over 800 runs), roughly 8 minutes including picks, returns and intermissions; one round is about
0.5 min on average (a human reading the cards takes 1-2 min). Far below the 25 minute budget.

Single-entry sweep (each boon or relic forced from round 1, random policy, 20 runs each; baseline 7-14% depending on the batch): no entry stays above +25 pp once confirmed with more runs. The 20-run
table is noisy (one standard error is about 10 pp); the only entry it put above +25 pp, `witness-protection`, measures +17 pp over 240 runs. After the tuning pass the strongest entries are
`witness-protection` (+17 pp), `omniscient-mod` (+11 pp) and the drag-reducers `ghost-protocol` and `server-key` (+6 to +11 pp); everything else is within noise (under +6 pp). Classic shop items do not apply in rogue,
so there is nothing to sweep there.

Loadouts (100 runs each, random / greedy win rate): intern 8 / 36, hot-mic-hero 11 / 52, ghost 16 / 65 (the strongest; its drag reduction was cut from x0.6 to x0.8), gambler 10 / 33, diplomat 16 / 42, speedrunner 8 / 47, hauler 12 / 40.
The BoberNet pack plays a little easier (random 14%, greedy 57.5%) because it adds drag-reducing boons.

Tuning constants (`RG_TUNE` in `js/rogue.js`): act drag pressure `x1 / x1.48 / x2.15`, boss-round drag pressure `x1 / x2.5 / x4.1` (on top of the boss's own rules), elite `points x1.4, suspicion x1.15`,
gold `0.35 per 100 points`, rogue tokens `0.2 per 100 points` (the spec had 0.5, which paid about 120 tokens per run; at 0.2 a typical run pays 40-80). Data tuned from the first content drop: witness-protection
(drag x0.5 -> x0.76), server-key (x0.5 -> x0.62), ghost loadout (drag x0.6 -> x0.8), ascension effects (drag), friday-raid (the duplicated pointMultRound/susMultRound removed, the raid channel supplies them),
afk-kings-shrine (the alt is paid once, as the choice cost).

### Rogue test hooks (`?debug=1`)

`window.__afk.rogue`: `fast(on)` (make `later()` instant: a discrete-event queue), `drain()`, `start({seed, ld, asc})`, `state()`, `plan(seed, asc)`, `offer()`, `cards()`, `pick(n)`, `give({boon, relic, curse, gold, alts, sus})`,
`jump(round)`, `back()` (come back from AFK), `tick(minutes)`, `forceEvent(id)`, `shopNow()`, `relicNow()`, `boonNow()`, `curseNow()`, `settle()`, `end(win)`, `meta()`, `setMeta(obj)`, `saved()`, `resume()`,
`scores()`, `shareText(entry)`, `rollBoons(seed, round, reroll, act, n)`, `shopStock(seed, act, n)`, `eventFor(seed, round)`, `rules(asc)`, `tune(obj)` (the `RG_TUNE` difficulty knobs), `auto(policy, untilPhases)`,
`sim({policy, seed, ld, asc, forceBoon, forceRelic, forceCurse})` and `simMany(opts, n)` (policies `random`, `greedy`).

## Tests

`?debug=1` exposes `window.__afk` (state, `tick(minutes)`, `go(pathId)`, `buy(id)`, `mods()`, `setChannel(id)`, `resident()`,
`stats.digs`, and for channels `say(channelId, text)`, `switchCh(id)`, `mute(id)`, `skipTriage()`, `lorPreview()`, `favCh()`)
for headless tests. Without the flag nothing is exposed. The rogue harness is `window.__afk.rogue` (see "Rogue test hooks").
Browser suites live outside the repo while the feature is in review (`t.py`, `test_paths.py`, `test_content.py`, `test_pack.py`, `test_channels.py`, `test_roster.py`,
`test_effects.py`, `test_rogue.py`: `uv run --with playwright python <file>` against a local `python -m http.server 8080`) and `sim_rogue.py` is the balance simulator.


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
  requires: 5                          // minimum content-system version (this game is 5); a pack needing more is skipped with a warning
});
```

Add the manifest and the core `files` as `<script>` tags in `index.html` before `loader.js` (so the pack is ready at first paint).
A pack whose files are *not* listed there is loaded on demand the first time it is selected. So `files` must be complete: every data file the pack needs (`ambient.js`, `rogue.js`, `gamenight/*.js` incl. `gamenight/reactions.js`), not just the ones in `index.html`.
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

## Code layout

The engine used to be one `game.js` and one `style.css`. It is now split so several people (or agents) can edit
different files at once. Data stays in `content/`; behaviour is in `js/`; styling in `css/` (+ `themes.css`).
Short version (full detail, load order and rules in `ARCHITECTURE.md`):

| Want to change | Edit |
| --- | --- |
| helpers, state `S`, item mods (`getMods`), `{me}` tokens | `js/core.js` |
| line pipeline, packs, brb/excuse option picking | `js/lines.js` |
| text channels, pings, triage, slowmode, actions panel | `js/chat.js` |
| the AFK round itself (paths, excuses, judging, kick) | `js/afk.js` |
| shop modal, abilities, inventory strip | `js/shop.js` |
| settings, your crew | `js/settings.js` |
| rogue rules / rounds / UI | `js/rogue.js`, `js/rogue-run.js`, `js/rogue-ui.js` |
| Game Night glue (engine is `gamenight.js`) | `js/gn.js` |
| boot, input, main loop | `js/main.js` |
| styles | `css/<area>.css`; colors per theme in `themes.css` |

## Game Night mode (`content/gamenight/*.js`, `content/packs/<id>/gamenight/*.js`)

Mode id `gamenight`, title `{Day} Never Happens`. You are the flake: every week you invent an excuse (5-slot Excuse Builder), the
ledger remembers it, friends investigate, and morale/strikes decide when you are kicked. Engine: `gamenight.js` (`AFK_GN`),
glue: `js/gn.js`, styles: `css/gamenight.css`, validation: `loader.js` ("game night content" block; bad entries warn and are
skipped, a section under its minimum falls back to built-ins). Settings (`afksim.gn`): weekday, time, game name, length 8/12/endless,
strikes 2/3/5, use crew, difficulty. Own leaderboard (`afksim.gn.best`) and share text; run state is not persisted.

| File | Registers | Entry shape (all text plain, rendered with `textContent`) |
| --- | --- | --- |
| `parts.js` | `gamenight.parts` | `id slot label text short elab tags ttl contradicts requires callback fits proofLabel lastMinute unlocks weight`. Slots: cause escalation proof witness promise. `short` is needed for cause/proof, `proofLabel` for proof, `elab` is 1-5 |
| `reactions.js` | `gamenight.reactions` | `byBand[calm\|eyebrow\|sus\|detective][impressed\|neutral\|exasperated\|detective]` (entries `string` or `{t, eMin, lvl, when}`), `repeat contradiction callbackReward proofDemand proofPass proofPerfect proofFail strike strikeFinal detectiveRise detectiveStandDown detectiveQuiz believed proofDecoys`, `friendLines` (`_default`, personality pools `_roaster _hype _chill _rival _chaotic`, or a friend id) |
| `plan.js` | `gamenight.plan` | `gameNames argue{day,time,game} gamePicker beats{morning,afternoon,hour,zero,zeroAfter} counterOffers disbandThreat cancelOpeners updateLines differentGame` |
| `outcomes.js` | `gamenight.outcomes[]` | `id kind title weight when{weekMin,weekMax,kMin,kMax,eMin,eMax,flakersMin,flakersMax,moraleMax,strikesMin,tags,approach} text[1-3] chat[0-2] effects{morale,skep,strike,ptsMult}`. Kinds: skipped called-out dragged-in played-without-you everyone-flaked different-game just-talked update-hell ending (`ending`: kicked disbanded survived never-happens retired) |
| `flakes.js` | `gamenight.flakes` | `traits friendExcuses events solidarity playerCatchesFriend snowball` |
| `achievements.js` | `gamenight.achievements awards titles` | `{id name desc hint}`, `{id name desc}`, `{id name minPts}`; unlock rules live in the engine, keyed by id |

Tokens: `{me} {friend} {day} {time} {game} {week}`; `{cause}`/`{prop}` only in reactions, outcomes and `flakes.solidarity` (a line whose
token is empty is skipped). Single-pass substitution; unknown tokens are stripped. Tags are plain strings; a claim grants its parts' tags
for `ttl` weeks, `contradicts` lists active tags that make a part a lie that clashes with the ledger, `requires` + `callback: true`
makes a callback part (offered only while the tag is active). Never let a part contradict a tag it grants or that a part it `fits`
grants.

Packs: `window.AFK_PACKS[id].gamenight = { parts, reactions, ... }`, same keys. Arrays of objects with an `id` merge by id (same id
replaces, new id adds); string/`{t}` pools append to the core pool unless the pack lists the dotted path in `replace: [...]`; do not
repeat core lines verbatim. Test: `?debug=1` exposes `window.__afk.gn` (seed, fast, drain, state, setSettings, pInvestigate, ...).

## Ambient server flavor

`content/ambient.js` (`AFK_CONTENT.ambient`, classic) and `content/packs/<id>/ambient.js` (`AFK_PACKS.<id>.ambient`) add roles, 45-60 members, 14-20 extra `x-` text/voice channels, chatter, bot lines, events, topics + pins, server rail icons and presence-shuffle weights. Pure flavor, wired by `js/ambient.js`; full schema in `content/AMBIENT_SCHEMA.md`. Bad entries are skipped with one console warning, never an error. Events use `{me}` rarely at runtime (capped per session) and `{friend}` resolves to an ambient member, so joins/leaves do not name your crew.
