/* AFK Simulator path pack. Tokens: {me} player handle, {p} promised time, {t} elapsed time.
 * Registers on window.AFK_CONTENT: .paths (array), .pathEvents (object), .pathLines (object).
 * Entries are appended to / merged with anything already there. See CONTENT.md.
 *  paths  : [{ id, name, desc, risk?, pointMult, susMult, pointGrow?, susGrow?, modes?, events[] }]
 *           modes (optional) = server modes the path may appear in; omitted = all modes.
 *           pointGrow/susGrow = extra multiplier added per AFK hour (capped at 4h).
 *           events = mic event ids that can fire while on this path (see `events`), plus the
 *           special id 'alone-drift' for friends drifting out of VC.
 *  events : { id: { label, lines[], sus:[min,max], funny?, bonus? } }  (mic events)
 *  lines  : { moved, drag, aloneLeave, aloneJoin, clipped } -> arrays of friend lines
 */
(function () {
  'use strict';

  var paths = [
    {
      id: 'walk-away', name: 'walk away', desc: 'classic. close the lid, leave the room',
      risk: 'highest multiplier, highest kick risk',
      pointMult: 1.35, susMult: 1.25, events: []
    },
    {
      id: 'muted-deaf', name: 'muted + deafened', desc: 'headphones off, mic muted, nobody can hear a thing',
      risk: 'safe: low suspicion, normal points',
      pointMult: 1.0, susMult: 0.6, events: []
    },
    {
      id: 'hot-mic', name: 'hot mic', desc: 'stay in VC unmuted and let the room speak for you',
      risk: 'high points, random mic events spike suspicion',
      pointMult: 1.3, susMult: 1.0, modes: ['no-timeout'],
      events: ['chewing', 'mom', 'flush', 'dog', 'anime', 'snore']
    },
    {
      id: 'alone-in-vc', name: 'alone in VC', desc: 'sit in the channel while your friends drift away',
      risk: 'slow points, low suspicion',
      pointMult: 0.75, susMult: 0.5, modes: ['no-timeout'], events: ['alone-drift']
    },
    {
      id: 'fell-asleep', name: 'fell asleep', desc: 'pass out at the desk, snoring into the mic',
      risk: 'points grow over time, suspicion grows faster later',
      pointMult: 0.8, susMult: 0.6, pointGrow: 0.4, susGrow: 0.55, events: ['snore']
    }
  ];

  var events = {
    chewing: {
      label: 'loud chewing',
      sus: [2, 5], funny: false,
      lines: [
        'is {me} EATING chips into the mic',
        'bro the crunching. THE CRUNCHING',
        '{me} stop chewing in my ear',
        'ASMR with {me} i guess',
        'he left his mic on and is eating cereal'
      ]
    },
    mom: {
      label: "{me}'s mom yelling in the background",
      sus: [3, 7], funny: true, bonus: 25,
      lines: [
        "was that {me}'s mom??",
        "'DID YOU TAKE OUT THE TRASH' lmaooo",
        "his mom is yelling and he's not even here",
        '{me} your mom wants you',
        "bro's mom just called him by his full name"
      ]
    },
    flush: {
      label: 'a toilet flushing',
      sus: [4, 8], funny: true, bonus: 20,
      lines: [
        'THAT WAS A FLUSH',
        'he took us to the bathroom with him',
        'bro is on the toilet with the mic on',
        'nobody asked for the audio {me}',
        'did {me} just flush. on voice.'
      ]
    },
    dog: {
      label: 'a dog barking',
      sus: [2, 5], funny: true, bonus: 15,
      lines: [
        "{me}'s dog is losing it",
        'who let the dogs out. {me}. {me} did.',
        'woof. bro your dog is in the call',
        "the dog is more present than {me} rn",
        'good boy honestly better teammate'
      ]
    },
    anime: {
      label: 'an anime opening at full volume',
      sus: [3, 6], funny: true, bonus: 30,
      lines: [
        'is that an anime opening',
        "{me} is watching anime and we're out here waiting",
        'BRO TURN IT DOWN lmao',
        "he's not afk he's just watching naruto",
        'the opening is a banger though ngl'
      ]
    },
    snore: {
      label: 'loud snoring',
      sus: [3, 7], funny: false,
      lines: [
        'is he SNORING',
        '{me} fell asleep on voice lmao',
        'the snoring is actually insane',
        "hhhhhhkkk zzz that's {me}",
        'somebody mute the snorer',
        'bro is out cold'
      ]
    }
  };

  var lines = {
    moved: [
      'the afk bot got {me} lol',
      'rip {me}, afk channel',
      'he got moved. peak {me}',
      "see you in the afk channel {me}",
      'timeout bot ate him'
    ],
    drag: [
      'GOTCHA {me}',
      'dragging {me} to the afk channel',
      'enough. you are going to the afk channel',
      'sorry {me} but you have been gone too long',
      'moved him, we start without {me}',
      'vc kidnapping complete'
    ],
    aloneLeave: [
      'ima head to #memes',
      'i am going to go play something else',
      'gonna hop in another vc brb',
      'this lobby is dead, bye',
      "ok i'm out, tell {me} we left",
      'leaving vc, have fun talking to yourself'
    ],
    aloneJoin: [
      'back in vc, is {me} still gone',
      "yo i'm back. still nobody?",
      'rejoined. he is still not here',
      'back. {me}?? hello?',
      'hopping back in'
    ],
    clipped: [
      'chat clipped it',
      'CLIPPED. this is going in #clips',
      "someone clip that. oh i did",
      'that is going straight to #clips',
      'clipped and shipped'
    ]
  };

  var C = window.AFK_CONTENT = window.AFK_CONTENT || {};
  C.paths = (Array.isArray(C.paths) ? C.paths : []).concat(paths);
  var ev = C.pathEvents = (C.pathEvents && typeof C.pathEvents === 'object') ? C.pathEvents : {};
  Object.keys(events).forEach(function (k) { if (!(k in ev)) ev[k] = events[k]; });
  var ln = C.pathLines = (C.pathLines && typeof C.pathLines === 'object') ? C.pathLines : {};
  Object.keys(lines).forEach(function (k) { ln[k] = (Array.isArray(ln[k]) ? ln[k] : []).concat(lines[k]); });
})();
