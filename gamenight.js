'use strict';
/* Game Night mode: "{Day} Never Happens" (mode id gamenight). See CONTENT.md "Game Night mode".
 * Loaded before game.js. game.js calls window.AFK_GN.create(api) once; the engine drives the weekly loop through that narrow adapter.
 * Everything here is inert until the player starts a Game Night run. All player-facing text goes through textContent. */
(function () {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SLOTS = ['cause', 'escalation', 'proof', 'witness', 'promise'];
  const SLOT_LABEL = { cause: 'WHAT HAPPENED', escalation: 'THE COMPLICATION', proof: 'EVIDENCE', witness: 'WITNESS', promise: 'FOLLOW-UP PROMISE' };
  const BEATS = ['morning', 'afternoon', 'hour', 'zero'];
  const BEAT_NAME = ['MORNING', 'AFTERNOON', 'ONE HOUR TO GO', 'IT IS TIME'];
  const ENDING_LABEL = { kicked: 'kicked from the group chat', disbanded: 'group chat archived', survived: 'survived the season', 'never-happens': 'it never happened', retired: 'went to bed early' };
  const SKIPPISH = ['skipped', 'everyone-flaked', 'just-talked', 'different-game', 'update-hell'];

  // all balance constants in one place
  const TUNE = {
    startMorale: 70, cancelBank: 3, base: 20, elabK: 0.15, streakK: 0.25, streakCap: 3, cbK: 0.5, cbCap: 2.5, weekK: 0.05, weekCap: 2,
    preemptMult: 0.6, lateMult: 1.5, lateElab: 3, ghostMult: 0.2, flakeBonus: 40, attendPts: 10, draggedPts: 5, repeatMult: 0.5, noTimerMult: 0.7,
    skipSus: 6, ghostCarry: 0.6, decay: 0.85, invBase: 0.08, invOver: 0.3, tWeek: 3, tBase: 10, moraleLow: -5, moraleHigh: 3, moralePerfect: 4, proofSecs: 8, beatMs: 700, quizSecs: 5, zeroSecs: 10,
  };

  // ---------- built-in fallback content (used when a content section is missing or under its minimum) ----------
  const L = (a) => a.map((t) => (typeof t === 'string' ? { t } : t));
  const BP = (id, slot, label, text, elab, o) => Object.assign({ id, slot, label, text, elab, tags: [], contradicts: [], requires: [], fits: [], weight: 1 }, slot === 'cause' || slot === 'proof' ? { short: label.toLowerCase() } : {}, slot === 'proof' ? { proofLabel: label.slice(0, 32) } : {}, o || {});
  const BO = (id, kind, title, text, o) => Object.assign({ id, kind, title, weight: 1, text: [text], chat: [], effects: { morale: 0, skep: 0, strike: 0, ptsMult: 1 }, when: {} }, o || {});
  const BUILTIN = {
    parts: [
      BP('c-asleep', 'cause', 'I fell asleep', 'i fell asleep and woke up an hour ago', 1, { tags: ['fell-asleep'], ttl: 0 }),
      BP('c-car', 'cause', 'My car died', 'my car died, waiting on a tow', 2, { tags: ['car-broken'], ttl: 2 }),
      BP('c-power', 'cause', 'The power went out', 'power is out on my whole street', 2, { tags: ['power-out'], ttl: 1 }),
      BP('c-sick', 'cause', 'I am sick', 'i am really not feeling well', 2, { tags: ['sick'], ttl: 1 }),
      BP('e-tow', 'escalation', 'and the tow is late', 'and the tow truck is running late', 2),
      BP('e-phone', 'escalation', 'and my phone is dying', 'and my phone is at 3 percent', 1),
      BP('p-photo', 'proof', 'a blurry photo', 'sending a blurry photo as proof', 2, { proofLabel: 'blurry photo' }),
      BP('p-receipt', 'proof', 'a receipt', 'i have the receipt right here', 3, { proofLabel: 'the receipt' }),
      BP('w-neighbour', 'witness', 'my neighbour saw', 'my neighbour saw the whole thing', 2),
      BP('w-mom', 'witness', 'my mom knows', 'ask my mom, she was there', 1),
      BP('f-next', 'promise', 'next week for sure', 'next week for sure, i promise', 1),
      BP('f-host', 'promise', 'I will host', 'i will host next time', 3),
    ],
    fullStories: [],
    reactions: {
      byBand: {
        calm: { impressed: L(['ok that is a real excuse']), neutral: L(['np, next week']), exasperated: L(['again?']), detective: L(['hm, ok']) },
        eyebrow: { impressed: L(['wow, ok']), neutral: L(['sure']), exasperated: L(['every week']), detective: L(['that sounds off']) },
        sus: { impressed: L(['...fine, that is good']), neutral: L(['mhm']), exasperated: L(['seriously']), detective: L(['i do not believe you']) },
        detective: { impressed: L(['you are scary good']), neutral: L(['whatever']), exasperated: L(['unreal']), detective: L(['prove it']) },
      },
      repeat: L(['you said that before']), contradiction: L(['that does not match what you told us']), callbackReward: L(['consistent at least']),
      proofDemand: L(['prove it']), proofPass: L(['ok fine']), proofPerfect: L(['that was clean']), proofFail: L(['nope']), strike: L(['that is a strike']),
      strikeFinal: L(['you are out']), detectiveRise: L(['i am keeping a ledger']), detectiveStandDown: L(['ok, case closed']), detectiveQuiz: L([{ t: 'what was the cause again?', ask: 'cause' }]),
      believed: L(['ok cool']), proofDecoys: [{ label: 'gym membership card', tags: ['injured'] }, { label: 'beach photo', tags: ['abroad'] }, { label: 'concert ticket', tags: ['sick'] }, { label: 'a random screenshot', tags: [] }], friendLines: {},
    },
    plan: {
      gameNames: ['the game', 'that co-op thing', 'the new one'],
      argue: { day: L(['can we do a different day']), time: L(['{time} is too early']), game: L(['nobody has {game} installed']) },
      gamePicker: { options: [{ id: 'g-a', name: 'Co-op Thing', vetoLines: ['not that again'] }, { id: 'g-b', name: 'Racing Game', vetoLines: ['no racing'] }, { id: 'g-c', name: 'Party Game', vetoLines: ['nope'] }], chaos: L(['the poll is tied']), outcomes: L(['fine, {game} it is']) },
      beats: { morning: L(['still on for {time}?', '{game} tonight yes?']), afternoon: L([{ t: 'who is in', roll: true }, 'headcount for {game}']), hour: L(['{time} guys', 'ready?']), zero: L(['we are waiting', '{me}???']), zeroAfter: L(['we are starting without you']) },
      counterOffers: [{ id: 'co-20', t: 'just come for 20 minutes', kind: 'time', pressure: 1, accept: 'ok fine. 20 minutes. {game}.', declineNeeds: 'escalation', when: {} }],
      disbandThreat: L(['we should just stop doing {day}s']), cancelOpeners: [{ id: 'pre-a', t: 'cannot make it tonight, sorry', elab: 3 }, { id: 'pre-b', t: 'heads up, skipping tonight', elab: 3 }],
      updateLines: L(['{game} needs a huge update']), differentGame: L(['can we play something else']),
    },
    outcomes: [
      BO('o-skip', 'skipped', 'Cancelled', '{day} night came and went without you.', { chat: ['ok. next {day}'] }),
      BO('o-call', 'called-out', 'Called out', 'nobody believed you.', { effects: { morale: -8, skep: 15, strike: 1, ptsMult: 0.3 } }),
      BO('o-drag', 'dragged-in', 'Dragged in', 'you played. for hours.', { effects: { morale: 5, skep: -10, strike: 0, ptsMult: 0.2 } }),
      BO('o-pwy', 'played-without-you', 'They played without you', 'they started without you.', { effects: { morale: -10, skep: 5, strike: 0, ptsMult: 0.1 } }),
      BO('o-flaked', 'everyone-flaked', 'Nobody showed up', 'nobody played.', { effects: { morale: 6, skep: -5, strike: 0, ptsMult: 2 } }),
      BO('o-other', 'different-game', 'Different game', 'they played something else.', { effects: { morale: 0, skep: 0, strike: 0, ptsMult: 0.8 } }),
      BO('o-talk', 'just-talked', 'Just talked', 'three hours of talking.', { effects: { morale: 4, skep: 0, strike: 0, ptsMult: 0.9 } }),
      BO('o-update', 'update-hell', 'Update hell', 'the update never finished.', { effects: { morale: 3, skep: 0, strike: 0, ptsMult: 0.5 } }),
      BO('e-kicked', 'ending', 'Removed from the group chat', '{me} was removed from the group.', { ending: 'kicked' }),
      BO('e-disbanded', 'ending', 'Group chat archived', 'the group chat is archived.', { ending: 'disbanded' }),
      BO('e-survived', 'ending', 'You survived', 'you survived {week} weeks of {day}s.', { ending: 'survived' }),
      BO('e-never', 'ending', '{day} never happens', 'no one has played since the group was created.', { ending: 'never-happens' }),
      BO('e-retired', 'ending', 'Went to bed early', '{me} went to bed early.', { ending: 'retired' }),
    ],
    flakes: { traits: { _default: { flakiness: 0.25, persistence: 0.4, gullibility: 0.5, drama: 0.3 } }, friendExcuses: [{ id: 'fx-tired', t: 'i am too tired tonight', elab: 1, beat: 'any', caught: 'you said that last week', weight: 1 }], events: [], solidarity: L(['oh thank god, i was going to cancel too']), playerCatchesFriend: L(['...ok fair']), snowball: L(['wait is {friend} not coming either']) },
    achievements: [
      { id: 'gn-first-skip', name: 'Never Again', desc: 'Skip your first {day}', hint: 'Cancel once.', when: { scope: 'run', skipsMin: 1 } },
      { id: 'gn-12-weeks', name: 'Twelve Cancelled Weeks', desc: 'Survive 12 weeks', hint: 'Last the season.', when: { scope: 'run', weekMin: 12, kind: 'ending:survived' } },
    ],
    awards: [{ id: 'most-elaborate', name: 'Most Elaborate', desc: 'Your most elaborate excuse so far', when: { scope: 'week', believed: true, eMin: 14 } }],
    titles: [{ id: 't-casual', name: 'Casual Canceller', minPts: 0 }, { id: 't-pro', name: 'Professional Flake', minPts: 800 }],
  };
  const DEBT_LINES = ['{me} you PROMISED. we have it in writing', 'you owe us a game night, {me}. you said so', 'remember what you promised last time?'];

  // ---------- settings ----------
  const GAME_RE = /^[\p{L}\p{N} .,'!?:&+\-]{1,24}$/u;
  const DEF = { day: 3, time: '20:00', game: 'Mystery Game', length: 12, strikes: 3, useCrew: true, difficulty: 'normal', proofTimer: true, fastWeeks: false };
  function cleanGame(v) {
    const s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f{}]/g, '').replace(/\s+/g, ' ').trim();
    return GAME_RE.test(s) ? s : '';
  }
  function cleanSettings(raw) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const o = Object.assign({}, DEF);
    if (Number.isInteger(r.day) && r.day >= 0 && r.day <= 6) o.day = r.day;
    if (typeof r.time === 'string' && /^([01]\d|2[0-3]):(00|30)$/.test(r.time)) o.time = r.time;
    if (typeof r.game === 'string') { const g = cleanGame(r.game); o.game = g || (r.game.trim() === '' ? '' : DEF.game); }
    if (r.length === 8 || r.length === 12 || r.length === 'endless') o.length = r.length;
    if (r.strikes === 2 || r.strikes === 3 || r.strikes === 5) o.strikes = r.strikes;
    if (typeof r.useCrew === 'boolean') o.useCrew = r.useCrew;
    if (['chill', 'normal', 'brutal'].includes(r.difficulty)) o.difficulty = r.difficulty;
    if (typeof r.proofTimer === 'boolean') o.proofTimer = r.proofTimer;
    if (typeof r.fastWeeks === 'boolean') o.fastWeeks = r.fastWeeks;
    return o;
  }
  const fmtTime = (hhmm) => {
    const m = /^(\d\d):(\d\d)$/.exec(hhmm) || ['', '20', '00'];
    let h = +m[1];
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m[2]}${ap}`;
  };

  // ---------- pure rules (exported for tests) ----------
  const bandOf = (k) => (k < 25 ? 'calm' : k < 50 ? 'eyebrow' : k < 75 ? 'sus' : 'detective');
  const DIFF = { chill: { T: 3, loss: 0.7, pts: 1, secs: 3 }, normal: { T: 0, loss: 1, pts: 1, secs: 0 }, brutal: { T: -2, loss: 1.3, pts: 1.25, secs: 0 } };
  function threshold(o) {
    return TUNE.tBase + DIFF[o.difficulty || 'normal'].T + Math.floor(((o.morale == null ? 70 : o.morale) - 50) / 10) - 2 * (o.detectives || 0) - 2 * (o.repeats3 || 0) - ((o.morale == null ? 70 : o.morale) <= 20 ? 2 : 0) - (TUNE.tWeek && o.week ? Math.floor((o.week - 1) / TUNE.tWeek) : 0);
  }
  function investigateP(o) {
    const T = threshold(o);
    let p = o.E <= T ? TUNE.invBase + o.K / 400 : Math.min(0.95, TUNE.invOver + 0.07 * (o.E - T) + o.K / 300);
    p *= Math.max(0.4, Math.min(1, 1 - 0.12 * (o.flaked || 0)));
    p *= o.approachMult == null ? 1 : o.approachMult;
    return Math.max(0, Math.min(0.97, p));
  }
  function scorePts(o) {
    const elab = 1 + TUNE.elabK * (o.E - 1);
    const cons = Math.min(TUNE.streakCap, 1 + TUNE.streakK * (o.streak || 0));
    const cb = Math.min(TUNE.cbCap, 1 + TUNE.cbK * (o.callbacks || 0));
    const wk = Math.min(TUNE.weekCap, 1 + TUNE.weekK * (o.week - 1));
    return Math.round(TUNE.base * elab * cons * cb * (o.approachMult == null ? 1 : o.approachMult) * wk * (o.proofMult == null ? 1 : o.proofMult) * (o.diffMult == null ? 1 : o.diffMult));
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // does a content `when` block hold for context c? (a missing key means "do not care")
  function matchWhen(w, c) {
    if (!w) return true;
    const num = { weekMin: ['week', 1], weekMax: ['week', -1], kMin: ['k', 1], kMax: ['k', -1], eMin: ['e', 1], eMax: ['e', -1], flakersMin: ['flakers', 1], flakersMax: ['flakers', -1], moraleMax: ['morale', -1], strikesMin: ['strikes', 1], skipsMin: ['skips', 1], streakMin: ['streak', 1], callbacksMin: ['callbacks', 1], callbacksInRowMin: ['cbRow', 1], proofPerfectMin: ['proofPerfect', 1], contradictionsPassedMin: ['cpassed', 1], standDownsMin: ['standDowns', 1], attendsMin: ['attends', 1], ledgerMin: ['ledger', 1], debtMin: ['debt', 1], allFlakeWeeksMin: ['allFlakeWeeks', 1], makeUpMin: ['makeUps', 1], actionsInWeekMin: ['actions', 1] };
    for (const key of Object.keys(w)) {
      const v = w[key];
      if (key === 'scope') continue;
      if (num[key]) {
        const cv = c[num[key][0]];
        if (cv == null) return false;
        if (num[key][1] > 0 ? cv < v : cv > v) return false;
      } else if (key === 'tags') {
        if (!Array.isArray(v) || !v.every((t) => (c.tags || []).includes(t))) return false;
      } else if (key === 'approach' || key === 'kind' || key === 'proof') {
        if (c[key] !== v) return false;
      } else if (key === 'believed' || key === 'usedFriendAsWitness') {
        if (!!c[key] !== !!v) return false;
      }
    }
    return true;
  }

  function create(api) {
    const { S, ME, el, later, post, sys, toast, clamp, fmtN, store } = api;
    const $ = api.$;
    let C = null;
    let G = null;
    let rng = Math.random;
    let seedNext = 0;
    let timer = null;
    let bd = null;
    let forceKind = null;
    let forceFlakers = null;
    let forceEvent = null;
    const recent = [];
    const ch = (p) => rng() < p;
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const rpick = (arr) => (arr.length ? arr[Math.floor(rng() * arr.length)] : null);
    function wpick(arr, wf) {
      if (!arr.length) return null;
      const ws = arr.map((x) => Math.max(0.0001, wf ? wf(x) : 1));
      let r = rng() * ws.reduce((a, b) => a + b, 0);
      for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r < 0) return arr[i]; }
      return arr[arr.length - 1];
    }
    function wsample(arr, n, wf) {
      const pool = arr.slice();
      const out = [];
      while (out.length < n && pool.length) { const x = wpick(pool, wf); out.push(x); pool.splice(pool.indexOf(x), 1); }
      return out;
    }

    // ---------- content ----------
    function loadContent() {
      const raw = typeof api.content === 'function' ? api.content() : null;
      const miss = raw ? raw.missing || [] : ['all'];
      const ok = (s) => raw && !miss.includes('all') && !miss.includes(s);
      const B = BUILTIN;
      C = {
        parts: ok('parts') ? raw.parts : B.parts,
        stories: ok('parts') ? raw.fullStories || [] : [],
        reactions: ok('reactions') ? raw.reactions : B.reactions,
        plan: ok('plan') ? raw.plan : B.plan,
        outcomes: ok('outcomes') ? raw.outcomes : B.outcomes,
        flakes: raw && !miss.includes('all') ? raw.flakes : B.flakes,
        achievements: raw && !miss.includes('all') && raw.achievements.length ? raw.achievements : B.achievements,
        awards: raw && !miss.includes('all') && raw.awards.length ? raw.awards : B.awards,
        titles: raw && !miss.includes('all') && raw.titles.length ? raw.titles : B.titles,
      };
      // sections the base might still lack: top up from the built-ins so the loop never starves
      const pl = C.plan;
      const bp = B.plan;
      if (!pl.cancelOpeners || !pl.cancelOpeners.length) pl.cancelOpeners = bp.cancelOpeners;
      if (!pl.gameNames || !pl.gameNames.length) pl.gameNames = bp.gameNames;
      if (!pl.counterOffers) pl.counterOffers = [];
      if (!C.flakes.friendExcuses || !C.flakes.friendExcuses.length) C.flakes = Object.assign({}, C.flakes, { friendExcuses: B.flakes.friendExcuses });
      C.missing = miss;
      return C;
    }
    const partById = (id) => C.parts.find((p) => p.id === id) || C.stories.find((p) => p.id === id) || null;
    const avail = () => { try { loadContent(); return true; } catch { return false; } };

    // ---------- settings storage ----------
    const readSettings = () => cleanSettings(store.get('gn', null));
    const saveSettings = (s) => { store.set('gn', s); return s; };
    const dayName = (s) => DAYS[(s || readSettings()).day];
    const titleOf = (s) => `${dayName(s)} Never Happens`;

    // ---------- tokens and lines ----------
    const TOK = /\{([A-Za-z_]\w*)(?::([^{}]*))?\}/g;
    const safe = (v) => String(v == null ? '' : v).replace(/[{}\u0000-\u001f]/g, '');
    const gname = () => (G && G.wk && G.wk.game) || (G ? G.gameName : 'the game');
    function others(speaker) { return S.friends.filter((f) => f !== speaker && f.id !== (speaker && speaker.id)); }
    // single-pass fill. Returns null when the line needs a value we do not have ({cause} {prop} empty, no other friend), so callers skip it.
    function fill(raw, c) {
      c = c || {};
      let skip = false;
      let fname = null;
      const st = G ? G.settings : readSettings();
      const out = String(raw).replace(TOK, (m, name, fb) => {
        switch (name) {
          case 'me': return ME.name;
          case 'day': return dayName(st);
          case 'time': return fmtTime(st.time);
          case 'game': return safe(c.game || gname());
          case 'week': return String(c.week != null ? c.week : G ? G.week : 1);
          case 'cause': if (!c.cause) { skip = true; return ''; } return safe(c.cause);
          case 'prop': if (!c.prop) { skip = true; return ''; } return safe(c.prop);
          case 'friend': {
            if (fname == null) { const o = c.other ? [c.other] : others(c.speaker); fname = o.length ? rpick(o).name : ''; }
            if (fname) return safe(fname);
            if (fb != null && fb.trim()) return safe(fb.trim());
            skip = true;
            return '';
          }
          default: return '';
        }
      });
      if (skip) return null;
      return out.replace(/\bthe\s+the\b/gi, 'the').replace(/[ \t]{2,}/g, ' ').trim() || null;
    }
    // pick a line from a pool of {t, ...} entries, avoiding the last 60 lines used
    function pickLine(pool, filt, key) {
      let list = (pool || []).filter((e) => e && (!filt || filt(e)));
      if (!list.length) return null;
      const fresh = list.filter((e) => !recent.includes(e.t));
      if (fresh.length) list = fresh;
      const e = wpick(list, (x) => x.w || 1);
      recent.push(e.t);
      if (recent.length > 60) recent.shift();
      return e;
    }
    const wk0 = () => (G && G.wk) || {};
    const lineCtx = (extra) => Object.assign({ cause: wk0().causeShort || '', prop: wk0().propShort || '' }, extra || {});
    const whenOk = (e, c) => !e.when || matchWhen(e.when, { week: G.week, flakers: nFlaked(), tags: Array.from(Object.keys(activeTags())), morale: G.morale, k: S.sus, strikes: G.strikes }) && (!e.needsTag || (c && c.tagNeeded === e.needsTag) || !(c && c.tagNeeded));
    function lineFrom(pool, speaker, extra, filt) {
      const c = lineCtx(Object.assign({ speaker }, extra));
      for (let tries = 0; tries < 6; tries++) {
        const e = pickLine(pool, (x) => whenOk(x, extra) && (!filt || filt(x)), 'x');
        if (!e) return null;
        const t = fill(e.t, c);
        if (t) return t;
      }
      return null;
    }
    // friend says a line from a pool (silently nothing when the pool has no usable line)
    function say(f, pool, extra, filt) {
      const t = lineFrom(pool, f, extra, filt);
      if (t) post(f, t);
      return !!t;
    }
    // plays steps spaced apart: each step is a function; done runs after the last
    function seq(steps, done, gap) {
      const ms = gap != null ? gap : G && G.settings.fastWeeks && G.week > 4 ? 300 : TUNE.beatMs;
      let i = 0;
      const next = () => {
        if (!G || G.over) return;
        if (i >= steps.length) { if (done) done(); return; }
        const fn = steps[i++];
        fn();
        later(ms, next);
      };
      later(steps.length ? 250 : 0, next);
    }

    // ---------- state helpers ----------
    const live = (gf) => S.friends.find((f) => f.id === gf.id) || S.friends[0];
    const nFlaked = () => (G ? G.friends.filter((f) => f.flaked).length : 0);
    const pubFlaked = () => (G ? G.friends.filter((f) => f.flaked && f.pub).length : 0);
    const detectives = () => G.friends.filter((f) => f.detective);
    const present = () => G.friends.filter((f) => !f.flaked);
    function activeTags() {
      const m = {};
      if (!G) return m;
      G.ledger.forEach((cl) => {
        if (cl.status === 'moot') return;
        Object.keys(cl.ttls).forEach((t) => { if (G.week - cl.week <= cl.ttls[t] && cl.week < G.week) m[t] = cl; });
      });
      return m;
    }
    const moraleAdd = (d) => { G.morale = clamp(Math.round(G.morale + d), 0, 100); };
    const lose = (d) => (d < 0 ? d * DIFF[G.settings.difficulty].loss : d);
    function traitFor(f) {
      const T = C.flakes.traits || {};
      const def = Object.assign({ flakiness: 0.25, persistence: 0.4, gullibility: 0.5, drama: 0.3 }, T._default || {});
      const arch = f.trait && T['_' + f.trait] ? T['_' + f.trait] : f.rival && T._rival ? T._rival : {};
      return Object.assign({}, def, arch, T[f.id] || {});
    }
    const lvlOf = (gf) => (gf.exasperation >= 6 ? 3 : gf.exasperation >= 3 ? 2 : 1);

    // ---------- HUD ----------
    function hud() {
      const box = $('#gnHud');
      if (!box) return;
      if (!G || G.over) { box.hidden = true; document.body.classList.toggle('gamenight', !!G); return; }
      box.hidden = false;
      box.textContent = '';
      document.body.classList.add('gamenight');
      const st = G.settings;
      const top = el('div', 'gn-top');
      top.append(el('b', 'gn-title', titleOf(st)), el('span', 'gn-meta', ` · week ${G.week || 1}${st.length === 'endless' ? '' : '/' + st.length} · ${fmtTime(st.time)} · ${G.gameName}`));
      const lb = el('button', 'gn-ledger-btn', '📒 Ledger');
      lb.type = 'button';
      lb.addEventListener('click', (e) => { e.stopPropagation(); ledgerView(); });
      top.appendChild(lb);
      const row = el('div', 'gn-stats');
      const mo = el('div', 'gn-meter');
      mo.title = 'Group morale. At zero the group chat is archived.';
      const mf = el('div', 'gn-meter-fill' + (G.morale <= 35 ? ' low' : ''));
      mf.style.width = G.morale + '%';
      mo.appendChild(mf);
      const ml = el('span', 'gn-stat', `morale ${G.morale}`);
      const pips = el('span', 'gn-pips');
      pips.title = `Strikes: ${G.strikes}/${st.strikes}`;
      pips.setAttribute('aria-label', `Strikes ${G.strikes} of ${st.strikes}`);
      for (let i = 0; i < st.strikes; i++) pips.appendChild(el('span', 'gn-pip' + (i < G.strikes ? ' on' : ''), i < G.strikes ? '●' : '○'));
      row.append(ml, mo, pips);
      if (G.debt) row.appendChild(el('span', 'gn-chip debt', `debt ${G.debt}`));
      row.appendChild(el('span', 'gn-chip', `cancels ${G.cancelBank}`));
      box.append(top, row);
      if (G.rollShown) {
        const rc = el('div', 'gn-roll');
        G.friends.forEach((gf) => {
          const f = live(gf);
          rc.appendChild(el('span', 'gn-chip ' + (gf.flaked ? 'out' : 'in'), `${gf.detective ? '🕵 ' : ''}${gf.flaked ? '✗' : '✓'} ${f.name}`));
        });
        box.appendChild(rc);
      }
      const tg = Object.keys(activeTags());
      if (tg.length) {
        const tc = el('div', 'gn-tags');
        tg.slice(0, 8).forEach((t) => tc.appendChild(el('span', 'gn-tag', t)));
        box.appendChild(tc);
      }
    }

    // ---------- panels ----------
    function panel(title, opts, extra, o) {
      S.phase = 'gn';
      api.setActions(title, opts, extra, o || {});
      hud();
    }
    const clearTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
    function startTimer(secs, onTick, onEnd) {
      clearTimer();
      const g = api.gen();
      const t0 = performance.now();
      const total = secs * 1000;
      timer = setInterval(() => {
        if (api.gen() !== g || !G) { clearTimer(); return; }
        const left = Math.max(0, total - (performance.now() - t0));
        const tt = $('#triTime');
        if (tt) tt.textContent = Math.ceil(left / 1000) + 's';
        const f = $('#actions .tri-fill');
        if (f) f.style.width = (100 * left / total) + '%';
        if (onTick) onTick(left);
        if (left <= 0) { clearTimer(); onEnd(); }
      }, 100);
      return { left: total, total };
    }

    // ---------- run lifecycle ----------
    function newRun(settings) {
      loadContent();
      const st = settings || readSettings();
      const seed = seedNext || ((Math.random() * 4294967296) >>> 0);
      seedNext = 0;
      rng = mulberry32(seed);
      const names = C.plan.gameNames || [];
      const game = st.game || rpick(names) || 'the game';
      G = {
        week: 0, phase: 'idle', morale: TUNE.startMorale, strikes: 0, debt: 0, cancelBank: TUNE.cancelBank, updateAlibi: 0, streak: 0, bestStreak: 0, allFlakeStreak: 0, allFlakeWeeks: 0,
        ledger: [], friends: [], score: 0, bestExcuse: { E: 0, text: '', week: 0 }, awards: [], settings: st, seed, gameName: game, skips: 0, callbacks: 0, cbRow: 0, proofPerfect: 0, cpassed: 0,
        standDowns: 0, attends: 0, makeUps: 0, lastMakeUp: -9, lastRelief: 0, cleanRun: 0, hist: [], over: false, busy: false, newAch: [], wk: null, ending: null, repeatWeeks: [], skippedRow: 0,
      };
      return G;
    }
    function setupFriends() {
      G.friends = S.friends.slice(0, 5).map((f) => Object.assign({ id: f.id, flaked: false, pub: false, beat: 0, excuse: null, exasperation: 0, detective: false, tr: traitFor(f) }, {}));
    }
    function start(settings) {
      newRun(settings);
      S.gn = G;
      setupFriends();
      S.phase = 'gn';
      S.sus = 0;
      S.score = 0;
      S.round = 1;
      document.body.classList.add('gamenight');
      api.closeModal();
      api.chrome(true);
      hud();
      sys(`${titleOf(G.settings)} · ${G.settings.length === 'endless' ? 'endless' : G.settings.length + ' weeks'} · ${G.settings.strikes} strikes · ${G.gameName}`, 'good');
      later(700, beginWeek);
      return G;
    }

    function beginWeek() {
      if (!G || G.over) return;
      G.week++;
      const n = G.week;
      if (n > 1) S.sus = Math.round(S.sus * TUNE.decay);
      if (n > 1 && (n - 1) % 3 === 0) G.cancelBank = Math.min(3, G.cancelBank + 1);
      S.round = n;
      G.rollShown = false;
      const mood = (() => { const r = rng(); return r < (n >= 6 ? 0.12 : 0.1) ? 'dead' : r < 0.3 ? 'lazy' : 'normal'; })();
      const wk = G.wk = { n, approach: null, late: false, parts: [], partIds: [], E: 0, actions: 0, status: 'believed', proof: null, strike: 0, hard: false, dragged: false, cbUsed: 0, cpassed: false, friendWitness: false, counterDone: false, waited: false, event: null, mood, repeat: false, conflict: false, called: false, causeShort: '', propShort: '', causeLabel: '', game: G.gameName, ghostKind: null, voluntary: false, pressure: 0, debtCall: false, uhFlag: false, pre: false };
      G.friends.forEach((gf) => {
        gf.flaked = false; gf.pub = false; gf.excuse = null; gf.beat = 0;
        let p = gf.tr.flakiness * (mood === 'lazy' ? 2 : 1) * (1 + 0.03 * (n - 1)) * (G.morale < 35 ? 1.15 : 1);
        if (mood === 'dead') p = 0.9;
        gf.flaked = ch(clamp(p, 0.02, 0.92));
      });
      if (forceFlakers != null) { G.friends.forEach((gf, i) => { gf.flaked = i < forceFlakers; }); forceFlakers = null; }
      G.friends.forEach((gf) => {
        if (!gf.flaked) return;
        gf.beat = wpick([0, 1, 2, 3], (i) => [0.25, 0.3, 0.3, 0.15][i]);
        const want = Math.min(5, 1 + Math.floor(n / 4));
        const pool = (C.flakes.friendExcuses || []).filter((x) => x.beat === 'any' || x.beat === BEATS[gf.beat]);
        gf.excuse = wpick(pool, (x) => (x.weight || 1) * Math.exp(-Math.abs(x.elab - want) * 0.5)) || null;
      });
      const uh = n >= 6 ? 0.18 : 0.1;
      const showing = G.friends.filter((f) => !f.flaked).length;
      if (forceEvent) { wk.event = forceEvent; forceEvent = null; }
      else if (ch(uh)) wk.event = 'update-hell';
      else if (ch(0.08)) wk.event = 'different-game';
      else if (showing >= 3 && ch(0.08)) wk.event = 'just-talked';
      wk.attendOK = G.strikes >= 1 || G.morale < 35 || (n > 6 && ch(0.1));
      wk.debtCall = G.debt >= 2;
      hud();
      api.announce(`Week ${n}`);
      sys(`— week ${n}: ${dayName(G.settings)} ${fmtTime(G.settings.time)} —`);
      const pre = [];
      if (wk.debtCall) pre.push(() => { const f = rpick(S.friends); const t = fill(rpick(DEBT_LINES), { speaker: f }); if (t) post(f, t); });
      if (G.morale <= 20) pre.push(() => say(rpick(S.friends), C.plan.disbandThreat));
      seq(pre, planPhase, 400);
    }

    // ---------- PLAN ----------
    function planPhase() {
      if (!G || G.over) return;
      G.phase = 'plan';
      const n = G.week;
      if (G.settings.fastWeeks && n > 4) { planPanel(); return; }
      const steps = [];
      const cats = ['day', 'time', 'game'];
      const k = ri(2, 3);
      wsample(cats, k).forEach((c) => steps.push(() => { const f = rpick(S.friends); say(f, C.plan.argue[c]); }));
      const poll = (n === 1 || n % 4 === 0) && (C.plan.gamePicker.options || []).length >= 3;
      if (poll) steps.push(() => say(rpick(S.friends), C.plan.gamePicker.chaos));
      seq(steps, planPanel);
    }
    function planPanel() {
      if (!G || G.over) return;
      const n = G.week;
      const wk = G.wk;
      const extra = n >= 5 ? { label: '💤 cash out: go to bed early', fn: () => retire() } : null;
      const poll = (n === 1 || n % 4 === 0) && (C.plan.gamePicker.options || []).length >= 3;
      if (poll) {
        const opts = wsample(C.plan.gamePicker.options, 3);
        const vetoed = ri(0, 2);
        const vf = rpick(S.friends);
        const vtxt = fill(rpick(opts[vetoed].vetoLines || []) || 'no', { speaker: vf, game: opts[vetoed].name });
        if (vtxt) post(vf, vtxt);
        panel(`WHAT ARE WE PLAYING? · ${dayName(G.settings)} ${fmtTime(G.settings.time)}`, opts.map((o, i) => ({
          label: `vote for ${o.name}`, sub: i === vetoed ? 'somebody just vetoed this one' : 'the group is split', id: 'vote',
          fn: () => {
            if (i === vetoed) {
              moraleAdd(lose(-3));
              const f = rpick(S.friends);
              const t = fill(rpick(o.vetoLines || []) || 'we just said no to that', { speaker: f, game: o.name });
              if (t) post(f, t);
              toast('Trap', 'you voted for a vetoed game: -3 morale');
            } else {
              wk.game = o.name;
              const f = rpick(S.friends);
              say(f, C.plan.gamePicker.outcomes, { game: o.name });
            }
            hud();
            later(500, () => beat(0));
          },
        })).concat([{ label: 'shrug. see how the day goes', id: 'shrug', fn: () => beat(0) }]), extra);
        return;
      }
      panel(`PLAN · ${dayName(G.settings)} ${fmtTime(G.settings.time)} · ${gname()}`, [
        { label: 'shrug. see how the day goes', id: 'shrug', fn: () => beat(0) },
        { label: 'argue about it', id: 'argue', fn: () => { say(rpick(S.friends), C.plan.argue[rpick(['day', 'time', 'game'])]); later(600, () => beat(0)); } },
      ], extra);
    }

    // ---------- the day: four beats ----------
    function beat(i) {
      if (!G || G.over) return;
      const wk = G.wk;
      wk.beat = i;
      G.phase = 'b' + (i + 1);
      clearTimer();
      const steps = [];
      const key = BEATS[i];
      const spk = rpick(present().map(live)) || rpick(S.friends);
      const bl = pickLine(C.plan.beats[key], (e) => !e.when || matchWhen(e.when, { week: G.week }), key);
      if (bl) {
        steps.push(() => {
          const t = fill(bl.t, lineCtx({ speaker: spk }));
          if (t) post(spk, t);
          if (bl.roll) { G.rollShown = true; hud(); sys('roll call: ' + G.friends.map((gf) => `${live(gf).name} ${gf.flaked && gf.beat <= i ? 'out' : 'in'}`).join(' · ')); }
        });
      }
      if (i === 1 && wk.event === 'different-game') steps.push(() => say(rpick(S.friends), C.plan.differentGame));
      if (i === 2 && wk.event === 'update-hell') steps.push(() => say(rpick(S.friends), C.plan.updateLines));
      const flk = G.friends.filter((gf) => gf.flaked && gf.beat === i);
      flk.forEach((gf) => steps.push(() => {
        gf.pub = true;
        const f = live(gf);
        const t = gf.excuse ? fill(gf.excuse.t, { speaker: f }) : null;
        post(f, t || 'sorry guys, cannot make it tonight');
        hud();
      }));
      if (flk.length && pubFlaked() >= 2 && !wk.massDone && ch(0.6)) {
        wk.massDone = true;
        const evs = (C.flakes.events || []).filter((e) => e.kind === 'mass-flake' && matchWhen(e.when, { week: G.week, flakers: pubFlaked() }));
        const ev = wpick(evs, (e) => e.weight || 1);
        if (ev) steps.push(() => playEvent(ev, G.friends.filter((gf) => gf.flaked && gf.pub)));
      }
      if (i === 3) {
        const z = pickLine(C.plan.beats.zero, null, 'zero');
        if (z && !bl) steps.push(() => { const t = fill(z.t, { speaker: spk }); if (t) post(spk, t); });
      }
      seq(steps, () => decision(i));
    }
    function playEvent(ev, pref) {
      const map = {};
      const used = [];
      const pool = pref.map(live).concat(S.friends.filter((f) => !pref.some((g) => g.id === f.id)));
      let k = 0;
      ev.lines.forEach((l, idx) => {
        later(450 * idx, () => {
          if (!G || G.over) return;
          if (!map[l.who]) map[l.who] = pool[k++ % pool.length];
          const f = map[l.who];
          used.push(f);
          const t = fill(l.t, lineCtx({ speaker: f }));
          if (t) post(f, t);
        });
      });
    }

    function decision(i) {
      if (!G || G.over) return;
      const wk = G.wk;
      clearTimer();
      if (i >= 1 && i <= 2 && wk.waited && !wk.counterDone && ch(clamp(0.2 + 0.3 * avgPersistence() + (i === 2 ? 0.15 : 0) + (G.morale <= 35 ? 0.15 : 0), 0.05, 0.7))) {
        wk.counterDone = true;
        counterPanel({ afterBuild: false, resume: () => decision(i) });
        return;
      }
      const late = i === 2;
      const opts = [];
      const t = `${BEAT_NAME[i]} · ${dayName(G.settings)} ${fmtTime(G.settings.time)}`;
      if (i === 3) {
        const o = [{ label: 'ghost: go AFK and hope', sub: 'run the AFK round. the group is waiting', id: 'ghost', fn: () => doGhost() }];
        if (wk.attendOK) o.push({ label: 'ATTEND (you actually show up)', sub: 'strikes -1, morale +12, nobody believes it', id: 'attend', fn: () => doAttend() });
        const tm = startTimer(TUNE.zeroSecs, null, () => { api.clearActions(); autoGhost(); });
        panel(`${t} · we are all here. where are you?`, o, null, { timer: { left: tm.left, total: tm.total } });
        return;
      }
      if (i === 0) {
        opts.push({
          label: 'PREEMPT: cancel early', sub: G.cancelBank > 0 ? `safe but boring · uses a cancel (${G.cancelBank} left)` : 'you cancelled too many times', id: 'preempt', disabled: G.cancelBank <= 0,
          fn: () => preemptPanel(),
        });
      }
      opts.push({ label: late ? 'BUILD an excuse (last minute)' : 'BUILD an excuse', sub: late ? 'pays x1.5 but looks rushed (+3 elaboration)' : 'five parts, as wild as you dare', id: 'build', fn: () => openBuilder(late) });
      opts.push({ label: 'GHOST: just go AFK', sub: 'run the AFK round. highest variance, no ledger entry', id: 'ghost', fn: () => doGhost() });
      opts.push({ label: 'WAIT. do nothing yet', sub: 'friends may push back at the next beat', id: 'wait', fn: () => { wk.actions++; wk.waited = true; later(300, () => beat(i + 1)); } });
      if (wk.attendOK) opts.push({ label: 'ATTEND (cursed)', sub: 'actually show up. strikes -1, morale +12', id: 'attend', fn: () => doAttend() });
      const cl = G.friends.find((gf) => gf.flaked && gf.pub && gf.excuse && gf.excuse.caught && !gf.called);
      if (cl && !wk.called) opts.push({ label: `CALL OUT ${live(cl).name}`, sub: 'their excuse is weak. skepticism -5', id: 'callout', fn: () => callOut(cl, i) });
      const extra = G.week >= 5 && i === 0 ? { label: '💤 cash out: go to bed early', fn: () => retire() } : null;
      panel(t, opts, extra, {});
    }
    const avgPersistence = () => { const p = present(); return p.length ? p.reduce((a, f) => a + f.tr.persistence, 0) / p.length : 0; };
    function callOut(gf, i) {
      const wk = G.wk;
      gf.called = true; wk.called = true;
      const f = live(gf);
      const t = gf.excuse && fill(gf.excuse.caught, { speaker: G.friends.length ? rpick(S.friends) : f });
      if (t) post(rpick(S.friends.filter((x) => x.id !== f.id)) || f, t);
      const ev = wpick((C.flakes.events || []).filter((e) => e.kind === 'friend-caught' && matchWhen(e.when, { week: G.week, flakers: nFlaked() })), (e) => e.weight || 1);
      if (ev) later(500, () => playEvent(ev, [gf]));
      else later(500, () => say(f, C.flakes.playerCatchesFriend));
      S.sus = Math.max(0, S.sus - 5);
      toast('Called out', `${f.name} caved: skepticism -5`);
      later(1400, () => decision(i));
    }

    // ---------- PREEMPT ----------
    function preemptPanel() {
      const opts = wsample(C.plan.cancelOpeners, 6);
      panel('PREEMPT · pick a cancel message (uses 1 cancel)', opts.map((o) => ({ label: o.t, sub: 'elaboration 3, no risk of a story falling apart', id: 'opener', fn: () => doPreempt(o) })), { label: '← back', fn: () => decision(0) });
    }
    function doPreempt(o) {
      const wk = G.wk;
      G.cancelBank--;
      wk.approach = 'preempt';
      wk.pre = true;
      wk.actions++;
      wk.E = 3;
      wk.causeShort = 'my early cancel';
      wk.parts = [];
      wk.preText = o.t;
      post(ME, o.t);
      later(600, () => judge());
    }
    function doAttend() {
      const wk = G.wk;
      wk.approach = 'attend';
      wk.voluntary = true;
      wk.actions++;
      clearTimer();
      post(ME, `actually, i'm coming. see you at ${fmtTime(G.settings.time)}`);
      later(700, () => say(rpick(S.friends), [{ t: 'wait. you? actually?' }, { t: 'who is this and what did you do with {me}' }]));
      later(1600, resolve);
    }

    // ---------- GHOST (the AFK engine) ----------
    function doGhost() {
      const wk = G.wk;
      clearTimer();
      wk.approach = 'ghost';
      wk.actions++;
      G.phase = 'ghost';
      sys('👻 you go quiet. the AFK round begins', 'good');
      api.ghost(false);
    }
    function autoGhost() {
      if (!G || G.over || G.wk.approach) return;
      const wk = G.wk;
      wk.approach = 'ghost';
      wk.forgot = true;
      G.phase = 'ghost';
      sys('⏰ time is up. you forgot. you are now AFK', 'bad');
      api.ghost(true);
    }
    // the AFK round just ended (game.js nextRound hook) or you were kicked from voice
    function afkDone() {
      if (!G || G.over || G.phase !== 'ghost') return;
      const wk = G.wk;
      G.phase = 'ghost-done';
      const bank = S.lastBank ? S.lastBank.total : 0;
      const K = S.sus * ((S.autoMoved) ? 1 : TUNE.ghostCarry);
      const late = S.mins / Math.max(1, S.promise);
      wk.ghostPts = Math.max(0, Math.round(bank * TUNE.ghostMult));
      wk.ghost = { mins: S.mins, K, late, moved: !!S.autoMoved, dragged: !!S.dragged, passed: (S.lastRoll || 0) > 0 && !S.lastQuiet, bank };
      S.score = G.score;
      api.ghostCleanup();
      S.sus = Math.round(clamp(S.sus, 0, 100) * (S.autoMoved ? 1 : TUNE.ghostCarry)); // part of the AFK round's suspicion carries over as skepticism
      S.phase = 'gn';
      if (wk.ghostHard) { wk.ghostKind = 'called-out'; wk.strike = 1; wk.status = 'busted'; wk.hard = true; S.sus = Math.max(S.sus, 80); }
      else if (S.autoMoved) { wk.ghostKind = 'played-without-you'; wk.status = 'busted'; }
      else if (S.dragged) { wk.ghostKind = 'called-out'; wk.strike = K >= 70 ? 1 : 0; wk.status = 'busted'; wk.hard = K >= 70; }
      else if (K < 35 && late < 3) { wk.ghostKind = 'skipped'; wk.status = 'believed'; }
      else if (K < 70) { wk.ghostKind = 'called-out'; wk.strike = wk.ghost.passed ? 0 : 1; wk.status = 'doubted'; wk.hard = !wk.ghost.passed; }
      else { wk.ghostKind = 'called-out'; wk.strike = 1; wk.status = 'busted'; wk.hard = true; }
      wk.E = 1;
      wk.causeShort = 'my disappearing act';
      later(500, resolve);
    }
    function ghostKick() {
      if (!G || G.over || !G.wk || G.wk.approach !== 'ghost' || G.phase !== 'ghost') return false;
      G.wk.ghostHard = true;
      S.sus = 80;
      S.phase = 'gn';
      api.ghostCleanup();
      sys('👢 the group kicked you from voice', 'bad');
      later(900, afkDone);
      G.phase = 'ghost';
      return true;
    }

    // ---------- EXCUSE BUILDER ----------
    function selfTags() { // tags the in-progress excuse grants
      const t = [];
      SLOTS.forEach((s) => { const p = bd.picks[s]; if (p && p.tags) p.tags.forEach((x) => t.push(x)); });
      if (bd.story) bd.story.tags.forEach((x) => t.push(x));
      return t;
    }
    function offerable(slot, late) {
      const act = activeTags();
      const own = selfTags();
      return C.parts.filter((p) => {
        if (p.slot !== slot) return false;
        if ((p.unlocks || 1) > G.week) return false;
        if (late && p.lastMinute === false) return false;
        if ((p.requires || []).length) {
          if (!p.requires.every((t) => act[t] && act[t].status !== 'busted')) return false;
        }
        if (p.callback && !(p.requires || []).length) return false;
        if (p.contradicts && p.contradicts.some((t) => own.includes(t))) return false;
        return true;
      });
    }
    function fitFilter(slot, list) {
      if (slot === 'cause') return list;
      const tags = selfTags();
      const fit = list.filter((p) => !(p.fits || []).length || p.fits.some((t) => tags.includes(t)));
      return fit.length >= 2 ? fit : list;
    }
    function slotOptions(slot) {
      const pool = fitFilter(slot, offerable(slot, bd.late));
      if (slot !== 'cause') return wsample(pool, 6, (p) => p.weight || 1);
      const cbs = pool.filter((p) => p.callback);
      const norm = pool.filter((p) => !p.callback);
      const picks = wsample(cbs, Math.min(2, cbs.length), (p) => p.weight || 1).concat(wsample(norm, 8 - Math.min(2, cbs.length), (p) => p.weight || 1));
      const stories = C.stories.filter((s) => (s.unlocks || 1) <= G.week && !(bd.late && s.lastMinute === false));
      if (stories.length && picks.length >= 8) picks.splice(7, 1, wpick(stories, (p) => p.weight || 1));
      return picks.slice(0, 8);
    }
    function conflictsOf(part) {
      if (!part || part.callback) return [];
      const act = activeTags();
      return (part.contradicts || []).filter((t) => act[t]).map((t) => ({ tag: t, claim: act[t] }));
    }
    function allParts() { return bd.story ? [bd.story] : SLOTS.map((s) => bd.picks[s]).filter(Boolean); }
    const repeatsLast3 = () => G.ledger.filter((c) => c.week >= G.week - 3 && c.repeat).length;
    function buildE() { return allParts().reduce((a, p) => a + p.elab, 0) + (bd.late ? TUNE.lateElab : 0) + (bd.extra || 0); }
    function chanceNow(E) {
      return investigateP({ E, K: S.sus, difficulty: G.settings.difficulty, morale: G.morale, detectives: detectives().length, repeats3: repeatsLast3(), flaked: pubFlaked(), approachMult: bd.late ? 1.1 : 1, week: G.week });
    }
    function plaus(E) {
      const T = threshold({ difficulty: G.settings.difficulty, morale: G.morale, detectives: detectives().length, repeats3: repeatsLast3(), week: G.week });
      return E <= T - 3 ? 'rock solid' : E <= T ? 'believable' : E <= T + 3 ? 'shaky' : 'wild';
    }
    function gaugeText() {
      const E = buildE();
      return `ELABORATION ${E} · plausibility: ${plaus(E)} · investigation chance ${Math.round(chanceNow(E) * 100)}%`;
    }
    function openBuilder(late) {
      bd = { late: !!late, step: 0, picks: {}, opts: {}, story: null, extra: 0 };
      builderStep();
    }
    function builderStep() {
      if (!G || G.over) return;
      if (bd.story || bd.step >= SLOTS.length) { confirmPanel(); return; }
      const slot = SLOTS[bd.step];
      let opts = bd.opts[slot] || (bd.opts[slot] = slotOptions(slot));
      if (!opts.length) { if (slot === 'cause') { bd.opts[slot] = opts = wsample(BUILTIN.parts.filter((p) => p.slot === 'cause'), 4); } else { bd.picks[slot] = null; bd.step++; builderStep(); return; } }
      const items = opts.map((p) => {
        const cf = conflictsOf(p);
        const bits = [`+${p.elab} elab`];
        if (p.callback) bits.push('CALLBACK');
        if (p.id.indexOf('s-') === 0 || C.stories.includes(p)) bits.push('FULL STORY');
        if (cf.length) bits.push(`conflicts with week ${cf[0].claim.week}: ${cf[0].tag}`);
        return { label: fill(p.label, { speaker: ME }) || p.label, sub: bits.join(' · '), id: 'part', cls: cf.length ? 'gn-conflict' : p.callback ? 'gn-callback' : '', fn: () => pickPart(slot, p) };
      });
      if (slot !== 'cause') items.push({ label: 'skip this part', sub: 'less elaboration, less risk', id: 'skip', fn: () => { bd.picks[slot] = null; bd.step++; builderStep(); } });
      else items.push({ label: 'show me other causes', sub: 'reshuffle', id: 'reshuffle', fn: () => { delete bd.opts.cause; builderStep(); } });
      const back = bd.step > 0 ? { label: '← back', fn: () => { bd.step--; builderStep(); } } : { label: '← cancel (back to the day)', fn: () => decision(G.wk.beat) };
      panel(`EXCUSE ${bd.step + 1}/5 · ${SLOT_LABEL[slot]}`, items, back, { hint: gaugeText() + (bd.late ? ' · LAST MINUTE' : '') });
    }
    function pickPart(slot, p) {
      if (C.stories.includes(p)) { bd.story = p; bd.picks = {}; }
      else bd.picks[slot] = p;
      bd.step++;
      builderStep();
    }
    function confirmPanel() {
      const ps = allParts();
      const cf = [];
      ps.forEach((p) => conflictsOf(p).forEach((c) => cf.push(`${p.label} vs week ${c.claim.week} (${c.tag})`)));
      const sum = ps.map((p) => p.label).join(' + ');
      panel('SEND IT? ' + sum, [
        { label: 'SEND IT', sub: gaugeText(), id: 'send', fn: () => sendExcuse() },
        { label: 'start over', id: 'again', fn: () => openBuilder(bd.late) },
      ], { label: '← back', fn: () => { if (bd.story) { bd.story = null; bd.step = 0; } else bd.step = SLOTS.length - 1; builderStep(); } }, { hint: (cf.length ? '⚠ contradiction risk: ' + cf.join('; ') + ' · ' : '') + gaugeText() });
    }
    function sendExcuse() {
      const wk = G.wk;
      const ps = allParts();
      const cause = bd.story || bd.picks.cause;
      const proofP = bd.story ? bd.story : bd.picks.proof;
      wk.approach = 'build';
      wk.late = bd.late;
      wk.actions++;
      wk.parts = ps.slice();
      wk.partIds = ps.map((p) => p.id);
      wk.E = buildE();
      wk.causeShort = (cause && cause.short) || 'my situation';
      wk.causeLabel = cause ? cause.label : '';
      wk.propShort = (proofP && (proofP.short || proofP.proofLabel)) || '';
      wk.escLabel = bd.picks.escalation ? bd.picks.escalation.label : '';
      wk.friendWitness = !!(bd.picks.witness && /\{friend\}/.test(bd.picks.witness.text));
      const act = activeTags();
      wk.conflicts = [];
      ps.forEach((p) => conflictsOf(p).forEach((c) => wk.conflicts.push({ part: p, tag: c.tag, claim: c.claim })));
      wk.cbs = ps.filter((p) => p.callback);
      wk.cbUsed = wk.cbs.length;
      // repeat: the same cause tag in the last 4 weeks, not as a callback
      if (cause && !cause.callback && (cause.tags || []).length) {
        const hit = G.ledger.filter((c) => c.week >= G.week - 4 && c.week < G.week && c.causeTags.some((t) => cause.tags.includes(t)));
        if (hit.length) { wk.repeat = true; wk.repeatClaim = hit[hit.length - 1]; }
      }
      const texts = ps.map((p) => fill(p.text, { speaker: ME })).filter(Boolean);
      const steps = texts.map((t) => () => post(ME, t));
      seq(steps, () => judge(), 650);
    }

    // ---------- reactions, investigation, proof ----------
    function reactingFriend() {
      const d = detectives().map((g) => g).filter((g) => !g.flaked);
      if (d.length) return live(d[0]);
      return live(rpick(present()) || rpick(G.friends));
    }
    function makeDetective(gf) {
      if (gf.detective || detectives().length >= 2) return;
      if (!ch(gf.tr.persistence > 0.6 || live(gf).rival ? 0.95 : 0.7)) return;
      gf.detective = true;
      hud();
      later(600, () => say(live(gf), C.reactions.detectiveRise));
      toast('🕵 Lie detective', `${live(gf).name} is keeping a ledger now`);
    }
    function reactKind(E, T) {
      if (S.sus >= 60) return 'detective';
      if (E >= 14 || G.wk.cbUsed) return 'impressed';
      const lowRow = G.hist.length >= 1 && G.hist[G.hist.length - 1].E <= 6 && E <= 6;
      if ((G.skippedRow || 0) >= 4 || lowRow || G.repeatWeeks.length >= 2) return 'exasperated';
      if (detectives().length && S.sus >= 40) return 'detective';
      return 'neutral';
    }
    function reactionLine(gf, kind, E) {
      const f = live(gf);
      let band = bandOf(S.sus);
      if (G.morale <= 35) band = GN_BANDS[Math.min(3, GN_BANDS.indexOf(band) + 1)];
      const rx = C.reactions;
      let pool = (rx.byBand[band] && rx.byBand[band][kind]) || [];
      const fl = rx.friendLines || {};
      const extra = [];
      [fl._default, fl[f.id], fl['_' + f.trait], f.rival ? fl._rival : null].forEach((o) => { if (o && o[kind]) extra.push(...o[kind]); });
      const cl = f.lines && f.lines['gn_' + kind];
      if (cl) extra.push(...cl.map((t) => ({ t })));
      pool = pool.concat(extra);
      const lvl = lvlOf(gf);
      const ok = (e) => (e.eMin == null || e.eMin <= E) && (e.lvl == null || e.lvl <= lvl);
      let cand = pool.filter(ok);
      if (kind === 'impressed' && cand.length) {
        const top = Math.max.apply(null, cand.map((e) => e.eMin || 0));
        const hi = cand.filter((e) => (e.eMin || 0) >= top - 5);
        if (hi.length && ch(0.75)) cand = hi;
      }
      if (kind === 'exasperated' && cand.length) {
        const top = Math.max.apply(null, cand.map((e) => e.lvl || 0));
        const hi = cand.filter((e) => (e.lvl || 0) === top);
        if (hi.length && ch(0.7)) cand = hi;
      }
      if (!cand.length) cand = L(C.reactions.believed || []);
      return lineFrom(cand, f, {}, null);
    }
    const GN_BANDS = ['calm', 'eyebrow', 'sus', 'detective'];

    function judge() {
      if (!G || G.over) return;
      const wk = G.wk;
      const E = wk.E;
      const T = threshold({ difficulty: G.settings.difficulty, morale: G.morale, detectives: detectives().length, repeats3: repeatsLast3(), week: G.week });
      const rf = reactingFriend();
      const gfOf = (f) => G.friends.find((g) => g.id === f.id) || G.friends[0];
      const steps = [];
      let forced = null;
      const caught = wk.conflicts && wk.conflicts.length && ch(detectives().length ? 1 : 0.85);
      if (wk.repeat) {
        S.sus = clamp(S.sus + 15, 0, 100);
        const last = G.ledger[G.ledger.length - 1];
        if (last && last.repeat && last.causeTags.some((t) => wk.repeatClaim && wk.repeatClaim.causeTags.includes(t))) forced = 'repeat';
        steps.push(() => say(rf, C.reactions.repeat, { cause: wk.repeatClaim ? wk.repeatClaim.cause : wk.causeShort, week: wk.repeatClaim ? wk.repeatClaim.week : G.week }));
        steps.push(() => makeDetective(gfOf(rf)));
      }
      if (caught) {
        const c = wk.conflicts[0];
        const rf2 = rf;
        steps.push(() => say(rf2, C.reactions.contradiction, { cause: c.claim.cause || wk.causeShort, week: c.claim.week, tagNeeded: c.tag }, (e) => !e.needsTag || e.needsTag === c.tag));
        steps.push(() => makeDetective(gfOf(rf2)));
        wk.contradiction = true;
      }
      if (wk.cbUsed) {
        wk.cbs.forEach((p) => { S.sus = Math.max(0, S.sus - 6); });
        G.callbacks += wk.cbUsed;
        const src = wk.cbs[0] && (activeTags()[(wk.cbs[0].requires || [])[0]] || null);
        steps.push(() => say(reactingFriend(), C.reactions.callbackReward, { cause: ((src && src.cause) || wk.causeShort).replace(/^(my|the|our)\s+/i, '') }));
      }
      let inv = false;
      if (caught) inv = true;
      else if (forced) inv = true;
      else {
        const p = investigateP({ E, K: S.sus, difficulty: G.settings.difficulty, morale: G.morale, detectives: detectives().length, repeats3: repeatsLast3(), flaked: pubFlaked(), approachMult: wk.pre ? 0.5 : wk.late ? 1.1 : 1, week: G.week });
        wk.pInv = p;
        inv = rng() < p;
      }
      const go = () => {
        if (inv) {
          steps2.push(() => say(rf, C.reactions.proofDemand));
          seq(steps2, () => proofChallenge(caught ? 'contradiction' : 'normal', afterProof, caught ? wk.conflicts[0] : null), 600);
        } else {
          steps2.push(() => {
            const kind = reactKind(E, T);
            const t = reactionLine(gfOf(rf), kind, E);
            if (t) post(rf, t);
          });
          seq(steps2, afterJudge, 600);
        }
      };
      const steps2 = [];
      seq(steps, go, 600);
    }
    function afterProof(res) {
      const wk = G.wk;
      const rf = reactingFriend();
      wk.proof = res.kind;
      const contra = wk.contradiction && wk.conflicts && wk.conflicts.length;
      const steps = [];
      if (res.kind === 'perfect') {
        S.sus = Math.max(0, S.sus - 10); G.proofPerfect++; wk.status = 'believed'; wk.proofMult = 1.25; wk.proofPassed = true;
        if (contra) { S.sus = clamp(S.sus + 15, 0, 100); wk.cpassed = true; G.cpassed++; }
        steps.push(() => say(rf, C.reactions.proofPerfect));
        const d = detectives()[0];
        if (d) { d.detective = false; G.standDowns++; G.cleanRun = 0; steps.push(() => say(live(d), C.reactions.detectiveStandDown)); }
      } else if (res.kind === 'pass' || res.kind === 'closest') {
        wk.status = 'believed'; wk.proofPassed = true;
        if (contra) { S.sus = clamp(S.sus + 15, 0, 100); wk.cpassed = true; G.cpassed++; }
        steps.push(() => say(rf, C.reactions.proofPass));
      } else if (res.kind === 'partial') {
        S.sus = clamp(S.sus + 10, 0, 100); wk.status = 'doubted'; wk.proofMult = 0.7; wk.proofPassed = true;
        if (contra) { wk.cpassed = true; G.cpassed++; }
        steps.push(() => say(rf, C.reactions.proofPass));
      } else {
        S.sus = clamp(S.sus + (contra ? 25 : 20), 0, 100); wk.status = 'busted'; wk.strike = 1; wk.hard = true;
        steps.push(() => say(rf, C.reactions.proofFail));
      }
      seq(steps, afterJudge, 600);
    }
    function afterJudge() {
      const wk = G.wk;
      if (wk.status === 'believed' && detectives().length && G.ledger.length && ch(0.3) && !wk.quizDone) { wk.quizDone = true; quizPanel(afterJudge); return; }
      if (!wk.counterDone && wk.status !== 'busted' && ch(clamp(0.12 + 0.3 * avgPersistence() - 0.05 * pubFlaked() + (G.morale <= 35 ? 0.15 : 0) + (wk.late ? 0.1 : 0), 0.03, 0.55))) {
        wk.counterDone = true;
        counterPanel({ afterBuild: wk.approach === 'build', resume: resolve });
        return;
      }
      later(400, resolve);
    }

    // proof challenge: 6 cards, tap the consistent ones before the timer ends
    function proofCards(mode, conflict) {
      const wk = G.wk;
      const act = activeTags();
      const cons = [];
      const add = (lab) => { if (lab && !cons.includes(lab) && cons.length < 3) cons.push(lab); };
      const prevProofs = (cl) => cl.parts.map(partById).filter((p) => p && p.proofLabel).map((p) => p.proofLabel);
      if (mode === 'contradiction' && conflict && conflict.claim) prevProofs(conflict.claim).forEach(add);
      wk.parts.forEach((p) => add(p.proofLabel));
      Object.keys(act).forEach((t) => { if (act[t].status === 'believed' || act[t].status === 'doubted') prevProofs(act[t]).forEach(add); });
      const selfT = selfTagsOf(wk.parts);
      C.parts.filter((p) => p.slot === 'proof' && p.proofLabel && (!(p.fits || []).length || p.fits.some((t) => selfT.includes(t))) && !(p.contradicts || []).some((t) => selfT.includes(t))).sort(() => rng() - 0.5).forEach((p) => add(p.proofLabel));
      const actNames = Object.keys(act).concat(selfT);
      const decoyPool = (C.reactions.proofDecoys || []).filter((d) => !cons.includes(d.label));
      const hot = decoyPool.filter((d) => d.tags.some((t) => actNames.includes(t)));
      const rest = decoyPool.filter((d) => !hot.includes(d));
      const decoys = [];
      wsample(hot, 3).concat(wsample(rest, 6)).forEach((d) => { if (decoys.length < 6 - cons.length) decoys.push(d.label); });
      const cards = cons.map((l) => ({ label: l, ok: true })).concat(decoys.map((l) => ({ label: l, ok: false })));
      const sh = cards.sort(() => rng() - 0.5);
      sh.forEach((c, i) => { c.id = 'pc' + i; });
      return sh;
    }
    function selfTagsOf(parts) { const t = []; parts.forEach((p) => (p.tags || []).forEach((x) => t.push(x))); return t; }
    function proofSecs() {
      let s = TUNE.proofSecs;
      if (S.sus >= 60) s = 6;
      if (detectives().length) s = Math.min(s, 5);
      s += DIFF[G.settings.difficulty].secs;
      return s;
    }
    let proofState = null;
    function proofChallenge(mode, cb, conflict) {
      const wk = G.wk;
      const cards = proofCards(mode, conflict);
      G.busy = true;
      G.phase = 'proof';
      const timed = G.settings.proofTimer;
      proofState = { cards, sel: new Set(), cb, done: false, mode };
      const rf = reactingFriend();
      const box = $('#actions');
      box.textContent = '';
      const h = el('div', 'actions-title', `${rf.name}: prove it. tap the evidence that matches your story`);
      const tt = el('span', 'tri-time', timed ? proofSecs() + 's' : '∞', 'triTime');
      tt.setAttribute('aria-hidden', 'true');
      h.appendChild(tt);
      box.appendChild(h);
      if (timed) { const bar = el('div', 'tri-bar'); bar.appendChild(el('div', 'tri-fill')); box.appendChild(bar); }
      box.appendChild(el('div', 'actions-hint', mode === 'contradiction' ? 'Contradiction! Pick the 3 items that reconcile both stories.' : 'Pick the 3 items that fit your story. A wrong pick costs you.'));
      const grid = el('div', 'choices');
      cards.forEach((c, i) => {
        const b = el('button', 'choice gn-card', c.label);
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.dataset.card = c.id;
        b.dataset.act = 'card';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (proofState.done) return;
          if (proofState.sel.has(c.id)) proofState.sel.delete(c.id); else proofState.sel.add(c.id);
          b.setAttribute('aria-pressed', String(proofState.sel.has(c.id)));
        });
        grid.appendChild(b);
      });
      const ok = el('button', 'choice gn-confirm', 'SUBMIT');
      ok.type = 'button';
      ok.dataset.key = String(cards.length + 1);
      ok.dataset.act = 'submit';
      ok.addEventListener('click', (e) => { e.stopPropagation(); finishProof(Array.from(proofState.sel), false); });
      grid.appendChild(ok);
      box.appendChild(grid);
      $('#messages').scrollTop = $('#messages').scrollHeight;
      hud();
      if (timed) startTimer(proofSecs(), null, () => finishProof(Array.from(proofState ? proofState.sel : []), true));
    }
    function finishProof(ids, timedOut) {
      if (!proofState || proofState.done) return null;
      proofState.done = true;
      clearTimer();
      const cs = proofState.cards;
      const sel = ids.map((id) => cs.find((c) => c.id === id)).filter(Boolean);
      const right = sel.filter((c) => c.ok).length;
      const wrong = sel.length - right;
      const total = cs.filter((c) => c.ok).length;
      const need = Math.min(3, total);
      let kind;
      if (timedOut || right < 2 || wrong >= 2) kind = 'fail';
      else if (right >= need && wrong === 0 && need >= 3) kind = 'perfect';
      else if (wrong === 1) kind = 'partial';
      else kind = right === 2 ? 'closest' : 'pass';
      const cb = proofState.cb;
      proofState = null;
      G.busy = false;
      api.clearActions();
      toast(`proof: ${right} right, ${wrong} wrong`, kind === 'fail' ? 'busted' : kind);
      const res = { kind, right, wrong };
      G.wk.proofRes = res;
      cb(res);
      return res;
    }

    // detective mini-quiz: one question about your own ledger
    function quizPanel(done) {
      const q = pickLine(C.reactions.detectiveQuiz, (e) => e.ask, 'quiz');
      const ask = q ? q.ask : 'cause';
      const claim = G.ledger.slice().reverse().find((c) => c.status !== 'busted' && c.parts.map(partById).some((p) => p && p.slot === ask));
      if (!claim) { done(); return; }
      const right = claim.parts.map(partById).find((p) => p && p.slot === ask);
      const pool = C.parts.filter((p) => p.slot === ask && p.id !== right.id);
      if (pool.length < 2) { done(); return; }
      const opts = wsample(pool, 2).concat([right]).sort(() => rng() - 0.5);
      const det = live(detectives()[0]);
      const t = fill(q ? q.t : 'remind me?', { speaker: det });
      if (t) post(det, t);
      G.busy = true;
      G.phase = 'quiz';
      const finish = (kind) => {
        clearTimer();
        G.busy = false;
        api.clearActions();
        if (kind === 'right') { S.sus = Math.max(0, S.sus - 4); toast('Quiz', 'correct: skepticism -4'); }
        else if (kind === 'wrong') { S.sus = clamp(S.sus + 6, 0, 100); toast('Quiz', 'wrong: skepticism +6'); }
        else { S.sus = clamp(S.sus + 2, 0, 100); toast('Quiz', 'you dodged: skepticism +2'); }
        hud();
        later(400, done);
      };
      const tm = startTimer(TUNE.quizSecs, null, () => finish('wrong'));
      panel('QUIZ · answer from memory', opts.map((p) => ({ label: p.label, id: 'quiz', fn: () => finish(p.id === right.id ? 'right' : 'wrong') })).concat([{ label: 'refuse to answer', id: 'skip', fn: () => finish('skip') }]), null, { timer: { left: tm.left, total: tm.total } });
      G.phase = 'quiz';
    }

    // counter-offers
    function counterPanel(o) {
      const wk = G.wk;
      G.phase = 'counter';
      const offers = (C.plan.counterOffers || []).filter((c) => matchWhen(c.when || {}, { week: G.week, flakers: pubFlaked() }));
      const offer = wpick(offers, () => 1);
      const who = present().length ? live(wpick(present(), (g) => 0.3 + g.tr.persistence)) : rpick(S.friends);
      if (!offer || !who) { o.resume(); return; }
      post(who, fill(offer.t, { speaker: who }) || offer.t);
      const acceptFn = () => {
        post(ME, 'ugh. ok. fine');
        const t = fill(offer.accept, { speaker: who });
        later(600, () => { if (t) post(who, t); wk.dragged = true; wk.dragReason = 'counter'; later(900, resolve); });
      };
      const canDecline = o.afterBuild && SLOTS.includes(offer.declineNeeds);
      const opts = [
        { label: 'ACCEPT: ok fine', sub: 'you play. strike-safe, but your story evaporates', id: 'accept', fn: acceptFn },
        { label: canDecline ? `DECLINE (add a ${offer.declineNeeds} to your story)` : 'DECLINE', sub: canDecline ? 'extra part, extra elaboration' : 'say no again', id: 'decline', fn: () => declineFn() },
        { label: 'DEFLECT: "maybe next week"', sub: 'adds promise debt. they may not buy it', id: 'deflect', fn: () => deflectFn() },
      ];
      const declineFn = () => {
        wk.pressure += offer.pressure;
        if (!canDecline) { post(ME, 'sorry, still no'); later(900, o.resume); return; }
        const pool = offerable(offer.declineNeeds, false).filter((p) => !wk.partIds.includes(p.id));
        const choices = wsample(pool, 6, (p) => p.weight || 1);
        if (!choices.length) { post(ME, 'sorry, still no'); later(900, o.resume); return; }
        panel(`DECLINE · add a ${offer.declineNeeds}`, choices.map((p) => ({
          label: p.label, sub: `+${p.elab} elab`, id: 'part',
          fn: () => { wk.parts.push(p); wk.partIds.push(p.id); wk.E += p.elab; const t = fill(p.text, { speaker: ME }); if (t) post(ME, t); if (p.slot === 'promise') G.debt = Math.min(5, G.debt + 1); later(900, o.resume); },
        })), null, {});
      };
      const deflectFn = () => {
        G.debt = Math.min(5, G.debt + 1);
        post(ME, 'maybe next week? i promise');
        const ok = rng() < 0.65 - 0.1 * offer.pressure + 0.1 * who.gullibility;
        later(700, () => {
          if (ok) { say(who, [{ t: 'ok. but i am writing that down' }, { t: 'fine. you owe us' }]); later(1000, o.resume); }
          else { say(who, [{ t: 'no. now.' }, { t: 'nice try, get in' }]); wk.dragged = true; wk.dragReason = 'deflect'; later(1000, resolve); }
        });
      };
      panel('COUNTER-OFFER · ' + who.name + ' pushes back', opts, null, {});
    }

    // ---------- RESOLVE ----------
    function chooseOutcome(kind, ctx) {
      const all = C.outcomes.filter((o) => o.kind === kind && matchWhen(o.when, ctx));
      const pool = all.length ? all : C.outcomes.filter((o) => o.kind === kind);
      const fresh = pool.filter((o) => !recent.includes(o.id));
      const o = wpick(fresh.length ? fresh : pool, (x) => x.weight || 1);
      if (o) { recent.push(o.id); if (recent.length > 60) recent.shift(); }
      return o;
    }
    function resolve() {
      if (!G || G.over || G.phase === 'resolve') return;
      clearTimer();
      G.busy = false;
      G.phase = 'resolve';
      const wk = G.wk;
      const st = G.settings;
      const diff = DIFF[st.difficulty];
      const flakers = nFlaked();
      const allFlaked = flakers === G.friends.length;
      const approach = wk.approach || 'ghost';
      let kind;
      if (approach === 'attend') kind = 'dragged-in';
      else if (wk.dragged) kind = 'dragged-in';
      else if (wk.status === 'busted' || wk.hard) kind = 'called-out';
      else if (wk.ghostKind) kind = wk.ghostKind;
      else kind = 'skipped';
      if (forceKind) { kind = forceKind; if (kind === 'called-out') wk.strike = Math.max(wk.strike, 1); forceKind = null; }
      else if (kind === 'skipped') {
        if (allFlaked) kind = 'everyone-flaked';
        else if (wk.event === 'update-hell') kind = 'update-hell';
        else if (wk.event === 'different-game') kind = 'different-game';
        else if (wk.event === 'just-talked' && present().length >= 3) kind = 'just-talked';
        else if (wk.status === 'doubted' && ch(0.4)) kind = 'played-without-you';
        else if (approach === 'build' && wk.E <= 2 && ch(0.25)) kind = 'played-without-you';
      } else if (kind === 'dragged-in' && wk.event === 'update-hell') kind = 'update-hell';
      else if (kind === 'played-without-you' && allFlaked) kind = 'everyone-flaked';
      wk.kind = kind;
      const skipKind = SKIPPISH.includes(kind) || kind === 'played-without-you';
      const tagsNow = Object.keys(activeTags());
      const ctx = { week: G.week, k: S.sus, e: wk.E, flakers, morale: G.morale, strikes: G.strikes, tags: tagsNow, approach: approach === 'build' && wk.pre ? 'preempt' : approach };
      const out = chooseOutcome(kind, ctx) || { id: 'x', title: kind, text: ['...'], chat: [], effects: { morale: 0, skep: 0, strike: 0, ptsMult: 1 } };
      const fx = out.effects;
      const voluntary = approach === 'attend';

      // morale
      let md = fx.morale;
      if (kind === 'skipped' && approach !== 'ghost') md = wk.proof === 'perfect' ? TUNE.moralePerfect : wk.E >= 14 || wk.cbUsed >= 2 ? TUNE.moraleHigh : TUNE.moraleLow; // spec 4: entertained +3, plain -4, perfect proof +4
      if (kind !== 'everyone-flaked' && flakers && kind !== 'dragged-in') md -= Math.min(9, 3 * flakers) * (skipKind ? 0.5 : 1);
      if (G.debt >= 3) md -= 2;
      let strikeAdd = kind === 'called-out' ? wk.strike : fx.strike > 0 ? fx.strike : 0;
      if (voluntary) { md = 12; strikeAdd = -1; }
      if (wk.debtCall && skipKind && approach !== 'attend' && kind !== 'everyone-flaked' && kind !== 'update-hell') { G.debt = Math.max(0, G.debt - 1); md -= 5; if (ch(0.4)) strikeAdd += 1; wk.debtBreak = true; }
      if (strikeAdd > 0) md -= 6;
      G.moraleBefore = G.morale;
      moraleAdd(md < 0 ? lose(md) : md);
      // passive drift
      if (G.morale > 50) G.morale -= 1; else if (G.morale < 50 && G.morale > 0) G.morale += 1;
      G.morale = clamp(G.morale, 0, 100);
      // skepticism
      const sBefore = S.sus;
      S.sus = clamp(Math.round(S.sus + clamp(fx.skep, -25, 25) + (skipKind && kind !== 'everyone-flaked' && approach !== 'ghost' ? TUNE.skipSus : 0)), 0, 100);
      if (voluntary || kind === 'dragged-in') S.sus = clamp(Math.min(S.sus, sBefore) - 10 + 0, 0, 100);
      // strikes
      const stBefore = G.strikes;
      G.strikes = clamp(G.strikes + strikeAdd, 0, st.strikes);
      // streak
      const believed = wk.status === 'believed' && skipKind && kind !== 'played-without-you';
      if (believed && approach !== 'attend') { G.streak++; G.cleanRun++; } else { G.streak = 0; G.cleanRun = 0; }
      G.bestStreak = Math.max(G.bestStreak, G.streak);
      if (G.streak > 0 && G.streak % 5 === 0 && G.strikes > 0 && G.week - G.lastRelief >= 5) { G.strikes--; G.lastRelief = G.week; wk.relief = true; }
      if (voluntary || kind === 'dragged-in') { G.debt = approach === 'attend' || wk.dragReason === 'counter' ? 0 : G.debt; }
      if (voluntary) G.attends++;
      if (G.cleanRun >= 3 && detectives().length) { const d = detectives()[0]; d.detective = false; G.standDowns++; G.cleanRun = 0; wk.standDown = d; }
      if (skipKind) G.skips++;
      // promise debt from the lie that was told
      if (approach === 'build' && wk.parts.some((p) => p.slot === 'promise') && !wk.pre && kind !== 'dragged-in') G.debt = Math.min(5, G.debt + 1);
      // exasperation
      G.friends.forEach((gf) => { if (kind === 'dragged-in') gf.exasperation = 0; else if (skipKind) gf.exasperation++; });
      G.skippedRow = skipKind ? (G.skippedRow || 0) + 1 : 0;
      if (wk.repeat) G.repeatWeeks.push(G.week);
      // all-flake streak
      if (kind === 'everyone-flaked') { G.allFlakeStreak++; G.allFlakeWeeks++; } else G.allFlakeStreak = 0;
      G.cbRow = wk.cbUsed ? G.cbRow + 1 : 0;

      // points
      let base;
      const bld = approach === 'build' || approach === 'preempt';
      if (approach === 'ghost') base = wk.ghostPts || 0;
      else if (bld) {
        base = scorePts({ E: wk.E, streak: G.streak - (believed ? 1 : 0), callbacks: wk.cbUsed, approachMult: wk.pre ? TUNE.preemptMult : wk.late ? TUNE.lateMult : 1, week: G.week, proofMult: wk.proofMult || 1, diffMult: diff.pts });
        if (wk.repeat) base = Math.round(base * TUNE.repeatMult);
      } else base = 0;
      let pts;
      if (voluntary) pts = TUNE.attendPts;
      else if (kind === 'dragged-in') pts = Math.max(TUNE.draggedPts, Math.round(base * fx.ptsMult));
      else pts = Math.round(base * fx.ptsMult) + (kind === 'everyone-flaked' ? TUNE.flakeBonus : 0);
      if (kind === 'played-without-you') pts = Math.max(10, pts);
      if (!st.proofTimer && wk.proof) pts = Math.round(pts * TUNE.noTimerMult);
      const lastWeek = st.length !== 'endless' && G.week >= st.length;
      wk.pts = pts;

      // ledger
      if (bld) {
        const ttls = {};
        const tags = [];
        wk.parts.forEach((p) => (p.tags || []).forEach((t) => { tags.push(t); ttls[t] = Math.max(ttls[t] == null ? 0 : ttls[t], p.ttl != null ? p.ttl : 2); }));
        const cause = wk.parts.find((p) => p.slot === 'cause' || p.slot === 'story');
        G.ledger.push({ week: G.week, tags, ttls, ttl: Math.max(0, ...Object.values(ttls)), causeTags: cause ? (cause.tags || []).slice() : [], parts: wk.partIds.slice(), vars: { cause: wk.causeShort, prop: wk.propShort }, cause: wk.causeShort, prop: wk.propShort, elab: wk.E, status: kind === 'update-hell' ? 'moot' : kind === 'called-out' ? 'busted' : wk.status, callbacks: wk.cbUsed, proofPassed: !!wk.proofPassed, repeat: !!wk.repeat, label: wk.pre ? wk.preText : wk.parts.map((p) => p.label).join(', ') });
      }
      // best excuse
      if (bld && believed && wk.E > G.bestExcuse.E) G.bestExcuse = { E: wk.E, week: G.week, text: bestText(wk) };

      // award, achievements
      const wctx = { week: G.week, k: S.sus, e: bld ? wk.E : null, flakers, morale: G.morale, strikes: G.strikes, tags: tagsNow, approach: wk.pre ? 'preempt' : approach, kind, believed, proof: wk.proof === 'closest' || wk.proofRes && wk.proofRes.right === 2 && wk.proof !== 'fail' && wk.proof !== 'partial' ? 'closest' : wk.proof, callbacks: wk.cbUsed, cpassed: wk.cpassed ? 1 : 0, usedFriendAsWitness: wk.friendWitness, streak: G.streak, actions: wk.actions, ledger: G.ledger.length, cbRow: G.cbRow };
      const award = C.awards.find((a) => matchWhen(a.when, wctx));
      if (award) { G.awards.push({ week: G.week, id: award.id, name: award.name }); wk.award = award; }
      if (kind === 'everyone-flaked') wctx.kind = 'everyone-flaked';
      checkAch('week', wctx);
      G.hist.push({ w: G.week, kind, E: wk.E, pts, approach: wctx.approach, status: wk.status, inv: !!wk.proofRes, pInv: wk.pInv == null ? null : Math.round(wk.pInv * 100) / 100, K: Math.round(S.sus), morale: G.morale });
      G.score += pts;
      S.score = G.score;

      // ending?
      let ending = null;
      if (G.strikes >= st.strikes || S.sus >= 100) ending = 'kicked';
      else if (G.morale <= 0) ending = 'disbanded';
      else if (G.allFlakeStreak >= 3) ending = 'never-happens';
      else if (lastWeek) ending = 'survived';
      if (ending === 'survived') { G.score += Math.round(pts * 0.5); S.score = G.score; }
      // fallback summary of a ghost week
      checkAch('run', Object.assign({}, runCtx(), { kind: ending ? 'ending:' + ending : kind }));

      renderResolve(out, kind, wk, { pts, md, sBefore, stBefore, ending, flakers, believed });
    }
    function bestText(wk) {
      const c = wk.parts.find((p) => p.slot === 'cause' || p.slot === 'story');
      let s = c ? c.short : 'my excuse';
      const e = wk.parts.find((p) => p.slot === 'escalation');
      if (e) s += ' ' + e.label.replace(/^\.\.\./, '').toLowerCase();
      s = s.replace(/[{}\u0000-\u001f]/g, '');
      return s.length > 80 ? s.slice(0, 79) + '…' : s;
    }
    function runCtx() {
      return { week: G.week, skips: G.skips, streak: G.streak, callbacks: G.callbacks, cbRow: G.cbRow, proofPerfect: G.proofPerfect, cpassed: G.cpassed, standDowns: G.standDowns, attends: G.attends, ledger: G.ledger.length, debt: G.debt, allFlakeWeeks: G.allFlakeWeeks, makeUps: G.makeUps, strikes: G.strikes, morale: G.morale, k: S.sus };
    }
    function gotAch() { const g = store.get('gnAch', {}); return g && typeof g === 'object' && !Array.isArray(g) ? g : {}; }
    function checkAch(scope, ctx) {
      const got = gotAch();
      let ch2 = false;
      C.achievements.forEach((a) => {
        if (got[a.id] || (a.when && a.when.scope && a.when.scope !== scope)) return;
        if (!matchWhen(a.when, ctx)) return;
        got[a.id] = true; ch2 = true;
        G.newAch.push(a.id);
        const desc = fill(a.desc, {}) || a.desc;
        toast(`🏆 ${a.name}`, desc, 'ach');
      });
      if (ch2) store.set('gnAch', got);
    }

    // the narrative card (in the actions area, not a modal)
    function renderResolve(out, kind, wk, r) {
      const ctxF = lineCtx({ cause: wk.causeShort, prop: wk.propShort, speaker: null });
      const lines = (out.text || []).map((t) => fill(t, ctxF)).filter(Boolean);
      if (out.chat) {
        // chat lines come from friends in the group
        out.chat.slice(0, 2).forEach((t, i) => later(500 + 600 * i, () => { if (!G) return; const f = rpick(S.friends); const x = fill(t, lineCtx({ speaker: f })); if (x) post(f, x); }));
      }
      const extras = [];
      // flakers who cancelled just after you say thank you
      const after = G.friends.filter((g) => g.flaked && g.beat > (wk.beat == null ? 4 : wk.beat) && (wk.approach === 'build' || wk.approach === 'preempt'));
      after.slice(0, 2).forEach((g, i) => later(1300 + 600 * i, () => { if (G) say(live(g), C.flakes.solidarity, { cause: wk.causeShort }); }));
      if (after.length >= 3) later(2600, () => { if (G) say(rpick(S.friends), C.flakes.snowball); });
      if (wk.standDown) later(2000, () => { if (G) say(live(wk.standDown), C.reactions.detectiveStandDown); });
      if (r.stBefore < G.strikes) later(1500, () => { if (G) say(rpick(S.friends), r.ending === 'kicked' ? C.reactions.strikeFinal : C.reactions.strike); });
      if (!r.ending && G.morale > 0 && G.morale <= 20 && ch(0.5)) later(2200, () => { if (G) say(rpick(S.friends), C.plan.disbandThreat); });
      if (nFlaked() < G.friends.length) { const ev = !r.ending && ch(0.25) ? wpick((C.flakes.events || []).filter((e) => e.kind === 'friend-late' && matchWhen(e.when, { week: G.week })), (e) => e.weight || 1) : null; if (ev) later(2400, () => { if (G) playEvent(ev, G.friends.filter((g) => !g.flaked)); }); }

      const box = $('#actions');
      box.textContent = '';
      const card = el('div', 'gn-resolve');
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'Week result');
      card.appendChild(el('div', 'gn-res-title', out.title ? (fill(out.title, ctxF) || out.title) : kind));
      lines.forEach((t) => card.appendChild(el('p', 'gn-res-line', t)));
      const chips = el('div', 'gn-res-chips');
      chips.appendChild(el('span', 'gn-chip ' + (r.pts > 0 ? 'in' : ''), `+${fmtN(r.pts)} pts`));
      const moraleD = G.morale - G.moraleBefore;
      chips.appendChild(el('span', 'gn-chip ' + (moraleD >= 0 ? 'in' : 'out'), `morale ${moraleD >= 0 ? '+' : ''}${moraleD}`));
      const sd = Math.round(S.sus - r.sBefore);
      chips.appendChild(el('span', 'gn-chip ' + (sd <= 0 ? 'in' : 'out'), `skepticism ${sd >= 0 ? '+' : ''}${sd}`));
      if (G.strikes !== r.stBefore) chips.appendChild(el('span', 'gn-chip ' + (G.strikes > r.stBefore ? 'out' : 'in'), `strike ${G.strikes > r.stBefore ? '+' : '-'}1`));
      if (wk.E && (wk.approach === 'build' || wk.approach === 'preempt')) chips.appendChild(el('span', 'gn-chip', `elaboration ${wk.E}`));
      card.appendChild(chips);
      if (wk.award) card.appendChild(el('div', 'gn-res-award', `🏅 Excuse of the Week: ${wk.award.name}`));
      box.appendChild(card);
      const btn = el('button', 'choice', r.ending ? 'SEE HOW IT ENDS' : 'NEXT WEEK');
      btn.type = 'button';
      btn.dataset.key = '1';
      btn.dataset.act = r.ending ? 'ending' : 'next';
      btn.addEventListener('click', (e) => { e.stopPropagation(); if (r.ending) endRun(r.ending); else nextWeek(); });
      const g = el('div', 'choices');
      g.appendChild(btn);
      box.appendChild(g);
      $('#messages').scrollTop = $('#messages').scrollHeight;
      api.render();
      hud();
      btn.focus({ preventScroll: true });
    }
    function nextWeek() {
      if (!G || G.over || G.phase !== 'resolve') return;
      api.clearActions();
      G.phase = 'idle';
      later(300, beginWeek);
    }
    function retire() {
      if (!G || G.over) return;
      api.clearActions();
      clearTimer();
      endRun('retired');
    }

    // ---------- end of run ----------
    const gnScores = () => { const s = store.get('gnScores', []); return Array.isArray(s) ? s.filter((x) => x && Number.isFinite(x.s)).sort((a, b) => b.s - a.s).slice(0, 10) : []; };
    function titleFor(score) { let t = C.titles[0]; C.titles.forEach((x) => { if (score >= x.minPts && (!t || x.minPts >= t.minPts)) t = x; }); return t; }
    function entryNow() {
      const st = G.settings;
      const pk = api.pack();
      return { m: 'gn', v: 1, s: G.score, w: G.week, e: G.bestExcuse.E, x: G.bestExcuse.text.slice(0, 80), k: G.ending || 'kicked', st: G.strikes, cs: G.bestStreak, d: st.day, g: cleanGame(G.gameName).slice(0, 24), p: pk.id, n: api.sanitizeName(ME.name), t: Date.now(), l: st.strikes };
    }
    function shareTextFor(e) {
      const day = DAYS[Number.isInteger(e.d) && e.d >= 0 && e.d <= 6 ? e.d : 3].toUpperCase();
      const bits = [`${day} NEVER HAPPENS`];
      if (Number.isFinite(e.w)) bits.push(`${e.w} week${e.w === 1 ? '' : 's'}`);
      if (Number.isFinite(e.s)) bits.push(`${fmtN(e.s)} pts`);
      if (typeof e.x === 'string' && e.x && Number.isFinite(e.e) && e.e > 0) bits.push(`best lie: "${e.x.replace(/["{}\u0000-\u001f]/g, '').slice(0, 80)}" (elab ${e.e})`);
      if (Number.isFinite(e.cs) && e.cs > 0) bits.push(`streak ${e.cs}`);
      if (ENDING_LABEL[e.k]) bits.push(`ending: ${ENDING_LABEL[e.k]}`);
      if (Number.isFinite(e.st) && Number.isFinite(e.l)) bits.push(`${e.st}/${e.l} strikes`);
      const pm = e.p && e.p !== 'classic' ? api.packName(e.p) : api.packName('classic');
      if (pm) bits.push(`in ${String(pm).replace(/[{}\u0000-\u001f]/g, '')}`);
      return bits.join(' · ');
    }
    function saveEntry() {
      const e = entryNow();
      const all = gnScores();
      all.push(e);
      all.sort((a, b) => b.s - a.s);
      store.set('gnScores', all.slice(0, 10));
      const best = store.get('gn.best', null);
      const prev = best && Number.isFinite(best.s) ? best.s : 0;
      const isBest = G.score > prev && G.score > 0;
      if (isBest || !best) store.set('gn.best', { s: Math.max(prev, G.score), e: G.bestExcuse.E, x: G.bestExcuse.text });
      return isBest;
    }
    const bestScore = () => { const b = store.get('gn.best', null); return b && Number.isFinite(b.s) ? b.s : 0; };
    function endRun(ending) {
      if (!G || G.over) return;
      G.over = true;
      G.ending = ending;
      clearTimer();
      S.phase = 'over';
      G.phase = 'over';
      api.clearActions();
      if (ending === 'kicked') { sys(`👢 ${ME.name} was removed from the group chat.`, 'bad'); api.sfx('bad'); }
      checkAch('run', Object.assign({}, runCtx(), { kind: 'ending:' + ending }));
      if (ending === 'survived' && G.settings.length === 12) { /* gn-12-weeks is data driven */ }
      if (ending === 'never-happens') { G.score += 500; S.score = G.score; }
      const isBest = saveEntry();
      document.title = `${titleOf(G.settings)} · AFK Simulator`;
      hud();
      later(900, () => showEnd(ending, isBest));
    }
    function showEnd(ending, isBest) {
      if (!G) return;
      const ctxF = lineCtx({ cause: G.bestExcuse.text, speaker: null, week: G.week });
      const pool = C.outcomes.filter((o) => o.kind === 'ending' && o.ending === ending);
      const out = rpick(pool) || { title: ending, text: [''] };
      const e = entryNow();
      const ttl = titleFor(G.score);
      const nodes = [el('h1', ending === 'never-happens' || ending === 'survived' || ending === 'retired' ? '' : 'bad', `${ending === 'never-happens' ? '🌌 ' : ending === 'survived' ? '🏆 ' : ending === 'retired' ? '🌙 ' : '👢 '}${fill(out.title, ctxF) || out.title}`, 'modalTitle')];
      nodes.push(el('p', 'tag', `${isBest ? '🏆 NEW BEST! ' : ''}${ENDING_LABEL[ending] || ending} · rank: ${ttl ? ttl.name : '-'}`));
      (out.text || []).forEach((t) => { const x = fill(t, ctxF); if (x) nodes.push(el('p', 'gn-end-line', x)); });
      if (ending === 'never-happens') nodes.push(el('p', 'tag', `Secret ending found: +500 pts. ${titleOf(G.settings)}.`));
      const stats = el('div', 'stats');
      [[fmtN(G.score), 'final score'], [String(G.week), 'weeks'], [String(G.bestExcuse.E || '-'), 'best lie (elab)'], [String(G.bestStreak), 'best streak']].forEach(([v, l]) => {
        const s = el('div', 'stat');
        s.append(el('div', 'v', v), el('div', 'l', l));
        stats.appendChild(s);
      });
      nodes.push(stats);
      if (G.bestExcuse.text) nodes.push(el('p', 'tag', `Excuse of the Season: "${G.bestExcuse.text}" (elab ${G.bestExcuse.E})`));
      if (G.awards.length) nodes.push(el('p', 'tag', 'Awards: ' + G.awards.map((a) => `w${a.week} ${a.name}`).slice(0, 6).join(' · ')));
      if (G.newAch.length) nodes.push(el('p', 'tag', 'New trophies: ' + G.newAch.map((id) => (C.achievements.find((a) => a.id === id) || { name: id }).name).join(' · ')));
      nodes.push(achListNode());
      const row = el('div', 'btn-row');
      const c = el('button', 'btn alt', 'Copy for Discord', 'gnShare');
      c.addEventListener('click', () => api.copyText(shareTextFor(e)));
      row.appendChild(c);
      if (typeof navigator.share === 'function') { const sh = el('button', 'btn alt', 'Share…'); sh.addEventListener('click', () => { Promise.resolve(navigator.share({ text: shareTextFor(e) })).catch(() => {}); }); row.appendChild(sh); }
      nodes.push(row);
      nodes.push(api.overlayLinks());
      const again = el('button', 'btn', 'Another season', 'gnAgain');
      again.addEventListener('click', () => api.restart());
      nodes.push(again);
      api.setReturn(() => showEnd(ending, isBest));
      api.openModal(nodes);
    }
    function achListNode() {
      const got = gotAch();
      const wrap = document.createDocumentFragment();
      wrap.appendChild(el('h3', '', `GAME NIGHT TROPHIES ${Object.keys(got).filter((k) => C.achievements.some((a) => a.id === k)).length}/${C.achievements.length}`));
      const box = el('div', 'achs');
      C.achievements.forEach((a) => {
        const c = el('span', 'ach' + (got[a.id] ? ' got' : ''), (got[a.id] ? '🏆 ' : '🔒 ') + a.name);
        c.title = got[a.id] ? (fill(a.desc, {}) || a.desc) : (a.hint || '');
        box.appendChild(c);
      });
      wrap.appendChild(box);
      return wrap;
    }

    // ---------- ledger overlay ----------
    function ledgerView() {
      if (!G || G.busy) return;
      if (S.phase === 'afk') return;
      const nodes = [el('h1', '', '📒 Excuse Ledger', 'modalTitle')];
      const act = activeTags();
      nodes.push(el('p', 'tag', `Week ${G.week} · debt ${G.debt} · strikes ${G.strikes}/${G.settings.strikes} · skepticism ${Math.round(S.sus)} (${bandOf(S.sus)})`));
      const tg = Object.keys(act);
      if (tg.length) { const tc = el('div', 'gn-tags'); tg.forEach((t) => tc.appendChild(el('span', 'gn-tag', t))); nodes.push(el('h3', '', 'ACTIVE TAGS'), tc); }
      nodes.push(el('h3', '', 'CLAIMS'));
      if (!G.ledger.length) nodes.push(el('p', 'tag', 'Nothing yet. Every excuse you tell goes in here, and everybody remembers.'));
      const ICON = { believed: '✓', doubted: '?', busted: '✗', moot: '∅' };
      G.ledger.slice().reverse().forEach((cl) => {
        const row = el('div', 'gn-claim ' + cl.status);
        row.appendChild(el('div', 'gn-claim-head', `${ICON[cl.status] || '·'} week ${cl.week} · elab ${cl.elab} · ${cl.status}${cl.callbacks ? ' · callback x' + cl.callbacks : ''}`));
        row.appendChild(el('div', 'gn-claim-body', cl.label || cl.cause));
        const t2 = el('div', 'gn-tags');
        cl.tags.forEach((t) => t2.appendChild(el('span', 'gn-tag' + (act[t] === cl ? ' active' : ''), t)));
        row.appendChild(t2);
        nodes.push(row);
      });
      if (G.week - G.lastMakeUp >= 3 && S.phase === 'gn' && G.phase !== 'resolve') {
        const mk = el('button', 'btn alt', 'MAKE-UP: buy snacks / offer to host (25 pts)');
        mk.disabled = G.score < 25;
        mk.addEventListener('click', () => { makeUp(); api.closeOverlay(); });
        nodes.push(mk);
      }
      const done = el('button', 'btn', 'Close');
      done.addEventListener('click', () => api.closeOverlay());
      nodes.push(done);
      api.openOverlay('archive', nodes);
    }
    function makeUp() {
      if (!G || G.score < 25 || G.week - G.lastMakeUp < 3) return false;
      G.score -= 25; S.score = G.score; G.lastMakeUp = G.week; G.makeUps++;
      moraleAdd(8); G.debt = Math.max(0, G.debt - 1);
      sys('🍕 you bought snacks for the group. morale +8, debt -1', 'good');
      hud(); api.render();
      return true;
    }

    // ---------- settings / start UI ----------
    function btnGroup(label, items, cur, onPick, cls) {
      const box = el('div', 'gn-opts ' + (cls || ''));
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', label);
      items.forEach(([v, text]) => {
        const b = el('button', 'btn alt gn-opt', text);
        b.type = 'button';
        b.dataset.val = String(v);
        b.setAttribute('aria-pressed', String(v === cur));
        b.addEventListener('click', () => { onPick(v); box.querySelectorAll('.gn-opt').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.val === String(v)))); });
        box.appendChild(b);
      });
      return box;
    }
    function settingsNodes(onChange) {
      const s = readSettings();
      const upd = (patch) => { Object.assign(s, patch); const c = cleanSettings(s); Object.assign(s, c); saveSettings(c); if (onChange) onChange(c); };
      const nodes = [];
      nodes.push(el('h3', '', 'GAME NIGHT'));
      nodes.push(el('label', 'field-label', 'Which day is game night?'));
      nodes.push(btnGroup('Weekday', DAYS.map((d, i) => [i, d.slice(0, 3)]), s.day, (v) => upd({ day: v }), 'gn-days'));
      const timeRow = el('div', 'gn-time');
      const hr = el('select', 'gn-select', null, 'gnHour');
      hr.setAttribute('aria-label', 'Hour');
      for (let h = 0; h < 24; h++) { const o = el('option', '', fmtTime(String(h).padStart(2, '0') + ':00').replace(':00', '')); o.value = String(h).padStart(2, '0'); hr.appendChild(o); }
      const mn = el('select', 'gn-select', null, 'gnMin');
      mn.setAttribute('aria-label', 'Minutes');
      ['00', '30'].forEach((m) => { const o = el('option', '', ':' + m); o.value = m; mn.appendChild(o); });
      hr.value = s.time.slice(0, 2); mn.value = s.time.slice(3);
      const tchange = () => upd({ time: hr.value + ':' + mn.value });
      hr.addEventListener('change', tchange); mn.addEventListener('change', tchange);
      timeRow.append(el('span', 'field-label', 'Time'), hr, mn);
      nodes.push(timeRow);
      const gl = el('label', 'field-label', 'Game name (max 24 characters, blank = random)');
      gl.htmlFor = 'gnGame';
      const gi = el('input', 'name-input', null, 'gnGame');
      gi.type = 'text'; gi.maxLength = 24; gi.autocomplete = 'off'; gi.value = s.game;
      gi.addEventListener('change', () => { const v = cleanGame(gi.value); gi.value = v; upd({ game: v }); });
      nodes.push(gl, gi);
      nodes.push(el('label', 'field-label', 'Season length'), btnGroup('Weeks', [[8, '8 weeks'], [12, '12 weeks'], ['endless', 'Endless']], s.length, (v) => upd({ length: v }), 'gn-len'));
      nodes.push(el('label', 'field-label', 'Strikes before you are kicked'), btnGroup('Strikes', [[2, '2'], [3, '3'], [5, '5']], s.strikes, (v) => upd({ strikes: v }), 'gn-strikes'));
      nodes.push(el('label', 'field-label', 'Difficulty'), btnGroup('Difficulty', [['chill', 'Chill'], ['normal', 'Normal'], ['brutal', 'Brutal']], s.difficulty, (v) => upd({ difficulty: v }), 'gn-diff'));
      const sw = (label, key) => {
        const b = el('button', 'btn alt gn-switch', `${label}: ${s[key] ? 'on' : 'off'}`);
        b.type = 'button';
        b.setAttribute('role', 'switch');
        b.setAttribute('aria-checked', String(s[key]));
        b.dataset.key = key;
        b.addEventListener('click', () => { upd({ [key]: !s[key] }); b.textContent = `${label}: ${s[key] ? 'on' : 'off'}`; b.setAttribute('aria-checked', String(s[key])); });
        return b;
      };
      const tog = el('div', 'gn-toggles');
      tog.append(sw('Use my crew', 'useCrew'), sw('Proof timer', 'proofTimer'), sw('Fast weeks', 'fastWeeks'));
      nodes.push(tog, el('p', 'pack-note', 'Proof timer off means a calmer challenge but 30% fewer points. Fast weeks skip the planning chatter after week 4. "Use my crew" needs 3 or more friends in Settings > Your crew.'));
      return nodes;
    }
    function introLine(st) {
      st = st || readSettings();
      return `Every ${dayName(st)} at ${fmtTime(st.time)} the group is meant to play ${st.game || 'a game'}. Nobody ever does. Survive ${st.length === 'endless' ? 'as many weeks as you can' : st.length + ' weeks'} by cancelling with ever more elaborate, internally consistent lies.`;
    }
    function startNodes() {
      const st = readSettings();
      const nodes = [el('h1', '', `🎲 ${titleOf(st)}`, 'modalTitle'), el('p', 'tag', `Game Night: you are the flake, ${ME.name}.`)];
      const ul = el('ul');
      [
        introLine(st),
        'Each week: plan, then four beats from morning to start time. Cancel early (safe), BUILD an excuse (five parts, risky), GHOST (run the AFK round), or just wait.',
        'Everything you claim goes in the ledger. Contradict it, repeat yourself or get too wild and friends demand PROOF: tap the right evidence before the timer ends.',
        `${st.strikes} strikes and you are out of the chat. Morale reaching zero archives the group. Press 1-9 to pick options.`,
      ].forEach((t) => ul.appendChild(el('li', '', t)));
      nodes.push(ul);
      return nodes;
    }
    function leaderboardNode() {
      const scores = gnScores();
      const wrap = document.createDocumentFragment();
      wrap.appendChild(el('h3', '', 'GAME NIGHT LEADERBOARD (TOP 10)'));
      if (!scores.length) { wrap.appendChild(el('p', 'tag', 'No seasons yet. Go cancel something.')); return wrap; }
      const t = el('table', 'scores gn-scores');
      scores.forEach((s, i) => {
        const tr = el('tr');
        tr.append(el('td', '', `#${i + 1}`), el('td', '', api.sanitizeName(s.n || 'player')), el('td', 'n', fmtN(s.s)), el('td', '', `w${Math.floor(clamp(+s.w || 0, 0, 999))}`), el('td', '', ENDING_LABEL[s.k] ? s.k : '-'), el('td', '', `elab ${Math.floor(clamp(+s.e || 0, 0, 40))}`));
        t.appendChild(tr);
      });
      wrap.appendChild(t);
      return wrap;
    }
    function topShareText() { const s = gnScores()[0]; return s ? shareTextFor(s) : ''; }

    // ---------- ?debug=1 hooks ----------
    function debug() {
      const D = {};
      const snap = () => (!G ? null : {
        week: G.week, phase: G.phase, beat: G.wk ? G.wk.beat : null, approach: G.wk ? G.wk.approach : null, morale: G.morale, strikes: G.strikes, K: S.sus, debt: G.debt, cancelBank: G.cancelBank, streak: G.streak, bestStreak: G.bestStreak,
        allFlakeStreak: G.allFlakeStreak, score: G.score, ledger: G.ledger.length, over: G.over, ending: G.ending, settings: Object.assign({}, G.settings), seed: G.seed, game: G.gameName, flaked: G.friends.map((f) => f.flaked), detectives: detectives().length, E: G.wk ? G.wk.E : 0, kind: G.wk ? G.wk.kind : null, awards: G.awards.length, busy: G.busy, newAch: G.newAch.slice(), event: G.wk ? G.wk.event : null, proof: G.wk ? G.wk.proof : null, pts: G.wk ? G.wk.pts : 0, hist: G.hist.slice(),
      });
      D.seed = (n) => { seedNext = (n >>> 0) || 1; return seedNext; };
      D.settings = () => readSettings();
      D.setSettings = (o) => saveSettings(cleanSettings(Object.assign(readSettings(), o)));
      D.clean = (o) => cleanSettings(o);
      D.state = snap;
      D.start = (o) => { api.restart(o); return snap(); };
      D.fast = (on) => api.fast(on);
      D.drain = () => { api.drain(); return snap(); };
      D.advance = () => { clearTimer(); if (G && G.phase === 'b4') { api.clearActions(); autoGhost(); } return snap(); };
      D.setFlakers = (n) => { forceFlakers = n; if (G && G.wk) { G.friends.forEach((f, i) => { f.flaked = i < n; if (f.flaked) { f.beat = f.beat || 0; f.pub = true; } }); } return nFlaked(); };
      D.forceOutcome = (k) => { forceKind = k; return k; };
      D.forceEvent = (k) => { forceEvent = k; if (G && G.wk) G.wk.event = k; return k; };
      D.set = (p) => {
        if (!G) return null;
        if (p.morale != null) G.morale = clamp(p.morale, 0, 100);
        if (p.strikes != null) G.strikes = p.strikes;
        if (p.K != null) S.sus = clamp(p.K, 0, 100);
        if (p.debt != null) G.debt = p.debt;
        if (p.streak != null) G.streak = p.streak;
        if (p.week != null) G.week = p.week;
        if (p.cancelBank != null) G.cancelBank = p.cancelBank;
        if (p.attendOK != null && G.wk) G.wk.attendOK = !!p.attendOK;
        if (p.detective != null) { G.friends.forEach((f, i) => { f.detective = i < p.detective; }); }
        if (p.exasperation != null) G.friends.forEach((f) => { f.exasperation = p.exasperation; });
        hud();
        return snap();
      };
      D.ledger = () => (G ? G.ledger.map((c) => JSON.parse(JSON.stringify(c))) : []);
      D.addClaim = (cl) => { G.ledger.push(Object.assign({ week: G.week, tags: [], ttls: {}, ttl: 2, causeTags: [], parts: [], vars: {}, cause: 'x', prop: '', elab: 5, status: 'believed', callbacks: 0, proofPassed: false, repeat: false, label: 'x' }, cl)); hud(); return G.ledger.length; };
      D.tags = () => Object.keys(activeTags());
      D.score = () => (G ? G.score : 0);
      D.share = (e) => shareTextFor(e || entryNow());
      D.entry = () => (G ? entryNow() : null);
      D.scores = () => gnScores();
      D.offer = (slot, late) => { bd = bd || { late: !!late, step: 0, picks: {}, opts: {}, story: null, extra: 0 }; bd.late = !!late; return slotOptions(slot).map((p) => ({ id: p.id, callback: !!p.callback, conflicts: conflictsOf(p).map((c) => c.tag) })); };
      D.parts = () => C.parts.map((p) => p.id);
      D.part = (id) => partById(id);
      D.approach = (kind, o) => {
        o = o || {};
        if (kind === 'wait') { G.wk.actions++; G.wk.waited = true; clearTimer(); beat(G.wk.beat + 1); return snap(); }
        if (kind === 'preempt') { const op = (C.plan.cancelOpeners || []).find((x) => x.id === o.opener) || C.plan.cancelOpeners[0]; doPreempt(op); return snap(); }
        if (kind === 'ghost') { doGhost(); return snap(); }
        if (kind === 'attend') { doAttend(); return snap(); }
        if (kind === 'build') {
          bd = { late: !!o.late, step: 0, picks: {}, opts: {}, story: null, extra: 0 };
          (o.parts || []).forEach((id) => { const p = partById(id); if (!p) return; if (C.stories.includes(p)) bd.story = p; else bd.picks[p.slot] = p; });
          sendExcuse();
          return snap();
        }
        return null;
      };
      D.cards = () => (proofState ? proofState.cards.map((c) => ({ id: c.id, label: c.label, ok: c.ok })) : []);
      D.proof = (ids) => { if (!proofState) return null; return finishProof(ids || proofState.cards.filter((c) => c.ok).map((c) => c.id), false); };
      D.proofOk = (n, wrong) => { if (!proofState) return null; const ok = proofState.cards.filter((c) => c.ok).slice(0, n).map((c) => c.id); const bad = proofState.cards.filter((c) => !c.ok).slice(0, wrong || 0).map((c) => c.id); return finishProof(ok.concat(bad), false); };
      D.pInvestigate = (E, K, o) => investigateP(Object.assign({ E, K: K == null ? S.sus : K, difficulty: G ? G.settings.difficulty : 'normal', morale: G ? G.morale : 70, detectives: G ? detectives().length : 0, repeats3: 0, flaked: 0 }, o || {}));
      D.threshold = (o) => threshold(o || {});
      D.pts = (o) => scorePts(o);
      D.matchWhen = matchWhen;
      D.retire = () => retire();
      D.makeUp = () => makeUp();
      D.resolveNow = () => { resolve(); return snap(); };
      D.next = () => { nextWeek(); return snap(); };
      D.line = (raw, c) => fill(raw, c || {});
      D.contentInfo = () => ({ missing: C.missing, parts: C.parts.length, stories: C.stories.length, outcomes: C.outcomes.length });
      D.fillMain = (raw) => fill(raw, { speaker: ME });
      return D;
    }

    return {
      avail, start, introLine, afkDone, ghostKick, hud, ledgerView, settingsNodes, startNodes, leaderboardNode, topShareText, shareTextFor, bestScore, achListNode, debug,
      titleOf: () => titleOf(readSettings()), readSettings, cleanSettings, hasRun: () => !!G && !G.over, clear: () => { clearTimer(); G = null; proofState = null; bd = null; hud(); },
      cleanGame, gnScores, load: loadContent, gname,
    };
  }

  window.AFK_GN = { create, cleanSettings, cleanGame, fmtTime, bandOf, threshold, investigateP, scorePts, matchWhen, mulberry32, TUNE, DEF, DAYS, BUILTIN };
}());
