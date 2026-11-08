'use strict';
/* AFK Simulator / js/core.js: shared foundation: utils, store, content sets, crew, paths, state S, items/mods/charges.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */
window.AFK = window.AFK || { modules: [] };

// ---------- utils ----------
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmtN = (n) => Math.round(n).toLocaleString('en-US');
const fmtMins = (m) => {
  m = Math.floor(m);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};
const fmtClock = (c) => {
  const day = Math.floor(c / 1440);
  const mins = Math.floor(c % 1440);
  let h = Math.floor(mins / 60);
  const mm = String(mins % 60).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const d = day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : `Day ${day + 1}`;
  return `${d} at ${h}:${mm} ${ap}`;
};

const mem = new Map();
const store = {
  get(k, d) {
    if (mem.has(k)) return mem.get(k);
    try {
      const v = localStorage.getItem('afksim.' + k);
      return v == null ? d : JSON.parse(v);
    } catch { return d; }
  },
  set(k, v) {
    mem.set(k, v);
    try { localStorage.setItem('afksim.' + k, JSON.stringify(v)); } catch { /* storage blocked */ }
  },
};

// ---------- content ----------
const DEFAULT_NAME = 'comanderson';
const ME = { name: DEFAULT_NAME, color: '#f5c542' };
const sanitizeName = (v) => {
  const n = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f@{}\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  const n2 = Array.from(n).slice(0, 16).join('').trim();
  return n2 || DEFAULT_NAME;
};
ME.name = sanitizeName(store.get('name', DEFAULT_NAME));
// content is validated by loader.js (window.AFK_RESOLVED); anything missing falls back to the built-ins below
const R = window.AFK_RESOLVED || {};
const DEBUG = /[?&]debug=1(&|$)/.test(location.search);
const THEMES = Array.isArray(R.themes) && R.themes.length ? R.themes : [
  { id: 'discord-dark', name: 'Discord Dark' },
  { id: 'amoled', name: 'AMOLED' },
  { id: 'light', name: 'Light' },
  { id: 'synthwave', name: 'Synthwave' },
  { id: 'terminal', name: 'Terminal' },
];
const applyTheme = (id) => {
  if (!THEMES.some((t) => t.id === id)) id = THEMES[0].id;
  document.documentElement.dataset.theme = id;
  return id;
};
let theme = applyTheme(store.get('theme', THEMES[0].id));
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const firstCh = (n) => (Array.from(String(n))[0] || '?').toUpperCase();
// single-pass token substitution: {me} {p} {t} are filled once (replaced text is never re-scanned) and any other
// {slot} that is still left over is stripped, so a raw token is never shown
const TOKEN_RE = /\{[A-Za-z_]\w*(?::[^{}]*)?\}/g;
const tidy = (s, stripped) => {
  let o = s.replace(/\bthe\s+the\b/gi, 'the').replace(/[ \t]{2,}/g, ' ');
  if (stripped) o = o.replace(/[ \t]+([.,!?;:])/g, '$1');
  return o.trim();
};
// {friend} = a random OTHER friend (never the speaker); {friend:text} is the fallback when nobody else is around
const FRIEND_TOK = /^\{friend(?::([^{}]*))?\}$/;
const meTok = (s, speaker) => {
  let stripped = false;
  let fName = null;
  let fDone = false;
  const o = String(s).replace(TOKEN_RE, (m) => {
    if (m === '{me}') return ME.name;
    if (m === '{p}') return fmtMins(S.promise);
    if (m === '{t}') return fmtMins(S.mins);
    const fm = FRIEND_TOK.exec(m);
    if (fm) {
      if (!fDone) {
        fDone = true; // every {friend} in one line is the same person
        fName = window.AFK_ROSTER ? window.AFK_ROSTER.pickOtherFriend(S.friends, speaker && speaker !== ME ? speaker : null, Math.random) : null;
      }
      if (fName) return fName;
      const fb = fm[1] != null ? fm[1].trim() : '';
      return fb || 'someone';
    }
    stripped = true;
    return '';
  });
  return tidy(o, stripped);
};
const escMd = (x) => String(x).replace(/[\\*_~`|>[\]()#-]/g, '\\$&');
const mentionRe = () => new RegExp('(@' + escRe(ME.name) + ')', 'i');
// ---------- content sets: the classic server (content/*) and packs (content/packs/*) ----------
const DEFAULT_FRIENDS = [
  { id: 'brody', name: 'Brody', color: '#e67e22' },
  { id: 'kev', name: 'kev', color: '#4aa3df' },
  { id: 'moistturtle', name: 'MoistTurtle', color: '#2ecc71' },
  { id: 'dani', name: 'dani', color: '#e84393' },
  { id: 'xxsniperxx', name: 'xXSniperXx', color: '#a77bd6' },
].map((c) => ({ ...c, role: 'friend', tags: [], rival: false, lines: {}, digs: [] }));

// channels: first text channel = chat, first non-afk voice = start channel, first isAfk voice = afk channel
// text channels also carry chat gameplay fields (see CONTENT.md "Channels"); missing ones get these defaults
const TEXT_DEF = { visibility: 0.5, busyness: 0.5, muted: false, muteDelay: [4, 12], slowmodeSec: 0, replies: null };
const mkChan = (o) => ({ icon: o.type === 'text' ? '#' : '🔊', isAfk: false, members: [], mods: {}, desc: '', ...(o.type === 'text' ? TEXT_DEF : {}), ...o });
const chanLabel = (c) => `${c.icon} ${c.name}`;
const labelOf = (c) => (c.icon === '#' ? '#' + c.name : chanLabel(c));
const chatLabel = () => labelOf(activeCh());
const composerIdle = () => `Message ${chatLabel()}`;
const curVc = () => VOICE.find((c) => c.id === S.chan) || VOICE[0];
const sideText = () => (TEXT[1] || TEXT[0]);

// p = promised minutes, m = points multiplier
const BASE_BRB = [
  { t: 'brb', p: 5, m: 1.0 },
  { t: 'brb 2 min', p: 2, m: 1.35 },
  { t: 'one sec', p: 1, m: 1.5 },
  { t: 'brb 5', p: 5, m: 1.1 },
  { t: 'brb bathroom', p: 4, m: 1.15 },
  { t: 'brb grabbing a drink', p: 3, m: 1.2 },
  { t: 'brb mom is calling me', p: 10, m: 1.0 },
  { t: 'gotta eat dinner brb', p: 30, m: 0.9 },
  { t: 'brb gotta take the dog out', p: 15, m: 0.95 },
  { t: '2 sec', p: 1, m: 1.6 },
  { t: 'brb pizza is here', p: 5, m: 1.1 },
  { t: 'hold on', p: 2, m: 1.4 },
  { t: 'brb gonna restart my pc', p: 3, m: 1.25 },
];

// r = suspicion removed [min, max]
const QUIET = { t: 'back', r: [2, 8], quiet: true };
const BASE_EXCUSES = [
  { t: 'sorry my internet died', r: [15, 35] },
  { t: 'my mom needed help with groceries', r: [15, 30] },
  { t: 'fell asleep lol', r: [5, 40] },
  { t: 'dog ate my headset', r: [0, 45] },
  { t: 'sorry had to take a call', r: [15, 30] },
  { t: 'bro windows decided to update', r: [20, 40] },
  { t: 'power went out', r: [20, 35] },
  { t: 'i was here the whole time??', r: [-15, 50] },
  { t: 'pizza guy got lost', r: [10, 30] },
  { t: 'my cat unplugged my pc', r: [10, 40] },
  { t: 'had to fight a raccoon', r: [-10, 45] },
  { t: 'my little brother took my pc', r: [15, 35] },
  { t: 'i was in the shower (4 hours)', r: [5, 35] },
  { t: 'my discord crashed (it did not)', r: [0, 40] },
  { t: 'bro i was literally touching grass', r: [10, 30] },
];

const BASE_LINES = {
  ask: ['yo @{me} u ready?', 'we queueing in 1', '@{me} hop in vc', 'ok last game for real', 'everyone ready?', '@{me} you on point this round', 'aight lets go'],
  ok: ['k', 'ok hurry', 'np', 'fast pls', 'kk', 'ok', 'sure'],
  chill: ['ok', 'lol', 'np take ur time', 'anyone wanna 1v1 while we wait', "i'm getting snacks then", 'ye'],
  low: ['@{me}?', 'he said {p}', "it's been {t}", "where'd he go", '{me}??', 'yo is he back'],
  mid: ['@{me} bro', "it's been {t}. he said {p}", "he's gone again isn't he", '@{me} you alive?', 'classic {me}', 'should we just start without him', 'lmaooo every time'],
  high: ['@{me}', '@{me} @{me} @{me}', 'BRO', "he's asleep 100%", 'imma kick him fr', '{t}. {t}!!!', 'last warning @{me}', 'he is NOT coming back'],
  good: ['ah ok', 'fair enough', 'lmao ok', 'np', 'wb', 'welcome back king'],
  meh: ['sure...', 'uh huh', 'ok buddy', 'every time bro', 'mhm'],
  bad: ['CAP', 'nobody believes you', 'u were asleep', 'bro.', 'this is the 4th time today'],
  reused: ['you said that last time', 'same excuse as before lmao', 'bro has 1 excuse'],
  early: ['wait you actually came back??', 'who are you', 'huh. ok'],
  kickAfter: ['finally', 'anyway', 'who wants to play', 'rip bozo'],
};
const BASE = {
  friends: DEFAULT_FRIENDS,
  TEXT: [mkChan({ id: 'general', name: 'general', type: 'text' }), mkChan({ id: 'memes', name: 'memes', type: 'text' }), mkChan({ id: 'clips', name: 'clips', type: 'text' })],
  VOICE: [mkChan({ id: 'squad-vc', name: 'squad vc', type: 'voice' })],
  AFK_CH: mkChan({ id: 'afk', name: 'afk', type: 'voice', isAfk: true }),
  items: [], BRB: BASE_BRB, EXCUSES: BASE_EXCUSES, LINES: BASE_LINES, residents: [], bots: [],
};

// src = validated content (R for classic, R.packs[id] for a pack); anything missing falls back to fb
function mkContent(src, fb, owner) {
  const chars = Array.isArray(src.characters) ? src.characters : [];
  const friends = chars.filter((c) => c.role === 'friend');
  const chans = Array.isArray(src.channels) ? src.channels : [];
  const text = chans.filter((c) => c.type === 'text');
  const voice = chans.filter((c) => c.type === 'voice' && !c.isAfk);
  const D = src.dialog || {};
  const lines = { ...fb.LINES };
  if (D.LINES && typeof D.LINES === 'object') Object.keys(D.LINES).forEach((k) => { if (Array.isArray(D.LINES[k]) && D.LINES[k].length) lines[k] = D.LINES[k]; });
  const ownItems = Array.isArray(src.items) && src.items.length;
  return {
    friends: friends.length ? friends : fb.friends,
    residents: chars.filter((c) => c.role === 'resident'),
    bots: chars.filter((c) => c.role === 'bot'),
    TEXT: text.length ? text.map((c) => ({ ...TEXT_DEF, ...c })) : fb.TEXT,
    VOICE: voice.length ? voice : fb.VOICE,
    AFK_CH: chans.find((c) => c.type === 'voice' && c.isAfk) || fb.AFK_CH,
    items: ownItems ? src.items : fb.items,
    itemsOwner: ownItems ? owner : fb.itemsOwner || 'classic',
    BRB: Array.isArray(D.BRB) && D.BRB.length >= 3 ? D.BRB : fb.BRB,
    EXCUSES: Array.isArray(D.EXCUSES) && D.EXCUSES.length >= 3 ? D.EXCUSES : fb.EXCUSES,
    LINES: lines,
  };
}
const CLASSIC = mkContent(R, BASE, 'classic');
const CONTENTS = { classic: CLASSIC };

// the active content set (swapped by applyPack)
let FRIENDS, RESIDENTS, BOTS, TEXT, VOICE, VOICE_BASE, AFK_CH, ITEMS, BRB, EXCUSES, LINES, INV_KEY;
function useContent(c) {
  FRIENDS = c.friends; RESIDENTS = c.residents; BOTS = c.bots;
  TEXT = c.TEXT; VOICE = VOICE_BASE = c.VOICE; AFK_CH = c.AFK_CH;
  ITEMS = c.items; BRB = c.BRB; EXCUSES = c.EXCUSES; LINES = c.LINES;
  INV_KEY = c.itemsOwner === 'classic' ? 'inv' : 'inv-' + c.itemsOwner;
}
useContent(CLASSIC);
// ---------- your crew (roster.js): player-chosen names replace the server's friends by slot ----------
let FRIENDS_ACTIVE = [];
let CREW_NAMES = [];
let nameFix = null; // original friend name -> crew name, for raw content lines (set while a crew is active)
const fixN = (t) => (nameFix && typeof t === 'string' ? nameFix(t) : t);
const loadRoster = () => {
  const A = window.AFK_ROSTER;
  if (!A) return { v: 1, on: false, crew: [] };
  A.setReserved(BUILTIN_NAMES);
  return A.load(store.get('roster', null), ME.name);
};
function rebuildFriends() {
  const A = window.AFK_ROSTER;
  if (!A) { FRIENDS_ACTIVE = FRIENDS; VOICE = VOICE_BASE; CREW_NAMES = []; nameFix = null; return; }
  const rc = R.roster || {};
  const res = A.applyRoster(FRIENDS, VOICE_BASE, loadRoster(), { traits: rc.traits, palette: rc.palette, meName: ME.name, meColor: ME.color });
  FRIENDS_ACTIVE = res.friends;
  VOICE = res.voice;
  CREW_NAMES = res.active ? res.crew : [];
  nameFix = res.active ? A.nameFixer(res.names) : null;
}
// every name a player may not take: the whole cast (also friends the roster leaves inactive), crew, bots, the resident, built-ins.
// One helper for settings.js nameTaken, the load-time check below, setReserved and ambient.js.
const BUILTIN_NAMES = ['Dave', 'Janitor-Bot', 'AFK-Bot'];
function reservedNames() {
  const set = new Set(BUILTIN_NAMES.map((n) => n.toLowerCase()));
  const add = (x) => { const n = x && typeof x === 'object' ? x.name : x; if (typeof n === 'string' && n) set.add(n.toLowerCase()); };
  [FRIENDS, FRIENDS_ACTIVE, CREW_NAMES, BOTS, RESIDENTS, typeof S === 'object' && S ? S.friends : null, typeof S === 'object' && S ? S.crewNames : null].forEach((l) => { if (Array.isArray(l)) l.forEach(add); });
  if (typeof S === 'object' && S) add(S.resident);
  return set;
}
// a stored name that collides with the cast (or came from an older build) falls back to the default
function nameGuard() {
  if (ME.name !== DEFAULT_NAME && reservedNames().has(ME.name.toLowerCase())) { ME.name = DEFAULT_NAME; store.set('name', DEFAULT_NAME); }
}
const lineOr = (k, d) => (Array.isArray(LINES[k]) && LINES[k].length ? fixN(pick(LINES[k])) : d);

// ---------- paths (paths.js) ----------
const FALLBACK_PATH = { id: 'walk-away', name: 'walk away', desc: 'classic. close the lid, leave the room', risk: 'the classic', pointMult: 1, susMult: 1, events: [] };
let PATHS = [FALLBACK_PATH];
let PEVENTS = {};
let PLINES = {};
if (Array.isArray(R.paths) && R.paths.length) PATHS = R.paths.map((x) => ({ ...x, events: Array.isArray(x.events) ? x.events : [] }));
if (R.pathEvents && typeof R.pathEvents === 'object') PEVENTS = R.pathEvents;
if (R.pathLines && typeof R.pathLines === 'object') PLINES = R.pathLines;
const pLine = (k, d) => (Array.isArray(PLINES[k]) && PLINES[k].length ? fixN(pick(PLINES[k])) : d);
const MODES = ['afk-timeout', 'no-timeout'];
const THRESHOLDS = [5, 15, 60];
const FORCED = { t: '', forced: true, r: [0, 0] };

const ACH_BASE = {
  micro: { name: 'Microwave Break', desc: 'AFK 10 min', test: (r) => r.mins >= 10 },
  milk: { name: 'Went To Get Milk', desc: 'AFK 1 hour', test: (r) => r.mins >= 60 },
  grass: { name: 'Touched Grass', desc: 'AFK 3 hours', test: (r) => r.mins >= 180 },
  classic: { name: 'The Classic', desc: 'AFK 4 hours', test: (r) => r.mins >= 240 },
  liar: { name: 'Liar Liar', desc: 'AFK 10x longer than promised', test: (r) => r.mins >= r.promise * 10 },
  early: { name: 'Actually Came Back', desc: 'Return before promised time (lame)', test: (r) => r.mins < r.promise && !r.dragged },
  teflon: { name: 'Teflon', desc: 'Excuse from 85%+ suspicion to under 50%', test: (r) => r.susBefore >= 85 && r.susAfter < 50 },
  combo5: { name: 'Escalation', desc: 'Reach x5 combo', test: (r) => r.combo >= 5 },
  hotmic: { name: 'Hot Mic Hero', desc: 'Hot mic run over 30 min', test: (r) => r.path === 'hot-mic' && r.mins >= 30 },
  afkchan: { name: 'Moved to AFK Channel', desc: 'Get auto-moved by the AFK bot', test: (r) => !!r.autoMoved },
  dragged: { name: 'Dragged Out', desc: 'A friend drags you out after 2h+', test: (r) => !!r.dragged && r.mins >= 120 },
  lonely: { name: 'Lonely Legend', desc: 'Alone-in-VC run over 1 hour', test: (r) => r.path === 'alone-in-vc' && r.mins >= 60 },
  roommate: { name: 'Roommate', desc: 'Get moved to AFK while a resident is there, 3 times', test: (r) => r.roommates >= 3 },
};

// achievements: the base set is always on; the active pack adds its own (see PACK_ACH_RULES)
let ACH = { ...ACH_BASE };

// ---------- state ----------
const S = {};
let gen = 0; // bumps on reset, cancels stale timeouts
let FAST = null; // ?debug=1 harness only: { q, now, n } turns later() into an instant discrete-event queue
const later = (ms, fn) => {
  const g = gen;
  if (FAST) { FAST.q.push({ t: FAST.now + ms, n: FAST.n++, fn: () => { if (g === gen) fn(); } }); return; }
  setTimeout(() => { if (g === gen) fn(); }, ms);
};

nameGuard();

// ---------- items, tokens, mods (content/items.js) ----------
// Tokens: 1 token per 100 points banked (x tokenMult; running total per run, so no remainder is lost). Persisted.
// Item tiers: permanent (always on, count = owned) | run (held in stock, every held one switches on when a run starts and
// lasts the run; the legacy flag consumable:true) | consumable (held in stock, ARMED by hand before the brb, lasts one round).
const itemById = (id) => ITEMS.find((i) => i.id === id);
const itemMax = (i) => (i.stackable ? i.max || 5 : 1);
const tierOf = (i) => i.tier || (i.consumable ? 'run' : 'permanent');
const TIER_LABEL = { permanent: 'permanent', run: 'this run', consumable: 'one round' };
function loadInv() {
  const raw = store.get(INV_KEY, {});
  const out = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    Object.keys(raw).forEach((id) => {
      const i = itemById(id);
      const n = raw[id];
      if (i && Number.isInteger(n) && n > 0) out[id] = Math.min(n, itemMax(i));
    });
  }
  return out;
}
let inv = {}; // set per content set by applyPack()
let tokens = (() => { const t = store.get('tokens', 0); return Number.isFinite(t) && t > 0 ? Math.floor(t) : 0; })();
const itemCount = () => Object.keys(inv).length;

// effect vocabulary + combiner live in loader.js / effects.js; this file only decides WHICH sources are active
const FXD = () => (R.effectDefs || {});
const isCharge = (k) => !!(FXD()[k] && FXD()[k].kind === 'charges');
const stripCharges = (fx) => {
  const o = {};
  Object.keys(fx).forEach((k) => { if (!isCharge(k)) o[k] = fx[k]; });
  return o;
};
// hooks for the roguelike run loop: extra effect sources, the ceiling set, the round type
let extraSources = () => [];
let ceilingSet = 'classic';
let roundType = 'normal';
let debugSources = null; // ?debug=1 only
// every active item as an effect source. plusId = preview "what if I owned one more of this"
function itemSources(plusId) {
  const out = [];
  ITEMS.forEach((i) => {
    const t = tierOf(i);
    let n = 0;
    let fx = i.effects;
    if (t === 'permanent') n = (inv[i.id] || 0) + (plusId === i.id ? 1 : 0);
    else if (t === 'run') n = (S.cons && S.cons[i.id] ? 1 : 0) || (plusId === i.id ? 1 : 0);
    else { n = (S.armedItems && S.armedItems[i.id]) || (plusId === i.id ? 1 : 0); fx = stripCharges(fx); } // armed charges are granted once, not counted again
    if (n && Object.keys(fx).length) out.push({ effects: fx, n, label: i.name });
  });
  return out;
}
// the ONE place item effects and channel mods are combined. opts.noEnv = items/boons only (no channel or round modifiers),
// opts.plus = preview with one more of that item
function getMods(opts) {
  const o = opts || {};
  // rogue: permanent shop items do not apply, the run's own sources (loadout, boons, relics, curses) do
  const srcs = (S.run ? [] : itemSources(o.plus)).concat(debugSources || [], extraSources());
  const r = window.AFK_FX.combine(srcs, { ceilingSet: S.run ? 'rogue' : ceilingSet, roundType });
  const m = r.mods;
  m.hits = r.hits;
  if (S.run && S.run.rules.graceCap != null) m.graceMins = Math.min(m.graceMins, S.run.rules.graceCap);
  if (o.noEnv) return m;
  // environmental multipliers apply AFTER the clamp
  if (S.rd) {
    if (S.rd.susMult !== 1) m.susMult *= S.rd.susMult;
    if (S.rd.susEnv !== 1) m.susMult *= S.rd.susEnv;
    if (S.rd.bo && S.rd.bo.on) m.susMult *= S.rd.bo.susMult;
    if (S.rd.ptsEnv !== 1) m.pointMult *= S.rd.ptsEnv;
    if (S.rd.dragEnv !== 1) m.dragChanceMult *= S.rd.dragEnv;
    if (S.rd.triageEnv !== 1) m.triageTime *= S.rd.triageEnv;
    if (S.rd.micEnv !== 1) m.micEventChance *= S.rd.micEnv;
    if (S.rd.micOff) m.micEventChance = 0;
    if (S.rd.graceZero) m.graceMins = 0;
  }
  const ch = S.inAfkCh ? AFK_CH : curVc();
  if (ch && ch.mods) { if (ch.mods.susMult) m.susMult *= ch.mods.susMult; if (ch.mods.pointMult) m.pointMult *= ch.mods.pointMult; }
  return m;
}
const modsText = (mods) => [mods.pointMult && mods.pointMult !== 1 ? `x${mods.pointMult} pts` : '', mods.susMult && mods.susMult !== 1 ? `x${mods.susMult} suspicion` : ''].filter(Boolean).join(' · ');
const kickAt = () => 100 + getMods({ noEnv: true }).susCap;

// charges (second wind, ping shield, rerolls, abilities): S.charges[key] = what is left this run
const chargeCap = (k) => { const d = FXD()[k]; return d ? d[S.run || ceilingSet === 'rogue' ? 'R' : 'C'][1] : 0; };
function addCharge(k, n) {
  if (!isCharge(k) || !(n > 0)) return;
  S.charges[k] = Math.min(chargeCap(k), (S.charges[k] || 0) + n);
}
function useCharge(k) {
  if (!(S.charges[k] > 0)) return false;
  S.charges[k]--;
  return true;
}
// at run start: every charge the active sources allow
function grantRunCharges() {
  const cm = getMods({ noEnv: true }).chargesMax;
  Object.keys(cm).forEach((k) => { if (cm[k] > 0) addCharge(k, cm[k]); });
}

function buyItem(id) {
  const i = itemById(id);
  if (!i) return { ok: false, reason: 'unknown item' };
  const have = inv[id] || 0;
  if (have >= itemMax(i)) return { ok: false, reason: 'already at max' };
  if (tokens < i.price) return { ok: false, reason: 'not enough tokens' };
  tokens -= i.price;
  inv[id] = have + 1;
  store.set('tokens', tokens);
  store.set(INV_KEY, inv);
  renderInv();
  return { ok: true };
}
function addTokens(n) {
  if (n <= 0) return;
  tokens += n;
  store.set('tokens', tokens);
  renderInv();
}
// run start: every held "run" item switches on for the whole run (one of each)
function activateConsumables() {
  if (S.run) return;
  const used = [];
  ITEMS.forEach((i) => {
    if (tierOf(i) === 'run' && inv[i.id] > 0) {
      inv[i.id]--;
      if (!inv[i.id]) delete inv[i.id];
      S.cons[i.id] = true;
      used.push(i);
    }
  });
  if (used.length) {
    store.set(INV_KEY, inv);
    sys(`${used.map((i) => i.icon + ' ' + i.name).join(', ')} active this run`, 'good');
  }
  renderInv();
}
// consumables are armed by hand before the brb: passive effects last this round, ability charges are added right away
function armItem(id) {
  const i = itemById(id);
  if (S.run || !i || tierOf(i) !== 'consumable' || S.phase !== 'chat' || !((inv[id] || 0) > 0)) return false;
  inv[id]--;
  if (!inv[id]) delete inv[id];
  store.set(INV_KEY, inv);
  let passive = false;
  Object.keys(i.effects).forEach((k) => { if (isCharge(k)) addCharge(k, i.effects[k]); else passive = true; });
  if (passive) S.armedItems[id] = (S.armedItems[id] || 0) + 1;
  sys(`${i.icon} ${i.name} armed${passive ? ' for this round' : ': ability ready'}`, 'good');
  toast(`${i.icon} ${i.name} armed`, passive ? 'active for this round only' : 'ability charge added');
  sfx.cash();
  renderInv();
  renderAbilities(true);
  return true;
}

window.AFK.modules.push('core');
