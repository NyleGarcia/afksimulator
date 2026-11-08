/* AFK Simulator channels. Registers on window.AFK_CONTENT.channels (entries are appended to anything already there).
 * See CONTENT.md.
 *  { id, name, icon?, type: 'text' | 'voice', isAfk?: true, members?: [characterIds],
 *    mods?: { susMult, pointMult }, desc? }
 * The FIRST text channel is the chat. The first voice channel (that is not the AFK one) is where you start.
 * Later rounds may move the squad to another voice channel; its mods then apply.
 * The first channel with isAfk:true is the AFK channel (where the timeout bot parks you).
 */
(function () {
  'use strict';

  var channels = [
    { id: 'general', name: 'general', icon: '#', type: 'text', desc: 'the main chat' },
    { id: 'memes', name: 'memes', icon: '#', type: 'text', desc: 'where friends go when they drift out of vc' },
    { id: 'clips', name: 'clips', icon: '#', type: 'text', desc: 'embarrassing moments, preserved forever' },

    { id: 'squad-vc', name: 'squad vc', icon: '🔊', type: 'voice', desc: 'the usual', members: ['brody', 'kev', 'moistturtle', 'dani', 'xxsniperxx'] },
    { id: 'study-room', name: 'study room', icon: '🔊', type: 'voice', desc: 'quiet hours: everyone is a bit more forgiving', mods: { susMult: 0.8 }, members: ['kev', 'dani'] },
    { id: 'raid-night', name: 'raid night', icon: '🔊', type: 'voice', desc: 'high stakes, high rewards', mods: { susMult: 1.2, pointMult: 1.2 }, members: ['brody', 'moistturtle', 'xxsniperxx'] },

    { id: 'afk', name: 'afk', icon: '🔊', type: 'voice', isAfk: true, desc: 'where idle users go to be forgotten' }
  ];

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.channels = (Array.isArray(C.channels) ? C.channels : []).concat(channels);
})();
