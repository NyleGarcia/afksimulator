/* AFK Simulator theme list. Registers on window.AFK_CONTENT.themes (entries are appended to anything already there).
 *  { id: 'lowercase-with-dashes', name: 'Shown In Settings' }
 * A theme's colors live in ../themes.css as  :root[data-theme="<id>"] { --bg: ...; }  (see CONTENT.md).
 */
(function () {
  'use strict';

  var themes = [
    { id: 'discord-dark', name: 'Discord Dark' },
    { id: 'amoled', name: 'AMOLED' },
    { id: 'light', name: 'Light' },
    { id: 'synthwave', name: 'Synthwave' },
    { id: 'terminal', name: 'Terminal' }
  ];

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.themes = (Array.isArray(C.themes) ? C.themes : []).concat(themes);
})();
