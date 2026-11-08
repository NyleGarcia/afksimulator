/* BoberNet pack: template slot generator. Classic script, no deps. */
window.AFK_PACKS = window.AFK_PACKS || {};
window.AFK_PACKS.bobernet = window.AFK_PACKS.bobernet || {};

/*
 * generate(template, pools, rng, recentSet) -> string
 *  template : string | { t, tags, w }
 *  pools    : { poolName: [ 'str' | { v|t|text, tags:[], w:1 } ] } or { poolName: { items:[...] } }
 *  rng      : () => [0,1)  (defaults to Math.random)
 *  recentSet: optional Set (or array) of recently used values; avoided when alternatives exist.
 * Slot syntax: {name} or {name:tag}. Unknown slots (no pool / empty pool / no match) stay as-is.
 * Chosen values are added to recentSet if it is a Set. Repeats of the same slot in one
 * template reuse the same value only when no other candidate exists (distinct otherwise).
 */
window.AFK_PACKS.bobernet.generate = function (template, pools, rng, recentSet) {
  var rand = typeof rng === 'function' ? rng : Math.random;
  var text = typeof template === 'string' ? template : (template && (template.t || template.text)) || '';
  pools = pools || {};
  var isSet = recentSet && typeof recentSet.has === 'function';
  var isArr = Array.isArray(recentSet);
  function recent(v) {
    return isSet ? recentSet.has(v) : isArr ? recentSet.indexOf(v) !== -1 : false;
  }
  function norm(item) {
    if (typeof item === 'string') return { v: item, tags: [], w: 1 };
    if (!item) return null;
    var v = item.v != null ? item.v : item.t != null ? item.t : item.text;
    if (v == null) return null;
    var w = typeof item.w === 'number' ? item.w : 1;
    return { v: String(v), tags: Array.isArray(item.tags) ? item.tags : [], w: w };
  }
  function pick(cands) {
    var total = 0, i;
    for (i = 0; i < cands.length; i++) total += cands[i].w;
    if (total <= 0) return cands[Math.floor(rand() * cands.length)] || cands[0];
    var r = rand() * total;
    for (i = 0; i < cands.length; i++) {
      r -= cands[i].w;
      if (r < 0) return cands[i];
    }
    return cands[cands.length - 1];
  }
  var usedHere = [];
  var filled = text.replace(/\{([A-Za-z_][\w]*)(?::([^{}]+))?\}/g, function (whole, name, tag) {
    var pool = pools[name];
    if (pool && !Array.isArray(pool) && Array.isArray(pool.items)) pool = pool.items;
    if (!Array.isArray(pool) || !pool.length) return whole;
    var items = [], i;
    for (i = 0; i < pool.length; i++) {
      var n = norm(pool[i]);
      if (n && n.w > 0) items.push(n);
    }
    if (tag) {
      var want = tag.trim();
      items = items.filter(function (it) { return it.tags.indexOf(want) !== -1; });
    }
    if (!items.length) return whole;
    var fresh = items.filter(function (it) { return !recent(it.v) && usedHere.indexOf(it.v) === -1; });
    if (!fresh.length) fresh = items.filter(function (it) { return usedHere.indexOf(it.v) === -1; });
    if (!fresh.length) fresh = items;
    var chosen = pick(fresh);
    usedHere.push(chosen.v);
    if (isSet && typeof recentSet.add === 'function') recentSet.add(chosen.v);
    return chosen.v;
  });
  // pool values like "the Dam Builders" after a template "the {org}" -> collapse the double article
  return filled.replace(/\b(the)\s+the\b/gi, '$1');
};
