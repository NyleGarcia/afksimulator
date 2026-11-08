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
  // single-pass token substitution: replaced text is never re-scanned
  const meTok = (s) => String(s).replace(/\{(me|p|t)\}/g, (_, k) => (k === 'me' ? ME.name : k === 'p' ? fmtMins(S.promise) : fmtMins(S.mins)));
  const escMd = (x) => String(x).replace(/[\\*_~`|>[\]()#-]/g, '\\$&');
  const mentionRe = () => new RegExp('(@' + escRe(ME.name) + ')', 'i');
  // characters (content/characters.js)
  const DEFAULT_FRIENDS = [
    { id: 'brody', name: 'Brody', color: '#e67e22' },
    { id: 'kev', name: 'kev', color: '#4aa3df' },
    { id: 'moistturtle', name: 'MoistTurtle', color: '#2ecc71' },
    { id: 'dani', name: 'dani', color: '#e84393' },
    { id: 'xxsniperxx', name: 'xXSniperXx', color: '#a77bd6' },
  ].map((c) => ({ ...c, role: 'friend', tags: [], rival: false, lines: {}, digs: [] }));
  const CHARS = Array.isArray(R.characters) ? R.characters : [];
  const FRIENDS = CHARS.filter((c) => c.role === 'friend').length ? CHARS.filter((c) => c.role === 'friend') : DEFAULT_FRIENDS;
  const RESIDENTS = CHARS.filter((c) => c.role === 'resident');
  const BOTS = CHARS.filter((c) => c.role === 'bot');

  // channels (content/channels.js): first text channel = chat, first non-afk voice = start channel, first isAfk voice = afk channel
  const chanList = Array.isArray(R.channels) ? R.channels : [];
  const mkChan = (o) => ({ icon: o.type === 'text' ? '#' : '🔊', isAfk: false, members: [], mods: {}, desc: '', ...o });
  const TEXT = chanList.filter((c) => c.type === 'text');
  const VOICE = chanList.filter((c) => c.type === 'voice' && !c.isAfk);
  const AFK_CH = chanList.find((c) => c.type === 'voice' && c.isAfk) || mkChan({ id: 'afk', name: 'afk', type: 'voice', isAfk: true });
  if (!TEXT.length) TEXT.push(mkChan({ id: 'general', name: 'general', type: 'text' }), mkChan({ id: 'memes', name: 'memes', type: 'text' }), mkChan({ id: 'clips', name: 'clips', type: 'text' }));
  if (!VOICE.length) VOICE.push(mkChan({ id: 'squad-vc', name: 'squad vc', type: 'voice' }));
  const chanLabel = (c) => `${c.icon} ${c.name}`;
  const chatLabel = () => (TEXT[0].icon === '#' ? '#' + TEXT[0].name : chanLabel(TEXT[0]));
  const composerIdle = () => `Message ${chatLabel()}`;
  const curVc = () => VOICE.find((c) => c.id === S.chan) || VOICE[0];
  const sideText = () => (TEXT[1] || TEXT[0]);

  // p = promised minutes, m = points multiplier
  let BRB = [
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
  let EXCUSES = [
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

  let LINES = {
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

  const D = R.dialog;
  if (D) {
    if (Array.isArray(D.BRB) && D.BRB.length >= 3) BRB = D.BRB;
    if (Array.isArray(D.EXCUSES) && D.EXCUSES.length >= 3) EXCUSES = D.EXCUSES;
    if (D.LINES && typeof D.LINES === 'object') {
      const merged = { ...LINES };
      Object.keys(D.LINES).forEach((k) => { if (Array.isArray(D.LINES[k]) && D.LINES[k].length) merged[k] = D.LINES[k]; });
      LINES = merged;
    }
  }
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

  const ACH = {
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

  // ---------- state ----------
  const S = {};
  let gen = 0; // bumps on reset, cancels stale timeouts
  const later = (ms, fn) => {
    const g = gen;
    setTimeout(() => { if (g === gen) fn(); }, ms);
  };

  // ---------- items, tokens, mods (content/items.js) ----------
  // Tokens: 1 token per 100 points banked (running total per run, so no remainder is lost). Persisted.
  const ITEMS = Array.isArray(R.items) ? R.items : [];
  const itemById = (id) => ITEMS.find((i) => i.id === id);
  const itemMax = (i) => (i.stackable ? i.max || 5 : 1);
  function loadInv() {
    const raw = store.get('inv', {});
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
  let inv = loadInv();
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
    store.set('inv', inv);
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
      store.set('inv', inv);
      sys(`${used.map((i) => i.icon + ' ' + i.name).join(', ')} active this run`, 'good');
    }
    renderInv();
  }

  // ---------- character lines + digs ----------
  const stats = { digs: 0 };
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
  // mid/high suspicion chatter: a matching dig 40% of the time (65% for a rival), else the generic line
  function digOrSay(f, tier) {
    const d = digFor(f);
    if (d && Math.random() < (f.rival ? 0.65 : 0.4)) { stats.digs++; return d.text; }
    return say(f, tier);
  }
  function kickDig(f) {
    const ds = (f.digs || []).filter((d) => d.when && d.when.afterKick);
    if (ds.length && Math.random() < 0.6) { stats.digs++; return pick(ds).text; }
    return null;
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
    });
    $('#messages').textContent = '';
    clearActions();
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    document.title = 'AFK Simulator';
    $('#composerText').textContent = composerIdle();
    renderChip();
    renderMembers();
    renderInv();
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

  function post(who, text, opts = {}) {
    text = meTok(text);
    const box = $('#messages');
    const el = document.createElement('div');
    if (opts.system) {
      el.className = 'msg system ' + (opts.tone || '');
      el.textContent = text;
    } else {
      el.className = 'msg';
      const mRe = mentionRe();
      if (who !== ME && mRe.test(text)) el.classList.add('mention');
      el.appendChild(avatar(who));
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
      time.textContent = fmtClock(S.clock);
      head.append(name, time);
      const t = document.createElement('div');
      t.className = 'msg-text';
      // highlight @mentions safely
      text.split(mRe).forEach((part) => {
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
      el.appendChild(body);
    }
    box.appendChild(el);
    while (box.children.length > 200) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;

    if (who !== ME && !opts.system) {
      if (mentionRe().test(text)) {
        sfx.ping();
        if (S.phase === 'afk') S.unread++;
      } else {
        sfx.msg();
      }
    }
  }

  function sys(text, tone) { post(null, text, { system: true, tone }); }

  function clearActions() { $('#actions').textContent = ''; }

  function setActions(title, options, extra) {
    const box = $('#actions');
    box.textContent = '';
    const h = document.createElement('div');
    h.className = 'actions-title';
    h.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'choices';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.dataset.key = String(i + 1);
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = `[${i + 1}]`;
      b.append(k, document.createTextNode(o.label));
      if (o.sub) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = o.sub;
        b.appendChild(sub);
      }
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        initAudio();
        clearActions();
        o.fn();
      });
      grid.appendChild(b);
    });
    box.append(h, grid);
    if (extra) {
      const x = document.createElement('button');
      x.className = 'shop-link';
      x.textContent = extra.label;
      x.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); extra.fn(); });
      box.appendChild(x);
    }
    $('#messages').scrollTop = $('#messages').scrollHeight;
    if (S.phase !== 'afk' && grid.firstChild) grid.firstChild.focus({ preventScroll: true });
  }

  // ---------- sidebar channels + members ----------
  const chanBoxes = new Map();
  function buildChannels() {
    const tb = $('#textChans');
    const vb = $('#voiceChans');
    tb.textContent = '';
    vb.textContent = '';
    chanBoxes.clear();
    TEXT.forEach((c, i) => {
      const d = el('div', 'ch' + (i === 0 ? ' active' : ''), chanLabel(c));
      if (c.desc) d.title = c.desc;
      tb.appendChild(d);
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
    $('#chatName').textContent = chanLabel(TEXT[0]);
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

  function offerBrb() {
    S.phase = 'chat';
    const opts = shuffle(BRB).slice(0, 3);
    setActions('SAY BRB (then actually leave)', opts.map((o) => ({
      label: o.t,
      sub: `promise ${fmtMins(o.p)} · x${o.m} pts (short promise = bigger multiplier)`,
      fn: () => chooseBrb(o),
    })), { label: `🛒 Shop · ${fmtN(tokens)} 🪙`, fn: openShop });
  }

  function chooseBrb(o) {
    S.phase = 'leaving';
    post(ME, o.t);
    S.promise = o.p;
    S.mult = o.m;
    later(700, () => {
      const f = friend();
      post(f, say(f, 'ok'));
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
    S.sus += rate * sm * M.susMult * dt;

    S.pending += basePps(late) * pm * M.pointMult * dt;

    if (!over) {
      if (Math.random() < 0.05 * dt) { const f = friend(); post(f, say(f, 'chill')); }
    } else {
      if (Math.random() < (0.12 + S.sus / 300) * dt) {
        const tier = S.sus < 35 ? 'low' : S.sus < 70 ? 'mid' : 'high';
        const f = friend();
        post(f, tier === 'low' ? say(f, 'low') : digOrSay(f, tier));
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
    if (S.sus >= 100) { kicked('the boys ran out of patience'); return; }
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
    post(vcFriend(), Array.isArray(ev.lines) && ev.lines.length ? pick(ev.lines) : '...');
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
    sys(`${ME.name} returned after ${fmtMins(S.mins)} (promised ${fmtMins(S.promise)})`);
    if (wasMoved) {
      sys(`⏱ you were moved to AFK at ${fmtMins(S.movedAt)}`, 'good');
      toast('Moved to AFK', `you were moved to AFK at ${fmtMins(S.movedAt)}`);
    }
    const opts = [QUIET].concat(shuffle(EXCUSES).slice(0, 3));
    setActions('YOU\'RE BACK. EXPLAIN YOURSELF.', opts.map((e) => {
      const used = S.uses[e.t] || 0;
      return {
        label: e.t,
        sub: e.quiet ? 'say nothing. pure sigma energy. x1.25 pts' : used ? `used ${used}x. they have screenshots.` : 'untested excuse (mom has not heard this one yet)',
        fn: () => chooseExcuse(e),
      };
    }));
  }

  function chooseExcuse(e) {
    S.phase = 'judging';
    post(ME, e.t);
    const susBefore = S.sus;
    const uses = S.uses[e.t] || 0;
    S.uses[e.t] = uses + 1;
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
      if (early) line = say(f, 'early');
      else if (busted) line = say(f, 'reused');
      else if (roll >= 22) line = say(f, 'good');
      else if (roll >= 8) line = say(f, 'meh');
      else line = say(f, 'bad');
      post(f, line);
      bank(e, susBefore, S.sus >= 100 ? 0.5 : 1);
      if (S.record && S.sus < 100) later(700, () => post(friend(), lineOr('hype', 'new record!!')));
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
      checkAch({ mins, promise: S.promise, susBefore, susAfter: S.sus, combo: S.combo, path: S.path ? S.path.id : '', autoMoved: S.autoMoved, dragged: S.dragged, roommates: Number(store.get('roommates', 0)) || 0 });
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
    const af = friend();
    post(af, say(af, 'ask'));
    later(900, offerBrb);
  }

  function kicked(reason) {
    if (S.kicked) return;
    S.kicked = true;
    S.phase = 'over';
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
    later(900, () => { const kf = friend(); post(kf, kickDig(kf) || say(kf, 'kickAfter')); });
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
    scores.push({ name: ME.name, s: S.score, r: S.round, l: Math.floor(S.longest), p: S.longestPath || '', m: S.longestMode || '', d: new Date().toISOString().slice(0, 10) });
    scores.sort((a, b) => b.s - a.s);
    store.set('scores', scores.slice(0, 10));
    return S.score > prevBest && S.score > 0;
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
  function openModal(nodes, kind = 'main') {
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
  function closeModal() { $('#modal').hidden = true; $('#app').inert = false; modalKind = 'main'; prevView = null; }
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
    const x = e || { name: ME.name, s: S.score, r: S.round, l: S.longest, c: S.combo, p: S.longestPath, m: S.longestMode };
    const via = x.p && typeof x.p === 'string'
      ? ` · via ${escMd(x.p.slice(0, 24).toLowerCase())}${MODES.includes(x.m) ? `, ${x.m} server` : ''}`
      : '';
    return `**${escMd(x.name)}** got **${fmtN(x.s)}** pts in AFK Simulator 💤\nround ${x.r} · longest AFK ${fmtMins(x.l || 0)}${via}${x.c ? ` · x${x.c} combo` : ''} · ${achCount()}/${Object.keys(ACH).length} achievements${itemCount() ? ` · ${itemCount()} item${itemCount() === 1 ? '' : 's'}` : ''}\n${SITE_URL}`;
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
    openOverlay('settings', [el('h1', '', '⚙️ Settings', 'modalTitle'), lab, input, el('h3', '', 'THEME'), themeBox, done]);
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
        return { name: sanitizeName(b.name), s: b.s, r: b.r, l: b.l, c: 0, p: b.p, m: b.m };
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
    openModal([el('h1', '', '💤 AFK Simulator', 'modalTitle'), el('p', 'tag', `You are ${ME.name}. Say brb. Don't come back.`), ul, scoresTable(), achList(), overlayLinks(), btn]);
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
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (S.phase === 'afk') { comeBack(); return; }
    if (!$('#modal').hidden) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea')) return;
    const b = document.querySelector(`.choice[data-key="${e.key}"]`);
    if (b) b.click();
  });
  document.addEventListener('pointerdown', () => comeBack());
  document.addEventListener('mousemove', (e) => {
    if (S.phase !== 'afk') return;
    if (!S.armed || performance.now() - S.afkAt < 1200) return;
    S.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (S.moved > 80) comeBack();
  });

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
  const openSettings = (e) => { if (e) e.stopPropagation(); if (S.phase === 'afk' || S.phase === 'leaving' || S.phase === 'judging') return; initAudio(); showSettings(); };
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

  buildChannels();
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
