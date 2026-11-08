'use strict';
/* AFK Simulator / js/overlays.js: persistence, achievements, modals, share, pack picker, leaderboard, start + game-over screens.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

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
  if (S.crewNames && S.crewNames.length) { entry.cw = S.crewNames.slice(0, 3); if (S.crewNames.length > 3) entry.cx = S.crewNames.length - 3; }
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
    tr.append(el('td', '', `#${i + 1}`), el('td', '', sanitizeName(s.name)), el('td', 'n', fmtN(s.s)), el('td', '', `r${safeInt(s.r, 1, 9999, 1)}`), el('td', '', fmtMins(s.l || 0)), el('td', '', String(s.d || '')));
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
// stored entries come from localStorage: numbers are re-validated before they reach text
const safeInt = (v, lo, hi, d) => (Number.isFinite(v) && v >= lo ? Math.min(hi, Math.floor(v)) : d);
function shareText(e) {
  const x = e || { name: ME.name, s: S.score, r: S.round, l: S.longest, c: S.combo, p: S.longestPath, m: S.longestMode, k: packId, f: favCh(), cw: (S.crewNames || []).slice(0, 3), cx: Math.max(0, (S.crewNames || []).length - 3) };
  const rnd = safeInt(x.r, 1, 9999, 1);
  const cmb = safeInt(x.c, 0, 9999, 0);
  const pm = x.k && x.k !== 'classic' ? metaOf(x.k) : null;
  const inSrv = pm ? `in ${escMd(pm.server && pm.server.name ? pm.server.name : pm.name)} · ` : '';
  const via = x.p && typeof x.p === 'string'
    ? ` · via ${escMd(x.p.slice(0, 24).toLowerCase())}${MODES.includes(x.m) ? `, ${x.m} server` : ''}`
    : '';
  const fav = typeof x.f === 'string' && CH_ID.test(x.f) ? ` · fav #${escMd(x.f.slice(0, 24))}` : '';
  // saved entries live in localStorage, so crew names are sanitized again on the way out
  const cw = window.AFK_ROSTER && Array.isArray(x.cw) ? x.cw.slice(0, 3).map((n) => window.AFK_ROSTER.sanitizeCrewName(n)).filter(Boolean) : [];
  const cx = Number.isInteger(x.cx) && x.cx > 0 && x.cx <= 8 ? x.cx : 0;
  const crew = cw.length ? ` · with ${cw.map(escMd).join(', ')}${cx ? `, +${cx}` : ''}` : '';
  return `**${escMd(sanitizeName(x.name))}** got **${fmtN(x.s)}** pts in AFK Simulator 💤\n${inSrv}round ${rnd} · longest AFK ${fmtMins(x.l || 0)}${via}${cmb ? ` · x${cmb} combo` : ''}${fav}${crew} · ${achCount()}/${Object.keys(ACH).length} achievements${itemCount() ? ` · ${itemCount()} item${itemCount() === 1 ? '' : 's'}` : ''}\n${SITE_URL}`;
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
  const box = el('div', 'share-box');
  box.append(row, shareImageButtons(() => classicCardSpec(getEntry())));
  return box;
}

// ---------- settings / leaderboard ----------
// pack picker: 'The Boys (classic)' vs installed packs. onDone runs after the switch so the caller can redraw.
function packPicker(onDone, beforeSwitch) {
  const box = el('div', 'pack-picker');
  PACKLIST.forEach((pk) => {
    const b = el('button', 'btn alt pack-btn', pk.name);
    b.dataset.pack = pk.id;
    b.setAttribute('aria-pressed', String(pk.id === packId));
    b.addEventListener('click', () => {
      if (pk.id === packId) return;
      if (beforeSwitch) beforeSwitch();
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

function showLeaderboard(tab) {
  const which = tab === 'rogue' || tab === 'classic' || tab === 'gamenight' ? tab : store.get('lbTab', 'classic');
  const useTab = which === 'rogue' && rogueAvail() ? 'rogue' : which === 'gamenight' && gnAvail() ? 'gamenight' : 'classic';
  const tl = el('div', 'shop-tabs');
  tl.setAttribute('role', 'tablist');
  tl.setAttribute('aria-label', 'Leaderboard');
  [['classic', 'Classic'], ['rogue', 'Rogue'], ['gamenight', 'Game Night']].forEach(([id, label]) => {
    if (id === 'rogue' && !rogueAvail()) return;
    if (id === 'gamenight' && !gnAvail()) return;
    const b = el('button', 'shop-tab', label);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.tab = id;
    b.setAttribute('aria-selected', String(id === useTab));
    b.tabIndex = id === useTab ? 0 : -1;
    b.addEventListener('click', () => { store.set('lbTab', id); showLeaderboard(id); setTimeout(() => { const f = $('#modalCard .shop-tab[aria-selected="true"]'); if (f) f.focus(); }, 0); });
    tl.appendChild(b);
  });
  tl.addEventListener('keydown', (e) => {
    const bs = Array.from(tl.querySelectorAll('.shop-tab'));
    let i = bs.indexOf(document.activeElement);
    if (i < 0 || bs.length < 2) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); bs[(i + 1) % bs.length].click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].click(); }
  });
  if (useTab === 'gamenight') {
    const gs = GN.gnScores();
    const nodes = [el('h1', '', '🏆 Leaderboard', 'modalTitle'), tl, GN.leaderboardNode()];
    if (gs.length) {
      const row = el('div', 'btn-row');
      const c = el('button', 'btn alt', 'Copy for Discord', 'gnShare');
      c.addEventListener('click', () => copyText(GN.topShareText()));
      row.appendChild(c);
      nodes.push(row);
      nodes.push(shareImageButtons(() => GN.topCardSpec()));
      const clr = el('button', 'btn danger', 'Clear Game Night leaderboard');
      let armed = false;
      let timer = 0;
      clr.addEventListener('click', () => {
        if (!armed) { armed = true; clr.textContent = 'Click again to confirm'; timer = setTimeout(() => { armed = false; clr.textContent = 'Clear Game Night leaderboard'; }, 4000); return; }
        clearTimeout(timer);
        store.set('gnScores', []);
        showLeaderboard('gamenight');
      });
      nodes.push(clr);
    }
    nodes.push(GN.achListNode());
    const back = el('button', 'btn', 'Close');
    back.addEventListener('click', closeOverlay);
    nodes.push(back);
    openOverlay('leaderboard', nodes);
    return;
  }
  if (useTab === 'rogue') {
    const rs = getRogueScores();
    const nodes = [el('h1', '', '🏆 Leaderboard', 'modalTitle'), tl, rogueScoresTable()];
    if (rs.length) {
      nodes.push(rogueShareButtons(() => getRogueScores()[0]));
      const clr = el('button', 'btn danger', 'Clear rogue leaderboard');
      let armed = false;
      let timer = 0;
      clr.addEventListener('click', () => {
        if (!armed) { armed = true; clr.textContent = 'Click again to confirm'; timer = setTimeout(() => { armed = false; clr.textContent = 'Clear rogue leaderboard'; }, 4000); return; }
        clearTimeout(timer);
        store.set('rogueScores', []);
        showLeaderboard('rogue');
      });
      nodes.push(clr);
    }
    const back = el('button', 'btn', 'Close');
    back.addEventListener('click', closeOverlay);
    nodes.push(back);
    openOverlay('leaderboard', nodes);
    return;
  }
  const scores = getScores();
  const nodes = [el('h1', '', '🏆 Leaderboard', 'modalTitle')];
  if (rogueAvail() || gnAvail()) nodes.push(tl);
  nodes.push(scoresTable(true));
  if (scores.length) {
    nodes.push(shareButtons(() => {
      const b = getScores()[0];
      return { name: sanitizeName(b.name), s: b.s, r: b.r, l: b.l, c: 0, p: b.p, m: b.m, k: b.k, cw: b.cw, cx: b.cx };
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
      showLeaderboard('classic');
    });
    nodes.push(clr);
  }
  const back = el('button', 'btn', 'Close');
  back.addEventListener('click', closeOverlay);
  nodes.push(back);
  openOverlay('leaderboard', nodes);
}

function overlayLinks() {
  const row = el('div', 'btn-row');
  const lb = el('button', 'btn alt', '🏆 Leaderboard');
  lb.addEventListener('click', showLeaderboard);
  const sh = el('button', 'btn alt', modeNow() === 'rogue' ? '📚 Archive' : '🛒 Shop');
  sh.addEventListener('click', modeNow() === 'rogue' ? () => rgArchive() : showShop);
  const st = el('button', 'btn alt', '⚙️ Settings');
  st.addEventListener('click', showSettings);
  row.append(lb, sh, st);
  return row;
}

function showStart() {
  if (modeNow() === 'rogue') { showRogueStart(); return; }
  if (modeNow() === 'gamenight') { showGnStart(); return; }
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
  if (rogueAvail() || gnAvail()) head.push(modeSwitch(false));
  if (PACKLIST.length > 1) {
    head.push(el('h3', '', 'SERVER'), packPicker(showStart));
    const pkMeta = R.packs && R.packs[packId];
    if (pkMeta && pkMeta.server.tagline) head.push(el('p', 'pack-note', pkMeta.server.tagline));
  }
  openModal(head.concat([ul, scoresTable(), achList(), overlayLinks(), btn]));
}

function showRogueStart() {
  const head = [el('h1', '', `💤 AFK Simulator · ${RX().rc.flavor.runName}`, 'modalTitle'), el('p', 'tag', `You are ${ME.name}. Say brb. Don't come back. This time it is a run.`), modeSwitch(false)];
  if (PACKLIST.length > 1) {
    head.push(el('h3', '', 'SERVER'), packPicker(showStart));
  }
  const panel = rgStartPanel();
  modalReturn = showStart;
  const best = META.bestByAsc;
  const bl = Object.keys(best).length ? el('p', 'pack-note', 'Best: ' + Object.keys(best).sort().map((a) => `A${a} ${fmtN(best[a])}`).join(' · ')) : null;
  openModal(head.concat(panel.nodes, bl ? [bl] : [], [rogueScoresTable(), overlayLinks(), panel.go]));
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

window.AFK.modules.push('overlays');
