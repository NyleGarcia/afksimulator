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
  var EFFECTS = { susMult: 'mult', pointMult: 'mult', micEventChance: 'mult', excuseBonus: 'add', graceMins: 'add' };
  var CONTENT_VERSION = 4;
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

  // ---------- characters ----------
  function dig(kind, cid, d, i) {
    var where = cid + '.digs[' + i + ']';
    if (!isObj(d) || !isStr(d.text)) { warn(kind, where, 'text', 'missing or not text; dig skipped'); return null; }
    var out = { text: d.text.trim(), when: {} };
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
        if (!/^[a-zA-Z]{1,24}$/.test(key) || BAD_KEY.test(key)) { warn(k, id, 'lines.' + key, 'bad key; ignored'); return; }
        var arr = strList(k, id, 'lines.' + key, e.lines[key]);
        if (arr && arr.length) out.lines[key] = arr;
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
  function item(e, id) {
    var k = 'item';
    if (!isStr(e.name, 40)) { warn(k, id, 'name', 'missing or not text; skipped'); return null; }
    if (!isNum(e.price) || e.price < 0 || e.price > 9999 || Math.floor(e.price) !== e.price) { warn(k, id, 'price', 'must be a whole number 0-9999; skipped'); return null; }
    if (!isObj(e.effects)) { warn(k, id, 'effects', 'missing or not an object; skipped'); return null; }
    var fx = {};
    Object.keys(e.effects).forEach(function (f) {
      var v = e.effects[f];
      if (!Object.prototype.hasOwnProperty.call(EFFECTS, f)) { warn(k, id, 'effects.' + f, 'unknown effect (use ' + Object.keys(EFFECTS).join(', ') + '); ignored'); return; }
      if (!isNum(v)) { warn(k, id, 'effects.' + f, 'must be a number; ignored'); return; }
      if (EFFECTS[f] === 'mult' && (v <= 0 || v > 10)) { warn(k, id, 'effects.' + f, 'multiplier must be above 0 and at most 10; ignored'); return; }
      if (EFFECTS[f] === 'add' && Math.abs(v) > 1000) { warn(k, id, 'effects.' + f, 'must be between -1000 and 1000; ignored'); return; }
      if (f === 'graceMins' && v < 0) { warn(k, id, 'effects.' + f, 'must be >= 0; ignored'); return; }
      fx[f] = v;
    });
    if (!Object.keys(fx).length) { warn(k, id, 'effects', 'no valid effects left; skipped'); return null; }
    var out = { id: id, icon: '📦', name: e.name.trim(), desc: '', price: e.price, effects: fx, stackable: false, max: 1, consumable: false };
    if (e.icon != null) { if (isStr(e.icon, 8)) out.icon = e.icon.trim(); else warn(k, id, 'icon', 'must be short text (an emoji); using default'); }
    if (e.desc != null) { if (isStr(e.desc, 200)) out.desc = e.desc.trim(); else warn(k, id, 'desc', 'must be text under 200 chars; ignored'); }
    ['stackable', 'consumable'].forEach(function (f) {
      if (e[f] == null) return;
      if (typeof e[f] === 'boolean') out[f] = e[f]; else warn(k, id, f, 'must be true or false; ignored');
    });
    if (out.stackable) out.max = 5;
    if (e.max != null) {
      if (isNum(e.max) && e.max >= 1 && e.max <= 99 && Math.floor(e.max) === e.max) { if (out.stackable) out.max = e.max; else warn(k, id, 'max', 'only used when stackable is true; ignored'); }
      else warn(k, id, 'max', 'must be a whole number 1-99; ignored');
    }
    return out;
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
      if (arr && arr.length) out[key] = arr;
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
        if (isObj(b) && isStr(b.t, 80) && isNum(b.p) && b.p > 0 && b.p <= 1440 && isNum(b.m) && b.m > 0 && b.m <= 10) out.BRB.push({ t: b.t, p: b.p, m: b.m });
        else warn('dialog', 'BRB[' + i + ']', 't/p/m', 'needs text t, promised minutes p (0-1440] and multiplier m (0-10]; skipped');
      });
    } else if (d.BRB != null) warn('dialog', 'BRB', '', 'must be an array; ignored');
    if (Array.isArray(d.EXCUSES)) {
      d.EXCUSES.forEach(function (x, i) {
        if (isObj(x) && isStr(x.t, 80) && Array.isArray(x.r) && x.r.length === 2 && isNum(x.r[0]) && isNum(x.r[1]) && x.r[0] <= x.r[1]) out.EXCUSES.push({ t: x.t, r: [x.r[0], x.r[1]] });
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

  R.counts = {
    characters: R.characters.length,
    friends: R.characters.filter(function (c) { return c.role === 'friend'; }).length,
    residents: R.characters.filter(function (c) { return c.role === 'resident'; }).length,
    bots: R.characters.filter(function (c) { return c.role === 'bot'; }).length,
    digs: R.characters.reduce(function (n, c) { return n + c.digs.length; }, 0),
    channels: R.channels.length,
    items: R.items.length,
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
