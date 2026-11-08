'use strict';
/* AFK Simulator / js/session.js: AFK-channel resident, reset(), sound, avatar.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- AFK-channel resident ----------
function pickResident() {
  if (!RESIDENTS.length) return null;
  const c = pick(RESIDENTS);
  const hasMin = Number.isFinite(c.timerMin);
  const hasMax = Number.isFinite(c.timerMax);
  const lo = hasMin ? c.timerMin : Math.min(200, hasMax ? c.timerMax : 200);
  const hi = hasMax ? c.timerMax : Math.max(1500, lo);
  return { ...c, days0: Math.floor(rand(lo, hi + 1)), dayMins: c.timerDayMins || 60 };
}
// 1 resident day = 1 game hour by default (timerDayMins), so the number visibly ticks during a run
const resDays = () => (S.resident ? S.resident.days0 + Math.floor(S.resT / S.resident.dayMins) : 0);
const resTimerText = () => { const n = resDays(); return `In voice for ${fmtN(n)} ${n === 1 ? 'day' : 'days'}`; };
const resStatus = () => {
  const st = S.resident && S.resident.status;
  return st && st.length ? st[Math.floor(performance.now() / 7000) % st.length] : 'idle';
};
function residentSay() {
  const r = S.resident;
  if (!r || !S.inAfkCh || S.kicked) return;
  const own = r.lines && r.lines.idle;
  if (PK.id !== 'classic') {
    const pool = [].concat(Array.isArray(r.status) ? r.status : [], Array.isArray(own) ? own : []);
    sys(`💤 ${r.name}: ${mixLine('resident', pool.length ? () => pick(pool) : null) || '…'}`, 'resident');
    return;
  }
  sys(`💤 ${r.name}: ${own && own.length && Math.random() < 0.6 ? pick(own) : '…'}`, 'resident');
}
// called whenever the player is moved/dragged into the afk channel
function roommate() {
  if (!S.resident) return;
  store.set('roommates', (Number(store.get('roommates', 0)) || 0) + 1);
  later(900, residentSay);
  if (Math.random() < 0.1) later(1900, () => sys(lineOr('afkMod', '{me} was promoted to AFK channel moderator.'), 'good'));
}

function reset() {
  gen++;
  if (typeof cqClear === 'function') cqClear();
  roundType = 'normal';
  rebuildFriends();
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
    uses: Object.create(null),
    kicked: false,
    path: null,
    mode: null,
    threshold: 15,
    inAfkCh: false,
    autoMoved: false,
    dragged: false,
    movedAt: 0,
    cap: Infinity,
    dragMin: 0,
    aloneSince: null,
    flavor: '',
    longestPath: '',
    longestMode: '',
    friends: FRIENDS_ACTIVE.map((f) => ({ ...f, away: false, vc: true })),
    crewNames: CREW_NAMES.slice(),
    chan: VOICE[0].id,
    chanLock: false,
    vcPicked: false,
    vcHops: 0,
    vcRound: 0,
    parked: false,
    parkKind: '',
    parkFrom: null,
    parkMark: null,
    rejoin: null,
    botBump: 0,
    brbBase: null,
    cons: {},
    armedItems: {},
    charges: {},
    rd: newRd(),
    run: null,
    exOpts: null,
    rgResult: null,
    tokPts: 0,
    banked: 0,
    tokAwarded: 0,
    resident: pickResident(),
    resT: 0,
    idrisJabs: 0,
    fightMissed: 0,
    fightPings: 0,
    lastFight: -99,
    elevator: false,
    ch: Object.fromEntries(TEXT.map((c) => [c.id, { msgs: [], unread: 0, mentions: 0, muted: !!c.muted, lastReplyAt: -1e9 }])),
    active: TEXT[0].id,
    brbCh: null,
    pings: [],
    pingSeq: 0,
    tri: null,
    lor: null,
    follows: 0,
    brbN: Object.create(null),
    actBuild: null,
    slowTok: 0,
    gn: null,
    lastRoll: 0,
    lastQuiet: false,
  });
  if (GN) GN.clear();
  gnChrome(false);
  repaint();
  clearActions();
  document.body.classList.remove('afk');
  $('#afkPanel').hidden = true;
  document.title = 'AFK Simulator';
  $('#composerText').textContent = composerIdle();
  renderChip();
  renderMembers();
  renderInv();
  renderChannelList();
  rgHudRender();
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
  a.textContent = firstCh(who.name);
  return a;
}

window.AFK.modules.push('session');
