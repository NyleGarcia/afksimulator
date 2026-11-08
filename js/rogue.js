'use strict';
/* AFK Simulator / js/rogue.js: ROGUE MODE logic: constants, meta, plan, boons/relics/curses, cards, steps, events, rogue shop.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- ROGUE MODE (see CONTENT.md "Rogue mode") ----------
// 3 acts x 4 rounds, boss on round 4 of each act, elite on round 2 or 3. Everything below is inert while S.run is null (classic).
// Structure is seeded (AFK_RNG keyed streams: env, boon, shop, event, curse, boss, relic, start); live combat and chat flavor stay on Math.random.
const ACT_SCALE = [1, 2.5, 5];
const GOAL_MINS = [8, 20, 40];
const RARITY_W = [null, { common: 70, rare: 27, legendary: 3 }, { common: 55, rare: 35, legendary: 10 }, { common: 45, rare: 38, legendary: 17 }];
const RAR_ORDER = ['common', 'rare', 'legendary'];
const MAX_ALTS = 3;
const ID_RE = /^[a-z0-9_-]{1,32}$/i;
const STEP_KINDS = ['curse', 'intro', 'boon', 'event', 'shop', 'relic', 'round', 'win'];
// difficulty tuning (rogue only). Calibrated with sim_rogue.py: see CONTENT.md "Balance".
const RG_TUNE = { actSus: [1, 1, 1], rampSus: 0, bossSus: [1, 1, 1], elite: [1.4, 1.15], actDrag: [1, 1.48, 2.15], bossDrag: [1, 2.5, 4.1] };
const GOLD_PER_100 = 0.35; // run gold per 100 points banked (x goldMult)
const TOKEN_PTS = 0.2; // rogue tokens per 100 raw points (spec said 0.5: lowered after the sim showed ~4x the intended raw points, see CONTENT.md Balance)
const SHOP_BASE = { common: 8, rare: 16, legendary: 40, gadget: 4, heal: 6, curse: 12, alt: 30, token: 5 };
const rngH = (seed, ...k) => window.AFK_RNG.helpers(window.AFK_RNG.keyed(seed, ...k));
const realSecs = (mins) => Math.round(20 * Math.log(1 + mins / 20));

// ----- content access (base + active pack, merged by loader.js) -----
let RCX = null;
function RX() {
  if (RCX && RCX.pack === packId) return RCX;
  let rc = window.AFK_RNG && window.AFK_FX && typeof R.rogueFor === 'function' ? R.rogueFor(packId) : null;
  // rogue needs a minimal playable set: a loadout, a few boons, and a boss for every act
  if (rc && !(rc.loadouts.length && rc.boons.length >= 3 && rc.relics.length >= 1 && [1, 2, 3].every((a) => rc.bosses.some((b) => b.act === a)))) rc = null;
  const mp = (a) => { const o = Object.create(null); (a || []).forEach((x) => { o[x.id] = x; }); return o; };
  RCX = rc ? { pack: packId, rc, boon: mp(rc.boons), relic: mp(rc.relics), curse: mp(rc.curses), event: mp(rc.events), boss: mp(rc.bosses), loadout: mp(rc.loadouts), syn: mp(rc.synergies) } : { pack: packId, rc: null };
  return RCX;
}
const rogueAvail = () => !!RX().rc;
const gnAvail = () => !!(GN && GN.avail());
let gameMode = (() => { const m = store.get('gameMode', 'classic'); return m === 'rogue' || m === 'gamenight' ? m : 'classic'; })();
const modeNow = () => (gameMode === 'rogue' && rogueAvail() ? 'rogue' : gameMode === 'gamenight' && gnAvail() ? 'gamenight' : 'classic');

// ----- meta progression (store 'rogue'): rogue tokens, unlocks, ascension, bests -----
const cleanIds = (a) => (Array.isArray(a) ? Array.from(new Set(a.filter((x) => typeof x === 'string' && ID_RE.test(x) && !/^(__proto__|constructor|prototype)$/.test(x)))).slice(0, 300) : []);
const posInt = (v, max) => (Number.isFinite(v) && v > 0 ? Math.min(max, Math.floor(v)) : 0);
function loadMeta() {
  const raw = store.get('rogue', null);
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const u = r.unlocked && typeof r.unlocked === 'object' ? r.unlocked : {};
  const best = {};
  for (let a = 0; a <= 5; a++) { const v = r.bestByAsc && typeof r.bestByAsc === 'object' ? r.bestByAsc[a] : 0; if (Number.isFinite(v) && v > 0) best[a] = Math.floor(v); }
  const loadouts = cleanIds(u.loadouts);
  if (!loadouts.includes('intern')) loadouts.unshift('intern');
  return { v: 1, tokens: posInt(r.tokens, 1e7), ascMax: Math.min(5, posInt(r.ascMax, 5)), wins: posInt(r.wins, 1e6), runs: posInt(r.runs, 1e6), unlocked: { boons: cleanIds(u.boons), relics: cleanIds(u.relics), loadouts }, bestByAsc: best, lastDaily: typeof r.lastDaily === 'string' && /^DAILY-\d{8}$/.test(r.lastDaily) ? r.lastDaily : '' };
}
let META = loadMeta();
const saveMeta = () => store.set('rogue', META);
// unlock.tokens 0 = free; n = bought in the Archive. loadouts may also need a win at ascension N (unlock.ascMax)
function rgUnlocked(kind, it) {
  const u = it.unlock || { tokens: 0 };
  if (kind === 'loadouts' && u.ascMax != null && !(META.ascMax > u.ascMax)) return false;
  return !(u.tokens > 0) || META.unlocked[kind].includes(it.id);
}
const KIND_OF = { boons: 'boons', relics: 'relics', loadouts: 'loadouts' };

// ----- ascension rules (cumulative) -----
function rgRules(asc) {
  const o = { lorCapAdd: 0, bossPingRateAdd: 0, altsStart: 9, bossObjectiveMult: 1, elitesPerAct: 1, graceCap: null, startCurse: false };
  ((RX().rc || {}).ascensions || []).filter((a) => a.level <= asc).forEach((a) => {
    const r = a.rules || {};
    if (r.lorCapAdd) o.lorCapAdd += r.lorCapAdd;
    if (r.bossPingRateAdd) o.bossPingRateAdd += r.bossPingRateAdd;
    if (r.altsStart != null) o.altsStart = Math.min(o.altsStart, r.altsStart);
    if (r.bossObjectiveMult) o.bossObjectiveMult *= r.bossObjectiveMult;
    if (r.elitesPerAct) o.elitesPerAct = Math.max(o.elitesPerAct, r.elitesPerAct);
    if (r.graceCap != null) o.graceCap = o.graceCap == null ? r.graceCap : Math.min(o.graceCap, r.graceCap);
    if (r.startCurse) o.startCurse = true;
  });
  return o;
}
const ascScore = (asc) => { const a = ((RX().rc || {}).ascensions || []).find((x) => x.level === asc); return a ? a.scoreMult : 1; };

// ----- the plan: round types, server modes, voice roam, bosses, event rounds. A pure function of (seed, ascension) -----
function rgPlan(seed, asc) {
  const rc = RX().rc;
  const RNG = window.AFK_RNG;
  const rules = rgRules(asc);
  const plan = [];
  for (let act = 1; act <= 3; act++) {
    const e = RNG.keyed(seed, 'env', 'elite', act)();
    const elites = rules.elitesPerAct >= 2 ? [2, 3] : [e < 0.5 ? 2 : 3];
    const evR = 1 + Math.floor(RNG.keyed(seed, 'event', 'round', act)() * 3);
    const bosses = rc.bosses.filter((b) => b.act === act);
    const bi = bosses.length ? Math.floor(RNG.keyed(seed, 'boss', act)() * bosses.length) : -1;
    for (let n = 1; n <= 4; n++) {
      const idx = (act - 1) * 4 + n;
      const r = RNG.keyed(seed, 'env', idx);
      const m = r(); const t = r(); const roamP = r(); const roamI = r();
      const type = n === 4 ? 'boss' : elites.includes(n) ? 'elite' : 'normal';
      const goal = type === 'boss' ? 0 : GOAL_MINS[act - 1] * (type === 'elite' ? 1.5 : 1);
      // afk-timeout rounds only use thresholds the goal can be reached under (otherwise the bot would park you before it)
      const ths = THRESHOLDS.filter((x) => x >= goal);
      const pool = ths.length ? ths : [THRESHOLDS[THRESHOLDS.length - 1]];
      const threshold = pool[Math.floor(t * pool.length)];
      const mode = type === 'normal' ? (m < 0.5 ? MODES[0] : MODES[1]) : 'no-timeout';
      const chan = idx > 1 && VOICE.length > 1 && roamP < 0.3 ? VOICE[1 + Math.floor(roamI * (VOICE.length - 1))].id : VOICE[0].id;
      plan.push({ idx, act, n, type, mode, threshold, chan, boss: type === 'boss' && bi >= 0 ? bosses[bi].id : null, event: n === evR, goal });
    }
  }
  return plan;
}

// ----- run state -----
function rgNewRun(cfg) {
  const X = RX();
  const asc = clamp(Math.floor(cfg.asc || 0), 0, 5);
  const L = X.loadout[cfg.ld] || X.loadout.intern || X.rc.loadouts[0];
  const rules = rgRules(asc);
  const run = {
    seed: cfg.seed, ld: L.id, asc, idx: 1, act: 1, gold: L.gold || 0, alts: Math.min(L.alts, rules.altsStart, MAX_ALTS), rerolls: L.rerolls, relicRerolls: 0,
    boons: Object.create(null), relics: [], curses: [], temp: [], syn: [], gadgets: Object.create(null), flags: Object.create(null), eventsSeen: [],
    pity: 0, bossClears: 0, elites: 0, queue: [], shop: null, eliteCurse: null, started: false, skipDecay: false, noDecayNext: false,
    kickedRound: false, early: false, roundPts: 0, hist: [], roundType: 'normal', objective: 0, cur: null, offer: [], done: false, plan: null, rules, _src: null,
  };
  run.plan = rgPlan(run.seed, asc);
  return run;
}
const dirty = () => { if (S.run) S.run._src = null; };
function runSources() {
  const run = S.run;
  if (!run) return [];
  if (run._src) return run._src;
  const X = RX();
  const out = [];
  const L = X.loadout[run.ld];
  if (L) out.push({ effects: L.effects, label: L.name });
  X.rc.ascensions.forEach((a) => { if (a.level <= run.asc && Object.keys(a.effects).length) out.push({ effects: a.effects, label: a.name }); });
  Object.keys(run.boons).forEach((id) => { const b = X.boon[id]; if (b) out.push({ effects: b.effects, n: run.boons[id], label: b.name }); });
  run.relics.forEach((id) => { const b = X.relic[id]; if (b) out.push({ effects: b.effects, when: b.when, label: b.name }); });
  run.curses.forEach((c) => { const cu = X.curse[c.id]; if (cu) out.push({ effects: cu.effects, label: cu.name }); });
  run.temp.forEach((t) => out.push({ effects: t.effects, label: t.label || 'bonus' }));
  run.syn.forEach((id) => { const s = X.syn[id]; if (s && s.effects && Object.keys(s.effects).length) out.push({ effects: s.effects, label: s.name }); });
  if (Object.keys(run.gadgets).length) out.push({ effects: run.gadgets, label: 'gadgets' });
  if (S.rd && S.rd.fx) out.push({ effects: S.rd.fx, label: 'round' });
  run._src = out;
  return out;
}
extraSources = () => (S.run ? runSources() : []);

// change what the run owns, then grant any newly available charges (second wind, shields, abilities)
function rgMut(fn) {
  const before = { ...getMods({ noEnv: true }).chargesMax };
  fn();
  dirty();
  const after = getMods({ noEnv: true }).chargesMax;
  Object.keys(after).forEach((k) => { const d = after[k] - (before[k] || 0); if (d > 0) addCharge(k, d); });
  uiSig = '';
}
// charges that only existed for a round (boss shields, boss-only relics) are trimmed back to the real maximum
function rgTrim() {
  const cm = getMods({ noEnv: true }).chargesMax;
  Object.keys(S.charges).forEach((k) => { if (S.charges[k] > (cm[k] || 0)) S.charges[k] = cm[k] || 0; });
}
function rgInstant(i, label) {
  const run = S.run;
  if (!i) return;
  if (i.gold) run.gold = Math.max(0, run.gold + i.gold);
  if (i.sus) S.sus = clamp(S.sus + i.sus, 0, kickAt() - 1);
  if (i.alts) run.alts = clamp(run.alts + i.alts, 0, MAX_ALTS);
  const bits = [i.gold ? `${i.gold > 0 ? '+' : ''}${i.gold} gold` : '', i.sus ? `${i.sus > 0 ? '+' : ''}${i.sus}% suspicion` : '', i.alts ? `${i.alts > 0 ? '+' : ''}${i.alts} alt` : ''].filter(Boolean);
  if (bits.length) sys(`${label ? label + ': ' : ''}${bits.join(', ')}`, (i.sus > 0 || i.gold < 0 || i.alts < 0) ? 'bad' : 'good');
  render();
}
const tagCount = (tag) => {
  const X = RX();
  let n = 0;
  Object.keys(S.run.boons).forEach((id) => { const b = X.boon[id]; if (b && b.tags.includes(tag)) n += S.run.boons[id]; });
  return n;
};
function rgCheckSyn() {
  const run = S.run;
  RX().rc.synergies.forEach((s) => {
    if (run.syn.includes(s.id) || tagCount(s.tag) < s.count) return;
    rgMut(() => { run.syn.push(s.id); });
    rgInstant(s.instant, s.name);
    sys(`✨ synergy: ${s.name}${s.desc ? ' (' + s.desc + ')' : ''}`, 'good');
    toast(`✨ ${s.name}`, s.desc || 'synergy unlocked', 'ach');
  });
}
function rgGiveBoon(b) {
  const run = S.run;
  rgMut(() => { run.boons[b.id] = (run.boons[b.id] || 0) + 1; });
  rgInstant(b.instant, b.name);
  rgCheckSyn();
  sys(`${b.icon} boon: ${b.name}${b.desc ? ' · ' + b.desc : ''}`, 'good');
  return b;
}
function rgGiveRelic(b) {
  const run = S.run;
  if (run.relics.includes(b.id)) return;
  rgMut(() => { run.relics.push(b.id); });
  rgInstant(b.instant, b.name);
  sys(`${b.icon} relic: ${b.name}${b.desc ? ' · ' + b.desc : ''}`, 'good');
}
function rgGiveCurse(cu, left, perm) {
  const run = S.run;
  if (run.curses.some((c) => c.id === cu.id)) return false;
  rgMut(() => { run.curses.push({ id: cu.id, left: perm ? 'run' : cu.duration, act: run.act, perm: !!perm }); });
  sys(`${cu.icon} curse: ${cu.name}${cu.desc ? ' · ' + cu.desc : ''}`, 'bad');
  return true;
}
const priceMult = () => S.run.curses.reduce((m, c) => m * ((RX().curse[c.id] || {}).shopPriceMult || 1), 1);

// ----- offers (seeded) -----
const rarNum = (r) => RAR_ORDER.indexOf(r);
function boonPool(act) {
  const run = S.run;
  return RX().rc.boons.filter((b) => b.acts.includes(act) && rgUnlocked('boons', b) && (run.boons[b.id] || 0) < b.max && (!b.requires || tagCount(b.requires.tag) >= b.requires.count));
}
// n cards. step: { idx, rerollN, minRarity (slot 1), pity0 }. Same seed + same owned set + same step = same cards.
function rollBoons(step, act, n) {
  const run = S.run;
  const h = rngH(run.seed, 'boon', step.idx, step.rerollN || 0);
  const W = RARITY_W[act];
  const pool = boonPool(act);
  const out = [];
  for (let s = 0; s < n; s++) {
    let min = 0;
    if (s === 0) {
      if (step.minRarity) min = Math.max(min, rarNum(step.minRarity));
      if ((step.pity0 || 0) >= 2) min = Math.max(min, 1);
    }
    const allowed = RAR_ORDER.filter((r, i) => i >= min);
    let rar = h.weighted(allowed, (r) => W[r]);
    let cands = pool.filter((b) => b.rarity === rar && !out.includes(b));
    for (let d = 1; !cands.length && d < 3; d++) {
      const alt = [rarNum(rar) + d, rarNum(rar) - d].filter((i) => i >= min && i < 3).map((i) => RAR_ORDER[i]);
      for (const r of alt) { cands = pool.filter((b) => b.rarity === r && !out.includes(b)); if (cands.length) { rar = r; break; } }
    }
    if (!cands.length) break;
    out.push(h.weighted(cands, (b) => b.weight));
  }
  return out;
}
function rollRelics(step, act) {
  const run = S.run;
  const h = rngH(run.seed, 'relic', act, step.rerollN || 0);
  const pool = RX().rc.relics.filter((r) => rgUnlocked('relics', r) && !run.relics.includes(r.id));
  return h.shuffle(pool).slice(0, 3);
}


// ----- cards (boon / relic / curse / event choices): the #actions grid, keys 1-4 to pick, R to reroll -----
const instChips = (i) => {
  const o = [];
  if (!i) return o;
  if (i.gold) o.push(`${i.gold > 0 ? '+' : ''}${i.gold} gold`);
  if (i.sus) o.push(`${i.sus > 0 ? '+' : ''}${i.sus}% sus`);
  if (i.alts) o.push(`${i.alts > 0 ? '+' : ''}${i.alts} alt`);
  return o;
};
function synHint(b) {
  const run = S.run;
  const out = [];
  (b.tags || []).forEach((t) => {
    RX().rc.synergies.forEach((s) => {
      if (s.tag === t && !run.syn.includes(s.id)) out.push(`${s.name} ${Math.min(tagCount(t) + 1, s.count)}/${s.count}`);
    });
  });
  return out.join(' · ');
}
// card = { icon, name, rarity, chips[], desc, meta, disabled, fn }
function rgCards(title, cards, o = {}) {
  const box = $('#actions');
  box.textContent = '';
  S.actBuild = null;
  box.appendChild(el('div', 'actions-title', title));
  if (o.hint) box.appendChild(el('div', 'actions-hint', o.hint));
  const grid = el('div', 'choices rg-cards');
  cards.forEach((c, i) => {
    const b = el('button', `choice rg-card rar-${c.rarity || 'none'}`);
    b.type = 'button';
    b.dataset.key = String(i + 1);
    const head = el('span', 'rg-card-head');
    head.append(el('span', 'k', `[${i + 1}]`), document.createTextNode(`${c.icon || ''} ${c.name}`));
    if (c.rarity) head.appendChild(el('span', `rar-badge rar-${c.rarity}`, c.rarity));
    b.appendChild(head);
    if (c.chips && c.chips.length) { const ch = el('span', 'shop-chips'); c.chips.forEach((x) => ch.appendChild(el('span', 'fx-chip', x))); b.appendChild(ch); }
    if (c.desc) b.appendChild(el('span', 'sub', c.desc));
    if (c.meta) b.appendChild(el('span', 'sub rg-meta', c.meta));
    b.setAttribute('aria-label', `${i + 1}: ${c.name}${c.rarity ? ', ' + c.rarity : ''}. ${(c.chips || []).join(', ')}. ${c.desc || ''} ${c.meta || ''}${c.disabled ? ' (unavailable)' : ''}`);
    if (c.disabled) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (c.disabled) return;
      initAudio();
      clearActions();
      c.fn();
    });
    grid.appendChild(b);
  });
  box.appendChild(grid);
  const row = el('div', 'rg-extras');
  (o.extras || []).forEach((x) => {
    const b = el('button', 'shop-link ' + (x.cls || ''), x.label);
    b.type = 'button';
    if (x.key) { b.dataset.rkey = x.key; b.setAttribute('aria-keyshortcuts', x.key.toUpperCase()); }
    if (x.disabled) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); if (!x.disabled) x.fn(); });
    row.appendChild(b);
  });
  if (row.childNodes.length) box.appendChild(row);
  $('#messages').scrollTop = $('#messages').scrollHeight;
  if (!o.noFocus && grid.firstChild) grid.firstChild.focus({ preventScroll: true });
  announce(title);
}
const boonCard = (b, pick) => ({
  icon: b.icon, name: b.name, rarity: b.rarity, chips: fxChips(b.effects).concat(instChips(b.instant)), desc: b.desc,
  meta: [(S.run.boons[b.id] ? `owned x${S.run.boons[b.id]}` : ''), b.tags.join(' '), synHint(b)].filter(Boolean).join(' · '), fn: () => pick(b),
});

// ----- the step queue: every intermission is a step; saved at each one so a reload resumes where you were -----
const rgDone = () => { if (!S.run) return; S.run.queue.shift(); later(250, rgNext); };
function rgNext() {
  const run = S.run;
  if (!run || run.done) return;
  const st = run.queue[0];
  if (!st) { rgQueueRound(run.idx); rgNext(); return; }
  rgSave();
  clearActions();
  const pl = run.plan[run.idx - 1];
  if (st.k === 'round') { rgBeginRound(); return; }
  if (st.k === 'win') { rgEnd(true); return; }
  if (st.k === 'curse') { rgCurseStep(st, pl); return; }
  if (st.k === 'intro') { rgIntroStep(st, pl); return; }
  if (st.k === 'boon') { rgBoonStep(st); return; }
  if (st.k === 'relic') { rgRelicStep(st); return; }
  if (st.k === 'event') { rgEventStep(st); return; }
  if (st.k === 'shop') { rgShopStep(st); return; }
  run.queue.shift();
  rgNext();
}
function rgQueueRound(idx) {
  const run = S.run;
  const pl = run.plan[idx - 1];
  if (pl.type === 'elite') run.queue.push({ k: 'curse' });
  if (pl.type !== 'normal') run.queue.push({ k: 'intro' });
  run.queue.push({ k: 'round' });
}

// elite round: a curse is offered first (accept for a payout, or decline)
function rgCurseStep(st, pl) {
  const run = S.run;
  S.phase = 'rg-curse';
  run.eliteCurse = null;
  const X = RX();
  const pool = X.rc.curses.filter((c) => !run.curses.some((x) => x.id === c.id));
  if (run.curses.length >= 2 || !pool.length) { run.queue.shift(); rgNext(); return; }
  const cu = rngH(run.seed, 'curse', run.idx).pick(pool);
  const p = cu.payout || {};
  const pay = [p.gold ? `+${Math.round(p.gold * ACT_SCALE[pl.act - 1])} gold` : '', p.boonRarity ? `${p.boonRarity} boon` : '', p.alts ? `+${p.alts} alt` : '', p.relicReroll ? '+1 relic reroll' : '', p.effects ? fxChips(p.effects).join(' ') + ' for the ' + (p.effectsDuration || 'act') : ''].filter(Boolean).join(', ');
  sys(`${RX().rc.flavor.eliteLabel}: ${X.rc.flavor.actNames[pl.act - 1]} round ${pl.idx}. A curse is on offer.`, 'bad');
  rgCards(`${RX().rc.flavor.eliteLabel} ROUND AHEAD · accept a curse for a bigger payout?`, [
    { icon: cu.icon, name: `Accept ${cu.name}`, chips: fxChips(cu.effects), desc: cu.desc, meta: `payout if you clear the round: ${pay || 'none'} (${cu.duration === 'round' ? 'this round' : cu.duration === 'act' ? 'this act' : 'rest of run'})`, fn: () => { rgGiveCurse(cu); run.eliteCurse = cu.id; rgDone(); } },
    { icon: '🛡', name: 'Decline', desc: 'No curse. The elite round is still harder than normal.', fn: () => { sys('You decline the curse.'); rgDone(); } },
  ], { hint: `Elite rounds are no-timeout, points x${RG_TUNE.elite[0]} and suspicion x${RG_TUNE.elite[1]}. Esc does nothing here: pick 1 or 2.` });
}

function ruleText(r, B) {
  const o = [];
  if (r.modeLock === 'no-timeout') o.push('no-timeout server: nobody parks you, friends may drag you out');
  if (r.graceZero) o.push('no grace minutes');
  if (r.pingRateMult) o.push(`friends ping x${r.pingRateMult} as often`);
  if (r.forceVc) o.push('the squad moves to another voice channel');
  if (r.micEventMult) o.push(`mic accidents x${r.micEventMult}`);
  if (r.pointMultRound) o.push(`points x${r.pointMultRound}`);
  if (r.susMultRound) o.push(`suspicion x${r.susMultRound}`);
  if (r.dragChanceMult) o.push(`drag chance x${r.dragChanceMult}`);
  if (r.blackout) o.push(`a blackout hits between ${r.blackout.at[0]}m and ${r.blackout.at[1]}m (friends vanish for ${r.blackout.dur[0]}-${r.blackout.dur[1]}m, suspicion x${r.blackout.susMult} meanwhile)`);
  if (r.noDecay) o.push('no suspicion recovery before the next round');
  if (r.excuseMult) o.push(`excuses x${r.excuseMult} as effective`);
  if (r.mutedOff) o.push('muted channels are unmuted');
  if (r.triageTimeMult) o.push(`triage time x${r.triageTimeMult}`);
  if (r.kickVoteAt) o.push(`a kick vote opens at ${r.kickVoteAt}% suspicion`);
  if (r.pingShield) o.push(`you start with ${r.pingShield} ping shields`);
  return o;
}
// act pressure (RG_TUNE): later acts make friends drag you out more often, bosses most of all
const pressureText = (act, boss) => {
  const d = RG_TUNE.actDrag[act - 1] * (boss ? RG_TUNE.bossDrag[act - 1] : 1);
  const sx = RG_TUNE.actSus[act - 1];
  return [d > 1.001 ? `friends drag you out x${Math.round(d * 10) / 10} as often` : '', sx > 1.001 ? `suspicion x${Math.round(sx * 100) / 100}` : ''].filter(Boolean).join(', ');
};
const bossObjective = (B) => Math.round(B.objective.minMins * S.run.rules.bossObjectiveMult);
function rgIntroStep(st, pl) {
  const run = S.run;
  S.phase = 'rg-intro';
  const X = RX();
  const nodes = [];
  const fl = X.rc.flavor;
  if (pl.type === 'boss') {
    const B = X.boss[pl.boss];
    if (!B) { run.queue.shift(); rgNext(); return; }
    const obj = bossObjective(B);
    const intro = (fl.bossIntro && fl.bossIntro[B.id]) || B.intro;
    nodes.push(el('h1', '', `${B.icon} ${fl.bossLabel} · ${B.name}`, 'modalTitle'), el('p', 'tag', `${fl.actNames[pl.act - 1]} · round ${pl.idx} of 12${st.retry ? ' · RETRY' : ''}`));
    intro.forEach((t) => nodes.push(el('p', 'rg-line', meTok(t))));
    nodes.push(el('h3', '', 'OBJECTIVE'), el('p', '', `Stay AFK ${obj} min (about ${realSecs(obj)} s real time) and come back with suspicion under ${kickAt()}%. Come back early or get kicked: you lose an alt and repeat the round.`));
    const rt = ruleText(B.rules, B);
    const pr = pressureText(pl.act, true);
    if (pr) rt.push(`act pressure: ${pr}`);
    if (rt.length) { nodes.push(el('h3', '', 'RULES')); const ul = el('ul'); rt.forEach((t) => ul.appendChild(el('li', '', t))); nodes.push(ul); }
    nodes.push(el('p', 'tag', `Forced brb: ${fmtMins(B.promise.p)} at x${B.promise.m}. Reward: ${Math.round(B.reward.gold)} gold + a relic.`));
  } else {
    nodes.push(el('h1', '', `🔥 ${fl.eliteLabel} ROUND`, 'modalTitle'), el('p', 'tag', `${fl.actNames[pl.act - 1]} · round ${pl.idx} of 12`));
    nodes.push(el('p', '', `No-timeout server, points x${RG_TUNE.elite[0]}, suspicion x${RG_TUNE.elite[1]}${pressureText(pl.act, false) ? ', ' + pressureText(pl.act, false) : ''}. Stay AFK at least ${pl.goal} min and come back alive: ${40 * ACT_SCALE[pl.act - 1]} gold and a rare-or-better boon.`));
    if (run.eliteCurse) nodes.push(el('p', 'tag', `Cursed with ${(X.curse[run.eliteCurse] || {}).name || 'something'}.`));
  }
  const go = el('button', 'btn', 'Begin round', 'rgBegin');
  go.addEventListener('click', () => { closeModal(); rgDone(); });
  nodes.push(go);
  openModal(nodes, 'rg-intro');
  announce(nodes[0].textContent);
}

function rgBoonStep(st) {
  const run = S.run;
  S.phase = 'rg-boon';
  const X = RX();
  const L = X.loadout[run.ld] || {};
  const n = L.offerCards || 3;
  if (st.pity0 == null) st.pity0 = run.pity;
  let offer;
  if (st.fixed) offer = st.fixed.map((id) => X.boon[id]).filter(Boolean);
  else offer = rollBoons(st, run.act, n);
  run.offer = offer.map((b) => b.id);
  if (!offer.length) { sys('The boon pool is empty. +10 gold instead.', 'good'); rgInstant({ gold: 10 }); run.queue.shift(); later(400, rgNext); return; }
  const pick = (b) => {
    rgGiveBoon(b);
    if (!st.fixed) run.pity = offer.some((x) => x.rarity !== 'common') ? 0 : st.pity0 + 1;
    run.queue.shift();
    later(500, rgNext);
  };
  const extras = [];
  if (!st.fixed) extras.push({ label: `🎲 Reroll (R) · ${run.rerolls} left`, key: 'r', cls: 'rg-reroll', disabled: run.rerolls <= 0, fn: () => { run.rerolls--; st.rerollN = (st.rerollN || 0) + 1; rgSave(); rgBoonStep(st); } });
  extras.push({ label: '📖 Build', fn: rgInfo });
  rgCards(st.title || `PICK A BOON · ${X.rc.flavor.actNames[Math.max(0, (run.plan[Math.max(1, st.idx || run.idx) - 1] || { act: run.act }).act - 1)]} · round ${st.idx || run.idx} cleared`, offer.map((b) => boonCard(b, pick)), { extras, hint: st.fixed ? 'A free pick from your loadout.' : 'Keys 1-' + offer.length + ' pick, R rerolls.' });
}

function rgRelicStep(st) {
  const run = S.run;
  S.phase = 'rg-relic';
  const offer = rollRelics(st, st.act || run.act);
  if (!offer.length) { sys('No relics left to offer. +25 gold.', 'good'); rgInstant({ gold: 25 }); run.queue.shift(); later(400, rgNext); return; }
  const pick = (r) => { rgGiveRelic(r); run.queue.shift(); later(500, rgNext); };
  const left = run.rerolls + run.relicRerolls;
  rgCards('PICK A RELIC · a permanent passive from the boss', offer.map((r) => ({ icon: r.icon, name: r.name, rarity: 'legendary', chips: fxChips(r.effects).concat(instChips(r.instant)), desc: r.desc, meta: [r.when ? `only in ${r.when.roundType} rounds` : '', r.tags.join(' ')].filter(Boolean).join(' · '), fn: () => pick(r) })), {
    extras: [{ label: `🎲 Reroll (R) · ${left} left`, key: 'r', cls: 'rg-reroll', disabled: left <= 0, fn: () => { if (run.relicRerolls > 0) run.relicRerolls--; else run.rerolls--; st.rerollN = (st.rerollN || 0) + 1; rgSave(); rgRelicStep(st); } }, { label: '📖 Build', fn: rgInfo }],
    hint: 'Relics are permanent.',
  });
}

// ----- events -----
function evChoiceOk(c) {
  const run = S.run;
  const need = c.requires || {};
  const cost = c.cost || {};
  if ((cost.gold || 0) > run.gold) return false;
  if ((cost.alts || 0) > run.alts) return false;
  if (need.goldMin != null && run.gold < need.goldMin) return false;
  if (need.alts != null && run.alts < need.alts) return false;
  if (need.flag && !run.flags[need.flag]) return false;
  return true;
}
function rgPickEvent() {
  const run = S.run;
  if (run.forceEvent) { const f = RX().event[run.forceEvent]; run.forceEvent = null; if (f) return f; }
  const pool = RX().rc.events.filter((e) => e.acts.includes(run.act) && !run.eventsSeen.includes(e.id));
  const use = pool.length ? pool : RX().rc.events.filter((e) => e.acts.includes(run.act));
  return use.length ? rngH(run.seed, 'event', run.idx).weighted(use, (e) => e.weight) : null;
}
function rgEventStep(st) {
  const run = S.run;
  S.phase = 'rg-event';
  const ev = rgPickEvent();
  if (!ev) { run.queue.shift(); rgNext(); return; }
  run.cur = ev.id;
  if (!run.eventsSeen.includes(ev.id)) run.eventsSeen.push(ev.id);
  sys(`${ev.icon} event: ${ev.title}`);
  rgCards(`${ev.icon} ${ev.title.toUpperCase()} · ${meTok(ev.text)}`, ev.choices.map((c, ci) => {
    const ok = evChoiceOk(c);
    const cost = c.cost || {};
    const costTxt = [cost.gold ? `costs ${cost.gold} gold` : '', cost.alts ? `costs ${cost.alts} alt` : ''].filter(Boolean).join(', ');
    return { icon: '▸', name: c.label, desc: c.hint, meta: [costTxt, ok ? '' : 'you cannot do this right now'].filter(Boolean).join(' · '), disabled: !ok, fn: () => rgResolveEvent(ev, c, ci) };
  }), { extras: [{ label: '📖 Build', fn: rgInfo }], hint: `You have ${run.gold} gold and ${run.alts} alt${run.alts === 1 ? '' : 's'}.` });
}
function rgResolveEvent(ev, c, ci) {
  const run = S.run;
  const cost = c.cost || {};
  if (cost.gold) run.gold = Math.max(0, run.gold - cost.gold);
  if (cost.alts) run.alts = Math.max(0, run.alts - cost.alts);
  const h = rngH(run.seed, 'event', run.idx, ci);
  const o = h.weighted(c.outcomes, (x) => x.w);
  sys(`${ev.icon} ${meTok(o.text)}`, 'good');
  toast(`${ev.icon} ${ev.title}`, meTok(o.text));
  rgInstant(o.instant);
  if (o.effects) rgMut(() => { run.temp.push({ effects: o.effects, until: o.effectsDuration || 'run', act: run.act, label: ev.title }); });
  if (o.flag) run.flags[o.flag] = true;
  const X = RX();
  if (o.giveCurse && X.curse[o.giveCurse]) rgGiveCurse(X.curse[o.giveCurse]);
  if (o.giveBoon) {
    let b = null;
    if (o.giveBoon.id) b = X.boon[o.giveBoon.id];
    else {
      // a rarity with nothing unlocked falls back to the next lower one (legendaries are unlocked in the Archive)
      for (let ri = rarNum(o.giveBoon.rarity); ri >= 0 && !b; ri--) {
        const pool = boonPool(run.act).filter((x) => x.rarity === RAR_ORDER[ri] && (!o.giveBoon.tag || x.tags.includes(o.giveBoon.tag)));
        if (pool.length) b = h.pick(pool);
      }
    }
    if (b && (run.boons[b.id] || 0) < b.max) rgGiveBoon(b); else rgInstant({ gold: 8 }, 'nothing left to give');
  }
  run.queue.shift();
  if (o.giveRelic) run.queue.unshift({ k: 'relic', act: run.act });
  renderInv();
  later(1500, rgNext);
}

// ----- in-run shop (run gold; stock is seeded per act) -----
function shopPrice(base, act) { return Math.max(1, Math.ceil(base * ACT_SCALE[act - 1] * priceMult())); }
function rgShopStock(act, n) {
  const run = S.run;
  const h = rngH(run.seed, 'shop', act, n);
  const W = { ...RARITY_W[act] };
  if (act < 2) W.legendary = 0;
  const pool = boonPool(act).filter((b) => b.rarity !== 'legendary' || act >= 2);
  const boons = [];
  for (let i = 0; i < 3; i++) {
    const rar = h.weighted(RAR_ORDER, (r) => W[r]);
    let c = pool.filter((b) => b.rarity === rar && !boons.includes(b.id));
    if (!c.length) c = pool.filter((b) => !boons.includes(b.id));
    if (!c.length) break;
    boons.push(h.weighted(c, (b) => b.weight).id);
  }
  const gadgets = h.shuffle(ABILITIES.map((a) => a.key)).slice(0, 2);
  return { boons, gadgets };
}
function rgShopStep(st) {
  const run = S.run;
  S.phase = 'rg-shop';
  const act = run.plan[run.idx - 1].act;
  if (!run.shop || run.shop.idx !== run.idx) run.shop = { idx: run.idx, act, n: 0, bought: {}, alt: false, stock: null };
  sys(`🛒 the shop is open (${run.gold} gold)`);
  (run.shopGold = run.shopGold || []).push(run.gold);
  rgShopView({});
}
function rgShopView(o) {
  const run = S.run;
  const sh = run.shop;
  const X = RX();
  const act = sh.act;
  if (!sh.stock || sh.stockN !== sh.n) { sh.stock = rgShopStock(act, sh.n); sh.stockN = sh.n; }
  const nodes = [el('h1', '', `🛒 ${X.rc.flavor.actNames[act - 1]} shop`, 'modalTitle')];
  const wallet = el('div', 'shop-build');
  wallet.append(el('div', 'shop-build-title', 'RUN GOLD'), el('div', 'shop-build-line', `${run.alts} alt${run.alts === 1 ? '' : 's'} · ${run.rerolls} reroll${run.rerolls === 1 ? '' : 's'} · sus ${Math.round(100 * S.sus / kickAt())}%`), el('div', 'shop-wallet', `💰 ${run.gold}`, 'rgWallet'));
  nodes.push(wallet);
  const box = el('div', 'shop');
  const row = (id, ico, name, rar, chips, desc, price, fn, ok, why) => {
    const r = el('div', `shop-item rar-${rar || 'common'}`);
    const info = el('div', 'shop-info');
    const nm = el('div', 'shop-name');
    nm.appendChild(document.createTextNode(`${ico} ${name} `));
    if (rar) nm.appendChild(el('span', `rar-badge rar-${rar}`, rar));
    const ch = el('div', 'shop-chips');
    (chips || []).forEach((x) => ch.appendChild(el('span', 'fx-chip', x)));
    info.append(nm, el('div', 'shop-desc', desc), ch);
    const done = sh.bought[id];
    const b = el('button', 'btn alt shop-buy', done ? 'Bought' : `${price} 💰`);
    b.type = 'button';
    b.dataset.rg = id;
    b.disabled = !!done || run.gold < price || !ok;
    b.setAttribute('aria-label', done ? `${name}: bought` : `Buy ${name} for ${price} gold${run.gold < price ? ' (not enough gold)' : !ok ? ' (' + why + ')' : ''}`);
    b.addEventListener('click', () => { fn(price); sfx.cash(); rgSave(); rgShopView({ focus: [`.shop-buy[data-rg="${id}"]:not(:disabled)`, '.shop-buy:not(:disabled)', '#rgLeave'] }); });
    r.append(info, b);
    box.appendChild(r);
  };
  sh.stock.boons.forEach((bid) => {
    const b = X.boon[bid];
    if (!b) return;
    const base = SHOP_BASE[b.rarity];
    row('b:' + bid, b.icon, b.name, b.rarity, fxChips(b.effects).concat(instChips(b.instant)), b.desc, shopPrice(base, act), (p) => { run.gold -= p; sh.bought['b:' + bid] = true; rgGiveBoon(b); }, (run.boons[bid] || 0) < b.max, 'already at max');
  });
  sh.stock.gadgets.forEach((gk) => {
    const a = ABILITIES.find((x) => x.key === gk);
    if (!a) return;
    row('g:' + gk, a.icon, `${a.name} charge`, 'common', ['+1 charge'], a.tip, shopPrice(SHOP_BASE.gadget, act), (p) => { run.gold -= p; sh.bought['g:' + gk] = true; rgMut(() => { run.gadgets[gk] = Math.min(2, (run.gadgets[gk] || 0) + 1); }); }, true, '');
  });
  row('heal', '🩹', 'Heal', 'common', ['-25% sus now'], 'Sleep it off. Suspicion drops 25 right now.', shopPrice(SHOP_BASE.heal, act), (p) => { run.gold -= p; sh.bought.heal = true; S.sus = Math.max(0, S.sus - 25); render(); }, S.sus > 0, 'suspicion is already 0');
  run.curses.filter((c) => !c.perm).forEach((c) => {
    const cu = X.curse[c.id];
    if (cu) row('c:' + c.id, '🧹', `Remove ${cu.name}`, 'rare', [], cu.desc, shopPrice(SHOP_BASE.curse, act), (p) => { run.gold -= p; sh.bought['c:' + c.id] = true; rgMut(() => { run.curses = run.curses.filter((x) => x.id !== c.id); }); }, true, '');
  });
  row('alt', '♥', 'Spare alt account', 'legendary', ['+1 alt'], 'Another life. Once per shop, max 3.', shopPrice(SHOP_BASE.alt, act), (p) => { run.gold -= p; sh.bought.alt = true; run.alts = Math.min(MAX_ALTS, run.alts + 1); }, run.alts < MAX_ALTS, 'you already have the maximum');
  row('token', '🎲', 'Reroll token', 'common', ['+1 reroll'], 'One more boon or relic reroll.', shopPrice(SHOP_BASE.token, act), (p) => { run.gold -= p; run.rerolls++; }, true, '');
  const rp = shopPrice(2 + 2 * sh.n, 1);
  row('reroll', '🔄', 'Reroll the shop', null, [], 'New stock. Already-bought items stay bought.', rp, (p) => { run.gold -= p; sh.n++; sh.bought = Object.fromEntries(Object.entries(sh.bought).filter(([k]) => k === 'alt' || k === 'heal' || k.startsWith('c:'))); }, true, '');
  nodes.push(box);
  const leave = el('button', 'btn', 'Leave shop', 'rgLeave');
  leave.addEventListener('click', rgShopLeave);
  nodes.push(leave);
  openModal(nodes, 'rg-shop');
  $('#rgWallet').textContent = `💰 ${run.gold}`;
  (o.focus || []).some((sel) => { const f = $('#modalCard').querySelector(sel); if (f) f.focus({ preventScroll: true }); return !!f; });
  renderInv();
}
function rgShopLeave() {
  if (!S.run || S.phase !== 'rg-shop') return;
  closeModal();
  S.run.shop = null;
  rgDone();
}

window.AFK.modules.push('rogue');
