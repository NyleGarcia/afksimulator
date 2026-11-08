/* AFK Simulator content loader + validator.
 * Reads window.AFK_CONTENT (filled by the files in content/), checks every entry, skips bad ones with a
 * console.warn that names the content type, the entry id and the field, and publishes the clean result as
 * window.AFK_RESOLVED. Never throws. game.js falls back to built-in defaults for anything missing.
 * Add ?debug=1 to the URL to see a console dump of the loaded content counts.
 */
(function () {
  'use strict';

  var C = (window.AFK_CONTENT && typeof window.AFK_CONTENT === 'object') ? window.AFK_CONTENT : {};
  var MODES = ['afk-timeout', 'no-timeout'];
  var ROLES = ['friend', 'resident', 'bot'];
  // The ONE effects vocabulary (rogue_spec section 3). kind: mult | add | min | charges. single = bounds one source may declare;
  // C / R = total clamp after combining, for classic / rogue. effects.js combines + clamps; items, boons, relics and curses all use it.
  var D = function (kind, single, C, R, int) { return { kind: kind, single: single, C: C, R: R, int: !!int }; };
  var CH = function (s, C, R) { return D('charges', s, C, R, true); };
  var EFFECT_DEFS = {
    susMult: D('mult', [0.5, 2], [0.55, 2], [0.4, 2.5]),
    susFlatPerRound: D('add', [-10, 10], [-15, 15], [-20, 20]),
    pointMult: D('mult', [0.5, 1.5], [0.6, 2], [0.6, 3]),
    pointFlatPerMin: D('add', [0, 4], [0, 10], [0, 14]),
    comboKeep: CH([1, 2], [0, 3], [0, 4]),
    comboStartBonus: D('add', [0, 1], [0, 1], [0, 2], true),
    secondWind: CH([1, 2], [0, 3], [0, 4]),
    secondWindSus: D('min', [25, 70], [25, 70], [25, 70]),
    excuseReroll: CH([1, 2], [0, 4], [0, 6]),
    excuseBonus: D('add', [-10, 25], [0, 60], [0, 80]),
    pingShield: CH([1, 3], [0, 6], [0, 10]),
    triageTime: D('mult', [0.6, 1.5], [0.7, 2], [0.6, 2.2]),
    micEventChance: D('mult', [0.1, 3], [0.1, 3], [0.1, 3]),
    clipBonusMult: D('mult', [1, 3], [1, 3], [1, 3]),
    graceMins: D('add', [-3, 6], [0, 12], [0, 14]),
    dragChanceMult: D('mult', [0.4, 3], [0.25, 3], [0.25, 3]),
    lieBonusMult: D('mult', [1, 2.5], [0.5, 3], [0.5, 3.5]),
    tokenMult: D('mult', [1, 1.5], [1, 2], [1, 2]),
    goldMult: D('mult', [1, 2], [1, 2], [1, 2.5]),
    startSus: D('add', [0, 30], [0, 40], [0, 40]),
    susCap: D('add', [0, 20], [0, 30], [0, 40]),
    abFakeInternet: CH([1, 2], [0, 3], [0, 4]),
    abMuteHammer: CH([1, 2], [0, 3], [0, 4]),
    abDecoy: CH([1, 2], [0, 3], [0, 4]),
    abPingBomb: CH([1, 2], [0, 3], [0, 4])
  };
  var CATEGORIES = ['gear', 'excuses', 'opsec', 'hustle', 'gadgets', 'gambles'];
  var TIERS = ['permanent', 'run', 'consumable'];
  var RARITIES = ['common', 'rare', 'legendary'];
  var KNOWN_TOKENS = { me: 1, p: 1, t: 1, friend: 1 };
  var TRAITS = ['roaster', 'hype', 'chill', 'rival', 'chaotic'];
  var CONTENT_VERSION = 5;
  var warnings = [];
  var ctx = ''; // set to '[pack-id] ' while a pack is being validated

  function warn(kind, id, field, msg) {
    var m = '[afk-content] ' + ctx + kind + ' "' + id + '"' + (field ? ' field "' + field + '"' : '') + ': ' + msg;
    warnings.push(m);
    try { console.warn(m); } catch (e) { /* no console */ }
  }

  var isObj = function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v); };
  var isNum = function (v) { return typeof v === 'number' && isFinite(v); };
  var isStr = function (v, max) { return typeof v === 'string' && v.trim().length > 0 && v.length <= (max || 200); };
  var BAD_KEY = /^(__proto__|constructor|prototype)$/;
  var isId = function (v) { return typeof v === 'string' && /^[a-z0-9_-]{1,32}$/i.test(v) && !BAD_KEY.test(v); };
  var isColor = function (v) { return typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v); };
  var cleanName = function (s) { return String(s).replace(/[\u0000-\u001f\u007f-\u009f@{}]/g, '').trim(); };

  function strList(kind, id, field, v, max) {
    if (!Array.isArray(v)) { warn(kind, id, field, 'must be an array of strings; ignored'); return null; }
    var out = v.filter(function (x) { return isStr(x, max || 200); });
    if (out.length !== v.length) warn(kind, id, field, (v.length - out.length) + ' bad string(s) dropped (must be non-empty text under ' + (max || 200) + ' chars)');
    return out;
  }

  // run fn over each entry of arr; returns the entries fn kept. fn(entry, id) returns a clean entry or null.
  function list(kind, arr, fn) {
    if (arr == null) return [];
    if (!Array.isArray(arr)) { warn(kind, '*', '', 'must be an array; ignoring the whole list'); return []; }
    var seen = {};
    var out = [];
    arr.forEach(function (e, i) {
      if (!isObj(e)) { warn(kind, '#' + i, '', 'not an object; skipped'); return; }
      if (!isId(e.id)) { warn(kind, e.id == null ? '#' + i : String(e.id).slice(0, 40), 'id', 'missing or invalid (use letters, digits, - or _, max 32); skipped'); return; }
      if (seen[e.id]) { warn(kind, e.id, 'id', 'duplicate id; skipped'); return; }
      var clean = null;
      try { clean = fn(e, e.id); } catch (err) { warn(kind, e.id, '', 'could not be read (' + err.message + '); skipped'); }
      if (clean) { seen[e.id] = true; out.push(clean); }
    });
    return out;
  }

  // warn (never drop) when a hand-written line uses a {token} the game does not fill. Pack text uses generator slots, so it is skipped.
  var TOKEN_FIND = /\{([A-Za-z_]\w*)(?::[^{}]*)?\}/g;
  function lintTokens(kind, id, field, text) {
    if (ctx || typeof text !== 'string') return;
    var m;
    TOKEN_FIND.lastIndex = 0;
    while ((m = TOKEN_FIND.exec(text))) {
      if (!Object.prototype.hasOwnProperty.call(KNOWN_TOKENS, m[1])) warn(kind, id, field, 'unknown token {' + m[1] + '} (known: ' + Object.keys(KNOWN_TOKENS).map(function (x) { return '{' + x + '}'; }).join(' ') + '); it will be stripped');
    }
  }

  // ---------- characters ----------
  function dig(kind, cid, d, i) {
    var where = cid + '.digs[' + i + ']';
    if (!isObj(d) || !isStr(d.text)) { warn(kind, where, 'text', 'missing or not text; dig skipped'); return null; }
    var out = { text: d.text.trim(), when: {} };
    lintTokens(kind, where, 'text', out.text);
    var w = d.when;
    if (w == null) return out;
    if (!isObj(w)) { warn(kind, where, 'when', 'must be an object; conditions ignored'); return out; }
    ['susMin', 'susMax'].forEach(function (k) {
      if (w[k] == null) return;
      if (isNum(w[k]) && w[k] >= 0 && w[k] <= 100) out.when[k] = w[k]; else warn(kind, where, 'when.' + k, 'must be a number 0-100; ignored');
    });
    if (w.minLateRatio != null) {
      if (isNum(w.minLateRatio) && w.minLateRatio >= 0) out.when.minLateRatio = w.minLateRatio; else warn(kind, where, 'when.minLateRatio', 'must be a number >= 0; ignored');
    }
    if (w.afterKick != null) {
      if (typeof w.afterKick === 'boolean') out.when.afterKick = w.afterKick; else warn(kind, where, 'when.afterKick', 'must be true or false; ignored');
    }
    if (w.paths != null) {
      var p = strList(kind, where, 'when.paths', w.paths, 32);
      if (p && p.length) out.when.paths = p;
    }
    if (w.modes != null) {
      var m = strList(kind, where, 'when.modes', w.modes, 20);
      if (m) {
        var good = m.filter(function (x) { return MODES.indexOf(x) >= 0; });
        if (good.length !== m.length) warn(kind, where, 'when.modes', 'unknown mode(s) dropped (use ' + MODES.join(' or ') + ')');
        if (good.length) out.when.modes = good;
        else if (m.length) { warn(kind, where, 'when.modes', 'no valid modes left; dig skipped'); return null; }
      }
    }
    return out;
  }

  function character(e, id) {
    var k = 'character';
    if (!isStr(e.name, 40) || !cleanName(e.name)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    var out = { id: id, name: cleanName(e.name).slice(0, 24), color: '#9aa0a6', role: 'friend', tags: [], rival: false, lines: {}, digs: [] };
    if (isColor(e.color)) out.color = e.color; else warn(k, id, 'color', 'missing or not a #hex color; using grey');
    if (e.role != null) {
      if (ROLES.indexOf(e.role) >= 0) out.role = e.role; else { warn(k, id, 'role', 'must be ' + ROLES.join(', ') + '; skipped'); return null; }
    }
    if (e.tags != null) { var t = strList(k, id, 'tags', e.tags, 40); if (t) out.tags = t; }
    if (e.rival != null) { if (typeof e.rival === 'boolean') out.rival = e.rival; else warn(k, id, 'rival', 'must be true or false; ignored'); }
    if (e.lines != null) {
      if (!isObj(e.lines)) warn(k, id, 'lines', 'must be an object of arrays; ignored');
      else Object.keys(e.lines).forEach(function (key) {
        if (!(/^[a-zA-Z]{1,24}$/.test(key) || /^gn_(impressed|neutral|exasperated|detective|flake)$/.test(key)) || BAD_KEY.test(key)) { warn(k, id, 'lines.' + key, 'bad key; ignored'); return; }
        var arr = strList(k, id, 'lines.' + key, e.lines[key]);
        if (arr && arr.length) { if (key.indexOf('gn_') !== 0) arr.forEach(function (x) { lintTokens(k, id, 'lines.' + key, x); }); out.lines[key] = arr; }
      });
    }
    if (e.digs != null) {
      if (!Array.isArray(e.digs)) warn(k, id, 'digs', 'must be an array; ignored');
      else e.digs.forEach(function (d, i) { var c = dig(k, id, d, i); if (c) out.digs.push(c); });
    }
    if (out.role === 'resident') {
      out.status = [];
      if (e.status != null) { var s = strList(k, id, 'status', e.status, 60); if (s) out.status = s; }
      ['timerMin', 'timerMax'].forEach(function (f) {
        if (e[f] == null) return;
        if (isNum(e[f]) && e[f] >= 0 && e[f] <= 1e6) out[f] = Math.floor(e[f]); else warn(k, id, f, 'must be a number 0-1000000; using default');
      });
      if (out.timerMin != null && out.timerMax != null && out.timerMin > out.timerMax) {
        warn(k, id, 'timerMin', 'is larger than timerMax; using defaults');
        delete out.timerMin; delete out.timerMax;
      }
      if (e.timerDayMins != null) {
        if (isNum(e.timerDayMins) && e.timerDayMins >= 1) out.timerDayMins = e.timerDayMins; else warn(k, id, 'timerDayMins', 'must be a number >= 1; using default');
      }
    }
    return out;
  }

  // ---------- channels ----------
  function channel(e, id) {
    var k = 'channel';
    if (!isStr(e.name, 40) || !cleanName(e.name)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (e.type !== 'text' && e.type !== 'voice') { warn(k, id, 'type', 'must be "text" or "voice"; skipped'); return null; }
    var out = { id: id, name: cleanName(e.name).slice(0, 24), type: e.type, icon: e.type === 'text' ? '#' : '🔊', isAfk: false, members: [], mods: {}, desc: '' };
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji or symbol); using default'); }
    if (e.isAfk != null) {
      if (typeof e.isAfk !== 'boolean') warn(k, id, 'isAfk', 'must be true or false; ignored');
      else if (e.isAfk && e.type !== 'voice') warn(k, id, 'isAfk', 'only voice channels can be the AFK channel; ignored');
      else out.isAfk = e.isAfk;
    }
    if (e.members != null) { var m = strList(k, id, 'members', e.members, 32); if (m) out.members = m; }
    if (e.mods != null) {
      if (!isObj(e.mods)) warn(k, id, 'mods', 'must be an object; ignored');
      else ['susMult', 'pointMult'].forEach(function (f) {
        if (e.mods[f] == null) return;
        if (isNum(e.mods[f]) && e.mods[f] >= 0.1 && e.mods[f] <= 5) out.mods[f] = e.mods[f]; else warn(k, id, 'mods.' + f, 'must be a number between 0.1 and 5; ignored');
      });
    }
    if (e.desc != null) { if (isStr(e.desc, 160)) out.desc = e.desc.trim(); else warn(k, id, 'desc', 'must be text under 160 chars; ignored'); }
    textChannel(e, id, out);
    return out;
  }

  // chat-channel gameplay fields (text channels only; see CONTENT.md "Channels"). Defaults are filled in by game.js.
  function textChannel(e, id, out) {
    var k = 'channel';
    var fields = ['visibility', 'busyness', 'muted', 'muteDelay', 'slowmodeSec', 'replies'];
    if (e.type !== 'text') {
      fields.forEach(function (f) { if (e[f] != null) warn(k, id, f, 'only text channels use this; ignored'); });
      return;
    }
    ['visibility', 'busyness'].forEach(function (f) {
      if (e[f] == null) return;
      if (isNum(e[f]) && e[f] >= 0 && e[f] <= 1) out[f] = e[f]; else warn(k, id, f, 'must be a number between 0 and 1; ignored');
    });
    if (e.muted != null) { if (typeof e.muted === 'boolean') out.muted = e.muted; else warn(k, id, 'muted', 'must be true or false; ignored'); }
    if (e.muteDelay != null) {
      var md = e.muteDelay;
      if (Array.isArray(md) && md.length === 2 && isNum(md[0]) && isNum(md[1]) && md[0] >= 0 && md[1] >= md[0] && md[1] <= 120) out.muteDelay = [md[0], md[1]];
      else warn(k, id, 'muteDelay', 'must be [min, max] game minutes, 0 <= min <= max <= 120; ignored');
    }
    if (e.slowmodeSec != null) {
      if (isNum(e.slowmodeSec) && e.slowmodeSec >= 0 && e.slowmodeSec <= 300) out.slowmodeSec = e.slowmodeSec; else warn(k, id, 'slowmodeSec', 'must be a number of seconds, 0-300; ignored');
    }
    if (e.replies != null) {
      if (!Array.isArray(e.replies)) { warn(k, id, 'replies', 'must be an array of {t, r}; ignored'); return; }
      var reps = [];
      e.replies.slice(0, 8).forEach(function (r, i) {
        var t = typeof r === 'string' ? r : (isObj(r) ? r.t : null);
        if (!isStr(t, 60)) { warn(k, id, 'replies[' + i + ']', 'needs text (t) under 60 chars; skipped'); return; }
        var rr = [1, 6];
        if (isObj(r) && r.r != null) {
          if (Array.isArray(r.r) && r.r.length === 2 && isNum(r.r[0]) && isNum(r.r[1]) && r.r[0] <= r.r[1] && r.r[0] >= -10 && r.r[1] <= 15) rr = [r.r[0], r.r[1]];
          else warn(k, id, 'replies[' + i + '].r', 'must be [min, max] suspicion removed, -10..15; using [1, 6]');
        }
        reps.push({ t: t.trim(), r: rr });
      });
      if (reps.length) out.replies = reps; else warn(k, id, 'replies', 'no valid replies left; the default replies are used');
    }
  }

  // ---------- items ----------
  // validate an effects object against EFFECT_DEFS (single-source bounds). Returns the clean object ({} when nothing is left).
  function effectsObj(k, id, raw, field) {
    var fx = {};
    Object.keys(raw).forEach(function (f) {
      var v = raw[f];
      var w = field + '.' + f;
      if (BAD_KEY.test(f) || !Object.prototype.hasOwnProperty.call(EFFECT_DEFS, f)) { warn(k, id, w, 'unknown effect (use ' + Object.keys(EFFECT_DEFS).join(', ') + '); ignored'); return; }
      var def = EFFECT_DEFS[f];
      if (!isNum(v)) { warn(k, id, w, 'must be a number; ignored'); return; }
      if (def.int && Math.floor(v) !== v) { warn(k, id, w, 'must be a whole number; ignored'); return; }
      if (v < def.single[0] || v > def.single[1]) { warn(k, id, w, 'must be between ' + def.single[0] + ' and ' + def.single[1] + '; ignored'); return; }
      fx[f] = v;
    });
    return fx;
  }

  function item(e, id) {
    var k = 'item';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (!isNum(e.price) || e.price < 0 || e.price > 9999 || Math.floor(e.price) !== e.price) { warn(k, id, 'price', 'must be a whole number 0-9999; skipped'); return null; }
    if (!isObj(e.effects)) { warn(k, id, 'effects', 'missing or not an object; skipped'); return null; }
    var fx = effectsObj(k, id, e.effects, 'effects');
    if (!Object.keys(fx).length) { warn(k, id, 'effects', 'no valid effects left; skipped'); return null; }
    var out = { id: id, icon: '📦', name: e.name.trim(), desc: '', price: e.price, effects: fx, stackable: false, max: 1, consumable: false, category: 'gear', tier: 'permanent', rarity: 'common', tags: [] };
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    if (e.desc != null) { if (isStr(e.desc, 200)) out.desc = e.desc.trim(); else warn(k, id, 'desc', 'must be text under 200 chars; ignored'); }
    ['stackable', 'consumable'].forEach(function (f) {
      if (e[f] == null) return;
      if (typeof e[f] === 'boolean') out[f] = e[f]; else warn(k, id, f, 'must be true or false; ignored');
    });
    // tier: permanent | run | consumable. The legacy flag consumable:true means tier "run" (used up when a run starts, lasts the run)
    if (out.consumable) out.tier = 'run';
    if (e.tier != null) {
      if (TIERS.indexOf(e.tier) >= 0) { if (out.consumable && e.tier === 'permanent') warn(k, id, 'consumable', 'conflicts with tier "permanent"; tier wins'); out.tier = e.tier; }
      else warn(k, id, 'tier', 'must be ' + TIERS.join(', ') + '; using ' + out.tier);
    }
    out.consumable = out.tier !== 'permanent';
    if (e.category != null) { if (CATEGORIES.indexOf(e.category) >= 0) out.category = e.category; else warn(k, id, 'category', 'must be ' + CATEGORIES.join(', ') + '; using gear'); }
    if (e.rarity != null) { if (RARITIES.indexOf(e.rarity) >= 0) out.rarity = e.rarity; else warn(k, id, 'rarity', 'must be ' + RARITIES.join(', ') + '; using common'); }
    if (e.tags != null) {
      if (!Array.isArray(e.tags)) warn(k, id, 'tags', 'must be an array; ignored');
      else {
        var tg = e.tags.filter(function (x) { return typeof x === 'string' && /^[a-z-]{1,16}$/.test(x); });
        if (tg.length !== e.tags.length) warn(k, id, 'tags', 'tags must be lowercase letters or - (max 16 chars); bad ones dropped');
        out.tags = tg.slice(0, 6);
      }
    }
    if (out.stackable) out.max = 5;
    if (e.max != null) {
      if (isNum(e.max) && e.max >= 1 && e.max <= 99 && Math.floor(e.max) === e.max) { if (out.stackable) out.max = e.max; else warn(k, id, 'max', 'only used when stackable is true; ignored'); }
      else warn(k, id, 'max', 'must be a whole number 1-99; ignored');
    }
    return out;
  }

  // ---------- roster traits (content/roster-traits.js -> AFK_CONTENT.roster) ----------
  function rosterContent(raw) {
    var out = { palette: [], traits: {} };
    if (raw == null) return out;
    if (!isObj(raw)) { warn('roster', '*', '', 'must be an object { palette, traits }; ignored'); return out; }
    if (raw.palette != null) {
      if (!Array.isArray(raw.palette)) warn('roster', 'palette', '', 'must be an array of #hex colors; ignored');
      else out.palette = raw.palette.filter(function (c) { return isColor(c); }).slice(0, 24);
      if (Array.isArray(raw.palette) && out.palette.length !== raw.palette.length) warn('roster', 'palette', '', 'bad color(s) dropped');
      if (out.palette.length && out.palette.length < 4) { warn('roster', 'palette', '', 'needs at least 4 colors; using the built-in palette'); out.palette = []; }
    }
    if (raw.traits != null) {
      if (!isObj(raw.traits)) warn('roster', 'traits', '', 'must be an object; ignored');
      else Object.keys(raw.traits).forEach(function (tid) {
        if (TRAITS.indexOf(tid) < 0) { warn('roster', tid, '', 'unknown trait (use ' + TRAITS.join(', ') + '); skipped'); return; }
        var t = raw.traits[tid];
        if (!isObj(t)) { warn('roster', tid, '', 'not an object; skipped'); return; }
        var o = { tags: [], digRate: null, lines: {}, digs: [], quiet: false, wildcard: false };
        if (t.tags != null) { var tg = strList('roster', tid, 'tags', t.tags, 40); if (tg) o.tags = tg.slice(0, 6); }
        if (t.digRate != null) { if (isNum(t.digRate) && t.digRate >= 0 && t.digRate <= 1) o.digRate = t.digRate; else warn('roster', tid, 'digRate', 'must be a number 0-1; ignored'); }
        ['quiet', 'wildcard'].forEach(function (f) {
          if (t[f] == null) return;
          if (typeof t[f] === 'boolean') o[f] = t[f]; else warn('roster', tid, f, 'must be true or false; ignored');
        });
        if (t.lines != null) {
          if (!isObj(t.lines)) warn('roster', tid, 'lines', 'must be an object of arrays; ignored');
          else Object.keys(t.lines).forEach(function (key) {
            if (!/^[a-zA-Z]{1,24}$/.test(key) || BAD_KEY.test(key)) { warn('roster', tid, 'lines.' + key, 'bad key; ignored'); return; }
            var arr = strList('roster', tid, 'lines.' + key, t.lines[key], 240);
            if (arr && arr.length) { arr.forEach(function (x) { lintTokens('roster', tid, 'lines.' + key, x); }); o.lines[key] = arr; }
          });
        }
        if (t.digs != null) {
          if (!Array.isArray(t.digs)) warn('roster', tid, 'digs', 'must be an array; ignored');
          else t.digs.forEach(function (d, i) { var c = dig('roster', tid, d, i); if (c) { lintTokens('roster', tid + '.digs[' + i + ']', 'text', c.text); o.digs.push(c); } });
        }
        out.traits[tid] = o;
      });
    }
    return out;
  }


  // ---------- rogue mode content (content/rogue.js -> AFK_CONTENT.rogue; packs: AFK_PACKS[id].rogue) ----------
  var BUDGETS = { common: { pm: 1.10, sm: 0.93, ch: 1 }, rare: { pm: 1.20, sm: 0.85, ch: 2 }, legendary: { pm: 1.40, sm: 0.75, ch: 3 } };
  var PRESENT = ['name', 'icon', 'desc', 'intro', 'text', 'title', 'label', 'lines'];
  var TAG_RE = /^[a-z-]{1,16}$/;
  var BOSS_RULES = { modeLock: 'mode', graceZero: 'bool', pingRateMult: [0.5, 4], susMultRound: [0.5, 2], pointMultRound: [0.5, 2], dragChanceMult: [0.25, 3], micEventMult: [0.1, 3], blackout: 'blackout', mutedOff: 'bool', triageTimeMult: [0.5, 1.5], noDecay: 'bool', forceVc: 'id', excuseMult: [0.25, 1], kickVoteAt: [10, 100], pingShield: [0, 4] };
  var ASC_RULES = { bossPingRateAdd: [0, 1], lorCapAdd: [0, 1], altsStart: [1, 3], bossObjectiveMult: [1, 2], elitesPerAct: [1, 2], graceCap: [0, 14], startCurse: 'bool' };
  var OUT_DURATIONS = ['run', 'act'];

  // rarity budget (loader-enforced, so pack authors cannot break balance). Returns true when the effects fit.
  function budgetOk(k, id, fx, rarity) {
    var b = BUDGETS[rarity];
    if (!b) return true;
    if ((fx.pointMult || 1) > b.pm + 1e-9) { warn(k, id, 'effects.pointMult', 'over the ' + rarity + ' budget (max ' + b.pm + '); skipped'); return false; }
    if ((fx.susMult || 1) < 1 && fx.susMult < b.sm - 1e-9) { warn(k, id, 'effects.susMult', 'over the ' + rarity + ' budget (min ' + b.sm + '); skipped'); return false; }
    var bad = Object.keys(fx).filter(function (f) { return EFFECT_DEFS[f] && EFFECT_DEFS[f].kind === 'charges' && fx[f] > b.ch; });
    if (bad.length) { warn(k, id, 'effects.' + bad[0], 'over the ' + rarity + ' budget (max ' + b.ch + ' charge' + (b.ch > 1 ? 's' : '') + ' per effect); skipped'); return false; }
    return true;
  }
  function tagList(k, id, v) {
    if (v == null) return [];
    if (!Array.isArray(v)) { warn(k, id, 'tags', 'must be an array; ignored'); return []; }
    var t = v.filter(function (x) { return typeof x === 'string' && TAG_RE.test(x); });
    if (t.length !== v.length) warn(k, id, 'tags', 'tags must be lowercase letters or - (max 16 chars); bad ones dropped');
    return t.slice(0, 6);
  }
  function numIn(v, lo, hi) { return isNum(v) && v >= lo && v <= hi; }
  function instantObj(k, id, raw, field) {
    var o = {};
    if (raw == null) return o;
    if (!isObj(raw)) { warn(k, id, field, 'must be an object { gold, sus, alts }; ignored'); return o; }
    [['gold', -200, 500], ['sus', -100, 100], ['alts', -3, 3]].forEach(function (d) {
      if (raw[d[0]] == null) return;
      if (numIn(raw[d[0]], d[1], d[2]) && Math.floor(raw[d[0]]) === raw[d[0]]) o[d[0]] = raw[d[0]]; else warn(k, id, field + '.' + d[0], 'must be a whole number ' + d[1] + '..' + d[2] + '; ignored');
    });
    return o;
  }
  function unlockObj(k, id, raw) {
    var o = { tokens: 0 };
    if (raw == null) return o;
    if (!isObj(raw)) { warn(k, id, 'unlock', 'must be { tokens }; free'); return o; }
    if (raw.tokens != null) { if (numIn(raw.tokens, 0, 999) && Math.floor(raw.tokens) === raw.tokens) o.tokens = raw.tokens; else warn(k, id, 'unlock.tokens', 'must be a whole number 0-999; free'); }
    if (raw.ascMax != null) { if (numIn(raw.ascMax, 0, 5) && Math.floor(raw.ascMax) === raw.ascMax) o.ascMax = raw.ascMax; else warn(k, id, 'unlock.ascMax', 'must be 0-5; ignored'); }
    return o;
  }
  function actsList(k, id, v) {
    if (v == null) return [1, 2, 3];
    var a = Array.isArray(v) ? v.filter(function (x) { return x === 1 || x === 2 || x === 3; }) : [];
    if (!a.length) { warn(k, id, 'acts', 'must be a list of 1, 2, 3; using all acts'); return [1, 2, 3]; }
    return a;
  }
  function textOf(k, id, e, field, max, out, def) {
    if (e[field] == null) { if (def != null) out[field] = def; return true; }
    if (isStr(e[field], max)) { out[field] = e[field].trim(); lintTokens(k, id, field, out[field]); return true; }
    warn(k, id, field, 'must be text under ' + max + ' chars; ignored');
    if (def != null) out[field] = def;
    return false;
  }

  function rBoon(e, id, isRelic) {
    var k = isRelic ? 'relic' : 'boon';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    var rarity = isRelic ? 'relic' : e.rarity;
    if (!isRelic && RARITIES.indexOf(rarity) < 0) { warn(k, id, 'rarity', 'must be ' + RARITIES.join(', ') + '; skipped'); return null; }
    if (!isObj(e.effects)) { warn(k, id, 'effects', 'missing or not an object; skipped'); return null; }
    var fx = effectsObj(k, id, e.effects, 'effects');
    var out = { id: id, name: e.name.trim(), icon: '✨', rarity: rarity, tags: tagList(k, id, e.tags), desc: '', effects: fx, instant: instantObj(k, id, e.instant, 'instant'), max: 1, weight: 1, acts: actsList(k, id, e.acts), unlock: unlockObj(k, id, e.unlock) };
    if (!Object.keys(fx).length && !(out.instant.gold || out.instant.sus || out.instant.alts)) { warn(k, id, 'effects', 'no valid effects left; skipped'); return null; }
    if (!budgetOk(k, id, fx, isRelic ? 'legendary' : rarity)) return null;
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    textOf(k, id, e, 'desc', 200, out, '');
    if (!isRelic) {
      if (e.max != null) { if (numIn(e.max, 1, 5) && Math.floor(e.max) === e.max) out.max = e.max; else warn(k, id, 'max', 'must be a whole number 1-5; using 1'); }
      if (e.weight != null) { if (numIn(e.weight, 0.1, 10)) out.weight = e.weight; else warn(k, id, 'weight', 'must be a number 0.1-10; using 1'); }
      if (e.requires != null) {
        var rq = e.requires;
        if (isObj(rq) && typeof rq.tag === 'string' && TAG_RE.test(rq.tag) && numIn(rq.count, 1, 9)) out.requires = { tag: rq.tag, count: Math.floor(rq.count) };
        else warn(k, id, 'requires', 'must be { tag, count }; ignored');
      }
    }
    if (e.when != null) {
      if (isObj(e.when) && ['boss', 'elite', 'normal'].indexOf(e.when.roundType) >= 0) out.when = { roundType: e.when.roundType };
      else warn(k, id, 'when', 'must be { roundType: "boss" | "elite" | "normal" }; ignored');
    }
    return out;
  }

  function rCurse(e, id) {
    var k = 'curse';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (!isObj(e.effects)) { warn(k, id, 'effects', 'missing or not an object; skipped'); return null; }
    var fx = effectsObj(k, id, e.effects, 'effects');
    if (!Object.keys(fx).length) { warn(k, id, 'effects', 'no valid effects left; skipped'); return null; }
    var out = { id: id, name: e.name.trim(), icon: '☠️', desc: '', effects: fx, duration: 'act', payout: {} };
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    textOf(k, id, e, 'desc', 200, out, '');
    if (e.duration != null) { if (['round', 'act', 'run'].indexOf(e.duration) >= 0) out.duration = e.duration; else warn(k, id, 'duration', 'must be round, act or run; using act'); }
    if (e.shopPriceMult != null) { if (numIn(e.shopPriceMult, 1, 2)) out.shopPriceMult = e.shopPriceMult; else warn(k, id, 'shopPriceMult', 'must be 1-2; ignored'); }
    var p = e.payout;
    if (p != null) {
      if (!isObj(p)) warn(k, id, 'payout', 'must be an object; ignored');
      else {
        if (p.gold != null) { if (numIn(p.gold, 0, 200)) out.payout.gold = Math.floor(p.gold); else warn(k, id, 'payout.gold', 'must be 0-200; ignored'); }
        if (p.boonRarity != null) { if (RARITIES.indexOf(p.boonRarity) >= 0) out.payout.boonRarity = p.boonRarity; else warn(k, id, 'payout.boonRarity', 'must be ' + RARITIES.join(', ') + '; ignored'); }
        if (p.boonChance != null) { if (numIn(p.boonChance, 0, 1)) out.payout.boonChance = p.boonChance; else warn(k, id, 'payout.boonChance', 'must be 0-1; ignored'); }
        if (p.relicReroll != null) { if (numIn(p.relicReroll, 0, 3)) out.payout.relicReroll = Math.floor(p.relicReroll); else warn(k, id, 'payout.relicReroll', 'must be 0-3; ignored'); }
        if (p.alts != null) { if (numIn(p.alts, 0, 2)) out.payout.alts = Math.floor(p.alts); else warn(k, id, 'payout.alts', 'must be 0-2; ignored'); }
        if (p.effects != null) {
          if (isObj(p.effects)) {
            var pf = effectsObj(k, id, p.effects, 'payout.effects');
            if (Object.keys(pf).length) { out.payout.effects = pf; out.payout.effectsDuration = p.effectsDuration === 'run' ? 'run' : 'act'; }
          } else warn(k, id, 'payout.effects', 'must be an object; ignored');
        }
      }
    }
    return out;
  }

  function rEvent(e, id) {
    var k = 'event';
    if (!isStr(e.title, 60)) { warn(k, id, 'title', 'missing or not text; skipped'); return null; }
    if (!isStr(e.text, 300)) { warn(k, id, 'text', 'missing or not text; skipped'); return null; }
    var out = { id: id, title: e.title.trim(), icon: '❓', acts: actsList(k, id, e.acts), weight: 1, text: e.text.trim(), choices: [] };
    lintTokens(k, id, 'text', out.text);
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    if (e.weight != null) { if (numIn(e.weight, 0.1, 10)) out.weight = e.weight; else warn(k, id, 'weight', 'must be a number 0.1-10; using 1'); }
    if (!Array.isArray(e.choices)) { warn(k, id, 'choices', 'missing; skipped'); return null; }
    e.choices.slice(0, 4).forEach(function (c, ci) {
      var w = 'choices[' + ci + ']';
      if (!isObj(c) || !isStr(c.label, 60) || !Array.isArray(c.outcomes)) { warn(k, id, w, 'needs label and outcomes; choice skipped'); return; }
      var ch = { label: c.label.trim(), hint: '', outcomes: [] };
      if (c.hint != null) { if (isStr(c.hint, 60)) ch.hint = c.hint.trim(); else warn(k, id, w + '.hint', 'must be short text; ignored'); }
      ['cost', 'requires'].forEach(function (f) {
        if (c[f] == null) return;
        if (!isObj(c[f])) { warn(k, id, w + '.' + f, 'must be an object; ignored'); return; }
        var o = {};
        Object.keys(c[f]).forEach(function (x) {
          if (['gold', 'alts', 'goldMin'].indexOf(x) >= 0 && numIn(c[f][x], 0, 500)) o[x] = Math.floor(c[f][x]);
          else if (x === 'flag' && typeof c[f][x] === 'string' && /^[a-z0-9_-]{1,24}$/i.test(c[f][x])) o.flag = c[f][x];
          else warn(k, id, w + '.' + f + '.' + x, 'unknown or out of range; ignored');
        });
        ch[f] = o;
      });
      c.outcomes.slice(0, 4).forEach(function (oc, oi) {
        var ow = w + '.outcomes[' + oi + ']';
        if (!isObj(oc) || !isStr(oc.text, 240) || !numIn(oc.w, 0.01, 100)) { warn(k, id, ow, 'needs text and a weight w; outcome skipped'); return; }
        var o = { w: oc.w, text: oc.text.trim(), instant: instantObj(k, id, oc.instant, ow + '.instant') };
        lintTokens(k, id, ow + '.text', o.text);
        if (oc.giveBoon != null) {
          var gb = oc.giveBoon;
          if (isObj(gb) && isId(gb.id)) o.giveBoon = { id: gb.id };
          else if (isObj(gb) && RARITIES.indexOf(gb.rarity) >= 0) { o.giveBoon = { rarity: gb.rarity }; if (gb.tag != null && typeof gb.tag === 'string' && TAG_RE.test(gb.tag)) o.giveBoon.tag = gb.tag; }
          else warn(k, id, ow + '.giveBoon', 'must be { id } or { rarity, tag? }; ignored');
        }
        if (oc.giveCurse != null) { if (isId(oc.giveCurse)) o.giveCurse = oc.giveCurse; else warn(k, id, ow + '.giveCurse', 'must be a curse id; ignored'); }
        if (oc.giveRelic != null) { if (oc.giveRelic === true) o.giveRelic = true; else warn(k, id, ow + '.giveRelic', 'must be true; ignored'); }
        if (oc.effects != null) {
          if (isObj(oc.effects)) {
            var ef = effectsObj(k, id, oc.effects, ow + '.effects');
            if (Object.keys(ef).length) { o.effects = ef; o.effectsDuration = OUT_DURATIONS.indexOf(oc.effectsDuration) >= 0 ? oc.effectsDuration : 'run'; }
          } else warn(k, id, ow + '.effects', 'must be an object; ignored');
        }
        if (oc.flag != null) { if (typeof oc.flag === 'string' && /^[a-z0-9_-]{1,24}$/i.test(oc.flag)) o.flag = oc.flag; else warn(k, id, ow + '.flag', 'must be a short id; ignored'); }
        ch.outcomes.push(o);
      });
      if (!ch.outcomes.length) { warn(k, id, w, 'no valid outcomes; choice skipped'); return; }
      out.choices.push(ch);
    });
    if (out.choices.length < 2) { warn(k, id, 'choices', 'needs at least 2 valid choices; skipped'); return null; }
    return out;
  }

  function rBoss(e, id) {
    var k = 'boss';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (!(e.act === 1 || e.act === 2 || e.act === 3)) { warn(k, id, 'act', 'must be 1, 2 or 3; skipped'); return null; }
    if (!isObj(e.objective) || !numIn(e.objective.minMins, 5, 240)) { warn(k, id, 'objective.minMins', 'must be a number 5-240; skipped'); return null; }
    var out = { id: id, name: e.name.trim(), icon: '👹', act: e.act, objective: { minMins: e.objective.minMins }, promise: { p: 15, m: 1 }, reward: { gold: [100, 160, 260][e.act - 1] }, rules: {}, intro: [], midFight: [], win: [], fail: [] };
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    if (isObj(e.promise) && numIn(e.promise.p, 1, 120) && numIn(e.promise.m, 0.5, 2)) out.promise = { p: Math.floor(e.promise.p), m: e.promise.m };
    else warn(k, id, 'promise', 'must be { p, m }; using 15 min x1');
    if (e.reward != null) { if (isObj(e.reward) && numIn(e.reward.gold, 0, 600)) out.reward = { gold: Math.floor(e.reward.gold) }; else warn(k, id, 'reward', 'must be { gold }; using default'); }
    var r = isObj(e.rules) ? e.rules : {};
    if (e.rules != null && !isObj(e.rules)) warn(k, id, 'rules', 'must be an object; ignored');
    Object.keys(r).forEach(function (rk) {
      var d = BOSS_RULES[rk], v = r[rk], w = 'rules.' + rk;
      if (BAD_KEY.test(rk) || !Object.prototype.hasOwnProperty.call(BOSS_RULES, rk)) { warn(k, id, w, 'unknown rule (use ' + Object.keys(BOSS_RULES).join(', ') + '); ignored'); return; }
      if (d === 'mode') { if (MODES.indexOf(v) >= 0) out.rules[rk] = v; else warn(k, id, w, 'must be ' + MODES.join(' or ') + '; ignored'); }
      else if (d === 'bool') { if (typeof v === 'boolean') out.rules[rk] = v; else warn(k, id, w, 'must be true or false; ignored'); }
      else if (d === 'id') { if (isId(v)) out.rules[rk] = v; else warn(k, id, w, 'must be a channel id; ignored'); }
      else if (d === 'blackout') {
        if (isObj(v) && Array.isArray(v.at) && v.at.length === 2 && numIn(v.at[0], 0, 240) && numIn(v.at[1], v.at[0], 240) && Array.isArray(v.dur) && v.dur.length === 2 && numIn(v.dur[0], 1, 60) && numIn(v.dur[1], v.dur[0], 60) && numIn(v.susMult, 0.1, 2)) out.rules[rk] = { at: [v.at[0], v.at[1]], dur: [v.dur[0], v.dur[1]], susMult: v.susMult };
        else warn(k, id, w, 'must be { at:[a,b], dur:[c,d], susMult }; ignored');
      } else if (numIn(v, d[0], d[1])) out.rules[rk] = rk === 'pingShield' || rk === 'kickVoteAt' ? Math.floor(v) : v;
      else warn(k, id, w, 'must be a number between ' + d[0] + ' and ' + d[1] + '; ignored');
    });
    // presentation: pack overrides use lines:{midFight,win,fail}; base bosses list them at the top level
    var src = isObj(e.lines) ? e.lines : e;
    ['intro', 'midFight', 'win', 'fail'].forEach(function (f) {
      var v = f === 'intro' ? e.intro : src[f];
      if (v == null) return;
      var a = strList(k, id, f, v, 240);
      if (a) { a.forEach(function (x) { lintTokens(k, id, f, x); }); out[f] = a.slice(0, 12); }
    });
    return out;
  }

  function rLoadout(e, id) {
    var k = 'loadout';
    if (!isStr(e.name, 30)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    var out = { id: id, name: e.name.trim(), icon: '🎒', desc: '', unlock: unlockObj(k, id, e.unlock), effects: {}, alts: 2, gold: 0, rerolls: 1, boons: [], curses: [], offerCards: 3 };
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    textOf(k, id, e, 'desc', 240, out, '');
    if (e.effects != null) { if (isObj(e.effects)) out.effects = effectsObj(k, id, e.effects, 'effects'); else warn(k, id, 'effects', 'must be an object; ignored'); }
    [['alts', 1, 3], ['gold', 0, 100], ['rerolls', 0, 5], ['offerCards', 3, 4]].forEach(function (d) {
      if (e[d[0]] == null) return;
      if (numIn(e[d[0]], d[1], d[2]) && Math.floor(e[d[0]]) === e[d[0]]) out[d[0]] = e[d[0]]; else warn(k, id, d[0], 'must be a whole number ' + d[1] + '-' + d[2] + '; using ' + out[d[0]]);
    });
    ['boons', 'curses'].forEach(function (f) { if (e[f] != null) { var a = strList(k, id, f, e[f], 32); if (a) out[f] = a.filter(isId); } });
    if (e.freeBoon != null) { if (isId(e.freeBoon)) out.freeBoon = e.freeBoon; else warn(k, id, 'freeBoon', 'must be a boon id; ignored'); }
    return out;
  }

  function rSynergy(e, id) {
    var k = 'synergy';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (typeof e.tag !== 'string' || !TAG_RE.test(e.tag)) { warn(k, id, 'tag', 'must be a tag; skipped'); return null; }
    if (!numIn(e.count, 2, 9) || Math.floor(e.count) !== e.count) { warn(k, id, 'count', 'must be a whole number 2-9; skipped'); return null; }
    var out = { id: id, name: e.name.trim(), tag: e.tag, count: e.count, effects: {}, instant: instantObj(k, id, e.instant, 'instant'), desc: '' };
    if (e.effects != null) { if (isObj(e.effects)) out.effects = effectsObj(k, id, e.effects, 'effects'); else warn(k, id, 'effects', 'must be an object; ignored'); }
    if (!Object.keys(out.effects).length && !(out.instant.gold || out.instant.sus || out.instant.alts)) { warn(k, id, 'effects', 'nothing to give; skipped'); return null; }
    textOf(k, id, e, 'desc', 200, out, '');
    return out;
  }

  function rAscensions(arr) {
    var out = [];
    if (arr == null) return out;
    if (!Array.isArray(arr)) { warn('ascension', '*', '', 'must be an array; ignored'); return out; }
    arr.forEach(function (e, i) {
      var id = '#' + i;
      if (!isObj(e) || !numIn(e.level, 1, 5) || Math.floor(e.level) !== e.level || e.level !== out.length + 1) { warn('ascension', id, 'level', 'levels must be 1, 2, 3... in order; skipped'); return; }
      if (!isStr(e.name, 40)) { warn('ascension', id, 'name', 'missing; skipped'); return; }
      var a = { level: e.level, name: e.name.trim(), desc: isStr(e.desc, 200) ? e.desc.trim() : '', effects: {}, rules: {}, scoreMult: 1 + 0.15 * e.level };
      if (isObj(e.effects)) a.effects = effectsObj('ascension', id, e.effects, 'effects');
      if (numIn(e.scoreMult, 1, 5)) a.scoreMult = e.scoreMult; else warn('ascension', id, 'scoreMult', 'must be 1-5; using ' + a.scoreMult);
      if (isObj(e.rules)) Object.keys(e.rules).forEach(function (rk) {
        var d = ASC_RULES[rk], v = e.rules[rk];
        if (BAD_KEY.test(rk) || !Object.prototype.hasOwnProperty.call(ASC_RULES, rk)) { warn('ascension', id, 'rules.' + rk, 'unknown rule; ignored'); return; }
        if (d === 'bool') { if (typeof v === 'boolean') a.rules[rk] = v; }
        else if (numIn(v, d[0], d[1])) a.rules[rk] = v; else warn('ascension', id, 'rules.' + rk, 'must be ' + d[0] + '..' + d[1] + '; ignored');
      });
      out.push(a);
    });
    return out;
  }

  function rFlavor(raw) {
    var f = { actNames: ['Act 1', 'Act 2', 'Act 3'], runName: 'Rogue Run', bossLabel: 'BOSS', eliteLabel: 'ELITE', bossIntro: {} };
    if (raw == null) return f;
    if (!isObj(raw)) { warn('flavor', '*', '', 'must be an object; ignored'); return f; }
    if (raw.actNames != null) { var an = strList('flavor', 'actNames', '', raw.actNames, 30); if (an && an.length === 3) f.actNames = an; else warn('flavor', 'actNames', '', 'needs exactly 3 names; using defaults'); }
    ['runName', 'bossLabel', 'eliteLabel'].forEach(function (x) { if (raw[x] != null) { if (isStr(raw[x], 30)) f[x] = raw[x].trim(); else warn('flavor', x, '', 'must be short text; ignored'); } });
    if (isObj(raw.bossIntro)) Object.keys(raw.bossIntro).forEach(function (b) {
      if (BAD_KEY.test(b)) return;
      var a = strList('flavor', 'bossIntro.' + b, '', raw.bossIntro[b], 240);
      if (a && a.length) { a.forEach(function (x) { lintTokens('flavor', 'bossIntro.' + b, '', x); }); f.bossIntro[b] = a; }
    });
    return f;
  }

  // validated rogue block: base (isPack false) or one pack (isPack true; colliding ids become presentation-only overrides)
  function rogueContent(raw, isPack, baseIds) {
    var out = { boons: [], relics: [], curses: [], events: [], bosses: [], loadouts: [], ascensions: [], synergies: [], flavor: null, disable: [], override: {}, present: true };
    if (raw == null) { out.present = false; return out; }
    if (!isObj(raw)) { warn('rogue', '*', '', 'must be an object; ignored'); out.present = false; return out; }
    var ovr = {};
    function ovrOf(kind) { return ovr[kind] || (ovr[kind] = {}); }
    function takeList(kind, field, fn) {
      var src = raw[field];
      if (src == null) return [];
      if (!Array.isArray(src)) { warn(kind, '*', '', 'must be an array; ignoring the whole list'); return []; }
      if (isPack) {
        var fresh = [];
        src.forEach(function (e) {
          if (isObj(e) && isId(e.id) && baseIds && baseIds[field] && baseIds[field][e.id]) {
            var o = {}; PRESENT.forEach(function (f) { if (e[f] != null) o[f] = e[f]; });
            if (e.effects != null || e.rules != null || e.rarity != null) warn(kind, e.id, 'effects', 'id collides with a base entry: treated as an override, only ' + PRESENT.join('/') + ' are read');
            ovrOf(field)[e.id] = o;
          } else fresh.push(e);
        });
        src = fresh;
      }
      return list(kind, src, fn);
    }
    out.boons = takeList('boon', 'boons', function (e, id) { return rBoon(e, id, false); });
    out.relics = takeList('relic', 'relics', function (e, id) { return rBoon(e, id, true); });
    out.curses = takeList('curse', 'curses', rCurse);
    out.events = takeList('event', 'events', rEvent);
    out.bosses = takeList('boss', 'bosses', rBoss);
    out.loadouts = takeList('loadout', 'loadouts', rLoadout);
    out.synergies = takeList('synergy', 'synergies', rSynergy);
    out.ascensions = isPack ? [] : rAscensions(raw.ascensions);
    out.flavor = rFlavor(raw.flavor);
    if (isPack && raw.ascensions != null) warn('rogue', 'ascensions', '', 'packs cannot change ascensions; ignored');
    if (raw.disable != null) { var d = strList('rogue', 'disable', '', raw.disable, 32); if (d) out.disable = d.filter(isId); }
    if (isPack && isObj(raw.override)) {
      ['boons', 'relics', 'curses', 'events', 'bosses', 'loadouts'].forEach(function (f) {
        var a = raw.override[f];
        if (a == null) return;
        if (!Array.isArray(a)) { warn('rogue', 'override.' + f, '', 'must be an array; ignored'); return; }
        a.forEach(function (e) {
          if (!isObj(e) || !isId(e.id)) { warn('rogue', 'override.' + f, 'id', 'missing or invalid; skipped'); return; }
          var o = {}; PRESENT.forEach(function (x) { if (e[x] != null) o[x] = e[x]; });
          if (e.effects != null || e.rules != null || e.objective != null) warn('rogue', 'override.' + f + '.' + e.id, 'effects', 'only ' + PRESENT.join('/') + ' are read in an override; the rest is ignored');
          ovrOf(f)[e.id] = o;
        });
      });
    }
    out.override = ovr;
    return out;
  }

  function idMap(arr) { var m = {}; arr.forEach(function (x) { m[x.id] = x; }); return m; }

  // base + pack -> the content the game plays with. Presentation overrides applied, disabled ids removed, dangling refs dropped.
  function mergeRogue(base, pack) {
    var M = { boons: [], relics: [], curses: [], events: [], bosses: [], loadouts: [], ascensions: base.ascensions.slice(), synergies: [], flavor: {}, runtime: true };
    var dis = {};
    (pack ? pack.disable : []).forEach(function (x) { dis[x] = true; });
    base.disable.forEach(function (x) { dis[x] = true; });
    function present(item, ov) {
      var o = {}; Object.keys(item).forEach(function (k) { o[k] = item[k]; });
      if (!ov) return o;
      PRESENT.forEach(function (f) {
        if (ov[f] == null) return;
        if (f === 'lines') {
          if (isObj(ov.lines)) ['midFight', 'win', 'fail'].forEach(function (x) { var a = strList('boss', item.id, 'lines.' + x, ov.lines[x], 240); if (a && a.length) o[x] = a.slice(0, 12); });
        } else if (f === 'intro') { var a = strList('boss', item.id, 'intro', ov.intro, 240); if (a && a.length) o.intro = a.slice(0, 12); }
        else if ((f === 'name' || f === 'title' || f === 'label') && isStr(ov[f], 60)) o[f] = ov[f].trim();
        else if ((f === 'desc' || f === 'text') && isStr(ov[f], 300)) o[f] = ov[f].trim();
        else if (f === 'icon' && isStr(ov.icon, 8)) o.icon = ov.icon.trim();
      });
      return o;
    }
    ['boons', 'relics', 'curses', 'events', 'bosses', 'loadouts'].forEach(function (f) {
      var ov = (pack && pack.override[f]) || {};
      var seen = {};
      base[f].concat(pack ? pack[f] : []).forEach(function (it) {
        if (dis[it.id] || seen[it.id]) return;
        seen[it.id] = true;
        M[f].push(present(it, ov[it.id]));
      });
    });
    M.synergies = base.synergies.concat(pack ? pack.synergies : []);
    M.flavor = { actNames: base.flavor.actNames.slice(), runName: base.flavor.runName, bossLabel: base.flavor.bossLabel, eliteLabel: base.flavor.eliteLabel, bossIntro: {} };
    if (pack && pack.flavor) {
      var pf = pack.flavor;
      if (pf.actNames && pf.actNames.length === 3 && pf.actNames.join('') !== 'Act 1Act 2Act 3') M.flavor.actNames = pf.actNames.slice();
      ['runName', 'bossLabel', 'eliteLabel'].forEach(function (x) { if (pf[x]) M.flavor[x] = pf[x]; });
      M.flavor.bossIntro = pf.bossIntro || {};
    }
    // dangling references: warn once per merged set and drop the reference
    var bn = idMap(M.boons), cn = idMap(M.curses);
    M.events.forEach(function (ev) {
      ev.choices = ev.choices.filter(function (c) {
        c.outcomes = c.outcomes.filter(function (o) {
          if (o.giveBoon && o.giveBoon.id && !bn[o.giveBoon.id]) { warn('event', ev.id, 'giveBoon', 'unknown boon id "' + o.giveBoon.id + '"; outcome dropped'); return false; }
          if (o.giveCurse && !cn[o.giveCurse]) { warn('event', ev.id, 'giveCurse', 'unknown curse id "' + o.giveCurse + '"; outcome dropped'); return false; }
          return true;
        });
        return c.outcomes.length > 0;
      });
    });
    M.events = M.events.filter(function (ev) { return ev.choices.length >= 2; });
    M.loadouts.forEach(function (l) {
      l.boons = l.boons.filter(function (b) { if (!bn[b]) { warn('loadout', l.id, 'boons', 'unknown boon id "' + b + '"; dropped'); return false; } return true; });
      l.curses = l.curses.filter(function (b) { if (!cn[b]) { warn('loadout', l.id, 'curses', 'unknown curse id "' + b + '"; dropped'); return false; } return true; });
      if (l.freeBoon && !bn[l.freeBoon]) { warn('loadout', l.id, 'freeBoon', 'unknown boon id "' + l.freeBoon + '"; ignored'); delete l.freeBoon; }
    });
    return M;
  }

  // ---------- themes ----------
  function theme(e, id) {
    if (!/^[a-z-]{1,20}$/.test(id)) { warn('theme', id, 'id', 'themes use lowercase letters and dashes only (max 20); skipped'); return null; }
    if (!isStr(e.name, 30)) { warn('theme', id, 'name', 'missing or not text; skipped'); return null; }
    return { id: id, name: e.name.trim() };
  }

  // ---------- paths ----------
  function path(e, id) {
    var k = 'path';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (!isNum(e.pointMult) || e.pointMult < 0 || e.pointMult > 10) { warn(k, id, 'pointMult', 'must be a number 0-10; skipped'); return null; }
    if (!isNum(e.susMult) || e.susMult < 0 || e.susMult > 10) { warn(k, id, 'susMult', 'must be a number 0-10; skipped'); return null; }
    var out = { id: id, name: e.name.trim(), pointMult: e.pointMult, susMult: e.susMult, events: [] };
    ['desc', 'risk'].forEach(function (f) {
      if (e[f] == null) return;
      if (isStr(e[f], 200)) out[f] = e[f].trim(); else warn(k, id, f, 'must be text; ignored');
    });
    ['pointGrow', 'susGrow'].forEach(function (f) {
      if (e[f] == null) return;
      if (isNum(e[f]) && Math.abs(e[f]) <= 5) out[f] = e[f]; else warn(k, id, f, 'must be a number between -5 and 5; ignored');
    });
    if (e.modes != null) {
      var m = strList(k, id, 'modes', e.modes, 20);
      if (m) {
        var good = m.filter(function (x) { return MODES.indexOf(x) >= 0; });
        if (good.length !== m.length) warn(k, id, 'modes', 'unknown mode(s) dropped (use ' + MODES.join(' or ') + ')');
        if (good.length) out.modes = good; else { warn(k, id, 'modes', 'no valid modes; skipped'); return null; }
      }
    }
    if (e.events != null) { var ev = strList(k, id, 'events', e.events, 32); if (ev) out.events = ev; }
    return out;
  }

  function pathEvents(obj) {
    var out = {};
    if (obj == null) return out;
    if (!isObj(obj)) { warn('pathEvent', '*', '', 'must be an object keyed by event id; ignored'); return out; }
    Object.keys(obj).forEach(function (id) {
      if (BAD_KEY.test(id)) { warn('pathEvent', id, '', 'reserved name; skipped'); return; }
      var ev = obj[id];
      if (!isObj(ev)) { warn('pathEvent', id, '', 'not an object; skipped'); return; }
      var o = {};
      if (ev.label != null) { if (isStr(ev.label)) o.label = ev.label; else warn('pathEvent', id, 'label', 'must be text; ignored'); }
      if (ev.lines != null) { var l = strList('pathEvent', id, 'lines', ev.lines); if (l && l.length) o.lines = l; }
      if (ev.sus != null) {
        if (Array.isArray(ev.sus) && ev.sus.length === 2 && isNum(ev.sus[0]) && isNum(ev.sus[1]) && ev.sus[0] <= ev.sus[1]) o.sus = [ev.sus[0], ev.sus[1]];
        else warn('pathEvent', id, 'sus', 'must be [min, max] numbers; using default');
      }
      if (ev.funny != null) { if (typeof ev.funny === 'boolean') o.funny = ev.funny; else warn('pathEvent', id, 'funny', 'must be true or false; ignored'); }
      if (ev.bonus != null) { if (isNum(ev.bonus) && ev.bonus >= 0) o.bonus = ev.bonus; else warn('pathEvent', id, 'bonus', 'must be a number >= 0; ignored'); }
      out[id] = o;
    });
    return out;
  }

  function lineMap(kind, obj) {
    var out = {};
    if (obj == null) return out;
    if (!isObj(obj)) { warn(kind, '*', '', 'must be an object of arrays; ignored'); return out; }
    Object.keys(obj).forEach(function (key) {
      if (BAD_KEY.test(key)) { warn(kind, key, '', 'reserved name; skipped'); return; }
      var arr = strList(kind, key, '', obj[key], 240);
      if (arr && arr.length) { if (kind === 'dialog') arr.forEach(function (x) { lintTokens('dialog', key, '', x); }); out[key] = arr; }
    });
    return out;
  }

  // ---------- dialog ----------
  function dialog(d) {
    var out = { BRB: [], EXCUSES: [], LINES: {} };
    if (d == null) return out;
    if (!isObj(d)) { warn('dialog', '*', '', 'must be an object { BRB, EXCUSES, LINES }; ignored'); return out; }
    if (Array.isArray(d.BRB)) {
      d.BRB.forEach(function (b, i) {
        if (isObj(b) && isStr(b.t, 80) && isNum(b.p) && b.p > 0 && b.p <= 1440 && isNum(b.m) && b.m > 0 && b.m <= 10) { lintTokens('dialog', 'BRB[' + i + ']', 't', b.t); out.BRB.push({ t: b.t, p: b.p, m: b.m }); }
        else warn('dialog', 'BRB[' + i + ']', 't/p/m', 'needs text t, promised minutes p (0-1440] and multiplier m (0-10]; skipped');
      });
    } else if (d.BRB != null) warn('dialog', 'BRB', '', 'must be an array; ignored');
    if (Array.isArray(d.EXCUSES)) {
      d.EXCUSES.forEach(function (x, i) {
        if (isObj(x) && isStr(x.t, 80) && Array.isArray(x.r) && x.r.length === 2 && isNum(x.r[0]) && isNum(x.r[1]) && x.r[0] <= x.r[1]) { lintTokens('dialog', 'EXCUSES[' + i + ']', 't', x.t); out.EXCUSES.push({ t: x.t, r: [x.r[0], x.r[1]] }); }
        else warn('dialog', 'EXCUSES[' + i + ']', 't/r', 'needs text t and r = [min, max] suspicion removed; skipped');
      });
    } else if (d.EXCUSES != null) warn('dialog', 'EXCUSES', '', 'must be an array; ignored');
    out.LINES = lineMap('dialog', d.LINES);
    return out;
  }

  // ---------- packs ----------
  // A pack = manifest (content/packs/<id>/manifest.js -> window.AFK_PACK_MANIFESTS) + data files that fill
  // window.AFK_PACKS[id] = { data, dialog, pools, templates, generate, parodyOrgs, bulk }.
  var PATHISH = /^[a-z0-9_\-][a-z0-9_\-./]{0,78}$/i;
  var okPath = function (v) { return typeof v === 'string' && PATHISH.test(v) && v.indexOf('..') < 0 && v.charAt(v.length - 1) !== '/'; };

  function fileList(id, field, v) {
    if (v == null) return [];
    if (!Array.isArray(v)) { warn('pack', id, field, 'must be an array of .js file names; ignored'); return []; }
    return v.filter(function (f) {
      if (okPath(f) && /\.js$/i.test(f)) return true;
      warn('pack', id, field, 'bad file name "' + String(f).slice(0, 40) + '" (relative .js path, no ".."); dropped');
      return false;
    });
  }

  function manifest(m, i) {
    if (!isObj(m)) { warn('pack', '#' + i, '', 'manifest is not an object; skipped'); return null; }
    var id = m.id;
    if (!isId(id) || id === 'classic') { warn('pack', id == null ? '#' + i : String(id).slice(0, 40), 'id', 'missing, invalid or reserved (use letters, digits, - or _, max 32; "classic" is built in); skipped'); return null; }
    if (!isStr(m.name, 40)) { warn('pack', id, 'name', 'missing or not text; skipped'); return null; }
    if (m.requires != null && (!isNum(m.requires) || m.requires > CONTENT_VERSION)) { warn('pack', id, 'requires', 'needs content system ' + m.requires + ' but this game has ' + CONTENT_VERSION + '; skipped'); return null; }
    var out = { id: id, name: cleanName(m.name).slice(0, 40), server: '', base: 'content/packs/' + id + '/', files: fileList(id, 'files', m.files), lazy: fileList(id, 'lazy', m.lazy) };
    if (m.server != null) { if (isStr(m.server, 24) && cleanName(m.server)) out.server = cleanName(m.server); else warn('pack', id, 'server', 'must be short text; using the name from data.js'); }
    if (m.base != null) {
      if (typeof m.base === 'string' && okPath(m.base.replace(/\/$/, '')) && m.base.charAt(m.base.length - 1) === '/') out.base = m.base; else warn('pack', id, 'base', 'must be a relative folder ending in "/"; using the default');
    }
    return out;
  }

  // pack characters: lines may be one string or an array; residents use timerDays [min,max] + statusLines
  function packChar(c) {
    if (!isObj(c)) return c;
    var o = {};
    Object.keys(c).forEach(function (k) { o[k] = c[k]; });
    if (isObj(c.lines)) {
      o.lines = {};
      Object.keys(c.lines).forEach(function (k) { o.lines[k] = Array.isArray(c.lines[k]) ? c.lines[k] : [c.lines[k]]; });
    }
    if (Array.isArray(c.timerDays) && c.timerDays.length === 2) { o.timerMin = c.timerDays[0]; o.timerMax = c.timerDays[1]; }
    if (c.statusLines != null && o.status == null) o.status = c.statusLines;
    return o;
  }

  function achievement(e, id) {
    if (!isStr(e.name, 40)) { warn('achievement', id, 'name', 'missing or not text; skipped'); return null; }
    var out = { id: id, name: e.name.trim(), desc: '', hint: '' };
    ['desc', 'hint'].forEach(function (f) {
      if (e[f] == null) return;
      if (isStr(e[f], 160)) out[f] = e[f].trim(); else warn('achievement', id, f, 'must be text under 160 chars; ignored');
    });
    return out;
  }

  function parodyOrg(e, id) {
    var k = 'parodyOrg';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    var out = { id: id, name: cleanName(e.name).slice(0, 40), tag: '', lines: [], taunts: [] };
    if (e.tag != null) { if (isStr(e.tag, 8) && /^[\w-]+$/.test(e.tag)) out.tag = e.tag; else warn(k, id, 'tag', 'must be 1-8 letters/digits; ignored'); }
    if (e.lines != null) { var l = strList(k, id, 'lines', e.lines, 240); if (l) out.lines = l; }
    if (e.taunts != null) { var t = strList(k, id, 'taunts', e.taunts, 240); if (t) out.taunts = t; }
    if (!out.lines.length && !out.taunts.length) { warn(k, id, 'lines', 'no usable lines or taunts; skipped'); return null; }
    return out;
  }

  // pools: { slotName: [ 'text' | { v, tags?, w? } ] }; templates: { group: [ ... ] | { mood: { cat: [...] } } }
  function poolEntry(x) {
    if (typeof x === 'string') return isStr(x, 80);
    return isObj(x) && isStr(x.v != null ? x.v : x.t != null ? x.t : x.text, 80);
  }
  function tmplEntry(x) {
    if (typeof x === 'string') return isStr(x, 240);
    return isObj(x) && isStr(x.t != null ? x.t : x.text, 240);
  }
  function slotMap(kind, obj, ok, depth) {
    var out = {};
    if (obj == null) return out;
    if (!isObj(obj)) { warn(kind, '*', '', 'must be an object; ignored'); return out; }
    Object.keys(obj).forEach(function (key) {
      if (BAD_KEY.test(key) || !/^[A-Za-z_]\w{0,30}$/.test(key)) { warn(kind, key, '', 'bad name; skipped'); return; }
      var v = obj[key];
      if (depth && isObj(v)) { out[key] = slotMap(kind + '.' + key, v, ok, 0); return; }
      if (!Array.isArray(v)) { warn(kind, key, '', 'must be an array; skipped'); return; }
      var good = v.filter(ok);
      if (good.length !== v.length) warn(kind, key, '', (v.length - good.length) + ' bad entr' + (v.length - good.length === 1 ? 'y' : 'ies') + ' dropped');
      if (good.length) out[key] = good;
    });
    return out;
  }

  function packDialog(dl) {
    if (dl == null) return { BRB: [], EXCUSES: [], LINES: {} };
    if (!isObj(dl)) { warn('dialog', '*', '', 'must be an object; ignored'); return { BRB: [], EXCUSES: [], LINES: {} }; }
    var lines = {};
    if (isObj(dl.lines)) Object.keys(dl.lines).forEach(function (k) { lines[k] = dl.lines[k]; });
    if (dl.orgFightPings != null) lines.orgFight = dl.orgFightPings;
    if (dl.missedFight != null) lines.missedFight = dl.missedFight;
    if (dl.welcomeBack != null) lines.welcomeBack = dl.welcomeBack;
    return dialog({ BRB: dl.brb, EXCUSES: dl.excuses, LINES: lines });
  }

  function resolvePack(m) {
    // read window.AFK_PACKS live: pack files loaded after this script (lazy core path) may have created it
    var PACKS = (window.AFK_PACKS && typeof window.AFK_PACKS === 'object') ? window.AFK_PACKS : {};
    var raw = PACKS[m.id];
    if (!isObj(raw) || !isObj(raw.data)) return null;
    var before = warnings.length;
    ctx = '[' + m.id + '] ';
    try {
      var d = raw.data;
      var sv = isObj(d.server) ? d.server : {};
      var name = m.server || (isStr(sv.name, 24) ? cleanName(sv.name) : '') || m.name;
      var out = {
        id: m.id, name: m.name, base: m.base, files: m.files, lazy: m.lazy, ready: true,
        server: { name: name, icon: isStr(sv.icon, 8) ? sv.icon.trim() : '', tagline: isStr(sv.tagline, 200) ? sv.tagline.trim() : '' },
        characters: list('character', (Array.isArray(d.characters) ? d.characters : []).concat(Array.isArray(d.residents) ? d.residents : []).map(packChar), character),
        channels: list('channel', d.channels, channel),
        items: list('item', d.items, item),
        achievements: list('achievement', d.achievements, achievement),
        dialog: packDialog(raw.dialog),
        pools: slotMap('pools', raw.pools, poolEntry, 0),
        templates: slotMap('templates', raw.templates, tmplEntry, 1),
        parodyOrgs: list('parodyOrg', raw.parodyOrgs, parodyOrg),
        rogue: rogueContent(raw.rogue, true, baseIdsFor()),
        generate: typeof raw.generate === 'function' ? raw.generate : null,
        hasBulk: m.lazy.length > 0
      };
      var ids = {};
      out.characters.forEach(function (c) { ids[c.id] = true; });
      out.channels.forEach(function (ch) {
        ch.members.forEach(function (mm) { if (!ids[mm]) warn('channel', ch.id, 'members', 'unknown character id "' + mm + '"; it will be ignored'); });
      });
      if (!out.characters.some(function (c) { return c.role === 'friend'; })) warn('pack', m.id, 'characters', 'no friends in this pack; the built-in friends will be used');
      if (!out.channels.some(function (c) { return c.type === 'text'; })) warn('pack', m.id, 'channels', 'no text channel; the classic channels will be used');
      out.warnings = warnings.length - before;
      return out;
    } finally {
      ctx = '';
    }
  }

  // bulk files can hold ~13k lines: check each line cheaply (string, 3-160 chars, no control chars) and report once per category
  function cleanBulk(id, raw) {
    var out = {};
    if (!isObj(raw)) { ctx = '[' + id + '] '; warn('bulk', '*', '', 'must be an object of arrays; ignored'); ctx = ''; return out; }
    Object.keys(raw).forEach(function (key) {
      if (BAD_KEY.test(key) || !/^[A-Za-z]{1,24}$/.test(key)) return;
      var arr = raw[key];
      if (!Array.isArray(arr)) return;
      var good = [];
      for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        if (typeof x === 'string' && x.length >= 2 && x.length <= 160 && !/[\u0000-\u001f]/.test(x)) good.push(x);
      }
      if (good.length !== arr.length) { ctx = '[' + id + '] '; warn('bulk', key, '', (arr.length - good.length) + ' bad line(s) dropped'); ctx = ''; }
      if (good.length) out[key] = good;
    });
    return out;
  }

  // base rogue content is read first: pack rogue files are checked against its ids (a colliding id is a presentation-only override)
  var BASE_ROGUE = rogueContent(C.rogue, false);
  function baseIdsFor() {
    var m = {};
    ['boons', 'relics', 'curses', 'events', 'bosses', 'loadouts'].forEach(function (f) { m[f] = idMap(BASE_ROGUE[f]); });
    return m;
  }
  var mergedCache = {};

  var MAN = Array.isArray(window.AFK_PACK_MANIFESTS) ? window.AFK_PACK_MANIFESTS : [];
  var packList = [{ id: 'classic', name: 'The Boys (classic)', server: { name: 'the boys', icon: 'TB' }, builtin: true }];
  var packs = {};
  var seenPack = {};
  MAN.forEach(function (m0, i) {
    var m = manifest(m0, i);
    if (!m) return;
    if (seenPack[m.id]) { warn('pack', m.id, 'id', 'duplicate pack id; skipped'); return; }
    seenPack[m.id] = true;
    var rp = resolvePack(m);
    packs[m.id] = rp; // null until its files are loaded (the game loads them on select)
    packList.push({ id: m.id, name: m.name, server: rp ? rp.server : { name: m.server || m.name, icon: '' }, manifest: m, ready: !!rp });
  });

  // ---------- game night content (content/gamenight/*.js -> AFK_CONTENT.gamenight; packs: AFK_PACKS[id].gamenight) ----------
  // Every entry is checked; a bad one is warned about and skipped, never thrown. A section below its minimum is reported in
  // `missing` and the engine plays that section from its built-in fallback.
  var GN_SLOTS = ['cause', 'escalation', 'proof', 'witness', 'promise'];
  var GN_TOK = { me: 1, friend: 1, day: 1, time: 1, game: 1, week: 1, cause: 1, prop: 1 };
  var GN_PART_TOK = { me: 1, friend: 1, day: 1, time: 1, game: 1 };
  var GN_APPROACH = ['preempt', 'build', 'ghost', 'attend'];
  var GN_ENDINGS = ['kicked', 'disbanded', 'survived', 'never-happens', 'retired'];
  var GN_KINDS = ['skipped', 'called-out', 'dragged-in', 'played-without-you', 'everyone-flaked', 'different-game', 'just-talked', 'update-hell', 'ending'];
  var GN_BANDS = ['calm', 'eyebrow', 'sus', 'detective'];
  var GN_RKINDS = ['impressed', 'neutral', 'exasperated', 'detective'];
  var GN_TAGRE = /^[a-z0-9_-]{1,32}$/i;
  var GN_CTRL = /[\u0000-\u001f\u007f-\u009f]/;

  function gnStr(k, id, field, v, min, max) {
    if (typeof v === 'string' && v.trim().length >= min && v.length <= max && !GN_CTRL.test(v)) return v.trim();
    warn(k, id, field, 'must be text of ' + min + '-' + max + ' characters, no control characters');
    return null;
  }
  function gnInt(v, lo, hi) { return isNum(v) && v === Math.floor(v) && v >= lo && v <= hi; }
  function gnLint(k, id, field, text, allowed) {
    var m;
    TOKEN_FIND.lastIndex = 0;
    while ((m = TOKEN_FIND.exec(text))) if (!Object.prototype.hasOwnProperty.call(allowed, m[1])) warn(k, id, field, 'token {' + m[1] + '} is not allowed here; it will be stripped');
  }
  function gnTags(k, id, field, v) {
    if (!Array.isArray(v)) { warn(k, id, field, 'must be an array of tag names; ignored'); return []; }
    var out = v.filter(function (t) { return typeof t === 'string' && GN_TAGRE.test(t) && !BAD_KEY.test(t); }).slice(0, 12);
    if (out.length !== v.length) warn(k, id, field, 'bad tag name(s) dropped');
    return out;
  }
  // when: numeric ranges + tags + approach. Unknown keys are dropped.
  var GN_WHEN_NUM = ['weekMin', 'weekMax', 'kMin', 'kMax', 'eMin', 'eMax', 'flakersMin', 'flakersMax', 'moraleMax', 'strikesMin', 'flakersMax'];
  function gnWhen(k, id, w) {
    var out = {};
    if (w == null) return out;
    if (!isObj(w)) { warn(k, id, 'when', 'must be an object; ignored'); return out; }
    Object.keys(w).forEach(function (key) {
      if (GN_WHEN_NUM.indexOf(key) >= 0) { if (isNum(w[key]) && w[key] >= -1 && w[key] <= 200) out[key] = w[key]; else warn(k, id, 'when.' + key, 'must be a number; ignored'); }
      else if (key === 'tags') out.tags = gnTags(k, id, 'when.tags', w[key]);
      else if (key === 'approach') { if (GN_APPROACH.indexOf(w[key]) >= 0) out.approach = w[key]; else warn(k, id, 'when.approach', 'must be ' + GN_APPROACH.join(', ') + '; ignored'); }
    });
    return out;
  }
  // one line of a pool: a string or { t, eMin, lvl, when, w, ask, needsTag }
  function gnEntry(k, id, field, x, allowed, max) {
    var e = typeof x === 'string' ? { t: x } : x;
    if (!isObj(e)) { warn(k, id, field, 'line is not text or an object; dropped'); return null; }
    var t = gnStr(k, id, field, e.t, 2, max || 200);
    if (!t) return null;
    if (!ctx) gnLint(k, id, field, t, allowed);
    var o = { t: t };
    if (e.eMin != null) { if (gnInt(e.eMin, 1, 30)) o.eMin = e.eMin; else warn(k, id, field + '.eMin', 'must be a whole number 1-30; ignored'); }
    if (e.lvl != null) { if (gnInt(e.lvl, 1, 3)) o.lvl = e.lvl; else warn(k, id, field + '.lvl', 'must be 1, 2 or 3; ignored'); }
    if (e.w != null) { if (isNum(e.w) && e.w >= 0.1 && e.w <= 5) o.w = e.w; else warn(k, id, field + '.w', 'must be 0.1-5; ignored'); }
    if (e.when != null) o.when = gnWhen(k, id, e.when);
    if (e.roll === true) o.roll = true;
    if (e.ask != null) { if (GN_SLOTS.indexOf(e.ask) >= 0) o.ask = e.ask; else warn(k, id, field + '.ask', 'must be one of ' + GN_SLOTS.join(', ') + '; ignored'); }
    if (e.needsTag != null) { if (typeof e.needsTag === 'string' && GN_TAGRE.test(e.needsTag)) o.needsTag = e.needsTag; else warn(k, id, field + '.needsTag', 'bad tag name; ignored'); }
    return o;
  }
  function gnPool(k, id, field, arr, allowed, max) {
    if (arr == null) return [];
    if (!Array.isArray(arr)) { warn(k, id, field, 'must be an array of lines; ignored'); return []; }
    var out = [];
    arr.forEach(function (x, i) { var e = gnEntry(k, id, field + '[' + i + ']', x, allowed, max); if (e) out.push(e); });
    return out;
  }
  function gnPart(e, id, story) {
    var k = story ? 'gamenight story' : 'gamenight part';
    var slot = story ? 'story' : e.slot;
    if (!story && GN_SLOTS.indexOf(e.slot) < 0) { warn(k, id, 'slot', 'must be one of ' + GN_SLOTS.join(', ') + '; skipped'); return null; }
    var label = gnStr(k, id, 'label', e.label, 3, 48);
    var text = gnStr(k, id, 'text', e.text, 5, 180);
    if (!label || !text) return null;
    if (!gnInt(e.elab, 1, 5)) { warn(k, id, 'elab', 'must be a whole number 1-5; skipped'); return null; }
    var o = { id: id, slot: slot, label: label, text: text, elab: e.elab };
    gnLint(k, id, 'label', label, GN_PART_TOK);
    gnLint(k, id, 'text', text, GN_PART_TOK);
    if (slot === 'cause' || slot === 'proof' || slot === 'story') {
      var sh = gnStr(k, id, 'short', e.short, 3, 40);
      if (!sh) return null;
      o.short = sh;
    }
    if (slot === 'proof') {
      var pl = gnStr(k, id, 'proofLabel', e.proofLabel, 3, 32);
      if (!pl) return null;
      o.proofLabel = pl;
    } else if (e.proofLabel != null) {
      var pl2 = gnStr(k, id, 'proofLabel', e.proofLabel, 3, 32);
      if (pl2) o.proofLabel = pl2;
    }
    o.tags = e.tags != null ? gnTags(k, id, 'tags', e.tags) : [];
    ['contradicts', 'requires', 'fits'].forEach(function (f) { o[f] = e[f] != null ? gnTags(k, id, f, e[f]) : []; });
    if (e.ttl != null) { if (gnInt(e.ttl, 0, 99)) o.ttl = e.ttl; else warn(k, id, 'ttl', 'must be a whole number 0-99; using the default'); }
    if (e.callback != null) { if (typeof e.callback === 'boolean') o.callback = e.callback; else warn(k, id, 'callback', 'must be true or false; ignored'); }
    if (o.callback && !o.requires.length) { warn(k, id, 'requires', 'a callback needs requires; treated as a normal part'); o.callback = false; }
    if (e.lastMinute != null) { if (typeof e.lastMinute === 'boolean') o.lastMinute = e.lastMinute; else warn(k, id, 'lastMinute', 'must be true or false; ignored'); }
    if (e.unlocks != null) { if (gnInt(e.unlocks, 1, 99)) o.unlocks = e.unlocks; else warn(k, id, 'unlocks', 'must be a whole number 1-99; ignored'); }
    o.weight = 1;
    if (e.weight != null) { if (isNum(e.weight) && e.weight >= 0.1 && e.weight <= 5) o.weight = e.weight; else warn(k, id, 'weight', 'must be 0.1-5; using 1'); }
    return o;
  }
  function gnOutcome(e, id) {
    var k = 'gamenight outcome';
    if (GN_KINDS.indexOf(e.kind) < 0) { warn(k, id, 'kind', 'must be one of ' + GN_KINDS.join(', ') + '; skipped'); return null; }
    var title = gnStr(k, id, 'title', e.title, 2, 60);
    if (!title) return null;
    var text = gnPool(k, id, 'text', e.text, GN_TOK, 240).map(function (x) { return x.t; });
    if (!text.length) { warn(k, id, 'text', 'needs at least one narrative line; skipped'); return null; }
    var o = { id: id, kind: e.kind, title: title, weight: 1, text: text.slice(0, 3), chat: gnPool(k, id, 'chat', e.chat, GN_TOK, 160).map(function (x) { return x.t; }).slice(0, 2), effects: { morale: 0, skep: 0, strike: 0, ptsMult: 1 }, when: gnWhen(k, id, e.when) };
    if (e.weight != null) { if (isNum(e.weight) && e.weight >= 0.1 && e.weight <= 5) o.weight = e.weight; else warn(k, id, 'weight', 'must be 0.1-5; using 1'); }
    if (e.kind === 'ending') {
      if (GN_ENDINGS.indexOf(e.ending) < 0) { warn(k, id, 'ending', 'must be one of ' + GN_ENDINGS.join(', ') + '; skipped'); return null; }
      o.ending = e.ending;
    }
    if (e.effects != null) {
      if (!isObj(e.effects)) warn(k, id, 'effects', 'must be an object; ignored');
      else [['morale', -15, 15], ['skep', -25, 25], ['strike', -1, 1], ['ptsMult', 0, 2]].forEach(function (d) {
        var v = e.effects[d[0]];
        if (v == null) return;
        if (isNum(v)) o.effects[d[0]] = Math.max(d[1], Math.min(d[2], v));
        else warn(k, id, 'effects.' + d[0], 'must be a number; ignored');
      });
    }
    return o;
  }
  function gnReactions(raw) {
    var k = 'gamenight reactions';
    var out = { byBand: {}, friendLines: {} };
    if (!isObj(raw)) return out;
    GN_BANDS.forEach(function (b) {
      out.byBand[b] = {};
      GN_RKINDS.forEach(function (kind) {
        var src = isObj(raw.byBand) && isObj(raw.byBand[b]) ? raw.byBand[b][kind] : null;
        out.byBand[b][kind] = gnPool(k, b + '.' + kind, 'lines', src, GN_TOK, 160);
      });
    });
    ['repeat', 'contradiction', 'callbackReward', 'proofDemand', 'proofPass', 'proofPerfect', 'proofFail', 'strike', 'strikeFinal', 'detectiveRise', 'detectiveStandDown', 'detectiveQuiz', 'believed'].forEach(function (key) {
      out[key] = gnPool(k, key, 'lines', raw[key], GN_TOK, 160);
    });
    out.proofDecoys = [];
    if (Array.isArray(raw.proofDecoys)) raw.proofDecoys.forEach(function (d, i) {
      if (!isObj(d)) { warn(k, 'proofDecoys[' + i + ']', '', 'not an object; skipped'); return; }
      var l = gnStr(k, 'proofDecoys[' + i + ']', 'label', d.label, 3, 32);
      if (l) out.proofDecoys.push({ label: l, tags: gnTags(k, 'proofDecoys[' + i + ']', 'tags', d.tags == null ? [] : d.tags) });
    });
    if (isObj(raw.friendLines)) Object.keys(raw.friendLines).forEach(function (fid) {
      if (BAD_KEY.test(fid) || !/^[A-Za-z0-9_-]{1,32}$/.test(fid) || !isObj(raw.friendLines[fid])) return;
      var o = {};
      GN_RKINDS.forEach(function (kind) { var p = gnPool(k, 'friendLines.' + fid, kind, raw.friendLines[fid][kind], GN_TOK, 160); if (p.length) o[kind] = p; });
      out.friendLines[fid] = o;
    });
    return out;
  }
  function gnPlan(raw) {
    var k = 'gamenight plan';
    var out = { gameNames: [], argue: { day: [], time: [], game: [] }, gamePicker: { options: [], chaos: [], outcomes: [] }, beats: { morning: [], afternoon: [], hour: [], zero: [], zeroAfter: [] }, counterOffers: [], disbandThreat: [], cancelOpeners: [], updateLines: [], differentGame: [] };
    if (!isObj(raw)) return out;
    if (Array.isArray(raw.gameNames)) raw.gameNames.forEach(function (n, i) { if (typeof n === 'string' && /^[\p{L}\p{N} .,'!?:&+()\-]{3,40}$/u.test(n)) out.gameNames.push(n.trim()); else warn(k, 'gameNames[' + i + ']', '', 'must be 3-40 characters of letters, digits and simple punctuation; dropped'); });
    var A = isObj(raw.argue) ? raw.argue : {};
    ['day', 'time', 'game'].forEach(function (f) { out.argue[f] = gnPool(k, 'argue.' + f, 'lines', A[f], GN_TOK, 160); });
    var P = isObj(raw.gamePicker) ? raw.gamePicker : {};
    if (Array.isArray(P.options)) P.options.forEach(function (o, i) {
      var id = 'gamePicker.options[' + i + ']';
      if (!isObj(o) || !isId(o.id)) { warn(k, id, 'id', 'missing or invalid; skipped'); return; }
      var nm = gnStr(k, o.id, 'name', o.name, 3, 32);
      if (!nm) return;
      var veto = gnPool(k, o.id, 'vetoLines', o.vetoLines, GN_TOK, 160).map(function (x) { return x.t; });
      out.gamePicker.options.push({ id: o.id, name: nm, vetoLines: veto });
    });
    out.gamePicker.chaos = gnPool(k, 'gamePicker.chaos', 'lines', P.chaos, GN_TOK, 160);
    out.gamePicker.outcomes = gnPool(k, 'gamePicker.outcomes', 'lines', P.outcomes, GN_TOK, 160);
    var B = isObj(raw.beats) ? raw.beats : {};
    Object.keys(out.beats).forEach(function (b) { out.beats[b] = gnPool(k, 'beats.' + b, 'lines', B[b], GN_TOK, 160); });
    out.disbandThreat = gnPool(k, 'disbandThreat', 'lines', raw.disbandThreat, GN_TOK, 160);
    out.updateLines = gnPool(k, 'updateLines', 'lines', raw.updateLines, GN_TOK, 160);
    out.differentGame = gnPool(k, 'differentGame', 'lines', raw.differentGame, GN_TOK, 160);
    out.counterOffers = list('gamenight counter-offer', raw.counterOffers, function (e, id) {
      var t = gnStr('gamenight counter-offer', id, 't', e.t, 3, 140);
      var acc = gnStr('gamenight counter-offer', id, 'accept', e.accept, 3, 160);
      if (!t || !acc) return null;
      var o = { id: id, t: t, accept: acc, kind: 'time', pressure: 1, declineNeeds: 'escalation', when: gnWhen('gamenight counter-offer', id, e.when) };
      if (e.kind != null) { if (['time', 'wait', 'move', 'download', 'lite'].indexOf(e.kind) >= 0) o.kind = e.kind; else warn('gamenight counter-offer', id, 'kind', 'unknown kind; using time'); }
      if (e.pressure != null) { if (gnInt(e.pressure, 1, 3)) o.pressure = e.pressure; else warn('gamenight counter-offer', id, 'pressure', 'must be 1-3; using 1'); }
      if (e.declineNeeds != null) { if (GN_SLOTS.indexOf(e.declineNeeds) >= 0) o.declineNeeds = e.declineNeeds; else warn('gamenight counter-offer', id, 'declineNeeds', 'must be a part slot; using escalation'); }
      return o;
    });
    out.cancelOpeners = list('gamenight cancel-opener', raw.cancelOpeners, function (e, id) {
      var t = gnStr('gamenight cancel-opener', id, 't', e.t, 3, 100);
      return t ? { id: id, t: t, elab: gnInt(e.elab, 1, 5) ? e.elab : 3 } : null;
    });
    return out;
  }
  function gnFlakes(raw) {
    var k = 'gamenight flakes';
    var out = { traits: {}, friendExcuses: [], events: [], solidarity: [], playerCatchesFriend: [], snowball: [] };
    if (!isObj(raw)) return out;
    if (isObj(raw.traits)) Object.keys(raw.traits).forEach(function (tid) {
      if (BAD_KEY.test(tid) || !/^[A-Za-z0-9_-]{1,32}$/.test(tid) || !isObj(raw.traits[tid])) return;
      var t = {};
      ['flakiness', 'persistence', 'gullibility', 'drama'].forEach(function (f) {
        var v = raw.traits[tid][f];
        if (v == null) return;
        if (isNum(v) && v >= 0 && v <= 1) t[f] = v; else warn(k, 'traits.' + tid, f, 'must be 0-1; ignored');
      });
      out.traits[tid] = t;
    });
    out.friendExcuses = list('gamenight friend-excuse', raw.friendExcuses, function (e, id) {
      var t = gnStr('gamenight friend-excuse', id, 't', e.t, 3, 140);
      if (!t) return null;
      var o = { id: id, t: t, elab: gnInt(e.elab, 1, 5) ? e.elab : 2, beat: ['any', 'morning', 'afternoon', 'hour', 'zero'].indexOf(e.beat) >= 0 ? e.beat : 'any', caught: '', weight: 1 };
      if (e.caught != null) { var c = gnStr('gamenight friend-excuse', id, 'caught', e.caught, 2, 140); if (c) o.caught = c; }
      if (e.weight != null) { if (isNum(e.weight) && e.weight >= 0.1 && e.weight <= 5) o.weight = e.weight; else warn('gamenight friend-excuse', id, 'weight', 'must be 0.1-5; using 1'); }
      return o;
    });
    out.events = list('gamenight event', raw.events, function (e, id) {
      var kinds = ['mass-flake', 'friend-caught', 'friend-late', 'friend-counter', 'friend-detective'];
      if (kinds.indexOf(e.kind) < 0) { warn('gamenight event', id, 'kind', 'must be one of ' + kinds.join(', ') + '; skipped'); return null; }
      if (!Array.isArray(e.lines) || !e.lines.length) { warn('gamenight event', id, 'lines', 'needs at least one { who, t } line; skipped'); return null; }
      var lines = [];
      e.lines.slice(0, 6).forEach(function (l, i) {
        if (!isObj(l) || !/^friend[2-5]?$/.test(String(l.who))) { warn('gamenight event', id, 'lines[' + i + '].who', 'must be friend, friend2 .. friend5; dropped'); return; }
        var t = gnStr('gamenight event', id, 'lines[' + i + '].t', l.t, 2, 160);
        if (t) lines.push({ who: l.who, t: t });
      });
      if (!lines.length) return null;
      var o = { id: id, kind: e.kind, weight: 1, when: gnWhen('gamenight event', id, e.when), lines: lines };
      if (e.persona != null && ['here-liar', 'on-the-way', 'last-second'].indexOf(e.persona) >= 0) o.persona = e.persona;
      if (e.weight != null) { if (isNum(e.weight) && e.weight >= 0.1 && e.weight <= 5) o.weight = e.weight; else warn('gamenight event', id, 'weight', 'must be 0.1-5; using 1'); }
      return o;
    });
    ['solidarity', 'playerCatchesFriend', 'snowball'].forEach(function (f) { out[f] = gnPool(k, f, 'lines', raw[f], GN_TOK, 160); });
    return out;
  }
  var GN_WHEN_KEYS = /^[a-zA-Z]{1,24}$/;
  function gnCleanAll(raw, isPack) {
    var k = 'gamenight';
    var out = { present: false, replace: [], parts: [], fullStories: [], reactions: gnReactions(null), plan: gnPlan(null), outcomes: [], flakes: gnFlakes(null), achievements: [], awards: [], titles: [] };
    if (!isObj(raw)) return out;
    out.present = true;
    if (Array.isArray(raw.replace)) out.replace = raw.replace.filter(function (p) { return typeof p === 'string' && /^[A-Za-z.]{1,40}$/.test(p) && !/__proto__|constructor|prototype/.test(p); }).slice(0, 20);
    out.parts = list('gamenight part', raw.parts, function (e, id) { return gnPart(e, id, false); });
    out.fullStories = list('gamenight story', raw.fullStories, function (e, id) { return gnPart(e, id, true); });
    out.reactions = gnReactions(raw.reactions);
    out.plan = gnPlan(raw.plan);
    out.outcomes = list('gamenight outcome', raw.outcomes, gnOutcome);
    out.flakes = gnFlakes(raw.flakes);
    var simple = function (kind, arr, withWhen) {
      return list(kind, arr, function (e, id) {
        var nm = gnStr(kind, id, 'name', e.name, 2, 40);
        if (!nm) return null;
        var o = { id: id, name: nm, desc: typeof e.desc === 'string' ? e.desc.slice(0, 120) : '', hint: typeof e.hint === 'string' ? e.hint.slice(0, 120) : '' };
        if (withWhen) {
          o.when = {};
          if (isObj(e.when)) Object.keys(e.when).forEach(function (key) {
            var v = e.when[key];
            if (!GN_WHEN_KEYS.test(key) || BAD_KEY.test(key)) return;
            if (typeof v === 'number' && isFinite(v)) o.when[key] = v;
            else if (typeof v === 'boolean') o.when[key] = v;
            else if (typeof v === 'string' && v.length <= 32) o.when[key] = v;
          });
        }
        return o;
      });
    };
    out.achievements = simple('gamenight achievement', raw.achievements, true);
    out.awards = simple('gamenight award', raw.awards, true);
    out.titles = list('gamenight title', raw.titles, function (e, id) {
      var nm = gnStr('gamenight title', id, 'name', e.name, 2, 40);
      if (!nm) return null;
      if (!isNum(e.minPts) || e.minPts < 0 || e.minPts > 1e7) { warn('gamenight title', id, 'minPts', 'must be a number 0-10000000; skipped'); return null; }
      return { id: id, name: nm, minPts: e.minPts };
    });
    // tag cross-check (warn only)
    var declared = {};
    out.parts.concat(out.fullStories).forEach(function (p) { p.tags.forEach(function (t) { declared[t] = true; }); });
    if (!isPack) out.parts.concat(out.fullStories).forEach(function (p) {
      ['requires', 'contradicts', 'fits'].forEach(function (f) { p[f].forEach(function (t) { if (!declared[t]) warn('gamenight part', p.id, f, 'tag "' + t + '" is not granted by any part'); }); });
    });
    return out;
  }
  // merge a pack's gamenight content over the base (spec 6.7): id lists replace-by-id, line pools append unless the pack lists the path in `replace`
  function gnMerge(base, pack) {
    if (!pack || !pack.present) return base;
    var rep = function (p) { return pack.replace.indexOf(p) >= 0; };
    var byId = function (a, b) { var m = {}; var o = []; a.concat(b).forEach(function (x) { if (m[x.id] != null) o[m[x.id]] = x; else { m[x.id] = o.length; o.push(x); } }); return o; };
    var app = function (p, a, b) { return rep(p) ? b.slice() : a.concat(b); };
    var out = { present: true, replace: [], parts: byId(base.parts, pack.parts), fullStories: byId(base.fullStories, pack.fullStories), outcomes: byId(base.outcomes, pack.outcomes), achievements: byId(base.achievements, pack.achievements), awards: byId(base.awards, pack.awards), titles: byId(base.titles, pack.titles) };
    var br = base.reactions;
    var pr = pack.reactions;
    var rx = { byBand: {}, proofDecoys: app('reactions.proofDecoys', br.proofDecoys, pr.proofDecoys), friendLines: {} };
    GN_BANDS.forEach(function (b) {
      rx.byBand[b] = {};
      GN_RKINDS.forEach(function (kind) { rx.byBand[b][kind] = rep('reactions.byBand') || rep('reactions.byBand.' + b) ? pr.byBand[b][kind].slice() : br.byBand[b][kind].concat(pr.byBand[b][kind]); });
    });
    ['repeat', 'contradiction', 'callbackReward', 'proofDemand', 'proofPass', 'proofPerfect', 'proofFail', 'strike', 'strikeFinal', 'detectiveRise', 'detectiveStandDown', 'detectiveQuiz', 'believed'].forEach(function (key) { rx[key] = app('reactions.' + key, br[key], pr[key]); });
    Object.keys(br.friendLines).concat(Object.keys(pr.friendLines)).forEach(function (fid) {
      if (rx.friendLines[fid]) return;
      var o = {};
      GN_RKINDS.forEach(function (kind) { var a = (br.friendLines[fid] || {})[kind] || []; var b = (pr.friendLines[fid] || {})[kind] || []; var m = rep('reactions.friendLines') ? b : a.concat(b); if (m.length) o[kind] = m; });
      rx.friendLines[fid] = o;
    });
    out.reactions = rx;
    var bp = base.plan;
    var pp = pack.plan;
    var pl = { gameNames: app('plan.gameNames', bp.gameNames, pp.gameNames), argue: {}, gamePicker: { options: byId(bp.gamePicker.options, pp.gamePicker.options), chaos: app('plan.gamePicker.chaos', bp.gamePicker.chaos, pp.gamePicker.chaos), outcomes: app('plan.gamePicker.outcomes', bp.gamePicker.outcomes, pp.gamePicker.outcomes) }, beats: {}, counterOffers: byId(bp.counterOffers, pp.counterOffers), cancelOpeners: byId(bp.cancelOpeners, pp.cancelOpeners) };
    ['day', 'time', 'game'].forEach(function (f) { pl.argue[f] = app('plan.argue.' + f, bp.argue[f], pp.argue[f]); });
    Object.keys(bp.beats).forEach(function (f) { pl.beats[f] = app('plan.beats.' + f, bp.beats[f], pp.beats[f]); });
    ['disbandThreat', 'updateLines', 'differentGame'].forEach(function (f) { pl[f] = app('plan.' + f, bp[f], pp[f]); });
    out.plan = pl;
    var bf = base.flakes;
    var pf = pack.flakes;
    var tr = {};
    Object.keys(bf.traits).forEach(function (t) { tr[t] = bf.traits[t]; });
    Object.keys(pf.traits).forEach(function (t) { var m = {}; var a = tr[t] || {}; Object.keys(a).forEach(function (q) { m[q] = a[q]; }); Object.keys(pf.traits[t]).forEach(function (q) { m[q] = pf.traits[t][q]; }); tr[t] = m; });
    out.flakes = { traits: tr, friendExcuses: byId(bf.friendExcuses, pf.friendExcuses), events: byId(bf.events, pf.events) };
    ['solidarity', 'playerCatchesFriend', 'snowball'].forEach(function (f) { out.flakes[f] = app('flakes.' + f, bf[f], pf[f]); });
    return out;
  }
  // sections under their minimum are listed in `missing`; the engine uses its built-in fallback for them
  function gnViable(c) {
    var miss = [];
    var cnt = function (slot) { return c.parts.filter(function (p) { return p.slot === slot; }).length; };
    if (cnt('cause') < 4 || GN_SLOTS.slice(1).some(function (s) { return cnt(s) < 2; })) miss.push('parts');
    var rxOk = GN_BANDS.every(function (b) { return GN_RKINDS.every(function (kk) { return c.reactions.byBand[b][kk].length >= 1; }); });
    if (!rxOk) miss.push('reactions');
    if (!Object.keys(c.plan.beats).every(function (b) { return c.plan.beats[b].length >= 2 || b === 'zeroAfter' && c.plan.beats[b].length >= 1; })) miss.push('plan');
    var kinds = {};
    c.outcomes.forEach(function (o) { kinds[o.kind] = true; });
    if (!GN_KINDS.every(function (x) { return kinds[x]; })) miss.push('outcomes');
    return miss;
  }
  var GN_BASE = gnCleanAll(C.gamenight, false);
  var gnCache = {};
  function gnFor(id) {
    var key = id || 'classic';
    if (gnCache[key]) return gnCache[key];
    var pk = null;
    if (key !== 'classic') {
      var rawPk = window.AFK_PACKS && isObj(window.AFK_PACKS) && isObj(window.AFK_PACKS[key]) ? window.AFK_PACKS[key].gamenight : null;
      if (rawPk) {
        ctx = '[' + key + '] ';
        try { pk = gnCleanAll(rawPk, true); } finally { ctx = ''; }
      }
    }
    var merged = gnMerge(GN_BASE, pk);
    merged.missing = merged.present ? gnViable(merged) : ['all'];
    if (merged.missing.length) warn('gamenight', key, '', merged.missing.join(', ') + ' content is missing or below its minimum; the built-in fallback is used for it');
    gnCache[key] = merged;
    return merged;
  }

  // ---------- run ----------
  var R = {
    characters: list('character', C.characters, character),
    channels: list('channel', C.channels, channel),
    items: list('item', C.items, item),
    themes: list('theme', C.themes, theme),
    paths: list('path', C.paths, path),
    pathEvents: pathEvents(C.pathEvents),
    pathLines: lineMap('pathLines', C.pathLines),
    dialog: dialog(C.dialog),
    roster: rosterContent(C.roster),
    rogue: BASE_ROGUE.present ? BASE_ROGUE : null,
    // the rogue content a given pack plays with (base + that pack, merged once and cached); null when no rogue content exists
    rogueFor: function (id) {
      if (!BASE_ROGUE.present) return null;
      var key = id || 'classic';
      var pk = key !== 'classic' && packs[key] && packs[key].rogue && packs[key].rogue.present ? packs[key].rogue : null;
      var ck = key + (pk ? '+' : '');
      if (!mergedCache[ck]) mergedCache[ck] = mergeRogue(BASE_ROGUE, pk);
      return mergedCache[ck];
    },
    // game night content: the base set merged with a pack's (cached). `missing` lists sections below their minimum (built-ins fill in)
    gamenight: GN_BASE.present ? GN_BASE : null,
    gamenightFor: gnFor,
    effectDefs: EFFECT_DEFS,
    enums: { categories: CATEGORIES, tiers: TIERS, rarities: RARITIES, traits: TRAITS },
    effectsObj: effectsObj,
    packList: packList,
    packs: packs,
    resolvePack: function (id) {
      var e = packList.filter(function (p) { return p.id === id; })[0];
      if (!e || !e.manifest) return null;
      var rp = resolvePack(e.manifest);
      packs[id] = rp;
      if (rp) { e.ready = true; e.server = rp.server; }
      return rp;
    },
    cleanBulk: cleanBulk,
    warnings: warnings
  };

  // cross-references (warn only; the game ignores dangling ids)
  var charIds = {};
  R.characters.forEach(function (c) { charIds[c.id] = true; });
  R.channels.forEach(function (ch) {
    ch.members.forEach(function (m) { if (!charIds[m]) warn('channel', ch.id, 'members', 'unknown character id "' + m + '"; it will be ignored'); });
  });
  var pathIds = {};
  R.paths.forEach(function (p) { pathIds[p.id] = true; });
  R.paths.forEach(function (p) {
    p.events.forEach(function (ev) { if (ev !== 'alone-drift' && !R.pathEvents[ev]) warn('path', p.id, 'events', 'unknown event id "' + ev + '"; it will be ignored'); });
  });
  if (R.paths.length) {
    R.characters.forEach(function (c) {
      c.digs.forEach(function (d, i) {
        (d.when.paths || []).forEach(function (pid) { if (!pathIds[pid]) warn('character', c.id + '.digs[' + i + ']', 'when.paths', 'unknown path id "' + pid + '"; this dig can never match that path'); });
      });
    });
  }

  var hasFriendTok = function (x) { return typeof x === 'string' && /\{friend(:[^{}]*)?\}/.test(x); };
  var friendLines = 0;
  Object.keys(R.dialog.LINES).forEach(function (key) { R.dialog.LINES[key].forEach(function (x) { if (hasFriendTok(x)) friendLines++; }); });
  R.characters.forEach(function (c) {
    Object.keys(c.lines).forEach(function (key) { c.lines[key].forEach(function (x) { if (hasFriendTok(x)) friendLines++; }); });
    c.digs.forEach(function (d) { if (hasFriendTok(d.text)) friendLines++; });
  });

  R.counts = {
    friendTokenLines: friendLines,
    rosterTraits: Object.keys(R.roster.traits).length,
    characters: R.characters.length,
    friends: R.characters.filter(function (c) { return c.role === 'friend'; }).length,
    residents: R.characters.filter(function (c) { return c.role === 'resident'; }).length,
    bots: R.characters.filter(function (c) { return c.role === 'bot'; }).length,
    digs: R.characters.reduce(function (n, c) { return n + c.digs.length; }, 0),
    channels: R.channels.length,
    items: R.items.length,
    rogueBoons: BASE_ROGUE.boons.length,
    gamenightParts: GN_BASE.parts.length,
    gamenightOutcomes: GN_BASE.outcomes.length,
    rogueRelics: BASE_ROGUE.relics.length,
    themes: R.themes.length,
    paths: R.paths.length,
    pathEvents: Object.keys(R.pathEvents).length,
    brb: R.dialog.BRB.length,
    excuses: R.dialog.EXCUSES.length,
    lineKeys: Object.keys(R.dialog.LINES).length,
    packs: packList.length - 1,
    warnings: warnings.length
  };

  window.AFK_RESOLVED = R;
  if (/[?&]debug=1(&|$)/.test(location.search)) {
    try { console.log('[afk-content] loaded ' + JSON.stringify(R.counts)); } catch (e) { /* no console */ }
  }
})();
