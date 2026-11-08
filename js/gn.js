'use strict';
/* AFK Simulator / js/gn.js: GAME NIGHT adapter (engine in gamenight.js), setGameMode/modeSwitch.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- GAME NIGHT adapter (engine lives in gamenight.js; see CONTENT.md "Game Night mode") ----------
// getCrew(): the friends a Game Night season uses (max 5). Your crew from Settings when it has 3+ friends, else the server's own.
const getCrew = (useCrew = true) => (useCrew && CREW_NAMES.length >= 3 ? FRIENDS_ACTIVE : FRIENDS).slice(0, 5).map((f) => ({ ...f, away: false, vc: true }));
function gnChrome(on) {
  document.body.classList.toggle('gamenight', !!on);
  const a = $('#susLabel');
  if (a) a.textContent = on ? 'Skepticism' : 'Friend suspicion';
  const b = $('#hudRoundL');
  if (b) b.textContent = on ? 'Week' : 'Round';
  const bar = $('.sus-bar');
  if (bar) bar.setAttribute('aria-label', on ? 'Skepticism' : 'Friend suspicion');
  const sb = $('#shopBtn');
  if (sb) { sb.title = on ? 'Excuse ledger' : 'Shop'; sb.setAttribute('aria-label', on ? 'Excuse ledger' : 'Shop'); sb.textContent = on ? '📒' : '🛒'; }
  if (!on) { const h = $('#gnHud'); if (h) h.hidden = true; }
}
// GHOST: run the unchanged AFK round (brb -> path -> away -> return -> excuse); nextRound() hands the result back to the engine
function gnGhost(auto) {
  S.round = S.gn.week;
  S.armedItems = {};
  S.rd = newRd();
  S.sus = clamp(S.sus, 0, kickAt() - 1);
  S.pings = [];
  S.lor = null;
  newRound();
  if (auto) {
    S.phase = 'leaving';
    S.brbCh = S.active;
    S.promise = 5;
    S.mult = 1;
    post(ME, 'oh no i forgot. brb', { ch: S.brbCh });
    choosePath(pick(pathPool()));
  } else offerBrb();
}
function gnGhostCleanup() {
  document.body.classList.remove('afk');
  $('#afkPanel').hidden = true;
  $('#composerText').textContent = composerIdle();
  document.title = 'AFK Simulator';
  S.tri = null;
  S.pings = [];
  S.lor = null;
  S.inAfkCh = false;
  S.armedItems = {};
  S.rd = newRd();
  S.clock += 2;
  S.unread = 0;
  S.friends.forEach((f) => { f.vc = true; f.away = false; });
  S.mode = null;
  renderChip();
  renderMembers();
  chanDirty = true;
  clearActions();
}
function gnFastDrain(limit = 20000) {
  let k = 0;
  while (FAST && FAST.q.length && k++ < limit) {
    FAST.q.sort((a, b) => a.t - b.t || a.n - b.n);
    const e = FAST.q.shift();
    FAST.now = Math.max(FAST.now, e.t);
    e.fn();
  }
}
function gnStartRun(over) {
  initAudio();
  if (over && typeof over === 'object') GN_API_SET(over);
  const cfg = GN.readSettings();
  reset();
  S.friends = getCrew(cfg.useCrew);
  S.crewNames = cfg.useCrew ? CREW_NAMES.slice() : [];
  S.phase = 'gn';
  gnChrome(true);
  renderMembers();
  renderInv();
  render();
  GN.start(cfg);
  closeModal();
}
const GN_API_SET = (o) => { const d = GN.debug(); d.setSettings(o); };
const GN = window.AFK_GN ? window.AFK_GN.create({
  S, ME, $, el, store, clamp, fmtN, later, post, sys, toast,
  setActions,
  clearActions, render, announce, copyText, shareImageButtons, gnCardSpec, sanitizeName, openModal, closeModal, openOverlay, closeOverlay, overlayLinks,
  DEBUG,
  content: () => (typeof R.gamenightFor === 'function' ? R.gamenightFor(packId) : null),
  crew: () => S.friends,
  pack: () => ({ id: packId }),
  packName: (id) => { const m = metaOf(id); return id === 'classic' || !m ? 'The Boys' : (m.server && m.server.name) || m.name; },
  gen: () => gen,
  chrome: gnChrome,
  ghost: gnGhost,
  ghostCleanup: gnGhostCleanup,
  sfx: (k) => { if (sfx[k]) sfx[k](); },
  setReturn: (fn) => { modalReturn = fn; },
  restart: (o) => gnStartRun(o),
  fast: (on) => { FAST = on ? { q: [], now: 0, n: 0 } : null; return !!FAST; },
  drain: () => gnFastDrain(),
  renderMembers,
}) : null;
function showGnStart() {
  const base = GN.startNodes();
  const btn = el('button', 'btn', `Log in as ${ME.name}`, 'startBtn');
  btn.addEventListener('click', () => gnStartRun());
  modalReturn = showStart;
  const head = [base[0], base[1], modeSwitch(false)];
  if (PACKLIST.length > 1) head.push(el('h3', '', 'SERVER'), packPicker(showStart));
  const set = GN.settingsNodes(() => {
    const h = $('#modalTitle');
    if (h) h.textContent = '🎲 ' + GN.titleOf();
    const li = base[2].firstChild;
    if (li) li.textContent = GN.introLine();
  });
  openModal(head.concat([base[2]], set, [GN.leaderboardNode(), GN.achListNode(), overlayLinks(), btn]));
}

// ----- mode switch + rogue start panel -----
const runInProgress = () => S.phase !== 'intro' && S.phase !== 'over' && S.phase !== 'rg-over';
function setGameMode(m) {
  if (m === gameMode || (m === 'rogue' && !rogueAvail()) || (m === 'gamenight' && !gnAvail())) return;
  gameMode = m;
  store.set('gameMode', m);
  S.run = null;
  reset();
  render();
  showStart();
}
function modeSwitch(inSettings) {
  const box = el('div', 'mode-switch');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Game mode');
  [['classic', 'Classic'], ['rogue', 'Rogue'], ['gamenight', 'Game Night']].forEach(([id, label]) => {
    const b = el('button', 'btn alt mode-btn', label);
    b.type = 'button';
    b.dataset.mode = id;
    b.setAttribute('aria-pressed', String(modeNow() === id));
    if (id === 'rogue' && !rogueAvail()) { b.disabled = true; b.title = 'Rogue content is not loaded'; }
    if (id === 'gamenight' && !gnAvail()) { b.disabled = true; b.title = 'Game Night is not loaded'; }
    let armed = 0;
    b.addEventListener('click', () => {
      if (id === modeNow()) return;
      if (inSettings && runInProgress()) {
        if (!armed) { armed = setTimeout(() => { armed = 0; b.textContent = label; }, 3500); b.textContent = 'Abandon this run?'; return; }
        clearTimeout(armed);
      }
      setGameMode(id); // shows the start screen for the new mode (replacing the settings overlay)
    });
    box.appendChild(b);
  });
  return box;
}

window.AFK.modules.push('gn');
