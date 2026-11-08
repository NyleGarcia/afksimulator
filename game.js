'use strict';
(() => {
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
    const n = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f@{}]/g, '').trim();
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
  const meTok = (s) => {
    let stripped = false;
    const o = String(s).replace(TOKEN_RE, (m) => {
      if (m === '{me}') return ME.name;
      if (m === '{p}') return fmtMins(S.promise);
      if (m === '{t}') return fmtMins(S.mins);
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
  let FRIENDS, RESIDENTS, BOTS, TEXT, VOICE, AFK_CH, ITEMS, BRB, EXCUSES, LINES, INV_KEY;
  function useContent(c) {
    FRIENDS = c.friends; RESIDENTS = c.residents; BOTS = c.bots;
    TEXT = c.TEXT; VOICE = c.VOICE; AFK_CH = c.AFK_CH;
    ITEMS = c.items; BRB = c.BRB; EXCUSES = c.EXCUSES; LINES = c.LINES;
    INV_KEY = c.itemsOwner === 'classic' ? 'inv' : 'inv-' + c.itemsOwner;
  }
  useContent(CLASSIC);
  const lineOr = (k, d) => (Array.isArray(LINES[k]) && LINES[k].length ? pick(LINES[k]) : d);

  // ---------- paths (paths.js) ----------
  const FALLBACK_PATH = { id: 'walk-away', name: 'walk away', desc: 'classic. close the lid, leave the room', risk: 'the classic', pointMult: 1, susMult: 1, events: [] };
  let PATHS = [FALLBACK_PATH];
  let PEVENTS = {};
  let PLINES = {};
  if (Array.isArray(R.paths) && R.paths.length) PATHS = R.paths.map((x) => ({ ...x, events: Array.isArray(x.events) ? x.events : [] }));
  if (R.pathEvents && typeof R.pathEvents === 'object') PEVENTS = R.pathEvents;
  if (R.pathLines && typeof R.pathLines === 'object') PLINES = R.pathLines;
  const pLine = (k, d) => (Array.isArray(PLINES[k]) && PLINES[k].length ? pick(PLINES[k]) : d);
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
  const later = (ms, fn) => {
    const g = gen;
    setTimeout(() => { if (g === gen) fn(); }, ms);
  };

  // ---------- items, tokens, mods (content/items.js) ----------
  // Tokens: 1 token per 100 points banked (running total per run, so no remainder is lost). Persisted.
  const itemById = (id) => ITEMS.find((i) => i.id === id);
  const itemMax = (i) => (i.stackable ? i.max || 5 : 1);
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

  // the ONE place item effects and channel mods are combined
  function getMods() {
    const m = { susMult: 1, pointMult: 1, micEventChance: 1, excuseBonus: 0, graceMins: 0 };
    const apply = (fx, n) => {
      Object.keys(fx).forEach((k) => {
        if (!(k in m)) return;
        if (k === 'excuseBonus' || k === 'graceMins') m[k] += fx[k] * n; else m[k] *= Math.pow(fx[k], n);
      });
    };
    ITEMS.forEach((i) => {
      const n = i.consumable ? (S.cons && S.cons[i.id] ? 1 : 0) : (inv[i.id] || 0);
      if (n) apply(i.effects, n);
    });
    const ch = S.inAfkCh ? AFK_CH : curVc();
    if (ch && ch.mods) { if (ch.mods.susMult) m.susMult *= ch.mods.susMult; if (ch.mods.pointMult) m.pointMult *= ch.mods.pointMult; }
    return m;
  }
  const modsText = (mods) => [mods.pointMult && mods.pointMult !== 1 ? `x${mods.pointMult} pts` : '', mods.susMult && mods.susMult !== 1 ? `x${mods.susMult} suspicion` : ''].filter(Boolean).join(' · ');

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
  function activateConsumables() {
    const used = [];
    ITEMS.forEach((i) => {
      if (i.consumable && inv[i.id] > 0) {
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

  // ---------- character lines + digs ----------
  const stats = { digs: 0, src: { hand: 0, gen: 0, bulk: 0 }, first: { hand: 0, gen: 0, bulk: 0 } };
  // a character's own lines for key k are used half the time when they have some, else the shared pool
  const say = (f, k) => {
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
    if (d && Math.random() < (f.rival ? 0.65 : 0.4)) { stats.digs++; return d.text; }
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
    renderServer();
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
  const speak = (f, cat) => mixLine(cat, () => say(f, cat)) || lineOr(cat, '...');
  const speakCat = (cat, opts) => mixLine(cat, handCat(cat), opts);

  // ----- brb / excuse derivation for bulk strings (plain text) -----
  const BRB_WORDS = [
    [/\bhalf (an )?hour\b/, 30], [/\b(hours?|hrs?)\b/, 60], [/\bdinner\b/, 30], [/\blunch\b/, 25], [/\bbreakfast\b/, 20],
    [/\bshower\b/, 15], [/\b(nap|sleep)\b/, 30], [/\b(food|eat|eating|snack|pizza|sandwich|ramen)\b/, 10],
    [/\b(bathroom|toilet|restroom)\b/, 5], [/\b(coffee|drink|water|kettle)\b/, 4], [/\b(dog|trash|laundry|door)\b/, 6],
    [/\b(secs?|seconds?|moment|quick|minute)\b/, 1],
  ];
  const stripMe = (t) => t.replace(/@?\{me\}[,:]?[ \t]*/g, '');
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
    post(friendIn(cid), t, { ch: cid, weight: 0.8 });
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

  // ---------- AFK-channel resident ----------
  function pickResident() {
    if (!RESIDENTS.length) return null;
    const c = pick(RESIDENTS);
    const hasMin = Number.isFinite(c.timerMin);
    const hasMax = Number.isFinite(c.timerMax);
    const lo = hasMin ? c.timerMin : Math.min(200, hasMax ? c.timerMax : 200);
    const hi = hasMax ? c.timerMax : Math.max(1500, lo);
    return { ...c, days0: Math.floor(rand(lo, hi + 1)), dayMins: c.timerDayMins || 60 };
  }
  // 1 resident day = 1 game hour by default (timerDayMins), so the number visibly ticks during a run
  const resDays = () => (S.resident ? S.resident.days0 + Math.floor(S.resT / S.resident.dayMins) : 0);
  const resTimerText = () => { const n = resDays(); return `In voice for ${fmtN(n)} ${n === 1 ? 'day' : 'days'}`; };
  const resStatus = () => {
    const st = S.resident && S.resident.status;
    return st && st.length ? st[Math.floor(performance.now() / 7000) % st.length] : 'idle';
  };
  function residentSay() {
    const r = S.resident;
    if (!r || !S.inAfkCh || S.kicked) return;
    const own = r.lines && r.lines.idle;
    if (PK.id !== 'classic') {
      const pool = [].concat(Array.isArray(r.status) ? r.status : [], Array.isArray(own) ? own : []);
      sys(`💤 ${r.name}: ${mixLine('resident', pool.length ? () => pick(pool) : null) || '…'}`, 'resident');
      return;
    }
    sys(`💤 ${r.name}: ${own && own.length && Math.random() < 0.6 ? pick(own) : '…'}`, 'resident');
  }
  // called whenever the player is moved/dragged into the afk channel
  function roommate() {
    if (!S.resident) return;
    store.set('roommates', (Number(store.get('roommates', 0)) || 0) + 1);
    later(900, residentSay);
    if (Math.random() < 0.1) later(1900, () => sys(lineOr('afkMod', '{me} was promoted to AFK channel moderator.'), 'good'));
  }

  function reset() {
    gen++;
    Object.assign(S, {
      phase: 'intro',
      score: 0,
      pending: 0,
      round: 1,
      sus: 0,
      combo: 0,
      lastMins: 0,
      longest: 0,
      mins: 0,
      overReal: 0,
      promise: 5,
      mult: 1,
      clock: 20 * 60 + Math.floor(rand(0, 50)),
      unread: 0,
      voted: false,
      afkAt: 0,
      moved: 0,
      uses: Object.create(null),
      kicked: false,
      path: null,
      mode: null,
      threshold: 15,
      inAfkCh: false,
      autoMoved: false,
      dragged: false,
      movedAt: 0,
      cap: Infinity,
      dragMin: 0,
      aloneSince: null,
      flavor: '',
      longestPath: '',
      longestMode: '',
      friends: FRIENDS.map((f) => ({ ...f, away: false, vc: true })),
      chan: VOICE[0].id,
      chanLock: false,
      cons: {},
      banked: 0,
      tokAwarded: 0,
      resident: pickResident(),
      resT: 0,
      idrisJabs: 0,
      fightMissed: 0,
      fightPings: 0,
      lastFight: -99,
      elevator: false,
      ch: Object.fromEntries(TEXT.map((c) => [c.id, { msgs: [], unread: 0, mentions: 0, muted: !!c.muted, lastReplyAt: -1e9 }])),
      active: TEXT[0].id,
      brbCh: null,
      pings: [],
      pingSeq: 0,
      tri: null,
      lor: null,
      follows: 0,
      brbN: Object.create(null),
      actBuild: null,
      slowTok: 0,
    });
    repaint();
    clearActions();
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    document.title = 'AFK Simulator';
    $('#composerText').textContent = composerIdle();
    renderChip();
    renderMembers();
    renderInv();
    renderChannelList();
  }

  // ---------- sound ----------
  let catchingUp = false;
  let actx = null;
  let muted = store.get('muted', false);
  function initAudio() {
    if (actx) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; }
  }
  function beep(freq, dur, type = 'sine', vol = 0.12) {
    if (muted || !actx || catchingUp || document.hidden) return;
    const t = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const sfx = {
    ping() { beep(988, 0.09); setTimeout(() => beep(1318, 0.14), 90); },
    msg() { beep(660, 0.05, 'sine', 0.04); },
    cash() { beep(784, 0.08, 'triangle'); setTimeout(() => beep(1046, 0.08, 'triangle'), 80); setTimeout(() => beep(1568, 0.16, 'triangle'), 160); },
    bad() { beep(220, 0.25, 'sawtooth', 0.08); setTimeout(() => beep(150, 0.4, 'sawtooth', 0.08), 200); },
  };

  // ---------- rendering ----------
  function avatar(who, cls = '') {
    const a = document.createElement('div');
    a.className = 'avatar ' + cls;
    a.style.background = who.color;
    a.textContent = firstCh(who.name);
    return a;
  }

  // ---------- text channels: per-channel history, unread/mention state, pings ----------
  // tuning for the channel game (docs: CONTENT.md "Channels")
  const CT = { base: 1.6, cap: 14, seenMult: 1.25, follows: 3, hist: 200, muteMax: 3, brbW: 2, visMid: 0.85 };
  const DEFAULT_REPLIES = [{ t: 'here', r: [1, 5] }, { t: 'sorry, on it', r: [2, 7] }, { t: 'mb just saw this', r: [0, 6] }, { t: 'yes?', r: [1, 4] }];
  const FOLLOWUPS = ['@{me} did you see my message in {ch}??', 'yo @{me} check {ch}', '@{me} i pinged you in {ch} bro', '@{me} {ch}. now.'];
  const textById = (id) => TEXT.find((c) => c.id === id);
  function activeCh() { return (S.active && textById(S.active)) || TEXT[0]; }
  const defCh = () => ((S.phase === 'chat' || S.phase === 'intro' || S.phase === 'over') ? S.active : (S.brbCh && S.ch[S.brbCh] ? S.brbCh : S.active));
  const brbVis = () => { const c = S.brbCh && textById(S.brbCh); return c ? c.visibility : CT.visMid; };
  let chanDirty = true;
  let swallow = false; // the click that finishes the tap/key that woke you must not also switch channel
  let lastNote = -1e9;

  function announce(text) { const n = $('#srStatus'); if (n) n.textContent = text; }

  function msgNode(m) {
    const box = document.createElement('div');
    if (m.sys) {
      box.className = 'msg system ' + m.tone;
      box.textContent = m.text;
      return box;
    }
    box.className = 'msg' + (m.mention ? ' mention' : '');
    const who = m.who;
    const mRe = mentionRe();
    box.appendChild(avatar(who));
    const body = document.createElement('div');
    body.className = 'msg-body';
    const head = document.createElement('div');
    head.className = 'msg-head';
    const name = document.createElement('span');
    name.className = 'msg-name';
    name.style.color = who.color;
    name.textContent = who.name;
    const time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = fmtClock(m.clock);
    head.append(name, time);
    const t = document.createElement('div');
    t.className = 'msg-text';
    // highlight @mentions safely
    m.text.split(mRe).forEach((part) => {
      if (part && part.toLowerCase() === '@' + ME.name.toLowerCase()) {
        const s = document.createElement('span');
        s.className = 'at';
        s.textContent = part;
        t.appendChild(s);
      } else if (part) {
        t.appendChild(document.createTextNode(part));
      }
    });
    body.append(head, t);
    box.appendChild(body);
    return box;
  }
  function paint(m) {
    const box = $('#messages');
    box.appendChild(msgNode(m));
    while (box.children.length > CT.hist) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }
  // rebuild the message view from the active channel's history. Live region is muted during the replay so a
  // screen reader does not read the whole channel back.
  function repaint() {
    const box = $('#messages');
    const st = S.ch && S.ch[S.active];
    box.setAttribute('aria-busy', 'true');
    box.setAttribute('aria-live', 'off');
    box.textContent = '';
    const frag = document.createDocumentFragment();
    if (st) st.msgs.forEach((m) => frag.appendChild(msgNode(m)));
    box.appendChild(frag);
    box.scrollTop = box.scrollHeight;
    const c = activeCh();
    box.setAttribute('aria-label', `Messages in ${labelOf(c)}`);
    $('#chatName').textContent = chanLabel(c);
    setTimeout(() => { box.setAttribute('aria-busy', 'false'); box.setAttribute('aria-live', 'polite'); }, 60);
  }
  const composerNow = () => (S.kicked ? 'You do not have permission to send messages in this channel.' : S.phase === 'afk' ? `${ME.name} is typing... (he is not)` : composerIdle());

  function addPing(id, who, weight, follow) {
    const c = textById(id);
    const p = { id: ++S.pingSeq, ch: id, from: who && who.name ? who.name : '?', minsAtSend: S.mins, weight: weight || 1, answered: false, seen: false, forgiven: false, delivered: true, deliverAt: 0, isFollow: !!follow, followed: false, late: 0 };
    if (S.ch[id].muted) { p.delivered = false; p.deliverAt = S.mins + rand(c.muteDelay[0], c.muteDelay[1]); }
    S.pings.push(p);
    return p;
  }

  function post(who, text, opts = {}) {
    text = meTok(text);
    const id = opts.ch && S.ch[opts.ch] ? opts.ch : defCh();
    const st = S.ch[id];
    const other = who !== ME && !opts.system;
    const m = { who, text, sys: !!opts.system, tone: opts.tone || '', clock: S.clock, mention: other && mentionRe().test(text) };
    st.msgs.push(m);
    if (st.msgs.length > CT.hist) st.msgs.shift();
    const shown = id === S.active;
    if (shown) paint(m);
    if (!other) return;
    const afk = S.phase === 'afk';
    chanDirty = true;
    if (m.mention && afk) {
      const p = addPing(id, who, opts.weight, opts.follow);
      if (!p.delivered) return; // muted channel: nobody tells you yet (see deliverMuted)
    }
    if (m.mention) {
      if (!shown || afk) st.mentions++;
      if (afk) S.unread++;
      if (!st.muted) sfx.ping();
      if (!shown && !afk && !st.muted) notifyInactive(id, who);
    } else {
      if (!shown || afk) st.unread++;
      if (shown) sfx.msg();
    }
  }

  // one rate-limited heads-up for a mention in a channel you are not looking at (toast + screen-reader status)
  function notifyInactive(id, who) {
    const now = performance.now();
    if (catchingUp || now - lastNote < 8000) return;
    lastNote = now;
    const c = textById(id);
    announce(`${who.name} mentioned you in ${c.name}`);
    toast(`@${who.name} in ${labelOf(c)}`, 'new mention');
  }

  function sys(text, tone, ch) { post(null, text, { system: true, tone, ch }); }

  // pings that arrived in a muted channel reach you after muteDelay game minutes
  function deliverMuted() {
    S.pings.forEach((p) => {
      if (p.delivered || S.mins < p.deliverAt) return;
      p.delivered = true;
      S.ch[p.ch].mentions++;
      S.unread++;
      chanDirty = true;
    });
  }
  // on return: muted pings that arrived within the last muteDelay[1] minutes are forgiven (fair); older ones count
  function settleMuted() {
    S.pings.forEach((p) => {
      if (p.delivered) return;
      p.delivered = true;
      S.ch[p.ch].mentions++;
      const c = textById(p.ch);
      if (S.mins - p.minsAtSend < (c ? c.muteDelay[1] : 12)) p.forgiven = true;
    });
  }
  const owedPings = () => S.pings.filter((p) => !p.answered && !p.forgiven);

  // where a friend posts: weighted by busyness, brb channel x2; pref = a channel id the line belongs in (70%)
  function weightedCh(skip) {
    const pool = TEXT.filter((c) => c.id !== skip);
    const list = pool.length ? pool : TEXT;
    const w = list.map((c) => (0.4 + c.busyness) * (c.id === S.brbCh ? CT.brbW : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i].id; }
    return list[list.length - 1].id;
  }
  function routeCh(pref) {
    if (pref && textById(pref) && Math.random() < 0.7) return pref;
    return weightedCh();
  }
  function friendIn(cid, not) {
    const c = textById(cid);
    const ok = (f) => !f.away && f.name !== not;
    const here = c ? S.friends.filter((f) => ok(f) && c.members.includes(f.id)) : [];
    if (here.length) return pick(here);
    const any = S.friends.filter(ok);
    return any.length ? pick(any) : friend();
  }

  function pingRaw(p) {
    const c = textById(p.ch);
    const age = Math.max(0, S.mins - p.minsAtSend);
    const ageF = Math.min(2, 0.5 + age / Math.max(S.promise, 5));
    const ghost = p.ch !== S.brbCh && brbVis() < 0.5 ? 1.3 : 1; // you told almost nobody, so the others had no idea
    return CT.base * p.weight * ageF * (0.6 + (c ? c.visibility : 0.5)) * (p.seen ? CT.seenMult : 1) * ghost;
  }
  // list = every counted ping. Unanswered ones pay in full, answered ones pay a sliver that grows with how long
  // you took (late = fraction of the triage timer used). Biggest first, each next one x0.85, capped, softer early on.
  function lorPenalty(list, scale) {
    const vals = [];
    const byCh = {};
    let un = 0;
    list.forEach((p) => {
      let v = pingRaw(p);
      if (p.answered) v *= 0.3 * (p.late || 0);
      else { un++; byCh[p.ch] = (byCh[p.ch] || 0) + 1; }
      vals.push(v);
    });
    vals.sort((a, b) => b - a);
    let pen = 0;
    vals.forEach((v, i) => { pen += v * Math.pow(0.85, i); });
    pen = Math.min(CT.cap, pen) * clamp(0.5 + 0.25 * S.round, 0.75, 1) * scale;
    return { pen, un, byCh };
  }
  // suspicion can rise by the penalty, but the penalty alone never takes you past 90% (kicks come from the usual paths)
  function applyLor(res, refund, ch) {
    const before = S.sus;
    const ns = clamp(Math.min(before + res.pen - refund, Math.max(before, 90)), 0, 100);
    S.sus = ns;
    const d = Math.round(ns - before);
    S.lor = { count: res.un, d };
    const where = Object.keys(res.byCh).map((id) => `${labelOf(textById(id) || { icon: '#', name: id })}${res.byCh[id] > 1 ? ' x' + res.byCh[id] : ''}`).join(', ');
    const sg = d >= 0 ? '+' : '-';
    const txt = res.un
      ? `📨 left on read x${res.un} (${where}) · ${sg}${Math.abs(d)}% suspicion`
      : `📨 every ping answered · ${sg}${Math.abs(d)}% suspicion`;
    sys(txt, res.un ? 'bad' : 'good', ch);
    if (res.un) sfx.bad();
  }

  // ---------- channel switching, mute, list ----------
  const canSwitch = () => S.phase !== 'afk' && S.phase !== 'leaving' && S.phase !== 'judging' && $('#modal').hidden;
  function switchChannel(id, o = {}) {
    const forced = !!o.force && !o.user;
    if (!S.ch || !S.ch[id] || !textById(id)) return false;
    if (S.phase === 'afk' || (!o.force && !canSwitch())) return false;
    const changed = id !== S.active;
    S.active = id;
    const st = S.ch[id];
    st.unread = 0;
    st.mentions = 0;
    if (!forced) S.pings.forEach((p) => { if (p.ch === id && !p.answered) p.seen = true; }); // seen but unanswered = left on read; forced switches (return to brb channel) do not count
    if (changed) repaint();
    if (S.tri) S.tri.list = false;
    if (!S.kicked && S.phase !== 'afk') $('#composerText').textContent = composerNow();
    chanDirty = true;
    renderChannelList();
    if (S.phase === 'triage' && S.tri) setCtx(buildTriage, !o.focus);
    else if (S.actBuild && (S.phase === 'chat' || S.phase === 'excuse')) S.actBuild(true);
    // keep the active chip visible in the mobile strip
    const bar = $('#chanBar');
    const row = chanRows.find((r) => r.c.id === id);
    if (bar && row) {
      const b = row.btns[1];
      if (b.offsetLeft < bar.scrollLeft) bar.scrollLeft = b.offsetLeft - 12;
      else if (b.offsetLeft + b.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = b.offsetLeft + b.offsetWidth - bar.clientWidth + 12;
    }
    return true;
  }
  function stepChannel(dir, unreadOnly) {
    const n = TEXT.length;
    let i = TEXT.findIndex((c) => c.id === S.active);
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      const st = S.ch[TEXT[i].id];
      if (!unreadOnly || st.mentions > 0 || (st.unread > 0 && !st.muted)) return switchChannel(TEXT[i].id);
    }
    return false;
  }
  function toggleMute(id) {
    if (!S.ch || !S.ch[id] || S.phase === 'afk' || S.kicked) return;
    const st = S.ch[id];
    if (!st.muted && TEXT.filter((c) => S.ch[c.id].muted).length >= CT.muteMax) { toast('Too many muted', `max ${CT.muteMax} muted channels`); return; }
    st.muted = !st.muted;
    chanDirty = true;
    renderChannelList();
    announce(`${labelOf(textById(id))} ${st.muted ? 'muted: pings there reach you late' : 'unmuted'}`);
  }

  const chanRows = [];
  function mkChanBtn(c, bar) {
    const b = el('button', 'ch');
    b.type = 'button';
    b.dataset.ch = c.id;
    if (c.desc) b.title = c.desc;
    b.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    const ic = el('span', 'ch-ic', c.icon);
    ic.setAttribute('aria-hidden', 'true');
    const nm = el('span', 'ch-name', c.name);
    const bd = el('span', 'ch-badge');
    bd.setAttribute('aria-hidden', 'true');
    b.append(ic, nm, bd);
    b.addEventListener('click', () => {
      if (swallow) { swallow = false; return; }
      if (S.phase === 'afk') return;
      initAudio();
      switchChannel(c.id);
    });
    return b;
  }
  function chanNavKey(e) {
    const t = e.target && e.target.closest ? e.target.closest('button.ch') : null;
    if (!t || e.ctrlKey || e.metaKey) return;
    const btns = Array.from(e.currentTarget.querySelectorAll('button.ch'));
    let i = btns.indexOf(t);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i = (i + 1) % btns.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i = (i - 1 + btns.length) % btns.length;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = btns.length - 1;
    else if ((e.key === 'm' || e.key === 'M') && !e.altKey) { e.preventDefault(); toggleMute(t.dataset.ch); return; }
    else return;
    e.preventDefault();
    btns.forEach((b) => { b.tabIndex = b === btns[i] ? 0 : -1; });
    btns[i].focus();
  }
  function renderChannelList() {
    chanDirty = false;
    if (!S.ch) return;
    const afk = S.phase === 'afk';
    const fa = document.activeElement;
    const conts = [$('#textChans'), $('#chanBar')];
    chanRows.forEach(({ c, btns, mutes }) => {
      const st = S.ch[c.id];
      if (!st) return;
      const active = c.id === S.active;
      const m = st.mentions;
      const dot = st.unread > 0 && !st.muted;
      btns.forEach((b, k) => {
        b.classList.toggle('active', active);
        b.classList.toggle('unread', m > 0 || dot);
        b.classList.toggle('muted', st.muted);
        if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        b.setAttribute('aria-disabled', afk ? 'true' : 'false');
        const bd = b.querySelector('.ch-badge');
        bd.className = 'ch-badge' + (m > 0 ? ' mention' : dot ? ' dot' : '');
        bd.textContent = m > 0 ? (m > 9 ? '9+' : String(m)) : '';
        b.setAttribute('aria-label', labelOf(c) + (m > 0 ? `, ${m} mention${m > 1 ? 's' : ''}` : dot ? ', unread messages' : '') + (st.muted ? ', muted' : '') + (active ? ', current channel' : ''));
        const focusIn = fa && fa.classList && fa.classList.contains('ch') && conts[k].contains(fa);
        b.tabIndex = focusIn ? (b === fa ? 0 : -1) : active ? 0 : -1;
      });
      mutes.forEach((mute) => {
        mute.textContent = st.muted ? '🔕' : '🔔';
        mute.setAttribute('aria-pressed', String(st.muted));
        mute.setAttribute('aria-label', `Mute ${c.name}`);
        mute.title = st.muted ? 'Muted: pings here reach you late (M)' : 'Mute (M): pings here reach you late';
        mute.disabled = afk;
      });
    });
  }

  // ---------- actions panel ----------
  function clearActions() { S.actBuild = null; $('#actions').textContent = ''; }
  // build(noFocus) draws the panel; it is kept so switching channel can redraw it (reply set, slowmode, hints)
  function setCtx(build, noFocus) { S.actBuild = build; build(!!noFocus); }

  function setActions(title, options, extra, o = {}) {
    const box = $('#actions');
    box.textContent = '';
    const h = document.createElement('div');
    h.className = 'actions-title';
    h.textContent = title;
    if (o.timer) {
      const tt = document.createElement('span');
      tt.className = 'tri-time';
      tt.id = 'triTime';
      tt.setAttribute('aria-hidden', 'true');
      tt.textContent = Math.ceil(o.timer.left / 1000) + 's';
      h.appendChild(tt);
    }
    const grid = document.createElement('div');
    grid.className = 'choices';
    options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.dataset.key = String(i + 1);
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = `[${i + 1}]`;
      b.append(k, document.createTextNode(opt.label));
      if (opt.sub) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = opt.sub;
        b.appendChild(sub);
      }
      if (opt.disabled) b.setAttribute('aria-disabled', 'true');
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (opt.disabled) return;
        initAudio();
        clearActions();
        opt.fn();
      });
      grid.appendChild(b);
    });
    box.appendChild(h);
    if (o.timer) {
      const bar = document.createElement('div');
      bar.className = 'tri-bar';
      const f = document.createElement('div');
      f.className = 'tri-fill';
      f.style.width = (100 * o.timer.left / o.timer.total) + '%';
      bar.appendChild(f);
      box.appendChild(bar);
    }
    if (o.hint) {
      const hint = document.createElement('div');
      hint.className = 'actions-hint';
      hint.textContent = o.hint;
      box.appendChild(hint);
    }
    box.appendChild(grid);
    if (extra) {
      const x = document.createElement('button');
      x.className = 'shop-link';
      x.textContent = extra.label;
      x.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); extra.fn(); });
      box.appendChild(x);
    }
    $('#messages').scrollTop = $('#messages').scrollHeight;
    if (S.phase !== 'afk' && !o.noFocus && grid.firstChild) grid.firstChild.focus({ preventScroll: true });
  }

  // ---------- slowmode (real seconds, per channel, only for quick replies and excuses) ----------
  function slowLeft(id) {
    const c = textById(id);
    if (!c || !(c.slowmodeSec > 0)) return 0;
    return Math.ceil(Math.max(0, c.slowmodeSec * 1000 - (performance.now() - S.ch[id].lastReplyAt)) / 1000);
  }
  const stampSlow = (id) => { S.ch[id].lastReplyAt = performance.now(); };
  function slowTick() {
    const tok = ++S.slowTok;
    later(1000, () => { if (tok === S.slowTok && S.actBuild) S.actBuild(true); });
  }

  // ---------- return: answer your pings (timed triage), then explain yourself ----------
  function startTriage() {
    const owed = owedPings();
    const chs = Array.from(new Set(owed.map((p) => p.ch)));
    const total = clamp(7000 + 3500 * chs.length, 9000, 22000);
    S.phase = 'triage';
    const tri = { t0: performance.now(), total, list: true, order: shuffle(chs), refund: 0, reps: {} };
    S.tri = tri;
    sys(`📨 ${owed.length} unanswered ping${owed.length > 1 ? 's' : ''} in ${chs.length} channel${chs.length > 1 ? 's' : ''}. answer before it gets worse`, 'bad');
    setCtx(buildTriage);
    triTick(tri);
  }
  function triTick(tri) {
    later(200, () => {
      if (S.tri !== tri) return;
      const left = tri.total - (performance.now() - tri.t0);
      if (left <= 0) { finishTriage(); return; }
      const t = $('#triTime');
      if (t) t.textContent = Math.ceil(left / 1000) + 's';
      const f = $('.tri-fill');
      if (f) f.style.width = (100 * left / tri.total) + '%';
      triTick(tri);
    });
  }
  function repliesFor(c, tri) {
    if (!tri.reps[c.id]) {
      const pool = Array.isArray(c.replies) && c.replies.length ? c.replies : DEFAULT_REPLIES;
      tri.reps[c.id] = shuffle(pool).slice(0, 3);
    }
    return tri.reps[c.id];
  }
  function buildTriage(noFocus) {
    const tri = S.tri;
    if (!tri) return;
    const owed = owedPings();
    const c = activeCh();
    const mine = owed.filter((p) => p.ch === c.id);
    const timer = { left: Math.max(0, tri.total - (performance.now() - tri.t0)), total: tri.total };
    const s = (n) => (n === 1 ? '' : 's');
    if (mine.length && !tri.list) {
      const left = slowLeft(c.id);
      const opts = repliesFor(c, tri).map((r) => ({
        label: r.t,
        sub: left ? `slowmode ${left}s` : 'quick reply: answers every ping here',
        disabled: left > 0,
        fn: () => answerCh(c, r),
      }));
      opts.push({ label: '◂ other channels', sub: 'back to the list', fn: () => { tri.list = true; setCtx(buildTriage); } });
      setActions(`ANSWER ${labelOf(c)} · ${mine.length} ping${s(mine.length)}`, opts, null, { noFocus, timer, hint: 'A reply only clears pings in the channel you post it in.' });
      if (left) slowTick();
      return;
    }
    const opts = tri.order.filter((id) => owed.some((p) => p.ch === id)).map((id) => {
      const cc = textById(id);
      const ps = owed.filter((p) => p.ch === id);
      const oldest = Math.max.apply(null, ps.map((p) => S.mins - p.minsAtSend));
      const heat = ps.reduce((a, p) => a + pingRaw(p), 0);
      return {
        label: `${labelOf(cc)} · ${ps.length} ping${s(ps.length)}`,
        sub: `oldest ${fmtMins(oldest)} · ${heat >= 8 ? 'they are mad' : heat >= 4 ? 'getting heated' : 'mild'}`,
        fn: () => switchChannel(id, { force: true, user: true, focus: true }),
      };
    });
    opts.push({ label: 'skip: just explain myself', sub: 'unanswered pings count as left on read', fn: () => finishTriage() });
    setActions('PING TRIAGE: who do you answer first?', opts, null, { noFocus, timer, hint: 'Hotter, older pings cost more the longer they wait. You can also click a channel in the sidebar.' });
  }
  function answerCh(c, rep) {
    const tri = S.tri;
    if (!tri) return;
    post(ME, rep.t, { ch: c.id });
    stampSlow(c.id);
    const late = clamp((performance.now() - tri.t0) / tri.total, 0, 1);
    S.pings.forEach((p) => { if (p.ch === c.id && !p.answered) { p.answered = true; p.late = late; } });
    tri.refund = Math.min(6, tri.refund + clamp(rand(rep.r[0], rep.r[1]), -3, 8));
    if (!owedPings().length) finishTriage();
    else { tri.list = true; setCtx(buildTriage); }
  }
  function finishTriage() {
    const tri = S.tri;
    if (!tri) return;
    S.tri = null;
    clearActions();
    const counted = S.pings.filter((p) => !p.forgiven);
    applyLor(lorPenalty(counted, 1), tri.refund, S.active);
    returnChatter();
    toast('Pings settled', S.lor.count ? `left on read x${S.lor.count}` : 'inbox zero');
    offerExcuse();
  }

  function offerExcuse() {
    S.phase = 'excuse';
    const opts = [QUIET].concat(pickOptions(EXCUSES, 'excuse', deriveExcuse, 3));
    setCtx((noFocus) => {
      const c = activeCh();
      const left = slowLeft(c.id);
      setActions('YOU\'RE BACK. EXPLAIN YOURSELF.', opts.map((e) => {
        const used = S.uses[e.k || e.t] || 0;
        const locked = left > 0 && !e.quiet;
        return {
          label: e.t,
          sub: locked ? `slowmode in ${labelOf(c)}: ${left}s (switch channel or wait)` : e.quiet ? 'say nothing. pure sigma energy. x1.25 pts' : used ? `used ${used}x. they have screenshots.` : 'untested excuse (mom has not heard this one yet)',
          disabled: locked,
          fn: () => chooseExcuse(e),
        };
      }), null, { noFocus, hint: `posting in ${labelOf(c)}` });
      if (left) slowTick();
    });
  }

  // ---------- sidebar channels + members ----------
  const chanBoxes = new Map();
  function buildChannels() {
    const tb = $('#textChans');
    const bar = $('#chanBar');
    const vb = $('#voiceChans');
    tb.textContent = '';
    bar.textContent = '';
    vb.textContent = '';
    chanBoxes.clear();
    chanRows.length = 0;
    TEXT.forEach((c) => {
      const li = el('li', 'ch-row');
      const b1 = mkChanBtn(c);
      const mkMute = () => {
        const m = el('button', 'ch-mute', '🔔');
        m.type = 'button';
        m.tabIndex = -1;
        m.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(c.id); });
        return m;
      };
      const mute = mkMute();
      li.append(b1, mute);
      tb.appendChild(li);
      const b2 = mkChanBtn(c, true);
      const mute2 = mkMute(); // phone strip: the sidebar list is hidden there
      const chip = el('span', 'chip-wrap');
      chip.append(b2, mute2);
      bar.appendChild(chip);
      chanRows.push({ c, btns: [b1, b2], mutes: [mute, mute2] });
    });
    VOICE.concat([AFK_CH]).forEach((c) => {
      const row = el('div', 'ch', chanLabel(c));
      if (c.desc) row.title = c.desc;
      const box = el('div', 'vc-members');
      if (c === VOICE[0]) box.id = 'vcMembers';
      if (c === AFK_CH) { row.id = 'afkChan'; box.id = 'afkMembers'; }
      vb.append(row, box);
      chanBoxes.set(c.id, { row, box });
    });
    $('#chatName').textContent = chanLabel(activeCh());
    renderChannelList();
  }

  // friends follow the player into their current voice channel; if a channel lists members, only those are in it
  // and the rest stay in their first listed voice channel. a friend nobody lists is always with the player.
  function inCurMembers(f) {
    const cur = curVc();
    return !S.friends.some((x) => cur.members.includes(x.id)) || cur.members.includes(f.id);
  }
  const inVcNow = (f) => f.vc !== false && inCurMembers(f);
  function placeChan(f) {
    if (inCurMembers(f)) return curVc();
    return VOICE.find((c) => c.members.includes(f.id)) || curVc();
  }

  function renderMembers() {
    const list = $('#memberList');
    list.textContent = '';
    chanBoxes.forEach(({ box }) => { box.textContent = ''; });
    const cur = curVc();
    const meState = S.kicked ? 'offline' : S.phase === 'afk' ? 'idle' : 'online';
    const parked = S.inAfkCh && !S.kicked;
    const box = (c) => (chanBoxes.get(c.id) || {}).box;
    const all = [{ ...ME, isMe: true, state: meState, sub: parked ? `in ${chanLabel(AFK_CH)}` : meState === 'idle' ? 'AFK 🌙' : meState === 'offline' ? 'kicked' : 'Playing AFK Simulator' }]
      .concat(S.friends.map((f) => ({ ...f, state: f.away ? 'idle' : 'online', sub: f.vc === false ? `in ${sideText().icon === '#' ? '#' : ''}${sideText().name}` : f.away ? 'brb' : `in ${placeChan(f).name}` })))
      .concat(BOTS.map((b) => ({ ...b, isBot: true, state: 'online', sub: 'BOT' })));
    if (S.resident) all.push({ ...S.resident, isRes: true, state: 'idle', sub: resStatus() });
    let online = 0;
    all.forEach((m) => {
      if (m.state !== 'offline') online++;
      const row = document.createElement('div');
      row.className = 'member ' + (m.state === 'offline' ? 'offline' : '');
      const av = avatar(m);
      const dot = document.createElement('span');
      dot.className = 'dot ' + m.state;
      av.appendChild(dot);
      const info = document.createElement('div');
      const n = document.createElement('div');
      n.className = 'member-name';
      n.style.color = m.color;
      n.textContent = m.name;
      const s = document.createElement('div');
      s.className = 'member-sub';
      s.textContent = m.sub;
      info.append(n, s);
      if (m.isRes) {
        s.dataset.res = 'status';
        const t = document.createElement('div');
        t.className = 'member-sub';
        t.dataset.res = 'timer';
        t.textContent = resTimerText();
        info.appendChild(t);
      }
      row.append(av, info);
      list.appendChild(row);

      if (m.isRes) {
        const v = document.createElement('div');
        v.className = 'vc-res';
        const vi = document.createElement('div');
        vi.className = 'vc-res-info';
        const vn = document.createElement('div');
        vn.textContent = m.name + ' 🌙';
        const vt = document.createElement('div');
        vt.className = 'res-timer';
        vt.dataset.res = 'timer';
        vt.textContent = resTimerText();
        vi.append(vn, vt);
        v.append(avatar(m), vi);
        box(AFK_CH).appendChild(v);
      } else if (m.isBot) {
        const home = VOICE.find((c) => c.members.includes(m.id));
        if (home) {
          const v = document.createElement('div');
          v.className = 'vc-member';
          v.append(avatar(m), document.createTextNode(m.name));
          box(home).appendChild(v);
        }
      } else if (m.state !== 'offline' && (m.isMe || m.vc !== false)) {
        const v = document.createElement('div');
        v.className = 'vc-member';
        v.append(avatar(m), document.createTextNode(m.name + (m.state === 'idle' ? ' 🌙' : '')));
        box(m.isMe ? (parked ? AFK_CH : cur) : placeChan(m)).appendChild(v);
      }
    });
    chanBoxes.forEach(({ row }, id) => row.classList.toggle('joined', !S.kicked && id === (parked ? AFK_CH.id : cur.id)));
    $('#memberHead').textContent = `ONLINE — ${online}`;
    const dot = $('#meAvatar .dot');
    dot.className = 'dot ' + meState;
    $('#meName').textContent = ME.name;
    const ml = $('#meAvatar');
    if (ml.firstChild && ml.firstChild.nodeType === 3) ml.firstChild.nodeValue = firstCh(ME.name);
    $('#meStatus').textContent = meState === 'idle' ? afkStatusShort() : meState === 'offline' ? 'Kicked' : 'Online';
  }

  function renderInv() {
    const strip = $('#invStrip');
    if (!strip) return;
    strip.textContent = '';
    const t = el('span', 'inv-tokens', `🪙 ${fmtN(tokens)}`);
    t.title = 'Tokens: you earn 1 per 100 points banked. Spend them in the shop.';
    strip.appendChild(t);
    ITEMS.forEach((i) => {
      const n = inv[i.id] || 0;
      const act = !!(S.cons && S.cons[i.id]);
      if (!n && !act) return;
      const c = el('span', 'inv-item' + (act ? ' on' : ''), i.icon + (n > 1 ? `×${n}` : ''));
      c.title = `${i.name}${act ? ' (active this run)' : ''}: ${i.desc}`;
      strip.appendChild(c);
    });
  }

  function afkStatusShort() {
    if (S.inAfkCh) return `In ${chanLabel(AFK_CH)}`;
    if (S.aloneSince != null) return `Alone in VC · ${fmtMins(S.mins - S.aloneSince)}`;
    return 'AFK 🌙';
  }

  function renderChip() {
    const c = $('#serverMode');
    if (!S.mode) { c.hidden = true; return; }
    const t = S.mode === 'afk-timeout';
    c.hidden = false;
    c.className = 'chip ' + (t ? 'timeout' : 'notimeout');
    c.textContent = t ? `⏱ afk-timeout · ${fmtMins(S.threshold)}` : '♾ no-timeout';
    c.title = t ? `A bot moves idle users to the AFK channel after ${fmtMins(S.threshold)}` : 'Nobody moves you automatically, but friends may drag you out';
  }

  function render() {
    $('#hudScore').textContent = fmtN(S.score);
    $('#hudRound').textContent = S.round;
    $('#hudCombo').textContent = 'x' + S.combo;
    $('#hudBest').textContent = fmtN(Math.max(bestScore(), S.score));
    const sus = clamp(S.sus, 0, 100);
    const fill = $('#susFill');
    fill.style.width = sus + '%';
    fill.className = 'sus-fill' + (sus >= 70 ? ' high' : sus >= 35 ? ' mid' : '');
    $('#susPct').textContent = Math.floor(sus) + '%';
    $('.sus-bar').setAttribute('aria-valuenow', String(Math.floor(sus)));

    if (S.phase === 'afk') {
      $('#afkClock').textContent = fmtMins(S.mins);
      $('#afkPending').textContent = `+${fmtN(S.pending)} pending`;
      const late = S.mins / S.promise;
      $('#afkPromise').textContent = S.mins < S.promise
        ? `promised ${fmtMins(S.promise)} · still "on time"`
        : `promised ${fmtMins(S.promise)} · ${late.toFixed(1)}x late`;
      const need = Math.max(S.lastMins * 1.5, S.promise);
      $('#afkCombo').textContent = S.lastMins <= 0
        ? 'Stay out past your promise to start a combo.'
        : S.mins > need
          ? `✓ beat ${fmtMins(need)} → combo x${Math.min(S.combo + 1, 8)} on return`
          : `reach ${fmtMins(need)} to grow combo (x${S.combo} → x${Math.min(S.combo + 1, 8)}), else it resets`;
      const pn = S.path ? S.path.name : '-';
      const cm = modsText(curVc().mods || {});
      $('#afkPath').textContent = `Path: ${pn} · ${S.mode} server${S.mode === 'afk-timeout' ? ` (bot moves you at ${fmtMins(S.threshold)})` : ''}${cm ? ` · ${chanLabel(curVc())}: ${cm}` : ''}`;
      let st = '';
      if (S.inAfkCh && S.autoMoved) st = `${AFK_CH.icon} moved to ${AFK_CH.name} at ${fmtMins(S.movedAt)} · suspicion frozen · points capped at ${fmtN(S.cap)}`;
      else if (S.aloneSince != null) st = `Discord: you've been alone for ${fmtMins(S.mins - S.aloneSince)}`;
      else if (S.path && S.path.events.includes('alone-drift')) st = `friends in ${curVc().name}: ${S.friends.filter(inVcNow).length}/${S.friends.length}`;
      $('#afkStatus').textContent = st;
      $('#meStatus').textContent = afkStatusShort();
      document.title = S.unread ? `(${S.unread}) AFK Simulator` : 'AFK Simulator';
    }
    if (chanDirty) renderChannelList();
    if (S.resident) {
      const tt = resTimerText();
      const ss = resStatus();
      document.querySelectorAll('[data-res]').forEach((n) => {
        const want = n.dataset.res === 'timer' ? tt : ss;
        if (n.textContent !== want) n.textContent = want;
      });
    }
  }

  function toast(title, body, cls = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + cls;
    const b = document.createElement('b');
    b.textContent = meTok(title);
    const s = document.createElement('span');
    s.textContent = meTok(body);
    t.append(b, s);
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  // ---------- flow ----------
  const friend = () => pick(S.friends.filter((f) => !f.away).length ? S.friends.filter((f) => !f.away) : S.friends);

  function start() {
    initAudio();
    reset();
    const bk = BULKS[PK.id];
    if (PK.id !== 'classic' && bk && bk.state === 'loading') {
      bk.toasted = true;
      toast('loading dialog…', 'hand-written lines until the rest arrives');
      ensureBulk(R.packs[PK.id], true);
    }
    closeModal();
    activateConsumables();
    const a = friend();
    later(300, () => post(a, 'yo'));
    later(1100, () => post(friend(), 'whos on tonight'));
    later(1900, () => post(a, '@' + ME.name + ' u on?'));
    later(2700, () => post(ME, 'ye im on'));
    later(3400, () => post(friend(), 'ok we queueing in 2'));
    later(4000, () => { newRound(); offerBrb(); });
  }

  // server mode is rolled once per round
  function newRound() {
    S.mode = pick(MODES);
    S.threshold = pick(THRESHOLDS);
    renderChip();
    // the squad may hop to another voice channel in later rounds (always the first one under ?debug=1 unless locked)
    const prev = S.chan;
    if (!S.chanLock) {
      const roam = !DEBUG && S.round > 1 && VOICE.length > 1 && Math.random() < 0.3;
      S.chan = roam ? pick(VOICE.slice(1)).id : VOICE[0].id;
    }
    if (S.chan !== prev) {
      const c = curVc();
      const mt = modsText(c.mods || {});
      sys(`🔊 the squad moved to ${c.name}${mt ? ` (${mt})` : ''}`);
      renderMembers();
    }
  }

  // the channel you are looking at when you pick the brb is where it is posted
  function brbHint(c) {
    const kind = c.visibility >= 0.65 ? 'busy: everyone notices, pings find you fast, suspicion builds a bit quicker'
      : c.visibility <= 0.4 ? 'quiet: suspicion builds slower, but friends who miss it ping you all over the place'
        : 'middling: some notice, some do not';
    return `${kind}${c.muted ? ' · muted (pings reach you late)' : ''}${c.slowmodeSec ? ` · slowmode ${c.slowmodeSec}s` : ''}. Click another channel to say it there.`;
  }
  function offerBrb() {
    S.phase = 'chat';
    const opts = pickOptions(BRB, 'brb', deriveBrb, 3);
    setCtx((noFocus) => {
      const c = activeCh();
      setActions(`SAY BRB IN ${labelOf(c).toUpperCase()} (then actually leave)`, opts.map((o) => ({
        label: o.t,
        sub: `promise ${fmtMins(o.p)} · x${o.m} pts (short promise = bigger multiplier)`,
        fn: () => chooseBrb(o),
      })), { label: `🛒 Shop · ${fmtN(tokens)} 🪙`, fn: openShop }, { noFocus, hint: brbHint(c) });
    });
  }

  function chooseBrb(o) {
    S.phase = 'leaving';
    S.brbCh = S.active;
    S.brbN[S.brbCh] = (S.brbN[S.brbCh] || 0) + 1;
    post(ME, o.t, { ch: S.brbCh });
    S.promise = o.p;
    S.mult = o.m;
    later(700, () => {
      const f = friend();
      post(f, speak(f, 'ok'));
      offerPath();
    });
  }

  const pathPool = () => {
    const pool = PATHS.filter((p) => !Array.isArray(p.modes) || p.modes.includes(S.mode));
    return pool.length ? pool : [PATHS.find((p) => !Array.isArray(p.modes)) || FALLBACK_PATH];
  };
  const pathSub = (p) => `${p.desc || ''} · x${p.pointMult}${p.pointGrow ? '+' : ''} pts · ${p.risk || (p.susMult < 0.8 ? 'low suspicion' : p.susMult > 1.1 ? 'high kick risk' : 'normal suspicion')}`;

  function offerPath() {
    S.phase = 'path';
    const modeTxt = S.mode === 'afk-timeout'
      ? `afk-timeout server this round: a bot moves you to the AFK channel after ${fmtMins(S.threshold)}`
      : 'no-timeout server this round: nobody moves you, unless a friend drags you out';
    const opts = shuffle(pathPool()).slice(0, 3);
    setActions(`WHERE DO YOU GO AFK? · ${modeTxt}`, opts.map((p) => ({
      label: p.name,
      sub: pathSub(p),
      fn: () => choosePath(p),
    })));
  }

  function choosePath(p) {
    S.path = p;
    S.phase = 'leaving';
    sys(`${ME.name} is going AFK: ${p.name} (${S.mode} server)`);
    later(500, goAfk);
  }

  function goAfk() {
    S.phase = 'afk';
    S.mins = 0;
    S.overReal = 0;
    S.pending = 0;
    S.voted = false;
    S.unread = 0;
    S.moved = 0;
    S.inAfkCh = false;
    S.autoMoved = false;
    S.dragged = false;
    S.movedAt = 0;
    S.cap = Infinity;
    S.dragMin = 0;
    S.aloneSince = null;
    S.flavor = '';
    S.fightPings = 0;
    S.lastFight = -99;
    S.pings = [];
    S.follows = 0;
    S.lor = null;
    S.tri = null;
    chanDirty = true;
    S.friends.forEach((f) => { f.vc = true; });
    $('.afk-hint').textContent = matchMedia('(pointer:coarse)').matches
      ? 'Touch nothing. Any tap = you\'re back. Go outside. Or don\'t, we both know you won\'t.'
      : 'Do not touch anything. Go outside. Or don\'t, we both know you won\'t. Any key, click or mouse move = you\'re back.';
    S.afkAt = performance.now();
    S.armed = false;
    later(1200, () => { S.armed = true; });
    document.body.classList.add('afk');
    $('#afkPanel').hidden = false;
    $('#composerText').textContent = `${ME.name} is typing... (he is not)`;
    renderChannelList();
    renderMembers();
    render();
  }

  const vcFriend = () => {
    const v = S.friends.filter((f) => !f.away && inVcNow(f));
    return v.length ? pick(v) : friend();
  };
  const basePps = (over) => 6 * S.mult * (1 + S.mins / 25) * (1 + 0.2 * (S.round - 1)) * (over ? 2 : 1);

  function afkStep(dt) {
    const P = S.path || PATHS[0];
    const M = getMods();
    S.resT += dt * (1 + S.mins / 20); // the resident's clock keeps running even while yours is frozen
    if (S.inAfkCh) {
      // parked in the afk channel: time and suspicion are frozen, points creep up to the cap
      const room = S.cap - S.pending;
      if (room > 0) S.pending += Math.min(room, basePps(S.mins >= S.promise) * P.pointMult * M.pointMult * dt);
      if (S.resident && Math.random() < 0.05 * dt) residentSay();
      return;
    }
    // in-game clock accelerates the longer you're gone
    const dm = dt * (1 + S.mins / 20);
    S.mins += dm;
    S.clock += dm;
    const h = Math.min(S.mins / 60, 4);
    const pm = P.pointMult + (P.pointGrow || 0) * h;
    const sm = P.susMult + (P.susGrow || 0) * h;

    const late = S.mins >= S.promise;
    const over = S.mins >= S.promise + M.graceMins; // grace minutes (items) delay when friends start counting
    const base = 0.35 + 0.08 * S.round;
    let rate;
    if (!over) {
      rate = base * 0.6;
    } else {
      S.overReal += dt;
      rate = base * 1.6 * (1 + S.overReal / 12) * (1 + 0.15 * Math.log2(Math.max(1, S.mins / S.promise)));
    }
    // a quiet brb channel is a bit slower to get noticed, a busy one a bit faster (general = baseline)
    S.sus += rate * sm * M.susMult * (1 + 0.25 * (brbVis() - CT.visMid)) * dt;
    deliverMuted();

    S.pending += basePps(late) * pm * M.pointMult * dt;
    packChatter(dm);
    if (S.mins >= 500) unlockAch('30k');

    if (!over) {
      if (Math.random() < 0.05 * dt) { const cid = weightedCh(); const f = friendIn(cid); post(f, speak(f, 'chill'), { ch: cid }); }
    } else {
      if (Math.random() < (0.12 + S.sus / 300) * (1 + 0.5 * (brbVis() - CT.visMid)) * dt) {
        const tier = S.sus < 35 ? 'low' : S.sus < 70 ? 'mid' : 'high';
        // friends spread out: the brb channel is the likeliest, but any channel can get the ping
        const cid = weightedCh();
        const f = friendIn(cid);
        let line = meTok(tier === 'low' ? speak(f, 'low') : digOrSay(f, tier));
        if (!mentionRe().test(line) && Math.random() < 0.45) line = '@' + ME.name + ' ' + line;
        post(f, line, { ch: cid, weight: tier === 'low' ? 0.8 : tier === 'mid' ? 1.1 : 1.4 });
      }
      // an ignored ping gets a follow-up somewhere else ("did you see my message in #x??")
      if (S.follows < CT.follows && TEXT.length > 1 && Math.random() < 0.2 * dt) {
        const p0 = S.pings.find((p) => !p.answered && !p.followed && !p.isFollow && S.mins - p.minsAtSend > 6);
        if (p0) {
          p0.followed = true;
          S.follows++;
          const cid = weightedCh(p0.ch);
          const f = friendIn(cid, p0.from);
          post(f, pick(FOLLOWUPS).replace('{ch}', labelOf(textById(p0.ch))), { ch: cid, weight: 0.9, follow: true });
        }
      }
      if (!S.voted && S.sus > 65 && Math.random() < 0.04 * dt) {
        S.voted = true;
        S.sus += 6;
        sys(`🗳️ ${friend().name} started a vote to kick ${ME.name} (2/5)`, 'bad');
        sfx.bad();
      }
      if (Math.random() < 0.012 * dt) {
        const f = friend();
        if (!f.away) {
          f.away = true;
          post(f, 'lowkey ima get food too brb');
          S.sus = Math.max(0, S.sus - 6);
          renderMembers();
          later(rand(5000, 9000), () => {
            f.away = false;
            if (!S.kicked) post(f, 'back');
            renderMembers();
          });
        }
      }
    }
    if (S.sus >= 100) { kicked(PK.id === 'classic' ? 'the boys ran out of patience' : 'the org ran out of patience'); return; }
    if (S.mode === 'afk-timeout' && S.mins >= S.threshold) { moveToAfk(); return; }
    if (S.mode === 'no-timeout') {
      let k = 0;
      while (S.dragMin < Math.floor(S.mins) && k++ < 30) {
        S.dragMin++;
        if (S.dragMin >= 2 && Math.random() < dragChance()) { dragOut(); return; }
      }
      if (S.dragMin < Math.floor(S.mins)) S.dragMin = Math.floor(S.mins);
    }
    pathEvents(P, dt, h, M);
  }

  // chance per game minute that a friend drags you to the AFK channel (no-timeout only).
  // grows with friends in VC, suspicion and time; ~1.5%/min at 5 friends, 30% sus, 2h in.
  function dragChance() {
    const n = S.friends.filter((f) => !f.away && inVcNow(f)).length;
    if (!n) return 0;
    return Math.min(0.25, 0.0016 * Math.pow(n, 0.9) * (1 + S.sus / 50) * (1 + S.mins / 360));
  }

  function moveToAfk() {
    S.inAfkCh = true;
    S.autoMoved = true;
    S.movedAt = S.mins;
    S.cap = S.pending * 1.5;
    sys('You have been moved to the AFK channel', 'bad');
    post(friend(), pLine('moved', 'rip'));
    sfx.bad();
    renderMembers();
    roommate();
  }

  function dragOut() {
    const f = vcFriend();
    S.phase = 'judging';
    S.dragged = true;
    S.inAfkCh = true;
    const susBefore = S.sus;
    roommate();
    endAfkUI();
    sys(`${f.name} moved you to the AFK channel`, 'bad');
    sfx.bad();
    post(f, pLine('drag', 'gotcha'));
    sys(`${ME.name} was dragged out after ${fmtMins(S.mins)} (promised ${fmtMins(S.promise)})`);
    returnChatter();
    // dragged, not negligent: no triage, half the left-on-read penalty
    settleMuted();
    const dragged = S.pings.filter((p) => !p.forgiven);
    if (dragged.length) applyLor(lorPenalty(dragged, 0.5), 0, S.active);
    S.record = false;
    bank(FORCED, susBefore, 1);
    if (S.record) later(700, () => post(friend(), lineOr('hype', 'new record!!')));
    later(1800, nextRound);
  }

  function pathEvents(P, dt, h, M) {
    if (Array.isArray(P.modes) && !P.modes.includes(S.mode)) return;
    const mic = P.events.filter((id) => PEVENTS[id]);
    if (mic.length && Math.random() < 0.03 * M.micEventChance * (1 + h / 2) * dt) micEvent(pick(mic));
    if (P.events.includes('alone-drift')) aloneStep(dt);
  }

  function micEvent(id) {
    const ev = PEVENTS[id];
    const lo = Array.isArray(ev.sus) ? ev.sus[0] : 2;
    const hi = Array.isArray(ev.sus) ? ev.sus[1] : 5;
    S.sus = Math.min(100, S.sus + rand(lo, hi));
    sys(`🎙️ mic: ${ev.label || id}`);
    post(vcFriend(), mixLine('micEvent', Array.isArray(ev.lines) && ev.lines.length ? () => pick(ev.lines) : null) || '...');
    if (S.path && S.path.id === 'hot-mic' && S.mins >= 30 && (id === 'flush' || id === 'chewing')) {
      S.elevator = true;
      unlockAch('elevator-of-doom');
    }
    if (ev.funny && Math.random() < 0.5) {
      const b = Math.round((ev.bonus || 20) * (1 + 0.2 * (S.round - 1)));
      S.pending += b;
      const rd = S.round;
      later(600, () => {
        if (S.phase !== 'afk' || S.round !== rd) return;
        post(vcFriend(), pLine('clipped', 'chat clipped it'));
        toast('🎬 chat clipped it', `+${b} bonus pending pts`);
      });
    }
  }

  function aloneStep(dt) {
    if (S.mins > 1) {
      S.friends.forEach((f) => {
        if (inVcNow(f) && !f.away && Math.random() < 0.03 * dt) {
          f.vc = false;
          f.backAt = S.mins + rand(25, 120);
          post(f, pLine('aloneLeave', 'bye'));
          sys(`${f.name} left ${curVc().name}`);
          renderMembers();
        } else if (f.vc === false && S.mins >= f.backAt) {
          f.vc = true;
          post(f, pLine('aloneJoin', 'back'));
          sys(`${f.name} joined ${curVc().name}`);
          renderMembers();
        }
      });
    }
    const inVc = S.friends.filter(inVcNow).length;
    if (inVc === 0 && S.aloneSince == null) {
      S.aloneSince = S.mins;
      sys(`Discord: you're the only one left in ${curVc().name}`);
      renderMembers();
    } else if (inVc > 0 && S.aloneSince != null) {
      S.aloneSince = null;
      renderMembers();
    }
  }

  // shared teardown when an AFK run ends (manual return or forced drag)
  function endAfkUI() {
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    $('#composerText').textContent = composerIdle();
    document.title = 'AFK Simulator';
    S.unread = 0;
    chanDirty = true;
    S.aloneSince = null;
    S.friends.forEach((f) => { f.vc = true; });
    renderMembers();
  }

  function comeBack() {
    if (S.phase !== 'afk') return;
    if (!S.armed || performance.now() - S.afkAt < 1200) return; // grace for the click that sent you AFK
    S.phase = 'excuse';
    const wasMoved = S.autoMoved;
    S.inAfkCh = false;
    endAfkUI();
    settleMuted();
    const owed = owedPings();
    if (owed.length) S.phase = 'triage';
    // back at the scene of the crime
    if (S.brbCh && S.brbCh !== S.active) switchChannel(S.brbCh, { force: true });
    else { const st = S.ch[S.active]; st.unread = 0; st.mentions = 0; renderChannelList(); }
    sys(`${ME.name} returned after ${fmtMins(S.mins)} (promised ${fmtMins(S.promise)})`);
    if (!owed.length) returnChatter(); // with pings owed it runs after triage, when we know what was left on read
    if (wasMoved) {
      sys(`⏱ you were moved to AFK at ${fmtMins(S.movedAt)}`, 'good');
      toast('Moved to AFK', `you were moved to AFK at ${fmtMins(S.movedAt)}`);
    }
    if (owed.length) startTriage(); else offerExcuse();
  }

  function chooseExcuse(e) {
    S.phase = 'judging';
    const exCh = S.active;
    S.brbCh = exCh; // the rest of the round (reaction, bank line) lands where you answered
    post(ME, e.t, { ch: exCh });
    if (!e.quiet) stampSlow(exCh);
    const susBefore = S.sus;
    const key = e.k || e.t;
    const uses = S.uses[key] || 0;
    S.uses[key] = uses + 1;
    let roll = rand(e.r[0], e.r[1]) * Math.pow(0.55, uses);
    if (!e.quiet) roll += getMods().excuseBonus;
    const busted = !e.quiet && uses > 0 && Math.random() < 0.45;
    if (busted) roll = -rand(10, 25);
    S.sus = clamp(S.sus - roll, 0, 100);
    const early = S.mins < S.promise;

    S.record = false;
    later(800, () => {
      const f = friend();
      let line;
      if (early) line = speak(f, 'early');
      else if (busted) line = speak(f, 'reused');
      else if (roll >= 22) line = speak(f, 'good');
      else if (roll >= 8) line = speak(f, 'meh');
      else line = speak(f, 'bad');
      post(f, line, { ch: exCh });
      bank(e, susBefore, S.sus >= 100 ? 0.5 : 1);
      if (S.record && S.sus < 100) later(700, () => post(friend(), lineOr('hype', 'new record!!'), { ch: exCh }));
      if (S.sus >= 100) {
        later(900, () => kicked('your excuse made it worse'));
      } else {
        later(1600, nextRound);
      }
    });
  }

  function bank(e, susBefore, factor = 1) {
    const mins = S.mins;
    const parts = [];
    if (S.lor && S.lor.count) parts.push(`left on read x${S.lor.count} ${S.lor.d >= 0 ? '+' : '-'}${Math.abs(S.lor.d)}% sus`);
    S.lor = null;
    let base = S.pending * factor;
    if (factor < 1) parts.push('kicked mid-excuse ×0.5');
    parts.push(`AFK points ${fmtN(base)}`);
    if (mins < S.promise && !e.forced) { base *= 0.25; parts.push('came back early ×0.25'); }
    if (e.quiet) { base *= 1.25; parts.push('no-excuse confidence ×1.25'); }

    if (mins > S.lastMins * 1.5 && mins >= S.promise) S.combo = Math.min(S.combo + 1, 8);
    else { S.combo = 1; parts.push('combo reset'); }
    let total = base * S.combo;
    if (S.combo > 1) parts.push(`combo ×${S.combo}`);
    if (S.autoMoved) {
      const b = 30 + 10 * S.round;
      total += b;
      parts.push(`safe but boring +${b}`);
    }

    if (mins > Math.max(S.promise, 5)) {
      const lie = Math.round(40 * Math.log2(mins / Math.max(S.promise, 5))) * S.round;
      total += lie;
      parts.push(`lie bonus +${fmtN(lie)}`);
    }
    const record = store.get('longest', 0);
    if (mins > record * 1.1) {
      total += 250;
      store.set('longest', mins);
      parts.push('NEW AFK RECORD +250');
      S.record = true;
    }
    S.flavor = '';
    if (e.forced) {
      if (susBefore > 70) {
        const b = 30 * S.round;
        total += b;
        S.flavor = 'caught';
        parts.push(`caught red-handed +${b}`);
      } else {
        const b = 60 * S.round * (mins > record ? 2 : 1);
        total += b;
        S.flavor = 'clutch';
        parts.push(`clutch${mins > record ? ' (record pace)' : ''} +${b}`);
      }
    }
    total = Math.round(total);
    S.score += total;
    S.banked += total;
    const newTok = Math.floor(S.banked / 100) - S.tokAwarded;
    if (newTok > 0) { S.tokAwarded += newTok; addTokens(newTok); parts.push(`+${newTok} 🪙`); }
    S.lastMins = mins;
    if (mins > S.longest) { S.longestPath = S.path ? S.path.name : ''; S.longestMode = S.mode || ''; }
    S.longest = Math.max(S.longest, mins);
    S.pending = 0;
    sfx.cash();
    toast(`+${fmtN(total)} pts`, parts.join('\n'));
    sys(`💰 +${fmtN(total)} pts banked${S.combo > 1 ? ` (x${S.combo} combo)` : ''}${S.flavor ? ` · ${S.flavor.toUpperCase()}` : ''}`, 'good');
    try {
      checkAch({ mins, promise: S.promise, susBefore, susAfter: S.sus, combo: S.combo, path: S.path ? S.path.id : '', autoMoved: S.autoMoved, dragged: S.dragged, roommates: Number(store.get('roommates', 0)) || 0, cons: S.cons, elevator: S.elevator, fightMissed: S.fightMissed, idrisJabs: S.idrisJabs });
    } catch { /* bad stored data */ }
    render();
  }

  function nextRound() {
    S.round++;
    S.sus = Math.max(0, S.sus - (S.mins >= S.promise ? 8 : 3));
    S.clock += 2;
    S.inAfkCh = false;
    newRound();
    renderMembers();
    S.pings = [];
    S.lor = null;
    const af = friend();
    post(af, speak(af, 'ask'), { ch: S.active });
    later(900, offerBrb);
  }

  function kicked(reason) {
    if (S.kicked) return;
    S.kicked = true;
    S.phase = 'over';
    S.tri = null;
    chanDirty = true;
    S.sus = 100;
    S.pending = 0;
    S.aloneSince = null;
    S.friends.forEach((f) => { f.vc = true; });
    clearActions();
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    $('#composerText').textContent = 'You do not have permission to send messages in this channel.';
    document.title = 'KICKED · AFK Simulator';
    const k = friend();
    sys(`👢 ${k.name} kicked ${ME.name} from the server.`, 'bad');
    sfx.bad();
    renderMembers();
    render();
    const isBest = saveScore();
    later(900, () => { const kf = friend(); post(kf, kickDig(kf) || speak(kf, 'kickAfter')); });
    later(2200, () => showGameOver(reason, isBest));
  }

  // ---------- persistence ----------
  function getScores() {
    const s = store.get('scores', []);
    return Array.isArray(s) ? s.filter((x) => x && typeof x.s === 'number').sort((a, b) => b.s - a.s) : [];
  }
  function bestScore() {
    const s = getScores();
    return s.length ? s[0].s : 0;
  }
  function saveScore() {
    const prevBest = bestScore();
    let scores = getScores();
    const entry = { k: packId, name: ME.name, s: S.score, r: S.round, l: Math.floor(S.longest), p: S.longestPath || '', m: S.longestMode || '', d: new Date().toISOString().slice(0, 10) };
    const fav = favCh();
    if (fav) entry.f = fav;
    scores.push(entry);
    scores.sort((a, b) => b.s - a.s);
    store.set('scores', scores.slice(0, 10));
    return S.score > prevBest && S.score > 0;
  }
  // the channel you said brb in most this run (optional field on saved scores)
  const CH_ID = /^[a-z0-9_-]{1,32}$/i;
  function favCh() {
    let best = '';
    let n = 0;
    Object.keys(S.brbN || {}).forEach((id) => { if (S.brbN[id] > n && CH_ID.test(id)) { best = id; n = S.brbN[id]; } });
    return best;
  }
  function unlockAch(id) {
    const a = ACH[id];
    if (!a) return;
    let got = store.get('ach', {});
    if (!got || typeof got !== 'object') got = {};
    if (got[id]) return;
    got[id] = true;
    store.set('ach', got);
    toast(`🏆 ${a.name}`, a.desc, 'ach');
  }
  function checkAch(r) {
    let got = store.get('ach', {});
    if (!got || typeof got !== 'object') got = {};
    Object.entries(ACH).forEach(([id, a]) => {
      if (!got[id] && a.test(r)) {
        got[id] = true;
        toast(`🏆 ${a.name}`, a.desc, 'ach');
      }
    });
    store.set('ach', got);
  }

  // ---------- modals ----------
  function el(tag, cls, text, id) {
    const e = document.createElement(tag);
    if (id) e.id = id;
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function scoresTable(full) {
    const scores = getScores();
    const wrap = document.createDocumentFragment();
    wrap.appendChild(el('h3', '', full ? 'LEADERBOARD (TOP 10)' : 'HIGH SCORES'));
    if (!scores.length) {
      wrap.appendChild(el('p', 'tag', 'No scores yet. Go be irresponsible.'));
      return wrap;
    }
    const t = el('table', 'scores');
    scores.slice(0, full ? 10 : 5).forEach((s, i) => {
      const tr = el('tr');
      tr.append(el('td', '', `#${i + 1}`), el('td', '', sanitizeName(s.name)), el('td', 'n', fmtN(s.s)), el('td', '', `r${s.r}`), el('td', '', fmtMins(s.l || 0)), el('td', '', String(s.d || '')));
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    return wrap;
  }
  function achList() {
    let got = store.get('ach', {});
    if (!got || typeof got !== 'object') got = {};
    const wrap = document.createDocumentFragment();
    wrap.appendChild(el('h3', '', `ACHIEVEMENTS ${Object.keys(got).length}/${Object.keys(ACH).length}`));
    const box = el('div', 'achs');
    Object.entries(ACH).forEach(([id, a]) => {
      const c = el('span', 'ach' + (got[id] ? ' got' : ''), (got[id] ? '🏆 ' : '🔒 ') + a.name);
      c.title = a.desc;
      box.appendChild(c);
    });
    wrap.appendChild(box);
    return wrap;
  }
  let modalKind = 'main';
  let modalReturn = null;
  let prevView = null;
  let modalOpener = null;
  function openModal(nodes, kind = 'main') {
    if ($('#modal').hidden) { const a = document.activeElement; modalOpener = a && a !== document.body ? a : null; }
    modalKind = kind;
    if (kind === 'main') prevView = null;
    const card = $('#modalCard');
    card.textContent = '';
    nodes.forEach((n) => card.appendChild(n));
    $('#modal').hidden = false;
    $('#app').inert = true;
    const btn = card.querySelector('input, .btn');
    if (btn) btn.focus();
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#app').inert = false;
    modalKind = 'main';
    prevView = null;
    const o = modalOpener;
    modalOpener = null;
    if (o && o.isConnected && !o.disabled && typeof o.focus === 'function') o.focus();
  }
  // settings/leaderboard may sit on top of start/gameover: closing restores that view
  function closeOverlay() {
    const back = prevView;
    prevView = null;
    if (back) back(); else closeModal();
  }
  function openOverlay(kind, nodes) {
    if (modalKind === 'main' && !$('#modal').hidden) prevView = modalReturn;
    else if ($('#modal').hidden) prevView = null;
    openModal(nodes, kind);
  }

  // ---------- share ----------
  const SITE_URL = 'https://afksim.zed.tools';
  function achCount() {
    const got = store.get('ach', {});
    return got && typeof got === 'object' ? Object.keys(got).length : 0;
  }
  function shareText(e) {
    const x = e || { name: ME.name, s: S.score, r: S.round, l: S.longest, c: S.combo, p: S.longestPath, m: S.longestMode, k: packId, f: favCh() };
    const pm = x.k && x.k !== 'classic' ? metaOf(x.k) : null;
    const inSrv = pm ? `in ${escMd(pm.server && pm.server.name ? pm.server.name : pm.name)} · ` : '';
    const via = x.p && typeof x.p === 'string'
      ? ` · via ${escMd(x.p.slice(0, 24).toLowerCase())}${MODES.includes(x.m) ? `, ${x.m} server` : ''}`
      : '';
    const fav = typeof x.f === 'string' && CH_ID.test(x.f) ? ` · fav #${escMd(x.f.slice(0, 24))}` : '';
    return `**${escMd(x.name)}** got **${fmtN(x.s)}** pts in AFK Simulator 💤\n${inSrv}round ${x.r} · longest AFK ${fmtMins(x.l || 0)}${via}${x.c ? ` · x${x.c} combo` : ''}${fav} · ${achCount()}/${Object.keys(ACH).length} achievements${itemCount() ? ` · ${itemCount()} item${itemCount() === 1 ? '' : 's'}` : ''}\n${SITE_URL}`;
  }
  function copyText(text) {
    const done = () => toast('Copied', 'Paste it in Discord.');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      if (ok) done(); else toast('Copy failed', 'Select and copy manually.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch { fallback(); }
    } else fallback();
  }
  function shareButtons(getEntry) {
    const row = el('div', 'btn-row');
    const c = el('button', 'btn alt', 'Copy for Discord');
    c.addEventListener('click', () => copyText(shareText(getEntry())));
    row.appendChild(c);
    if (typeof navigator.share === 'function') {
      const sh = el('button', 'btn alt', 'Share…');
      sh.addEventListener('click', () => {
        Promise.resolve(navigator.share({ text: shareText(getEntry()) })).catch(() => { /* cancelled */ });
      });
      row.appendChild(sh);
    }
    return row;
  }

  // ---------- settings / leaderboard ----------
  // pack picker: 'The Boys (classic)' vs installed packs. onDone runs after the switch so the caller can redraw.
  function packPicker(onDone) {
    const box = el('div', 'pack-picker');
    PACKLIST.forEach((pk) => {
      const b = el('button', 'btn alt pack-btn', pk.name);
      b.dataset.pack = pk.id;
      b.setAttribute('aria-pressed', String(pk.id === packId));
      b.addEventListener('click', () => {
        if (pk.id === packId) return;
        setPack(pk.id, () => {
          modalReturn = showStart;
          prevView = showStart; // the old start/game-over view belongs to the previous run
          onDone();
        });
      });
      box.appendChild(b);
    });
    return box;
  }
  function showSettings() {
    const input = el('input', 'name-input', null, 'nameInput');
    input.type = 'text';
    input.maxLength = 16;
    input.value = ME.name;
    input.autocomplete = 'off';
    const lab = el('label', 'field-label', 'Your handle (max 16 chars)');
    lab.htmlFor = 'nameInput';
    const apply = () => setName(input.value);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
    input.addEventListener('change', apply);
    const themeBox = el('div', 'theme-picker');
    THEMES.forEach((t) => {
      const b = el('button', 'btn alt theme-btn', t.name);
      b.dataset.theme = t.id;
      b.setAttribute('aria-pressed', String(t.id === theme));
      b.addEventListener('click', () => {
        theme = applyTheme(t.id);
        store.set('theme', theme);
        themeBox.querySelectorAll('.theme-btn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.theme === theme)));
      });
      themeBox.appendChild(b);
    });
    const done = el('button', 'btn', 'Done');
    done.addEventListener('click', () => { apply(); closeOverlay(); });
    const nodes = [el('h1', '', '⚙️ Settings', 'modalTitle'), lab, input, el('h3', '', 'THEME'), themeBox];
    if (PACKLIST.length > 1) {
      nodes.push(el('h3', '', 'SERVER PACK'), packPicker(() => { setName(input.value); showSettings(); }), el('p', 'pack-note', 'Switching packs starts a fresh run. Score and achievements carry over.'));
    }
    nodes.push(done);
    openOverlay('settings', nodes);
  }
  function setName(v) {
    const n = sanitizeName(v);
    const inp = $('#nameInput');
    if (inp && inp.value !== n) inp.value = n;
    if (n === ME.name) return;
    ME.name = n;
    store.set('name', n);
    renderMembers();
    if (S.phase === 'afk') $('#composerText').textContent = `${n} is typing... (he is not)`;
    const b = $('#startBtn');
    if (b) b.textContent = `Log in as ${n}`;
  }
  function showLeaderboard() {
    const scores = getScores();
    const nodes = [el('h1', '', '🏆 Leaderboard', 'modalTitle'), scoresTable(true)];
    if (scores.length) {
      nodes.push(shareButtons(() => {
        const b = getScores()[0];
        return { name: sanitizeName(b.name), s: b.s, r: b.r, l: b.l, c: 0, p: b.p, m: b.m, k: b.k };
      }));
      const clr = el('button', 'btn danger', 'Clear leaderboard');
      let armed = false;
      let timer = 0;
      clr.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          clr.textContent = 'Click again to confirm';
          timer = setTimeout(() => { armed = false; clr.textContent = 'Clear leaderboard'; }, 4000);
          return;
        }
        clearTimeout(timer);
        store.set('scores', []);
        render();
        showLeaderboard();
      });
      nodes.push(clr);
    }
    const back = el('button', 'btn', 'Close');
    back.addEventListener('click', closeOverlay);
    nodes.push(back);
    openOverlay('leaderboard', nodes);
  }
  function showShop() {
    const nodes = [
      el('h1', '', '🛒 Shop', 'modalTitle'),
      el('p', 'tag', `🪙 ${fmtN(tokens)} tokens. You earn 1 per 100 points banked. Consumables are used up when your next run starts.`),
    ];
    if (!ITEMS.length) nodes.push(el('p', 'tag', 'The shop is empty. Add items in content/items.js.'));
    const box = el('div', 'shop');
    ITEMS.forEach((i) => {
      const have = inv[i.id] || 0;
      const full = have >= itemMax(i);
      const row = el('div', 'shop-item');
      const info = el('div', 'shop-info');
      info.append(
        el('div', 'shop-name', `${i.icon} ${i.name}`),
        el('div', 'shop-desc', i.desc),
        el('div', 'shop-meta', `${i.consumable ? 'consumable (next run)' : 'permanent'} · owned ${have}/${itemMax(i)}`),
      );
      const b = el('button', 'btn alt shop-buy', full ? 'Owned' : `Buy · ${i.price} 🪙`);
      b.dataset.item = i.id;
      b.disabled = full || tokens < i.price;
      b.addEventListener('click', () => { buyItem(i.id); showShop(); });
      row.append(info, b);
      box.appendChild(row);
    });
    nodes.push(box);
    const done = el('button', 'btn', 'Done');
    done.addEventListener('click', closeOverlay);
    nodes.push(done);
    openOverlay('shop', nodes);
  }
  function openShop() {
    if (S.phase === 'afk' || S.phase === 'leaving' || S.phase === 'judging') return;
    initAudio();
    showShop();
  }

  function overlayLinks() {
    const row = el('div', 'btn-row');
    const lb = el('button', 'btn alt', '🏆 Leaderboard');
    lb.addEventListener('click', showLeaderboard);
    const sh = el('button', 'btn alt', '🛒 Shop');
    sh.addEventListener('click', showShop);
    const st = el('button', 'btn alt', '⚙️ Settings');
    st.addEventListener('click', showSettings);
    row.append(lb, sh, st);
    return row;
  }

  function showStart() {
    const ul = el('ul');
    [
      'Pick a brb, then pick a path: where you go AFK (walk away, muted, hot mic, alone in VC, fell asleep). Actually leave, touch nothing. Come back to bank points; too long and you get kicked and lose it all.',
      'Each round the server is afk-timeout (a bot parks you in the AFK channel: safe, capped) or no-timeout (friends may drag you out). Some paths only exist in no-timeout.',
      'Each AFK much longer than the last grows your combo. Reused excuses get called out.',
      'Banked points also earn tokens (1 per 100 pts) to spend in the 🛒 shop. Items stay yours between runs.',
      'Press 1/2/3 to pick options. Want your own friends, channels or items? Edit the files in content/ (see CONTENT.md).',
    ].forEach((t) => ul.appendChild(el('li', '', t)));
    const btn = el('button', 'btn', `Log in as ${ME.name}`, 'startBtn');
    btn.addEventListener('click', start);
    modalReturn = showStart;
    const head = [el('h1', '', '💤 AFK Simulator', 'modalTitle'), el('p', 'tag', `You are ${ME.name}. Say brb. Don't come back.`)];
    if (PACKLIST.length > 1) {
      head.push(el('h3', '', 'SERVER'), packPicker(showStart));
      const pkMeta = R.packs && R.packs[packId];
      if (pkMeta && pkMeta.server.tagline) head.push(el('p', 'pack-note', pkMeta.server.tagline));
    }
    openModal(head.concat([ul, scoresTable(), achList(), overlayLinks(), btn]));
  }

  function showGameOver(reason, isBest) {
    const nameInp = $('#nameInput');
    if (nameInp && !$('#modal').hidden) setName(nameInp.value);
    const stats = el('div', 'stats');
    [
      [fmtN(S.score), 'final score'],
      [String(S.round), 'round reached'],
      [fmtMins(S.longest), 'longest AFK'],
      ['x' + S.combo, 'last combo'],
    ].forEach(([v, l]) => {
      const s = el('div', 'stat');
      s.append(el('div', 'v', v), el('div', 'l', l));
      stats.appendChild(s);
    });
    const btn = el('button', 'btn', 'Rejoin with alt account');
    btn.addEventListener('click', start);
    modalReturn = () => showGameOver(reason, isBest);
    openModal([
      el('h1', 'bad', '👢 KICKED FROM SERVER', 'modalTitle'),
      el('p', 'tag', `${isBest ? '🏆 NEW HIGH SCORE! ' : ''}${meTok(lineOr('kickReason', `Reason: ${reason}.`))}`),
      stats, scoresTable(), achList(), shareButtons(() => null), overlayLinks(), btn,
    ]);
  }

  // ---------- input ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden && (modalKind === 'settings' || modalKind === 'leaderboard' || modalKind === 'shop')) {
      const inp = $('#nameInput');
      if (inp) setName(inp.value);
      closeOverlay();
      return;
    }
    // channel hotkeys (not while AFK, where any key wakes you): Alt+Up/Down = prev/next, plus Shift = prev/next unread
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && S.phase !== 'afk' && canSwitch()) {
      e.preventDefault();
      stepChannel(e.key === 'ArrowDown' ? 1 : -1, e.shiftKey);
      return;
    }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    swallow = false;
    if (S.phase === 'afk') { comeBack(); swallow = S.phase !== 'afk'; return; }
    if (!$('#modal').hidden) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea')) return;
    const b = document.querySelector(`.choice[data-key="${e.key}"]`);
    if (b) b.click();
  });
  document.addEventListener('pointerdown', () => {
    const was = S.phase === 'afk';
    swallow = false;
    comeBack();
    swallow = was && S.phase !== 'afk';
  });
  document.addEventListener('mousemove', (e) => {
    if (S.phase !== 'afk') return;
    if (!S.armed || performance.now() - S.afkAt < 1200) return;
    S.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (S.moved > 80) comeBack();
  });

  $('#textChans').addEventListener('keydown', chanNavKey);
  $('#chanBar').addEventListener('keydown', chanNavKey);

  const muteBtn = $('#muteBtn');
  const syncMute = () => { muteBtn.textContent = muted ? '🔕' : '🔔'; };
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    muted = !muted;
    store.set('muted', muted);
    syncMute();
  });
  syncMute();
  const openSettings = (e) => { if (e) e.stopPropagation(); if (S.phase === 'afk' || S.phase === 'leaving' || S.phase === 'judging' || S.phase === 'triage') return; initAudio(); showSettings(); };
  $('#gearBtn').addEventListener('click', openSettings);
  $('#shopBtn').addEventListener('click', (e) => { e.stopPropagation(); openShop(); });
  $('#meName').addEventListener('click', openSettings);
  $('#meName').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openSettings(); } });

  // ---------- loop ----------
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    let dt = Math.min((now - last) / 1000, 600); // background tabs throttle; integrate in substeps
    last = now;
    catchingUp = dt > 1;
    while (dt > 0 && S.phase === 'afk') {
      const step = Math.min(dt, 0.1);
      afkStep(step);
      dt -= step;
    }
    catchingUp = false;
    render();
  }, 100);

  {
    const want = store.get('pack', 'classic');
    const meta = typeof want === 'string' ? metaOf(want) : null;
    applyPack(meta && packReady(meta.id) ? meta.id : 'classic');
    // a stored pack whose files are not in index.html loads now (after first paint) and swaps in if the player has not started
    if (meta && !meta.builtin && !packReady(meta.id)) {
      whenIdle(() => loadPackCore(meta).then(() => {
        if (userPack || S.phase !== 'intro' || packId !== 'classic') return;
        applyPack(meta.id); reset(); render();
        if ($('#modal').hidden || modalKind === 'main') showStart(); // never replace Settings/Leaderboard/Shop
      }, () => { /* stays on classic */ }));
    }
  }
  reset();
  render();
  showStart();

  // test hook, only when loaded with ?debug=1
  if (DEBUG) {
    window.__afk = {
      S,
      content: R,
      stats,
      paths: PATHS.map((p) => p.id),
      mods: () => getMods(),
      buy: (id) => buyItem(id),
      tokens: () => tokens,
      setTokens(n) { tokens = Math.max(0, Math.floor(n)); store.set('tokens', tokens); renderInv(); },
      inv: () => ({ ...inv }),
      setChannel(id) { const c = VOICE.find((x) => x.id === id); if (!c) return false; S.chan = c.id; S.chanLock = true; renderMembers(); return true; },
      resident: () => (S.resident ? { id: S.resident.id, days: resDays(), text: resTimerText() } : null),
      residentSay,
      pack: () => packId,
      packs: () => PACKLIST.map((x) => x.id),
      setPack(id) { let done = false; setPack(id, () => { done = true; }); return done; },
      bulk: () => { const b = BULKS[packId]; return b ? b.state : 'none'; },
      ach: () => ({ ...store.get('ach', {}) }),
      achIds: () => Object.keys(ACH),
      checkAch(r) { checkAch(r); },
      unlockAch,
      server: () => ({ ...SERVER }),
      recentLen: () => recent.length,
      orgFightPing,
      jab: (idris) => jabLine(!!idris),
      returnChatter,
      speak: (cat) => meTok(speakCat(cat) || ''),
      sample(cat, n) { const o = []; for (let i = 0; i < n; i++) o.push(meTok(speak(pick(S.friends), cat))); return o; },
      sampleCat(cat, n) { const o = []; for (let i = 0; i < n; i++) o.push(meTok(speakCat(cat) || '')); return o; },
      sampleBrb(n) { const o = []; while (o.length < n) o.push(...pickOptions(BRB, 'brb', deriveBrb, 3)); return o; },
      sampleExcuse(n) { const o = []; while (o.length < n) o.push(...pickOptions(EXCUSES, 'excuse', deriveExcuse, 3)); return o; },
      sampleRaw(cat, n) { const o = []; for (let i = 0; i < n; i++) o.push(speak(pick(S.friends), cat)); return o; },
      mic: (id) => { if (!PEVENTS[id]) return false; micEvent(id); return true; },
      shareText: (e) => shareText(e),
      // channel helpers
      chanIds: () => TEXT.map((c) => c.id),
      switchCh: (id) => switchChannel(id),
      mute: (id) => toggleMute(id),
      // friend line in a channel (as the first non-away friend); returns the ping if it created one
      say(cid, text, o) { post(S.friends[0], text, { ch: cid, ...(o || {}) }); return S.pings[S.pings.length - 1] || null; },
      pingRaw: (p) => pingRaw(p),
      lorPreview: (scale) => lorPenalty(S.pings.filter((p) => !p.forgiven), scale || 1),
      dragOut: () => dragOut(),
      skipTriage() { if (S.phase === 'triage') finishTriage(); return S.phase; },
      tuning: () => ({ ...CT }),
      favCh,
      deriveBrb, deriveExcuse,
      key: () => INV_KEY,
      setMode(mode, threshold) { S.mode = mode; if (threshold) S.threshold = threshold; renderChip(); },
      go(id) { const p = PATHS.find((x) => x.id === id); if (!p) return false; clearActions(); choosePath(p); return true; },
      tick(m) {
        const target = S.mins + m;
        let guard = 0;
        catchingUp = true;
        while (S.phase === 'afk' && !S.inAfkCh && S.mins < target && guard++ < 200000) {
          afkStep(Math.min(0.1, (target - S.mins) / (1 + S.mins / 20) + 1e-9));
        }
        catchingUp = false;
        render();
        return S.mins;
      },
    };
  }
})();
