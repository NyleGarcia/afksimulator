/*
 * shareimg.js - fancy PNG score card for the "Copy for Discord" flow.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Pure canvas, no deps. Colors come from the live theme CSS vars so the card matches the chosen theme.
 * Entry points (looked up lazily at call time): shareImageButtons(getSpec), classicCardSpec(entry), rogueCardSpec(entry).
 * A spec is { kind, name, big, bigLabel, headline, chips:[[value,label]], tags:[string], foot }. All strings are
 * drawn as canvas text (never HTML), so no escaping is needed; lengths are clamped here.
 */
const CARD_W = 1200;
const CARD_H = 630;

function cardTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
  return { bg: v('--bg', '#2c2e34'), bg2: v('--bg-2', '#25272c'), bg3: v('--bg-3', '#1c1d21'), text: v('--text', '#e3e5e8'), muted: v('--muted', '#a9adb5'), accent: v('--accent', '#6b74f0'), idle: v('--idle', '#f0b232'), ok: v('--ok', '#3ba55d'), danger: v('--danger', '#ed4245') };
}
const cardClip = (s, n) => { s = String(s == null ? '' : s).replace(/[\u0000-\u001f​-‏‪-‮⁦-⁩]/g, ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

function cardRoundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
// shrink a font until the text fits maxW
function cardFit(g, text, maxW, size, weight, family) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 18);
  return g.font;
}

function drawShareCard(spec) {
  const T = cardTheme();
  const cv = document.createElement('canvas');
  cv.width = CARD_W;
  cv.height = CARD_H;
  const g = cv.getContext('2d');
  const F = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Color Emoji", sans-serif';

  // background: deep gradient + soft glows
  const bg = g.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, T.bg3);
  bg.addColorStop(1, T.bg);
  g.fillStyle = bg;
  g.fillRect(0, 0, CARD_W, CARD_H);
  const glow = (x, y, r, col, a) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'transparent');
    g.globalAlpha = a;
    g.fillStyle = rg;
    g.fillRect(0, 0, CARD_W, CARD_H);
    g.globalAlpha = 1;
  };
  glow(1050, 80, 520, T.accent, 0.35);
  glow(120, 600, 460, T.idle, 0.16);
  // zzz watermark
  g.save();
  g.font = `900 260px ${F}`;
  g.fillStyle = T.text;
  g.globalAlpha = 0.04;
  g.textAlign = 'right';
  g.fillText('zzz', CARD_W - 40, CARD_H - 60);
  g.restore();

  // card frame
  g.lineWidth = 2;
  g.strokeStyle = T.accent;
  g.globalAlpha = 0.55;
  cardRoundRect(g, 24, 24, CARD_W - 48, CARD_H - 48, 28);
  g.stroke();
  g.globalAlpha = 1;

  // header: logo pill + kind tag
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillStyle = T.text;
  g.font = `800 30px ${F}`;
  g.fillText('\u{1F4A4} AFK SIMULATOR', 64, 84);
  const kind = cardClip(spec.kind || 'CLASSIC', 24).toUpperCase();
  g.font = `700 20px ${F}`;
  const kw = g.measureText(kind).width + 36;
  g.fillStyle = T.accent;
  cardRoundRect(g, CARD_W - 64 - kw, 56, kw, 38, 19);
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.fillText(kind, CARD_W - 64 - kw / 2, 82);
  g.textAlign = 'left';

  // name + headline
  g.fillStyle = T.text;
  g.font = cardFit(g, cardClip(spec.name, 40), 620, 54, 800, F);
  g.fillText(cardClip(spec.name, 40), 64, 176);
  g.fillStyle = T.muted;
  g.font = `500 26px ${F}`;
  g.fillText(cardClip(spec.headline, 60), 64, 216);

  // big score
  const big = cardClip(spec.big, 12);
  g.font = cardFit(g, big, 610, 170, 900, F);
  const gr = g.createLinearGradient(64, 250, 64, 400);
  gr.addColorStop(0, T.idle);
  gr.addColorStop(1, T.accent);
  g.fillStyle = gr;
  g.shadowColor = T.idle;
  g.shadowBlur = 40;
  g.fillText(big, 60, 380);
  g.shadowBlur = 0;
  g.fillStyle = T.muted;
  g.font = `700 24px ${F}`;
  g.fillText(cardClip(spec.bigLabel || 'POINTS', 30).toUpperCase().split('').join(' '), 68, 420);

  // stat chips (right column, 2 x 3 grid)
  const chips = Array.isArray(spec.chips) ? spec.chips.slice(0, 6) : [];
  const cw = 210;
  const ch = 96;
  chips.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 700 + col * (cw + 14);
    const y = 130 + row * (ch + 14);
    g.fillStyle = T.bg2;
    g.globalAlpha = 0.9;
    cardRoundRect(g, x, y, cw, ch, 16);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = T.text;
    g.font = cardFit(g, cardClip(c[0], 14), cw - 32, 38, 800, F);
    g.fillText(cardClip(c[0], 14), x + 18, y + 48);
    g.fillStyle = T.muted;
    g.font = `600 17px ${F}`;
    g.fillText(cardClip(c[1], 22).toUpperCase(), x + 18, y + 78);
  });

  // tags row (crew, relics, achievements...) as pills
  const tags = Array.isArray(spec.tags) ? spec.tags.filter(Boolean).slice(0, 4) : [];
  let tx = 64;
  g.font = `600 21px ${F}`;
  tags.forEach((t) => {
    const s = cardClip(t, 38);
    const w = g.measureText(s).width + 30;
    if (tx + w > CARD_W - 64) return;
    g.fillStyle = T.bg2;
    cardRoundRect(g, tx, 462, w, 40, 20);
    g.fill();
    g.fillStyle = T.text;
    g.fillText(s, tx + 15, 489);
    tx += w + 12;
  });

  // footer
  g.fillStyle = T.accent;
  g.globalAlpha = 0.5;
  g.fillRect(64, 534, CARD_W - 128, 2);
  g.globalAlpha = 1;
  g.fillStyle = T.muted;
  g.font = `500 22px ${F}`;
  g.fillText(cardClip(spec.foot || '', 70), 64, 576);
  g.textAlign = 'right';
  g.fillStyle = T.text;
  g.font = `700 24px ${F}`;
  g.fillText(SITE_URL.replace(/^https?:\/\//, ''), CARD_W - 64, 576);
  return cv;
}

function classicCardSpec(e) {
  const x = e || { name: ME.name, s: S.score, r: S.round, l: S.longest, c: S.combo, p: S.longestPath, m: S.longestMode, k: packId, f: favCh(), cw: (S.crewNames || []).slice(0, 3), cx: Math.max(0, (S.crewNames || []).length - 3) };
  const pm = x.k && x.k !== 'classic' ? metaOf(x.k) : null;
  const srv = pm ? (pm.server && pm.server.name ? pm.server.name : pm.name) : 'the boys';
  const cw = window.AFK_ROSTER && Array.isArray(x.cw) ? x.cw.slice(0, 3).map((n) => window.AFK_ROSTER.sanitizeCrewName(n)).filter(Boolean) : [];
  const cx = Number.isInteger(x.cx) && x.cx > 0 && x.cx <= 8 ? x.cx : 0;
  const cmb = safeInt(x.c, 0, 9999, 0);
  const chips = [[fmtMins(x.l || 0), 'longest AFK'], [String(safeInt(x.r, 1, 9999, 1)), 'round']];
  if (cmb) chips.push([`x${cmb}`, 'combo']);
  chips.push([`${achCount()}/${Object.keys(ACH).length}`, 'achievements']);
  if (x.p && typeof x.p === 'string') chips.push([cardClip(x.p.toLowerCase(), 14), MODES.includes(x.m) ? `${x.m} server` : 'path']);
  if (typeof x.f === 'string' && CH_ID.test(x.f)) chips.push([`#${cardClip(x.f, 12)}`, 'fav channel']);
  return {
    kind: 'Classic', name: sanitizeName(x.name), big: fmtN(x.s), bigLabel: 'points',
    headline: `went AFK in ${srv}`,
    chips,
    tags: [cw.length ? `with ${cw.join(', ')}${cx ? `, +${cx}` : ''}` : '', itemCount() ? `${itemCount()} item${itemCount() === 1 ? '' : 's'}` : ''],
    foot: 'Say brb. Don\'t come back.',
  };
}

function rogueCardSpec(e) {
  const X = RX();
  const seed = window.AFK_RNG.normSeed(e.seed) || 'RANDOM';
  const asc = Math.floor(clamp(+e.asc || 0, 0, 5));
  const ld = X.loadout[e.ld] ? X.loadout[e.ld].name : 'Intern';
  const act = Math.floor(clamp(+e.act || 1, 1, 3));
  const bosses = Math.floor(clamp(+e.bc || 0, 0, 3));
  const cw = window.AFK_ROSTER && Array.isArray(e.cw) ? e.cw.slice(0, 3).map((n) => window.AFK_ROSTER.sanitizeCrewName(n)).filter(Boolean) : [];
  const relics = Array.isArray(e.relics) ? e.relics.slice(0, 3).map((r) => String(r)) : [];
  return {
    kind: e.win ? 'Rogue · Cleared' : 'Rogue', name: sanitizeName(e.name), big: fmtN(e.s), bigLabel: 'points',
    headline: e.win ? 'cleared the whole run \u{1F3C6}' : `fell in act ${act}, round ${Math.floor(clamp(+e.r || 1, 1, 12))}`,
    chips: [[`A${asc}`, 'ascension'], [ld, 'loadout'], [`act ${act}`, e.win ? 'cleared' : 'reached'], [`${bosses}/3`, 'bosses'], [seed, 'seed']],
    tags: [...relics, cw.length ? `with ${cw.join(', ')}` : ''],
    foot: 'Play this seed at',
  };
}

function gnCardSpec(e, day, label) {
  return {
    kind: 'Game Night', name: sanitizeName(e.n || ME.name), big: fmtN(e.s || 0), bigLabel: 'points',
    headline: cardClip(`${day} never happens`, 40),
    chips: [[String(Number.isFinite(e.w) ? e.w : 0), 'weeks'], [String(Number.isFinite(e.cs) ? e.cs : 0), 'best streak'], [Number.isFinite(e.st) && Number.isFinite(e.l) ? `${e.st}/${e.l}` : '-', 'strikes'], [Number.isFinite(e.e) && e.e > 0 ? String(e.e) : '-', 'best lie (elab)']],
    tags: [label ? cardClip(label, 38) : '', typeof e.x === 'string' && e.x ? `"${cardClip(e.x.replace(/["{}]/g, ''), 34)}"` : ''],
    foot: 'The group chat has questions.',
  };
}

function cardBlob(spec) {
  return new Promise((res, rej) => {
    try { drawShareCard(spec).toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'); } catch (err) { rej(err); }
  });
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
// two buttons: copy the PNG to the clipboard (paste straight into Discord), or save it as a file
function shareImageButtons(getSpec) {
  const row = el('div', 'btn-row');
  const file = () => `afk-simulator-${Date.now().toString(36)}.png`;
  const cp = el('button', 'btn alt', 'Copy image', 'shareImgCopy');
  cp.addEventListener('click', async () => {
    let blob;
    try { blob = await cardBlob(getSpec()); } catch { toast('Image failed', 'Could not draw the card.'); return; }
    try {
      if (!(navigator.clipboard && window.ClipboardItem)) throw new Error('noclip');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Image copied', 'Paste it in Discord.');
    } catch {
      saveBlob(blob, file());
      toast('Saved image', 'Clipboard blocked, so it downloaded. Drop it in Discord.');
    }
  });
  const sv = el('button', 'btn alt', 'Save image', 'shareImgSave');
  sv.addEventListener('click', async () => {
    try { saveBlob(await cardBlob(getSpec()), file()); toast('Saved image', 'Drop it in Discord.'); } catch { toast('Image failed', 'Could not draw the card.'); }
  });
  row.append(cp, sv);
  return row;
}
