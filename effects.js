/* AFK Simulator effects combiner (pure, no DOM). Exposes window.AFK_FX.
 * Reads the vocabulary from AFK_RESOLVED.effectDefs (owned by loader.js).
 * combine(sources, opts) -> { mods, hits, parts }
 *   sources: [{ effects, n = 1, label, when:{roundType} }]   opts: { ceilingSet: 'classic'|'rogue', roundType }
 *   mult keys multiply value^n, add keys sum value*n, min keys take the lowest, charges keys sum into mods.chargesMax[key].
 *   One clamp per key at the end (never per source). hits lists keys that reached a clamp. Unknown keys are ignored. */
(function (root) {
  'use strict';
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function defs() {
    var r = root.AFK_RESOLVED;
    return (r && r.effectDefs) || {};
  }
  var DEFAULT_MIN = { secondWindSus: 50 };

  function baseMods(D) {
    var m = { chargesMax: {} };
    Object.keys(D).forEach(function (k) {
      var kind = D[k].kind;
      if (kind === 'mult') m[k] = 1;
      else if (kind === 'add') m[k] = 0;
      else if (kind === 'min') m[k] = has(DEFAULT_MIN, k) ? DEFAULT_MIN[k] : null;
      else if (kind === 'charges') m.chargesMax[k] = 0;
    });
    return m;
  }

  function combine(sources, opts) {
    var D = defs();
    opts = opts || {};
    var set = opts.ceilingSet === 'rogue' ? 'R' : 'C';
    var m = baseMods(D);
    var declaredMin = {};
    var parts = [];
    var hits = [];
    (Array.isArray(sources) ? sources : []).forEach(function (src) {
      if (!src || typeof src !== 'object' || !src.effects || typeof src.effects !== 'object') return;
      if (src.when && src.when.roundType && src.when.roundType !== opts.roundType) return;
      var n = typeof src.n === 'number' && isFinite(src.n) && src.n > 0 ? src.n : 1;
      Object.keys(src.effects).forEach(function (k) {
        if (!has(D, k)) return;
        var v = src.effects[k];
        if (typeof v !== 'number' || !isFinite(v)) return;
        var kind = D[k].kind;
        if (kind === 'mult') m[k] *= Math.pow(v, n);
        else if (kind === 'add') m[k] += v * n;
        else if (kind === 'min') { declaredMin[k] = has(declaredMin, k) ? Math.min(declaredMin[k], v) : v; }
        else if (kind === 'charges') m.chargesMax[k] += v * n;
      });
    });
    Object.keys(declaredMin).forEach(function (k) { m[k] = declaredMin[k]; });
    Object.keys(D).forEach(function (k) {
      var d = D[k];
      var b = d[set];
      var clampIt = function (v) {
        var c = Math.min(b[1], Math.max(b[0], v));
        if (c !== v) hits.push(k);
        return c;
      };
      if (d.kind === 'charges') {
        var c = clampIt(m.chargesMax[k]);
        m.chargesMax[k] = d.int ? Math.floor(c + 1e-9) : c;
      } else if (m[k] != null) {
        m[k] = clampIt(m[k]);
        if (d.int) m[k] = Math.floor(m[k] + 1e-9);
      }
    });
    Object.keys(m).forEach(function (k) {
      if (k === 'chargesMax') return;
      var d = D[k];
      if (!d) return;
      if (d.kind === 'mult' && Math.abs(m[k] - 1) > 1e-9) parts.push({ key: k, value: m[k] });
      else if (d.kind === 'add' && m[k] !== 0) parts.push({ key: k, value: m[k] });
    });
    Object.keys(m.chargesMax).forEach(function (k) { if (m.chargesMax[k] > 0) parts.push({ key: k, value: m.chargesMax[k] }); });
    return { mods: m, hits: hits, parts: parts };
  }

  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var sg = function (v) { return v >= 0 ? '+' : '-'; };
  // short chip text for one effect (shop rows, tooltips, rogue cards)
  var FMT = {
    susMult: function (v) { return 'sus x' + r2(v); },
    pointMult: function (v) { return 'pts x' + r2(v); },
    susFlatPerRound: function (v) { return (v < 0 ? 'heal ' + Math.abs(r2(v)) : 'sus +' + r2(v)) + '/round'; },
    pointFlatPerMin: function (v) { return sg(v) + Math.abs(r2(v)) + ' pts/min'; },
    comboKeep: function (v) { return 'streak shield ' + v; },
    comboStartBonus: function (v) { return 'combo starts x' + (1 + v); },
    secondWind: function (v) { return 'second wind ' + v; },
    secondWindSus: function (v) { return 'wind to ' + Math.round(v) + '%'; },
    excuseReroll: function (v) { return 'reroll ' + v; },
    excuseBonus: function (v) { return sg(v) + Math.abs(r2(v)) + ' excuse'; },
    pingShield: function (v) { return 'shield ' + v; },
    triageTime: function (v) { return 'triage x' + r2(v); },
    micEventChance: function (v) { return 'mic x' + r2(v); },
    clipBonusMult: function (v) { return 'clips x' + r2(v); },
    graceMins: function (v) { return sg(v) + Math.abs(r2(v)) + 'm grace'; },
    dragChanceMult: function (v) { return 'drag x' + r2(v); },
    lieBonusMult: function (v) { return 'lie bonus x' + r2(v); },
    tokenMult: function (v) { return 'tokens x' + r2(v); },
    goldMult: function (v) { return 'gold x' + r2(v); },
    startSus: function (v) { return 'start sus +' + r2(v); },
    susCap: function (v) { return 'kick at ' + (100 + Math.round(v)); },
    abFakeInternet: function (v) { return 'fake internet ' + v; },
    abMuteHammer: function (v) { return 'mute hammer ' + v; },
    abDecoy: function (v) { return 'decoy ' + v; },
    abPingBomb: function (v) { return 'reply-all ' + v; }
  };
  function fmt(key, value) {
    return has(FMT, key) && typeof value === 'number' ? FMT[key](value) : String(key);
  }
  var ICONS = { secondWind: '💨', pingShield: '🛡', excuseReroll: '🔁', comboKeep: '🔥', abFakeInternet: '📶', abMuteHammer: '🔇', abDecoy: '🎭', abPingBomb: '📨' };
  var SHORT = { secondWind: 'wind', pingShield: 'shield', excuseReroll: 'reroll', comboKeep: 'streak', abFakeInternet: 'net', abMuteHammer: 'mute', abDecoy: 'decoy', abPingBomb: 'reply-all' };
  // summary line for the build strip. charges maps key -> current charges (shown as cur/max); hits keys get "(max)".
  function line(mods, hits, charges) {
    if (!mods) return '';
    var D = defs();
    var out = [];
    var hit = {};
    (hits || []).forEach(function (k) { hit[k] = true; });
    var tag = function (k) { return hit[k] ? ' (max)' : ''; };
    var order = ['pointMult', 'susMult', 'graceMins', 'pointFlatPerMin', 'susFlatPerRound', 'excuseBonus', 'triageTime', 'micEventChance', 'clipBonusMult', 'dragChanceMult', 'lieBonusMult', 'tokenMult', 'goldMult', 'comboStartBonus', 'startSus', 'susCap'];
    order.forEach(function (k) {
      if (!D[k] || mods[k] == null) return;
      var neutral = D[k].kind === 'mult' ? Math.abs(mods[k] - 1) < 1e-9 : mods[k] === 0;
      if (neutral) return;
      out.push(fmt(k, mods[k]) + tag(k));
    });
    var cm = mods.chargesMax || {};
    var keys = Object.keys(D).filter(function (k) { return D[k].kind === 'charges'; });
    keys.forEach(function (k) {
      var cur = charges && typeof charges[k] === 'number' ? charges[k] : null;
      var max = Math.max(cm[k] || 0, cur || 0);
      if (!max && !cur) return;
      var icon = ICONS[k] || '';
      var nm = SHORT[k] || k;
      out.push((icon ? icon + ' ' : '') + nm + ' ' + (cur != null ? cur + '/' + max : max) + tag(k));
    });
    return out.join(' · ');
  }
  root.AFK_FX = { combine: combine, fmt: fmt, line: line };
})(typeof window !== 'undefined' ? window : globalThis);
