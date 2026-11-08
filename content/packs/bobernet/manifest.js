/* BoberNet pack manifest. Registers this pack with the game; see CONTENT.md "Content packs".
 *  id        unique pack id (letters/digits/-/_, max 32). 'classic' is reserved for the built-in server.
 *  name      label in the pack picker (settings + start screen)
 *  server    server name shown in the sidebar header and share text
 *  base      folder the files below are loaded from (default content/packs/<id>/)
 *  files     core files, small. Listed in index.html as <script> tags; if they were not, the game loads them on pack select.
 *  lazy      heavy files. Never block first render: loaded after first paint, and only while this pack is active.
 *  requires  minimum content-system version (this build is 4)
 */
(window.AFK_PACK_MANIFESTS = window.AFK_PACK_MANIFESTS || []).push({
  id: 'bobernet',
  name: 'BoberNet (Star Citizen)',
  server: 'BoberNet',
  base: 'content/packs/bobernet/',
  files: ['pools.js', 'templates.js', 'generate.js', 'dialog.js', 'data.js', 'parody-orgs.js'],
  lazy: ['bulk.js'],
  requires: 4
});
