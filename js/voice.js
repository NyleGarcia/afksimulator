'use strict';
/* AFK Simulator / js/voice.js: player-chosen voice channels, the visible move to the AFK channel and the rejoin step.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Loaded after afk.js; everything here runs at call time. All text goes through textContent.
 * Voice, park and rejoin are CLASSIC-ONLY (guarded by !S.run && !S.gn): rogue picks the channel from its seeded plan and
 * Game Night GHOST rounds keep the old flow (avatar shows in the AFK channel while inAfkCh, then returns by itself). */

// tuning (documented in CONTENT.md "Voice channels, moves and rejoin")
const VC_TUNE = {
  hopBase: 1, hopStep: 1.5, hopMax: 4, // suspicion cost of a voice hop: 1, 2.5, 4 (then 4) within one round
  hopBeat: 900, // ms of "connecting" while you hop
  bump: 25, // suspicion jump when the AFK bot auto-moves you (clamped to kickAt()-1, never kills)
  beatMin: 900, beatPer: 12, beatMax: 3800, // rejoin beat in ms = 900 + 12 * game minutes gone, capped at 3.8 s
  taxDiv: 90, taxMax: 3, // "where were you" suspicion on rejoin = round(minutes gone / 90), max 3
  markSus: 1.1, // the round after a park: friends watch closer (suspicion gain x1.1)
  redeem: 20, // redemption bonus (x round) for a clean, on-time return in that next round
};
const vcOn = () => !S.run && !S.gn;

// ---------- content: per-channel flavor (AFK_CONTENT.voiceFlavor / AFK_PACKS[id].data.voiceFlavor, validated here) ----------
function vcFlavor(id) {
  const P = PK.id !== 'classic' && window.AFK_PACKS && window.AFK_PACKS[PK.id];
  const raw = P ? (P.data || {}).voiceFlavor : (window.AFK_CONTENT || {}).voiceFlavor;
  const f = raw && typeof raw === 'object' ? raw[id] : null;
  if (!f || typeof f !== 'object') return { hello: [], brb: [] };
  const strs = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 140) : []);
  const brb = (Array.isArray(f.brb) ? f.brb : []).filter((b) => b && typeof b.t === 'string' && b.t.length <= 60 && Number.isFinite(b.p) && b.p >= 1 && b.p <= 90 && Number.isFinite(b.m) && b.m >= 0.5 && b.m <= 2);
  return { hello: strs(f.hello), brb };
}

// swap the last brb option for one that fits the voice channel you sit in (deterministic per round + channel)
function vcBrbMix(base) {
  if (!vcOn() || !Array.isArray(base) || base.length < 3) return base;
  const fl = vcFlavor(S.chan).brb;
  if (!fl.length) return base;
  const o = fl[(S.round + (S.vcHops || 0)) % fl.length];
  const seen = base.slice(0, 2).some((b) => b.t === o.t);
  return seen ? base : base.slice(0, 2).concat([{ t: o.t, p: o.p, m: o.m, vc: true }]);
}

// ---------- sidebar buttons (desktop list + phone bar) ----------
const vcBtns = []; // { c, btns: [button...] }
function vcMkBtn(c, bar) {
  const b = el('button', 'ch vc-ch');
  b.type = 'button';
  b.dataset.vc = c.id;
  const ic = el('span', 'ch-ic', c.icon);
  ic.setAttribute('aria-hidden', 'true');
  const nm = el('span', 'ch-name', c.name);
  const mt = modsText(c.mods || {});
  b.append(ic, nm);
  if (mt) { const m = el('span', 'vc-mods', mt.replace(/ suspicion/g, ' sus').replace(/ · /g, ' ')); m.setAttribute('aria-hidden', 'true'); b.appendChild(m); }
  b.addEventListener('click', () => vcClick(c));
  return b;
}
function vcRegister(c, btn) {
  let r = vcBtns.find((x) => x.c === c);
  if (!r) { r = { c, btns: [] }; vcBtns.push(r); }
  r.btns.push(btn);
}
function vcBuildBar() {
  vcBtns.length = 0;
  const wrap = $('#chanBarWrap');
  if (!wrap) return;
  let nav = $('#voiceBar');
  if (!nav) {
    nav = el('nav', 'voice-bar-wrap', null, 'voiceBar');
    nav.setAttribute('aria-label', 'Voice channels');
    wrap.after(nav);
  }
  nav.textContent = '';
  const bar = el('div', 'voice-bar');
  VOICE.forEach((c) => { const b = vcMkBtn(c, true); bar.appendChild(b); vcRegister(c, b); });
  nav.appendChild(bar);
}

const vcCan = () => vcOn() && !S.kicked && $('#modal').hidden && ((S.phase === 'chat' && !!S.actBuild) || (S.phase === 'judging' && !!S.rejoin));
// call after any change that moves you or changes what you may do (renderMembers calls it)
function vcSync() {
  const parked = !!S.parked && !S.kicked;
  const here = S.inAfkCh || parked ? AFK_CH.id : curVc().id;
  const can = vcCan();
  vcBtns.forEach(({ c, btns }) => {
    const cur = !parked && !S.inAfkCh && c.id === curVc().id;
    const mt = modsText(c.mods || {});
    btns.forEach((b) => {
      b.classList.toggle('active', cur);
      b.classList.toggle('rejoin', !!S.rejoin && c.id === S.parkFrom);
      if (!cur && !can) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      if (cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      b.title = (c.desc || '') + (mt ? ` (${mt})` : '') + (can && !cur ? ' · click to join' : '');
      b.setAttribute('aria-label', `${chanLabel(c)} voice${mt ? ', ' + mt : ''}${cur ? ', you are here' : S.rejoin && c.id === S.parkFrom ? ', click to rejoin' : can ? ', click to join' : ''}`);
    });
  });
  const nav = $('#voiceBar');
  if (nav) nav.dataset.here = here;
}

function vcClick(c) {
  if (swallow) { swallow = false; return; }
  if (S.phase === 'afk' || S.kicked) return;
  initAudio();
  if (!vcOn()) { toast('Voice is locked', S.run ? 'the run decides which voice channel the squad is in' : 'Game Night keeps the squad in one channel'); return; }
  if (S.rejoin) { doRejoin(c.id); return; }
  if (!vcCan()) { toast('Not now', 'you can switch voice channel in chat, between rounds'); return; }
  if (c.id === curVc().id) return;
  joinVoice(c.id);
}

// ---------- joining another voice channel (chat phase) ----------
function vcSay(f, lines, fallback) {
  const t = lines.length ? pick(lines) : fallback;
  if (t) post(f, meTok(fixN(t), f), { ch: S.active });
}
function joinVoice(id) {
  const c = VOICE.find((x) => x.id === id);
  if (!c || !vcCan() || S.rejoin) return false;
  const prev = curVc();
  if (c.id === prev.id) return false;
  S.vcHops = S.vcRound === S.round ? (S.vcHops || 0) + 1 : 1;
  S.vcRound = S.round;
  const cost = Math.min(VC_TUNE.hopMax, VC_TUNE.hopBase + VC_TUNE.hopStep * (S.vcHops - 1));
  S.phase = 'leaving';
  S.vcPicked = true;
  clearActions();
  S.chan = c.id;
  renderMembers();
  sys(`🔊 ${ME.name} left ${prev.name} and is connecting to ${c.name}…`, undefined, S.active);
  later(VC_TUNE.hopBeat, () => {
    S.sus = clamp(S.sus + cost, 0, kickAt() - 1);
    const mt = modsText(c.mods || {});
    sys(`🔊 ${ME.name} joined ${c.name}${mt ? ` (${mt})` : ''} · +${cost}% suspicion for the hop${S.vcHops >= 3 ? ' (stop hopping)' : ''}`, undefined, S.active);
    renderMembers();
    render();
    const here = S.friends.filter((f) => !f.away && inVcNow(f));
    const f = here.length ? pick(here) : friend();
    vcSay(f, vcFlavor(c.id).hello, speak(f, 'ok'));
    if (here.length > 1 && Math.random() < 0.4) later(900, () => { const g = pick(here.filter((x) => x !== f)); if (g) vcSay(g, vcFlavor(c.id).hello, ''); });
    later(500, () => { if (S.phase === 'leaving') { S.phase = 'chat'; offerBrb(true); } });
  });
  return true;
}

// ---------- parked in the AFK channel -> Rejoin voice ----------
function vcPark(kind) {
  if (!vcOn()) return;
  S.parked = true;
  S.parkKind = kind;
  S.parkFrom = S.chan;
}
const vcBeat = () => Math.round(clamp(VC_TUNE.beatMin + VC_TUNE.beatPer * S.mins, VC_TUNE.beatMin, VC_TUNE.beatMax));

function offerRejoin() {
  const old = VOICE.find((c) => c.id === S.parkFrom) || curVc();
  S.rejoin = { id: old.id };
  S.phase = 'judging';
  renderMembers();
  const long = S.mins >= 60;
  sys(`🔇 ${ME.name} is still in ${AFK_CH.name}. Rejoin ${old.name} to get back in.`, 'bad', S.active);
  setActions(`YOU ARE STILL IN ${AFK_CH.name.toUpperCase()}`, [{
    label: `Rejoin voice: ${old.name}`,
    sub: `reconnect takes ~${(vcBeat() / 1000).toFixed(1)}s (gone ${fmtMins(S.mins)})${long ? ' · they will ask where you were' : ''}`,
    id: 'rejoin',
    fn: () => doRejoin(old.id),
  }], null, { hint: `Or click ${old.name} in the sidebar (or pick another voice channel). Coming back from a park costs a little suspicion and makes the next round a bit tighter.` });
  const rd = S.round;
  later(14000, () => { if (S.rejoin && S.round === rd && !S.kicked) post(friend(), pick(['u coming back or what', '@' + ME.name + ' we are waiting', 'hello? the afk channel is not a personality']), { ch: S.active }); });
}

function doRejoin(id) {
  if (!S.rejoin) return;
  const c = VOICE.find((x) => x.id === id) || curVc();
  const gone = S.mins;
  const kind = S.parkKind;
  S.rejoin = null;
  clearActions();
  S.chan = c.id;
  S.vcPicked = true; // a rejoin is a pick: no roaming away right after
  if (c.id !== S.parkFrom) { // swapping to another channel via rejoin pays the hop cost
    S.vcHops = S.vcRound === S.round ? (S.vcHops || 0) + 1 : 1;
    S.vcRound = S.round;
    S.sus = Math.min(kickAt() - 1, S.sus + Math.min(VC_TUNE.hopMax, VC_TUNE.hopBase + VC_TUNE.hopStep * (S.vcHops - 1)));
  }
  sys(`🔊 ${ME.name} is reconnecting to ${c.name}…`, undefined, S.active);
  renderMembers();
  later(vcBeat(), () => {
    S.parked = false;
    const tax = Math.min(VC_TUNE.taxMax, Math.round(gone / VC_TUNE.taxDiv));
    if (tax) S.sus = clamp(S.sus + tax, 0, kickAt() - 1);
    S.parkMark = { gone, kind };
    const mt = modsText(c.mods || {});
    sys(`🔊 ${ME.name} rejoined ${c.name}${mt ? ` (${mt})` : ''} after ${fmtMins(gone)}${tax ? ` · +${tax}% suspicion (where were you)` : ''}`, tax ? 'bad' : 'good', S.active);
    renderMembers();
    render();
    const here = S.friends.filter((f) => !f.away && inVcNow(f));
    const f = here.length ? pick(here) : friend();
    const key = gone >= 60 ? 'rejoinLong' : 'rejoin';
    post(f, meTok(lineOr(key, gone >= 60 ? '{me}. where WERE you. {t}.' : 'oh {me} is back'), f), { ch: S.active });
    if (here.length > 1 && Math.random() < 0.5) later(900, () => { const g = pick(here.filter((x) => x !== f)); if (g) post(g, meTok(lineOr(key, 'where were you'), g), { ch: S.active }); });
    later(1500, nextRound);
  });
}

window.AFK.modules.push('voice');
