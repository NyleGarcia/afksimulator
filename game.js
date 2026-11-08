'use strict';
(() => {
  // ---------- utils ----------
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const fmtN = (n) => Math.round(n).toLocaleString('en-US');
  const fmtMins = (m) => {
    m = Math.floor(m);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  };
  const fmtClock = (c) => {
    const day = Math.floor(c / 1440);
    const mins = Math.floor(c % 1440);
    let h = Math.floor(mins / 60);
    const mm = String(mins % 60).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const d = day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : `Day ${day + 1}`;
    return `${d} at ${h}:${mm} ${ap}`;
  };

  const mem = new Map();
  const store = {
    get(k, d) {
      if (mem.has(k)) return mem.get(k);
      try {
        const v = localStorage.getItem('afksim.' + k);
        return v == null ? d : JSON.parse(v);
      } catch { return d; }
    },
    set(k, v) {
      mem.set(k, v);
      try { localStorage.setItem('afksim.' + k, JSON.stringify(v)); } catch { /* storage blocked */ }
    },
  };

  // ---------- content ----------
  const ME = { name: 'comanderson', color: '#f5c542' };
  const FRIENDS = [
    { name: 'Brody', color: '#e67e22' },
    { name: 'kev', color: '#4aa3df' },
    { name: 'MoistTurtle', color: '#2ecc71' },
    { name: 'dani', color: '#e84393' },
    { name: 'xXSniperXx', color: '#a77bd6' },
  ];

  // p = promised minutes, m = points multiplier
  const BRB = [
    { t: 'brb', p: 5, m: 1.0 },
    { t: 'brb 2 min', p: 2, m: 1.35 },
    { t: 'one sec', p: 1, m: 1.5 },
    { t: 'brb 5', p: 5, m: 1.1 },
    { t: 'brb bathroom', p: 4, m: 1.15 },
    { t: 'brb grabbing a drink', p: 3, m: 1.2 },
    { t: 'brb mom is calling me', p: 10, m: 1.0 },
    { t: 'gotta eat dinner brb', p: 30, m: 0.9 },
    { t: 'brb gotta take the dog out', p: 15, m: 0.95 },
    { t: '2 sec', p: 1, m: 1.6 },
    { t: 'brb pizza is here', p: 5, m: 1.1 },
    { t: 'hold on', p: 2, m: 1.4 },
    { t: 'brb gonna restart my pc', p: 3, m: 1.25 },
  ];

  // r = suspicion removed [min, max]
  const QUIET = { t: 'back', r: [2, 8], quiet: true };
  const EXCUSES = [
    { t: 'sorry my internet died', r: [15, 35] },
    { t: 'my mom needed help with groceries', r: [15, 30] },
    { t: 'fell asleep lol', r: [5, 40] },
    { t: 'dog ate my headset', r: [0, 45] },
    { t: 'sorry had to take a call', r: [15, 30] },
    { t: 'bro windows decided to update', r: [20, 40] },
    { t: 'power went out', r: [20, 35] },
    { t: 'i was here the whole time??', r: [-15, 50] },
    { t: 'pizza guy got lost', r: [10, 30] },
    { t: 'my cat unplugged my pc', r: [10, 40] },
    { t: 'had to fight a raccoon', r: [-10, 45] },
    { t: 'my little brother took my pc', r: [15, 35] },
    { t: 'i was in the shower (4 hours)', r: [5, 35] },
    { t: 'my discord crashed (it did not)', r: [0, 40] },
    { t: 'bro i was literally touching grass', r: [10, 30] },
  ];

  const LINES = {
    ask: ['yo @comanderson u ready?', 'we queueing in 1', '@comanderson hop in vc', 'ok last game for real', 'everyone ready?', '@comanderson you on point this round', 'aight lets go'],
    ok: ['k', 'ok hurry', 'np', 'fast pls', 'kk', 'ok', 'sure'],
    chill: ['ok', 'lol', 'np take ur time', 'anyone wanna 1v1 while we wait', "i'm getting snacks then", 'ye'],
    low: ['@comanderson?', 'he said {p}', "it's been {t}", "where'd he go", 'comanderson??', 'yo is he back'],
    mid: ['@comanderson bro', "it's been {t}. he said {p}", "he's gone again isn't he", '@comanderson you alive?', 'classic comanderson', 'should we just start without him', 'lmaooo every time'],
    high: ['@comanderson', '@comanderson @comanderson @comanderson', 'BRO', "he's asleep 100%", 'imma kick him fr', '{t}. {t}!!!', 'last warning @comanderson', 'he is NOT coming back'],
    good: ['ah ok', 'fair enough', 'lmao ok', 'np', 'wb', 'welcome back king'],
    meh: ['sure...', 'uh huh', 'ok buddy', 'every time bro', 'mhm'],
    bad: ['CAP', 'nobody believes you', 'u were asleep', 'bro.', 'this is the 4th time today'],
    reused: ['you said that last time', 'same excuse as before lmao', 'bro has 1 excuse'],
    early: ['wait you actually came back??', 'who are you', 'huh. ok'],
    kickAfter: ['finally', 'anyway', 'who wants to play', 'rip bozo'],
  };

  const ACH = {
    micro: { name: 'Microwave Break', desc: 'AFK 10 min', test: (r) => r.mins >= 10 },
    milk: { name: 'Went To Get Milk', desc: 'AFK 1 hour', test: (r) => r.mins >= 60 },
    grass: { name: 'Touched Grass', desc: 'AFK 3 hours', test: (r) => r.mins >= 180 },
    classic: { name: 'The Comanderson Classic', desc: 'AFK 4 hours', test: (r) => r.mins >= 240 },
    liar: { name: 'Liar Liar', desc: 'AFK 10x longer than promised', test: (r) => r.mins >= r.promise * 10 },
    early: { name: 'Actually Came Back', desc: 'Return before promised time (lame)', test: (r) => r.mins < r.promise },
    teflon: { name: 'Teflon', desc: 'Excuse from 85%+ suspicion to under 50%', test: (r) => r.susBefore >= 85 && r.susAfter < 50 },
    combo5: { name: 'Escalation', desc: 'Reach x5 combo', test: (r) => r.combo >= 5 },
  };

  // ---------- state ----------
  const S = {};
  let gen = 0; // bumps on reset, cancels stale timeouts
  const later = (ms, fn) => {
    const g = gen;
    setTimeout(() => { if (g === gen) fn(); }, ms);
  };

  function reset() {
    gen++;
    Object.assign(S, {
      phase: 'intro',
      score: 0,
      pending: 0,
      round: 1,
      sus: 0,
      combo: 0,
      lastMins: 0,
      longest: 0,
      mins: 0,
      overReal: 0,
      promise: 5,
      mult: 1,
      clock: 20 * 60 + Math.floor(rand(0, 50)),
      unread: 0,
      voted: false,
      afkAt: 0,
      moved: 0,
      uses: {},
      kicked: false,
      friends: FRIENDS.map((f) => ({ ...f, away: false })),
    });
    $('#messages').textContent = '';
    clearActions();
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    document.title = 'AFK Simulator';
    $('#composerText').textContent = 'Message #general';
    renderMembers();
  }

  // ---------- sound ----------
  let catchingUp = false;
  let actx = null;
  let muted = store.get('muted', false);
  function initAudio() {
    if (actx) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; }
  }
  function beep(freq, dur, type = 'sine', vol = 0.12) {
    if (muted || !actx || catchingUp || document.hidden) return;
    const t = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const sfx = {
    ping() { beep(988, 0.09); setTimeout(() => beep(1318, 0.14), 90); },
    msg() { beep(660, 0.05, 'sine', 0.04); },
    cash() { beep(784, 0.08, 'triangle'); setTimeout(() => beep(1046, 0.08, 'triangle'), 80); setTimeout(() => beep(1568, 0.16, 'triangle'), 160); },
    bad() { beep(220, 0.25, 'sawtooth', 0.08); setTimeout(() => beep(150, 0.4, 'sawtooth', 0.08), 200); },
  };

  // ---------- rendering ----------
  function avatar(who, cls = '') {
    const a = document.createElement('div');
    a.className = 'avatar ' + cls;
    a.style.background = who.color;
    a.textContent = who.name[0].toUpperCase();
    return a;
  }

  function post(who, text, opts = {}) {
    const box = $('#messages');
    const el = document.createElement('div');
    if (opts.system) {
      el.className = 'msg system ' + (opts.tone || '');
      el.textContent = text;
    } else {
      el.className = 'msg';
      if (who !== ME && text.includes('@comanderson')) el.classList.add('mention');
      el.appendChild(avatar(who));
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
      time.textContent = fmtClock(S.clock);
      head.append(name, time);
      const t = document.createElement('div');
      t.className = 'msg-text';
      // highlight @mentions safely
      text.split(/(@comanderson)/).forEach((part) => {
        if (part === '@comanderson') {
          const s = document.createElement('span');
          s.className = 'at';
          s.textContent = part;
          t.appendChild(s);
        } else if (part) {
          t.appendChild(document.createTextNode(part));
        }
      });
      body.append(head, t);
      el.appendChild(body);
    }
    box.appendChild(el);
    while (box.children.length > 200) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;

    if (who !== ME && !opts.system) {
      if (text.includes('@comanderson')) {
        sfx.ping();
        if (S.phase === 'afk') S.unread++;
      } else {
        sfx.msg();
      }
    }
  }

  function sys(text, tone) { post(null, text, { system: true, tone }); }

  function clearActions() { $('#actions').textContent = ''; }

  function setActions(title, options) {
    const box = $('#actions');
    box.textContent = '';
    const h = document.createElement('div');
    h.className = 'actions-title';
    h.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'choices';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.dataset.key = String(i + 1);
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = `[${i + 1}]`;
      b.append(k, document.createTextNode(o.label));
      if (o.sub) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = o.sub;
        b.appendChild(sub);
      }
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        initAudio();
        clearActions();
        o.fn();
      });
      grid.appendChild(b);
    });
    box.append(h, grid);
    $('#messages').scrollTop = $('#messages').scrollHeight;
    if (S.phase !== 'afk' && grid.firstChild) grid.firstChild.focus({ preventScroll: true });
  }

  function renderMembers() {
    const list = $('#memberList');
    const vc = $('#vcMembers');
    list.textContent = '';
    vc.textContent = '';
    const meState = S.kicked ? 'offline' : S.phase === 'afk' ? 'idle' : 'online';
    const all = [{ ...ME, state: meState, sub: meState === 'idle' ? 'AFK 🌙' : meState === 'offline' ? 'kicked' : 'Playing AFK Simulator' }]
      .concat(S.friends.map((f) => ({ ...f, state: f.away ? 'idle' : 'online', sub: f.away ? 'brb' : 'in squad vc' })));
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
      row.append(av, info);
      list.appendChild(row);

      if (m.state !== 'offline') {
        const v = document.createElement('div');
        v.className = 'vc-member';
        v.append(avatar(m), document.createTextNode(m.name + (m.state === 'idle' ? ' 🌙' : '')));
        vc.appendChild(v);
      }
    });
    $('#memberHead').textContent = `ONLINE — ${online}`;
    const dot = $('#meAvatar .dot');
    dot.className = 'dot ' + meState;
    $('#meStatus').textContent = meState === 'idle' ? 'AFK 🌙' : meState === 'offline' ? 'Kicked' : 'Online';
  }

  function render() {
    $('#hudScore').textContent = fmtN(S.score);
    $('#hudRound').textContent = S.round;
    $('#hudCombo').textContent = 'x' + S.combo;
    $('#hudBest').textContent = fmtN(Math.max(bestScore(), S.score));
    const sus = clamp(S.sus, 0, 100);
    const fill = $('#susFill');
    fill.style.width = sus + '%';
    fill.className = 'sus-fill' + (sus >= 70 ? ' high' : sus >= 35 ? ' mid' : '');
    $('#susPct').textContent = Math.floor(sus) + '%';
    $('.sus-bar').setAttribute('aria-valuenow', String(Math.floor(sus)));

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
      document.title = S.unread ? `(${S.unread}) AFK Simulator` : 'AFK Simulator';
    }
  }

  function toast(title, body, cls = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + cls;
    const b = document.createElement('b');
    b.textContent = title;
    const s = document.createElement('span');
    s.textContent = body;
    t.append(b, s);
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  // ---------- flow ----------
  const friend = () => pick(S.friends.filter((f) => !f.away).length ? S.friends.filter((f) => !f.away) : S.friends);
  const fill = (s) => s.replaceAll('{p}', fmtMins(S.promise)).replaceAll('{t}', fmtMins(S.mins));

  function start() {
    initAudio();
    reset();
    closeModal();
    const a = friend();
    later(300, () => post(a, 'yo'));
    later(1100, () => post(friend(), 'whos on tonight'));
    later(1900, () => post(a, '@comanderson u on?'));
    later(2700, () => post(ME, 'ye im on'));
    later(3400, () => post(friend(), 'ok we queueing in 2'));
    later(4000, offerBrb);
  }

  function offerBrb() {
    S.phase = 'chat';
    const opts = shuffle(BRB).slice(0, 3);
    setActions('SAY BRB (then actually leave)', opts.map((o) => ({
      label: o.t,
      sub: `promise ${fmtMins(o.p)} · x${o.m} pts (short promise = bigger multiplier)`,
      fn: () => chooseBrb(o),
    })));
  }

  function chooseBrb(o) {
    S.phase = 'leaving';
    post(ME, o.t);
    S.promise = o.p;
    S.mult = o.m;
    later(700, () => {
      post(friend(), pick(LINES.ok));
      goAfk();
    });
  }

  function goAfk() {
    S.phase = 'afk';
    S.mins = 0;
    S.overReal = 0;
    S.pending = 0;
    S.voted = false;
    S.unread = 0;
    S.moved = 0;
    $('.afk-hint').textContent = matchMedia('(pointer:coarse)').matches
      ? 'Touch nothing. Any tap = you\'re back. Go outside. Or don\'t, we both know you won\'t.'
      : 'Do not touch anything. Go outside. Or don\'t, we both know you won\'t. Any key, click or mouse move = you\'re back.';
    S.afkAt = performance.now();
    S.armed = false;
    later(1200, () => { S.armed = true; });
    document.body.classList.add('afk');
    $('#afkPanel').hidden = false;
    $('#composerText').textContent = 'comanderson is typing... (he is not)';
    renderMembers();
    render();
  }

  function afkStep(dt) {
    // in-game clock accelerates the longer you're gone
    const dm = dt * (1 + S.mins / 20);
    S.mins += dm;
    S.clock += dm;

    const over = S.mins >= S.promise;
    const base = 0.35 + 0.08 * S.round;
    let rate;
    if (!over) {
      rate = base * 0.6;
    } else {
      S.overReal += dt;
      rate = base * 1.6 * (1 + S.overReal / 12) * (1 + 0.15 * Math.log2(S.mins / S.promise));
    }
    S.sus += rate * dt;

    let pps = 6 * S.mult * (1 + S.mins / 25) * (1 + 0.2 * (S.round - 1));
    if (over) pps *= 2;
    S.pending += pps * dt;

    if (!over) {
      if (Math.random() < 0.05 * dt) post(friend(), pick(LINES.chill));
    } else {
      if (Math.random() < (0.12 + S.sus / 300) * dt) {
        const tier = S.sus < 35 ? 'low' : S.sus < 70 ? 'mid' : 'high';
        post(friend(), fill(pick(LINES[tier])));
      }
      if (!S.voted && S.sus > 65 && Math.random() < 0.04 * dt) {
        S.voted = true;
        S.sus += 6;
        sys(`🗳️ ${friend().name} started a vote to kick comanderson (2/5)`, 'bad');
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
    if (S.sus >= 100) kicked('the boys ran out of patience');
  }

  function comeBack() {
    if (S.phase !== 'afk') return;
    if (!S.armed || performance.now() - S.afkAt < 1200) return; // grace for the click that sent you AFK
    S.phase = 'excuse';
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    $('#composerText').textContent = 'Message #general';
    document.title = 'AFK Simulator';
    S.unread = 0;
    renderMembers();
    sys(`comanderson returned after ${fmtMins(S.mins)} (promised ${fmtMins(S.promise)})`);
    const opts = [QUIET].concat(shuffle(EXCUSES).slice(0, 3));
    setActions('YOU\'RE BACK. EXPLAIN YOURSELF.', opts.map((e) => {
      const used = S.uses[e.t] || 0;
      return {
        label: e.t,
        sub: e.quiet ? 'say nothing. pure sigma energy. x1.25 pts' : used ? `used ${used}x. they have screenshots.` : 'untested excuse (mom has not heard this one yet)',
        fn: () => chooseExcuse(e),
      };
    }));
  }

  function chooseExcuse(e) {
    S.phase = 'judging';
    post(ME, e.t);
    const susBefore = S.sus;
    const uses = S.uses[e.t] || 0;
    S.uses[e.t] = uses + 1;
    let roll = rand(e.r[0], e.r[1]) * Math.pow(0.55, uses);
    const busted = !e.quiet && uses > 0 && Math.random() < 0.45;
    if (busted) roll = -rand(10, 25);
    S.sus = clamp(S.sus - roll, 0, 100);
    const early = S.mins < S.promise;

    later(800, () => {
      const f = friend();
      let line;
      if (early) line = pick(LINES.early);
      else if (busted) line = pick(LINES.reused);
      else if (roll >= 22) line = pick(LINES.good);
      else if (roll >= 8) line = pick(LINES.meh);
      else line = pick(LINES.bad);
      post(f, line);
      bank(e, susBefore, S.sus >= 100 ? 0.5 : 1);
      if (S.sus >= 100) {
        later(900, () => kicked('your excuse made it worse'));
      } else {
        later(1600, nextRound);
      }
    });
  }

  function bank(e, susBefore, factor = 1) {
    const mins = S.mins;
    const parts = [];
    let base = S.pending * factor;
    if (factor < 1) parts.push('kicked mid-excuse ×0.5');
    parts.push(`AFK points ${fmtN(base)}`);
    if (mins < S.promise) { base *= 0.25; parts.push('came back early ×0.25'); }
    if (e.quiet) { base *= 1.25; parts.push('no-excuse confidence ×1.25'); }

    if (mins > S.lastMins * 1.5 && mins >= S.promise) S.combo = Math.min(S.combo + 1, 8);
    else { S.combo = 1; parts.push('combo reset'); }
    let total = base * S.combo;
    if (S.combo > 1) parts.push(`combo ×${S.combo}`);

    if (mins > Math.max(S.promise, 5)) {
      const lie = Math.round(40 * Math.log2(mins / Math.max(S.promise, 5))) * S.round;
      total += lie;
      parts.push(`lie bonus +${fmtN(lie)}`);
    }
    const record = store.get('longest', 0);
    if (mins > record * 1.1) {
      total += 250;
      store.set('longest', mins);
      parts.push('NEW AFK RECORD +250');
    }
    total = Math.round(total);
    S.score += total;
    S.lastMins = mins;
    S.longest = Math.max(S.longest, mins);
    S.pending = 0;
    sfx.cash();
    toast(`+${fmtN(total)} pts`, parts.join('\n'));
    sys(`💰 +${fmtN(total)} pts banked${S.combo > 1 ? ` (x${S.combo} combo)` : ''}`, 'good');
    try { checkAch({ mins, promise: S.promise, susBefore, susAfter: S.sus, combo: S.combo }); } catch { /* bad stored data */ }
    render();
  }

  function nextRound() {
    S.round++;
    S.sus = Math.max(0, S.sus - (S.mins >= S.promise ? 8 : 3));
    S.clock += 2;
    post(friend(), pick(LINES.ask));
    later(900, offerBrb);
  }

  function kicked(reason) {
    if (S.kicked) return;
    S.kicked = true;
    S.phase = 'over';
    S.sus = 100;
    S.pending = 0;
    clearActions();
    document.body.classList.remove('afk');
    $('#afkPanel').hidden = true;
    $('#composerText').textContent = 'You do not have permission to send messages in this channel.';
    document.title = 'KICKED · AFK Simulator';
    const k = friend();
    sys(`👢 ${k.name} kicked comanderson from the server.`, 'bad');
    sfx.bad();
    renderMembers();
    render();
    const isBest = saveScore();
    later(900, () => post(friend(), pick(LINES.kickAfter)));
    later(2200, () => showGameOver(reason, isBest));
  }

  // ---------- persistence ----------
  function bestScore() {
    const s = store.get('scores', []);
    return Array.isArray(s) && s.length && typeof s[0]?.s === 'number' ? s[0].s : 0;
  }
  function saveScore() {
    const prevBest = bestScore();
    let scores = store.get('scores', []);
    if (!Array.isArray(scores)) scores = [];
    scores.push({ s: S.score, r: S.round, l: Math.floor(S.longest), d: new Date().toISOString().slice(0, 10) });
    scores.sort((a, b) => b.s - a.s);
    store.set('scores', scores.slice(0, 5));
    return S.score > prevBest && S.score > 0;
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
  function scoresTable() {
    const scores = store.get('scores', []);
    const wrap = document.createDocumentFragment();
    wrap.appendChild(el('h3', '', 'HIGH SCORES'));
    if (!Array.isArray(scores) || !scores.length) {
      wrap.appendChild(el('p', 'tag', 'No scores yet. Go be irresponsible.'));
      return wrap;
    }
    const t = el('table', 'scores');
    scores.forEach((s, i) => {
      const tr = el('tr');
      tr.append(el('td', '', `#${i + 1}`), el('td', 'n', fmtN(s.s)), el('td', '', `round ${s.r}`), el('td', '', `longest ${fmtMins(s.l)}`), el('td', '', s.d));
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
  function openModal(nodes) {
    const card = $('#modalCard');
    card.textContent = '';
    nodes.forEach((n) => card.appendChild(n));
    $('#modal').hidden = false;
    $('#app').inert = true;
    const btn = card.querySelector('.btn');
    if (btn) btn.focus();
  }
  function closeModal() { $('#modal').hidden = true; $('#app').inert = false; }

  function showStart() {
    const ul = el('ul');
    [
      'Pick a brb. Actually leave, touch nothing. Come back to bank points; too long and you get kicked and lose it all.',
      'Each AFK much longer than the last grows your combo. Reused excuses get called out.',
      'Press 1/2/3 to pick options.',
    ].forEach((t) => ul.appendChild(el('li', '', t)));
    const btn = el('button', 'btn', 'Log in as comanderson');
    btn.addEventListener('click', start);
    openModal([el('h1', '', '💤 AFK Simulator', 'modalTitle'), el('p', 'tag', 'You are comanderson. Say brb. Don\'t come back.'), ul, scoresTable(), achList(), btn]);
  }

  function showGameOver(reason, isBest) {
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
    openModal([
      el('h1', 'bad', '👢 KICKED FROM SERVER', 'modalTitle'),
      el('p', 'tag', isBest ? `🏆 NEW HIGH SCORE! (${reason})` : `Reason: ${reason}. They are already playing without you.`),
      stats, scoresTable(), achList(), btn,
    ]);
  }

  // ---------- input ----------
  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (S.phase === 'afk') { comeBack(); return; }
    if (!$('#modal').hidden) return;
    const b = document.querySelector(`.choice[data-key="${e.key}"]`);
    if (b) b.click();
  });
  document.addEventListener('pointerdown', () => comeBack());
  document.addEventListener('mousemove', (e) => {
    if (S.phase !== 'afk') return;
    if (!S.armed || performance.now() - S.afkAt < 1200) return;
    S.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (S.moved > 80) comeBack();
  });

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

  reset();
  render();
  showStart();
})();
