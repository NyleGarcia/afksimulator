/* AFK Simulator channels. Registers on window.AFK_CONTENT.channels (entries are appended to anything already there).
 * See CONTENT.md.
 *  { id, name, icon?, type: 'text' | 'voice', isAfk?: true, members?: [characterIds],
 *    mods?: { susMult, pointMult }, desc?,
 *    // text channels only (chat gameplay):
 *    visibility?: 0..1, busyness?: 0..1, muted?: bool, muteDelay?: [minMins, maxMins], slowmodeSec?: n,
 *    replies?: [{ t, r: [min, max] }] }
 * The FIRST text channel is the chat. The first voice channel (that is not the AFK one) is where you start.
 * Later rounds may move the squad to another voice channel; its mods then apply.
 * The first channel with isAfk:true is the AFK channel (where the timeout bot parks you).
 */
(function () {
  'use strict';

  var channels = [
    { id: 'general', name: 'general', icon: '#', type: 'text', desc: 'the main chat', visibility: 0.85, busyness: 0.8,
      replies: [{ t: 'here', r: [1, 5] }, { t: 'yeah im here, whats up', r: [2, 7] }, { t: 'sorry just saw this', r: [3, 8] }] },
    { id: 'memes', name: 'memes', icon: '#', type: 'text', desc: 'where friends go when they drift out of vc', visibility: 0.4, busyness: 0.7, slowmodeSec: 10,
      replies: [{ t: '💀', r: [-2, 4] }, { t: 'lmao ok', r: [1, 6] }, { t: 'posted. ratio', r: [0, 5] }] },
    { id: 'clips', name: 'clips', icon: '#', type: 'text', desc: 'embarrassing moments, preserved forever', visibility: 0.25, busyness: 0.3, muted: true, muteDelay: [4, 12],
      replies: [{ t: 'delete that', r: [0, 5] }, { t: 'who clipped that', r: [1, 6] }, { t: 'i can explain', r: [-3, 7] }] },

    { id: 'squad-vc', name: 'squad vc', icon: '🔊', type: 'voice', desc: 'the usual', members: ['brody', 'kev', 'moistturtle', 'dani', 'xxsniperxx'] },
    { id: 'study-room', name: 'study room', icon: '🔊', type: 'voice', desc: 'quiet hours: everyone is a bit more forgiving', mods: { susMult: 0.8 }, members: ['kev', 'dani'] },
    { id: 'raid-night', name: 'raid night', icon: '🔊', type: 'voice', desc: 'high stakes, high rewards', mods: { susMult: 1.2, pointMult: 1.2 }, members: ['brody', 'moistturtle', 'xxsniperxx'] },

    { id: 'afk', name: 'afk', icon: '🔊', type: 'voice', isAfk: true, desc: 'where idle users go to be forgotten' }
  ];

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.channels = (Array.isArray(C.channels) ? C.channels : []).concat(channels);
})();
