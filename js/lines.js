'use strict';
/* AFK Simulator / js/lines.js: character lines, packs + bulk loading, line pipeline, brb/excuse derivation, org chatter.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- character lines + digs ----------
const stats = { digs: 0, src: { hand: 0, gen: 0, bulk: 0 }, first: { hand: 0, gen: 0, bulk: 0 } };
// a character's own lines for key k are used half the time when they have some, else the shared pool
const say = (f, k) => {
  // a chaotic crew member (wildcard) sometimes answers from any of its lines, whatever the mood
  if (f && f.wildcard && f.lines && Math.random() < 0.25) {
    const ks = Object.keys(f.lines).filter((x) => Array.isArray(f.lines[x]) && f.lines[x].length);
    if (ks.length) return pick(f.lines[pick(ks)]);
  }
  const own = f && f.lines && f.lines[k];
  if (Array.isArray(own) && own.length && Math.random() < 0.5) return pick(own);
  return lineOr(k, '...');
};
function digFor(f) {
  if (!f || !Array.isArray(f.digs) || !f.digs.length) return null;
  const P = S.path || PATHS[0];
  const late = S.promise > 0 ? S.mins / S.promise : 0;
  const ok = f.digs.filter((d) => {
    const w = d.when || {};
    if (w.afterKick) return false;
    if (S.sus < (w.susMin ?? 35) || S.sus > (w.susMax ?? 100)) return false;
    if (Array.isArray(w.paths) && !w.paths.includes(P.id)) return false;
    if (Array.isArray(w.modes) && !w.modes.includes(S.mode)) return false;
    if (late < (w.minLateRatio ?? 0)) return false;
    return true;
  });
  return ok.length ? pick(ok) : null;
}
// mid/high suspicion chatter: a matching dig 40% of the time (65% for a rival); packs may swap in a pvp jab; else the generic line
function digOrSay(f, tier) {
  const d = digFor(f);
  if (d && Math.random() < (typeof f.digRate === 'number' ? f.digRate : f.rival ? 0.65 : 0.4)) { stats.digs++; return d.text; }
  if (PK.id !== 'classic' && Math.random() < 0.2) { const j = jabLine(); if (j) return j; }
  return speak(f, tier);
}
function kickDig(f) {
  const ds = (f.digs || []).filter((d) => d.when && d.when.afterKick);
  if (ds.length && Math.random() < 0.6) { stats.digs++; return pick(ds).text; }
  return null;
}


// ---------- packs: active pack runtime, lazy bulk loading, line pipeline ----------
const PACKLIST = Array.isArray(R.packList) && R.packList.length ? R.packList : [{ id: 'classic', name: 'The Boys (classic)', server: { name: 'the boys', icon: 'TB' }, builtin: true }];
const metaOf = (id) => PACKLIST.find((p) => p.id === id);
const packReady = (id) => !!(R.packs && R.packs[id]);
let packId = 'classic';
let SERVER = { name: 'the boys', icon: 'TB' };
const PK = { id: 'classic', gen: null, pools: null, templates: null, orgs: [], bulk: null, tcache: {} };
const BULKS = Object.create(null); // pack id -> { state: 'loading' | 'ready' | 'failed', data, toasted, go }

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = src;
    sc.async = true;
    sc.onload = () => resolve();
    sc.onerror = () => reject(new Error('could not load ' + src));
    document.head.appendChild(sc);
  });
}
// runs fn once the page has finished loading and the browser is idle, so it never competes with first render
function whenIdle(fn) {
  const run = () => { if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 1500 }); else setTimeout(fn, 150); };
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true });
}
// lazy (heavy) pack files: queued for idle time after first paint, or loaded right now when `urgent`
function ensureBulk(rp, urgent) {
  let b = BULKS[rp.id];
  if (!b) {
    b = BULKS[rp.id] = { state: 'loading', data: null, toasted: false, started: false };
    b.go = () => {
      if (b.started) return;
      b.started = true;
      Promise.all(rp.lazy.map((f) => loadScript(rp.base + f))).then(() => {
        const raw = window.AFK_PACKS && window.AFK_PACKS[rp.id] && window.AFK_PACKS[rp.id].bulk;
        const data = typeof R.cleanBulk === 'function' ? R.cleanBulk(rp.id, raw) : {};
        b.data = data;
        b.state = Object.keys(data).length ? 'ready' : 'failed';
        if (b.state === 'ready' && packId === rp.id) PK.bulk = data;
        if (b.state === 'ready' && b.toasted && packId === rp.id) toast('dialog loaded', 'the full chatter is online');
      }).catch((err) => {
        b.state = 'failed';
        try { console.warn('[afk-content] [' + rp.id + '] lazy files failed (' + err.message + '); using the hand-written lines only'); } catch (e) { /* no console */ }
      });
    };
    whenIdle(b.go);
  }
  if (urgent) b.go();
  if (b.state === 'ready' && packId === rp.id) PK.bulk = b.data;
  return b;
}

// a pack whose core files are not in index.html: load them, then validate
function loadPackCore(meta) {
  const m = meta.manifest;
  if (!m) return Promise.reject(new Error('no manifest'));
  return Promise.all(m.files.map((f) => loadScript(m.base + f))).then(() => {
    if (!(typeof R.resolvePack === 'function' && R.resolvePack(meta.id))) throw new Error('pack data invalid');
  });
}

const PACK_ACH_RULES = {
  '30k': (r) => r.mins >= 500, // 30,000 seconds of game time = 8h20m
  insured: (r) => !!(r.cons && r.cons['insurance-claim-form']),
  'elevator-of-doom': (r) => !!r.elevator,
  'missed-the-org-fight': (r) => r.fightMissed > 0,
  'solo-idris': (r) => r.idrisJabs >= 3,
};
function buildAch(rp) {
  const out = { ...ACH_BASE };
  ((rp && rp.achievements) || []).forEach((a) => {
    if (out[a.id] || !PACK_ACH_RULES[a.id]) return;
    out[a.id] = { name: a.name, desc: a.desc || a.hint || '', test: PACK_ACH_RULES[a.id] };
  });
  return out;
}

function renderServer() {
  const h = $('#serverName');
  if (h) h.textContent = `${SERVER.name} ▾`;
  const i = $('#serverIcon');
  if (i) { i.textContent = SERVER.icon; i.title = SERVER.name; }
  document.documentElement.dataset.pack = packId;
}

// switch the whole content set: server name, channels, characters, residents, items, achievements, lines
function applyPack(id) {
  let meta = metaOf(id) || PACKLIST[0];
  let c = CONTENTS[meta.id];
  const rp = meta.builtin ? null : (R.packs && R.packs[meta.id]) || null;
  if (!c && rp) c = CONTENTS[meta.id] = mkContent(rp, CLASSIC, meta.id);
  if (!c) { meta = PACKLIST[0]; c = CLASSIC; }
  const pk = meta.builtin ? null : rp;
  packId = meta.id;
  useContent(c);
  SERVER = pk ? { name: pk.server.name, icon: pk.server.icon || firstCh(pk.server.name) } : { name: 'the boys', icon: 'TB' };
  PK.id = packId;
  PK.gen = pk && typeof pk.generate === 'function' ? pk.generate : null;
  PK.pools = pk ? pk.pools : null;
  PK.templates = pk ? pk.templates : null;
  PK.orgs = pk ? pk.parodyOrgs : [];
  PK.bulk = null;
  PK.tcache = {};
  recent.length = 0;
  genVals.clear();
  ACH = buildAch(pk);
  inv = loadInv();
  buildChannels();
  rebuildFriends();
  renderServer();
  nameGuard(); // a stored name that is a cast member of this pack falls back to the default
  if (pk && pk.lazy.length) ensureBulk(pk, false);
  return packId;
}

let packToken = 0;
let userPack = false; // the player picked a pack by hand: a late stored-pack load must not override it
// user-facing switch (settings + start screen). Persists, and starts a fresh run state.
function setPack(id, cb) {
  const meta = metaOf(id);
  if (!meta) { if (cb) cb(); return; }
  userPack = true;
  const token = ++packToken; // only the latest request may apply
  if (meta.id === packId) { if (cb) cb(); return; }
  const go = () => {
    if (token !== packToken) return;
    applyPack(meta.id);
    store.set('pack', packId);
    reset();
    render();
    if (cb) cb();
  };
  if (meta.builtin || packReady(meta.id)) { go(); return; }
  toast('Loading pack…', meta.name);
  loadPackCore(meta).then(go, () => { if (token === packToken) toast('Pack failed to load', meta.name); });
}

// ----- line pipeline -----
// For each mood/category a line comes from: hand-written 35%, generated from templates 35%, bulk 30%.
// A source that does not exist (no templates for the category, bulk not loaded yet) gives its share to the others.
// Character digs sit above this (see digOrSay). The last 60 lines are remembered so nothing repeats in a short window.
const recent = [];
const genVals = new Set();
const wOf = (e) => (e && typeof e.w === 'number' && e.w > 0 ? e.w : 1);
const pickW = (arr) => {
  let tot = 0;
  arr.forEach((e) => { tot += wOf(e); });
  let r = Math.random() * tot;
  for (const e of arr) { r -= wOf(e); if (r < 0) return e; }
  return arr[arr.length - 1];
};
const GEN_MAP = {
  orgFight: ['orgFight'],
  pvpJab: ['pvpJab'],
  missedFight: ['returnFight', 'leftOnRead'],
  welcomeBack: ['welcomeBack'],
  trade: ['cargoRun', 'claimTimer'],
  serverlore: ['misc', 'wen', 'crash30k', 'elevatorDoom'],
};
function tmplPool(cat) {
  const T = PK.templates;
  if (!T || typeof PK.gen !== 'function') return null;
  if (cat in PK.tcache) return PK.tcache[cat];
  const out = [];
  (GEN_MAP[cat] || []).forEach((k) => { if (Array.isArray(T[k])) out.push(...T[k]); });
  if (T.mood && Array.isArray(T.mood[cat])) out.push(...T.mood[cat]);
  PK.tcache[cat] = out.length ? out : null;
  return PK.tcache[cat];
}
const bulkPool = (cat) => (PK.bulk && Array.isArray(PK.bulk[cat]) && PK.bulk[cat].length ? PK.bulk[cat] : null);
// fill {place} {ship} ... slots with the pack generator (leaves {me} {p} {t} for meTok)
function genFill(tp) {
  const raw = typeof tp === 'string' ? tp : (tp && (tp.t || tp.text)) || '';
  if (typeof PK.gen !== 'function') return raw;
  if (genVals.size > 48) genVals.clear();
  try { return PK.gen(tp, PK.pools, Math.random, genVals); } catch (e) { return raw; }
}
// handFn: () => hand-written line, or null when this category has none. opts.peek = do not remember the result
function mixLine(cat, handFn, opts) {
  const classic = PK.id === 'classic';
  const tp = classic ? null : tmplPool(cat);
  const bp = classic ? null : bulkPool(cat);
  const wH = handFn ? 35 : 0;
  const wG = tp ? 35 : 0;
  const wB = bp ? 30 : 0;
  if (wH + wG + wB === 0) return null;
  let text = '';
  let src = 'hand';
  for (let i = 0; i < 12; i++) {
    // late attempts skip the (small) hand-written pool when other sources exist, so a repeat is only ever a last resort
    const h = i >= 5 && wG + wB ? 0 : wH;
    const r = Math.random() * (h + wG + wB);
    if (r < h) { src = 'hand'; text = handFn() || ''; }
    else if (r < h + wG) { src = 'gen'; text = genFill(pickW(tp)); }
    else { src = 'bulk'; text = pick(bp); }
    if (i === 0 && !(opts && opts.peek)) stats.first[src]++;
    if (text && !recent.includes(text)) break;
  }
  if (!text) return null;
  if (!(opts && opts.peek)) {
    stats.src[src]++;
    recent.push(text);
    while (recent.length > 60) recent.shift();
  }
  return text;
}
const handCat = (cat) => (Array.isArray(LINES[cat]) && LINES[cat].length ? () => pick(LINES[cat]) : null);
const speak = (f, cat) => fixN(mixLine(cat, () => say(f, cat))) || lineOr(cat, '...');
const speakCat = (cat, opts) => fixN(mixLine(cat, handCat(cat), opts));

// ----- brb / excuse derivation for bulk strings (plain text) -----
const BRB_WORDS = [
  [/\bhalf (an )?hour\b/, 30], [/\b(hours?|hrs?)\b/, 60], [/\bdinner\b/, 30], [/\blunch\b/, 25], [/\bbreakfast\b/, 20],
  [/\bshower\b/, 15], [/\b(nap|sleep)\b/, 30], [/\b(food|eat|eating|snack|pizza|sandwich|ramen)\b/, 10],
  [/\b(bathroom|toilet|restroom)\b/, 5], [/\b(coffee|drink|water|kettle)\b/, 4], [/\b(dog|trash|laundry|door)\b/, 6],
  [/\b(secs?|seconds?|moment|quick|minute)\b/, 1],
];
const stripMe = (t) => t.replace(/@?\{(?:me|friend(?::[^{}]*)?)\}[,:]?[ \t]*/g, '');
function deriveP(text) {
  let m;
  if ((m = /(\d{1,3})\s*(?:hours?|hrs?|h)\b/i.exec(text))) return clamp(+m[1] * 60, 1, 240);
  if ((m = /(\d{1,3})\s*(?:minutes?|mins?|m)\b/i.exec(text))) return clamp(+m[1], 1, 240);
  if ((m = /(\d{1,3})\s*(?:seconds?|secs?|s)\b/i.exec(text))) return clamp(Math.round(+m[1] / 60), 1, 240);
  if ((m = /(?:^|\s)(\d{1,3})(?![\w.%:/])/.exec(text)) && +m[1] >= 1) return clamp(+m[1], 1, 240);
  const low = text.toLowerCase();
  for (const [re, v] of BRB_WORDS) if (re.test(low)) return v;
  return Math.round(rand(2, 20));
}
// shorter promise = higher multiplier, 0.9 (an hour or more) .. 1.6 (a minute)
const multFor = (p) => Math.round(clamp(1.6 - 0.7 * Math.log(Math.max(1, p)) / Math.log(60), 0.9, 1.6) * 100) / 100;
function deriveBrb(raw) {
  const text0 = stripMe(String(raw));
  const p = Math.round(deriveP(text0));
  const t = tidy(text0.replace(/\{p\}|\{t\}/g, fmtMins(p)).replace(TOKEN_RE, ''), true) || 'brb';
  return { t, p, m: multFor(p) };
}
function deriveExcuse(raw) {
  const text0 = stripMe(String(raw));
  const t = tidy(text0.replace(/\{p\}/g, fmtMins(S.promise)).replace(/\{t\}/g, fmtMins(S.mins)).replace(TOKEN_RE, ''), true) || 'it was not my fault';
  const lo = Math.round(rand(-10, 22));
  const hi = Math.round(Math.min(45, lo + rand(12, 32)));
  return { t, r: [lo, hi], k: String(raw) };
}
// n distinct options: hand-written 35 : bulk 30 (all hand-written until bulk has loaded)
function pickOptions(hand, bulkCat, derive, n) {
  const out = [];
  const seen = new Set();
  const hp = shuffle(hand);
  let hi = 0;
  for (let g = 0; out.length < n && g < 60; g++) {
    const bp = PK.id !== 'classic' ? bulkPool(bulkCat) : null;
    let o;
    if (bp && (hi >= hp.length || Math.random() < 30 / 65)) o = derive(pick(bp));
    else if (hi < hp.length) o = hp[hi++];
    else break;
    if (seen.has(o.t)) continue;
    seen.add(o.t);
    out.push(o);
  }
  return out;
}

// ----- pack events while AFK: org-fight pings, rival orgs, jabs, ambient chatter -----
const IDRIS = /idris/i;
const ORG_EVENTS = ['{org} is camping {place}', 'heads up, {org} is rolling through {place}', '{org} just interdicted someone near {place}', '{org} was spotted at {place}, they brought a blob'];
const rivalOf = (org) => ({ name: org.name.slice(0, 24), color: '#c0392b' });
function orgText(org) {
  const t = org.lines.length && Math.random() < 0.5 ? pick(org.lines) : pick(ORG_EVENTS).replace('{org}', org.name);
  return genFill(t);
}
function orgFightPing() {
  if (S.phase !== 'afk' || S.kicked) return;
  const org = PK.orgs.length && Math.random() < 0.5 ? pick(PK.orgs) : null;
  let t = org ? orgText(org) : speakCat('orgFight');
  if (!t) return;
  if (!/@\{me\}/.test(t)) t = /\{me\}/.test(t) ? t.replace('{me}', '@{me}') : '@{me} ' + t;
  S.fightPings++;
  S.lastFight = S.mins;
  const cid = routeCh('pvp-ops');
  const n0 = S.pings.length;
  post(friendIn(cid), t, { ch: cid, weight: 0.8, fight: true }); // fight: the ping is tagged when the line lands (the speaker queue may delay it)
  S.pings.slice(n0).forEach((p) => { p.fight = true; });
  if (org && org.taunts.length && Math.random() < 0.35) {
    const rd = S.round;
    later(1100, () => { if (S.phase === 'afk' && S.round === rd) post(rivalOf(org), pick(org.taunts), { ch: cid }); });
  }
}
// a pvp jab aimed at the player; leans toward the Idris ones. 4th arg forces Idris (tests).
function jabLine(forceIdris) {
  if (PK.orgs.length && !forceIdris && Math.random() < 0.2) {
    const o = pick(PK.orgs);
    if (o.lines.length) return orgText(o);
  }
  let t = null;
  for (let i = 0; i < (forceIdris ? 40 : 4); i++) {
    t = speakCat('pvpJab', { peek: true });
    if (!t) break;
    if (IDRIS.test(t) && /\{me\}/.test(t)) break;
    if (!forceIdris && Math.random() < 0.5) break;
  }
  if (!t) return null;
  recent.push(t);
  while (recent.length > 60) recent.shift();
  if (IDRIS.test(t) && /\{me\}/.test(t)) {
    S.idrisJabs++;
    if (S.idrisJabs >= 3) unlockAch('solo-idris');
  }
  return t;
}
function packChatter(dm) {
  if (PK.id === 'classic') return;
  if (S.mins - S.lastFight > 6 && Math.random() < Math.min(1, 0.06 * dm)) orgFightPing();
  if (Math.random() < Math.min(1, 0.05 * dm)) {
    const trade = Math.random() < 0.5;
    const t = speakCat(trade ? 'trade' : 'serverlore');
    if (t) { const cid = routeCh(trade ? 'trade-routes' : null); post(friendIn(cid), t, { ch: cid }); }
  }
}
// on return (manual or dragged): left-on-read lines for unanswered org-fight pings, else sometimes a welcome back
function returnChatter() {
  if (PK.id === 'classic') return;
  // only fight pings still unanswered and unforgiven count as missed (triage answers clear the rest)
  const n = S.pings.filter((p) => p.fight && !p.answered && !p.forgiven).length;
  S.fightPings = 0;
  if (n > 0) {
    S.fightMissed++;
    unlockAch('missed-the-org-fight');
    later(600, () => { const t = speakCat('missedFight'); if (t) post(friend(), t); });
    if (Math.random() < 0.5) later(1300, () => { const t = speakCat('welcomeBack'); if (t) post(friend(), t); });
  } else if (Math.random() < 0.4) {
    later(600, () => { const t = speakCat('welcomeBack'); if (t) post(friend(), t); });
  }
}

window.AFK.modules.push('lines');
