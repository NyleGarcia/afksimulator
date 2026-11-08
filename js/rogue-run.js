'use strict';
/* AFK Simulator / js/rogue-run.js: ROGUE MODE rounds: begin/afk tick/settle/start/save/resume/end (+ onKickLethal hook).
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ----- a round -----
const newRd = () => ({ susMult: 1, micOff: false, fakeNet: false, ptsEnv: 1, susEnv: 1, dragEnv: 1, micEnv: 1, pingEnv: 1, triageEnv: 1, excuseMult: 1, voteAt: 65, graceZero: false, mutedOff: false, boss: null, bo: null, fx: null });
const rgBoss = () => (S.run && S.rd && S.rd.boss ? RX().boss[S.rd.boss] : null);

function rgBeginRound() {
  const run = S.run;
  const X = RX();
  const pl = run.plan[run.idx - 1];
  const chargesBefore = { ...getMods({ noEnv: true }).chargesMax };
  S.phase = 'chat';
  if (run.started) {
    const mods = getMods({ noEnv: true });
    const base = run.skipDecay || run.noDecayNext ? 0 : (S.mins >= S.promise ? 8 : 3);
    S.sus = clamp(S.sus - base + mods.susFlatPerRound, 0, kickAt() - 1);
    S.clock += 2;
  }
  run.started = true;
  run.skipDecay = false;
  run.noDecayNext = false;
  run.kickedRound = false;
  run.early = false;
  run.roundPts = 0;
  run.roundType = pl.type;
  roundType = pl.type;
  S.round = run.idx;
  S.armedItems = {};
  S.rd = newRd();
  S.inAfkCh = false;
  S.pings = [];
  S.lor = null;
  S.mode = pl.mode;
  S.threshold = pl.threshold;
  run.objective = 0;
  S.rd.susEnv = RG_TUNE.actSus[pl.act - 1] * (1 + RG_TUNE.rampSus * (run.idx - 1));
  S.rd.dragEnv = RG_TUNE.actDrag[pl.act - 1];
  if (pl.type === 'elite') { S.rd.ptsEnv = RG_TUNE.elite[0]; S.rd.susEnv *= RG_TUNE.elite[1]; run.elites++; }
  let forced = null;
  let chan = pl.chan;
  if (pl.type === 'boss') {
    const B = X.boss[pl.boss];
    const r = B.rules;
    S.rd.boss = B.id;
    run.objective = bossObjective(B);
    S.mode = 'no-timeout';
    if (r.pointMultRound) S.rd.ptsEnv *= r.pointMultRound;
    if (r.susMultRound) S.rd.susEnv *= r.susMultRound;
    S.rd.susEnv *= RG_TUNE.bossSus[pl.act - 1];
    S.rd.dragEnv *= RG_TUNE.bossDrag[pl.act - 1];
    if (r.dragChanceMult) S.rd.dragEnv *= r.dragChanceMult;
    if (r.micEventMult) S.rd.micEnv = r.micEventMult;
    if (r.pingRateMult) S.rd.pingEnv = r.pingRateMult + run.rules.bossPingRateAdd * r.pingRateMult;
    else if (run.rules.bossPingRateAdd) S.rd.pingEnv = 1 + run.rules.bossPingRateAdd;
    if (r.triageTimeMult) S.rd.triageEnv = r.triageTimeMult;
    if (r.excuseMult) S.rd.excuseMult = r.excuseMult;
    if (r.kickVoteAt) S.rd.voteAt = r.kickVoteAt;
    if (r.graceZero) S.rd.graceZero = true;
    if (r.mutedOff) S.rd.mutedOff = true;
    if (r.pingShield) S.rd.fx = { pingShield: r.pingShield };
    if (r.noDecay) run.noDecayNext = true;
    if (r.blackout) {
      const b = r.blackout;
      const start = rand(b.at[0], b.at[1]);
      S.rd.bo = { start, end: start + rand(b.dur[0], b.dur[1]), susMult: b.susMult, on: false, fired: false };
    }
    forced = B.promise;
    if (r.forceVc) {
      const ok = VOICE.find((c) => c.id === r.forceVc);
      const hot = VOICE.slice().sort((a, b) => ((b.mods.susMult || 1) * (b.mods.pointMult || 1)) - ((a.mods.susMult || 1) * (a.mods.pointMult || 1)))[0];
      chan = (ok || hot || VOICE[0]).id;
    }
  }
  if (S.rd.mutedOff) { TEXT.forEach((c) => { S.ch[c.id].muted = false; }); chanDirty = true; renderChannelList(); }
  dirty();
  { // grant round-only charges (boss ping shields, boss-only relics)
    const after = getMods({ noEnv: true }).chargesMax;
    Object.keys(after).forEach((k) => { const d = after[k] - (chargesBefore[k] || 0); if (d > 0) addCharge(k, d); });
  }
  renderChip();
  const prev = S.chan;
  S.chan = VOICE.find((c) => c.id === chan) ? chan : VOICE[0].id;
  if (S.chan !== prev && run.idx > 1) {
    const c = curVc();
    const mt = modsText(c.mods || {});
    sys(`🔊 the squad moved to ${c.name}${mt ? ` (${mt})` : ''}`);
  }
  renderMembers();
  rgHudRender();
  const label = pl.type === 'boss' ? X.rc.flavor.bossLabel : pl.type === 'elite' ? X.rc.flavor.eliteLabel : '';
  sys(`${label ? label + ' · ' : ''}${X.rc.flavor.actNames[pl.act - 1]} · round ${pl.idx}/12${pl.goal ? ` · goal ${fmtMins(pl.goal)} AFK` : ''}`);
  const af = friend();
  post(af, speak(af, 'ask'), { ch: S.active });
  later(900, () => {
    if (!S.run || S.run !== run) return;
    if (forced) chooseBrb({ t: `brb ${fmtMins(forced.p)}`, p: forced.p, m: forced.m });
    else offerBrb();
  });
}

// blackout + boss chatter, called from afkStep each tick
function rgAfkTick(dt) {
  const bo = S.rd.bo;
  if (bo) {
    if (!bo.on && !bo.fired && S.mins >= bo.start) {
      bo.on = true;
      bo.fired = true;
      S.friends.forEach((f) => { f.vc = false; });
      sys('⚡ BLACKOUT: the servers drop. every friend vanishes from voice.', 'bad');
      renderMembers();
    } else if (bo.on && S.mins >= bo.end) {
      bo.on = false;
      S.friends.forEach((f) => { f.vc = true; });
      sys('⚡ the servers come back. everyone rejoins.', 'good');
      renderMembers();
    }
  }
  const B = rgBoss();
  if (B && B.midFight.length && Math.random() < 0.14 * S.rd.pingEnv * dt) {
    const cid = weightedCh();
    const f = friendIn(cid);
    let t = fixN(pick(B.midFight));
    if (!/@\{me\}/.test(t) && Math.random() < 0.5) t = '@{me} ' + t;
    post(f, t, { ch: cid, weight: 1.2 });
  }
}

// goal / boss bar inside the AFK panel
function rgBarRender() {
  const bar = $('#bossBar');
  if (!bar) return;
  const run = S.run;
  if (!run || S.phase !== 'afk') { bar.hidden = true; return; }
  const pl = run.plan[run.idx - 1];
  const B = rgBoss();
  const target = B ? run.objective : pl.goal;
  if (!target) { bar.hidden = true; return; }
  const got = Math.min(S.mins, target);
  const met = S.mins >= target;
  bar.hidden = false;
  bar.className = 'boss-bar' + (B ? ' boss' : '') + (met ? ' met' : '');
  const txt = B ? `${RX().rc.flavor.bossLabel} · ${B.name} · hold ${fmtMins(target)} (${Math.floor(got)}/${Math.floor(target)})` : `${pl.type === 'elite' ? RX().rc.flavor.eliteLabel : 'GOAL'} · AFK ${fmtMins(target)} for a boon (${Math.floor(got)}/${Math.floor(target)})`;
  const t = bar.querySelector('.boss-text');
  if (t.textContent !== txt) t.textContent = txt;
  bar.querySelector('.boss-fill').style.width = (100 * got / target) + '%';
  const ok = bar.querySelector('.boss-ok');
  const okTxt = met ? (B ? 'OBJECTIVE MET: you may go back' : 'goal met: go back when you like') : '';
  if (ok.textContent !== okTxt) { ok.textContent = okTxt; if (okTxt && !S.rd.said) { S.rd.said = true; announce(okTxt); } }
  bar.setAttribute('aria-valuenow', String(Math.floor(100 * got / target)));
}

// ----- settling a round -----
function rgRestartCombo() { S.combo = Math.min(8, 1 + (getMods({ noEnv: true }).comboStartBonus || 0)); }
function rgSettle() {
  const run = S.run;
  if (!run || run.done || !run.queue.length || run.queue[0].k !== 'round') return;
  const X = RX();
  const pl = run.plan[run.idx - 1];
  const M = getMods({ noEnv: true });
  const scale = ACT_SCALE[pl.act - 1];
  const kicked = run.kickedRound;
  let ok = false;
  const pts = kicked ? 0 : run.roundPts;
  const gain = Math.floor(pts / 100 * GOLD_PER_100 * M.goldMult);
  if (gain > 0) { run.gold += gain; sys(`💰 +${gain} gold`, 'good'); }
  run.queue.shift();
  run.hist.push({ idx: run.idx, type: pl.type, mins: S.mins, pts, kicked, sus: Math.round(S.sus), mode: S.mode, early: run.early });
  const steps = [];
  let again = false;
  if (pl.type === 'boss') {
    const B = X.boss[pl.boss];
    ok = !kicked && !run.early && S.mins >= run.objective;
    if (ok) {
      const g = Math.round(B.reward.gold * M.goldMult);
      run.gold += g;
      run.bossClears++;
      const lines = B.win.length ? pick(B.win) : 'The boss falls.';
      sys(`🏆 ${B.name} cleared: ${meTok(lines)} (+${g} gold)`, 'good');
      toast(`🏆 ${B.name} cleared`, `+${g} gold and a relic`, 'ach');
      steps.push({ k: 'relic', act: pl.act });
    } else {
      const lines = B.fail.length ? pick(B.fail) : 'The boss wins this one.';
      sys(`💀 ${B.name} failed: ${meTok(lines)}${run.early ? ' (-1 alt)' : ''}`, 'bad');
      if (!kicked && !run.early) {
        // dragged out before the objective counts as coming back early
        if (run.alts <= 0) { rgEnd(false, 'dragged out of the boss fight with no alts left'); return; }
        run.alts--;
        sys('🛑 dragged out too early: -1 alt', 'bad');
      }
      again = true;
    }
  } else {
    const met = !kicked && S.mins >= pl.goal;
    ok = met;
    if (met) {
      steps.push({ k: 'boon', idx: run.idx });
      if (pl.type === 'elite') {
        const g = Math.round(40 * scale);
        run.gold += g;
        sys(`🔥 elite cleared: +${g} gold and a rare-or-better boon`, 'good');
        steps[0].minRarity = 'rare';
      }
    } else {
      rgRestartCombo();
      sys(kicked ? '💤 no boon: you got kicked this round' : `💤 goal missed (${fmtMins(pl.goal)}): no boon, combo reset`, 'bad');
    }
  }
  // elite curse payout (a clear only)
  if (pl.type === 'elite' && run.eliteCurse) {
    const cu = X.curse[run.eliteCurse];
    const p = (cu && cu.payout) || {};
    if (ok && cu) {
      if (p.gold) run.gold += Math.round(p.gold * scale);
      if (p.alts) run.alts = Math.min(MAX_ALTS, run.alts + p.alts);
      if (p.relicReroll) run.relicRerolls += p.relicReroll;
      if (p.effects) rgMut(() => { run.temp.push({ effects: p.effects, until: p.effectsDuration || 'act', act: pl.act, label: cu.name }); });
      if (p.boonRarity && steps[0]) {
        const roll = p.boonChance != null ? window.AFK_RNG.keyed(run.seed, 'curse', run.idx, 'payout')() < p.boonChance : true;
        if (roll || p.boonRarity !== 'legendary') steps[0].minRarity = p.boonRarity;
      }
      sys(`${cu.icon} ${cu.name} paid out`, 'good');
    }
    run.eliteCurse = null;
  }
  // curses and bonuses that expire
  const done = () => { run.curses = run.curses.filter((c) => !(c.left === 'round' && !c.perm)); };
  rgMut(done);
  if (pl.type === 'boss' && ok && run.act === pl.act) {
    rgMut(() => { run.curses = run.curses.filter((c) => c.left !== 'act' || c.perm); run.temp = run.temp.filter((t) => t.until !== 'act'); });
  }
  if (pl.type === 'boss' && ok && pl.idx === 12) {
    run.queue.push(...steps, { k: 'win' });
  } else if (again) {
    run.queue.push({ k: 'intro', retry: true }, { k: 'round' });
  } else {
    if (pl.event) steps.push({ k: 'event' });
    if (pl.idx % 3 === 0 && pl.idx < 12) steps.push({ k: 'shop' });
    run.queue.push(...steps);
    run.idx = pl.idx + 1;
    run.act = run.plan[run.idx - 1].act;
    rgQueueRound(run.idx);
  }
  if (pl.type === 'boss' && ok) { /* boss reward done */ }
  roundType = 'normal';
  S.rd = newRd();
  rgTrim();
  dirty();
  renderInv();
  rgHudRender();
  later(700, rgNext);
}

// would-be kick with no second wind: an alt takes the hit (the run only ends at 0 alts)
onKickLethal = (reason) => {
  const run = S.run;
  if (!run || run.alts <= 0) return false;
  run.alts--;
  run.kickedRound = true;
  rgSave();
  S.sus = 40;
  S.pending = 0;
  sfx.bad();
  sys(`👢 ${friend().name} kicked ${ME.name} (${reason}). you rejoin on an alt account: ${run.alts} alt${run.alts === 1 ? '' : 's'} left, this round's points are gone.`, 'bad');
  toast('👢 Kicked: alt account', `${run.alts} alt${run.alts === 1 ? '' : 's'} left · suspicion 40%`);
  if (S.phase === 'afk') {
    S.phase = 'judging';
    S.inAfkCh = false;
    endAfkUI();
    settleMuted();
    S.pings = [];
    S.lor = null;
    later(1800, nextRound);
  }
  renderInv();
  render();
  return true;
};
// came back before a boss objective was met: -1 alt (or the run ends)
function rgBossEarly() {
  const run = S.run;
  run.early = true;
  S.phase = 'judging';
  S.inAfkCh = false;
  endAfkUI();
  settleMuted();
  S.pings = [];
  S.lor = null;
  S.pending = 0;
  sys(`🛑 ${ME.name} came back after ${fmtMins(S.mins)}: the objective was ${fmtMins(run.objective)}. boss failed: -1 alt`, 'bad');
  sfx.bad();
  if (run.alts <= 0) { kicked('you left the boss fight early with no alts left'); return; }
  run.alts--;
  run.kickedRound = true;
  S.sus = Math.min(S.sus, 40);
  toast('🛑 Boss failed', `${run.alts} alt${run.alts === 1 ? '' : 's'} left`);
  renderInv();
  later(1500, nextRound);
}

// ----- run lifecycle -----
function rgStart(cfg) {
  initAudio();
  const X = RX();
  const seed = (window.AFK_RNG.normSeed(cfg.seed) || window.AFK_RNG.randomSeed());
  reset();
  closeModal();
  roundType = 'normal';
  const run = rgNewRun({ seed, ld: cfg.ld, asc: cfg.asc });
  S.run = run;
  const L = X.loadout[run.ld];
  rgMut(() => {});
  grantRunCharges();
  S.sus = clamp(getMods({ noEnv: true }).startSus, 0, kickAt() - 1);
  if (cfg.seed && window.AFK_RNG.normSeed(cfg.seed) === window.AFK_RNG.dailySeed()) { META.lastDaily = window.AFK_RNG.dailySeed(); }
  if (run.rules.startCurse) {
    const pool = X.rc.curses.filter((c) => c.duration !== 'round');
    const cu = pool.length ? rngH(seed, 'start').pick(pool) : null;
    if (cu) rgGiveCurse(cu, true, true);
  }
  L.boons.forEach((id) => { if (X.boon[id]) rgGiveBoon(X.boon[id]); });
  L.curses.forEach((id) => { if (X.curse[id]) rgGiveCurse(X.curse[id]); });
  if (L.freeBoon && X.boon[L.freeBoon]) run.queue.push({ k: 'boon', idx: 0, fixed: [L.freeBoon], title: `STARTING GIFT · ${L.name}` });
  rgQueueRound(1);
  META.runs++;
  saveMeta();
  document.body.classList.add('rogue');
  renderInv();
  rgHudRender();
  sys(`${X.rc.flavor.runName} · seed ${seed} · ${L.name}${run.asc ? ' · ascension ' + run.asc : ''}`, 'good');
  const a = friend();
  later(300, () => post(a, 'yo'));
  later(1100, () => post(friend(), 'whos on tonight'));
  later(1900, () => post(a, '@' + ME.name + ' u on?'));
  later(2700, () => post(ME, 'ye im on'));
  later(3400, () => rgNext());
  return run;
}

// ----- persistence (store 'rogueRun'): written at every step, read back and re-validated on resume -----
function rgSave() {
  const run = S.run;
  if (!run || run.done) return;
  const o = {
    v: 1, pack: packId, seed: run.seed, ld: run.ld, asc: run.asc, idx: run.idx, gold: run.gold, alts: run.alts, rerolls: run.rerolls, relicRerolls: run.relicRerolls,
    boons: { ...run.boons }, relics: run.relics.slice(), curses: run.curses.map((c) => ({ ...c })), temp: run.temp.map((t) => ({ ...t })), syn: run.syn.slice(),
    gadgets: { ...run.gadgets }, flags: { ...run.flags }, eventsSeen: run.eventsSeen.slice(), pity: run.pity, bossClears: run.bossClears, elites: run.elites,
    shop: run.shop ? { idx: run.shop.idx, act: run.shop.act, n: run.shop.n, bought: { ...run.shop.bought } } : null,
    queue: run.queue.map((s) => ({ ...s })), eliteCurse: run.eliteCurse, noDecayNext: run.noDecayNext, started: run.started,
    S: { score: S.score, banked: S.banked, sus: S.sus, combo: S.combo, lastMins: S.lastMins, longest: S.longest, charges: { ...S.charges }, clock: S.clock, mins: S.mins, promise: S.promise },
  };
  store.set('rogueRun', o);
}
const rgClearSaved = () => store.set('rogueRun', null);
const numOr = (v, d, lo, hi) => (Number.isFinite(v) ? clamp(v, lo, hi) : d);
// returns a validated copy or null
function rgReadSaved() {
  const raw = store.get('rogueRun', null);
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  if (raw.pack !== packId) return null;
  const X = RX();
  if (!X.rc) return null;
  const seed = window.AFK_RNG && window.AFK_RNG.normSeed(raw.seed);
  if (!seed || !X.loadout[raw.ld]) return null;
  const idx = Math.floor(numOr(raw.idx, 0, 0, 12));
  if (idx < 1) return null;
  const o = { seed, ld: raw.ld, asc: Math.floor(numOr(raw.asc, 0, 0, 5)), idx, gold: Math.floor(numOr(raw.gold, 0, 0, 99999)), alts: Math.floor(numOr(raw.alts, 0, 0, MAX_ALTS)), rerolls: Math.floor(numOr(raw.rerolls, 0, 0, 99)), relicRerolls: Math.floor(numOr(raw.relicRerolls, 0, 0, 9)), boons: Object.create(null), relics: [], curses: [], temp: [], syn: [], gadgets: Object.create(null), flags: Object.create(null), eventsSeen: [], queue: [] };
  if (raw.boons && typeof raw.boons === 'object') Object.keys(raw.boons).forEach((id) => { const b = X.boon[id]; const n = raw.boons[id]; if (b && Number.isInteger(n) && n > 0) o.boons[id] = Math.min(n, b.max); });
  cleanIds(raw.relics).forEach((id) => { if (X.relic[id]) o.relics.push(id); });
  cleanIds(raw.syn).forEach((id) => { if (X.syn[id]) o.syn.push(id); });
  cleanIds(raw.eventsSeen).forEach((id) => { if (X.event[id]) o.eventsSeen.push(id); });
  (Array.isArray(raw.curses) ? raw.curses : []).slice(0, 2).forEach((c) => { if (c && X.curse[c.id] && ['round', 'act', 'run'].includes(c.left)) o.curses.push({ id: c.id, left: c.left, act: Math.floor(numOr(c.act, 1, 1, 3)), perm: !!c.perm }); });
  (Array.isArray(raw.temp) ? raw.temp : []).slice(0, 20).forEach((t) => { if (t && t.effects && typeof t.effects === 'object') { const fx = R.effectsObj('temp', 'saved', t.effects, 'effects'); if (Object.keys(fx).length) o.temp.push({ effects: fx, until: t.until === 'act' ? 'act' : 'run', act: Math.floor(numOr(t.act, 1, 1, 3)), label: typeof t.label === 'string' ? t.label.slice(0, 40) : 'bonus' }); } });
  if (raw.gadgets && typeof raw.gadgets === 'object') Object.keys(raw.gadgets).forEach((k) => { if (ABILITIES.some((a) => a.key === k) && Number.isInteger(raw.gadgets[k]) && raw.gadgets[k] > 0) o.gadgets[k] = Math.min(2, raw.gadgets[k]); });
  if (raw.flags && typeof raw.flags === 'object') Object.keys(raw.flags).forEach((k) => { if (ID_RE.test(k) && raw.flags[k]) o.flags[k] = true; });
  if (raw.shop && typeof raw.shop === 'object' && Number.isFinite(raw.shop.idx) && Number.isFinite(raw.shop.act)) {
    const bt = Object.create(null);
    if (raw.shop.bought && typeof raw.shop.bought === 'object') Object.keys(raw.shop.bought).slice(0, 40).forEach((k) => { if (/^[a-z0-9:_-]{1,40}$/i.test(k) && raw.shop.bought[k]) bt[k] = true; });
    o.shop = { idx: Math.floor(raw.shop.idx), act: Math.floor(numOr(raw.shop.act, 1, 1, 3)), n: Math.floor(numOr(raw.shop.n, 0, 0, 50)), bought: bt, alt: false, stock: null };
  }
  (Array.isArray(raw.queue) ? raw.queue : []).slice(0, 12).forEach((s) => {
    if (!s || !STEP_KINDS.includes(s.k)) return;
    const st = { k: s.k };
    ['idx', 'act', 'rerollN', 'pity0'].forEach((f) => { if (Number.isFinite(s[f])) st[f] = Math.floor(clamp(s[f], 0, 99)); });
    if (['rare', 'legendary'].includes(s.minRarity)) st.minRarity = s.minRarity;
    if (s.retry) st.retry = true;
    if (typeof s.title === 'string') st.title = s.title.slice(0, 80);
    if (Array.isArray(s.fixed)) st.fixed = s.fixed.filter((id) => typeof id === 'string' && X.boon[id]).slice(0, 4);
    o.queue.push(st);
  });
  o.pity = Math.floor(numOr(raw.pity, 0, 0, 20));
  o.bossClears = Math.floor(numOr(raw.bossClears, 0, 0, 3));
  o.elites = Math.floor(numOr(raw.elites, 0, 0, 6));
  o.eliteCurse = typeof raw.eliteCurse === 'string' && X.curse[raw.eliteCurse] ? raw.eliteCurse : null;
  o.noDecayNext = !!raw.noDecayNext;
  o.started = !!raw.started;
  const sv = raw.S && typeof raw.S === 'object' ? raw.S : {};
  o.S = { score: Math.floor(numOr(sv.score, 0, 0, 1e9)), banked: Math.floor(numOr(sv.banked, 0, 0, 1e9)), sus: numOr(sv.sus, 0, 0, 200), combo: Math.floor(numOr(sv.combo, 0, 0, 8)), lastMins: numOr(sv.lastMins, 0, 0, 1e5), longest: numOr(sv.longest, 0, 0, 1e5), clock: numOr(sv.clock, 1200, 0, 1e7), mins: numOr(sv.mins, 0, 0, 1e5), promise: numOr(sv.promise, 5, 1, 1440), charges: {} };
  if (sv.charges && typeof sv.charges === 'object') Object.keys(sv.charges).forEach((k) => { if (isCharge(k) && Number.isFinite(sv.charges[k]) && sv.charges[k] > 0) o.S.charges[k] = Math.min(chargeCapR(k), Math.floor(sv.charges[k])); });
  return o;
}
const chargeCapR = (k) => { const d = FXD()[k]; return d ? d.R[1] : 0; };
function rgResume() {
  const sv = rgReadSaved();
  if (!sv) { toast('No run to resume', 'The saved run is gone or from another server.'); return false; }
  initAudio();
  reset();
  closeModal();
  roundType = 'normal';
  const run = rgNewRun({ seed: sv.seed, ld: sv.ld, asc: sv.asc });
  ['idx', 'gold', 'alts', 'rerolls', 'relicRerolls', 'boons', 'relics', 'curses', 'temp', 'syn', 'gadgets', 'flags', 'eventsSeen', 'pity', 'bossClears', 'elites', 'queue', 'eliteCurse', 'noDecayNext', 'started'].forEach((k) => { run[k] = sv[k]; });
  run.act = run.plan[run.idx - 1].act;
  S.run = run;
  Object.assign(S, { score: sv.S.score, banked: sv.S.banked, sus: sv.S.sus, combo: sv.S.combo, lastMins: sv.S.lastMins, longest: sv.S.longest, clock: sv.S.clock, mins: sv.S.mins, promise: sv.S.promise, round: run.idx, charges: sv.S.charges });
  if (!run.queue.length) rgQueueRound(run.idx);
  dirty();
  document.body.classList.add('rogue');
  renderInv();
  rgHudRender();
  render();
  sys(`${RX().rc.flavor.runName} resumed · seed ${run.seed}`, 'good');
  later(600, rgNext);
  return true;
}

// ----- run end -----
function rgEnd(win, reason) {
  const run = S.run;
  if (!run || run.done) return null;
  run.done = true;
  S.phase = 'rg-over';
  clearActions();
  document.body.classList.remove('afk');
  $('#afkPanel').hidden = true;
  const M = getMods({ noEnv: true });
  const raw = S.score;
  const am = ascScore(run.asc);
  const score = Math.floor(raw * am * (win ? 1.5 : 1));
  const tokBreak = { pts: Math.floor(raw / 100 * TOKEN_PTS * M.tokenMult), boss: 5 * run.bossClears, win: win ? 25 + 10 * run.asc : 0 };
  const earned = tokBreak.pts + tokBreak.boss + tokBreak.win;
  META.tokens += earned;
  META.wins += win ? 1 : 0;
  let ascUnlocked = 0;
  if (win && run.asc >= META.ascMax && META.ascMax < 5) { META.ascMax = Math.min(5, run.asc + 1); ascUnlocked = META.ascMax; }
  if (!(META.bestByAsc[run.asc] >= score)) META.bestByAsc[run.asc] = score;
  saveMeta();
  const pl = run.plan[Math.min(run.idx, 12) - 1];
  const entry = { name: ME.name, s: score, seed: run.seed, asc: run.asc, ld: run.ld, win: !!win, act: pl ? pl.act : run.act, r: run.idx, pts: raw, d: new Date().toISOString().slice(0, 10), k: packId, bc: run.bossClears };
  if (S.crewNames && S.crewNames.length) { entry.cw = S.crewNames.slice(0, 3); if (S.crewNames.length > 3) entry.cx = S.crewNames.length - 3; }
  const scores = getRogueScores();
  const prevBest = scores.length ? scores[0].s : 0;
  scores.push(entry);
  scores.sort((a, b) => b.s - a.s);
  store.set('rogueScores', scores.slice(0, 10));
  rgClearSaved();
  const relics = run.relics.map((id) => (RX().relic[id] || {}).name).filter(Boolean);
  const boons = Object.keys(run.boons).map((id) => { const b = RX().boon[id]; return b ? { name: b.name, icon: b.icon, rarity: b.rarity, n: run.boons[id] } : null; }).filter(Boolean);
  const res = { win: !!win, reason: reason || '', raw, am, score, earned, tokBreak, ascUnlocked, entry, relics, boons, newBest: score > prevBest && score > 0, curses: run.curses.map((c) => (RX().curse[c.id] || {}).name).filter(Boolean) };
  S.rgResult = res;
  if (win) sfx.cash(); else sfx.bad();
  sys(win ? `🏆 RUN CLEARED · score ${fmtN(score)}` : `💀 RUN OVER · score ${fmtN(score)}`, win ? 'good' : 'bad');
  rgHudRender();
  later(win ? 900 : 100, () => rgEndScreen(res));
  return res;
}

window.AFK.modules.push('rogue-run');
