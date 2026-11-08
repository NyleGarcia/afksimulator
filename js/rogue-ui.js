'use strict';
/* AFK Simulator / js/rogue-ui.js: ROGUE MODE UI: end screen, HUD, archive, scores, share, URL params, start panel.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

const LD_NAME = (id) => (RX().loadout[id] || {}).name || id;
function rgEndScreen(res) {
  const run = S.run;
  const e = res.entry;
  const nodes = [];
  nodes.push(el('h1', res.win ? '' : 'bad', res.win ? '🏆 RUN CLEARED' : '💀 RUN OVER', 'modalTitle'));
  nodes.push(el('p', 'tag', `${res.newBest ? '🏆 NEW BEST SCORE! ' : ''}${res.win ? 'You were never here and the final boss still fell.' : (res.reason ? meTok(lineOr('kickReason', `Reason: ${res.reason}.`)) : 'You ran out of alts.')}`));
  const stats = el('div', 'stats');
  [[fmtN(res.score), 'final score'], [res.win ? 'cleared' : `act ${e.act} · round ${e.r}`, 'result'], [String(e.bc) + '/3', 'bosses cleared'], [e.asc ? `A${e.asc}` : 'A0', 'ascension']].forEach(([v, l]) => {
    const s = el('div', 'stat');
    s.append(el('div', 'v', v), el('div', 'l', l));
    stats.appendChild(s);
  });
  nodes.push(stats);
  nodes.push(el('p', 'rg-break', `${fmtN(res.raw)} pts x A${e.asc} ${res.am.toFixed(2)}${res.win ? ' x win 1.5' : ''} = ${fmtN(res.score)}`));
  const seedRow = el('div', 'btn-row');
  const sc = el('button', 'btn alt', `Seed ${e.seed} (copy)`, 'rgSeedCopy');
  sc.addEventListener('click', () => copyText(e.seed));
  seedRow.appendChild(sc);
  nodes.push(seedRow);
  nodes.push(el('p', 'rg-sum', `Loadout: ${LD_NAME(e.ld)} · rogue tokens +${res.earned} (${res.tokBreak.pts} pts, ${res.tokBreak.boss} bosses${res.tokBreak.win ? ', ' + res.tokBreak.win + ' win' : ''}) · total ${META.tokens}`));
  if (res.ascUnlocked) nodes.push(el('p', 'rg-unlock', `🔓 Ascension ${res.ascUnlocked} unlocked!`));
  if (res.relics.length) nodes.push(el('p', 'rg-sum', 'Relics: ' + res.relics.join(', ')));
  if (res.boons.length) {
    nodes.push(el('h3', '', `BOONS (${res.boons.reduce((a, b) => a + b.n, 0)})`));
    const box = el('div', 'achs');
    res.boons.forEach((b) => box.appendChild(el('span', `ach got rar-${b.rarity}`, `${b.icon} ${b.name}${b.n > 1 ? ' x' + b.n : ''}`)));
    nodes.push(box);
  }
  nodes.push(rogueShareButtons(() => e));
  const again = el('button', 'btn', 'Play this seed again', 'rgSameSeed');
  again.addEventListener('click', () => rgStart({ seed: e.seed, ld: e.ld, asc: e.asc }));
  const fresh = el('button', 'btn alt', 'New run', 'rgNewRun');
  fresh.addEventListener('click', () => { S.run = null; reset(); render(); showStart(); });
  const row = el('div', 'btn-row');
  const lb = el('button', 'btn alt', '🏆 Leaderboard');
  lb.addEventListener('click', () => showLeaderboard('rogue'));
  const ar = el('button', 'btn alt', '📚 Archive');
  ar.addEventListener('click', rgArchive);
  row.append(lb, ar);
  nodes.push(row, again, fresh);
  modalReturn = () => rgEndScreen(res);
  openModal(nodes, 'main');
}


// ----- HUD -----
let rgHudSig = '';
function rgHudRender() {
  const box = $('#rgHud');
  if (!box) return;
  const run = S.run;
  document.body.classList.toggle('rogue', !!run);
  if (!run) { box.hidden = true; rgHudSig = ''; return; }
  const pl = run.plan[Math.min(run.idx, 12) - 1];
  const sig = [run.idx, run.act, run.gold, run.alts, run.seed, pl.type].join('|');
  if (sig === rgHudSig && !box.hidden) return;
  rgHudSig = sig;
  box.hidden = false;
  box.textContent = '';
  const fl = RX().rc.flavor;
  const bits = [
    ['rg-act', `Act ${run.act}/3 · Round ${run.idx}/12${pl.type === 'boss' ? ' · ' + fl.bossLabel : pl.type === 'elite' ? ' · ' + fl.eliteLabel : ''}`, `${fl.actNames[run.act - 1]}, round ${run.idx} of 12`],
    ['rg-gold', `💰 ${run.gold}`, `${run.gold} gold`],
    ['rg-alts', `♥ ${run.alts}`, `${run.alts} alt accounts`],
  ];
  bits.forEach(([cls, txt, label]) => { const s = el('span', 'rg-chip ' + cls, txt); s.setAttribute('aria-label', label); box.appendChild(s); });
  const sd = el('button', 'rg-chip rg-seed', run.seed);
  sd.type = 'button';
  sd.title = 'Seed: click to copy';
  sd.setAttribute('aria-label', `Seed ${run.seed}, click to copy`);
  sd.addEventListener('click', (e) => { e.stopPropagation(); copyText(run.seed); });
  box.appendChild(sd);
}

// ----- build / run info overlay -----
function rgInfo() {
  const run = S.run;
  if (!run) return;
  const X = RX();
  const L = X.loadout[run.ld] || {};
  const nodes = [el('h1', '', `📖 ${X.rc.flavor.runName}`, 'modalTitle')];
  nodes.push(el('p', 'tag', `Seed ${run.seed} · ${L.name || run.ld}${run.asc ? ' · ascension ' + run.asc : ''} · ${run.gold} gold · ${run.alts} alt${run.alts === 1 ? '' : 's'} · ${run.rerolls} reroll${run.rerolls === 1 ? '' : 's'}`));
  const m = getMods({ noEnv: true });
  const line = window.AFK_FX.line(m, m.hits, S.charges);
  nodes.push(el('p', 'rg-sum', line || 'No effects yet.'));
  const sect = (title, arr, f) => {
    if (!arr.length) return;
    nodes.push(el('h3', '', title));
    const ul = el('ul', 'rg-list');
    arr.forEach((x) => ul.appendChild(el('li', '', f(x))));
    nodes.push(ul);
  };
  sect(`BOONS (${Object.keys(run.boons).length})`, Object.keys(run.boons).filter((id) => X.boon[id]), (id) => `${X.boon[id].icon} ${X.boon[id].name}${run.boons[id] > 1 ? ' x' + run.boons[id] : ''} · ${fxChips(X.boon[id].effects).join(' · ')}`);
  sect(`RELICS (${run.relics.length})`, run.relics.filter((id) => X.relic[id]), (id) => `${X.relic[id].icon} ${X.relic[id].name} · ${fxChips(X.relic[id].effects).join(' · ')}${X.relic[id].when ? ' (' + X.relic[id].when.roundType + ' only)' : ''}`);
  sect('CURSES', run.curses.filter((c) => X.curse[c.id]), (c) => `${X.curse[c.id].icon} ${X.curse[c.id].name} · ${c.perm ? 'cannot be removed' : c.left === 'round' ? 'this round' : c.left === 'act' ? 'this act' : 'rest of the run'}`);
  sect('SYNERGIES', run.syn.filter((id) => X.syn[id]), (id) => `✨ ${X.syn[id].name}${X.syn[id].desc ? ' · ' + X.syn[id].desc : ''}`);
  sect('BONUSES', run.temp, (t) => `${t.label || 'bonus'} · ${fxChips(t.effects).join(' · ')} (${t.until === 'act' ? 'this act' : 'rest of the run'})`);
  nodes.push(el('p', 'tag', 'Seeded: the map, offers, shop stock, events and bosses. Not seeded: chat, ping timing, mic accidents, drags. Same seed = same map, not same drama.'));
  const done = el('button', 'btn', 'Close');
  done.addEventListener('click', closeOverlay);
  nodes.push(done);
  openOverlay('rginfo', nodes);
}

// ----- Archive: spend rogue tokens on boons, relics and loadouts -----
function rgArchive(o = {}) {
  const X = RX();
  if (!X.rc) return;
  let tab = store.get('archiveTab', 'boons');
  if (!['boons', 'relics', 'loadouts'].includes(tab)) tab = 'boons';
  const nodes = [el('h1', '', '📚 Archive', 'modalTitle')];
  const wal = el('div', 'shop-build');
  wal.append(el('div', 'shop-build-title', 'ROGUE TOKENS'), el('div', 'shop-build-line', `Earned at the end of a run. ${META.wins} win${META.wins === 1 ? '' : 's'} · ${META.runs} run${META.runs === 1 ? '' : 's'} · ascension ${META.ascMax} unlocked`), el('div', 'shop-wallet', `◆ ${META.tokens}`, 'archWallet'));
  nodes.push(wal);
  const tl = el('div', 'shop-tabs');
  tl.setAttribute('role', 'tablist');
  tl.setAttribute('aria-label', 'Archive');
  ['boons', 'relics', 'loadouts'].forEach((id) => {
    const b = el('button', 'shop-tab', id[0].toUpperCase() + id.slice(1));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.tab = id;
    b.setAttribute('aria-selected', String(id === tab));
    b.tabIndex = id === tab ? 0 : -1;
    b.addEventListener('click', () => { store.set('archiveTab', id); rgArchive({ focus: [`.shop-tab[data-tab="${id}"]`] }); });
    tl.appendChild(b);
  });
  tl.addEventListener('keydown', (e) => {
    const bs = Array.from(tl.querySelectorAll('.shop-tab'));
    let i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight') i = (i + 1) % bs.length; else if (e.key === 'ArrowLeft') i = (i - 1 + bs.length) % bs.length; else return;
    e.preventDefault();
    bs[i].click();
  });
  nodes.push(tl);
  const box = el('div', 'shop');
  box.setAttribute('role', 'tabpanel');
  const items = X.rc[tab].slice().sort((a, b) => (a.unlock.tokens - b.unlock.tokens) || a.name.localeCompare(b.name));
  items.forEach((it) => {
    const have = rgUnlocked(tab, it);
    const cost = it.unlock.tokens;
    const rar = it.rarity || (tab === 'relics' ? 'legendary' : 'common');
    const row = el('div', `shop-item rar-${rar}${have ? '' : ' locked'}`);
    const info = el('div', 'shop-info');
    const nm = el('div', 'shop-name');
    nm.appendChild(document.createTextNode(`${it.icon} ${it.name} `));
    if (it.rarity) nm.appendChild(el('span', `rar-badge rar-${rar}`, rar));
    const chips = el('div', 'shop-chips');
    fxChips(it.effects || {}).forEach((c) => chips.appendChild(el('span', 'fx-chip', c)));
    info.append(nm, el('div', 'shop-desc', it.desc || ''), chips);
    const gate = tab === 'loadouts' && it.unlock.ascMax != null && !(META.ascMax > it.unlock.ascMax);
    const b = el('button', 'btn alt shop-buy', have ? (cost > 0 ? 'Unlocked' : 'Free') : gate ? 'Win A' + it.unlock.ascMax : `◆ ${cost}`);
    b.type = 'button';
    b.dataset.arch = it.id;
    b.disabled = have || gate || META.tokens < cost;
    b.setAttribute('aria-label', have ? `${it.name}: unlocked` : gate ? `${it.name}: needs a win at ascension ${it.unlock.ascMax}` : `Unlock ${it.name} for ${cost} rogue tokens${META.tokens < cost ? ' (not enough)' : ''}`);
    b.addEventListener('click', () => {
      if (META.tokens < cost || have || gate) return;
      META.tokens -= cost;
      META.unlocked[tab].push(it.id);
      saveMeta();
      sfx.cash();
      rgArchive({ focus: [`.shop-buy[data-arch="${it.id}"]`, `.shop-tab[data-tab="${tab}"]`] });
    });
    row.append(info, b);
    box.appendChild(row);
  });
  nodes.push(box);
  const done = el('button', 'btn', 'Done');
  done.addEventListener('click', closeOverlay);
  nodes.push(done);
  openOverlay('archive', nodes);
  (o.focus || []).some((sel) => { const f = $('#modalCard').querySelector(sel); if (f) f.focus({ preventScroll: true }); return !!f; });
}

// ----- rogue leaderboard + share -----
function getRogueScores() {
  const s = store.get('rogueScores', []);
  return Array.isArray(s) ? s.filter((x) => x && Number.isFinite(x.s)).sort((a, b) => b.s - a.s).slice(0, 10) : [];
}
function rogueScoresTable() {
  const scores = getRogueScores();
  const wrap = document.createDocumentFragment();
  wrap.appendChild(el('h3', '', 'ROGUE LEADERBOARD (TOP 10)'));
  if (!scores.length) { wrap.appendChild(el('p', 'tag', 'No rogue runs yet. Pick a seed and go be irresponsible.')); return wrap; }
  const t = el('table', 'scores rogue-scores');
  scores.forEach((s, i) => {
    const tr = el('tr');
    const seed = window.AFK_RNG.normSeed(s.seed) || '';
    tr.append(el('td', '', `#${i + 1}`), el('td', '', sanitizeName(s.name)), el('td', 'n', fmtN(s.s)), el('td', '', s.win ? 'WIN' : `act ${Math.floor(clamp(+s.act || 1, 1, 3))}`), el('td', '', `A${Math.floor(clamp(+s.asc || 0, 0, 5))}`), el('td', 'seed', seed), el('td', '', String(s.d || '')));
    t.appendChild(tr);
  });
  wrap.appendChild(t);
  return wrap;
}
function rogueShareText(e) {
  const X = RX();
  const seed = window.AFK_RNG.normSeed(e.seed) || 'RANDOM';
  const asc = Math.floor(clamp(+e.asc || 0, 0, 5));
  const ld = X.loadout[e.ld] ? X.loadout[e.ld].name : 'Intern';
  const ldId = ID_RE.test(String(e.ld)) ? e.ld : 'intern';
  const bosses = Math.floor(clamp(+e.bc || 0, 0, 3));
  const cw = window.AFK_ROSTER && Array.isArray(e.cw) ? e.cw.slice(0, 3).map((n) => window.AFK_ROSTER.sanitizeCrewName(n)).filter(Boolean) : [];
  const cx = Number.isInteger(e.cx) && e.cx > 0 && e.cx <= 8 ? e.cx : 0;
  const crew = cw.length ? ` · with ${cw.map(escMd).join(', ')}${cx ? `, +${cx}` : ''}` : '';
  const url = `${SITE_URL}/?mode=rogue&seed=${seed}&asc=${asc}&loadout=${ldId}`;
  const head = e.win ? `**${escMd(sanitizeName(e.name))}** cleared **ROGUE** in AFK Simulator 💤🏆` : `**${escMd(sanitizeName(e.name))}** fell in act ${Math.floor(clamp(+e.act || 1, 1, 3))} (round ${Math.floor(clamp(+e.r || 1, 1, 12))}) of **ROGUE** in AFK Simulator 💤`;
  const relics = Array.isArray(e.relics) && e.relics.length ? ` · relics: ${e.relics.slice(0, 4).map(escMd).join(', ')}` : '';
  return `${head}\n**${fmtN(e.s)}** pts · A${asc} · ${escMd(ld)} · seed \`${seed}\` · act ${Math.floor(clamp(+e.act || 1, 1, 3))} · ${bosses} boss${bosses === 1 ? '' : 'es'}${relics}${crew}\nPlay this seed: ${url}`;
}
function rogueShareButtons(getEntry) {
  const row = el('div', 'btn-row');
  const full = () => { const e = { ...getEntry() }; if (S.rgResult && S.rgResult.entry && S.rgResult.entry.seed === e.seed) e.relics = S.rgResult.relics; return e; };
  const c = el('button', 'btn alt', 'Copy for Discord', 'rgShare');
  c.addEventListener('click', () => copyText(rogueShareText(full())));
  row.appendChild(c);
  if (typeof navigator.share === 'function') {
    const sh = el('button', 'btn alt', 'Share…');
    sh.addEventListener('click', () => { Promise.resolve(navigator.share({ text: rogueShareText(full()) })).catch(() => { /* cancelled */ }); });
    row.appendChild(sh);
  }
  return row;
}

const urlParams = (() => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(''); } })();
let urlPre = null;
(() => {
  if (urlParams.get('mode') === 'rogue' && rogueAvail()) gameMode = 'rogue';
  if (urlParams.get('mode') === 'gamenight' && gnAvail()) gameMode = 'gamenight';
  const seed = window.AFK_RNG ? window.AFK_RNG.normSeed(urlParams.get('seed')) : null;
  const asc = Number(urlParams.get('asc'));
  const ld = urlParams.get('loadout');
  if (urlParams.get('mode') === 'rogue' || seed) urlPre = { seed: seed || '', asc: Number.isInteger(asc) && asc >= 0 && asc <= 5 ? asc : null, ld: typeof ld === 'string' && ID_RE.test(ld) ? ld : null };
})();

function rgStartPanel() {
  const X = RX();
  const sel = (() => { const v = store.get('rogueSel', {}); return v && typeof v === 'object' ? v : {}; })();
  let asc = Number.isInteger(sel.asc) ? clamp(sel.asc, 0, META.ascMax) : 0;
  let ld = typeof sel.ld === 'string' && X.loadout[sel.ld] && rgUnlocked('loadouts', X.loadout[sel.ld]) ? sel.ld : 'intern';
  let seedVal = '';
  let daily = false;
  if (urlPre) {
    if (urlPre.asc != null && urlPre.asc <= META.ascMax) asc = urlPre.asc;
    if (urlPre.ld && X.loadout[urlPre.ld] && rgUnlocked('loadouts', X.loadout[urlPre.ld])) ld = urlPre.ld;
    if (urlPre.seed) seedVal = urlPre.seed;
    urlPre = null;
  }
  if (!X.loadout[ld]) ld = X.rc.loadouts[0].id;
  const nodes = [];
  const help = el('ul');
  [
    '3 acts x 4 rounds. Pick a brb and a path, go AFK past the round goal, come back and explain yourself. Reach the goal and you pick 1 of 3 boons.',
    'Round 4 of each act is a boss with its own rules. Rounds 2-3 hold an elite (accept a curse for a bigger payout). Events and a shop show up between rounds.',
    'Kicked: an alt account takes the hit. No alts left, or a boss failed with none left, ends the run. Rogue tokens unlock boons, relics and loadouts; winning unlocks ascensions.',
    'The seed fixes the map, offers, shop, events and bosses. It does NOT fix chat, ping timing, mic accidents or drags: same seed = same map, not same drama.',
  ].forEach((t) => help.appendChild(el('li', '', t)));
  nodes.push(help);
  nodes.push(el('h3', '', 'LOADOUT'));
  const lds = el('div', 'rg-loadouts');
  lds.setAttribute('role', 'group');
  lds.setAttribute('aria-label', 'Loadout');
  const paintLd = () => lds.querySelectorAll('.rg-ld').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ld === ld)));
  X.rc.loadouts.forEach((l) => {
    const ok = rgUnlocked('loadouts', l);
    const b = el('button', 'btn alt rg-ld');
    b.type = 'button';
    b.dataset.ld = l.id;
    b.append(el('span', 'rg-ld-name', `${l.icon} ${l.name}`), el('span', 'rg-ld-desc', l.desc));
    if (!ok) b.appendChild(el('span', 'rg-ld-lock', l.unlock.ascMax != null && !(META.ascMax > l.unlock.ascMax) ? `🔒 win at A${l.unlock.ascMax}` : `🔒 ◆ ${l.unlock.tokens} in the Archive`));
    b.setAttribute('aria-disabled', String(!ok));
    b.addEventListener('click', () => { if (!ok) { toast('Locked', 'Unlock it in the Archive.'); return; } ld = l.id; store.set('rogueSel', { ld, asc }); paintLd(); });
    lds.appendChild(b);
  });
  nodes.push(lds);
  // ascension stepper
  const ascs = X.rc.ascensions;
  nodes.push(el('h3', '', 'ASCENSION'));
  const stepper = el('div', 'rg-stepper');
  const dec = el('button', 'btn alt', '−', 'rgAscDown');
  dec.type = 'button';
  dec.setAttribute('aria-label', 'Lower ascension');
  const inc = el('button', 'btn alt', '+', 'rgAscUp');
  inc.type = 'button';
  inc.setAttribute('aria-label', 'Raise ascension');
  const ascTxt = el('div', 'rg-asc-text', '', 'rgAscText');
  ascTxt.setAttribute('role', 'status');
  ascTxt.setAttribute('aria-live', 'polite');
  const paintAsc = () => {
    const a = asc ? ascs.find((x) => x.level === asc) : null;
    ascTxt.textContent = asc ? `A${asc} · ${a ? a.name : ''} · ${a ? a.desc : ''} (score x${ascScore(asc).toFixed(2)}; includes A1-A${asc - 1})` : 'A0 · no modifiers (score x1.00)';
    dec.disabled = asc <= 0;
    inc.disabled = asc >= META.ascMax;
    store.set('rogueSel', { ld, asc });
  };
  dec.addEventListener('click', () => { asc = Math.max(0, asc - 1); paintAsc(); });
  inc.addEventListener('click', () => { asc = Math.min(META.ascMax, asc + 1); paintAsc(); });
  stepper.append(dec, ascTxt, inc);
  nodes.push(stepper);
  // seed
  nodes.push(el('h3', '', 'SEED'));
  const seedRow = el('div', 'rg-seedrow');
  const seedIn = el('input', 'name-input', null, 'rgSeed');
  seedIn.type = 'text';
  seedIn.maxLength = 24;
  seedIn.placeholder = 'random';
  seedIn.autocomplete = 'off';
  seedIn.setAttribute('aria-label', 'Seed (leave empty for a random one)');
  seedIn.value = seedVal;
  const seedTag = el('span', 'rg-daily-tag', '');
  const dayBtn = el('button', 'btn alt', 'Daily seed', 'rgDaily');
  dayBtn.type = 'button';
  dayBtn.addEventListener('click', () => { seedIn.value = window.AFK_RNG.dailySeed(); daily = true; seedTag.textContent = 'daily'; });
  seedIn.addEventListener('input', () => { daily = false; seedTag.textContent = ''; });
  seedRow.append(seedIn, dayBtn, seedTag);
  nodes.push(seedRow);
  // actions
  const saved = rgReadSaved();
  const row = el('div', 'btn-row');
  const arch = el('button', 'btn alt', `📚 Archive · ◆ ${META.tokens}`, 'rgArchiveBtn');
  arch.type = 'button';
  arch.addEventListener('click', () => rgArchive());
  row.appendChild(arch);
  if (saved) {
    const rs = el('button', 'btn alt', `▶ Resume run (round ${saved.idx}/12)`, 'rgResume');
    rs.type = 'button';
    rs.addEventListener('click', () => rgResume());
    row.appendChild(rs);
  }
  nodes.push(row);
  paintLd();
  paintAsc();
  const go = el('button', 'btn', 'Start run', 'startBtn');
  go.addEventListener('click', () => rgStart({ seed: seedIn.value, ld, asc }));
  return { nodes, go, seedIn };
}

window.AFK.modules.push('rogue-ui');
