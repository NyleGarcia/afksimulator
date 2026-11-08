/* AFK Simulator crew roster (pure, no DOM). Exposes window.AFK_ROSTER.
 * "Your crew": player-chosen names replace the server's friends by slot (see rogue_spec section 1).
 * Everything here treats its input as untrusted (localStorage, pasted JSON): it only ever rebuilds plain objects from a whitelist. */
(function (root) {
  'use strict';
  var MAX_CREW = 8;
  var MAX_NAME = 16;
  var MAX_IMPORT = 2048;
  var TRAITS = ['roaster', 'hype', 'chill', 'rival', 'chaotic'];
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var isPlain = function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v); };
  var esc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };

  // used only if content/roster-traits.js is missing; the shipped file overrides it through AFK_RESOLVED.roster
  var FALLBACK_PALETTE = ['#e67e22', '#4aa3df', '#2ecc71', '#e84393', '#a77bd6', '#1abc9c', '#e74c3c', '#5d8aef', '#ff8fb1', '#00b8b0', '#ff9f43', '#9aa8ff'];
  var FALLBACK_TRAITS = {
    roaster: { tags: ['roaster'], digRate: 0.6, lines: { mid: ['{t}. unreal.'], high: ['{t}!!! actual clown behavior'] }, digs: [{ text: '{t}. {me} is a loading screen with a mic', when: { susMin: 35 } }] },
    hype: { tags: ['hype'], digRate: 0.15, lines: { ok: ['LETS GOOO'], good: ['W return king'] }, digs: [{ text: '{me} we believe in you (come back)', when: { susMin: 35 } }] },
    chill: { tags: ['chill'], digRate: 0.1, quiet: true, lines: { chill: ['no rush fr'], ok: ['all good'] }, digs: [{ text: 'no stress {me}, but it has been {t}', when: { susMin: 35 } }] },
    rival: { tags: ['rival'], digRate: 0.65, lines: { mid: ['called it'], high: ['{friend} owes me money, {me} left again'] }, digs: [{ text: '{me} said {p}. {t}. petty? yes', when: { susMin: 35 } }] },
    chaotic: { tags: ['chaotic'], digRate: 0.5, wildcard: true, lines: { ok: ['sure whatever'], high: ['THE PROPHECY IS TRUE'] }, digs: [{ text: '{me} has entered the shadow realm for {t}', when: { susMin: 35 } }] }
  };

  function hash32(s) {
    if (root.AFK_RNG && root.AFK_RNG.hash32) return root.AFK_RNG.hash32(s);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ---------- sanitizing ----------
  function sanitizeCrewName(v) {
    var n = String(v == null ? '' : v)
      .replace(/[\u0000-\u001f\u007f-\u009f@{}​-‏‪-‮⁦-⁩﻿]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return Array.from(n).slice(0, MAX_NAME).join('').trim();
  }
  var validTrait = function (t) { return typeof t === 'string' && TRAITS.indexOf(t) >= 0; };

  // list -> clean [{n, t?}]. Returns { crew, dropped } (dropped counts are for import warnings)
  var reserved = Object.create(null);
  function setReserved(list) { reserved = Object.create(null); (Array.isArray(list) ? list : []).forEach(function (n) { if (typeof n === 'string') reserved[n.toLowerCase()] = true; }); }
  function normalizeStats(list, meName) {
    var crew = [];
    var dropped = { empty: 0, dupe: 0, me: 0, over: 0, trait: 0 };
    var seen = Object.create(null);
    var me = String(meName == null ? '' : meName).toLowerCase();
    (Array.isArray(list) ? list : []).forEach(function (e) {
      var raw = typeof e === 'string' ? e : (isPlain(e) && has(e, 'n') ? e.n : '');
      if (typeof raw !== 'string') raw = '';
      var n = sanitizeCrewName(raw);
      if (!n) { dropped.empty++; return; }
      var low = n.toLowerCase();
      if (me && low === me) { dropped.me++; return; }
      if (reserved[low]) { dropped.dupe++; return; }
      if (has(seen, low)) { dropped.dupe++; return; }
      if (crew.length >= MAX_CREW) { dropped.over++; return; }
      seen[low] = true;
      var o = { n: n };
      if (isPlain(e) && has(e, 't') && e.t != null && e.t !== '') {
        if (validTrait(e.t)) o.t = e.t; else dropped.trait++;
      }
      crew.push(o);
    });
    return { crew: crew, dropped: dropped };
  }
  function normalizeCrew(list, meName) { return normalizeStats(list, meName).crew; }

  // stored value -> { v:1, on, crew }. Never throws; bad data -> inactive empty roster.
  function load(raw, meName) {
    var out = { v: 1, on: false, crew: [] };
    try {
      if (!isPlain(raw) || raw.v !== 1) return out;
      out.crew = normalizeCrew(raw.crew, meName);
      out.on = raw.on === true && out.crew.length > 0;
    } catch (e) { return { v: 1, on: false, crew: [] }; }
    return out;
  }
  var isActive = function (r) { return !!(r && r.on === true && Array.isArray(r.crew) && r.crew.length > 0); };

  // ---------- import / export ----------
  function exportText(crew) {
    var c = normalizeCrew(crew, '');
    return JSON.stringify({ v: 1, crew: c });
  }
  function parseImport(text, meName) {
    try {
      if (typeof text !== 'string') return { ok: false, error: 'Nothing to import.' };
      var t = text.trim();
      if (t.length < 2) return { ok: false, error: 'Empty. Paste the text from Export.' };
      if (t.length > MAX_IMPORT) return { ok: false, error: 'Too big (max ' + MAX_IMPORT + ' characters).' };
      if (t.charAt(0) !== '{' || t.charAt(t.length - 1) !== '}') return { ok: false, error: 'That does not look like a crew export.' };
      var j;
      try { j = JSON.parse(t); } catch (e) { return { ok: false, error: 'Could not read that (invalid JSON).' }; }
      if (!isPlain(j) || j.v !== 1) return { ok: false, error: 'Unsupported format (expected v 1).' };
      if (!Array.isArray(j.crew)) return { ok: false, error: 'No crew list found.' };
      var warnings = [];
      var list = j.crew;
      if (list.length > 32) { warnings.push((list.length - 32) + ' extra entries ignored'); list = list.slice(0, 32); }
      var r = normalizeStats(list, meName);
      if (!r.crew.length) return { ok: false, error: 'No valid names in there.' };
      if (r.dropped.dupe) warnings.push(r.dropped.dupe + ' duplicate' + (r.dropped.dupe === 1 ? '' : 's') + ' dropped');
      if (r.dropped.me) warnings.push('your own handle was skipped');
      if (r.dropped.empty) warnings.push(r.dropped.empty + ' empty or invalid name' + (r.dropped.empty === 1 ? '' : 's') + ' dropped');
      if (r.dropped.over) warnings.push('only the first ' + MAX_CREW + ' names were kept');
      if (r.dropped.trait) warnings.push('traits ignored: ' + r.dropped.trait + ' unknown');
      var keys = 0;
      Object.keys(j).forEach(function (k) { if (k !== 'v' && k !== 'crew' && k !== 'on') keys++; });
      if (keys) warnings.push(keys + ' unknown field' + (keys === 1 ? '' : 's') + ' ignored');
      return { ok: true, crew: r.crew, warnings: warnings };
    } catch (e) {
      return { ok: false, error: 'Could not read that.' };
    }
  }

  // ---------- colors ----------
  // names -> { name: '#hex' }. Stable: depends only on the SET of names (+ the colors to avoid), never on list order.
  function assignColors(names, palette, avoid) {
    var P = Array.isArray(palette) && palette.length >= 4 ? palette : FALLBACK_PALETTE;
    var avoidSet = {};
    (avoid || []).forEach(function (c) { if (typeof c === 'string') avoidSet[c.toLowerCase()] = true; });
    var used = {};
    var out = Object.create(null);
    var sorted = names.slice().sort(function (a, b) { var x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; });
    sorted.forEach(function (n) {
      var start = hash32(n.toLowerCase()) % P.length;
      var pickSlot = function (skipAvoid) {
        for (var k = 0; k < P.length; k++) {
          var i = (start + k) % P.length;
          var c = P[i].toLowerCase();
          if (used[i] || (skipAvoid && avoidSet[c])) continue;
          return i;
        }
        return -1;
      };
      var i = pickSlot(true);
      if (i < 0) i = pickSlot(false);
      if (i < 0) i = start;
      used[i] = true;
      out[n] = P[i];
    });
    return out;
  }
  var colorFor = function (name, palette) { var o = assignColors([name], palette, []); return o[name]; };

  // ---------- applying the roster to the cast ----------
  // baseFriends: the active content set's friend characters (in order). voice: voice channel objects.
  // roster: { on, crew }. opts: { traits, palette, meName, meColor }.
  // Returns { active, friends, voice, names (original -> crew), crew (names) }. Pure; never mutates its inputs.
  function applyRoster(baseFriends, voice, roster, opts) {
    opts = opts || {};
    var cast = Array.isArray(baseFriends) ? baseFriends : [];
    var voices = Array.isArray(voice) ? voice : [];
    var res = { active: false, friends: cast, voice: voices, names: {}, crew: [] };
    if (!isActive(roster)) return res;
    var crew = normalizeCrew(roster.crew, opts.meName);
    if (!crew.length) return res;
    var traits = opts.traits && isPlain(opts.traits) ? opts.traits : {};
    var traitDef = function (t) { return (t && (has(traits, t) ? traits[t] : has(FALLBACK_TRAITS, t) ? FALLBACK_TRAITS[t] : null)) || null; };

    // slot assignment: rival-trait crew take a rival cast member first, everyone else fills free slots in cast order
    var slotOf = new Array(crew.length);
    var taken = {};
    crew.forEach(function (c, ci) {
      if (c.t !== 'rival') return;
      for (var s = 0; s < cast.length; s++) if (!taken[s] && cast[s].rival === true) { taken[s] = true; slotOf[ci] = s; break; }
    });
    crew.forEach(function (c, ci) {
      if (slotOf[ci] != null) return;
      for (var s = 0; s < cast.length; s++) if (!taken[s]) { taken[s] = true; slotOf[ci] = s; return; }
      slotOf[ci] = -1; // extra: no cast slot left
    });

    var replaced = {}; // cast index -> crew index
    crew.forEach(function (c, ci) { if (slotOf[ci] >= 0) replaced[slotOf[ci]] = ci; });
    var avoid = [opts.meColor];
    cast.forEach(function (f, s) { if (!has(replaced, s)) avoid.push(f.color); });
    var colors = assignColors(crew.map(function (c) { return c.n; }), opts.palette, avoid);

    var mk = function (base, c, extraIdx) {
      var td = traitDef(c.t);
      var f = {
        id: base ? base.id : 'crew-' + extraIdx,
        name: c.n,
        color: colors[c.n],
        role: 'friend',
        tags: td && Array.isArray(td.tags) ? td.tags.slice() : [],
        rival: c.t === 'rival',
        lines: {},
        digs: [],
        custom: true
      };
      if (base) { f.role = base.role || 'friend'; }
      if (td) {
        Object.keys(td.lines || {}).forEach(function (k) { if (Array.isArray(td.lines[k])) f.lines[k] = td.lines[k].slice(); });
        f.digs = (td.digs || []).map(function (d) { return { text: d.text, when: d.when ? Object.assign({}, d.when) : {} }; });
        if (typeof td.digRate === 'number') f.digRate = td.digRate;
        if (td.quiet) f.quiet = true;
        if (td.wildcard) f.wildcard = true;
      }
      if (c.t) f.trait = c.t;
      return f;
    };

    var origNames = [];
    var friends = cast.map(function (f, s) {
      if (!has(replaced, s)) return f;
      var c = crew[replaced[s]];
      origNames.push(f.name);
      res.names[f.name] = c.n;
      return mk(f, c, 0);
    });
    // unreplaced characters must not talk about people who are gone
    if (origNames.length) {
      var res2 = origNames.map(function (n) { return new RegExp('(?<![\\w])' + esc(n) + '(?![\\w])', 'i'); });
      friends = friends.map(function (f, s) {
        if (has(replaced, s) || !Array.isArray(f.digs) || !f.digs.length) return f;
        var digs = f.digs.filter(function (d) { return !res2.some(function (re) { return re.test(d.text); }); });
        return digs.length === f.digs.length ? f : Object.assign({}, f, { digs: digs });
      });
    }
    var extraIds = [];
    crew.forEach(function (c, ci) {
      if (slotOf[ci] >= 0) return;
      var x = mk(null, c, ci);
      friends.push(x);
      extraIds.push(x.id);
    });
    // extras join every non-afk voice channel that lists members (channels with an empty list already admit everyone)
    var vc = voices.map(function (ch) {
      var members = Array.isArray(ch.members) ? ch.members.slice() : [];
      if (!ch.isAfk && members.length) extraIds.forEach(function (id) { if (members.indexOf(id) < 0) members.push(id); });
      return Object.assign({}, ch, { members: members });
    });
    res.active = true;
    res.friends = friends;
    res.voice = vc;
    res.crew = crew.map(function (c) { return c.n; });
    return res;
  }

  // original names -> crew names inside raw (pre-token) content lines. One pass, whole word, case-sensitive.
  function nameFixer(names) {
    var keys = Object.keys(names || {}).filter(function (k) { return k && names[k] && k !== names[k]; });
    if (!keys.length) return null;
    keys.sort(function (a, b) { return b.length - a.length; });
    var re = new RegExp('(?<![\\w])(?:' + keys.map(esc).join('|') + ')(?![\\w])', 'g');
    return function (text) { return typeof text === 'string' && text ? text.replace(re, function (m) { return has(names, m) ? names[m] : m; }) : text; };
  }

  // {friend}: a random OTHER friend (never the speaker), preferring friends who are not away. null when nobody qualifies.
  function pickOtherFriend(friends, speaker, rnd) {
    var r = typeof rnd === 'function' ? rnd : Math.random;
    var list = (Array.isArray(friends) ? friends : []).filter(function (f) {
      if (!f || typeof f.name !== 'string' || !f.name) return false;
      if (speaker && (f === speaker || (speaker.id != null && f.id === speaker.id))) return false;
      return true;
    });
    var free = list.filter(function (f) { return !f.away; });
    var pool = free.length ? free : list;
    return pool.length ? pool[Math.floor(r() * pool.length)].name : null;
  }

  root.AFK_ROSTER = {
    MAX_CREW: MAX_CREW, MAX_NAME: MAX_NAME, MAX_IMPORT: MAX_IMPORT, TRAITS: TRAITS,
    sanitizeCrewName: sanitizeCrewName, normalizeCrew: normalizeCrew, normalizeStats: normalizeStats, setReserved: setReserved,
    load: load, isActive: isActive, exportText: exportText, parseImport: parseImport,
    assignColors: assignColors, colorFor: colorFor, applyRoster: applyRoster, nameFixer: nameFixer,
    pickOtherFriend: pickOtherFriend, FALLBACK_PALETTE: FALLBACK_PALETTE
  };
})(typeof window !== 'undefined' ? window : globalThis);
