'use strict';
/* AFK Simulator / js/ambient.js: the "rest of the server": grouped member list with roles, extra text/voice channels,
 * ambient chatter, bot lines, events, topics + pins, server rail icons, presence shuffle. Pure flavor.
 * Data: content/ambient.js (classic) and content/packs/<id>/ambient.js (see content/AMBIENT_SCHEMA.md).
 * Hard rules: this file never calls post()/addPing()/sfx, never touches S.pings, S.ch or S.unread, so ambient chatter is
 * never a ping and never "left on read". It owns one timeout chain (no setInterval) and never throws into the game.
 * Hooks (js/ui.js): AFK_AMB.mount() from buildChannels, AFK_AMB.members(list) from renderMembers, AFK_AMB.frame() from render.
 * Classic script: top-level names share one scope (see ARCHITECTURE.md), so everything lives in an IIFE. */
(function () {
  const STATUS = ['online', 'idle', 'dnd', 'offline'];
  const SCHED = { min: 7000, max: 15000, shuffleMs: 24000, histMax: 60, seed: 4, recent: 24, meEvents: 4 };
  const BUSY_PHASES = ['afk', 'leaving', 'judging', 'triage'];

  let st = null; // { pack, data, pres, hist, unread, collapsed, ... } for the active pack
  let timer = 0;
  let lastShuffle = 0;
  let lastCh = '';
  let meEv = 0;
  let nameSig = '';
  let memHost = null;
  let memStats = { online: 0 };
  let peek = null; // { box, id, trigger }
  let warned = false;

  const warn = (msg) => { if (!warned) { warned = true; try { console.warn('[ambient] ' + msg); } catch (e) { /* ignore */ } } };
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const arr = (x) => (Array.isArray(x) ? x : []);

  // ---------- validation: warn + skip, never throw ----------
  const TOK = /\{([a-zA-Z]+)\}/g;
  function okTxt(s, allow, max) {
    if (typeof s !== 'string' || !s || s.length > (max || 220)) return false;
    TOK.lastIndex = 0;
    let m;
    while ((m = TOK.exec(s))) if (allow.indexOf(m[1]) < 0) return false;
    return true;
  }
  const plain = (s, max) => okTxt(s, [], max);
  const colorOf = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c) ? c : d);

  function clean(raw) {
    if (!isObj(raw)) return null;
    const d = { roles: [], members: [], channels: [], chatter: {}, bot: {}, events: [], topics: {}, rail: [], ps: { onlineRate: 0.55, w: { online: 0.5, idle: 0.2, dnd: 0.1, offline: 0.2 } } };
    const roleIds = new Set();
    arr(raw.roles).forEach((r) => {
      if (!isObj(r) || !plain(r.id, 40) || !plain(r.name, 40) || roleIds.has(r.id)) return;
      roleIds.add(r.id);
      d.roles.push({ id: r.id, name: r.name, color: colorOf(r.color, '#99aab5'), hoist: !!r.hoist, order: typeof r.order === 'number' ? r.order : 50 });
    });
    d.roles.sort((a, b) => a.order - b.order);
    const chIds = new Set();
    arr(raw.channels).forEach((c) => {
      if (!isObj(c) || !plain(c.id, 60) || !plain(c.name, 40) || chIds.has(c.id) || c.isAfk === true) return;
      if (c.type !== 'text' && c.type !== 'voice') return;
      chIds.add(c.id);
      d.channels.push({
        id: c.id, name: c.name, type: c.type, icon: plain(c.icon, 8) ? c.icon : c.type === 'text' ? '#' : '🔊',
        category: plain(c.category, 30) ? c.category : 'MORE', topic: plain(c.topic, 200) ? c.topic : '',
        members: arr(c.members).filter((x) => typeof x === 'string'), muted: !!c.muted,
        busy: typeof c.busyness === 'number' ? Math.max(0.05, Math.min(1, c.busyness)) : 0.5,
      });
    });
    const memIds = new Set();
    arr(raw.members).forEach((m) => {
      if (!isObj(m) || !plain(m.id, 40) || !plain(m.name, 40) || memIds.has(m.id)) return;
      memIds.add(m.id);
      d.members.push({
        id: m.id, name: m.name, color: colorOf(m.color, '#99aab5'), role: roleIds.has(m.role) ? m.role : '',
        status: STATUS.indexOf(m.status) >= 0 ? m.status : 'offline', activity: plain(m.activity, 80) ? m.activity : '',
        tags: arr(m.tags).filter((x) => typeof x === 'string'), bio: plain(m.bio, 120) ? m.bio : '', bot: !!m.bot,
      });
    });
    d.members.forEach((m) => { m.pstat = m.status; });
    const mById = new Map(d.members.map((m) => [m.id, m]));
    d.channels.forEach((c) => { c.members = c.members.filter((id) => mById.has(id)); });
    if (isObj(raw.chatter)) {
      Object.keys(raw.chatter).forEach((cid) => {
        if (!chIds.has(cid)) return;
        const list = arr(raw.chatter[cid]).filter((l) => isObj(l) && okTxt(l.text, ['me', 'friend'], 200) && (l.who === 'any' || mById.has(l.who)))
          .map((l) => ({ who: l.who, text: l.text, w: typeof l.weight === 'number' && l.weight > 0 ? l.weight : 1 }));
        if (list.length) d.chatter[cid] = list;
      });
    }
    if (isObj(raw.botLines)) {
      ['leveler', 'welcome', 'music', 'afkTimer'].forEach((k) => { d.bot[k] = arr(raw.botLines[k]).filter((s) => okTxt(s, ['me'], 200)); });
    }
    d.events = arr(raw.events).filter((s) => okTxt(s, ['me', 'friend'], 200));
    if (isObj(raw.topics)) {
      Object.keys(raw.topics).forEach((cid) => {
        const t = raw.topics[cid];
        if (!chIds.has(cid) || !isObj(t)) return;
        d.topics[cid] = { topic: plain(t.topic, 200) ? t.topic : '', pinned: arr(t.pinned).filter((s) => plain(s, 220)).slice(0, 4) };
      });
    }
    arr(raw.serverRail).forEach((s) => {
      if (!isObj(s) || !plain(s.name, 40) || typeof s.abbr !== 'string' || s.abbr.length !== 2) return;
      d.rail.push({ id: String(s.id || s.abbr), name: s.name, abbr: s.abbr, color: colorOf(s.color, '#5865f2'), unread: Math.max(0, Math.min(3, s.unread | 0)), mention: !!s.mention, blurb: plain(s.blurb, 160) ? s.blurb : '' });
    });
    if (isObj(raw.presenceShuffle)) {
      const p = raw.presenceShuffle;
      if (typeof p.onlineRate === 'number') d.ps.onlineRate = Math.max(0, Math.min(1, p.onlineRate));
      if (isObj(p.statusWeights)) STATUS.forEach((k) => { if (typeof p.statusWeights[k] === 'number' && p.statusWeights[k] >= 0) d.ps.w[k] = p.statusWeights[k]; });
    }
    if (!d.members.length && !d.channels.length) return null;
    return d;
  }

  function rawFor(id) {
    if (id === 'classic') return window.AFK_CONTENT && window.AFK_CONTENT.ambient;
    const p = window.AFK_PACKS && window.AFK_PACKS[id];
    return p && p.ambient;
  }

  // ---------- who is already taken: the player, the crew, the base cast ----------
  function takenNames() {
    const set = new Set(reservedNames()); // shared helper (js/core.js): cast incl. inactive roster friends, bots, resident, built-ins
    const add = (x) => { if (!x) return; const n = typeof x === 'string' ? x : x.name; if (typeof n === 'string') set.add(n.toLowerCase()); };
    const ids = new Set();
    add(ME);
    [FRIENDS, FRIENDS_ACTIVE, RESIDENTS, BOTS, S.friends, CREW_NAMES, S.crewNames, S.resident].forEach((l) => {
      (Array.isArray(l) ? l : l ? [l] : []).forEach((x) => { add(x); if (x && x.id) ids.add(x.id); });
    });
    return { names: set, ids };
  }
  function live() {
    if (!st) return [];
    const t = takenNames();
    return st.data.members.filter((m) => !t.names.has(m.name.toLowerCase()) && !t.ids.has(m.id));
  }
  const crewNames = () => (Array.isArray(S.friends) ? S.friends.map((f) => f.name).filter(Boolean) : []);
  const stateOf = (m) => m.pstat || m.status;

  // ---------- text generation ----------
  function fill(text, who, forceAmb) {
    return text.replace(/\{(me|friend)\}/g, (all, k) => {
      if (k === 'me') return ME.name;
      const crew = crewNames();
      if (!forceAmb && crew.length && Math.random() < 0.7) return pick(crew);
      const pool = live().filter((m) => !m.bot && m !== who && stateOf(m) !== 'offline');
      return pool.length ? pick(pool).name : crew.length ? pick(crew) : 'someone';
    });
  }
  function pickW(list, wf) {
    let tot = 0;
    list.forEach((x) => { tot += wf(x); });
    let r = Math.random() * tot;
    for (let i = 0; i < list.length; i++) { r -= wf(list[i]); if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  const clockNow = () => (S && typeof S.clock === 'number' ? S.clock : 20 * 60);
  function push(cid, msg) {
    const h = st.hist[cid] || (st.hist[cid] = []);
    h.push(msg);
    while (h.length > SCHED.histMax) h.shift();
    if (peek && peek.id === cid) { addPeekMsg(msg, true); } else { st.unread[cid] = Math.min(99, (st.unread[cid] || 0) + 1); }
    paintBadge(cid);
  }
  function remember(key) {
    st.recent.push(key);
    if (st.recent.length > SCHED.recent) st.recent.shift();
  }
  const textCh = () => st.data.channels.filter((c) => c.type === 'text');
  const botCh = () => textCh().find((c) => /bot/i.test(c.id)) || textCh()[textCh().length - 1];
  const welcomeCh = () => textCh().find((c) => /introduc|recruit|welcome/i.test(c.id)) || textCh()[0];
  const musicCh = () => textCh().find((c) => /music/i.test(c.id)) || botCh();
  function botBy(tag) {
    const t = takenNames();
    return st.data.members.find((m) => m.bot && m.tags.indexOf(tag) >= 0 && !t.names.has(m.name.toLowerCase())) || null;
  }

  function genChatter() {
    const cands = textCh().filter((c) => st.data.chatter[c.id] && c.id !== lastCh);
    if (!cands.length) return false;
    const ch = pickW(cands, (c) => c.busy);
    const t = takenNames();
    const members = live();
    const lines = st.data.chatter[ch.id].filter((l) => st.recent.indexOf(ch.id + '|' + l.text) < 0);
    if (!lines.length) return false;
    const l = pickW(lines, (x) => x.w);
    let who = null;
    if (l.who === 'any') {
      const pool = members.filter((m) => !m.bot && stateOf(m) !== 'offline');
      who = pool.length ? pick(pool) : null;
    } else {
      who = members.find((m) => m.id === l.who) || null;
    }
    if (!who || t.names.has(who.name.toLowerCase())) return false;
    remember(ch.id + '|' + l.text);
    lastCh = ch.id;
    push(ch.id, { who, text: fill(l.text, who), clock: clockNow() });
    return true;
  }
  function genBot() {
    const afk = S.phase === 'afk';
    const kinds = [
      { k: 'leveler', tag: 'leveler', w: 1, ch: botCh },
      { k: 'welcome', tag: 'welcome', w: 0.5, ch: welcomeCh },
      { k: 'music', tag: 'music', w: 1, ch: musicCh },
      { k: 'afkTimer', tag: 'afk', w: afk ? 3 : 1, ch: botCh },
    ].filter((x) => st.data.bot[x.k] && st.data.bot[x.k].length && botBy(x.tag));
    if (!kinds.length) return false;
    const kd = pickW(kinds, (x) => x.w);
    const ch = kd.ch();
    if (!ch) return false;
    const pool = st.data.bot[kd.k].filter((s) => st.recent.indexOf('b|' + s) < 0);
    if (!pool.length) return false;
    const line = pick(pool);
    remember('b|' + line);
    push(ch.id, { who: botBy(kd.tag), text: fill(line, null), clock: clockNow(), bot: true });
    return true;
  }
  function genEvent() {
    const ch = textCh()[0];
    if (!ch || !st.data.events.length) return false;
    const pool = st.data.events.filter((s) => st.recent.indexOf('e|' + s) < 0 && !(/\{me\}/.test(s) && meEv >= SCHED.meEvents));
    if (!pool.length) return false;
    const line = pickW(pool, (s) => (/\{me\}/.test(s) ? 0.1 : /\{friend\}/.test(s) ? 0.5 : 1));
    if (/\{me\}/.test(line)) meEv++;
    remember('e|' + line);
    push(ch.id, { sys: true, text: fill(line, null, true), clock: clockNow() });
    return true;
  }
  function genOne() {
    const r = Math.random();
    let ok = false;
    if (r < 0.7) ok = genChatter();
    else if (r < 0.85) ok = genEvent();
    else ok = genBot();
    if (!ok) ok = genChatter() || genEvent();
    return ok;
  }

  // ---------- presence shuffle ----------
  function shuffle() {
    const pool = live().filter((m) => !m.bot);
    if (!pool.length) return;
    const w = st.data.ps.w;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const m = pick(pool);
      const online = pool.filter((x) => stateOf(x) !== 'offline').length / pool.length;
      const low = online < st.data.ps.onlineRate; // pull the not-offline share toward onlineRate
      const wt = STATUS.map((k) => (w[k] || 0) * (k === 'offline' ? (low ? 0.5 : 1.5) : low ? 1.5 : 0.8));
      let r = Math.random() * wt.reduce((a, b) => a + b, 0);
      let s = 'offline';
      for (let j = 0; j < STATUS.length; j++) { r -= wt[j]; if (r <= 0) { s = STATUS[j]; break; } }
      m.pstat = s;
    }
    if (memHost) buildMembers();
    if (st.dom) paintVoice();
  }

  // ---------- scheduler: one timeout chain, nothing else ----------
  function stopTimer() { if (timer) { clearTimeout(timer); timer = 0; } }
  function schedule() {
    stopTimer();
    if (!st) return;
    timer = setTimeout(step, SCHED.min + Math.random() * (SCHED.max - SCHED.min));
  }
  function step() {
    timer = 0;
    try {
      if (st && !document.hidden) {
        genOne();
        const now = performance.now();
        if (now - lastShuffle > SCHED.shuffleMs) { lastShuffle = now; shuffle(); }
      }
    } catch (e) { warn('tick failed: ' + (e && e.message)); }
    schedule();
  }

  // ---------- sidebar: extra channels ----------
  const mk = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  function paintBadge(cid) {
    if (!st || !st.dom) return;
    const b = st.dom.badges.get(cid);
    if (b) {
      const n = st.unread[cid] || 0;
      b.textContent = n ? String(n) : '';
      b.parentNode.classList.toggle('unread', n > 0);
    }
    st.dom.cats.forEach((cat) => {
      let n = 0;
      cat.ids.forEach((id) => { n += st.unread[id] || 0; });
      cat.count.textContent = n ? String(n) : '';
    });
  }
  function paintVoice() {
    if (!st || !st.dom) return;
    const taken = takenNames();
    const byId = new Map(st.data.members.map((m) => [m.id, m]));
    st.dom.voice.forEach((box, cid) => {
      const ch = st.data.channels.find((c) => c.id === cid);
      box.textContent = '';
      ch.members.map((id) => byId.get(id)).filter((m) => m && stateOf(m) !== 'offline' && !taken.names.has(m.name.toLowerCase())).forEach((m) => {
        const row = mk('div', 'amb-vm');
        const av = avatar(m);
        row.append(av, document.createTextNode(m.name));
        box.appendChild(row);
      });
    });
  }
  // phones: the sidebar is hidden, so the chat channel bar gets a 'More channels' entry that opens a picker in the peek drawer
  function mountMore(chans) {
    const old = document.getElementById('ambMore');
    if (old) old.remove();
    const bar = document.getElementById('chanBar');
    const texts = chans.filter((c) => c.type === 'text');
    if (!bar || !texts.length) return;
    const b = mk('button', 'ch amb-more');
    b.type = 'button';
    b.id = 'ambMore';
    b.setAttribute('aria-label', 'More channels');
    b.setAttribute('aria-haspopup', 'dialog');
    b.append(mk('span', 'ch-ic', '☰'), mk('span', 'ch-name', 'More channels'));
    b.addEventListener('click', () => { if (S.phase === 'afk') return; openMore(b); });
    bar.appendChild(b);
  }
  function mountSide() {
    const old = document.getElementById('ambSide');
    if (old) old.remove();
    const oldMore = document.getElementById('ambMore');
    if (oldMore) oldMore.remove();
    if (!st) return;
    const anchor = document.getElementById('voiceChans');
    if (!anchor || !anchor.parentNode) return;
    const base = new Set(TEXT.concat(VOICE, [AFK_CH]).map((c) => c.id));
    const chans = st.data.channels.filter((c) => !base.has(c.id));
    if (!chans.length) return;
    mountMore(chans);
    const side = mk('div', 'amb-side');
    side.id = 'ambSide';
    side.setAttribute('role', 'navigation');
    side.setAttribute('aria-label', 'More channels');
    const dom = { badges: new Map(), voice: new Map(), cats: [] };
    const order = [];
    chans.forEach((c) => { if (order.indexOf(c.category) < 0) order.push(c.category); });
    order.forEach((cat) => {
      const ids = chans.filter((c) => c.category === cat);
      const open = st.open.has(cat);
      const head = mk('button', 'amb-cat');
      head.type = 'button';
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      const arrow = mk('span', 'amb-arrow', open ? '▾' : '▸');
      const label = mk('span', 'amb-cat-name', String(cat).toUpperCase());
      const count = mk('span', 'amb-cat-count');
      head.append(arrow, label, count);
      const body = mk('div', 'amb-body');
      body.hidden = !open;
      head.addEventListener('click', () => {
        const o = body.hidden;
        body.hidden = !o;
        head.setAttribute('aria-expanded', o ? 'true' : 'false');
        arrow.textContent = o ? '▾' : '▸';
        if (o) st.open.add(cat); else st.open.delete(cat);
      });
      ids.forEach((c) => {
        if (c.type === 'text') {
          const b = mk('button', 'ch amb-ch' + (c.muted ? ' muted' : ''));
          b.type = 'button';
          b.dataset.amb = c.id;
          b.append(mk('span', 'ch-ic', c.icon), mk('span', 'ch-name', c.name));
          const badge = mk('span', 'ch-badge amb-badge');
          b.appendChild(badge);
          dom.badges.set(c.id, badge);
          b.addEventListener('click', () => openPeek(c.id, b));
          body.appendChild(b);
        } else {
          const row = mk('div', 'ch amb-vc');
          row.dataset.amb = c.id;
          row.append(mk('span', 'ch-ic', c.icon), mk('span', 'ch-name', c.name));
          if (c.topic) row.title = c.topic;
          const box = mk('div', 'amb-vms');
          body.append(row, box);
          dom.voice.set(c.id, box);
        }
      });
      side.append(head, body);
      dom.cats.push({ ids: ids.map((c) => c.id), count });
    });
    st.dom = dom;
    anchor.parentNode.insertBefore(side, anchor.nextSibling);
    paintVoice();
    chans.forEach((c) => paintBadge(c.id));
  }

  // ---------- server rail ----------
  function mountRail() {
    const nav = document.querySelector('.servers');
    if (!nav) return;
    nav.querySelectorAll('.srv[data-amb-rail]').forEach((n) => n.remove());
    const rail = st ? st.data.rail : [];
    nav.querySelectorAll('.srv:not(#serverIcon):not(.add):not([data-amb-rail])').forEach((n) => { n.hidden = rail.length > 0; });
    const anchor = document.getElementById('serverIcon');
    if (!anchor || !rail.length) return;
    let ref = anchor;
    rail.forEach((s) => {
      const d = mk('button', 'srv amb-srv' + (s.unread ? ' has-unread' : ''), s.abbr); // a real button: focusable, Enter/Space work
      d.type = 'button';
      d.dataset.ambRail = s.id;
      d.setAttribute('aria-label', s.name + (s.mention ? `, ${s.unread || 1} mention${(s.unread || 1) > 1 ? 's' : ''}` : s.unread ? ', unread' : ''));
      d.style.background = s.color;
      d.title = s.blurb ? `${s.name}: ${s.blurb}` : s.name;
      if (s.mention) d.appendChild(mk('span', 'amb-mention', String(s.unread || 1)));
      d.addEventListener('click', () => { toast(s.name, s.blurb || 'a server you forgot you joined'); });
      ref.parentNode.insertBefore(d, ref.nextSibling);
      ref = d;
    });
  }

  // ---------- member list ----------
  function memberRow(m) {
    const s = stateOf(m);
    const row = mk('div', 'member amb-member' + (s === 'offline' ? ' offline' : ''));
    const av = avatar(m);
    av.appendChild(mk('span', 'dot ' + s));
    const info = mk('div', 'amb-info');
    const n = mk('div', 'member-name', m.name);
    n.style.color = m.color;
    if (m.bot) n.appendChild(mk('span', 'amb-bot', 'BOT'));
    info.appendChild(n);
    const sub = s === 'offline' ? '' : m.activity;
    if (sub) info.appendChild(mk('div', 'member-sub', sub));
    row.append(av, info);
    if (m.bio || sub) row.title = m.bio || sub;
    return row;
  }
  function buildMembers() {
    if (!memHost) return;
    memHost.textContent = '';
    const list = live();
    const taken = takenNames();
    nameSig = [...taken.names].join(',');
    const on = list.filter((m) => stateOf(m) !== 'offline');
    const off = list.filter((m) => stateOf(m) === 'offline');
    const placed = new Set();
    const group = (title, members) => {
      if (!members.length) return;
      memHost.appendChild(mk('div', 'ch-group amb-grp', `${title.toUpperCase()} — ${members.length}`));
      members.forEach((m) => memHost.appendChild(memberRow(m)));
    };
    const byOrder = st.data.roles.slice();
    byOrder.filter((r) => r.hoist).forEach((r) => {
      const ms = on.filter((m) => m.role === r.id);
      ms.forEach((m) => placed.add(m.id));
      group(r.name, ms);
    });
    group('Online', on.filter((m) => !placed.has(m.id)));
    group('Offline', off);
    memStats.online = on.length;
  }
  function members(list) {
    if (!list || !st) {
      if (memHost && memHost.parentNode) memHost.remove();
      return;
    }
    if (!memHost) { memHost = mk('div', 'amb-members'); memHost.id = 'ambMembers'; buildMembers(); } else {
      const t = [...takenNames().names].join(',');
      if (t !== nameSig) buildMembers();
    }
    list.appendChild(memHost);
    const head = document.getElementById('memberHead');
    if (head) {
      const m = /(\d+)\s*$/.exec(head.textContent);
      if (m) head.textContent = head.textContent.replace(/(\d+)\s*$/, String(parseInt(m[1], 10) + memStats.online));
    }
  }

  // ---------- peek drawer: read-only look at an ambient channel ----------
  function msgNodeA(m) {
    if (m.sys) { const s = mk('div', 'msg system amb-sys', m.text); return s; }
    const box = mk('div', 'msg amb-msg');
    box.appendChild(avatar(m.who));
    const body = mk('div', 'msg-body');
    const head = mk('div', 'msg-head');
    const name = mk('span', 'msg-name', m.who.name);
    name.style.color = m.who.color;
    head.appendChild(name);
    if (m.who.bot) head.appendChild(mk('span', 'amb-bot', 'BOT'));
    head.appendChild(mk('span', 'msg-time', fmtClock(m.clock)));
    body.append(head, mk('div', 'msg-text', m.text));
    box.appendChild(body);
    return box;
  }
  function addPeekMsg(m, stick) {
    if (!peek || !peek.log) return;
    const log = peek.log;
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.appendChild(msgNodeA(m));
    while (log.children.length > SCHED.histMax) log.firstChild.remove();
    if (stick && near) log.scrollTop = log.scrollHeight;
  }
  function onPeekKey(e) {
    if (e.key === 'Escape' && peek) { e.stopPropagation(); closePeek(); }
  }
  function closePeek() {
    if (!peek) return;
    const p = peek;
    peek = null;
    document.removeEventListener('keydown', onPeekKey, true);
    p.box.remove();
    if (p.trigger && p.trigger.isConnected && p.restore !== false) { try { p.trigger.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function canPeek() {
    return !BUSY_PHASES.includes(S.phase) && $('#modal').hidden && !(S.gn && S.gn.busy);
  }
  function openMore(trigger) {
    if (!st) return;
    if (!canPeek()) { toast('Busy', 'finish what you are doing first'); return; }
    closePeek();
    const box = mk('aside', 'amb-peek amb-more-list');
    box.id = 'ambPeek';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'More channels (read only)');
    const head = mk('div', 'amb-peek-head');
    head.append(mk('span', 'amb-peek-title', 'More channels'));
    const x = mk('button', 'icon-btn amb-peek-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close channel list');
    x.addEventListener('click', closePeek);
    head.appendChild(x);
    box.appendChild(head);
    const list = mk('div', 'amb-log');
    const base = new Set(TEXT.concat(VOICE, [AFK_CH]).map((c) => c.id));
    textCh().filter((c) => !base.has(c.id)).forEach((c) => {
      const b = mk('button', 'ch amb-ch' + (c.muted ? ' muted' : ''));
      b.type = 'button';
      b.dataset.amb = c.id;
      const n = st.unread[c.id] || 0;
      b.append(mk('span', 'ch-ic', c.icon), mk('span', 'ch-name', c.name), mk('span', 'ch-badge amb-badge', n ? String(n) : ''));
      b.addEventListener('click', () => openPeek(c.id, trigger));
      list.appendChild(b);
    });
    box.appendChild(list);
    box.appendChild(mk('div', 'amb-peek-foot', 'Read-only. Nobody here can ping you.'));
    document.body.appendChild(box);
    peek = { box, id: null, log: null, trigger };
    document.addEventListener('keydown', onPeekKey, true);
    x.focus({ preventScroll: true });
  }
  function openPeek(cid, trigger) {
    if (!st) return;
    const ch = st.data.channels.find((c) => c.id === cid);
    if (!ch) return;
    if (!canPeek()) { toast('Busy', 'finish what you are doing first'); return; }
    closePeek();
    const box = mk('aside', 'amb-peek');
    box.id = 'ambPeek';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', `${ch.name} (read only)`);
    const head = mk('div', 'amb-peek-head');
    head.append(mk('span', 'amb-peek-title', `${ch.icon} ${ch.name}`));
    const x = mk('button', 'icon-btn amb-peek-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close channel preview');
    x.addEventListener('click', closePeek);
    head.appendChild(x);
    box.appendChild(head);
    const tp = st.data.topics[cid];
    const topic = (tp && tp.topic) || ch.topic;
    if (topic) box.appendChild(mk('div', 'amb-peek-topic', topic));
    if (tp && tp.pinned.length) {
      const pins = mk('div', 'amb-pins');
      pins.appendChild(mk('div', 'amb-pins-h', '📌 Pinned'));
      tp.pinned.forEach((p) => pins.appendChild(mk('div', 'amb-pin', p)));
      box.appendChild(pins);
    }
    const log = mk('div', 'amb-log');
    log.setAttribute('role', 'log');
    log.tabIndex = 0;
    log.setAttribute('aria-label', `Messages in ${ch.name}`);
    box.appendChild(log);
    box.appendChild(mk('div', 'amb-peek-foot', 'Read-only. Nobody here can ping you.'));
    document.body.appendChild(box);
    peek = { box, id: cid, log, trigger };
    (st.hist[cid] || []).forEach((m) => log.appendChild(msgNodeA(m)));
    log.scrollTop = log.scrollHeight;
    st.unread[cid] = 0;
    paintBadge(cid);
    document.addEventListener('keydown', onPeekKey, true);
    x.focus({ preventScroll: true });
  }

  // ---------- lifecycle ----------
  function seed() {
    // a little backlog so a freshly opened channel is not empty (older timestamps, not counted as unread)
    textCh().forEach((c) => {
      const lines = st.data.chatter[c.id];
      if (!lines) return;
      const members = live().filter((m) => !m.bot);
      const n = SCHED.seed + Math.floor(Math.random() * 3);
      const h = (st.hist[c.id] = []);
      for (let i = 0; i < n; i++) {
        const l = pickW(lines, (x) => x.w);
        let who = l.who === 'any' ? (members.length ? pick(members) : null) : st.data.members.find((m) => m.id === l.who);
        if (!who) continue;
        h.push({ who, text: fill(l.text, who), clock: clockNow() - (n - i) * 2 });
      }
    });
    const first = textCh()[0];
    if (first && st.data.events.length) {
      (st.hist[first.id] = st.hist[first.id] || []).push({ sys: true, text: fill(pick(st.data.events.filter((s) => !/\{me\}/.test(s))) || '', null, true), clock: clockNow() - 1 });
    }
  }
  function mount() {
    try {
      const id = typeof packId === 'string' ? packId : 'classic';
      closePeek();
      if (!st || st.pack !== id) {
        stopTimer();
        const d = clean(rawFor(id));
        if (rawFor(id) && !d) warn('ambient data for "' + id + '" is invalid; skipped');
        st = d ? { pack: id, data: d, hist: Object.create(null), unread: Object.create(null), open: new Set(), recent: [], dom: null } : null;
        memHost = null;
        nameSig = '';
        meEv = 0;
        lastCh = '';
        if (st) { seed(); lastShuffle = performance.now(); }
      }
      mountSide();
      mountRail();
      if (st && !timer) schedule();
      if (!st) stopTimer();
      if (!st && memHost) { memHost.remove(); memHost = null; }
    } catch (e) {
      warn('mount failed: ' + (e && e.message));
      st = null;
      stopTimer();
    }
  }
  function frame() {
    if (peek && !canPeek()) closePeek();
  }
  function safeMembers(list) {
    try { members(list); } catch (e) { warn('members failed: ' + (e && e.message)); }
  }

  window.AFK_AMB = {
    mount,
    members: safeMembers,
    frame,
    pump(n) { let k = 0; if (st) for (let i = 0; i < (n || 1); i++) if (genOne()) k++; return k; },
    shuffle() { if (st) shuffle(); },
    debug() {
      const hist = {};
      if (st) Object.keys(st.hist).forEach((k) => { hist[k] = st.hist[k].length; });
      return {
        pack: st && st.pack, timers: timer ? 1 : 0, channels: st ? st.data.channels.length : 0,
        texts: st ? textCh().length : 0, members: live().length, total: st ? st.data.members.length : 0,
        hist, unread: st ? { ...st.unread } : {}, peek: peek ? peek.id : null, rail: st ? st.data.rail.length : 0,
      };
    },
    closePeek,
    openPeek: (cid) => openPeek(cid, null),
    openMore: () => openMore(null),
  };
  window.AFK.modules.push('ambient');
})();
