'use strict';
/* AFK Simulator / js/afk.js: flow: start/brb/paths/afkStep/excuse/judging/bank/kick.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- flow ----------
// a "quiet" crew member (chill trait) is picked 0.6x as often as the others
const pickQ = (arr) => {
  if (!arr.some((f) => f.quiet)) return pick(arr);
  const w = arr.map((f) => (f.quiet ? 0.6 : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r < 0) return arr[i]; }
  return arr[arr.length - 1];
};
const friend = () => pickQ(S.friends.filter((f) => !f.away).length ? S.friends.filter((f) => !f.away) : S.friends);

function start() {
  initAudio();
  reset();
  const bk = BULKS[PK.id];
  if (PK.id !== 'classic' && bk && bk.state === 'loading') {
    bk.toasted = true;
    toast('loading dialog…', 'hand-written lines until the rest arrives');
    ensureBulk(R.packs[PK.id], true);
  }
  closeModal();
  activateConsumables();
  grantRunCharges();
  S.sus = clamp(getMods({ noEnv: true }).startSus, 0, kickAt() - 1);
  renderInv();
  const a = friend();
  later(300, () => post(a, 'yo'));
  later(1100, () => post(friend(), 'whos on tonight'));
  later(1900, () => post(a, '@' + ME.name + ' u on?'));
  later(2700, () => post(ME, 'ye im on'));
  later(3400, () => post(friend(), 'ok we queueing in 2'));
  later(4000, () => { newRound(); offerBrb(); });
}

// server mode is rolled once per round
function newRound() {
  S.mode = pick(MODES);
  S.threshold = pick(THRESHOLDS);
  renderChip();
  // the squad may hop to another voice channel in later rounds (always the first one under ?debug=1 unless locked)
  const prev = S.chan;
  if (!S.chanLock && !S.vcPicked) { // a voice channel you picked yourself (js/voice.js) stays until you hop again
    const roam = !DEBUG && S.round > 1 && VOICE.length > 1 && Math.random() < 0.3;
    S.chan = roam ? pick(VOICE.slice(1)).id : VOICE[0].id;
  }
  if (S.chan !== prev) {
    const c = curVc();
    const mt = modsText(c.mods || {});
    sys(`🔊 the squad moved to ${c.name}${mt ? ` (${mt})` : ''}`);
    renderMembers();
  }
}

// the channel you are looking at when you pick the brb is where it is posted
function brbHint(c) {
  const kind = c.visibility >= 0.65 ? 'busy: everyone notices, pings find you fast, suspicion builds a bit quicker'
    : c.visibility <= 0.4 ? 'quiet: suspicion builds slower, but friends who miss it ping you all over the place'
      : 'middling: some notice, some do not';
  const mark = S.parkMark ? ' · 👀 you were parked last round: friends watch closer (+10% suspicion gain)' : '';
  return `${kind}${c.muted ? ' · muted (pings reach you late)' : ''}${c.slowmodeSec ? ` · slowmode ${c.slowmodeSec}s` : ''}${mark}. Click another channel to say it there.`;
}
function offerBrb(keep) {
  S.phase = 'chat';
  syncUI();
  if (!keep || !S.brbBase) S.brbBase = pickOptions(BRB, 'brb', deriveBrb, 3);
  const opts = vcBrbMix(S.brbBase); // js/voice.js: the last option fits the voice channel you are in
  setCtx((noFocus) => {
    const c = activeCh();
    setActions(`SAY BRB IN ${labelOf(c).toUpperCase()} (then actually leave)`, opts.map((o) => ({
      label: o.t,
      sub: `promise ${fmtMins(o.p)} · x${o.m} pts (short promise = bigger multiplier)`,
      fn: () => chooseBrb(o),
    })), S.run ? { label: '📖 Build, gold & seed', fn: rgInfo } : S.gn ? { label: '📒 Excuse ledger', fn: () => GN.ledgerView() } : { label: `🛒 Shop · ${fmtN(tokens)} 🪙`, fn: openShop }, { noFocus, hint: brbHint(c) });
  });
  renderMembers(); // voice buttons are clickable now
}

function chooseBrb(o) {
  S.phase = 'leaving';
  S.brbCh = S.active;
  S.brbN[S.brbCh] = (S.brbN[S.brbCh] || 0) + 1;
  post(ME, o.t, { ch: S.brbCh });
  S.promise = o.p;
  S.mult = o.m;
  later(700, () => {
    const f = friend();
    post(f, speak(f, 'ok'));
    offerPath();
  });
}

const pathPool = () => {
  const pool = PATHS.filter((p) => !Array.isArray(p.modes) || p.modes.includes(S.mode));
  return pool.length ? pool : [PATHS.find((p) => !Array.isArray(p.modes)) || FALLBACK_PATH];
};
const pathSub = (p) => `${p.desc || ''} · x${p.pointMult}${p.pointGrow ? '+' : ''} pts · ${p.risk || (p.susMult < 0.8 ? 'low suspicion' : p.susMult > 1.1 ? 'high kick risk' : 'normal suspicion')}`;

function offerPath() {
  S.phase = 'path';
  syncUI(); // abilities show up right away instead of on the next 100 ms render tick
  const modeTxt = S.mode === 'afk-timeout'
    ? `afk-timeout server this round: a bot moves you to the AFK channel after ${fmtMins(S.threshold)}`
    : 'no-timeout server this round: nobody moves you, unless a friend drags you out';
  const opts = (S.run ? rngH(S.run.seed, 'env', S.run.idx, 'path').shuffle(pathPool()) : shuffle(pathPool())).slice(0, 3);
  setActions(`WHERE DO YOU GO AFK? · ${modeTxt}`, opts.map((p) => ({
    label: p.name,
    sub: pathSub(p),
    fn: () => choosePath(p),
  })));
}

function choosePath(p) {
  S.path = p;
  S.phase = 'leaving';
  sys(`${ME.name} is going AFK: ${p.name} (${S.mode} server)`);
  later(500, goAfk);
}

function goAfk() {
  S.phase = 'afk';
  S.mins = 0;
  S.overReal = 0;
  S.pending = 0;
  S.voted = false;
  S.unread = 0;
  S.moved = 0;
  S.inAfkCh = false;
  S.autoMoved = false;
  S.dragged = false;
  S.botBump = 0;
  S.movedAt = 0;
  S.cap = Infinity;
  S.dragMin = 0;
  S.aloneSince = null;
  S.flavor = '';
  S.fightPings = 0;
  S.lastFight = -99;
  S.pings = [];
  S.follows = 0;
  S.lor = null;
  S.tri = null;
  chanDirty = true;
  S.friends.forEach((f) => { f.vc = true; });
  $('.afk-hint').textContent = matchMedia('(pointer:coarse)').matches
    ? 'Touch nothing. Any tap = you\'re back. Go outside. Or don\'t, we both know you won\'t.'
    : 'Do not touch anything. Go outside. Or don\'t, we both know you won\'t. Any key, click or mouse move = you\'re back.';
  const live = Object.keys(S.armedItems || {}).map(itemById).filter(Boolean);
  if (live.length) toast('Active this round', live.map((i) => `${i.icon} ${i.name}`).join(', '));
  S.afkAt = performance.now();
  S.armed = false;
  later(1200, () => { S.armed = true; });
  document.body.classList.add('afk');
  $('#afkPanel').hidden = false;
  $('#composerText').textContent = `${ME.name} is typing... (he is not)`;
  renderChannelList();
  renderMembers();
  render();
}

const vcFriend = () => {
  const v = S.friends.filter((f) => !f.away && inVcNow(f));
  return v.length ? pick(v) : friend();
};
const basePps = (over) => 6 * S.mult * (1 + S.mins / 25) * (1 + 0.2 * (S.round - 1)) * (over ? 2 : 1);

function afkStep(dt) {
  const P = S.path || PATHS[0];
  const M = getMods();
  S.resT += dt * (1 + S.mins / 20); // the resident's clock keeps running even while yours is frozen
  if (S.inAfkCh) {
    // parked in the afk channel: time and suspicion are frozen, points creep up to the cap
    const room = S.cap - S.pending;
    if (room > 0) S.pending += Math.min(room, basePps(S.mins >= S.promise) * P.pointMult * M.pointMult * dt);
    if (S.resident && Math.random() < 0.05 * dt) residentSay();
    return;
  }
  // in-game clock accelerates the longer you're gone
  const dm = dt * (1 + S.mins / 20);
  S.mins += dm;
  S.clock += dm;
  if (S.run) rgAfkTick(dt);
  const h = Math.min(S.mins / 60, 4);
  const pm = P.pointMult + (P.pointGrow || 0) * h;
  const sm = P.susMult + (P.susGrow || 0) * h;

  const late = S.mins >= S.promise;
  const over = S.mins >= S.promise + M.graceMins; // grace minutes (items) delay when friends start counting
  const base = 0.35 + 0.08 * S.round;
  let rate;
  if (!over) {
    rate = base * 0.6;
  } else {
    S.overReal += dt;
    rate = base * 1.6 * (1 + S.overReal / 12) * (1 + 0.15 * Math.log2(Math.max(1, S.mins / S.promise)));
  }
  // a quiet brb channel is a bit slower to get noticed, a busy one a bit faster (general = baseline)
  S.sus += rate * sm * M.susMult * (1 + 0.25 * (brbVis() - CT.visMid)) * dt;
  deliverMuted();

  S.pending += basePps(late) * pm * M.pointMult * dt;
  if (M.pointFlatPerMin) S.pending += M.pointFlatPerMin * dm * (1 + 0.2 * (S.round - 1)); // flat income that scales with the round
  packChatter(dm);
  if (S.mins >= 500) unlockAch('30k');

  if (!over) {
    if (Math.random() < 0.05 * dt) { const cid = weightedCh(); const f = friendIn(cid); post(f, speak(f, 'chill'), { ch: cid }); }
  } else {
    if (Math.random() < (0.12 + S.sus / 300) * (1 + 0.5 * (brbVis() - CT.visMid)) * S.rd.pingEnv * dt) {
      const tier = S.sus < 35 ? 'low' : S.sus < 70 ? 'mid' : 'high';
      // friends spread out: the brb channel is the likeliest, but any channel can get the ping
      const cid = weightedCh();
      const f = friendIn(cid);
      let line = meTok(tier === 'low' ? speak(f, 'low') : digOrSay(f, tier), f);
      if (!mentionRe().test(line) && Math.random() < 0.45) line = '@' + ME.name + ' ' + line;
      post(f, line, { ch: cid, weight: tier === 'low' ? 0.8 : tier === 'mid' ? 1.1 : 1.4 });
    }
    // an ignored ping gets a follow-up somewhere else ("did you see my message in #x??")
    if (S.follows < CT.follows && TEXT.length > 1 && Math.random() < 0.2 * dt) {
      const p0 = S.pings.find((p) => !p.answered && !p.followed && !p.isFollow && S.mins - p.minsAtSend > 6);
      if (p0) {
        p0.followed = true;
        S.follows++;
        const cid = weightedCh(p0.ch);
        const f = friendIn(cid, p0.from);
        post(f, pick(FOLLOWUPS).replace('{ch}', labelOf(textById(p0.ch))), { ch: cid, weight: 0.9, follow: true });
      }
    }
    if (!S.voted && S.sus > S.rd.voteAt && Math.random() < 0.04 * dt) {
      S.voted = true;
      S.sus += 6;
      sys(`🗳️ ${friend().name} started a vote to kick ${ME.name} (2/5)`, 'bad');
      sfx.bad();
    }
    if (Math.random() < 0.012 * dt) {
      const f = friend();
      if (!f.away) {
        f.away = true;
        post(f, 'lowkey ima get food too brb');
        S.sus = Math.max(0, S.sus - 6);
        renderMembers();
        later(rand(5000, 9000), () => {
          f.away = false;
          if (!S.kicked) post(f, 'back');
          renderMembers();
        });
      }
    }
  }
  if (S.sus >= kickAt() && tryKick(PK.id === 'classic' ? 'the boys ran out of patience' : 'the org ran out of patience')) return;
  if (S.phase !== 'afk') return; // an alt account took the kick: the round is already over
  if (S.mode === 'afk-timeout' && S.mins >= S.threshold) { moveToAfk(); return; }
  if (S.mode === 'no-timeout') {
    let k = 0;
    while (S.dragMin < Math.floor(S.mins) && k++ < 30) {
      S.dragMin++;
      if (S.dragMin >= 2 && Math.random() < dragChance()) { dragOut(); return; }
    }
    if (S.dragMin < Math.floor(S.mins)) S.dragMin = Math.floor(S.mins);
  }
  pathEvents(P, dt, h, M);
}

// chance per game minute that a friend drags you to the AFK channel (no-timeout only).
// grows with friends in VC, suspicion and time; ~1.5%/min at 5 friends, 30% sus, 2h in.
function dragChance() {
  const n = S.friends.filter((f) => !f.away && inVcNow(f)).length;
  if (!n) return 0;
  return Math.min(0.25, 0.0016 * Math.pow(n, 0.9) * (1 + S.sus / 50) * (1 + S.mins / 360) * getMods().dragChanceMult);
}

function moveToAfk() {
  S.inAfkCh = true;
  S.autoMoved = true;
  S.movedAt = S.mins;
  S.cap = S.pending * 1.5;
  vcPark('auto'); // classic: you stay visibly in the AFK channel until you rejoin voice (js/voice.js)
  if (vcOn()) {
    // the bot flags you: suspicion jumps (never past kick-1, never kills by itself) and carries into the next round
    const before = S.sus;
    S.sus = Math.max(S.sus, Math.min(S.sus + Math.min(VC_TUNE.bump, 0.5 * (kickAt() - 1 - S.sus)), kickAt() - 1)); // half the headroom at most: no pinning at kick-1
    S.botBump = Math.round(S.sus - before);
  }
  sys('You have been moved to the AFK channel' + (S.botBump ? ` · 🤖 bot flagged you +${S.botBump}% suspicion` : ''), 'bad');
  post(friend(), pLine('moved', 'rip'));
  sfx.bad();
  renderMembers();
  roommate();
}

function dragOut() {
  const f = vcFriend();
  S.phase = 'judging';
  S.dragged = true;
  S.inAfkCh = true;
  vcPark('drag');
  const susBefore = S.sus;
  roommate();
  endAfkUI();
  sys(`${f.name} moved you to the AFK channel`, 'bad');
  sfx.bad();
  post(f, pLine('drag', 'gotcha'));
  sys(`${ME.name} was dragged out after ${fmtMins(S.mins)} (promised ${fmtMins(S.promise)})`);
  returnChatter();
  // dragged, not negligent: no triage, half the left-on-read penalty
  settleMuted();
  const dragged = S.pings.filter((p) => !p.forgiven);
  if (dragged.length) applyLor(lorPenalty(dragged, 0.5), 0, S.active);
  S.record = false;
  bank(FORCED, susBefore, 1);
  if (S.record) later(700, () => post(friend(), lineOr('hype', 'new record!!')));
  later(1800, nextRound);
}

function pathEvents(P, dt, h, M) {
  if (Array.isArray(P.modes) && !P.modes.includes(S.mode)) return;
  const mic = P.events.filter((id) => PEVENTS[id]);
  if (mic.length && Math.random() < 0.03 * M.micEventChance * (1 + h / 2) * dt) micEvent(pick(mic));
  if (P.events.includes('alone-drift')) aloneStep(dt);
}

function micEvent(id) {
  const ev = PEVENTS[id];
  const lo = Array.isArray(ev.sus) ? ev.sus[0] : 2;
  const hi = Array.isArray(ev.sus) ? ev.sus[1] : 5;
  S.sus = Math.min(kickAt(), S.sus + rand(lo, hi));
  sys(`🎙️ mic: ${ev.label || id}`);
  post(vcFriend(), mixLine('micEvent', Array.isArray(ev.lines) && ev.lines.length ? () => pick(ev.lines) : null) || '...');
  if (S.path && S.path.id === 'hot-mic' && S.mins >= 30 && (id === 'flush' || id === 'chewing')) {
    S.elevator = true;
    unlockAch('elevator-of-doom');
  }
  if (ev.funny && Math.random() < 0.5) {
    const b = Math.round((ev.bonus || 20) * (1 + 0.2 * (S.round - 1)) * getMods().clipBonusMult);
    S.pending += b;
    const rd = S.round;
    later(600, () => {
      if (S.phase !== 'afk' || S.round !== rd) return;
      post(vcFriend(), pLine('clipped', 'chat clipped it'));
      toast('🎬 chat clipped it', `+${b} bonus pending pts`);
    });
  }
}

function aloneStep(dt) {
  if (S.mins > 1) {
    S.friends.forEach((f) => {
      if (inVcNow(f) && !f.away && Math.random() < 0.03 * dt) {
        f.vc = false;
        f.backAt = S.mins + rand(25, 120);
        post(f, pLine('aloneLeave', 'bye'));
        sys(`${f.name} left ${curVc().name}`);
        renderMembers();
      } else if (f.vc === false && S.mins >= f.backAt) {
        f.vc = true;
        post(f, pLine('aloneJoin', 'back'));
        sys(`${f.name} joined ${curVc().name}`);
        renderMembers();
      }
    });
  }
  const inVc = S.friends.filter(inVcNow).length;
  if (inVc === 0 && S.aloneSince == null) {
    S.aloneSince = S.mins;
    sys(`Discord: you're the only one left in ${curVc().name}`);
    renderMembers();
  } else if (inVc > 0 && S.aloneSince != null) {
    S.aloneSince = null;
    renderMembers();
  }
}

// shared teardown when an AFK run ends (manual return or forced drag)
function endAfkUI() {
  if (typeof cqClear === 'function') cqClear();
  document.body.classList.remove('afk');
  $('#afkPanel').hidden = true;
  $('#composerText').textContent = composerIdle();
  document.title = 'AFK Simulator';
  S.unread = 0;
  chanDirty = true;
  S.aloneSince = null;
  S.friends.forEach((f) => { f.vc = true; });
  renderMembers();
}

function comeBack() {
  if (S.phase !== 'afk') return;
  if (!S.armed || performance.now() - S.afkAt < 1200) return; // grace for the click that sent you AFK
  if (S.run && S.rd.boss && S.mins < S.run.objective) { rgBossEarly(); return; }
  S.phase = 'excuse';
  const wasMoved = S.autoMoved;
  S.inAfkCh = false;
  endAfkUI();
  settleMuted();
  let owed = owedPings();
  // ping shield: the hottest owed pings are forgiven for free (a charge per ping); all shielded = no triage
  const shield = Math.min(S.charges.pingShield || 0, owed.length);
  if (shield > 0) {
    owed.slice().sort((a, b) => pingRaw(b) - pingRaw(a)).slice(0, shield).forEach((pp) => { pp.forgiven = true; });
    S.charges.pingShield -= shield;
    owed = owedPings();
  }
  if (owed.length) S.phase = 'triage';
  // back at the scene of the crime
  if (S.brbCh && S.brbCh !== S.active) switchChannel(S.brbCh, { force: true });
  else { const st = S.ch[S.active]; st.unread = 0; st.mentions = 0; renderChannelList(); }
  sys(`${ME.name} returned after ${fmtMins(S.mins)} (promised ${fmtMins(S.promise)})`);
  if (shield > 0) {
    sys(`🛡 ping shield absorbed ${shield} ping${shield > 1 ? 's' : ''}`, 'good');
    toast('🛡 Ping shield', `${shield} ping${shield > 1 ? 's' : ''} forgiven${owed.length ? '' : ': no triage'}`);
  }
  if (!owed.length) returnChatter(); // with pings owed it runs after triage, when we know what was left on read
  if (wasMoved) {
    sys(`⏱ you were moved to AFK at ${fmtMins(S.movedAt)}`, 'good');
    toast('Moved to AFK', `you were moved to AFK at ${fmtMins(S.movedAt)}`);
  }
  if (owed.length) startTriage(); else offerExcuse();
}

function chooseExcuse(e) {
  S.phase = 'judging';
  const exCh = S.active;
  S.brbCh = exCh; // the rest of the round (reaction, bank line) lands where you answered
  post(ME, e.t, { ch: exCh });
  if (!e.quiet) stampSlow(exCh);
  const susBefore = S.sus;
  const key = e.k || e.t;
  const uses = S.uses[key] || 0;
  S.uses[key] = uses + 1;
  const bonus = getMods().excuseBonus;
  const rollOnce = () => {
    let r = rand(e.r[0], e.r[1]) * Math.pow(0.55, uses);
    if (!e.quiet) r += bonus;
    const bu = !e.quiet && uses > 0 && Math.random() < 0.45;
    if (bu) r = -rand(10, 25);
    return { roll: r, busted: bu };
  };
  let res;
  if (!e.quiet && S.rd.fakeNet) {
    // Fake "Internet Died": guaranteed -35 suspicion, cannot be busted, ignores reuse decay
    S.rd.fakeNet = false;
    res = { roll: Math.max(rand(e.r[0], e.r[1]) + bonus, 35), busted: false };
    sys('📶 the router lights look convincing', 'good');
  } else {
    res = rollOnce();
    if (!e.quiet && (res.busted || res.roll < 8) && useCharge('excuseReroll')) {
      const again = rollOnce();
      if (again.roll > res.roll) res = again;
      sys('🔁 excuse reroll: you try a second angle', 'good');
    }
  }
  const roll = res.roll > 0 && S.rd.excuseMult !== 1 ? res.roll * S.rd.excuseMult : res.roll;
  S.lastRoll = roll;
  S.lastQuiet = !!e.quiet;
  const busted = res.busted;
  S.sus = clamp(S.sus - roll, 0, kickAt());
  let lethal = S.sus >= kickAt();
  if (lethal && trySecondWind()) lethal = false;
  const early = S.mins < S.promise;

  S.record = false;
  later(800, () => {
    const f = friend();
    let line;
    if (early) line = speak(f, 'early');
    else if (busted) line = speak(f, 'reused');
    else if (roll >= 22) line = speak(f, 'good');
    else if (roll >= 8) line = speak(f, 'meh');
    else line = speak(f, 'bad');
    post(f, line, { ch: exCh });
    if (!(lethal && S.run)) bank(e, susBefore, lethal ? 0.5 : 1); // rogue: a lethal excuse forfeits the round's points
    if (S.record && !lethal) later(700, () => post(friend(), lineOr('hype', 'new record!!'), { ch: exCh }));
    if (lethal) {
      later(900, () => { if (!tryKick('your excuse made it worse')) later(700, nextRound); });
    } else {
      later(1600, nextRound);
    }
  });
}

function bank(e, susBefore, factor = 1) {
  const mins = S.mins;
  const parts = [];
  if (S.lor && S.lor.count) parts.push(`left on read x${S.lor.count} ${S.lor.d >= 0 ? '+' : '-'}${Math.abs(S.lor.d)}% sus`);
  S.lor = null;
  let base = S.pending * factor;
  if (factor < 1) parts.push('kicked mid-excuse ×0.5');
  parts.push(`AFK points ${fmtN(base)}`);
  if (mins < S.promise && !e.forced) { base *= 0.25; parts.push('came back early ×0.25'); }
  if (e.quiet) { base *= 1.25; parts.push('no-excuse confidence ×1.25'); }

  const M = getMods();
  const startBonus = M.comboStartBonus || 0;
  const restart = Math.min(8, 1 + startBonus);
  if (mins > S.lastMins * 1.5 && mins >= S.promise) S.combo = Math.min(Math.max(S.combo + 1, restart), 8);
  else if (S.combo > restart && useCharge('comboKeep')) parts.push('streak shield kept your combo');
  else { S.combo = restart; parts.push(startBonus ? `combo restarts at x${restart}` : 'combo reset'); }
  let total = base * S.combo;
  if (S.combo > 1) parts.push(`combo ×${S.combo}`);
  if (S.autoMoved) {
    const b = 30 + 10 * S.round;
    total += b;
    parts.push(`safe but boring +${b}`);
  }

  if (S.parkMark && vcOn() && !S.autoMoved && !S.dragged && mins >= S.promise && !e.forced) {
    const b = VC_TUNE.redeem * S.round;
    total += b;
    parts.push(`back on track after the park +${b}`);
  }
  S.parkMark = null; // the mark lasts one round

  if (mins > Math.max(S.promise, 5)) {
    const lie = Math.round(Math.round(40 * Math.log2(mins / Math.max(S.promise, 5))) * S.round * M.lieBonusMult);
    total += lie;
    parts.push(`lie bonus +${fmtN(lie)}`);
  }
  const recKey = S.run ? 'rlongest' : S.gn ? 'gnlongest' : 'longest'; // rogue and game night keep their own record so classic stats are untouched
  const record = store.get(recKey, 0);
  if (mins > record * 1.1) {
    total += 250;
    store.set(recKey, mins);
    parts.push('NEW AFK RECORD +250');
    S.record = true;
  }
  S.flavor = '';
  if (e.forced) {
    if (susBefore > 70) {
      const b = 30 * S.round;
      total += b;
      S.flavor = 'caught';
      parts.push(`caught red-handed +${b}`);
    } else {
      const b = 60 * S.round * (mins > record ? 2 : 1);
      total += b;
      S.flavor = 'clutch';
      parts.push(`clutch${mins > record ? ' (record pace)' : ''} +${b}`);
    }
  }
  total = Math.round(total);
  S.score += total;
  S.banked += total;
  if (S.run) S.run.roundPts += total; // rogue: gold + rogue tokens are settled at the end of the round / run
  else if (!S.gn) {
    S.tokPts += total * M.tokenMult;
    const newTok = Math.floor(S.tokPts / 100) - S.tokAwarded;
    if (newTok > 0) { S.tokAwarded += newTok; addTokens(newTok); parts.push(`+${newTok} 🪙`); }
  }
  S.lastMins = mins;
  if (mins > S.longest) { S.longestPath = S.path ? S.path.name : ''; S.longestMode = S.mode || ''; }
  S.longest = Math.max(S.longest, mins);
  S.pending = 0;
  sfx.cash();
  toast(`+${fmtN(total)} pts`, parts.join('\n'));
  sys(`💰 +${fmtN(total)} pts banked${S.combo > 1 ? ` (x${S.combo} combo)` : ''}${S.flavor ? ` · ${S.flavor.toUpperCase()}` : ''}`, 'good');
  S.lastBank = { total, parts: parts.slice() };
  if (!S.gn) try {
    checkAch({ mins, promise: S.promise, susBefore, susAfter: S.sus, combo: S.combo, path: S.path ? S.path.id : '', autoMoved: S.autoMoved, dragged: S.dragged, roommates: Number(store.get('roommates', 0)) || 0, cons: S.cons, elevator: S.elevator, fightMissed: S.fightMissed, idrisJabs: S.idrisJabs });
  } catch { /* bad stored data */ }
  render();
  return S.lastBank;
}

function nextRound() {
  if (S.gn) { GN.afkDone(); return; }
  if (S.run) { rgSettle(); return; }
  if (S.parked && !S.kicked) { offerRejoin(); return; } // you do not auto-return from the AFK channel (js/voice.js)
  S.round++;
  S.sus = clamp(S.sus - (S.mins >= S.promise ? 8 : 3) + getMods({ noEnv: true }).susFlatPerRound, 0, kickAt() - 1);
  S.armedItems = {}; // one-round consumables and round abilities end with the round
  S.rd = newRd();
  if (S.parkMark) S.rd.susMult *= VC_TUNE.markSus; // parked last round: friends watch closer
  S.clock += 2;
  S.inAfkCh = false;
  newRound();
  renderMembers();
  S.pings = [];
  S.lor = null;
  const af = friend();
  post(af, speak(af, 'ask'), { ch: S.active });
  later(900, offerBrb);
}

// would-be kick: second wind cancels it (sus drops to secondWindSus); B's run loop may also absorb it (onKickLethal).
// Returns true only when the run really ended.
let onKickLethal = () => false;
function trySecondWind() {
  if (!(S.charges.secondWind > 0)) return false;
  S.charges.secondWind--;
  S.sus = getMods({ noEnv: true }).secondWindSus;
  sys(`💨 second wind: ${ME.name} slips back in at ${Math.round(S.sus)}% suspicion`, 'good');
  toast('💨 Second wind', `kick cancelled · suspicion ${Math.round(S.sus)}%`);
  sfx.cash();
  return true;
}
function tryKick(reason) {
  if (S.kicked) return true;
  if (trySecondWind()) return false;
  if (S.gn) return GN.ghostKick(reason); // game night: kicked from voice is a call-out, not the end
  if (onKickLethal(reason)) return false;
  kicked(reason);
  return true;
}

function kicked(reason) {
  if (S.kicked) return;
  S.kicked = true;
  if (typeof cqClear === 'function') cqClear();
  S.phase = 'over';
  S.tri = null;
  S.parked = false;
  S.rejoin = null;
  chanDirty = true;
  S.sus = kickAt();
  S.pending = 0;
  S.aloneSince = null;
  S.friends.forEach((f) => { f.vc = true; });
  clearActions();
  document.body.classList.remove('afk');
  $('#afkPanel').hidden = true;
  $('#composerText').textContent = 'You do not have permission to send messages in this channel.';
  document.title = 'KICKED · AFK Simulator';
  const k = friend();
  sys(`👢 ${k.name} kicked ${ME.name} from the server.`, 'bad');
  sfx.bad();
  renderMembers();
  render();
  const isBest = S.run ? false : saveScore();
  later(900, () => { const kf = friend(); post(kf, kickDig(kf) || speak(kf, 'kickAfter')); });
  later(2200, () => { if (S.run) rgEnd(false, reason); else showGameOver(reason, isBest); });
}

window.AFK.modules.push('afk');
