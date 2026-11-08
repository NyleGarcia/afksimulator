/* AFK Simulator seeded RNG (pure, no DOM). Exposes window.AFK_RNG.
 * Never one global sequence: every decision draws from a keyed stream, so it depends only on (seed, name, index). */
(function (root) {
  'use strict';
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var hash32 = function (s) { return xmur3(String(s))(); };
  var keyed = function (seed, name) {
    var idx = Array.prototype.slice.call(arguments, 2);
    return mulberry32(hash32([seed, name].concat(idx).join('|')));
  };
  function normSeed(s) {
    if (s == null) return null;
    var n = String(s).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    return n || null;
  }
  var CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function randomSeed() {
    var bytes = new Uint8Array(8);
    var c = root.crypto;
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
    else for (var i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    var out = '';
    for (var j = 0; j < 8; j++) out += CROCK.charAt(bytes[j] % 32);
    return out.slice(0, 4) + '-' + out.slice(4);
  }
  function dailySeed(date) {
    var d = date instanceof Date ? date : new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'DAILY-' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
  }
  function helpers(rng) {
    var h = {
      rand: function (a, b) { return a + rng() * (b - a); },
      int: function (n) { return Math.floor(rng() * n); },
      pick: function (arr) { return arr[Math.floor(rng() * arr.length)]; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      },
      weighted: function (arr, wFn) {
        var tot = 0;
        var ws = arr.map(function (x) { var w = wFn ? wFn(x) : 1; w = w > 0 ? w : 0; tot += w; return w; });
        if (!(tot > 0)) return arr[Math.floor(rng() * arr.length)];
        var r = rng() * tot;
        for (var i = 0; i < arr.length; i++) { r -= ws[i]; if (r < 0) return arr[i]; }
        return arr[arr.length - 1];
      },
      chance: function (p) { return rng() < p; }
    };
    return h;
  }
  root.AFK_RNG = { xmur3: xmur3, mulberry32: mulberry32, hash32: hash32, keyed: keyed, normSeed: normSeed, dailySeed: dailySeed, randomSeed: randomSeed, helpers: helpers };
})(typeof window !== 'undefined' ? window : globalThis);
