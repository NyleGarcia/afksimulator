'use strict';
/* AFK Simulator / js/reactions.js: channel topics, view-only channels, emoji reactions. (docs: CONTENT.md "Channel topics, view-only channels and reactions")
 * Classic script: top-level names share the one script scope (ARCHITECTURE.md). Every name here starts with `rct`/`REACT`.
 * Loaded right after chat.js; chat.js calls the rct* functions at run time (post, msgNode, friendIn, weightedCh, ...).
 * Channel fields `topic`, `readOnly`, `posters` are not known to loader.js, so they are read from the raw content here
 * (AFK_CONTENT.channels / AFK_PACKS[id].data.channels) and validated here: warn + ignore, never throw.
 * Everything that reaches the DOM goes through textContent. */

const REACT = {
  set: [['👍', 'thumbs up'], ['😂', 'laughing'], ['💀', 'dead'], ['🔥', 'fire'], ['👀', 'eyes'], ['🧢', 'cap']],
  fit: 0.8, // suspicion removed by one fitting reaction to a friend's message
  cap: 2.4, // max suspicion reactions can remove in one round (3 fitting reactions)
  recent: 16, // topic lines are not repeated within this many picks
  netMs: 200, // an ambient token is only valid this long (real ms): the post must follow the pick immediately
};
const RCT_NEG = ['🧢', '💀', '👀']; // what sceptical friends send
const RCT_POS = ['👍', '😂', '🔥'];
const RCT_LOCK_MSG = 'You do not have permission to send messages in this channel.';
const RCT_PING_RE = /\{me\}|@everyone/;

// own PRNG: reactions and topic lines must not consume Math.random, tests pin that sequence for the excuse roll
let rctSeed = (Date.now() ^ 0x9e3779b9) >>> 0;
function rctRand() {
  rctSeed = (rctSeed + 0x6D2B79F5) | 0;
  let t = Math.imul(rctSeed ^ (rctSeed >>> 15), 1 | rctSeed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rctPick = (a) => a[Math.floor(rctRand() * a.length)];
function rctShuffle(a) {
  const o = a.slice();
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rctRand() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}

let rctSeq = 0;
let rctAmb = null; // { cid, at }: weightedCh/routeCh picked cid for an ambient line, the next post there is that line
let rctCache = null; // { pack, text, meta, pools }
const rctRecent = [];
const rctWarned = new Set();
let rctBank = { ch: null, round: -1, spent: 0 };
let rctPop = null; // { node, opener, m }
let rctReadTok = 0;

function rctWarn(msg) {
  if (rctWarned.has(msg)) return;
  rctWarned.add(msg);
  const full = '[content] ' + msg;
  try { console.warn(full); } catch (e) { /* no console */ }
  try { if (window.AFK_RESOLVED && Array.isArray(window.AFK_RESOLVED.warnings)) window.AFK_RESOLVED.warnings.push(full); } catch (e) { /* ignore */ }
}

// ---------- channel meta (readOnly / topic / posters) and topic pools: validated once per pack ----------
const rctIsId = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,31}$/i.test(v);
function rctLoad() {
  const pid = (typeof PK !== 'undefined' && PK && PK.id) || 'classic';
  if (rctCache && rctCache.pack === pid && rctCache.text === TEXT) return rctCache;
  const C = window.AFK_CONTENT || {};
  const P = (window.AFK_PACKS && pid !== 'classic' && window.AFK_PACKS[pid]) || null;
  const raw = {};
  (Array.isArray(C.channels) ? C.channels : []).forEach((e) => { if (e && typeof e.id === 'string') raw[e.id] = e; });
  const pk = P && P.data && Array.isArray(P.data.channels) ? P.data.channels : [];
  pk.forEach((e) => { if (e && typeof e.id === 'string') raw[e.id] = e; });
  // topic pools: classic uses dialog.TOPICS, a pack uses its own dialog.topics
  const src = pid === 'classic' ? (C.dialog && C.dialog.TOPICS) : (P && P.dialog && P.dialog.topics);
  const pools = {};
  if (src && typeof src === 'object') {
    Object.keys(src).forEach((k) => {
      if (!rctIsId(k)) { rctWarn(`topics "${k}": key must be letters/digits/-/_ (max 32); skipped`); return; }
      if (!Array.isArray(src[k])) { rctWarn(`topics "${k}": must be an array of lines; skipped`); return; }
      const good = [];
      src[k].forEach((t, i) => {
        if (typeof t !== 'string' || !t.trim() || t.length > 140) { rctWarn(`topics "${k}"[${i}]: must be text under 140 chars; skipped`); return; }
        const toks = t.match(/\{[^{}]*\}/g) || [];
        if (toks.some((x) => x !== '{me}')) { rctWarn(`topics "${k}"[${i}]: only the {me} token is allowed; skipped`); return; }
        good.push(t.trim());
      });
      if (good.length >= 3) pools[k] = good; else rctWarn(`topics "${k}": needs 3+ valid lines; pool ignored`);
    });
  } else if (src != null) rctWarn('topics: must be an object { channelOrTopicKey: [lines] }; ignored');
  const meta = {};
  TEXT.forEach((c) => {
    const e = raw[c.id] || {};
    const m = { readOnly: false, topic: null, posters: null };
    if (e.readOnly != null) {
      if (typeof e.readOnly !== 'boolean') rctWarn(`channel "${c.id}" readOnly: must be true or false; ignored`);
      else m.readOnly = e.readOnly;
    }
    if (e.topic != null) {
      if (!rctIsId(e.topic)) rctWarn(`channel "${c.id}" topic: must be a pool key (letters/digits/-/_); ignored`);
      else m.topic = e.topic;
    }
    if (m.topic && !pools[m.topic]) { rctWarn(`channel "${c.id}" topic: no pool "${m.topic}" in topics; using the channel id instead`); m.topic = null; }
    if (!m.topic && pools[c.id]) m.topic = c.id;
    if (e.posters != null) {
      if (!Array.isArray(e.posters) || !e.posters.every(rctIsId)) rctWarn(`channel "${c.id}" posters: must be an array of character ids; ignored`);
      else if (!m.readOnly) rctWarn(`channel "${c.id}" posters: only used with readOnly: true; ignored`);
      else m.posters = e.posters.slice(0, 8);
    }
    meta[c.id] = m;
  });
  Object.keys(raw).forEach((id) => {
    const e = raw[id];
    if (e.type === 'voice' && (e.readOnly != null || e.topic != null || e.posters != null)) rctWarn(`channel "${id}": readOnly/topic/posters only apply to text channels; ignored`);
  });
  rctCache = { pack: pid, text: TEXT, meta, pools };
  return rctCache;
}
const rctMeta = (c) => (c && rctLoad().meta[c.id]) || { readOnly: false, topic: null, posters: null };
const rctRO = (c) => !!rctMeta(c).readOnly;
const rctPool = (c) => { const t = rctMeta(c).topic; return t ? rctLoad().pools[t] || null : null; };

// the line a friend says in c. ping = true: a line that @mentions the player (or @everyone in a view-only channel)
function rctTopicLine(c, ping) {
  const pool = rctPool(c);
  if (!pool) return null;
  let list = pool.filter((t) => RCT_PING_RE.test(t) === ping);
  if (!list.length) list = pool;
  const fresh = list.filter((t) => !rctRecent.includes(t));
  const t = rctPick(fresh.length ? fresh : list);
  rctRecent.push(t);
  while (rctRecent.length > REACT.recent) rctRecent.shift();
  return t;
}
function rctMark(cid) { rctAmb = { cid, at: performance.now() }; }
function rctTake(cid) {
  const a = rctAmb;
  rctAmb = null;
  return !!a && a.cid === cid && performance.now() - a.at < REACT.netMs;
}

// digs (a friend's personal insult at the player) are the characters' voice, not channel chatter: they keep their text anywhere
const rctDigRe = new Map();
function rctIsDig(who, text) {
  if (!who || !Array.isArray(who.digs)) return false;
  return who.digs.some((d) => {
    if (!d || typeof d.text !== 'string') return false;
    let re = rctDigRe.get(d.text);
    if (!re) {
      re = new RegExp('^' + d.text.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^{}]*\}/g, '.*?') + '$');
      rctDigRe.set(d.text, re);
    }
    return re.test(text);
  });
}

// ---------- view-only channels ----------
function rctIsPoster(who, c) {
  if (!who) return false;
  if (who.role === 'bot') return true;
  const p = rctMeta(c).posters;
  return !!(p && p.includes(who.id));
}
function rctPoster(c) {
  const ids = rctMeta(c).posters;
  const pool = [];
  if (ids) ids.forEach((id) => {
    const f = S.friends.find((x) => x.id === id && !x.away) || (Array.isArray(BOTS) ? BOTS.find((x) => x.id === id) : null);
    if (f) pool.push(f);
  });
  if (!pool.length && Array.isArray(BOTS)) BOTS.forEach((b) => pool.push(b));
  return pool.length ? rctPick(pool) : { id: 'announcer', name: 'Announcer', color: '#5865f2', role: 'bot' };
}
// a post into a view-only channel by the player or a non-poster goes to the first channel they can write in
function rctGuard(who, id, opts) {
  const c = textById(id);
  if (!c || !rctRO(c) || opts.system) return id;
  if (who !== ME && rctIsPoster(who, c)) return id;
  const w = TEXT.find((x) => !rctRO(x));
  return w ? w.id : id;
}
const rctMentions = (c, text) => mentionRe().test(text) || (rctRO(c) && /@everyone/i.test(text));

function rctComposer() {
  const wrap = document.querySelector('.composer');
  const t = $('#composerText');
  if (!wrap || !t || !S.ch) return;
  const lock = !S.kicked && S.phase !== 'afk' && rctRO(activeCh());
  wrap.classList.toggle('locked', lock);
  if (lock) {
    wrap.dataset.rctLock = '1';
    if (t.textContent !== RCT_LOCK_MSG) t.textContent = RCT_LOCK_MSG;
  } else if (wrap.dataset.rctLock === '1') {
    delete wrap.dataset.rctLock;
    if (t.textContent === RCT_LOCK_MSG && !S.kicked) t.textContent = composerNow();
  }
}

// acknowledge an announcement: clears the owed pings of that channel (reading it or clicking the button)
function rctAck(cid, why) {
  if (!S.ch || !S.ch[cid] || S.kicked) return false;
  const mine = owedPings().filter((p) => p.ch === cid);
  if (!mine.length) return false;
  const tri = S.tri;
  const late = tri ? clamp((performance.now() - tri.t0) / tri.total, 0, 1) : 0;
  mine.forEach((p) => { p.answered = true; p.late = late; });
  if (tri) tri.refund = Math.min(6, tri.refund + clamp(rand(2, 5), 0, 8));
  const c = textById(cid);
  announce(`${labelOf(c)} acknowledged${why === 'read' ? ' (read)' : ''}: ping cleared`);
  chanDirty = true;
  renderChannelList();
  rctRefreshAll();
  if (S.phase === 'triage' && tri) {
    if (!owedPings().length) finishTriage();
    else { tri.list = true; setCtx(buildTriage); }
  }
  return true;
}
// reading counts: staying in a view-only channel while it has owed pings during triage acknowledges it
function rctWatchRead(id) {
  const tok = ++rctReadTok;
  const c = textById(id);
  if (!c || !rctRO(c) || S.phase !== 'triage') return;
  later(2500, () => {
    if (tok !== rctReadTok || S.active !== id || S.phase !== 'triage' || !S.tri) return;
    rctAck(id, 'read');
  });
}

// ---------- reactions: state ----------
function rctEntry(m, e) { return (m.rct || (m.rct = [])).find((x) => x.e === e); }
function rctAddTo(m, e, name, isMe) {
  let en = rctEntry(m, e);
  if (!en) { en = { e, n: 0, me: false, by: [] }; m.rct.push(en); }
  if (isMe) { if (en.me) return false; en.me = true; } else if (en.by.includes(name)) return false;
  en.n++;
  if (!isMe) en.by.push(name); // the player is the `me` marker, never a stored name (a rename must not leave a stale one)
  return true;
}
// names shown for an entry: the player's CURRENT name first (from the me marker), then the friends
const rctNames = (en) => (en.me ? [ME.name] : []).concat(en.by);
function rctRemoveMe(m, e) {
  const en = rctEntry(m, e);
  if (!en || !en.me) return;
  en.me = false;
  en.n = Math.max(0, en.n - 1);
  if (en.n <= 0) m.rct = m.rct.filter((x) => x !== en);
}

// category of a message (what a reaction would have to match to "fit")
const RCT_CATS = [
  [/lol|lmao|haha|meme|clip|funny|joke|💀|😂|fail|whiff|crash|elevator|banana|ratio|mishap|bug/i, ['😂', '💀']],
  [/nice|gorgeous|clean|render|paint|screenshot|hull|photo|record|win|congrat|great|love|best|good|thanks|gg|slaps|unreal|beautiful|shot|art|livery|sunrise/i, ['🔥', '👍']],
  [/@|where|rally|forming|fight|attend|mandatory|acknowledge|meeting|reminder|rules|read|org|vote|poll|event|plan/i, ['👍', '👀']],
  [/price|rumor|promise|trust me|totally|source|definitely|swear|profit|margin|route/i, ['🧢', '👀']],
];
function rctFits(e, text) {
  const hit = RCT_CATS.find((c) => c[0].test(text));
  return hit ? hit[1].includes(e) : e === '👍' || e === '👀';
}
function rctFlavorEmoji(text) {
  const hit = RCT_CATS.find((c) => c[0].test(text));
  return rctPick(hit ? hit[1] : ['👍', '😂', '👀']);
}
// how much the friends doubt the player right now: 0 = trusting, 1 = they have screenshots
function rctSkeptic(text) {
  const used = (S.uses && S.uses[text]) || 0;
  return clamp((S.sus || 0) / Math.max(1, kickAt()) * 1.2 + 0.18 * used, 0, 1);
}
// what a friend sends on the player's own message
function rctPlayerEmoji(sk) {
  return rctRand() < sk * 0.9 ? rctPick(RCT_NEG) : rctPick(RCT_POS);
}

// player reaction -> small, capped suspicion relief
function rctBankNow() {
  if (rctBank.ch !== S.ch || rctBank.round !== S.round) rctBank = { ch: S.ch, round: S.round, spent: 0 };
  return rctBank;
}
const rctCan = () => !S.kicked && S.ch && ['chat', 'triage', 'excuse', 'intro'].includes(S.phase);
function rctReward(m, e) {
  if (m.who === ME || m.rctPaid || !rctFits(e, m.text)) return 0;
  const b = rctBankNow();
  const amt = Math.min(REACT.fit, REACT.cap - b.spent, S.sus);
  m.rctPaid = true;
  if (amt <= 0) return 0;
  b.spent += amt;
  S.sus -= amt;
  announce(`Fitting reaction: suspicion down ${amt.toFixed(1)}%`);
  return amt;
}
function rctToggle(m, e) {
  if (!rctCan()) return;
  const en = rctEntry(m, e);
  if (en && en.me) rctRemoveMe(m, e);
  else {
    rctAddTo(m, e, ME.name, true);
    const got = rctReward(m, e);
    if (got > 0) m.rctFit = true;
    sfx.msg && sfx.msg();
  }
  rctRefresh(m);
}

// friends react
function rctFriendReact(m, f, e) {
  if (!S.ch || !m.ch || !S.ch[m.ch] || !S.ch[m.ch].msgs.includes(m)) return;
  if (rctAddTo(m, e, f.name, false)) rctRefresh(m);
}
function rctReactors(c, not) {
  const ok = (f) => !f.away && f.name !== not;
  const here = S.friends.filter((f) => ok(f) && c.members.includes(f.id));
  return rctShuffle(here.length >= 2 ? here : S.friends.filter(ok));
}
function rctAfterPost(m, cid, opts) {
  if (m.sys || !S.friends || !S.friends.length || catchingUp) return;
  const c = textById(cid);
  if (!c) return;
  if (m.who === ME) {
    const kind = S.phase === 'leaving' ? 'brb' : S.phase === 'judging' ? 'excuse' : 'chat';
    let n = kind === 'chat' ? (rctRand() < 0.45 ? 1 : 0) : 1 + (rctRand() < 0.6 ? 1 : 0) + (rctRand() < 0.3 ? 1 : 0);
    rctReactors(c).slice(0, n).forEach((f, i) => {
      later(500 + 650 * i + rctRand() * 500, () => {
        const sk = kind === 'chat' ? clamp((S.sus || 0) / Math.max(1, kickAt()), 0, 1) * 0.5 : rctSkeptic(m.text);
        rctFriendReact(m, f, rctPlayerEmoji(sk));
      });
    });
    return;
  }
  if (opts.system || rctRand() > (rctRO(c) ? 0.55 : 0.3)) return;
  const rs = rctReactors(c, m.who.name);
  const f = rs[0];
  if (!f) return;
  later(900 + rctRand() * 1700, () => rctFriendReact(m, f, rctRO(c) ? rctPick(['👍', '👍', '👀']) : rctFlavorEmoji(m.text)));
  if (rs[1] && rctRand() < 0.3) later(1800 + rctRand() * 1800, () => rctFriendReact(m, rs[1], rctFlavorEmoji(m.text)));
}

// ---------- reactions: DOM ----------
function rctChipLabel(en) {
  const all = rctNames(en);
  const names = all.slice(0, 4).join(', ') + (all.length > 4 ? ` +${all.length - 4}` : '');
  const nm = (REACT.set.find((x) => x[0] === en.e) || [0, 'reaction'])[1];
  return `${nm} x${en.n}: ${names}. ${en.me ? 'Press to remove yours' : 'Press to add yours'}`;
}
function rctPaintBar(bar, m) {
  bar.textContent = '';
  const list = Array.isArray(m.rct) ? m.rct : [];
  bar.hidden = list.length === 0 && !m.rctAck;
  list.forEach((en) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rct-chip' + (en.me ? ' mine' : '') + (en.me && m.rctFit ? ' fit' : '');
    b.dataset.e = en.e;
    b.setAttribute('aria-pressed', String(en.me));
    b.setAttribute('aria-label', rctChipLabel(en));
    b.title = rctNames(en).join(', ');
    b.tabIndex = -1;
    const em = document.createElement('span');
    em.textContent = en.e;
    const n = document.createElement('span');
    n.className = 'rct-n';
    n.textContent = String(en.n);
    b.append(em, n);
    b.addEventListener('click', (ev) => { ev.stopPropagation(); rctToggle(m, en.e); });
    bar.appendChild(b);
  });
}
function rctRefresh(m) {
  const box = $('#messages');
  if (!box) return;
  const node = box.querySelector(`[data-mid="${m.id}"]`);
  const bar = node && node.querySelector('.rct-bar');
  if (bar) rctPaintBar(bar, m);
}
// repaint ack buttons / bars after pings change
function rctRefreshAll() {
  const st = S.ch && S.ch[S.active];
  if (!st) return;
  $('#messages').querySelectorAll('.msg[data-mid]').forEach((node) => {
    const m = st.msgs.find((x) => String(x.id) === node.dataset.mid);
    if (m) rctSyncAck(node, m);
  });
}
function rctSyncAck(node, m) {
  const btn = node.querySelector('.rct-ack');
  if (!btn) return;
  const owed = owedPings().some((p) => p.ch === m.ch);
  btn.disabled = !owed;
  btn.textContent = owed ? '✅ Acknowledge' : '✅ Acknowledged';
}

function rctClosePop(refocus) {
  if (!rctPop) return;
  const { node, opener } = rctPop;
  rctPop = null;
  node.remove();
  if (opener) { opener.setAttribute('aria-expanded', 'false'); if (refocus) opener.focus({ preventScroll: true }); }
}
// keep the picker next to its button (the list scrolls as messages arrive); close it if the button is gone
function rctPlace() {
  if (!rctPop) return;
  const { node, opener } = rctPop;
  if (!opener.isConnected) { rctClosePop(false); return; }
  const r = opener.getBoundingClientRect();
  const w = node.offsetWidth;
  const h = node.offsetHeight;
  node.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
  node.style.top = (r.bottom + h + 8 > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
}
function rctOpenPop(m, opener) {
  if (!rctCan()) return;
  rctClosePop(false);
  const pop = document.createElement('div');
  pop.className = 'rct-pop';
  pop.setAttribute('role', 'menu');
  pop.setAttribute('aria-label', `React to ${m.who.name}'s message`);
  REACT.set.forEach(([e, nm]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rct-opt';
    b.setAttribute('role', 'menuitemcheckbox');
    const en = rctEntry(m, e);
    b.setAttribute('aria-checked', String(!!(en && en.me)));
    b.setAttribute('aria-label', nm);
    b.title = nm;
    b.tabIndex = -1;
    b.textContent = e;
    b.addEventListener('click', (ev) => { ev.stopPropagation(); rctToggle(m, e); rctClosePop(true); });
    pop.appendChild(b);
  });
  document.body.appendChild(pop);
  opener.setAttribute('aria-expanded', 'true');
  rctPop = { node: pop, opener, m };
  rctPlace();
  pop.querySelector('.rct-opt').focus({ preventScroll: true });
}
function rctPopKey(e) {
  if (!rctPop) return;
  const opts = Array.from(rctPop.node.querySelectorAll('.rct-opt'));
  let i = opts.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); rctClosePop(true); return; }
  if (e.key === 'Tab') { rctClosePop(false); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % opts.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i - 1 + opts.length) % opts.length;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = opts.length - 1;
  else if (/^[1-6]$/.test(e.key)) i = Number(e.key) - 1;
  else return;
  e.preventDefault();
  e.stopPropagation();
  opts[i].focus({ preventScroll: true });
}

// called by msgNode for every non-system message
function rctDecorate(box, head, body, m) {
  if (!m.id) m.id = ++rctSeq;
  box.dataset.mid = String(m.id);
  box.tabIndex = -1;
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'rct-add';
  add.tabIndex = -1;
  add.textContent = '🙂';
  add.title = 'Add reaction';
  add.setAttribute('aria-label', `Add reaction to ${m.who.name}'s message`);
  add.setAttribute('aria-haspopup', 'menu');
  add.setAttribute('aria-expanded', 'false');
  add.addEventListener('click', (ev) => { ev.stopPropagation(); if (rctPop && rctPop.m === m) rctClosePop(true); else rctOpenPop(m, add); });
  head.appendChild(add);
  const cid = m.ch;
  const c = cid && textById(cid);
  const wantsAck = !!(c && rctRO(c) && m.mention && m.who !== ME);
  m.rctAck = wantsAck;
  if (wantsAck) {
    const a = document.createElement('button');
    a.type = 'button';
    a.className = 'rct-ack';
    a.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!rctAck(cid, 'click') && !(rctEntry(m, '👍') || {}).me) rctToggle(m, '👍');
    });
    body.appendChild(a);
    rctSyncAck(box, m);
  }
  const bar = document.createElement('div');
  bar.className = 'rct-bar';
  body.appendChild(bar);
  rctPaintBar(bar, m);
}

// keyboard: focus the message list, Up/Down move between messages, R / Enter opens the reaction picker
function rctListKey(e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (rctPop) return;
  const t = e.target;
  const list = $('#messages');
  if (!list || !(t === list || (t.classList && t.classList.contains('msg')))) return;
  const msgs = Array.from(list.querySelectorAll('.msg[data-mid]'));
  if (!msgs.length) return;
  const cur = t === list ? -1 : msgs.indexOf(t);
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const i = cur < 0 ? msgs.length - 1 : clamp(cur + (e.key === 'ArrowDown' ? 1 : -1), 0, msgs.length - 1);
    e.preventDefault();
    e.stopPropagation();
    msgs[i].focus({ preventScroll: false });
  } else if ((e.key === 'r' || e.key === 'R' || e.key === 'Enter') && cur >= 0) {
    const add = msgs[cur].querySelector('.rct-add');
    if (add && rctCan()) { e.preventDefault(); e.stopPropagation(); add.click(); }
  }
}
// the popover must not outlive its moment: a modal opened, or reacting no longer allowed (AFK, kicked, leaving...)
function rctGuardPop() {
  if (!rctPop) return;
  const modal = $('#modal');
  if (!rctCan() || (modal && !modal.hidden)) rctClosePop(false);
}
function rctInit() {
  const list = $('#messages');
  const modal = $('#modal');
  if (modal && window.MutationObserver) new MutationObserver(rctGuardPop).observe(modal, { attributes: true, attributeFilter: ['hidden', 'class'] });
  setInterval(rctGuardPop, 300);
  if (list) list.addEventListener('keydown', rctListKey);
  document.addEventListener('keydown', rctPopKey, true);
  document.addEventListener('click', (e) => { if (rctPop && !rctPop.node.contains(e.target) && e.target !== rctPop.opener) rctClosePop(false); });
  window.addEventListener('resize', () => rctClosePop(false));
  if (list) list.addEventListener('scroll', rctPlace, { passive: true });
  const t = $('#composerText');
  if (t && window.MutationObserver) new MutationObserver(rctComposer).observe(t, { childList: true, characterData: true, subtree: true });
}
rctInit();

window.AFK.modules.push('reactions');
