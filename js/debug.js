'use strict';
/* AFK Simulator / js/debug.js: ?debug=1 only: rogue test + balance harness (rgDebug); inert otherwise.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- ?debug=1 only: rogue test + balance harness ----------
// FAST mode makes later() instant (a discrete-event queue), so a whole run plays synchronously in a few hundred ms.
// Policies read the real DOM options / call the same functions the buttons call. Used by tests and sim_rogue.py.
function rgDebug() {
  const D = {};
  const fastDrain = (limit = 20000) => {
    let k = 0;
    while (FAST && FAST.q.length && k++ < limit) {
      FAST.q.sort((a, b) => a.t - b.t || a.n - b.n);
      const e = FAST.q.shift();
      FAST.now = Math.max(FAST.now, e.t);
      e.fn();
    }
  };
  D.fast = (on) => { FAST = on ? { q: [], now: 0, n: 0 } : null; return !!FAST; };
  D.drain = () => { fastDrain(); return S.phase; };
  D.plan = (seed, asc) => {
    const sd = window.AFK_RNG.normSeed(seed) || (S.run && S.run.seed);
    return rgPlan(sd, asc == null ? (S.run ? S.run.asc : 0) : asc).map((p) => ({ ...p }));
  };
  D.state = () => {
    const r = S.run;
    if (!r) return null;
    return { seed: r.seed, ld: r.ld, asc: r.asc, idx: r.idx, act: r.act, phase: S.phase, type: r.roundType, gold: r.gold, alts: r.alts, rerolls: r.rerolls, relicRerolls: r.relicRerolls, boons: { ...r.boons }, relics: r.relics.slice(), curses: r.curses.map((c) => ({ ...c })), temp: r.temp.length, syn: r.syn.slice(), gadgets: { ...r.gadgets }, flags: { ...r.flags }, pity: r.pity, bossClears: r.bossClears, queue: r.queue.map((s) => s.k), offer: r.offer.slice(), objective: r.objective, kickedRound: r.kickedRound, early: r.early, done: r.done, hist: r.hist ? r.hist.slice() : [], score: S.score, sus: S.sus, combo: S.combo, mode: S.mode, boss: S.rd.boss };
  };
  D.start = (cfg) => { rgStart(cfg || {}); fastDrain(); return D.state(); };
  D.resume = () => { const ok = rgResume(); fastDrain(); return ok; };
  D.offer = () => (S.run ? S.run.offer.slice() : []);
  // test helpers: jump to a round, come back from AFK, force the next event
  D.jump = (idx) => {
    const run = S.run;
    run.idx = idx;
    run.act = run.plan[idx - 1].act;
    run.queue = [];
    run.started = true;
    S.round = idx;
    rgQueueRound(idx);
    S.phase = 'rg-intro';
    rgNext();
    fastDrain();
    return D.state();
  };
  D.back = () => { S.armed = true; S.afkAt = -1e9; comeBack(); fastDrain(); return S.phase; };
  D.forceEvent = (id) => { S.run.forceEvent = id; S.run.queue.unshift({ k: 'event' }); rgNext(); fastDrain(); return S.phase; };
  D.shopNow = () => { S.run.queue.unshift({ k: 'shop' }); rgNext(); fastDrain(); return S.phase; };
  D.relicNow = () => { S.run.queue.unshift({ k: 'relic', act: S.run.act }); rgNext(); fastDrain(); return S.phase; };
  D.boonNow = (o) => { S.run.queue.unshift({ k: 'boon', idx: S.run.idx, ...(o || {}) }); rgNext(); fastDrain(); return S.phase; };
  D.curseNow = () => { S.run.queue.unshift({ k: 'curse' }); rgNext(); fastDrain(); return S.phase; };
  D.pick = (i) => { const b = document.querySelector(`#actions .rg-card[data-key="${i}"]`); if (b) b.click(); fastDrain(); return !!b; };
  D.cards = () => Array.from(document.querySelectorAll('#actions .rg-card')).map((b) => b.textContent);
  D.give = (o) => {
    const X = RX();
    const run = S.run;
    if (o.boon && X.boon[o.boon]) rgGiveBoon(X.boon[o.boon]);
    if (o.relic && X.relic[o.relic]) rgGiveRelic(X.relic[o.relic]);
    if (o.curse && X.curse[o.curse]) rgGiveCurse(X.curse[o.curse]);
    if (o.gold != null) run.gold = o.gold;
    if (o.alts != null) run.alts = o.alts;
    if (o.rerolls != null) run.rerolls = o.rerolls;
    if (o.sus != null) S.sus = o.sus;
    renderInv(); rgHudRender(); rgSave();
    return D.state();
  };
  D.meta = () => JSON.parse(JSON.stringify(META));
  D.setMeta = (o) => { store.set('rogue', { ...JSON.parse(JSON.stringify(META)), ...o }); META = loadMeta(); return D.meta(); };
  D.reloadMeta = () => { META = loadMeta(); return D.meta(); };
  D.saved = () => rgReadSaved();
  D.end = (win) => { const r = rgEnd(!!win, 'test'); fastDrain(); return r; };
  D.settle = () => { rgSettle(); fastDrain(); return D.state(); };
  D.shareText = (e) => rogueShareText(e);
  D.scores = () => getRogueScores();
  D.rules = (a) => rgRules(a);
  D.tune = (o) => { Object.keys(o || {}).forEach((k) => { if (k in RG_TUNE) RG_TUNE[k] = o[k]; }); return JSON.parse(JSON.stringify(RG_TUNE)); };
  D.mode = () => modeNow();
  D.rollBoons = (seed, idx, rerollN, act, n) => {
    const run = S.run;
    const keep = run.seed;
    run.seed = seed;
    try { return rollBoons({ idx, rerollN: rerollN || 0, pity0: 0 }, act || run.act, n || 3).map((b) => b.id); } finally { run.seed = keep; }
  };
  D.shopStock = (seed, act, n) => { const run = S.run; const keep = run.seed; run.seed = seed; try { return rgShopStock(act, n || 0); } finally { run.seed = keep; } };
  D.eventFor = (seed, idx) => { const run = S.run; const ks = run.seed; const ki = run.idx; run.seed = seed; run.idx = idx; try { const e = rgPickEvent(); return e ? e.id : null; } finally { run.seed = ks; run.idx = ki; } };
  D.tick = (m) => {
    const target = S.mins + m;
    let guard = 0;
    catchingUp = true;
    while (S.phase === 'afk' && !S.inAfkCh && S.mins < target && guard++ < 200000) afkStep(Math.min(0.1, (target - S.mins) / (1 + S.mins / 20) + 1e-9));
    catchingUp = false;
    return S.mins;
  };

  // --- policies ---
  const lnv = (v) => Math.log(v);
  function effScore(fx) {
    const W = { pointMult: (v) => 10 * lnv(v), susMult: (v) => -12 * lnv(v), pointFlatPerMin: (v) => 0.8 * v, susFlatPerRound: (v) => -0.5 * v, graceMins: (v) => 0.8 * v, excuseBonus: (v) => 0.12 * v, secondWind: (v) => 4 * v, excuseReroll: (v) => 0.8 * v, pingShield: (v) => 0.5 * v, triageTime: (v) => 3 * (v - 1), dragChanceMult: (v) => -9 * lnv(v), comboKeep: (v) => 0.6 * v, comboStartBonus: (v) => v, goldMult: (v) => 4 * (v - 1), lieBonusMult: (v) => 3 * (v - 1), clipBonusMult: (v) => v - 1, abFakeInternet: (v) => 0.9 * v, abMuteHammer: (v) => 0.5 * v, abDecoy: (v) => 1.2 * v, abPingBomb: (v) => 0.5 * v, tokenMult: (v) => v - 1, micEventChance: (v) => -0.6 * (v - 1) };
    let s = 0;
    Object.keys(fx || {}).forEach((k) => { if (W[k]) s += W[k](fx[k]); });
    return s;
  }
  const boonValue = (b) => effScore(b.effects) + (b.instant ? (b.instant.gold || 0) * 0.05 - (b.instant.sus || 0) * 0.04 : 0) + (b.rarity === 'legendary' ? 1 : 0);
  const POL = {
    random: { name: 'random', rnd: true },
    // greedy = a good player: scores boons and purchases, pushes its luck less, and parks in "alone in VC" for bosses (friends drift out of voice, so fewer drags)
    greedy: { name: 'greedy', rnd: false, noise: 0.4, bossPath: 'alone-in-vc' },
  };
  const rpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function actCard(n) { const b = document.querySelector(`#actions .rg-card[data-key="${n}"]`); if (b) b.click(); }
  function choiceByLabel(sel) { return Array.from(document.querySelectorAll(sel)); }
  function playAfk(pol) {
    const run = S.run;
    const pl = run.plan[run.idx - 1];
    const boss = !!rgBoss();
    const noise = pol.noise == null ? 1 : pol.noise; // human-ish variance: how long they push their luck
    const stay = pol.stay || (1.05 + noise * 0.7 * Math.random());
    const target = boss ? run.objective + 0.3 : Math.max(pl.goal * stay, S.promise + 0.4);
    const retSus = (pol.retSus || (0.97 - noise * 0.3 * Math.random())) * kickAt();
    let guard = 0;
    while (S.phase === 'afk' && guard++ < 3000) {
      if (S.inAfkCh) break;
      if (S.mins >= target) break;
      if (!boss && S.sus >= retSus) break;
      D.tick(0.5);
    }
    if (S.phase === 'afk') { S.armed = true; S.afkAt = -1e9; comeBack(); }
  }
  function exScore(e) {
    const used = S.uses[e.k || e.t] || 0;
    return ((e.r[0] + e.r[1]) / 2) * Math.pow(0.55, used) - (used ? 0.45 * 17 : 0);
  }
  function playTriage(pol) {
    let guard = 0;
    while (S.phase === 'triage' && S.tri && guard++ < 20) {
      if (!pol.rnd && S.charges.abPingBomb > 0 && owedPings().length >= 2) { useAbility('abPingBomb'); break; }
      const owed = owedPings();
      if (!owed.length) { finishTriage(); break; }
      const c = textById(owed[0].ch);
      answerCh(c, repliesFor(c, S.tri)[0]);
    }
  }
  function playExcuse(pol) {
    const opts = S.exOpts || [];
    if (!pol.rnd) {
      if (S.charges.abFakeInternet > 0 && S.sus > 30 && useAbility('abFakeInternet')) { /* armed */ }
      const risky = S.sus > 35 || S.rd.fakeNet;
      const best = opts.filter((o) => !o.quiet).sort((a, b) => exScore(b) - exScore(a))[0];
      chooseExcuse(risky && best ? best : opts.find((o) => o.quiet) || best);
      return;
    }
    chooseExcuse(rpick(opts));
  }
  function boonPickIdx(pol, offer) {
    if (pol.rnd) return Math.floor(Math.random() * offer.length);
    let bi = 0; let bv = -1e9;
    offer.forEach((b, i) => { const v = boonValue(b) * (S.run.boons[b.id] ? 0.8 : 1); if (v > bv) { bv = v; bi = i; } });
    return bi;
  }
  function evValue(c) {
    let tot = 0; let ws = 0;
    c.outcomes.forEach((o) => {
      const i = o.instant || {};
      let v = (i.gold || 0) * 0.1 - (i.sus || 0) * 0.08 + (i.alts || 0) * 3 + (o.giveBoon ? 2 : 0) + (o.giveRelic ? 3 : 0) + (o.giveCurse ? -1.5 : 0) + (o.effects ? effScore(o.effects) : 0);
      v += 0;
      tot += o.w * v; ws += o.w;
    });
    const cost = c.cost || {};
    return tot / ws - (cost.gold || 0) * 0.1 - (cost.alts || 0) * 3;
  }
  function shopPlay(pol) {
    const run = S.run;
    const sh = run.shop;
    const X = RX();
    let guard = 0;
    const btns = () => Array.from(document.querySelectorAll('#modalCard .shop-buy:not(:disabled)'));
    while (guard++ < 14) {
      const bs = btns();
      if (!bs.length) break;
      if (pol.rnd) { rpick(bs).click(); continue; }
      // greedy: spare alt first, then the best value per gold among boons, heal when hurt, then gadgets/tokens
      const pr = (b) => parseInt(b.textContent, 10);
      const score = (b) => {
        const id = b.dataset.rg;
        if (id === 'alt') return run.alts < 2 ? 100 : 1;
        if (id === 'heal') return S.sus > 45 ? 20 : -1;
        if (id === 'reroll') return -5;
        if (id === 'token') return run.rerolls < 2 ? 3 : -1;
        if (id.startsWith('c:')) return 4;
        if (id.startsWith('g:')) return 2;
        const bn = X.boon[id.slice(2)];
        return bn ? boonValue(bn) * 6 + 5 : 0;
      };
      const cand = bs.filter((b) => score(b) > 0 && pr(b) <= run.gold).sort((a, b) => score(b) - score(a));
      if (!cand.length) break;
      cand[0].click();
    }
    rgShopLeave();
  }
  function stepOnce(pol) {
    const run = S.run;
    const ph = S.phase;
    if (ph === 'chat') {
      const btns = choiceByLabel('#actions .choice');
      if (!btns.length) return false;
      let best = btns[0]; let bp = -1;
      btns.forEach((b) => { const m = /promise (\d+)m/.exec(b.textContent) || /promise (\d+)h/.exec(b.textContent); const p = m ? +m[1] * (/h/.test(m[0]) ? 60 : 1) : 1; if (p > bp) { bp = p; best = b; } });
      best.click();
      return true;
    }
    if (ph === 'path') {
      const btns = choiceByLabel('#actions .choice');
      if (!btns.length) return false;
      let best = btns[0]; let bs = -1e9;
      btns.forEach((b) => {
        const name = b.textContent.replace(/^\[\d\]/, '');
        const p = PATHS.find((x) => name.indexOf(x.name) === 0);
        const sc = p ? p.pointMult / (p.susMult + 0.15) : 0;
        if (sc > bs) { bs = sc; best = b; }
      });
      const want = run.roundType === 'boss' && pol.bossPath ? btns.find((b) => b.textContent.indexOf((PATHS.find((x) => x.id === pol.bossPath) || { name: '@@' }).name) >= 0) : null;
      (want || (pol.rnd ? btns[Math.floor(Math.random() * btns.length)] : best)).click();
      return true;
    }
    if (ph === 'afk') { playAfk(pol); return true; }
    if (ph === 'triage') { playTriage(pol); return true; }
    if (ph === 'excuse') { if (!S.exOpts) return false; playExcuse(pol); return true; }
    if (ph === 'rg-intro') { const b = document.querySelector('#rgBegin'); if (b) { b.click(); return true; } return false; }
    if (ph === 'rg-curse') {
      const cards = document.querySelectorAll('#actions .rg-card');
      if (cards.length < 2) return false;
      const cu = run.queue[0] && RX().rc.curses.find((c) => cards[0].textContent.indexOf(c.name) >= 0);
      let accept = pol.rnd ? Math.random() < 0.5 : false;
      if (!pol.rnd && cu) { const pay = ((cu.payout || {}).gold || 0) * 0.1 + ((cu.payout || {}).boonRarity ? 2 : 0) + ((cu.payout || {}).alts ? 3 : 0); accept = pay + effScore(cu.effects) * (cu.duration === 'round' ? 0.5 : cu.duration === 'act' ? 1.5 : 3) > 0.5 && run.alts >= 1; }
      actCard(accept ? 1 : 2);
      return true;
    }
    if (ph === 'rg-boon') {
      const offer = run.offer.map((id) => RX().boon[id]).filter(Boolean);
      if (!offer.length) return false;
      actCard(boonPickIdx(pol, offer) + 1);
      return true;
    }
    if (ph === 'rg-relic') {
      const cards = document.querySelectorAll('#actions .rg-card');
      if (!cards.length) return false;
      const rel = Array.from(cards).map((c) => RX().rc.relics.find((r) => c.textContent.indexOf(r.name) >= 0));
      let bi = pol.rnd ? Math.floor(Math.random() * cards.length) : 0;
      if (!pol.rnd) { let bv = -1e9; rel.forEach((r, i) => { const v = r ? effScore(r.effects) + ((r.instant || {}).gold || 0) * 0.05 : 0; if (v > bv) { bv = v; bi = i; } }); }
      actCard(bi + 1);
      return true;
    }
    if (ph === 'rg-event') {
      const cards = Array.from(document.querySelectorAll('#actions .rg-card'));
      if (!cards.length) return false;
      const ev = RX().event[run.cur];
      let idxs = cards.map((c, i) => i).filter((i) => cards[i].getAttribute('aria-disabled') !== 'true');
      if (!idxs.length) return false;
      let pick1 = rpick(idxs);
      if (!pol.rnd && ev) { let bv = -1e9; idxs.forEach((i) => { const v = evValue(ev.choices[i]); if (v > bv) { bv = v; pick1 = i; } }); }
      actCard(pick1 + 1);
      return true;
    }
    if (ph === 'rg-shop') { shopPlay(pol); return true; }
    return false;
  }
  D.auto = (polName, until, opts) => {
    const pol = { ...(POL[polName] || POL.greedy), ...(opts || {}) };
    if (!FAST) D.fast(true);
    for (let it = 0; it < 60000; it++) {
      fastDrain();
      const ph = S.phase;
      if (until && until.includes(ph)) return ph;
      if (!S.run || S.run.done || ph === 'rg-over') return ph;
      if (!stepOnce(pol) && !FAST.q.length) return 'stuck:' + ph;
    }
    return 'maxiter';
  };
  D.setMods = null;
  D.sim = (o) => {
    o = o || {};
    const wasFast = !!FAST;
    D.fast(true);
    const t0 = performance.now();
    rgStart({ seed: o.seed || window.AFK_RNG.randomSeed(), ld: o.ld || 'intern', asc: o.asc || 0 });
    fastDrain();
    const run = S.run;
    if (o.forceBoon && RX().boon[o.forceBoon]) rgGiveBoon(RX().boon[o.forceBoon]);
    if (o.forceRelic && RX().relic[o.forceRelic]) rgGiveRelic(RX().relic[o.forceRelic]);
    if (o.forceCurse && RX().curse[o.forceCurse]) rgGiveCurse(RX().curse[o.forceCurse]);
    const ph = D.auto(o.policy || 'greedy', null, o.pol);
    const res = S.rgResult || {};
    const hist = run.hist || [];
    const out = {
      win: !!res.win, score: res.score || 0, raw: res.raw || S.score, idx: run.idx, act: run.act, bosses: run.bossClears, alts: run.alts, ph,
      gameMins: hist.reduce((a, h) => a + h.mins, 0), realAfk: hist.reduce((a, h) => a + realSecs(h.mins), 0), rounds: hist.length,
      boons: Object.keys(run.boons).reduce((a, k) => a + run.boons[k], 0), relics: run.relics.length, gold: run.gold, ms: Math.round(performance.now() - t0),
      shopGold: run.shopGold || [], tokens: res.earned || 0, pts: hist.map((h) => h.pts), mins: hist.map((h) => Math.round(h.mins)), seed: run.seed, hist: hist.map((h) => [h.idx, h.type[0], Math.round(h.mins), h.kicked ? 1 : 0, h.sus, h.early ? 1 : 0, h.mode === 'afk-timeout' ? 1 : 0]),
    };
    if (!wasFast) D.fast(false);
    return out;
  };
  D.simMany = (o, n) => { const r = []; for (let i = 0; i < n; i++) r.push(D.sim(o)); return r; };
  D.content = () => { const X = RX(); return { boons: X.rc.boons.map((b) => ({ id: b.id, rarity: b.rarity, unlock: b.unlock.tokens, acts: b.acts })), relics: X.rc.relics.map((b) => b.id), curses: X.rc.curses.map((b) => b.id), events: X.rc.events.map((b) => b.id), bosses: X.rc.bosses.map((b) => b.id), loadouts: X.rc.loadouts.map((l) => l.id), flavor: X.rc.flavor }; };
  return D;
}

window.AFK.modules.push('debug');
