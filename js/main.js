'use strict';
/* AFK Simulator / js/main.js: input handlers, main loop, boot, ?debug=1 window.__afk hook.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- input ----------
document.addEventListener('keydown', (e) => {
  // Esc rules: closes Settings / Leaderboard / Shop / Archive / Build overlays and leaves the rogue shop. It never skips a boon, relic,
  // curse or event choice, and it does not start a boss round (use the Begin button).
  if (e.key === 'Escape' && !$('#modal').hidden && modalKind === 'rg-shop') { rgShopLeave(); return; }
  if (e.key === 'Escape' && !$('#modal').hidden && modalKind === 'name' && nameDefaultCb) { e.preventDefault(); nameDefaultCb(); return; } // first-run prompt: Esc keeps the default
  if (e.key === 'Escape' && !$('#modal').hidden && (modalKind === 'settings' || modalKind === 'leaderboard' || modalKind === 'shop' || modalKind === 'archive' || modalKind === 'rginfo')) {
    const inp = $('#nameInput');
    if (inp) setName(inp.value);
    if (modalKind === 'settings' && settingsFlush) settingsFlush();
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
  if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
  if (S.run && S.phase.startsWith('rg-')) {
    const rr = document.querySelector(`#actions [data-rkey="${e.key.toLowerCase()}"]`);
    if (rr) { rr.click(); return; }
  }
  const ab = ABILITIES.find((a) => a.hot === e.key.toLowerCase());
  if (ab && S.charges && S.charges[ab.key] > 0) { useAbility(ab.key); return; }
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
const openSettings = (e) => { if (e) e.stopPropagation(); if (S.phase === 'afk' || S.phase === 'leaving' || S.phase === 'judging' || S.phase === 'triage' || (S.gn && S.gn.busy)) return; initAudio(); showSettings(); };
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
firstRunName(showStart); // asks for a name once on first launch, then the usual start screen

// test hook, only when loaded with ?debug=1
if (DEBUG) {
  window.__afk = {
    S,
    rogue: rgDebug(),
    gn: GN ? GN.debug() : null,
    content: R,
    stats,
    paths: PATHS.map((p) => p.id),
    mods: () => getMods(),
    itemMods: () => getMods({ noEnv: true }),
    kickAt: () => kickAt(),
    charges: () => ({ ...S.charges }),
    grant(key, n) { if (!isCharge(key)) return false; addCharge(key, n == null ? 1 : n); renderInv(); renderAbilities(); return true; },
    give(id, n) { const i = itemById(id); if (!i) return false; inv[id] = Math.min(itemMax(i), Math.max(0, Math.floor(n == null ? 1 : n))); if (!inv[id]) delete inv[id]; store.set(INV_KEY, inv); renderInv(); return true; },
    arm: (id) => armItem(id),
    useAbility: (k) => useAbility(k),
    tryKick: (r) => tryKick(r || 'test'),
    setSources(list) { debugSources = Array.isArray(list) ? list : null; renderInv(); return getMods({ noEnv: true }); },
    fx: (srcs, o) => window.AFK_FX.combine(srcs, o || { ceilingSet }),
    itemTier: (id) => { const i = itemById(id); return i ? tierOf(i) : null; },
    items: () => ITEMS.map((i) => i.id),
    setRoster(obj) { store.set('roster', obj); rebuildFriends(); if (S.phase === 'intro') { S.friends = mkFriends(); S.crewNames = CREW_NAMES.slice(); renderMembers(); } return CREW_NAMES.slice(); },
    roster: () => loadRoster(),
    friends: () => S.friends.map((f) => ({ id: f.id, name: f.name, color: f.color, trait: f.trait || '', digs: (f.digs || []).length, custom: !!f.custom, rival: !!f.rival, digRate: f.digRate })),
    crewNames: () => CREW_NAMES.slice(),
    tok: (s, who) => meTok(s, who),
    nextRound: () => nextRound(),
    dragChance: () => dragChance(),
    excuse: (e) => chooseExcuse(e),
    bankNow: (e, sb, f) => bank(e || { t: 'x', r: [0, 0], quiet: true }, sb == null ? S.sus : sb, f == null ? 1 : f),
    ceiling: (c) => { ceilingSet = c === 'rogue' ? 'rogue' : 'classic'; return ceilingSet; },
    reroll: () => { reset(); return S.friends.length; },
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
    speak: (cat) => meTok(speakCat(cat) || '', pick(S.friends)),
    sample(cat, n) { const o = []; for (let i = 0; i < n; i++) { const f0 = pick(S.friends); o.push(meTok(speak(f0, cat), f0)); } return o; },
    sampleCat(cat, n) { const o = []; for (let i = 0; i < n; i++) o.push(meTok(speakCat(cat) || '', pick(S.friends))); return o; },
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

window.AFK.modules.push('main');
