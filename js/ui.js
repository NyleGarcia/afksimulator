'use strict';
/* AFK Simulator / js/ui.js: sidebar channels + members, syncUI/chip/render/toast.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

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
  vcBuildBar(); // phone voice bar (js/voice.js); the sidebar rows below are real buttons
  VOICE.concat([AFK_CH]).forEach((c) => {
    const row = c === AFK_CH ? el('div', 'ch', chanLabel(c)) : vcMkBtn(c);
    if (c !== AFK_CH) vcRegister(c, row);
    if (c.desc && c === AFK_CH) row.title = c.desc;
    const box = el('div', 'vc-members');
    if (c === VOICE[0]) box.id = 'vcMembers';
    if (c === AFK_CH) { row.id = 'afkChan'; box.id = 'afkMembers'; }
    vb.append(row, box);
    chanBoxes.set(c.id, { row, box });
  });
  $('#chatName').textContent = chanLabel(activeCh());
  renderChannelList();
  if (window.AFK_AMB) AFK_AMB.mount(); // ambient server: extra channels, rail icons (js/ambient.js)
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
  const parked = (S.inAfkCh || !!S.parked) && !S.kicked; // parked = still sitting in the AFK channel (classic: until you rejoin voice)
  const meState = S.kicked ? 'offline' : S.phase === 'afk' || parked ? 'idle' : 'online';
  const box = (c) => (chanBoxes.get(c.id) || {}).box;
  const all = [{ ...ME, isMe: true, state: meState, sub: parked ? `moved to ${chanLabel(AFK_CH)}` : meState === 'idle' ? 'AFK 🌙' : meState === 'offline' ? 'kicked' : 'Playing AFK Simulator' }]
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
  vcSync();
  $('#memberHead').textContent = `ONLINE — ${online}`;
  if (window.AFK_AMB) AFK_AMB.members(list); // grouped ambient roster below the crew; adds its online count to the head
  const dot = $('#meAvatar .dot');
  dot.className = 'dot ' + meState;
  $('#meName').textContent = ME.name;
  const ml = $('#meAvatar');
  if (ml.firstChild && ml.firstChild.nodeType === 3) ml.firstChild.nodeValue = firstCh(ME.name);
  $('#meStatus').textContent = meState === 'idle' ? afkStatusShort() : meState === 'offline' ? 'Kicked' : 'Online';
}

// redraws the inventory, build line and ability strip only when something they show has changed
let uiSig = '';
function syncUI() {
  if (!S.charges) return;
  const sig = [S.phase, tokens, S.kicked, JSON.stringify(S.charges), JSON.stringify(S.armedItems), JSON.stringify(S.cons), JSON.stringify(inv), JSON.stringify(S.rd), S.phase === 'triage' ? owedPings().length : 0, S.run ? [S.run.gold, S.run.alts, S.run.relics.length, JSON.stringify(S.run.boons), S.run.curses.length].join(',') : ''].join('|');
  if (sig === uiSig) return;
  uiSig = sig;
  renderInv();
  renderAbilities();
}

function afkStatusShort() {
  if (S.inAfkCh || (S.parked && !S.kicked)) return `Moved to ${chanLabel(AFK_CH)}${S.rejoin ? ' · rejoin voice' : ''}`;
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
  $('#hudBest').textContent = fmtN(Math.max(S.gn && GN ? GN.bestScore() : bestScore(), S.score));
  const sus = S.gn ? clamp(S.sus, 0, 100) : clamp(100 * S.sus / kickAt(), 0, 100); // the bar shows suspicion against the kick line (susCap raises it)
  const fill = $('#susFill');
  fill.style.width = sus + '%';
  fill.className = 'sus-fill' + (sus >= 70 ? ' high' : sus >= 35 ? ' mid' : '');
  $('#susPct').textContent = Math.floor(sus) + '%';
  syncUI();
  $('.sus-bar').setAttribute('aria-valuenow', String(Math.floor(sus)));
  if (S.run) { rgHudRender(); rgBarRender(); }

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
    if (S.inAfkCh && S.autoMoved) st = `${AFK_CH.icon} moved to ${AFK_CH.name} at ${fmtMins(S.movedAt)}${S.botBump ? ` · 🤖 AFK bot flagged you: +${S.botBump}% suspicion` : ''} · suspicion frozen · points capped at ${fmtN(S.cap)}`;
    else if (S.aloneSince != null) st = `Discord: you've been alone for ${fmtMins(S.mins - S.aloneSince)}`;
    else if (S.path && S.path.events.includes('alone-drift')) st = `friends in ${curVc().name}: ${S.friends.filter(inVcNow).length}/${S.friends.length}`;
    $('#afkStatus').textContent = st;
    $('#meStatus').textContent = afkStatusShort();
    document.title = S.unread ? `(${S.unread}) AFK Simulator` : 'AFK Simulator';
  }
  if (chanDirty) renderChannelList();
  if (window.AFK_AMB) AFK_AMB.frame();
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

window.AFK.modules.push('ui');
