'use strict';
/* AFK Simulator / js/chat.js: text channels: history, post/pings/LoR, switching, mute, actions panel, slowmode, triage.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- text channels: per-channel history, unread/mention state, pings ----------
// tuning for the channel game (docs: CONTENT.md "Channels")
const CT = { base: 1.6, cap: 14, seenMult: 1.25, follows: 3, hist: 200, muteMax: 3, brbW: 2, visMid: 0.85 };
const DEFAULT_REPLIES = [{ t: 'here', r: [1, 5] }, { t: 'sorry, on it', r: [2, 7] }, { t: 'mb just saw this', r: [0, 6] }, { t: 'yes?', r: [1, 4] }];
const FOLLOWUPS = ['@{me} did you see my message in {ch}??', 'yo @{me} check {ch}', '@{me} i pinged you in {ch} bro', '@{me} {ch}. now.'];
muted = store.get('muted', false) === true; // the sound flag is strictly boolean (session.js reads it loosely; a stored 'false' string or 0 must not mute)
const textById = (id) => TEXT.find((c) => c.id === id);
function activeCh() { return (S.active && textById(S.active)) || TEXT[0]; }
const defCh = () => ((S.phase === 'chat' || S.phase === 'intro' || S.phase === 'over' || S.phase === 'gn') ? S.active : (S.brbCh && S.ch[S.brbCh] ? S.brbCh : S.active));
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
  const mRe = new RegExp('(@' + escRe(ME.name) + '|@everyone)', 'i'); // @everyone highlights too (view-only channels use it)
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
    if (part && (part.toLowerCase() === '@' + ME.name.toLowerCase() || part.toLowerCase() === '@everyone')) {
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
  rctDecorate(box, head, body, m); // reaction button, chips, acknowledge button (js/reactions.js)
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
  $('#chatName').textContent = chanLabel(c) + (rctRO(c) ? ' 🔒' : '');
  rctClosePop(false);
  rctComposer();
  setTimeout(() => { box.setAttribute('aria-busy', 'false'); box.setAttribute('aria-live', 'polite'); }, 60);
}
const composerNow = () => (S.kicked || (S.phase !== 'afk' && rctRO(activeCh())) ? 'You do not have permission to send messages in this channel.' : S.phase === 'afk' ? `${ME.name} is typing... (he is not)` : composerIdle());

function addPing(id, who, weight, follow) {
  const c = textById(id);
  const p = { id: ++S.pingSeq, ch: id, from: who && who.name ? who.name : '?', minsAtSend: S.mins, weight: weight || 1, answered: false, seen: false, forgiven: false, delivered: true, deliverAt: 0, isFollow: !!follow, followed: false, late: 0 };
  if (S.ch[id].muted) { p.delivered = false; p.deliverAt = S.mins + rand(c.muteDelay[0], c.muteDelay[1]); }
  S.pings.push(p);
  return p;
}

// ---------- speaker queue: one friend/bot line at a time while you are AFK ----------
// Friend and bot lines posted during the AFK phase wait their turn: a 'name is typing…' beat, then one message, then a
// short gap. Pings from several channels queue instead of landing together. A ping record (addPing) is created when the
// line LANDS, so minsAtSend, seen and left-on-read accounting see exactly what the player could have seen; weights are
// untouched. Lines still queued when the AFK session ends (return, drag, kick, reset, mode switch) are dropped. Player
// lines, system lines, opts.now, the catch-up loop and the ?debug fast sim bypass the queue. Tuning: CONTENT.md "Chat pacing".
CT.q = { on: true, cap: 6, typeMin: 900, typeMax: 2200, typePerCh: 22, typeBase: 700, gapMin: 1500, gapMax: 2600, rush: 3, rushMult: 0.55 };
const CQ = { items: [], head: null, timer: 0, readyAt: 0, landAt: 0, stamp: '', dropped: 0 };
const cqStamp = () => gen + ':' + S.afkAt;
const cqIsPing = (it) => mentionRe().test(it.text) || /@everyone/i.test(it.text);
const cqShould = (who, opts) => CT.q.on && S.phase === 'afk' && !S.kicked && who && who !== ME && !opts.system && !opts.now && !catchingUp && !FAST;
function cqTyping(it) {
  let row = $('#typingRow');
  if (!row) {
    const box = $('#messages');
    if (!box || !box.parentNode) return;
    row = document.createElement('div');
    row.id = 'typingRow';
    row.className = 'typing-row';
    row.setAttribute('aria-hidden', 'true');
    const chip = document.createElement('span');
    chip.className = 'typing-chip';
    row.appendChild(chip);
    box.parentNode.insertBefore(row, box.nextSibling);
  }
  const show = !!it && rctGuard(it.who, it.id, it.opts) === S.active;
  row.hidden = !show;
  if (show) row.firstChild.textContent = it.who.name + ' is typing…';
}
function cqClear() {
  CQ.items.length = 0;
  CQ.head = null;
  clearTimeout(CQ.timer);
  CQ.timer = 0;
  CQ.readyAt = 0;
  cqTyping(null);
}
function cqSched(ms) { clearTimeout(CQ.timer); CQ.timer = setTimeout(cqTick, Math.max(0, ms)); }
function cqTick() {
  CQ.timer = 0;
  if (CQ.stamp !== cqStamp() || S.phase !== 'afk' || S.kicked) { cqClear(); return; }
  const now = performance.now();
  if (CQ.head) {
    if (now < CQ.landAt) { cqSched(CQ.landAt - now); return; }
    const it = CQ.head;
    CQ.head = null;
    cqTyping(null);
    postNow(it.who, it.text, it.id, it.ambient, it.opts);
    const pings = CQ.items.filter(cqIsPing).length;
    CQ.readyAt = now + rand(CT.q.gapMin, CT.q.gapMax) * (pings >= CT.q.rush ? CT.q.rushMult : 1);
    if (CQ.items.length) cqSched(CQ.readyAt - now);
    return;
  }
  if (!CQ.items.length) return;
  if (now < CQ.readyAt) { cqSched(CQ.readyAt - now); return; }
  CQ.head = CQ.items.shift();
  const typ = clamp(CT.q.typeBase + CQ.head.text.length * CT.q.typePerCh, CT.q.typeMin, CT.q.typeMax);
  CQ.landAt = now + typ;
  cqTyping(CQ.head);
  cqSched(typ);
}
function cqPush(it) {
  if (CQ.stamp !== cqStamp()) { cqClear(); CQ.stamp = cqStamp(); }
  it.ping = cqIsPing(it);
  if (CQ.items.length >= CT.q.cap) { // full: drop the oldest filler; a ping is never dropped
    const i = CQ.items.findIndex((x) => !x.ping);
    if (i >= 0) { CQ.items.splice(i, 1); CQ.dropped++; }
    else if (!it.ping) { CQ.dropped++; return; }
  }
  CQ.items.push(it);
  if (!CQ.timer) cqSched(CQ.head ? CQ.landAt - performance.now() : Math.max(0, CQ.readyAt - performance.now()));
}
const cqState = () => ({ len: CQ.items.length + (CQ.head ? 1 : 0), typing: CQ.head ? CQ.head.who.name : null, dropped: CQ.dropped, pings: CQ.items.filter((x) => x.ping).length + (CQ.head && CQ.head.ping ? 1 : 0) });
function cqFlush() { // tests / debug: land everything now, in order
  const all = (CQ.head ? [CQ.head] : []).concat(CQ.items);
  cqClear();
  all.forEach((it) => postNow(it.who, it.text, it.id, it.ambient, it.opts));
}

function post(who, text, opts = {}) {
  text = meTok(text, who);
  const id = opts.ch && S.ch[opts.ch] ? opts.ch : defCh();
  const ambient = rctTake(id); // weightedCh/routeCh just picked this channel for an ambient line (taken now, used when the line lands)
  if (cqShould(who, opts)) { cqPush({ who, text, id, ambient, opts }); return; }
  postNow(who, text, id, ambient, opts);
}
function postNow(who, text, id, ambient, opts) {
  id = rctGuard(who, id, opts); // view-only channels: only bots/officers post there
  const st = S.ch[id];
  const other = who !== ME && !opts.system;
  if (other && ambient && !opts.follow && !opts.keep && !rctIsDig(who, text)) { // the line must be about the channel's topic (keep the ping if it was one)
    const tl = rctTopicLine(textById(id), mentionRe().test(text));
    if (tl) text = meTok(tl, who);
  }
  const m = { who, text, sys: !!opts.system, tone: opts.tone || '', clock: S.clock, ch: id, mention: other && rctMentions(textById(id), text) };
  st.msgs.push(m);
  if (st.msgs.length > CT.hist) st.msgs.shift();
  const shown = id === S.active;
  if (shown) paint(m);
  rctAfterPost(m, id, opts);
  if (!other) return;
  const afk = S.phase === 'afk';
  chanDirty = true;
  if (m.mention && afk) {
    const p = addPing(id, who, opts.weight, opts.follow);
    if (opts.fight) p.fight = true;
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
  const pool = TEXT.filter((c) => c.id !== skip && !(skip && rctRO(c))); // follow-ups never go to a view-only channel
  const list = pool.length ? pool : TEXT;
  const w = list.map((c) => (0.4 + c.busyness) * (c.id === S.brbCh ? CT.brbW : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  let pick_ = list[list.length - 1].id;
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) { pick_ = list[i].id; break; } }
  rctMark(pick_); // the next post there is an ambient line: it is swapped for a line from the channel's topic pool
  return pick_;
}
// pref = the channel the line belongs in (fight planning, cargo prices): it always goes there. No pref = server-lore
// chatter, which lands in a channel that has no topic of its own (general), not in #ship-art
function routeCh(pref) {
  const pc = pref && textById(pref);
  if (pc && !rctRO(pc)) return pref;
  const open = TEXT.filter((c) => !rctRO(c) && !rctPool(c));
  if (open.length) {
    const w = open.map((c) => 0.4 + c.busyness);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < open.length; i++) { r -= w[i]; if (r < 0) return open[i].id; }
    return open[open.length - 1].id;
  }
  return weightedCh();
}
function friendIn(cid, not) {
  const c = textById(cid);
  if (c && rctRO(c)) return rctPoster(c);
  const ok = (f) => !f.away && f.name !== not;
  const here = c ? S.friends.filter((f) => ok(f) && c.members.includes(f.id)) : [];
  if (here.length) return pickQ(here);
  const any = S.friends.filter(ok);
  return any.length ? pickQ(any) : friend();
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
  pen = Math.min(CT.cap * (1 + (S.run ? S.run.rules.lorCapAdd : 0)), pen) * clamp(0.5 + 0.25 * S.round, 0.75, 1) * scale;
  return { pen, un, byCh };
}
// suspicion can rise by the penalty, but the penalty alone never takes you past 90% (kicks come from the usual paths)
function applyLor(res, refund, ch) {
  const before = S.sus;
  const ns = clamp(Math.min(before + res.pen - refund, Math.max(before, 0.9 * kickAt())), 0, kickAt());
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
  rctComposer();
  rctWatchRead(id);
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
  if (S.rd && S.rd.mutedOff) { toast('Cannot mute', 'the boss rules unmuted every channel this round'); return; }
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
      const ro = rctRO(c);
      b.classList.toggle('readonly', ro);
      const ic = b.querySelector('.ch-ic');
      if (ic && ic.textContent !== (ro ? '🔒' : c.icon)) ic.textContent = ro ? '🔒' : c.icon;
      b.title = (c.desc || '') + (ro ? (c.desc ? ' ' : '') + '(view only)' : '');
      b.setAttribute('aria-label', labelOf(c) + (ro ? ', view only' : '') + (m > 0 ? `, ${m} mention${m > 1 ? 's' : ''}` : dot ? ', unread messages' : '') + (st.muted ? ', muted' : '') + (active ? ', current channel' : ''));
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
  if (/^SAY BRB IN /.test(title) && rctRO(activeCh())) { // view-only channel: you cannot post the brb here
    const lab = labelOf(activeCh());
    title = `${lab.toUpperCase()} IS VIEW ONLY`;
    options = options.map((opt) => ({ ...opt, disabled: true, sub: 'You do not have permission to post here' }));
    o = { ...o, hint: `You do not have permission to send messages in ${lab}. Click another channel to say brb there.` };
  }
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
    if (opt.cls) b.classList.add(opt.cls);
    if (opt.id) b.dataset.act = opt.id;
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
  const total = Math.round(clamp(7000 + 3500 * chs.length, 9000, 22000) * getMods().triageTime);
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
  if (mine.length && !tri.list && rctRO(c)) { // view-only channel: you cannot reply, you read and acknowledge
    const opts = [
      { label: '✅ Acknowledge', sub: `read ${labelOf(c)}: clears the ping (staying here a moment counts as reading)`, fn: () => rctAck(c.id, 'click') },
      { label: '◂ other channels', sub: 'back to the list', fn: () => { tri.list = true; setCtx(buildTriage); } },
    ];
    setActions(`${labelOf(c)} IS VIEW ONLY · ${mine.length} ping${s(mine.length)}`, opts, null, { noFocus, timer, hint: 'You cannot reply here. Acknowledge the announcement to clear the ping.' });
    return;
  }
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
  S.exOpts = opts;
  setCtx((noFocus) => {
    const c = activeCh();
    const left = slowLeft(c.id);
    setActions('YOU\'RE BACK. EXPLAIN YOURSELF.', opts.map((e) => {
      const used = S.uses[e.k || e.t] || 0;
      const ro = rctRO(c);
      const locked = (left > 0 || ro) && !e.quiet;
      return {
        label: e.t,
        sub: ro && !e.quiet ? `${labelOf(c)} is view only: switch to a channel you can post in` : locked ? `slowmode in ${labelOf(c)}: ${left}s (switch channel or wait)` : e.quiet ? 'say nothing. pure sigma energy. x1.25 pts' : used ? `used ${used}x. they have screenshots.` : 'untested excuse (mom has not heard this one yet)',
        disabled: locked,
        fn: () => chooseExcuse(e),
      };
    }), null, { noFocus, hint: rctRO(c) ? `${labelOf(c)} is view only: click another channel to explain yourself there` : `posting in ${labelOf(c)}` });
    if (left) slowTick();
  });
}

window.AFK.modules.push('chat');
