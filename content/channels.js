/* AFK Simulator channels. Registers on window.AFK_CONTENT.channels (entries are appended to anything already there).
 * See CONTENT.md.
 *  { id, name, icon?, type: 'text' | 'voice', isAfk?: true, members?: [characterIds],
 *    mods?: { susMult, pointMult }, desc?,
 *    // text channels only (chat gameplay):
 *    visibility?: 0..1, busyness?: 0..1, muted?: bool, muteDelay?: [minMins, maxMins], slowmodeSec?: n,
 *    replies?: [{ t, r: [min, max] }],
 *    topic?: 'pool-key',      // which topic line pool (dialog TOPICS) the friends talk from here; defaults to the channel id
 *    readOnly?: true,         // view-only: the player cannot post or brb here; only `posters` (bots/officers) post
 *    posters?: [characterIds] // readOnly only: who posts here (default: the bots)
 *  }
 *  topic, readOnly and posters are validated by js/reactions.js (warn + ignore, never throw), see CONTENT.md.
 * The FIRST text channel is the chat. The first voice channel (that is not the AFK one) is where you start.
 * Later rounds may move the squad to another voice channel; its mods then apply.
 * The first channel with isAfk:true is the AFK channel (where the timeout bot parks you).
 * Voice channels are player-choosable (sidebar buttons, chat phase). AFK_CONTENT.voiceFlavor = { channelId: { hello: [lines], brb: [{ t, p, m }] } }.
 */
(function () {
  'use strict';

  var channels = [
    { id: 'general', name: 'general', icon: '#', type: 'text', desc: 'the main chat', visibility: 0.85, busyness: 0.8,
      replies: [{ t: 'here', r: [1, 5] }, { t: 'yeah im here, whats up', r: [2, 7] }, { t: 'sorry just saw this', r: [3, 8] }] },
    { id: 'memes', name: 'memes', icon: '#', type: 'text', desc: 'where friends go when they drift out of vc', visibility: 0.4, busyness: 0.7, slowmodeSec: 10,
      replies: [{ t: '💀', r: [-2, 4] }, { t: 'lmao ok', r: [1, 6] }, { t: 'posted. ratio', r: [0, 5] }] },
    { id: 'announcements', name: 'announcements', icon: '#', type: 'text', desc: 'view only: official server stuff, @everyone included', visibility: 0.9, busyness: 0.1,
      readOnly: true, posters: ['afk-bot'], topic: 'announcements',
      replies: [{ t: 'read it', r: [2, 7] }, { t: 'acknowledged', r: [3, 8] }] },
    { id: 'clips', name: 'clips', icon: '#', type: 'text', desc: 'embarrassing moments, preserved forever', visibility: 0.25, busyness: 0.3, muted: true, muteDelay: [4, 12],
      replies: [{ t: 'delete that', r: [0, 5] }, { t: 'who clipped that', r: [1, 6] }, { t: 'i can explain', r: [-3, 7] }] },
    { id: 'squad-vc', name: 'squad vc', icon: '🔊', type: 'voice', desc: 'the usual', members: ['brody', 'kev', 'moistturtle', 'dani', 'xxsniperxx'] },
    { id: 'study-room', name: 'study room', icon: '🔊', type: 'voice', desc: 'quiet hours: everyone is a bit more forgiving', mods: { susMult: 0.8 }, members: ['kev', 'dani'] },
    { id: 'raid-night', name: 'raid night', icon: '🔊', type: 'voice', desc: 'tense: they notice everything, the points are fat', mods: { susMult: 1.2, pointMult: 1.2 }, members: ['brody', 'moistturtle', 'xxsniperxx'] },

    { id: 'afk', name: 'afk', icon: '🔊', type: 'voice', isAfk: true, desc: 'where idle users go to be forgotten' }
  ];

  // per voice channel flavor (js/voice.js): hello = what a friend there says when you join, brb = a promise that fits the room
  // (replaces the last brb option while you sit there). Optional; see CONTENT.md "Voice channels, moves and rejoin".
  var voiceFlavor = {
    'squad-vc': { hello: ['oh {me} joined, ok now we are 5', 'welcome back to the usual', 'finally the squad is whole'],
      brb: [{ t: 'brb gotta grab something', p: 4, m: 1.15 }] },
    'study-room': { hello: ['shh. {me} is here. quietly.', 'welcome to the study room. mic discipline please', 'ok we are all studying (we are not)'],
      brb: [{ t: 'brb, library book is overdue', p: 12, m: 1.0 }, { t: 'brb need a coffee to focus', p: 6, m: 1.1 }] },
    'raid-night': { hello: ['{me} IS HERE. LOCK IN.', 'oh now you show up. we are mid pull', 'raid night. no brbs. none.'],
      brb: [{ t: 'brb 1 min i swear', p: 1, m: 1.65 }, { t: '30 sec bio break', p: 1, m: 1.6 }] }
  };
  C_voiceFlavor();
  function C_voiceFlavor() {
    var C0 = window.AFK_CONTENT = window.AFK_CONTENT || {};
    var vf = C0.voiceFlavor = (C0.voiceFlavor && typeof C0.voiceFlavor === 'object') ? C0.voiceFlavor : {};
    Object.keys(voiceFlavor).forEach(function (k) { if (!(k in vf)) vf[k] = voiceFlavor[k]; });
  }

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.channels = (Array.isArray(C.channels) ? C.channels : []).concat(channels);
})();
