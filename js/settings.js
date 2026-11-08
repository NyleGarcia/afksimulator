'use strict';
/* AFK Simulator / js/settings.js: your-crew settings, settings overlay, setName.
 * Classic script: top-level const/let/function share one script scope with every other js/*.js (see ARCHITECTURE.md).
 * Load order is fixed in index.html. */

// ---------- settings: your crew ----------
const mkFriends = () => FRIENDS_ACTIVE.map((f) => ({ ...f, away: false, vc: true }));
let settingsFlush = null;
// "Your crew" editor. Returns { nodes, flush }. All text goes in through textContent / .value, never innerHTML.
function crewSection() {
  const A = window.AFK_ROSTER;
  if (!A) return { nodes: [], flush: () => {} };
  const saved = loadRoster();
  let on = saved.on;
  let draft = saved.crew.map((c) => ({ n: c.n, t: c.t || '' }));
  let timer = 0;
  const note = el('p', 'pack-note crew-note', 'Names replace the server\'s friends in chat, the member list, VC, digs and share text. Applies at the start of a run.');
  const status = el('p', 'crew-status', '');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const sw = el('button', 'btn alt crew-switch', 'Use my crew', 'crewOn');
  sw.type = 'button';
  sw.setAttribute('role', 'switch');
  const list = el('div', 'crew-list');
  const counter = el('span', 'crew-count', '');
  const add = el('button', 'btn alt crew-add', '＋ Add friend', 'crewAdd');
  add.type = 'button';
  const reset = el('button', 'btn alt crew-reset', 'Reset', 'crewReset');
  reset.type = 'button';
  const exp = el('button', 'btn alt', 'Export', 'crewExport');
  exp.type = 'button';
  const imp = el('button', 'btn alt', 'Import', 'crewImport');
  imp.type = 'button';
  const io = el('div', 'crew-io');
  io.hidden = true;
  const row1 = el('div', 'crew-actions');
  row1.append(add, counter);
  const row2 = el('div', 'btn-row crew-tools');
  row2.append(exp, imp, reset);

  const valid = () => A.normalizeCrew(draft.map((d) => ({ n: d.n, t: d.t })), ME.name);
  const setStatus = (t) => { status.textContent = t; };
  function paintSwitch() {
    const ok = valid().length > 0;
    if (!ok) on = false;
    sw.disabled = !ok;
    sw.setAttribute('aria-checked', String(on));
    sw.textContent = `Use my crew: ${on ? 'ON' : 'OFF'}`;
    counter.textContent = `${draft.length}/${A.MAX_CREW}`;
    add.disabled = draft.length >= A.MAX_CREW;
  }
  function persist() {
    clearTimeout(timer);
    const crew = valid();
    on = on && crew.length > 0;
    store.set('roster', { v: 1, on, crew });
    if (S.phase === 'intro') {
      rebuildFriends();
      S.friends = mkFriends();
      S.crewNames = CREW_NAMES.slice();
      renderMembers();
      render();
      setStatus(on ? 'Saved. Your crew is in the server now.' : 'Saved.');
    } else setStatus('Saved. Applies from your next run.');
    paintSwitch();
  }
  const later250 = () => { clearTimeout(timer); timer = setTimeout(persist, 250); };
  function rows(focusIdx) {
    list.textContent = '';
    draft.forEach((d, i) => {
      const row = el('div', 'crew-row');
      const inp = el('input', 'name-input crew-name');
      inp.type = 'text';
      inp.maxLength = A.MAX_NAME;
      inp.placeholder = 'friend name';
      inp.autocomplete = 'off';
      inp.value = d.n;
      inp.setAttribute('aria-label', `Crew member ${i + 1} name`);
      inp.addEventListener('input', () => { d.n = inp.value; paintSwitch(); later250(); });
      inp.addEventListener('change', persist);
      inp.addEventListener('blur', () => { clearTimeout(timer); persist(); });
      const sel = el('select', 'crew-trait');
      sel.setAttribute('aria-label', `Trait for crew member ${i + 1}`);
      [['', '(no trait)']].concat(A.TRAITS.map((t) => [t, t])).forEach(([v, label]) => {
        const op = el('option', '', label);
        op.value = v;
        sel.appendChild(op);
      });
      sel.value = d.t || '';
      sel.addEventListener('change', () => { d.t = sel.value; persist(); });
      const rm = el('button', 'icon-btn crew-remove', '✕');
      rm.type = 'button';
      rm.title = `Remove ${d.n || 'this friend'}`;
      rm.setAttribute('aria-label', `Remove crew member ${i + 1}`);
      rm.addEventListener('click', () => { draft.splice(i, 1); rows(Math.min(i, draft.length - 1)); persist(); });
      row.append(inp, sel, rm);
      list.appendChild(row);
    });
    paintSwitch();
    if (focusIdx != null && focusIdx >= 0) { const f = list.querySelectorAll('.crew-name')[focusIdx]; if (f) f.focus(); }
  }
  sw.addEventListener('click', () => { on = !on && valid().length > 0; persist(); });
  add.addEventListener('click', () => {
    if (draft.length >= A.MAX_CREW) return;
    draft.push({ n: '', t: '' });
    rows(draft.length - 1);
  });
  let resetTimer = 0;
  reset.addEventListener('click', () => {
    if (reset.dataset.armed !== '1') {
      reset.dataset.armed = '1';
      reset.textContent = 'Really reset?';
      resetTimer = setTimeout(() => { reset.dataset.armed = ''; reset.textContent = 'Reset'; }, 3000);
      return;
    }
    clearTimeout(resetTimer);
    reset.dataset.armed = '';
    reset.textContent = 'Reset';
    draft = [];
    on = false;
    io.hidden = true;
    rows();
    persist();
    setStatus('Crew cleared. The server\'s own friends are back.');
  });
  function openIo(kind) {
    io.textContent = '';
    io.hidden = false;
    if (kind === 'export') {
      const ta = el('textarea', 'crew-text', null, 'crewExportText');
      ta.readOnly = true;
      ta.rows = 3;
      ta.value = A.exportText(draft.map((d) => ({ n: d.n, t: d.t })));
      ta.setAttribute('aria-label', 'Crew export text');
      const cp = el('button', 'btn alt', 'Copy');
      cp.type = 'button';
      cp.addEventListener('click', () => copyText(ta.value));
      const cl = el('button', 'btn alt', 'Close');
      cl.type = 'button';
      cl.addEventListener('click', () => { io.hidden = true; exp.focus(); });
      const r = el('div', 'btn-row');
      r.append(cp, cl);
      io.append(ta, r);
      ta.focus();
      ta.select();
      return;
    }
    const ta = el('textarea', 'crew-text', null, 'crewImportText');
    ta.rows = 3;
    ta.maxLength = A.MAX_IMPORT;
    ta.placeholder = '{"v":1,"crew":[{"n":"Sam","t":"roaster"}]}';
    ta.setAttribute('aria-label', 'Paste crew export text');
    const prev = el('div', 'crew-preview');
    prev.setAttribute('role', 'status');
    let parsed = null;
    const pv = el('button', 'btn alt', 'Preview');
    pv.type = 'button';
    const ap = el('button', 'btn', 'Apply');
    ap.type = 'button';
    ap.disabled = true;
    const cn = el('button', 'btn alt', 'Cancel');
    cn.type = 'button';
    pv.addEventListener('click', () => {
      prev.textContent = '';
      const r = A.parseImport(ta.value, ME.name);
      parsed = r.ok ? r.crew : null;
      ap.disabled = !parsed;
      if (!r.ok) { prev.appendChild(el('p', 'crew-err', r.error)); return; }
      const ul = el('ul', 'crew-pv-list');
      r.crew.forEach((c) => ul.appendChild(el('li', '', c.t ? `${c.n} · ${c.t}` : c.n)));
      prev.append(el('p', '', `${r.crew.length} friend${r.crew.length === 1 ? '' : 's'} found. Apply replaces your crew.`), ul);
      if (r.warnings.length) prev.appendChild(el('p', 'crew-warn', r.warnings.join(' · ')));
    });
    ap.addEventListener('click', () => {
      if (!parsed) return;
      draft = parsed.map((c) => ({ n: c.n, t: c.t || '' }));
      on = true;
      io.hidden = true;
      rows();
      persist();
      imp.focus();
    });
    cn.addEventListener('click', () => { io.hidden = true; imp.focus(); });
    const r = el('div', 'btn-row');
    r.append(pv, ap, cn);
    io.append(ta, r, prev);
    ta.focus();
  }
  exp.addEventListener('click', () => openIo('export'));
  imp.addEventListener('click', () => openIo('import'));
  rows();
  return {
    nodes: [el('h3', '', 'YOUR CREW'), note, sw, list, row1, row2, io, status],
    flush: () => { clearTimeout(timer); persist(); },
  };
}

// Mode switch inside Settings: apply a typed-but-unconfirmed name before the mode change replaces the overlay.
function modeSwitchKeepName(input) {
  const box = modeSwitch(true);
  box.addEventListener('click', () => setName(input.value), true);
  return box;
}
function showSettings() {
  const input = el('input', 'name-input', null, 'nameInput');
  input.type = 'text';
  input.maxLength = 16;
  input.value = ME.name;
  input.autocomplete = 'off';
  const lab = el('label', 'field-label', 'Name (max 16 chars)');
  lab.htmlFor = 'nameInput';
  input.setAttribute('aria-describedby', 'nameHint');
  const hint = el('p', 'pack-note', 'Your handle in chat, the member list, the leaderboard and share text.', 'nameHint');
  const apply = () => setName(input.value);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
  input.addEventListener('change', apply);
  const themeBox = el('div', 'theme-picker');
  THEMES.forEach((t) => {
    const b = el('button', 'btn alt theme-btn', t.name);
    b.dataset.theme = t.id;
    b.setAttribute('aria-pressed', String(t.id === theme));
    b.addEventListener('click', () => {
      theme = applyTheme(t.id);
      store.set('theme', theme);
      themeBox.querySelectorAll('.theme-btn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.theme === theme)));
    });
    themeBox.appendChild(b);
  });
  const crew = crewSection();
  settingsFlush = () => { crew.flush(); };
  const done = el('button', 'btn', 'Done');
  done.addEventListener('click', () => { apply(); crew.flush(); closeOverlay(); });
  const nodes = [el('h1', '', '⚙️ Settings', 'modalTitle'), lab, input, hint].concat(crew.nodes, [el('h3', '', 'THEME'), themeBox]);
  if (rogueAvail() || gnAvail()) nodes.push(el('h3', '', 'GAME MODE'), modeSwitchKeepName(input), el('p', 'pack-note', 'Classic is the endless run. Rogue is 3 acts of boons, bosses and a shop with unlocks. Game Night is a weekly cancel-the-plans game. Switching ends the current run (a saved rogue run can be resumed).'));
  if (modeNow() === 'gamenight') nodes.push(...GN.settingsNodes(null), el('p', 'pack-note', 'Game Night settings apply from the next season.'));
  if (PACKLIST.length > 1) {
    nodes.push(el('h3', '', 'SERVER PACK'), packPicker(() => { setName(input.value); showSettings(); }, () => crew.flush()), el('p', 'pack-note', 'Switching packs starts a fresh run. Score and achievements carry over.'));
  }
  nodes.push(done);
  openOverlay('settings', nodes);
}
// reserved names (cast, inactive roster friends, bots, resident, built-ins) come from reservedNames() in core.js
const nameTaken = (n) => reservedNames().has(String(n).toLowerCase());
function setName(v) {
  let n = sanitizeName(v);
  if (n !== ME.name && nameTaken(n)) n = ME.name; // reserved or already a friend: keep the current name
  const inp = $('#nameInput');
  if (inp && inp.value !== n) inp.value = n;
  if (n === ME.name) return;
  ME.name = n;
  store.set('name', n);
  if (S.phase === 'intro' && CREW_NAMES.length) { rebuildFriends(); S.friends = mkFriends(); S.crewNames = CREW_NAMES.slice(); }
  renderMembers();
  if (S.phase === 'afk') $('#composerText').textContent = `${n} is typing... (he is not)`;
  const b = $('#startBtn');
  if (b) b.textContent = `Log in as ${n}`;
}

// ---------- first-run name prompt ----------
// Shown once, before the intro, when no name has ever been saved. ?noprompt=1 or an existing afksim.name skips it.
// Confirm / Enter saves the typed name; "Use comanderson" and Esc save the default. Either way it never shows again.
function needsNamePrompt() {
  if (/[?&]noprompt=1(&|$)/.test(location.search)) return false;
  try { return localStorage.getItem('afksim.name') === null; } catch { return false; }
}
function showNamePrompt(next) {
  const err = el('p', 'name-err', '');
  err.id = 'namePromptErr';
  err.setAttribute('role', 'alert');
  const input = el('input', 'name-input', null, 'namePromptInput');
  input.type = 'text';
  input.maxLength = 16;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = DEFAULT_NAME;
  input.setAttribute('aria-describedby', 'namePromptHelp namePromptErr');
  const lab = el('label', 'field-label', 'Your handle (max 16 chars)');
  lab.htmlFor = 'namePromptInput';
  const help = el('p', 'pack-note', 'This is how the server sees you: chat, member list, leaderboard and share text. You can change it any time in Settings.', 'namePromptHelp');
  const finish = (v) => {
    setName(v);
    store.set('name', ME.name); // remember even when it equals the default
    closeModal();
    reset();
    render();
    next();
  };
  const ok = el('button', 'btn', 'Continue', 'namePromptOk');
  ok.type = 'button';
  const def = el('button', 'btn alt', `Use ${DEFAULT_NAME}`, 'namePromptDefault');
  def.type = 'button';
  const confirm = () => {
    const n = sanitizeName(input.value);
    if (input.value.trim() && nameTaken(n)) {
      err.textContent = `"${n}" is taken in this server. Pick another name.`;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      input.select();
      return;
    }
    finish(input.value);
  };
  ok.addEventListener('click', confirm);
  def.addEventListener('click', () => finish(DEFAULT_NAME));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } });
  input.addEventListener('input', () => { if (err.textContent) { err.textContent = ''; input.removeAttribute('aria-invalid'); } });
  nameDefaultCb = () => finish(DEFAULT_NAME);
  const row = el('div', 'btn-row');
  row.append(ok, def);
  openModal([el('h1', '', 'Welcome. What\'s your name?', 'modalTitle'), help, lab, input, err, row], 'name');
  input.focus();
}
let nameDefaultCb = null;
function firstRunName(next) {
  if (needsNamePrompt()) showNamePrompt(next); else next();
}

window.AFK.modules.push('settings');
