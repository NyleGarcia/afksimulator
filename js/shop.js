'use strict';
/* AFK Simulator / js/shop.js: inventory strip, active abilities, shop modal.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// chip text for an item's effects: "pts x1.08 · +2m grace"
const fxChips = (fx) => Object.keys(fx).map((k) => window.AFK_FX.fmt(k, fx[k]));
const itemTip = (i, state) => `${i.icon} ${i.name} (${i.rarity || 'common'}, ${TIER_LABEL[tierOf(i)]})${state ? ` [${state}]` : ''}: ${fxChips(i.effects).join(' · ')}${i.desc ? ` · "${i.desc}"` : ''}`;

function renderInv() {
  const strip = $('#invStrip');
  if (!strip) return;
  const fa = document.activeElement;
  const keep = fa && strip.contains(fa) && fa.dataset ? (fa.dataset.arm ? 'arm:' + fa.dataset.arm : fa.dataset.inv ? 'inv:' + fa.dataset.inv : '') : '';
  strip.textContent = '';
  if (S.run) rgInvStrip(strip);
  else renderInvItems(strip);
  if (keep) {
    const [kind, id] = keep.split(':');
    const again = strip.querySelector(kind === 'arm' ? `[data-arm="${id}"]` : `[data-inv="${id}"]`);
    if (again) again.focus({ preventScroll: true });
  }
  renderBuildLine();
}
function renderInvItems(strip) {
  const t = el('span', 'inv-tokens', `🪙 ${fmtN(tokens)}`);
  t.title = 'Tokens: you earn 1 per 100 points banked. Spend them in the shop.';
  // the Shop button already shows the token count; only show the chip alongside owned items
  const anyOwned = ITEMS.some((i) => (inv[i.id] || 0) > 0 || (S.cons && S.cons[i.id]) || (S.armedItems && S.armedItems[i.id]));
  if (anyOwned) strip.appendChild(t);
  ITEMS.forEach((i) => {
    const n = inv[i.id] || 0;
    const tier = tierOf(i);
    const armedN = (S.armedItems && S.armedItems[i.id]) || 0;
    const act = !!(S.cons && S.cons[i.id]) || armedN > 0;
    if (!n && !act) return;
    const canArm = tier === 'consumable' && n > 0 && S.phase === 'chat';
    const state = act ? (tier === 'consumable' ? 'ARMED this round' : 'active this run')
      : tier === 'consumable' ? `stock ${n}${canArm ? ', click to arm' : ', arm it before your next brb'}` : tier === 'run' ? `stock ${n}, switches on when a run starts` : 'owned';
    const label = i.icon + (n > 1 ? `×${n}` : '');
    let c;
    if (canArm) {
      c = el('button', 'inv-item arm', label);
      c.type = 'button';
      c.dataset.arm = i.id;
      c.addEventListener('click', (e) => { e.stopPropagation(); armItem(i.id); });
    } else {
      c = el('span', 'inv-item', label);
      c.tabIndex = 0;
      c.setAttribute('role', 'img');
      c.dataset.inv = i.id;
    }
    c.classList.add('rar-' + (i.rarity || 'common'));
    if (act) c.classList.add('on');
    const tip = itemTip(i, state);
    c.title = tip;
    c.setAttribute('aria-label', tip);
    strip.appendChild(c);
  });
}
// "your build" line: everything the items and run sources give you, charges as current/max
function renderBuildLine() {
  const bl = $('#buildLine');
  if (bl) {
    const m = getMods({ noEnv: true });
    const txt = window.AFK_FX.line(m, m.hits, S.charges);
    bl.hidden = !txt;
    bl.textContent = txt;
    bl.title = txt ? (S.run ? 'Your build: active effects from your loadout, boons, relics and curses. (max) = at the cap.' : 'Your build: active effects from items. (max) = at the cap.') : '';
  }
}
// rogue: gold / alts / relics / boons as small chips with tooltips
function rgInvStrip(strip) {
  const run = S.run;
  const X = RX();
  const t = el('span', 'inv-tokens', `💰 ${run.gold} · ♥ ${run.alts}`);
  t.title = 'Run gold and alt accounts (extra lives).';
  strip.appendChild(t);
  const chip = (it, extra, cls) => {
    const c = el('span', `inv-item ${cls}`, it.icon + (extra > 1 ? `×${extra}` : ''));
    c.tabIndex = 0;
    c.setAttribute('role', 'img');
    const tip = `${it.icon} ${it.name}: ${fxChips(it.effects).join(' · ')}${it.desc ? ` · "${it.desc}"` : ''}`;
    c.title = tip;
    c.setAttribute('aria-label', tip);
    strip.appendChild(c);
  };
  run.relics.forEach((id) => { if (X.relic[id]) chip(X.relic[id], 1, 'rar-legendary on'); });
  Object.keys(run.boons).forEach((id) => { if (X.boon[id]) chip(X.boon[id], run.boons[id], 'rar-' + X.boon[id].rarity); });
}

// ---------- active abilities (safe moments only: never while afk / leaving / judging) ----------
const ABILITIES = [
  { key: 'abFakeInternet', hot: 'q', icon: '📶', name: 'Fake Internet', phases: ['excuse', 'triage'], tip: 'Your next excuse this round lands: -35 suspicion at least, cannot be busted.' },
  { key: 'abMuteHammer', hot: 'w', icon: '🔇', name: 'Mute Hammer', phases: ['chat', 'path'], tip: 'No mic accidents for the rest of this round.' },
  { key: 'abDecoy', hot: 'e', icon: '🎭', name: 'Decoy Status', phases: ['chat', 'path'], tip: 'Suspicion builds half as fast this round.' },
  { key: 'abPingBomb', hot: 'r', icon: '📨', name: 'Reply-All Macro', phases: ['triage'], tip: 'Answers every owed ping at once at a small penalty and skips the timer.' },
];
const abilityPhases = ['chat', 'path', 'excuse', 'triage'];
function abilityBlocked(a) {
  if (a.key === 'abFakeInternet' && S.rd.fakeNet) return 'already armed this round';
  if (a.key === 'abMuteHammer' && S.rd.micOff) return 'already active this round';
  if (a.key === 'abDecoy' && S.rd.decoyOn) return 'already active this round';
  if (a.key === 'abPingBomb' && !owedPings().length) return 'no pings owed';
  return '';
}
function useAbility(key) {
  const a = ABILITIES.find((x) => x.key === key);
  if (!a || !abilityPhases.includes(S.phase) || !(S.charges[key] > 0)) return false;
  if (!a.phases.includes(S.phase)) { toast(`${a.icon} ${a.name}`, `not now: use it ${a.phases.join(' or ')}`); return false; }
  const why = abilityBlocked(a);
  if (why) { toast(`${a.icon} ${a.name}`, why); return false; }
  useCharge(key);
  if (key === 'abFakeInternet') { S.rd.fakeNet = true; sys('📶 Fake Internet armed: your next excuse lands', 'good'); }
  else if (key === 'abMuteHammer') { S.rd.micOff = true; sys('🔇 Mute Hammer: no mic accidents this round', 'good'); }
  else if (key === 'abDecoy') { S.rd.decoyOn = true; S.rd.susMult *= 0.5; sys('🎭 Decoy Status: suspicion builds half as fast this round', 'good'); }
  else if (key === 'abPingBomb') {
    const owed = owedPings();
    post(ME, 'sorry all, replying to everything at once', { ch: S.active });
    owed.forEach((p) => { p.answered = true; p.late = 0.5; });
    sys(`📨 Reply-All: ${owed.length} ping${owed.length > 1 ? 's' : ''} answered at once`, 'good');
    renderInv();
    renderAbilities();
    finishTriage();
    return true;
  }
  sfx.cash();
  renderInv();
  renderAbilities();
  return true;
}
function renderAbilities() {
  const box = $('#abilityStrip');
  if (!box) return;
  const fa = document.activeElement;
  const keep = fa && box.contains(fa) && fa.dataset ? fa.dataset.ab : '';
  box.textContent = '';
  const have = ABILITIES.filter((a) => S.charges && S.charges[a.key] > 0);
  const show = abilityPhases.includes(S.phase) && !S.kicked && have.length > 0;
  box.hidden = !show;
  if (!show) return;
  box.appendChild(el('span', 'ab-label', 'ABILITIES'));
  have.forEach((a) => {
    const n = S.charges[a.key];
    const ok = a.phases.includes(S.phase) && !abilityBlocked(a);
    const b = el('button', 'ability', `[${a.hot.toUpperCase()}] ${a.icon} ${a.name} ×${n}`);
    b.type = 'button';
    b.dataset.ab = a.key;
    b.setAttribute('aria-disabled', ok ? 'false' : 'true');
    b.setAttribute('aria-keyshortcuts', a.hot.toUpperCase());
    const why = ok ? '' : abilityBlocked(a) || `use it ${a.phases.join(' or ')}`;
    const tip = `${a.name}, ${n} charge${n > 1 ? 's' : ''}. ${a.tip}${why ? ` (${why})` : ''}`;
    b.title = tip;
    b.setAttribute('aria-label', tip);
    b.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); useAbility(a.key); });
    box.appendChild(b);
  });
  const st = [];
  if (S.rd.micOff) st.push('🔇 mic muted');
  if (S.rd.fakeNet) st.push('📶 fake internet armed');
  if (S.rd.susMult < 1) st.push(`🎭 suspicion x${Math.round(S.rd.susMult * 100) / 100}`);
  if (st.length) box.appendChild(el('span', 'ab-state', st.join(' · ')));
  if (keep) { const again = box.querySelector(`[data-ab="${keep}"]`); if (again) again.focus({ preventScroll: true }); }
}

const CAT_ORDER = ['gear', 'excuses', 'opsec', 'hustle', 'gadgets', 'gambles'];
const CAT_LABEL = { gear: 'Gear', excuses: 'Excuses', opsec: 'Opsec', hustle: 'Hustle', gadgets: 'Gadgets', gambles: 'Gambles' };
const catOf = (i) => (CAT_ORDER.includes(i.category) ? i.category : 'gear');
// "pts x1 → pts x1.08": what buying one more changes in your build (nothing = already at the cap)
function previewLine(i) {
  const before = getMods({ noEnv: true });
  const after = getMods({ noEnv: true, plus: i.id });
  const bits = [];
  let same = 0;
  Object.keys(i.effects).forEach((k) => {
    if (isCharge(k)) {
      const b = before.chargesMax[k] || 0;
      const a = after.chargesMax[k] || 0;
      if (a !== b) bits.push(`${window.AFK_FX.fmt(k, b)} → ${window.AFK_FX.fmt(k, a)}`); else same++;
    } else if (Math.abs((after[k] || 0) - (before[k] || 0)) > 1e-9) bits.push(`${window.AFK_FX.fmt(k, before[k])} → ${window.AFK_FX.fmt(k, after[k])}`);
    else if (k !== 'secondWindSus') same++;
  });
  if (!bits.length && same) return 'already at the cap: no extra effect';
  return bits.length ? `after buying: ${bits.join(' · ')}` : '';
}
function showShop(o = {}) {
  const cats = CAT_ORDER.filter((c) => ITEMS.some((i) => catOf(i) === c));
  const tabs = ['all'].concat(cats);
  let tab = store.get('shopTab', 'all');
  if (!tabs.includes(tab)) tab = 'all';
  const nodes = [
    el('h1', '', '🛒 Shop', 'modalTitle'),
    el('p', 'tag', 'You earn 1 token per 100 points banked. Permanent gear stays. "This run" items switch on when your next run starts. "One round" items you arm yourself (the chips in the sidebar) before a brb.'),
  ];
  const build = el('div', 'shop-build');
  const bm = getMods({ noEnv: true });
  const bt = window.AFK_FX.line(bm, bm.hits, null);
  build.append(el('div', 'shop-build-title', 'YOUR BUILD'), el('div', 'shop-build-line', bt || 'nothing yet: buy something'), el('div', 'shop-wallet', `🪙 ${fmtN(tokens)}`, 'shopWallet'));
  nodes.push(build);
  if (!ITEMS.length) nodes.push(el('p', 'tag', 'The shop is empty. Add items in content/items.js.'));
  else {
    const tl = el('div', 'shop-tabs');
    tl.setAttribute('role', 'tablist');
    tl.setAttribute('aria-label', 'Shop categories');
    tabs.forEach((id) => {
      const b = el('button', 'shop-tab', id === 'all' ? 'All' : CAT_LABEL[id]);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.tab = id;
      b.setAttribute('aria-selected', String(id === tab));
      b.tabIndex = id === tab ? 0 : -1;
      b.addEventListener('click', () => { store.set('shopTab', id); showShop({ focus: [`.shop-tab[data-tab="${id}"]`] }); });
      tl.appendChild(b);
    });
    tl.addEventListener('keydown', (e) => {
      const bs = Array.from(tl.querySelectorAll('.shop-tab'));
      let i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') i = (i + 1) % bs.length;
      else if (e.key === 'ArrowLeft') i = (i - 1 + bs.length) % bs.length;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = bs.length - 1;
      else return;
      e.preventDefault();
      bs[i].click();
    });
    nodes.push(tl);
  }
  const box = el('div', 'shop');
  box.setAttribute('role', 'tabpanel');
  const list = ITEMS.filter((i) => tab === 'all' || catOf(i) === tab)
    .sort((x, y) => CAT_ORDER.indexOf(catOf(x)) - CAT_ORDER.indexOf(catOf(y)) || x.price - y.price);
  list.forEach((i) => {
    const have = inv[i.id] || 0;
    const full = have >= itemMax(i);
    const tier = tierOf(i);
    const rar = i.rarity || 'common';
    const row = el('div', `shop-item rar-${rar}`);
    const info = el('div', 'shop-info');
    const nm = el('div', 'shop-name');
    nm.append(document.createTextNode(`${i.icon} ${i.name} `), el('span', `rar-badge rar-${rar}`, rar), el('span', 'tier-pill', TIER_LABEL[tier]));
    const chips = el('div', 'shop-chips');
    fxChips(i.effects).forEach((c) => chips.appendChild(el('span', 'fx-chip', c)));
    info.append(nm, el('div', 'shop-desc', i.desc), chips);
    const pv = full ? '' : previewLine(i);
    if (pv) info.appendChild(el('div', 'shop-preview', pv));
    info.appendChild(el('div', 'shop-meta', `${tier === 'permanent' ? 'owned' : 'stock'} ${have}/${itemMax(i)} · ${CAT_LABEL[catOf(i)]}`));
    const b = el('button', 'btn alt shop-buy', full ? 'Owned' : `Buy · ${i.price} 🪙`);
    b.type = 'button';
    b.dataset.item = i.id;
    b.disabled = full || tokens < i.price;
    b.setAttribute('aria-label', full ? `${i.name}: owned` : `Buy ${i.name} for ${i.price} tokens${tokens < i.price ? ' (not enough tokens)' : ''}`);
    b.addEventListener('click', () => { buyItem(i.id); showShop({ focus: [`.shop-buy[data-item="${i.id}"]:not(:disabled)`, '.shop-tab[aria-selected="true"]'] }); });
    row.append(info, b);
    box.appendChild(row);
  });
  nodes.push(box);
  const done = el('button', 'btn', 'Done');
  done.addEventListener('click', closeOverlay);
  nodes.push(done);
  openOverlay('shop', nodes);
  (o.focus || []).some((sel) => { const f = $('#modalCard').querySelector(sel); if (f) f.focus({ preventScroll: true }); return !!f; });
}
function openShop() {
  if (S.phase === 'afk' || S.phase === 'leaving' || S.phase === 'judging') return;
  initAudio();
  if (S.gn) { GN.ledgerView(); return; }
  if (S.run) {
    // rogue has its own run shop between rounds; the classic token shop does not apply
    if (S.phase === 'rg-shop' && S.run.shop) rgShopView({});
    else if ($('#modal').hidden) rgInfo();
    return;
  }
  showShop();
}

window.AFK.modules.push('shop');
