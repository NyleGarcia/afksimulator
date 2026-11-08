# Ambient server flavor schema

Pure-flavor data that makes the fake Discord feel populated. It has no gameplay effect on its own. Two files ship with the game:

- `content/ambient.js` registers `window.AFK_CONTENT.ambient` (classic "the boys" server).
- `content/packs/<id>/ambient.js` registers `window.AFK_PACKS.<id>.ambient` (one per content pack, e.g. `bobernet`).

Both are classic scripts (no modules). Make up all names. No real people, handles, orgs or slurs. PG-13. Each string stays under 160 chars.

## Shape

```js
ambient = {
  roles:   [{ id, name, color, hoist, order }],
  members: [{ id, name, color, role, status, activity, tags, bio?, voice?, bot? }],
  channels:[{ id, name, icon, type, category, topic, isAfk:false, members, muted?, busyness, visibility }],
  chatter: { [channelId]: [{ who, text, weight? }] },
  botLines:{ leveler:[], welcome:[], music:[], afkTimer:[] },
  events:  [ 'string' ],
  topics:  { [channelId]: { topic, pinned: ['string', ...] } },
  serverRail: [{ id, name, abbr, color, unread, mention, blurb }],
  presenceShuffle: { onlineRate, statusWeights: { online, idle, dnd, offline } }
}
```

## Keys

| key | rules |
|---|---|
| `roles` | `id` unique. `hoist` true shows the role as its own member-list group. `order` ascending = higher in the list. `color` hex. |
| `members` | 45-60. `id` unique, lowercase-ish username style, must not collide with a character/resident id from the base content. `role` is a role id. `status` is `online`, `idle`, `dnd` or `offline`. `activity` is `''` or starts with `Playing `, `Listening to `, `Watching ` or `Streaming `. `tags` free strings (`lurker`, `alt`, `mod`, `one-channel`, ...). `bio` optional short text. `voice` optional voice channel id (must match that channel's `members`; offline members have none). `bot:true` marks bots. Mix in lurkers, an obvious alt, a one-channel poster, a legendary lurker, and bots (leveler, music, AFK timer, welcome). |
| `channels` | 14-20 extra channels ADDED to the base list. Ids are prefixed `x-` and must not collide with ids in `content/channels.js` or the pack's `data.js`. `type` is `text` or `voice`. `category` is a header label for grouping. `isAfk` is always `false` (the real AFK channel is in the base content). `members` lists member ids present (voice channels; `[]` for text). `busyness` and `visibility` are 0..1 like base channels. `muted` optional. |
| `chatter` | Ambient lines per text channel id, not addressed to the player. At least 10 channels, 25+ lines each. `who` is a member id or `'any'` (pick any non-bot member). `weight` default 1. Tokens: `{me}` (player handle) and `{friend}` (random other crew member), `{friend}` in at most 10% of a channel's lines. Never `{p}`, `{t}` or other slots. |
| `botLines` | `leveler`, `welcome`, `music`, `afkTimer`, 12+ lines each. Only the `{me}` token. `leveler` lines use a literal `{me}` ("{me} just reached level N!"). `afkTimer` lines tease the player for being idle and never use `{t}`. |
| `events` | 40+ short system-style messages (joins, leaves, boosts, gifts, pins, name changes, promotions). Tokens `{me}` / `{friend}` sparingly. |
| `topics` | `{ channelId: { topic, pinned } }` for 12+ channels. `pinned` has 2-3 funny pinned messages. Channel id must exist in `channels`. |
| `serverRail` | 7-9 other fake servers for the left rail. `abbr` is exactly 2 letters. `unread` 0..3. `mention` boolean. `blurb` is a funny hover/description line. |
| `presenceShuffle` | Defaults for random presence rotation so the member list feels alive. `onlineRate` 0..1 is the share of non-bot members shown not-offline. `statusWeights` are relative weights (need not sum to 1). |

## Token rules

Allowed in ambient strings: `{me}` and `{friend}` (chatter, events), `{me}` only (botLines). Names, topics, pins, activities and blurbs take no tokens. Any other `{slot}` is invalid.

## Validation

`check_ambient.js` (scratchpad) loads the files in a window shim and verifies unique ids, valid references (chatter `who`, voice members, roles, topics), status values, token use and the count minimums.
